/**
 * sweep-full-4phase.mjs
 * Full 4-phase collision parameter optimization sweep.
 *
 * Phase 1:  81-combo grid (lf × ld × hfs × hfr, 3 levels each) + baseline = 82 combos
 * Phase 2:  VOAT (ad, sbf, sbt, sby at 5 levels each) + baseline           = 17 combos
 * Phase 3:  Top-5 combined × 5 global scale factors                        = 25 combos
 * Phase 4:  Top-3 × 10 tracks × 100 races + 10-race baselines per track    = 3100 races
 *
 * Output written LIVE to sweep-full-4phase-results.txt in project root.
 * Do NOT redirect stdout to a file — the script manages persistence itself.
 */

import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { EditorShape }                                              from '../client/src/modules/track-editor/EditorShape.js';
import { DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG } from '../client/src/modules/storage/defaults.js';
import { RACER_CONFIGS, runSingleRace, computeFinishT }            from './sim-fairness.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const OUT   = join(ROOT, 'sweep-full-4phase-results.txt');
writeFileSync(OUT, '');

function log(...args) {
  const line = args.map(String).join(' ');
  process.stdout.write(line + '\n');
  appendFileSync(OUT, line + '\n');
}

// ── Formatters ────────────────────────────────────────────────────────────────
const pct  = (v, d = 3) => (v * 100).toFixed(d) + '%';
const f4   = (v) => v.toFixed(4);
const f2   = (v) => v.toFixed(2);
const f8   = (v) => v.toFixed(8);
const elap = (ms) => `${(ms / 60000).toFixed(1)} min`;

const T_START = Date.now();
const elapsed = () => elap(Date.now() - T_START);

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_SPEED_MEAN = (DEFAULT_BASE_SPEED_CONFIG.min + DEFAULT_BASE_SPEED_CONFIG.max) / 2;

const DEFAULTS = {
  lf:  DEFAULT_RACE_BEHAVIOR_CONFIG.lateralForce,
  ld:  DEFAULT_RACE_BEHAVIOR_CONFIG.lateralDamping,
  hfs: DEFAULT_RACE_BEHAVIOR_CONFIG.homeForceStrength,
  hfr: DEFAULT_RACE_BEHAVIOR_CONFIG.homeForceReductionOnOverlap,
  ad:  DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceDistance,
  sbf: DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeFactor,
  sbt: DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeTThreshold,
  sby: DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeYThreshold,
};

const KEY_MAP = {
  lf:  'lateralForce',
  ld:  'lateralDamping',
  hfs: 'homeForceStrength',
  hfr: 'homeForceReductionOnOverlap',
  ad:  'avoidanceDistance',
  sbf: 'speedBrakeFactor',
  sbt: 'speedBrakeTThreshold',
  sby: 'speedBrakeYThreshold',
};

function toOverrides(p) {
  const o = {};
  for (const [k, v] of Object.entries(p))
    if (KEY_MAP[k] !== undefined) o[KEY_MAP[k]] = v;
  return o;
}

// ── Chi-square p-value (Wilson–Hilferty approximation) ────────────────────────
function chiSquareP(observed) {
  const total = observed.reduce((s, c) => s + c, 0);
  if (total === 0) return 1;
  const n = observed.length;
  const exp = total / n;
  let chi2 = 0;
  for (const c of observed) chi2 += (c - exp) ** 2 / exp;
  const df = n - 1;
  const h  = chi2 / df - 1 + 2 / (9 * df);
  const z  = h / Math.sqrt(2 / (9 * df));
  const p  = 1 - 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
  return Math.max(0, Math.min(1, p));
}

// ── Track loader (cached) ─────────────────────────────────────────────────────
const _tc = {};
function loadTrack(id) {
  if (_tc[id]) return _tc[id];
  const raw = JSON.parse(readFileSync(join(ROOT, 'server/data/tracks', `${id}.json`), 'utf8'));
  const shape = new EditorShape(raw);
  _tc[id] = {
    shape,
    isOpen:             !!shape.isOpen,
    pathLengthPx:       raw.pathLengthPx ?? shape.getTotalLength(),
    geometricTrackWidth: shape.getActualTrackWidth(),
  };
  return _tc[id];
}

// ── Run N races, return aggregate metrics ─────────────────────────────────────
function runCombo({ trackId, racerType, nRacers, durSec = 60, nRaces = 10, params, seed0 = 42 }) {
  const { shape, isOpen, pathLengthPx, geometricTrackWidth } = loadTrack(trackId);
  const { displaySize, bodyFillX, bodyFillY, speedMultiplier } = RACER_CONFIGS[racerType];
  const finishT    = computeFinishT(BASE_SPEED_MEAN, speedMultiplier, durSec, isOpen);
  const overrides  = toOverrides(params);

  const hard = [], soft = [], zig = [], lat = [], so = [], fin = [];
  const tally = new Array(nRacers).fill(0);

  for (let r = 0; r < nRaces; r++) {
    const res = runSingleRace({
      shape, pathLengthPx, geometricTrackWidth, isOpen,
      speedMultiplier, displaySize, bodyFillX, bodyFillY,
      finishT, targetSeconds: durSec, seed: seed0 + r, nRacers,
      behaviorConfigOverrides: overrides,
    });

    hard.push(res.liteHardOverlapRate ?? 0);
    soft.push(res.liteSoftOverlapRate ?? 0);
    zig .push(res.liteZigzagScore     ?? 0);
    lat .push(res.liteLatSpeedScore   ?? 0);
    so  .push(res.liteStableOvertakes ?? 0);

    const finishers = res.filter((r2) => r2.finishTime != null);
    fin.push(finishers.length > 0
      ? finishers.reduce((s, r2) => s + r2.finishTime, 0) / finishers.length
      : durSec);

    for (const r2 of res)
      if (r2.finalRank != null && r2.finalRank >= 1 && r2.finalRank <= nRacers)
        tally[r2.finalRank - 1]++;
  }

  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  return {
    hardOverlapRate:     avg(hard),
    softOverlapRate:     avg(soft),
    zigzagScore:         avg(zig),
    lateralSpeedScore:   avg(lat),
    stableOvertakes:     avg(so),
    racePlanSuccessRate: 0,   // not implemented; zero-variance → contributes 0
    meanFinishTime:      avg(fin),
    pValue:              chiSquareP(tally),
  };
}

// ── Composite score (lower = better) ─────────────────────────────────────────
// Weights: hardOverlap×0.30, zigzag×0.25, latSpeed×0.20,
//          softOverlap×0.10, stableOvertakes×0.10(inv), racePlan×0.05(inv)
const W = [
  { k: 'hardOverlapRate',     w: 0.30, inv: false },
  { k: 'zigzagScore',         w: 0.25, inv: false },
  { k: 'lateralSpeedScore',   w: 0.20, inv: false },
  { k: 'softOverlapRate',     w: 0.10, inv: false },
  { k: 'stableOvertakes',     w: 0.10, inv: true  },
  { k: 'racePlanSuccessRate', w: 0.05, inv: true  },
];

function addScores(rows) {
  const mm = {};
  for (const { k } of W) {
    const vals = rows.map((r) => r.m[k]);
    mm[k] = { min: Math.min(...vals), max: Math.max(...vals) };
  }
  for (const row of rows) {
    let s = 0;
    for (const { k, w, inv } of W) {
      const { min, max } = mm[k];
      if (max === min) continue;
      const n = (row.m[k] - min) / (max - min);
      s += w * (inv ? 1 - n : n);
    }
    row.score = s;
  }
}

// ── Hard cutoffs ──────────────────────────────────────────────────────────────
function passes(m, base) {
  return (
    m.pValue            >= 0.05  &&
    m.zigzagScore       <= 0.003 &&
    m.hardOverlapRate   <= 0.03  &&
    m.lateralSpeedScore <= base.lateralSpeedScore * 2 &&
    m.meanFinishTime    >= base.meanFinishTime * 0.85 &&
    m.meanFinishTime    <= base.meanFinishTime * 1.15
  );
}

function failReasons(m, base) {
  const f = [];
  if (m.pValue            <  0.05)                          f.push('FAIRNESS');
  if (m.zigzagScore       >  0.003)                         f.push('ZIGZAG');
  if (m.hardOverlapRate   >  0.03)                          f.push('HARD_OVERLAP');
  if (m.lateralSpeedScore >  base.lateralSpeedScore * 2)    f.push('LAT_SPEED');
  if (m.meanFinishTime    <  base.meanFinishTime * 0.85 ||
      m.meanFinishTime    >  base.meanFinishTime * 1.15)    f.push('FINISH_TIME');
  return f;
}

// ── Print metric block ────────────────────────────────────────────────────────
function printMetrics(m, ind = '    ') {
  log(`${ind}hardOverlapRate:    ${pct(m.hardOverlapRate)}`);
  log(`${ind}softOverlapRate:    ${pct(m.softOverlapRate)}`);
  log(`${ind}zigzagScore:        ${f4(m.zigzagScore)}`);
  log(`${ind}lateralSpeedScore:  ${f4(m.lateralSpeedScore)}`);
  log(`${ind}stableOvertakes:    ${f2(m.stableOvertakes)}`);
  log(`${ind}fairness p:         ${m.pValue.toFixed(4)}`);
  log(`${ind}meanFinishTime:     ${f2(m.meanFinishTime)}s`);
}

// ── Parameter impact (range of per-value mean score) ─────────────────────────
function paramImpact(rows, keys) {
  const out = {};
  for (const k of keys) {
    const byVal = {};
    for (const r of rows) {
      const v = r.p[k];
      (byVal[v] ??= []).push(r.score ?? 0);
    }
    const means = Object.values(byVal).map((a) => a.reduce((s, v) => s + v, 0) / a.length);
    out[k] = means.length > 1 ? Math.max(...means) - Math.min(...means) : 0;
  }
  return out;
}

// ── FINDINGS SO FAR block ─────────────────────────────────────────────────────
function printFindingsSoFar({ phaseDone, bestCombo, baselineM, impactMap, failCount, totalFailed, estRemaining }) {
  log('');
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║  FINDINGS SO FAR                                             ║');
  log('╚══════════════════════════════════════════════════════════════╝');
  log(`  Phases complete: ${phaseDone}`);
  log(`  Elapsed: ${elapsed()}`);
  log(`  Estimated remaining: ${estRemaining}`);
  log('');
  log('  Current best combo (all 8 parameters):');
  for (const [k, v] of Object.entries(bestCombo))
    log(`    ${k.padEnd(4)} = ${v}`);
  log('');
  log('  Best combo vs baseline (metric % change):');
  if (bestCombo._metrics && baselineM) {
    const m = bestCombo._metrics;
    const diffPct = (a, b) => ((a - b) / b * 100).toFixed(1) + '%';
    log(`    hardOverlapRate:    ${pct(m.hardOverlapRate)}  (baseline ${pct(baselineM.hardOverlapRate)}, Δ${diffPct(m.hardOverlapRate, baselineM.hardOverlapRate)})`);
    log(`    softOverlapRate:    ${pct(m.softOverlapRate)}  (Δ${diffPct(m.softOverlapRate, baselineM.softOverlapRate)})`);
    log(`    zigzagScore:        ${f4(m.zigzagScore)}  (Δ${diffPct(m.zigzagScore, baselineM.zigzagScore)})`);
    log(`    lateralSpeedScore:  ${f4(m.lateralSpeedScore)}  (Δ${diffPct(m.lateralSpeedScore, baselineM.lateralSpeedScore)})`);
    log(`    stableOvertakes:    ${f2(m.stableOvertakes)}  (Δ${diffPct(m.stableOvertakes, baselineM.stableOvertakes)})`);
    log(`    meanFinishTime:     ${f2(m.meanFinishTime)}s  (Δ${diffPct(m.meanFinishTime, baselineM.meanFinishTime)})`);
  }
  log('');
  if (impactMap) {
    const sorted = Object.entries(impactMap).sort((a, b) => b[1] - a[1]);
    log('  Parameter impact (range of mean composite score):');
    for (const [k, v] of sorted)
      log(`    ${k.padEnd(4)}: ${v.toFixed(5)}`);
    log('');
    const topParam = sorted[0];
    log(`  Highest impact parameter: ${topParam[0]} (impact=${topParam[1].toFixed(5)})`);
  }
  if (totalFailed > 0) log(`  Hard cutoff failures: ${totalFailed} combos eliminated`);
  else log('  Hard cutoff failures: none');
  log('');
}

// ══════════════════════════════════════════════════════════════════════════════
//  HEADER
// ══════════════════════════════════════════════════════════════════════════════

log('');
log('╔══════════════════════════════════════════════════════════════════╗');
log('║  FULL 4-PHASE COLLISION PARAMETER OPTIMIZATION SWEEP            ║');
log('╚══════════════════════════════════════════════════════════════════╝');
log('');
log(`  Started: ${new Date().toISOString()}`);
log('');
log('  Estimated runtime:');
log('    Phase 1:  ~16 min  (820 races)');
log('    Phase 2:  ~ 3 min  (170 races)');
log('    Phase 3:  ~ 5 min  (250 races)');
log('    Phase 4:  ~50 min  (3100 races, 10 tracks)');
log('    Total:    ~74 min');
log('');
log('  Baseline defaults:');
for (const [k, v] of Object.entries(DEFAULTS))
  log(`    ${k.padEnd(4)} = ${v}`);
log('');
log('  Composite score weights (lower = better):');
for (const { k, w, inv } of W)
  log(`    ${k.padEnd(22)} × ${w}  ${inv ? '(inverted — higher is better)' : ''}`);
log('  racePlanSuccessRate: not implemented — zero variance, contributes 0');
log('');

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 1 — 3^4 grid: lf, ld, hfs, hfr
// ══════════════════════════════════════════════════════════════════════════════

const P1_TRACK  = 'space-sprint';
const P1_RACER  = 'rocket';
const P1_N      = 60;
const P1_RACES  = 10;

const P1_GRID = {
  lf:  [0.010, 0.012, 0.014],
  ld:  [0.200, 0.250, 0.300],
  hfs: [0.032, 0.040, 0.048],
  hfr: [0.240, 0.300, 0.360],
};

log('══════════════════════════════════════════════════════════════════════');
log(' PHASE 1 — Grid sweep: lf × ld × hfs × hfr (3 levels each)');
log('  Track: space-sprint  Racer: rocket  N=60  10 races/combo');
log('  82 combos × 10 races = 820 races');
log('══════════════════════════════════════════════════════════════════════');
log('');

const p1T0 = Date.now();

// Baseline
log('── Baseline (combo #0) ──────────────────────────────────────────────');
const p1BaseM = runCombo({ trackId: P1_TRACK, racerType: P1_RACER, nRacers: P1_N,
                           nRaces: P1_RACES, params: { ...DEFAULTS } });
printMetrics(p1BaseM);
log('');

// Build all 81 grid combos
const p1Combos = [];
for (const lf  of P1_GRID.lf)
for (const ld  of P1_GRID.ld)
for (const hfs of P1_GRID.hfs)
for (const hfr of P1_GRID.hfr)
  p1Combos.push({ lf, ld, hfs, hfr, ...{ ad: DEFAULTS.ad, sbf: DEFAULTS.sbf, sbt: DEFAULTS.sbt, sby: DEFAULTS.sby } });

log(`── Running ${p1Combos.length} grid combos…`);
const p1Rows = [];
for (let i = 0; i < p1Combos.length; i++) {
  const m = runCombo({ trackId: P1_TRACK, racerType: P1_RACER, nRacers: P1_N,
                       nRaces: P1_RACES, params: p1Combos[i] });
  p1Rows.push({ p: p1Combos[i], m });
  if ((i + 1) % 9 === 0) process.stderr.write(`  Phase 1: ${i + 1}/${p1Combos.length}\n`);
}

addScores(p1Rows);
const p1Pass = p1Rows.filter((r) => passes(r.m, p1BaseM));
const p1Fail = p1Rows.filter((r) => !passes(r.m, p1BaseM));
p1Pass.sort((a, b) => a.score - b.score);

const p1Impact = paramImpact(p1Pass.length > 0 ? p1Pass : p1Rows, ['lf', 'ld', 'hfs', 'hfr']);
const p1BoundaryHit = [];
for (const k of ['lf', 'ld', 'hfs', 'hfr']) {
  const top = p1Pass.slice(0, 10);
  const vals = [...new Set(top.map((r) => r.p[k]))];
  const grid = P1_GRID[k];
  if (vals.includes(grid[0]) && !vals.includes(grid[grid.length - 1])) p1BoundaryHit.push(`${k}↓`);
  if (vals.includes(grid[grid.length - 1]) && !vals.includes(grid[0])) p1BoundaryHit.push(`${k}↑`);
}

log('');
log('═══ PHASE 1 COMPLETE ═══');
log(`  Elapsed: ${elapsed()}  (phase: ${elap(Date.now() - p1T0)})`);
log(`  Survivors: ${p1Pass.length} / ${p1Rows.length}  (${p1Fail.length} failed hard cutoffs)`);
log('');
log('  Hard cutoffs applied:');
log(`    hardOverlapRate   ≤ 3.000%`);
log(`    zigzagScore       ≤ 0.0030`);
log(`    fairness p        ≥ 0.05`);
log(`    lateralSpeedScore ≤ ${f4(p1BaseM.lateralSpeedScore * 2)}  (2× baseline)`);
log(`    meanFinishTime    ∈ [${f2(p1BaseM.meanFinishTime * 0.85)}s, ${f2(p1BaseM.meanFinishTime * 1.15)}s]`);
log('');

// Full metric table (all combos, sorted by composite score)
log('  All combos sorted by composite score (including failed):');
log('');
const p1AllSorted = [...p1Rows].sort((a, b) => a.score - b.score);
const p1AllWithBase = [{ p: { ...DEFAULTS }, m: p1BaseM, score: null, isBase: true }, ...p1AllSorted];
log('   #  | pass |  lf   |  ld   |  hfs  |  hfr  | score  | hard%  | soft%  | zigzag | latSpd | stOvt |   p   | finT');
log('  ' + '─'.repeat(115));
for (let i = 0; i < p1AllSorted.length; i++) {
  const { p, m, score } = p1AllSorted[i];
  const ok = passes(m, p1BaseM);
  log(
    `  ${String(i + 1).padStart(3)} | ${ok ? ' OK ' : 'FAIL'} ` +
    `| ${p.lf.toFixed(3)} | ${p.ld.toFixed(3)} | ${p.hfs.toFixed(3)} | ${p.hfr.toFixed(3)} ` +
    `| ${score.toFixed(4)} ` +
    `| ${pct(m.hardOverlapRate, 2).padStart(6)} | ${pct(m.softOverlapRate, 2).padStart(6)} ` +
    `| ${m.zigzagScore.toFixed(4)} | ${m.lateralSpeedScore.toFixed(4)} ` +
    `| ${f2(m.stableOvertakes).padStart(5)} | ${m.pValue.toFixed(3)} | ${f2(m.meanFinishTime)}s`
  );
}
log('');

// Top 10 survivors
log('  Top 10 survivors (by composite score):');
log('');
for (let i = 0; i < Math.min(10, p1Pass.length); i++) {
  const { p, m, score } = p1Pass[i];
  log(`  #${i + 1}  lf=${p.lf}  ld=${p.ld}  hfs=${p.hfs}  hfr=${p.hfr}  score=${score.toFixed(4)}`);
  printMetrics(m);
  log('');
}

// Parameter impact
const p1ImpactSorted = Object.entries(p1Impact).sort((a, b) => b[1] - a[1]);
log('  Parameter impact (range of per-value mean composite score among survivors):');
for (const [k, v] of p1ImpactSorted)
  log(`    ${k.padEnd(4)}: ${v.toFixed(5)}`);
log(`  Highest impact: ${p1ImpactSorted[0][0]}`);
log('');

if (p1BoundaryHit.length > 0)
  log(`  ⚠ Grid boundaries hit: ${p1BoundaryHit.join(', ')} — optimum may lie outside tested range`);
else
  log('  Grid boundaries: not hit (optimum likely within tested range)');
log('');

const p1Best = p1Pass.length > 0 ? p1Pass[0] : p1AllSorted[0];

printFindingsSoFar({
  phaseDone: '1 of 4',
  bestCombo: { ...p1Best.p, _metrics: p1Best.m },
  baselineM: p1BaseM,
  impactMap: p1Impact,
  totalFailed: p1Fail.length,
  estRemaining: '~58 min',
});

// Store top 10 Phase 1 combos for Phase 2/3
const p1Top10 = p1Pass.slice(0, 10);
if (p1Top10.length < 5) p1Top10.push(...p1AllSorted.slice(0, 5 - p1Top10.length));

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 2 — VOAT: ad, sbf, sbt, sby
// ══════════════════════════════════════════════════════════════════════════════

const p2T0 = Date.now();
const p2Base = { ...p1Best.p };  // Phase 1 best for lf/ld/hfs/hfr, defaults for ad/sbf/sbt/sby

const P2_LEVELS = {
  ad:  [0.120, 0.135, 0.165, 0.180],           // non-default levels (default=0.150)
  sbf: [0.960, 0.955, 0.945, 0.940],           // non-default levels (default=0.950)
  sbt: [0.012, 0.0135, 0.0165, 0.018],         // non-default levels (default=0.015)
  sby: [0.160, 0.180, 0.220, 0.240],           // non-default levels (default=0.200)
};

log('══════════════════════════════════════════════════════════════════════');
log(' PHASE 2 — VOAT: ad, sbf, sbt, sby');
log('  Base: best Phase-1 combo  Track: space-sprint  Racer: rocket  N=60  10 races/combo');
log('  17 combos × 10 races = 170 races');
log('══════════════════════════════════════════════════════════════════════');
log('');
log(`  Phase-2 base params: lf=${p2Base.lf}  ld=${p2Base.ld}  hfs=${p2Base.hfs}  hfr=${p2Base.hfr}`);
log(`    (speedBrake params at defaults: ad=${DEFAULTS.ad}  sbf=${DEFAULTS.sbf}  sbt=${DEFAULTS.sbt}  sby=${DEFAULTS.sby})`);
log('');

// Baseline (Phase-1 best + all defaults for ad/sbf/sbt/sby)
log('── Baseline ─────────────────────────────────────────────────────────');
const p2BaseM = runCombo({ trackId: P1_TRACK, racerType: P1_RACER, nRacers: P1_N,
                           nRaces: P1_RACES, params: p2Base });
printMetrics(p2BaseM);
log('');

// Build VOAT combos
const p2Combos = [];
for (const [param, levels] of Object.entries(P2_LEVELS)) {
  for (const val of levels) {
    const p = { ...p2Base };
    p[param] = val;
    p2Combos.push({ p, varyParam: param, varyVal: val });
  }
}

log(`── Running ${p2Combos.length} VOAT combos…`);
const p2Rows = [];
for (let i = 0; i < p2Combos.length; i++) {
  const { p, varyParam, varyVal } = p2Combos[i];
  const m = runCombo({ trackId: P1_TRACK, racerType: P1_RACER, nRacers: P1_N,
                       nRaces: P1_RACES, params: p });
  p2Rows.push({ p, m, varyParam, varyVal });
  if ((i + 1) % 4 === 0) process.stderr.write(`  Phase 2: ${i + 1}/${p2Combos.length}\n`);
}

// Add a synthetic baseline row for scoring
const p2AllRows = [{ p: { ...p2Base }, m: p2BaseM, varyParam: 'baseline', varyVal: null }, ...p2Rows];
addScores(p2AllRows);

const p2Pass = p2AllRows.filter((r) => passes(r.m, p2BaseM));
const p2Fail = p2AllRows.filter((r) => !passes(r.m, p2BaseM));
p2Pass.sort((a, b) => a.score - b.score);

// Best value per param
const p2BestPerParam = {};
for (const param of Object.keys(P2_LEVELS)) {
  const forParam = p2AllRows.filter((r) => r.varyParam === param && passes(r.m, p2BaseM));
  if (forParam.length > 0) {
    forParam.sort((a, b) => a.score - b.score);
    p2BestPerParam[param] = forParam[0].varyVal;
  } else {
    p2BestPerParam[param] = DEFAULTS[param];  // fallback to default if all failed
  }
}

log('');
log('═══ PHASE 2 COMPLETE ═══');
log(`  Elapsed: ${elapsed()}  (phase: ${elap(Date.now() - p2T0)})`);
log(`  Survivors: ${p2Pass.length} / ${p2AllRows.length}`);
log('');

log('  Full metric table (sorted by composite score):');
log('');
const p2Sorted = [...p2AllRows].sort((a, b) => a.score - b.score);
log('   #  | pass | vary  | value  | score  | hard%  | soft%  | zigzag | latSpd | stOvt |   p   | finT');
log('  ' + '─'.repeat(105));
for (let i = 0; i < p2Sorted.length; i++) {
  const { p, m, score, varyParam, varyVal } = p2Sorted[i];
  const ok = passes(m, p2BaseM);
  const vLabel = varyParam === 'baseline' ? '   base  ' : `${varyParam.padEnd(4)} = ${String(varyVal).padStart(6)}`;
  log(
    `  ${String(i + 1).padStart(3)} | ${ok ? ' OK ' : 'FAIL'} | ${vLabel} ` +
    `| ${score.toFixed(4)} ` +
    `| ${pct(m.hardOverlapRate, 2).padStart(6)} | ${pct(m.softOverlapRate, 2).padStart(6)} ` +
    `| ${m.zigzagScore.toFixed(4)} | ${m.lateralSpeedScore.toFixed(4)} ` +
    `| ${f2(m.stableOvertakes).padStart(5)} | ${m.pValue.toFixed(3)} | ${f2(m.meanFinishTime)}s`
  );
}
log('');

log('  Direction of improvement per speedBrake parameter:');
for (const [param, levels] of Object.entries(P2_LEVELS)) {
  const rows = p2Rows.filter((r) => r.varyParam === param).sort((a, b) => a.score - b.score);
  const best = rows[0];
  const def  = DEFAULTS[param];
  if (!best) { log(`    ${param}: no survivors`); continue; }
  const dir = best.varyVal < def ? 'lower' : best.varyVal > def ? 'higher' : 'same as default';
  log(`    ${param.padEnd(4)}: best=${best.varyVal}  (default=${def}, direction: ${dir})`);
}
log('');

log('  Best values per parameter (for Phase 3):');
for (const [k, v] of Object.entries(p2BestPerParam))
  log(`    ${k.padEnd(4)} = ${v}`);
log('');

// Top 5 combined combos for Phase 3
const p3CombinedCombos = p1Top10.slice(0, 5).map((r) => ({
  lf:  r.p.lf,
  ld:  r.p.ld,
  hfs: r.p.hfs,
  hfr: r.p.hfr,
  ad:  p2BestPerParam.ad  ?? DEFAULTS.ad,
  sbf: p2BestPerParam.sbf ?? DEFAULTS.sbf,
  sbt: p2BestPerParam.sbt ?? DEFAULTS.sbt,
  sby: p2BestPerParam.sby ?? DEFAULTS.sby,
}));

const p2BestCombined = { ...p3CombinedCombos[0] };

log('  Top 5 combined combos (Phase-1 lf/ld/hfs/hfr + Phase-2 best ad/sbf/sbt/sby):');
for (let i = 0; i < p3CombinedCombos.length; i++) {
  const c = p3CombinedCombos[i];
  log(`  #${i + 1}  lf=${c.lf}  ld=${c.ld}  hfs=${c.hfs}  hfr=${c.hfr}  ad=${c.ad}  sbf=${c.sbf}  sbt=${c.sbt}  sby=${c.sby}`);
}
log('');

printFindingsSoFar({
  phaseDone: '1–2 of 4',
  bestCombo: { ...p2BestCombined, _metrics: p2Pass[0]?.m ?? p2BaseM },
  baselineM: p1BaseM,
  impactMap: { ...p1Impact, ...paramImpact(p2Pass.length > 0 ? p2Pass : p2AllRows, ['ad', 'sbf', 'sbt', 'sby']) },
  totalFailed: p1Fail.length + p2Fail.length,
  estRemaining: '~55 min',
});

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 3 — Fine-tune: top-5 combos × 5 global scale factors
// ══════════════════════════════════════════════════════════════════════════════

const p3T0 = Date.now();
const P3_SCALES = [0.95, 0.975, 1.00, 1.025, 1.050];

log('══════════════════════════════════════════════════════════════════════');
log(' PHASE 3 — Fine-tune: top-5 combined × 5 scale factors');
log('  Scale all 8 params simultaneously by ×0.95, ×0.975, ×1.0, ×1.025, ×1.05');
log('  25 combos × 10 races = 250 races');
log('══════════════════════════════════════════════════════════════════════');
log('');

const p3Rows = [];
for (let ci = 0; ci < p3CombinedCombos.length; ci++) {
  const base = p3CombinedCombos[ci];
  for (const scale of P3_SCALES) {
    const p = {};
    for (const k of Object.keys(base)) {
      let v = base[k] * scale;
      if (k === 'sbf') v = Math.min(v, 0.999);  // clamp: speedBrakeFactor must be < 1.0
      p[k] = v;
    }
    const m = runCombo({ trackId: P1_TRACK, racerType: P1_RACER, nRacers: P1_N,
                         nRaces: P1_RACES, params: p });
    p3Rows.push({ p, m, combo: ci + 1, scale });
  }
  process.stderr.write(`  Phase 3: combo ${ci + 1}/5 done\n`);
}

addScores(p3Rows);
const p3Pass = p3Rows.filter((r) => passes(r.m, p1BaseM));
const p3Fail = p3Rows.filter((r) => !passes(r.m, p1BaseM));
p3Pass.sort((a, b) => a.score - b.score);

log('');
log('═══ PHASE 3 COMPLETE ═══');
log(`  Elapsed: ${elapsed()}  (phase: ${elap(Date.now() - p3T0)})`);
log(`  Survivors: ${p3Pass.length} / ${p3Rows.length}`);
log('');

log('  Full metric table (sorted by composite score):');
log('');
const p3Sorted = [...p3Rows].sort((a, b) => a.score - b.score);
log('   #  | pass | cbo | ×scale | score  | hard%  | soft%  | zigzag | latSpd | stOvt |   p   | finT');
log('  ' + '─'.repeat(105));
for (let i = 0; i < p3Sorted.length; i++) {
  const { m, score, combo, scale } = p3Sorted[i];
  const ok = passes(m, p1BaseM);
  log(
    `  ${String(i + 1).padStart(3)} | ${ok ? ' OK ' : 'FAIL'} |  ${combo}  | ×${scale.toFixed(3)} ` +
    `| ${score.toFixed(4)} ` +
    `| ${pct(m.hardOverlapRate, 2).padStart(6)} | ${pct(m.softOverlapRate, 2).padStart(6)} ` +
    `| ${m.zigzagScore.toFixed(4)} | ${m.lateralSpeedScore.toFixed(4)} ` +
    `| ${f2(m.stableOvertakes).padStart(5)} | ${m.pValue.toFixed(3)} | ${f2(m.meanFinishTime)}s`
  );
}
log('');

// Top 3 winners with exact 8-decimal-place values
const p3TopSource = p3Pass.length >= 3 ? p3Pass : p3Sorted;
const p3Top3 = p3TopSource.slice(0, 3);

log('  Top 3 winning combos — exact parameter values:');
log('');
for (let i = 0; i < p3Top3.length; i++) {
  const { p, m, score, combo, scale } = p3Top3[i];
  const ok = passes(m, p1BaseM);
  log(`  #${i + 1}  (from Phase-3 combo ${combo}, scale=×${scale})  score=${score.toFixed(4)}  ${ok ? 'PASS' : 'FAIL (all-cutoffs fallback)'}`);
  log('');
  log('    Parameter values (8 decimal places):');
  for (const k of Object.keys(p))
    log(`      ${k.padEnd(4)} = ${f8(p[k])}  (default ${f8(DEFAULTS[k])})`);
  log('');
  log('    Metrics:');
  printMetrics(m);
  log('');
}

log('  Comparison vs current defaults (top winner):');
log('');
const p3Winner = p3Top3[0];
log(`  ${'param'.padEnd(4)}  ${'default'.padStart(12)}  ${'winner'.padStart(12)}  ${'% change'.padStart(10)}`);
log('  ' + '─'.repeat(48));
for (const k of Object.keys(p3Winner.p)) {
  const def = DEFAULTS[k];
  const win = p3Winner.p[k];
  const pchange = ((win - def) / def * 100).toFixed(2) + '%';
  log(`  ${k.padEnd(4)}  ${String(def).padStart(12)}  ${f8(win).padStart(12)}  ${pchange.padStart(10)}`);
}
log('');

printFindingsSoFar({
  phaseDone: '1–3 of 4',
  bestCombo: { ...p3Winner.p, _metrics: p3Winner.m },
  baselineM: p1BaseM,
  impactMap: null,
  totalFailed: p1Fail.length + p2Fail.length + p3Fail.length,
  estRemaining: '~50 min',
});

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 4 — Validation: top-3 combos × 10 tracks × 100 races
// ══════════════════════════════════════════════════════════════════════════════

const p4T0 = Date.now();

log('══════════════════════════════════════════════════════════════════════');
log(' PHASE 4 — Validation across 10 tracks × 100 races');
log('  Running defaults baseline (10 races) + 3 combos (100 races) per track');
log('  3100 total races');
log('══════════════════════════════════════════════════════════════════════');
log('');

// Phase 4 per-track baselines (10 races each with full defaults)
log('── Computing per-track baselines (10 races/track with current defaults)…');
const p4Baselines = {};
for (const { id, label, racer, n } of P4_TRACKS) {
  p4Baselines[id] = runCombo({ trackId: id, racerType: racer, nRacers: n,
                               durSec: 60, nRaces: 10, params: { ...DEFAULTS } });
  process.stderr.write(`  Phase 4 baseline: ${label}\n`);
}
log('  Baselines done.');
log('');

// Phase 4: run each combo on each track
const p4Results = [];  // { comboIdx, trackId, label, m }
for (let ci = 0; ci < 3; ci++) {
  const combo = p3Top3[ci].p;
  log(`── Combo #${ci + 1} across 10 tracks (100 races each)…`);
  const trackScores = [];
  for (const { id, label, racer, n } of P4_TRACKS) {
    const m = runCombo({ trackId: id, racerType: racer, nRacers: n,
                         durSec: 60, nRaces: 100, params: combo });
    p4Results.push({ comboIdx: ci, trackId: id, label, m });
    trackScores.push(m);
    process.stderr.write(`  Phase 4: combo ${ci + 1}/3, track ${label}\n`);
  }
  log(`  Combo #${ci + 1} done.`);
}
log('');

// Compute composite scores per track across 3 combos
// Normalize within each track (3 combos), then average across tracks
const p4MeanScores = [0, 0, 0];
const p4PassAll    = [true, true, true];

for (const { id } of P4_TRACKS) {
  const trackRows = p4Results
    .filter((r) => r.trackId === id)
    .map((r) => ({ m: r.m, comboIdx: r.comboIdx }));

  addScores(trackRows.map((r) => ({ m: r.m })));
  for (let i = 0; i < trackRows.length; i++) {
    const row = trackRows[i];
    const base = p4Baselines[id];
    if (!passes(row.m, base)) p4PassAll[row.comboIdx] = false;
  }
  // sum scores per combo
  for (const row of trackRows) {
    p4MeanScores[row.comboIdx] += (row.score ?? 0);
  }
}

// Average across 10 tracks
for (let i = 0; i < 3; i++) p4MeanScores[i] /= P4_TRACKS.length;

log('');
log('═══ PHASE 4 COMPLETE ═══');
log(`  Elapsed: ${elapsed()}  (phase: ${elap(Date.now() - p4T0)})`);
log('');

// Per-track metric table for each combo
for (let ci = 0; ci < 3; ci++) {
  log(`  ── Combo #${ci + 1} per-track results:`);
  log('');
  log(`  ${'Track'.padEnd(16)} | ${'hard%'.padStart(7)} | ${'soft%'.padStart(7)} | ${'zigzag'.padStart(7)} | ${'latSpd'.padStart(7)} | ${'stOvt'.padStart(6)} | ${'p'.padStart(6)} | ${'finT'.padStart(6)} | pass`);
  log('  ' + '─'.repeat(95));
  const rows = p4Results.filter((r) => r.comboIdx === ci);
  for (const { label, m, trackId } of rows) {
    const base = p4Baselines[trackId];
    const ok   = passes(m, base);
    const fr   = ok ? ' OK' : 'FAIL';
    log(
      `  ${label.padEnd(16)} | ${pct(m.hardOverlapRate, 2).padStart(7)} | ${pct(m.softOverlapRate, 2).padStart(7)} ` +
      `| ${m.zigzagScore.toFixed(4).padStart(7)} | ${m.lateralSpeedScore.toFixed(4).padStart(7)} ` +
      `| ${f2(m.stableOvertakes).padStart(6)} | ${m.pValue.toFixed(3).padStart(6)} | ${f2(m.meanFinishTime).padStart(5)}s | ${fr}`
    );
  }
  log(`  Mean composite score (across 10 tracks): ${p4MeanScores[ci].toFixed(5)}`);
  log(`  Passes ALL hard cutoffs on ALL tracks: ${p4PassAll[ci] ? 'YES' : 'NO'}`);
  log('');
}

// Determine winner
const eligibleIdx = [0, 1, 2].filter((i) => p4PassAll[i]);
let winnerIdx;
if (eligibleIdx.length > 0) {
  winnerIdx = eligibleIdx.reduce((best, i) => p4MeanScores[i] < p4MeanScores[best] ? i : best, eligibleIdx[0]);
} else {
  // fallback: best mean score regardless of cutoffs
  winnerIdx = [0, 1, 2].reduce((best, i) => p4MeanScores[i] < p4MeanScores[best] ? i : best, 0);
  log('  ⚠ No combo passed all hard cutoffs on all tracks — using best mean score as fallback.');
}

const winnerCombo = p3Top3[winnerIdx].p;
const winnerBaseM = p1BaseM;  // use Phase-1 baseline (Space Sprint / rocket) as reference

log('');
log('══════════════════════════════════════════════════════════════════════');
log('  OVERALL WINNER');
log('══════════════════════════════════════════════════════════════════════');
log('');
log(`  Winner: Combo #${winnerIdx + 1}  (mean composite score: ${p4MeanScores[winnerIdx].toFixed(5)})`);
log(`  Passes all cutoffs on all tracks: ${p4PassAll[winnerIdx] ? 'YES' : 'NO'}`);
log('');

log('╔══════════════════════════════════════════════════════════════════╗');
log('║  RECOMMENDED NEW DEFAULTS                                       ║');
log('╚══════════════════════════════════════════════════════════════════╝');
log('');
for (const [k, v] of Object.entries(winnerCombo))
  log(`  ${KEY_MAP[k].padEnd(26)}: ${f8(v)}`);
log('');

log('  Full comparison — winner vs current defaults:');
log('');
log(`  ${'parameter'.padEnd(26)}  ${'default'.padStart(12)}  ${'winner'.padStart(12)}  ${'% change'.padStart(10)}`);
log('  ' + '─'.repeat(65));
for (const [k, v] of Object.entries(winnerCombo)) {
  const def  = DEFAULTS[k];
  const pch  = ((v - def) / def * 100).toFixed(2) + '%';
  log(`  ${KEY_MAP[k].padEnd(26)}  ${String(def).padStart(12)}  ${f8(v).padStart(12)}  ${pch.padStart(10)}`);
}
log('');

// Per-metric improvement vs Space Sprint baseline
const winnerP4SpaceRows = p4Results.filter((r) => r.comboIdx === winnerIdx && r.trackId === 'space-sprint');
if (winnerP4SpaceRows.length > 0) {
  const wm = winnerP4SpaceRows[0].m;
  log('  Per-metric improvement vs baseline (Space Sprint / rocket):');
  const diff = (a, b, inv = false) => {
    const d = ((a - b) / b * 100).toFixed(1) + '%';
    return (inv ? (a > b ? '+' : '') : (a < b ? '▼' : '▲')) + d;
  };
  log(`    hardOverlapRate:    ${pct(wm.hardOverlapRate)}  vs ${pct(winnerBaseM.hardOverlapRate)}  ${diff(wm.hardOverlapRate, winnerBaseM.hardOverlapRate)}`);
  log(`    softOverlapRate:    ${pct(wm.softOverlapRate)}  vs ${pct(winnerBaseM.softOverlapRate)}  ${diff(wm.softOverlapRate, winnerBaseM.softOverlapRate)}`);
  log(`    zigzagScore:        ${f4(wm.zigzagScore)}  vs ${f4(winnerBaseM.zigzagScore)}  ${diff(wm.zigzagScore, winnerBaseM.zigzagScore)}`);
  log(`    lateralSpeedScore:  ${f4(wm.lateralSpeedScore)}  vs ${f4(winnerBaseM.lateralSpeedScore)}  ${diff(wm.lateralSpeedScore, winnerBaseM.lateralSpeedScore)}`);
  log(`    stableOvertakes:    ${f2(wm.stableOvertakes)}  vs ${f2(winnerBaseM.stableOvertakes)}  ${diff(wm.stableOvertakes, winnerBaseM.stableOvertakes, true)}`);
  log(`    meanFinishTime:     ${f2(wm.meanFinishTime)}s  vs ${f2(winnerBaseM.meanFinishTime)}s`);
}
log('');

log(`  Total elapsed: ${elapsed()}`);
log(`  Total races (approximate): ${82*10 + 17*10 + 25*10 + 3100}`);
log('');
log('=== 4-PHASE SWEEP COMPLETE ===');
