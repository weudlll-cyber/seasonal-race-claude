/**
 * sweep-balanced-lhs.mjs
 * Phase 1: LHS balanced sweep — Dirt Oval (horse 40) + Space Sprint (rocket 60).
 * 200 LHS samples + baseline (#0) = 201 combos × 10 races/track × 2 tracks = 4020 races.
 * Outputs to sweep-balanced-lhs-results.txt.
 */

import { readFileSync, appendFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { EditorShape }                                              from '../client/src/modules/track-editor/EditorShape.js';
import { DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG } from '../client/src/modules/storage/defaults.js';
import { RACER_CONFIGS, runSingleRace, computeFinishT }            from './sim-fairness.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const OUT   = join(ROOT, 'sweep-balanced-lhs-results.txt');

writeFileSync(OUT, '');

function log(...args) {
  const line = args.map(String).join(' ');
  process.stdout.write(line + '\n');
  appendFileSync(OUT, line + '\n');
}

const pct     = (v, d = 2) => (v * 100).toFixed(d) + '%';
const f4      = (v) => v.toFixed(4);
const f2      = (v) => v.toFixed(2);
const T_START = Date.now();
const elapsed = () => `${((Date.now() - T_START) / 60000).toFixed(1)} min`;

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const BASE_SPEED_MEAN = (DEFAULT_BASE_SPEED_CONFIG.min + DEFAULT_BASE_SPEED_CONFIG.max) / 2;

const DEFAULTS = {
  lateralForce:                DEFAULT_RACE_BEHAVIOR_CONFIG.lateralForce,
  lateralDamping:              DEFAULT_RACE_BEHAVIOR_CONFIG.lateralDamping,
  homeForceStrength:           DEFAULT_RACE_BEHAVIOR_CONFIG.homeForceStrength,
  homeForceReductionOnOverlap: DEFAULT_RACE_BEHAVIOR_CONFIG.homeForceReductionOnOverlap,
  avoidanceDistance:           DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceDistance,
  speedBrakeFactor:            DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeFactor,
  speedBrakeTThreshold:        DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeTThreshold,
  speedBrakeYThreshold:        DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeYThreshold,
};

// ── Parameter levels (5 per param: L1=−10%, L2=−5%, L3=0%, L4=+5%, L5=+10%) ─
const PARAMS = [
  { key: 'lateralForce',                short: 'lf',  levels: [0.01080, 0.01140, 0.01200, 0.01260, 0.01320] },
  { key: 'lateralDamping',              short: 'ld',  levels: [0.22500, 0.23750, 0.25000, 0.26250, 0.27500] },
  { key: 'homeForceStrength',           short: 'hfs', levels: [0.03600, 0.03800, 0.04000, 0.04200, 0.04400] },
  { key: 'homeForceReductionOnOverlap', short: 'hfr', levels: [0.27000, 0.28500, 0.30000, 0.31500, 0.33000] },
  { key: 'avoidanceDistance',           short: 'ad',  levels: [0.13500, 0.14250, 0.15000, 0.15750, 0.16500] },
  { key: 'speedBrakeFactor',            short: 'sbf', levels: [0.95500, 0.95250, 0.95000, 0.94750, 0.94500] },
  { key: 'speedBrakeTThreshold',        short: 'sbt', levels: [0.01350, 0.01425, 0.01500, 0.01575, 0.01650] },
  { key: 'speedBrakeYThreshold',        short: 'sby', levels: [0.18000, 0.19000, 0.20000, 0.21000, 0.22000] },
];

// ── LHS generator ─────────────────────────────────────────────────────────────
function generateLHS(nSamples, params, rng) {
  const result = Array.from({ length: nSamples }, () => ({}));
  for (const { key, levels } of params) {
    const nL    = levels.length;
    const reps  = Math.floor(nSamples / nL);
    const idx   = [];
    for (let i = 0; i < nL; i++)
      for (let j = 0; j < reps; j++) idx.push(i);
    while (idx.length < nSamples) idx.push(idx.length % nL);
    for (let i = nSamples - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    for (let i = 0; i < nSamples; i++) result[i][key] = levels[idx[i]];
  }
  return result;
}

// ── Chi-square p-value ────────────────────────────────────────────────────────
function chiSquareP(observed) {
  const total = observed.reduce((s, c) => s + c, 0);
  if (total === 0) return 1;
  const n = observed.length, exp = total / n;
  let chi2 = 0;
  for (const c of observed) chi2 += (c - exp) ** 2 / exp;
  const df = n - 1;
  const h  = chi2 / df - 1 + 2 / (9 * df);
  const z  = h / Math.sqrt(2 / (9 * df));
  return Math.max(0, Math.min(1, 1 - 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)))));
}

// ── Track loader ──────────────────────────────────────────────────────────────
function loadTrack(trackId, racerType, nRacers, durSec) {
  const raw  = JSON.parse(readFileSync(join(ROOT, 'server/data/tracks', `${trackId}.json`), 'utf8'));
  const shape = new EditorShape(raw);
  const isOpen            = !!shape.isOpen;
  const pathLengthPx      = raw.pathLengthPx ?? shape.getTotalLength();
  const geometricTrackWidth = shape.getActualTrackWidth();
  const { displaySize, bodyFillX, bodyFillY, speedMultiplier } = RACER_CONFIGS[racerType];
  const finishT = computeFinishT(BASE_SPEED_MEAN, speedMultiplier, durSec, isOpen);
  return { shape, isOpen, pathLengthPx, geometricTrackWidth,
           displaySize, bodyFillX, bodyFillY, speedMultiplier, finishT, nRacers, durSec };
}

// ── Run N races on one track ──────────────────────────────────────────────────
function runOnTrack(td, params, nRaces, seed0) {
  const hard = [], soft = [], zig = [], lat = [], so = [], fin = [];
  const tally = new Array(td.nRacers).fill(0);
  for (let r = 0; r < nRaces; r++) {
    const res = runSingleRace({
      shape: td.shape, pathLengthPx: td.pathLengthPx,
      geometricTrackWidth: td.geometricTrackWidth, isOpen: td.isOpen,
      speedMultiplier: td.speedMultiplier, displaySize: td.displaySize,
      bodyFillX: td.bodyFillX, bodyFillY: td.bodyFillY,
      finishT: td.finishT, targetSeconds: td.durSec,
      seed: seed0 + r, nRacers: td.nRacers,
      behaviorConfigOverrides: params,
    });
    hard.push(res.liteHardOverlapRate ?? 0);
    soft.push(res.liteSoftOverlapRate ?? 0);
    zig .push(res.liteZigzagScore     ?? 0);
    lat .push(res.liteLatSpeedScore   ?? 0);
    so  .push(res.liteStableOvertakes ?? 0);
    const fin2 = res.filter((r2) => r2.finishTime != null);
    fin.push(fin2.length > 0 ? fin2.reduce((s, r2) => s + r2.finishTime, 0) / fin2.length : td.durSec);
    for (const r2 of res)
      if (r2.finalRank != null && r2.finalRank >= 1 && r2.finalRank <= td.nRacers)
        tally[r2.finalRank - 1]++;
  }
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  return { hardOverlapRate: avg(hard), softOverlapRate: avg(soft), zigzagScore: avg(zig),
           lateralSpeedScore: avg(lat), stableOvertakes: avg(so),
           meanFinishTime: avg(fin), pValue: chiSquareP(tally) };
}

// ── Hard cutoff check (per-track) ─────────────────────────────────────────────
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
  const r = [];
  if (m.pValue            <  0.05)                      r.push('FAIRNESS');
  if (m.zigzagScore       >  0.003)                     r.push('ZIGZAG');
  if (m.hardOverlapRate   >  0.03)                      r.push('HARD_OVERLAP');
  if (m.lateralSpeedScore >  base.lateralSpeedScore * 2) r.push('LAT_SPEED');
  if (m.meanFinishTime    <  base.meanFinishTime * 0.85) r.push('FINISH_LOW');
  if (m.meanFinishTime    >  base.meanFinishTime * 1.15) r.push('FINISH_HIGH');
  return r.join(', ');
}

// ── Composite score weights ───────────────────────────────────────────────────
const WEIGHTS = [
  { k: 'hardOverlapRate',   w: 0.30, inv: false },
  { k: 'zigzagScore',       w: 0.25, inv: false },
  { k: 'lateralSpeedScore', w: 0.20, inv: false },
  { k: 'softOverlapRate',   w: 0.10, inv: false },
  { k: 'stableOvertakes',   w: 0.10, inv: true  },
  // racePlanSuccessRate w=0.05 — zero variance for same-type racers, omitted
];

function computeTrackScores(rows, mKey) {
  const mm = {};
  for (const { k } of WEIGHTS) {
    const vals = rows.map((r) => r[mKey][k]);
    mm[k] = { min: Math.min(...vals), max: Math.max(...vals) };
  }
  for (const row of rows) {
    let s = 0;
    for (const { k, w, inv } of WEIGHTS) {
      const { min, max } = mm[k];
      if (max === min) continue;
      const n = (row[mKey][k] - min) / (max - min);
      s += w * (inv ? 1 - n : n);
    }
    row[`score_${mKey}`] = s;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════════

log('');
log('══════════════════════════════════════════════════════════════════════');
log(' SWEEP — Balanced LHS: Dirt Oval + Space Sprint');
log(`  Started: ${new Date().toISOString()}`);
log('  201 combos × 10 races/track × 2 tracks = 4020 races');
log('  Estimated runtime: ~40 min');
log('══════════════════════════════════════════════════════════════════════');
log('');

const tDO = loadTrack('dirt-oval',    'horse',  40, 60);
const tSS = loadTrack('space-sprint', 'rocket', 60, 60);

log(`  Dirt Oval    (horse  40 racers): isOpen=${tDO.isOpen}  pathLen=${Math.round(tDO.pathLengthPx)}px  width=${Math.round(tDO.geometricTrackWidth)}px  finishT=${tDO.finishT.toFixed(5)}`);
log(`  Space Sprint (rocket 60 racers): isOpen=${tSS.isOpen}  pathLen=${Math.round(tSS.pathLengthPx)}px  width=${Math.round(tSS.geometricTrackWidth)}px  finishT=${tSS.finishT.toFixed(5)}`);
log('');
log('  Parameter ranges (±10% around defaults):');
for (const { short, key, levels } of PARAMS)
  log(`    ${short.padEnd(4)} (${key}): [${levels.map((v) => v.toFixed(5)).join(', ')}]`);
log('');

const rng       = mulberry32(9999);
const lhsSamples = generateLHS(200, PARAMS, rng);
const allCombos  = [{ ...DEFAULTS }, ...lhsSamples];

log(`  Generated 200 LHS samples (seed=9999) + 1 baseline = ${allCombos.length} total combos.`);
log('');
log('── Running sweep…');
log('');

const results = [];
for (let i = 0; i < allCombos.length; i++) {
  const params = allCombos[i];
  const mDO    = runOnTrack(tDO, params, 10, 1000 + i * 10);
  const mSS    = runOnTrack(tSS, params, 10, 5000 + i * 10);
  results.push({ i, params, mDO, mSS });
  if ((i + 1) % 20 === 0 || i === allCombos.length - 1)
    process.stderr.write(`  ${i + 1}/${allCombos.length}  elapsed: ${elapsed()}\n`);
}

log(`  All ${allCombos.length} combos complete.  Elapsed: ${elapsed()}`);
log('');

// Normalize per-track scores across all 201 combos, then average
computeTrackScores(results, 'mDO');
computeTrackScores(results, 'mSS');
for (const r of results) r.score = (r.score_mDO + r.score_mSS) / 2;

const base   = results[0];
const baseDO = base.mDO;
const baseSS = base.mSS;

for (const r of results) {
  r.passDO  = passes(r.mDO, baseDO);
  r.passSS  = passes(r.mSS, baseSS);
  r.passAll = r.passDO && r.passSS;
}

const passedBoth = results.filter((r) => r.passAll).sort((a, b) => a.score - b.score);
const failedOne  = results.filter((r) => !r.passAll && (r.passDO || r.passSS));
const failedBoth = results.filter((r) => !r.passDO && !r.passSS);

// ── Report ─────────────────────────────────────────────────────────────────────
log('═══ PHASE 1 COMPLETE ═══');
log(`  Runtime: ${elapsed()}`);
log('');

log('  Baseline (combo #0 — current defaults):');
log('');
log('  Dirt Oval (horse, 40 racers, closed loop):');
log(`    hardOverlapRate:    ${pct(baseDO.hardOverlapRate, 3)}`);
log(`    softOverlapRate:    ${pct(baseDO.softOverlapRate, 3)}`);
log(`    zigzagScore:        ${f4(baseDO.zigzagScore)}`);
log(`    lateralSpeedScore:  ${f4(baseDO.lateralSpeedScore)}`);
log(`    stableOvertakes:    ${f2(baseDO.stableOvertakes)}`);
log(`    fairness p:         ${baseDO.pValue.toFixed(4)}`);
log(`    meanFinishTime:     ${f2(baseDO.meanFinishTime)}s`);
log(`    passes cutoffs:     ${base.passDO ? 'YES' : 'NO'}${!base.passDO ? '  (' + failReasons(baseDO, baseDO) + ')' : ''}`);
log('');
log('  Space Sprint (rocket, 60 racers, open):');
log(`    hardOverlapRate:    ${pct(baseSS.hardOverlapRate, 3)}`);
log(`    softOverlapRate:    ${pct(baseSS.softOverlapRate, 3)}`);
log(`    zigzagScore:        ${f4(baseSS.zigzagScore)}`);
log(`    lateralSpeedScore:  ${f4(baseSS.lateralSpeedScore)}`);
log(`    stableOvertakes:    ${f2(baseSS.stableOvertakes)}`);
log(`    fairness p:         ${baseSS.pValue.toFixed(4)}`);
log(`    meanFinishTime:     ${f2(baseSS.meanFinishTime)}s`);
log(`    passes cutoffs:     ${base.passSS ? 'YES' : 'NO'}${!base.passSS ? '  (' + failReasons(baseSS, baseSS) + ')' : ''}`);
log('');
log(`  Baseline combined score: ${base.score.toFixed(5)}`);
log('');

log('  Pass/fail summary (201 combos):');
log(`    Passed BOTH tracks:    ${passedBoth.length}`);
log(`    Failed one track only: ${failedOne.length}`);
log(`    Failed both tracks:    ${failedBoth.length}`);
log('');

// ── Full table of qualified combos ───────────────────────────────────────────
const toReport = passedBoth.length > 0
  ? passedBoth
  : [...results].sort((a, b) => a.score - b.score).slice(0, 30);

if (passedBoth.length === 0) {
  log('  ⚠ No combos passed BOTH tracks. Showing top 30 by composite score (no cutoff filter):');
} else {
  log(`  All ${passedBoth.length} passing combos (sorted by composite score, best first):`);
}
log('');

const H = [
  '   #', ' score',
  ' DO-hard%', ' DO-soft%', 'DO-zig ', 'DO-lat ', 'DO-stOvt', 'DO-p  ', 'DO-finT ',
  ' SS-hard%', ' SS-soft%', 'SS-zig ', 'SS-lat ', 'SS-stOvt', 'SS-p  ', 'SS-finT ',
  ' DO', ' SS',
];
log('  ' + H.join(' | '));
log('  ' + '─'.repeat(H.join(' | ').length + 2));

for (const r of toReport) {
  const d = r.mDO, s = r.mSS;
  const row = [
    String(r.i).padStart(4),
    r.score.toFixed(4).padStart(6),
    pct(d.hardOverlapRate).padStart(9),
    pct(d.softOverlapRate).padStart(9),
    f4(d.zigzagScore).padStart(7),
    f4(d.lateralSpeedScore).padStart(7),
    f2(d.stableOvertakes).padStart(8),
    d.pValue.toFixed(3).padStart(6),
    `${f2(d.meanFinishTime)}s`.padStart(8),
    pct(s.hardOverlapRate).padStart(9),
    pct(s.softOverlapRate).padStart(9),
    f4(s.zigzagScore).padStart(7),
    f4(s.lateralSpeedScore).padStart(7),
    f2(s.stableOvertakes).padStart(8),
    s.pValue.toFixed(3).padStart(6),
    `${f2(s.meanFinishTime)}s`.padStart(8),
    (r.passDO ? ' OK' : 'FAI').padStart(3),
    (r.passSS ? ' OK' : 'FAI').padStart(3),
  ];
  log('  ' + row.join(' | '));
}
log('');

// ── Top 10 detail with full parameter values ──────────────────────────────────
const top10 = toReport.slice(0, 10);
log(`  Top ${top10.length} combos — full parameter values:`);
log('');
for (let rank = 0; rank < top10.length; rank++) {
  const r = top10[rank];
  log(`  #${rank + 1}  (combo ${r.i})  combined score=${r.score.toFixed(5)}  score_DO=${r.score_mDO.toFixed(5)}  score_SS=${r.score_mSS.toFixed(5)}`);
  for (const { key, short } of PARAMS) {
    const val = r.params[key];
    const def = DEFAULTS[key];
    const pch = ((val - def) / def * 100).toFixed(1);
    log(`    ${short.padEnd(4)} = ${val.toFixed(5)}  (default ${def.toFixed(5)}, ${pch.padStart(5)}%)`);
  }
  const d = r.mDO, s = r.mSS;
  log(`    Dirt Oval:    hard=${pct(d.hardOverlapRate)}  soft=${pct(d.softOverlapRate)}  zig=${f4(d.zigzagScore)}  lat=${f4(d.lateralSpeedScore)}  stOvt=${f2(d.stableOvertakes)}  p=${d.pValue.toFixed(3)}  finT=${f2(d.meanFinishTime)}s  ${r.passDO ? 'OK' : 'FAIL:' + failReasons(d, baseDO)}`);
  log(`    Space Sprint: hard=${pct(s.hardOverlapRate)}  soft=${pct(s.softOverlapRate)}  zig=${f4(s.zigzagScore)}  lat=${f4(s.lateralSpeedScore)}  stOvt=${f2(s.stableOvertakes)}  p=${s.pValue.toFixed(3)}  finT=${f2(s.meanFinishTime)}s  ${r.passSS ? 'OK' : 'FAIL:' + failReasons(s, baseSS)}`);
  log('');
}

// ── Parameter importance ──────────────────────────────────────────────────────
log('  Parameter importance — mean composite score per level:');
log('  (lower score = better; shows which direction each parameter should move)');
log('');

for (const { key, short, levels } of PARAMS) {
  const levelData = levels.map((lvl, li) => {
    const subset = results.filter((r) => Math.abs(r.params[key] - lvl) < 1e-9);
    if (subset.length === 0) return { lvl, li, mean: null, n: 0 };
    const mean = subset.reduce((s, r) => s + r.score, 0) / subset.length;
    return { lvl, li, mean, n: subset.length };
  });
  const bestLi = levelData.reduce((bi, d, i) =>
    (d.mean !== null && (bi === -1 || d.mean < levelData[bi].mean)) ? i : bi, -1);
  const def = DEFAULTS[key];
  log(`  ${short.padEnd(4)}  (${key}, default=${def.toFixed(5)}):`);
  for (const { lvl, li, mean, n } of levelData) {
    const pch = ((lvl - def) / def * 100).toFixed(1).padStart(6) + '%';
    const marker = li === bestLi ? '  ← best' : '';
    log(`    L${li + 1} (${pch}) = ${lvl.toFixed(5)}  mean score = ${mean !== null ? mean.toFixed(5) : '  N/A  '}  (n=${n})${marker}`);
  }
  log('');
}

log('AWAITING USER INPUT — Phase 2 not started.');
