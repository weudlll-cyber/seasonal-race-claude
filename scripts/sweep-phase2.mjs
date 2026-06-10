// ============================================================
// File:        sweep-phase2.mjs
// Path:        scripts/sweep-phase2.mjs
// Project:     RaceArena
// Created:     2026-06-04
// Description: Phase 2 extended-range + fine-tuning around Phase 1 winner —
//              26 combos × 520 races; outputs to sweep-phase2-results.txt.
// ============================================================

/**
 * sweep-phase2.mjs
 * Phase 2: Extended range (sub-sweep A) + fine-tuning (sub-sweep B) around Phase 1 winner.
 * 26 combos × 10 races/track × 2 tracks = 520 races.
 * Outputs to sweep-phase2-results.txt with incremental progress every 5 combos.
 */

import { readFileSync, appendFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { EditorShape }                                              from '../client/src/modules/track-editor/EditorShape.js';
import { DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG } from '../client/src/modules/storage/defaults.js';
import { RACER_CONFIGS, runSingleRace, computeFinishT }            from './sim-fairness.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const OUT   = join(ROOT, 'sweep-phase2-results.txt');

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
const elapsed = () => {
  const ms = Date.now() - T_START;
  const m  = Math.floor(ms / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
};

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

// Phase 1 winner (hfs=0.036 from importance analysis, not combo #19's 0.040)
const WINNER = {
  lateralForce:                0.01140,
  lateralDamping:              0.22500,
  homeForceStrength:           0.03600,
  homeForceReductionOnOverlap: 0.30000,
  avoidanceDistance:           0.16500,
  speedBrakeFactor:            0.94500,
  speedBrakeTThreshold:        0.01350,
  speedBrakeYThreshold:        0.18000,
};

const PARAM_KEYS   = ['lateralForce', 'lateralDamping', 'homeForceStrength',
                      'homeForceReductionOnOverlap', 'avoidanceDistance',
                      'speedBrakeFactor', 'speedBrakeTThreshold', 'speedBrakeYThreshold'];
const PARAM_SHORTS = { lateralForce: 'lf', lateralDamping: 'ld', homeForceStrength: 'hfs',
                       homeForceReductionOnOverlap: 'hfr', avoidanceDistance: 'ad',
                       speedBrakeFactor: 'sbf', speedBrakeTThreshold: 'sbt',
                       speedBrakeYThreshold: 'sby' };

// ── Build combo list ──────────────────────────────────────────────────────────
const allCombos = [];

// #0: baseline (current defaults)
allCombos.push({ params: { ...DEFAULTS }, label: 'baseline', sweepSub: null, sweepKey: null });

// #1: Phase 1 winner
allCombos.push({ params: { ...WINNER }, label: 'phase1-winner', sweepSub: null, sweepKey: null });

// Sub-sweep A — extended range, vary one param at a time from winner values
// Winner level excluded from each (covered by combo #1)
const A_SWEEPS = [
  { key: 'lateralDamping',    short: 'ld',  levels: [0.175, 0.200, 0.250, 0.275] },   // winner=0.225
  { key: 'homeForceStrength', short: 'hfs', levels: [0.028, 0.032, 0.040, 0.044] },   // winner=0.036
  { key: 'avoidanceDistance', short: 'ad',  levels: [0.150, 0.180, 0.195, 0.210] },   // winner=0.165
];
for (const { key, short, levels } of A_SWEEPS) {
  for (const lvl of levels) {
    allCombos.push({
      params:   { ...WINNER, [key]: lvl },
      label:    `A-${short}=${String(lvl)}`,
      sweepSub: 'A',
      sweepKey: key,
    });
  }
}

// Sub-sweep B — fine-tune ±5%/±2.5% around winner, vary one param at a time
// Winner level excluded from each (covered by combo #1)
const B_SWEEPS = [
  { key: 'lateralDamping',    short: 'ld_f',  levels: [0.2081, 0.2138, 0.2363, 0.2475] },   // winner=0.225
  { key: 'homeForceStrength', short: 'hfs_f', levels: [0.0324, 0.0342, 0.0378, 0.0396] },   // winner=0.036
  { key: 'lateralForce',      short: 'lf_f',  levels: [0.01026, 0.01083, 0.01197, 0.01254] }, // winner=0.0114
];
for (const { key, short, levels } of B_SWEEPS) {
  for (const lvl of levels) {
    allCombos.push({
      params:   { ...WINNER, [key]: lvl },
      label:    `B-${short}=${String(lvl)}`,
      sweepSub: 'B',
      sweepKey: key,
    });
  }
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
  const raw   = JSON.parse(readFileSync(join(ROOT, 'server/data/tracks', `${trackId}.json`), 'utf8'));
  const shape = new EditorShape(raw);
  const isOpen              = !!shape.isOpen;
  const pathLengthPx        = raw.pathLengthPx ?? shape.getTotalLength();
  const geometricTrackWidth = raw.width ?? shape.getActualTrackWidth();
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

// ── Hard cutoff check ─────────────────────────────────────────────────────────
function passes(m, base) {
  return (
    m.pValue            >= 0.05 &&
    m.zigzagScore       <= 0.003 &&
    m.hardOverlapRate   <= 0.03 &&
    m.lateralSpeedScore <= base.lateralSpeedScore * 2 &&
    m.meanFinishTime    >= base.meanFinishTime * 0.85 &&
    m.meanFinishTime    <= base.meanFinishTime * 1.15
  );
}

function failReasons(m, base) {
  const r = [];
  if (m.pValue            <  0.05)                        r.push('FAIRNESS');
  if (m.zigzagScore       >  0.003)                       r.push('ZIGZAG');
  if (m.hardOverlapRate   >  0.03)                        r.push('HARD_OVERLAP');
  if (m.lateralSpeedScore >  base.lateralSpeedScore * 2)  r.push('LAT_SPEED');
  if (m.meanFinishTime    <  base.meanFinishTime * 0.85)  r.push('FINISH_LOW');
  if (m.meanFinishTime    >  base.meanFinishTime * 1.15)  r.push('FINISH_HIGH');
  return r.join(', ');
}

// ── Composite score ───────────────────────────────────────────────────────────
const WEIGHTS = [
  { k: 'hardOverlapRate',   w: 0.30, inv: false },
  { k: 'zigzagScore',       w: 0.25, inv: false },
  { k: 'lateralSpeedScore', w: 0.20, inv: false },
  { k: 'softOverlapRate',   w: 0.10, inv: false },
  { k: 'stableOvertakes',   w: 0.10, inv: true  },
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

// ── Incremental progress update (file only) ───────────────────────────────────
function writeProgress(results, completed, total) {
  if (results.length < 2) return;
  const tmp = results.map((r) => ({ ...r }));
  computeTrackScores(tmp, 'mDO');
  computeTrackScores(tmp, 'mSS');
  for (const r of tmp) r.score = (r.score_mDO + r.score_mSS) / 2;
  tmp.sort((a, b) => a.score - b.score);

  const best = tmp[0];
  const p    = best.params;
  const top5 = tmp.slice(0, Math.min(5, tmp.length));

  const lines = [
    ``,
    `--- Progress update after combo ${completed}/${total} ---`,
    `Elapsed: ${elapsed()}`,
    `Best so far: combo #${best.i} (${best.label}) score ${best.score.toFixed(4)}`,
    `  params: lf=${p.lateralForce.toFixed(5)} ld=${p.lateralDamping.toFixed(5)} hfs=${p.homeForceStrength.toFixed(5)} hfr=${p.homeForceReductionOnOverlap.toFixed(5)} ad=${p.avoidanceDistance.toFixed(5)} sbf=${p.speedBrakeFactor.toFixed(5)} sbt=${p.speedBrakeTThreshold.toFixed(5)} sby=${p.speedBrakeYThreshold.toFixed(5)}`,
    `Top ${top5.length} so far:`,
    `  rank | combo | label                   | score  | DO-hard  | SS-hard  | DO-pass | SS-pass`,
    `  ────────────────────────────────────────────────────────────────────────────────────────`,
  ];
  for (let ri = 0; ri < top5.length; ri++) {
    const r = top5[ri];
    lines.push(
      `  ${String(ri + 1).padStart(4)} | ${String(r.i).padStart(5)} | ${r.label.padEnd(23)} | ${r.score.toFixed(4)} | ${pct(r.mDO.hardOverlapRate).padStart(8)} | ${pct(r.mSS.hardOverlapRate).padStart(8)} | ${r.mDO ? '?' : '?'}`
    );
  }
  lines.push('');
  appendFileSync(OUT, lines.join('\n') + '\n');
  process.stderr.write(`  ${completed}/${total}  elapsed: ${elapsed()}\n`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════════

log('');
log('══════════════════════════════════════════════════════════════════════');
log(' SWEEP Phase 2 — Extended range + fine-tuning around Phase 1 winner');
log(`  Started: ${new Date().toISOString()}`);
log('  26 combos × 10 races/track × 2 tracks = 520 races');
log('  Estimated runtime: ~8 min');
log('══════════════════════════════════════════════════════════════════════');
log('');

const tDO = loadTrack('dirt-oval',    'horse',  40, 60);
const tSS = loadTrack('space-sprint', 'rocket', 60, 60);

log(`  Dirt Oval    (horse  40): isOpen=${tDO.isOpen}  pathLen=${Math.round(tDO.pathLengthPx)}px  width=${Math.round(tDO.geometricTrackWidth)}px  finishT=${tDO.finishT.toFixed(5)}`);
log(`  Space Sprint (rocket 60): isOpen=${tSS.isOpen}  pathLen=${Math.round(tSS.pathLengthPx)}px  width=${Math.round(tSS.geometricTrackWidth)}px  finishT=${tSS.finishT.toFixed(5)}`);
log('');
log('  Phase 1 winner (all non-swept params held here):');
for (const key of PARAM_KEYS) {
  const def = DEFAULTS[key];
  const win = WINNER[key];
  const pch = ((win - def) / def * 100).toFixed(1);
  log(`    ${PARAM_SHORTS[key].padEnd(4)} = ${win.toFixed(5)}  (default ${def.toFixed(5)}, ${pch.padStart(5)}%)`);
}
log('');
log('  Sub-sweep A (extended range, vary-one-at-a-time, other params at winner):');
log('    ld:  [0.175, 0.200, *0.225, 0.250, 0.275]  (−30%..+10% of default 0.250)');
log('    hfs: [0.028, 0.032, *0.036, 0.040, 0.044]  (−30%..+10% of default 0.040)');
log('    ad:  [0.150, 0.165, *0.165, 0.180, 0.195, 0.210]  (0%..+40% of default 0.150)');
log('    * = Phase 1 winner value, covered by combo #1');
log('');
log('  Sub-sweep B (fine-tuning ±5%/±2.5% around winner, vary-one-at-a-time):');
log('    ld:  [0.2081, 0.2138, *0.2250, 0.2363, 0.2475]');
log('    hfs: [0.0324, 0.0342, *0.0360, 0.0378, 0.0396]');
log('    lf:  [0.01026, 0.01083, *0.01140, 0.01197, 0.01254]');
log('    * = Phase 1 winner value, covered by combo #1');
log('');
log(`  Total: ${allCombos.length} combos (#0=baseline, #1=phase1-winner, #2-#13=sub-A, #14-#25=sub-B)`);
log('');
log('── Running sweep…');
log('');

const results = [];
for (let i = 0; i < allCombos.length; i++) {
  const { params, label, sweepSub, sweepKey } = allCombos[i];
  const mDO = runOnTrack(tDO, params, 10, 2000 + i * 10);
  const mSS = runOnTrack(tSS, params, 10, 6000 + i * 10);
  results.push({ i, label, params, mDO, mSS, sweepSub, sweepKey });

  if ((i + 1) % 5 === 0 || i === allCombos.length - 1) {
    writeProgress(results, i + 1, allCombos.length);
  }
}

log('');
log(`  All ${allCombos.length} combos complete.  Elapsed: ${elapsed()}`);
log('');

// ── Final scoring ─────────────────────────────────────────────────────────────
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
log('═══ PHASE 2 COMPLETE ═══');
log(`  Runtime: ${elapsed()}`);
log('');
log('  Baseline (combo #0 — current defaults):');
log(`    Dirt Oval:    hard=${pct(baseDO.hardOverlapRate,3)}  soft=${pct(baseDO.softOverlapRate,3)}  zig=${f4(baseDO.zigzagScore)}  lat=${f4(baseDO.lateralSpeedScore)}  stOvt=${f2(baseDO.stableOvertakes)}  p=${baseDO.pValue.toFixed(3)}  finT=${f2(baseDO.meanFinishTime)}s`);
log(`    Space Sprint: hard=${pct(baseSS.hardOverlapRate,3)}  soft=${pct(baseSS.softOverlapRate,3)}  zig=${f4(baseSS.zigzagScore)}  lat=${f4(baseSS.lateralSpeedScore)}  stOvt=${f2(baseSS.stableOvertakes)}  p=${baseSS.pValue.toFixed(3)}  finT=${f2(baseSS.meanFinishTime)}s`);
log(`    Combined score: ${base.score.toFixed(5)}`);
log('');
const w1 = results[1];
log('  Phase 1 winner (combo #1):');
log(`    Dirt Oval:    hard=${pct(w1.mDO.hardOverlapRate,3)}  soft=${pct(w1.mDO.softOverlapRate,3)}  zig=${f4(w1.mDO.zigzagScore)}  lat=${f4(w1.mDO.lateralSpeedScore)}  stOvt=${f2(w1.mDO.stableOvertakes)}  p=${w1.mDO.pValue.toFixed(3)}  finT=${f2(w1.mDO.meanFinishTime)}s  ${w1.passDO ? 'OK' : 'FAIL:' + failReasons(w1.mDO, baseDO)}`);
log(`    Space Sprint: hard=${pct(w1.mSS.hardOverlapRate,3)}  soft=${pct(w1.mSS.softOverlapRate,3)}  zig=${f4(w1.mSS.zigzagScore)}  lat=${f4(w1.mSS.lateralSpeedScore)}  stOvt=${f2(w1.mSS.stableOvertakes)}  p=${w1.mSS.pValue.toFixed(3)}  finT=${f2(w1.mSS.meanFinishTime)}s  ${w1.passSS ? 'OK' : 'FAIL:' + failReasons(w1.mSS, baseSS)}`);
log(`    Combined score: ${w1.score.toFixed(5)}`);
log('');
log('  Pass/fail summary (26 combos):');
log(`    Passed BOTH: ${passedBoth.length}  |  Failed one: ${failedOne.length}  |  Failed both: ${failedBoth.length}`);
log('');

// ── Full table ────────────────────────────────────────────────────────────────
const toReport = passedBoth.length > 0 ? passedBoth : [...results].sort((a, b) => a.score - b.score);
if (passedBoth.length === 0)
  log('  ⚠ No combos passed BOTH tracks. Showing all 26 by composite score:');
else
  log(`  All ${passedBoth.length} passing combos sorted by composite score:`);
log('');

const H = ['  #', 'label                   ', ' score', ' DO-hard%', ' DO-soft%', 'DO-zig ', 'DO-lat ', 'DO-stOvt', 'DO-finT ', ' SS-hard%', ' SS-soft%', 'SS-zig ', 'SS-lat ', 'SS-stOvt', 'SS-finT ', ' DO', ' SS'];
log(H.join(' | '));
log('─'.repeat(H.join(' | ').length));
for (const r of toReport) {
  const d = r.mDO, s = r.mSS;
  const row = [
    String(r.i).padStart(3),
    r.label.padEnd(24),
    r.score.toFixed(4).padStart(6),
    pct(d.hardOverlapRate).padStart(9),
    pct(d.softOverlapRate).padStart(9),
    f4(d.zigzagScore).padStart(7),
    f4(d.lateralSpeedScore).padStart(7),
    f2(d.stableOvertakes).padStart(8),
    `${f2(d.meanFinishTime)}s`.padStart(8),
    pct(s.hardOverlapRate).padStart(9),
    pct(s.softOverlapRate).padStart(9),
    f4(s.zigzagScore).padStart(7),
    f4(s.lateralSpeedScore).padStart(7),
    f2(s.stableOvertakes).padStart(8),
    `${f2(s.meanFinishTime)}s`.padStart(8),
    (r.passDO ? ' OK' : 'FAI').padStart(3),
    (r.passSS ? ' OK' : 'FAI').padStart(3),
  ];
  log(row.join(' | '));
}
log('');

// ── Top 5 with full parameter values ─────────────────────────────────────────
const top5 = toReport.slice(0, 5);
log(`  Top ${top5.length} combos — full parameter values:`);
log('');
for (let rank = 0; rank < top5.length; rank++) {
  const r = top5[rank];
  log(`  #${rank + 1}  combo ${r.i} "${r.label}"  score=${r.score.toFixed(5)}  score_DO=${r.score_mDO.toFixed(5)}  score_SS=${r.score_mSS.toFixed(5)}`);
  for (const key of PARAM_KEYS) {
    const val = r.params[key];
    const def = DEFAULTS[key];
    const win = WINNER[key];
    const pch = ((val - def) / def * 100).toFixed(1);
    const wch = Math.abs(val - win) < 1e-9 ? '  (=winner)' : `  (winner ${win.toFixed(5)})`;
    log(`    ${PARAM_SHORTS[key].padEnd(4)} = ${val.toFixed(5)}  (default ${def.toFixed(5)}, ${pch.padStart(5)}%)${wch}`);
  }
  const d = r.mDO, s = r.mSS;
  log(`    Dirt Oval:    hard=${pct(d.hardOverlapRate)}  soft=${pct(d.softOverlapRate)}  zig=${f4(d.zigzagScore)}  lat=${f4(d.lateralSpeedScore)}  stOvt=${f2(d.stableOvertakes)}  p=${d.pValue.toFixed(3)}  finT=${f2(d.meanFinishTime)}s  ${r.passDO ? 'OK' : 'FAIL:' + failReasons(d, baseDO)}`);
  log(`    Space Sprint: hard=${pct(s.hardOverlapRate)}  soft=${pct(s.softOverlapRate)}  zig=${f4(s.zigzagScore)}  lat=${f4(s.lateralSpeedScore)}  stOvt=${f2(s.stableOvertakes)}  p=${s.pValue.toFixed(3)}  finT=${f2(s.meanFinishTime)}s  ${r.passSS ? 'OK' : 'FAIL:' + failReasons(s, baseSS)}`);
  log('');
}

// ── Sub-sweep A analysis ──────────────────────────────────────────────────────
log('  Sub-sweep A analysis — extended range for boundary-hitting parameters:');
log('  (Did optimum move beyond Phase 1 ±10% boundary? Is gradient monotonic?)');
log('');

const A_ANALYSIS = [
  { key: 'lateralDamping',    short: 'ld',  winnerVal: 0.22500,
    allLevels: [0.175, 0.200, 0.225, 0.250, 0.275],
    p1BoundaryDir: 'lower', p1BoundaryNote: 'Phase 1 hit lower boundary (−10%=0.225 of default 0.250)' },
  { key: 'homeForceStrength', short: 'hfs', winnerVal: 0.03600,
    allLevels: [0.028, 0.032, 0.036, 0.040, 0.044],
    p1BoundaryDir: 'lower', p1BoundaryNote: 'Phase 1 hit lower boundary (−10%=0.036 of default 0.040)' },
  { key: 'avoidanceDistance', short: 'ad',  winnerVal: 0.16500,
    allLevels: [0.150, 0.165, 0.180, 0.195, 0.210],
    p1BoundaryDir: 'upper', p1BoundaryNote: 'Phase 1 hit upper boundary (+10%=0.165 of default 0.150)' },
];

for (const { key, short, winnerVal, allLevels, p1BoundaryNote } of A_ANALYSIS) {
  log(`  ${short} (${key}):`);
  log(`    ${p1BoundaryNote}`);
  const levelScores = [];
  for (const lvl of allLevels) {
    let r = null;
    if (Math.abs(lvl - winnerVal) < 1e-9) {
      r = results[1]; // winner combo
    } else {
      r = results.find((res) => res.sweepSub === 'A' && res.sweepKey === key && Math.abs(res.params[key] - lvl) < 1e-9);
    }
    const def = DEFAULTS[key];
    const pch = ((lvl - def) / def * 100).toFixed(0).padStart(4);
    if (r) {
      const isWin  = Math.abs(lvl - winnerVal) < 1e-9;
      const marker = isWin ? '  ← Phase1 winner' : '';
      const passTag = r.passAll ? 'OK  ' : 'FAIL';
      log(`    ${pch}%  ${lvl.toFixed(4).padStart(6)}  score=${r.score.toFixed(4)}  DO-hard=${pct(r.mDO.hardOverlapRate)}  SS-hard=${pct(r.mSS.hardOverlapRate)}  ${passTag}${marker}`);
      levelScores.push({ lvl, score: r.score, pass: r.passAll });
    } else {
      log(`    ${pch}%  ${lvl.toFixed(4).padStart(6)}  (no data)`);
    }
  }
  if (levelScores.length >= 2) {
    const passingScores = levelScores.filter((d) => d.pass);
    const allScores     = levelScores;
    const bestAll       = allScores.reduce((b, d) => d.score < b.score ? d : b);
    const bestIdx       = allScores.findIndex((d) => Math.abs(d.lvl - bestAll.lvl) < 1e-9);
    const atLower       = bestIdx === 0;
    const atUpper       = bestIdx === allScores.length - 1;
    // Check monotonicity
    let mono = true;
    const dir = allScores[1].score - allScores[0].score;
    for (let ii = 2; ii < allScores.length; ii++) {
      if ((allScores[ii].score - allScores[ii - 1].score) * dir < 0) { mono = false; break; }
    }
    log(`    → Best level: ${bestAll.lvl.toFixed(4)} (score ${bestAll.score.toFixed(4)})${bestAll.pass ? '' : ' [FAILS cutoff]'}`);
    if (atLower) {
      log(`    → Gradient still descending — optimum is BELOW tested range. Extend further down.`);
    } else if (atUpper) {
      log(`    → Gradient still ascending — optimum is ABOVE tested range. Extend further up.`);
    } else if (mono) {
      log(`    → Optimum found within range (monotonic gradient reverses at best level).`);
    } else {
      log(`    → Non-monotonic gradient — optimum found within range with local minimum.`);
    }
    if (passingScores.length > 0) {
      const bestPassing = passingScores.reduce((b, d) => d.score < b.score ? d : b);
      if (Math.abs(bestPassing.lvl - bestAll.lvl) > 1e-9) {
        log(`    → Best passing level: ${bestPassing.lvl.toFixed(4)} (score ${bestPassing.score.toFixed(4)})`);
      }
    } else {
      log(`    → No passing combos in this parameter sweep.`);
    }
  }
  log('');
}

// ── Overall recommendation ────────────────────────────────────────────────────
log('  Overall recommendation:');
log('');
if (passedBoth.length > 0) {
  const best = passedBoth[0];
  const p    = best.params;
  log(`  Best passing combo: #${best.i} "${best.label}"  score=${best.score.toFixed(5)}`);
  log(`  (Baseline score: ${base.score.toFixed(5)}, Phase1 winner score: ${w1.score.toFixed(5)})`);
  log('');
  log('  Recommended parameter values:');
  for (const key of PARAM_KEYS) {
    const val = p[key];
    const def = DEFAULTS[key];
    const win = WINNER[key];
    const pch = ((val - def) / def * 100).toFixed(1);
    const changed = Math.abs(val - def) > 1e-9;
    if (changed) {
      log(`    ${PARAM_SHORTS[key].padEnd(4)} = ${val.toFixed(5)}  (${pch}% from default ${def.toFixed(5)})`);
    } else {
      log(`    ${PARAM_SHORTS[key].padEnd(4)} = ${val.toFixed(5)}  (unchanged from default)`);
    }
  }
} else {
  log('  ⚠ No combos passed both cutoffs — consult the table above for least-bad options.');
  const fallback = [...results].sort((a, b) => a.score - b.score)[0];
  log(`  Least-bad combo: #${fallback.i} "${fallback.label}"  score=${fallback.score.toFixed(5)}`);
}
log('');
log('AWAITING USER INPUT — Phase 3 not started.');
