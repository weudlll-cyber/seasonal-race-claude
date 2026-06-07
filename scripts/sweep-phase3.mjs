/**
 * sweep-phase3.mjs
 * Phase 3: Extend lower boundary for lateralDamping + homeForceStrength,
 *           combined best (sub-sweep C) built dynamically after A+B results.
 * 13 combos × 10 races/track × 2 tracks = 260 races.
 * Outputs to sweep-phase3-results.txt with incremental progress every 3 combos.
 */

import { readFileSync, appendFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { EditorShape }            from '../client/src/modules/track-editor/EditorShape.js';
import { DEFAULT_BASE_SPEED_CONFIG } from '../client/src/modules/storage/defaults.js';
import { RACER_CONFIGS, runSingleRace, computeFinishT } from './sim-fairness.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const OUT   = join(ROOT, 'sweep-phase3-results.txt');

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

// ── Hard-coded defaults (original, pre-sweep values) ──────────────────────────
// Hard-coded to avoid reading from defaults.js which was updated to phase2 winner.
const ORIG_DEFAULTS = {
  lateralForce:                0.01200,
  lateralDamping:              0.25000,
  homeForceStrength:           0.04000,
  homeForceReductionOnOverlap: 0.30000,
  avoidanceDistance:           0.15000,
  speedBrakeFactor:            0.95000,
  speedBrakeTThreshold:        0.01500,
  speedBrakeYThreshold:        0.20000,
};

// Phase 2 winner — base for all VOOT combos.
// NOTE: avoidanceDistance locked to 0.180 (confirmed optimum from phase 2).
const PH2_WINNER = {
  lateralForce:                0.01140,
  lateralDamping:              0.17500,
  homeForceStrength:           0.03600,
  homeForceReductionOnOverlap: 0.30000,
  avoidanceDistance:           0.18000,
  speedBrakeFactor:            0.94500,
  speedBrakeTThreshold:        0.01350,
  speedBrakeYThreshold:        0.18000,
};

const PH2_LD  = PH2_WINNER.lateralDamping;    // 0.175
const PH2_HFS = PH2_WINNER.homeForceStrength; // 0.036

const PARAM_KEYS = [
  'lateralForce', 'lateralDamping', 'homeForceStrength',
  'homeForceReductionOnOverlap', 'avoidanceDistance',
  'speedBrakeFactor', 'speedBrakeTThreshold', 'speedBrakeYThreshold',
];
const SHORT = {
  lateralForce: 'lf', lateralDamping: 'ld', homeForceStrength: 'hfs',
  homeForceReductionOnOverlap: 'hfr', avoidanceDistance: 'ad',
  speedBrakeFactor: 'sbf', speedBrakeTThreshold: 'sbt', speedBrakeYThreshold: 'sby',
};

// ── Sub-sweep levels ──────────────────────────────────────────────────────────
// A — lateralDamping extended lower; 0.175 covered by combo #1
const A_LD_LEVELS  = [0.100, 0.125, 0.150, 0.200];
// B — homeForceStrength extended lower; 0.036 covered by combo #1
// 0.028 (phase 2 A-hfs best) shown as reference in analysis but NOT re-run.
const B_HFS_LEVELS = [0.010, 0.016, 0.020, 0.024];

// ── Build initial combo list (0–9) ────────────────────────────────────────────
const allCombos = [];

// #0: baseline (original defaults)
allCombos.push({ params: { ...ORIG_DEFAULTS }, label: 'baseline', sub: null, key: null });

// #1: phase 2 winner (VOOT base)
allCombos.push({ params: { ...PH2_WINNER }, label: 'phase2-winner', sub: null, key: null });

// #2–#5: sub-sweep A — vary lateralDamping
for (const lvl of A_LD_LEVELS) {
  allCombos.push({
    params: { ...PH2_WINNER, lateralDamping: lvl },
    label:  `A-ld=${lvl}`,
    sub:    'A',
    key:    'lateralDamping',
  });
}

// #6–#9: sub-sweep B — vary homeForceStrength
for (const lvl of B_HFS_LEVELS) {
  allCombos.push({
    params: { ...PH2_WINNER, homeForceStrength: lvl },
    label:  `B-hfs=${lvl}`,
    sub:    'B',
    key:    'homeForceStrength',
  });
}

// C combos (#10–#12) are built dynamically after A+B results — see below.

// ── Helpers ───────────────────────────────────────────────────────────────────
const BASE_SPEED_MEAN = (DEFAULT_BASE_SPEED_CONFIG.min + DEFAULT_BASE_SPEED_CONFIG.max) / 2;

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

function recomputeScores(rows) {
  computeTrackScores(rows, 'mDO');
  computeTrackScores(rows, 'mSS');
  for (const r of rows) r.score = (r.score_mDO + r.score_mSS) / 2;
}

function writeProgress(results, completed, total) {
  if (results.length < 2) return;
  const tmp = results.map((r) => ({ ...r }));
  recomputeScores(tmp);
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
    `  rank | combo | label                   | score  | DO-hard  | SS-hard`,
    `  ────────────────────────────────────────────────────────────────────`,
  ];
  for (let ri = 0; ri < top5.length; ri++) {
    const r = top5[ri];
    lines.push(
      `  ${String(ri + 1).padStart(4)} | ${String(r.i).padStart(5)} | ${r.label.padEnd(23)} | ${r.score.toFixed(4)} | ${pct(r.mDO.hardOverlapRate).padStart(8)} | ${pct(r.mSS.hardOverlapRate).padStart(8)}`
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
log(' SWEEP Phase 3 — Extend lower boundary: lateralDamping + homeForceStrength');
log(`  Started: ${new Date().toISOString()}`);
log('  13 combos × 10 races/track × 2 tracks = 260 races');
log('  Estimated runtime: ~4 min');
log('══════════════════════════════════════════════════════════════════════');
log('');

const tDO = loadTrack('dirt-oval',    'horse',  40, 60);
const tSS = loadTrack('space-sprint', 'rocket', 60, 60);

log(`  Dirt Oval    (horse  40): isOpen=${tDO.isOpen}  pathLen=${Math.round(tDO.pathLengthPx)}px  width=${Math.round(tDO.geometricTrackWidth)}px  finishT=${tDO.finishT.toFixed(5)}`);
log(`  Space Sprint (rocket 60): isOpen=${tSS.isOpen}  pathLen=${Math.round(tSS.pathLengthPx)}px  width=${Math.round(tSS.geometricTrackWidth)}px  finishT=${tSS.finishT.toFixed(5)}`);
log('');
log('  Phase 2 winner (VOOT base — avoidanceDistance locked to 0.180):');
for (const key of PARAM_KEYS) {
  const def = ORIG_DEFAULTS[key];
  const win = PH2_WINNER[key];
  const pch = ((win - def) / def * 100).toFixed(1);
  log(`    ${SHORT[key].padEnd(4)} = ${win.toFixed(5)}  (default ${def.toFixed(5)}, ${pch.padStart(5)}%)`);
}
log('');
log('  Sub-sweep A (lateralDamping extended lower, VOOT from phase2-winner):');
log(`    ld:  [0.100, 0.125, 0.150, *0.175, 0.200]  (* = phase2 winner, covered by combo #1)`);
log('  Sub-sweep B (homeForceStrength extended lower, VOOT from phase2-winner):');
log(`    hfs: [0.010, 0.016, 0.020, 0.024, ref:0.028*]  (* = phase2 A-hfs best, shown as reference)`);
log('  Sub-sweep C (combined best ld + best hfs, built after A+B results):');
log(`    3 combos: (best_ld + best_hfs), (best_ld + ph2_hfs=0.036), (ph2_ld=0.175 + best_hfs)`);
log('');
log(`  Total: 13 combos (#0=baseline, #1=phase2-winner, #2-#5=sub-A, #6-#9=sub-B, #10-#12=sub-C)`);
log('');
log('── Running sweep…');
log('');

const results = [];
const TOTAL   = 13;

// ── Phase A+B (combos #0–#9) ──────────────────────────────────────────────────
for (let i = 0; i < allCombos.length; i++) {
  const { params, label, sub, key } = allCombos[i];
  const mDO = runOnTrack(tDO, params, 10, 3000 + i * 10);
  const mSS = runOnTrack(tSS, params, 10, 7000 + i * 10);
  results.push({ i, label, params, mDO, mSS, sub, key });

  if ((i + 1) % 3 === 0 || i === allCombos.length - 1) {
    writeProgress(results, i + 1, TOTAL);
  }
}

// ── Determine best_ld and best_hfs from A+B results ───────────────────────────
// A candidates: combo #1 (ld=0.175) + combos #2–#5 (A-ld sweep)
recomputeScores(results);

const aCandidates = [results[1], ...results.slice(2, 6)];
const bestA       = aCandidates.reduce((b, r) => r.score < b.score ? r : b);
const bestLd      = bestA.params.lateralDamping;

// B candidates: combos #6–#9 (B-hfs sweep); combo #1 has ld=0.175 mixed in so not used here
const bCandidates = results.slice(6, 10);
const bestB       = bCandidates.reduce((b, r) => r.score < b.score ? r : b);
const bestHfs     = bestB.params.homeForceStrength;

log(`  Sub-sweep C: best_ld=${bestLd.toFixed(5)} (combo #${bestA.i} "${bestA.label}")`);
log(`               best_hfs=${bestHfs.toFixed(5)} (combo #${bestB.i} "${bestB.label}")`);
log('');

// ── Sub-sweep C (combos #10–#12) ──────────────────────────────────────────────
const C_COMBOS = [
  { params: { ...PH2_WINNER, lateralDamping: bestLd, homeForceStrength: bestHfs },
    label: `C-ld${bestLd.toFixed(3)}-hfs${bestHfs.toFixed(3)}`, sub: 'C', key: null },
  { params: { ...PH2_WINNER, lateralDamping: bestLd, homeForceStrength: PH2_HFS },
    label: `C-ld${bestLd.toFixed(3)}-hfs${PH2_HFS.toFixed(3)}`, sub: 'C', key: null },
  { params: { ...PH2_WINNER, lateralDamping: PH2_LD, homeForceStrength: bestHfs },
    label: `C-ld${PH2_LD.toFixed(3)}-hfs${bestHfs.toFixed(3)}`, sub: 'C', key: null },
];

for (let ci = 0; ci < C_COMBOS.length; ci++) {
  const i = 10 + ci;
  const { params, label, sub, key } = C_COMBOS[ci];
  const mDO = runOnTrack(tDO, params, 10, 3000 + i * 10);
  const mSS = runOnTrack(tSS, params, 10, 7000 + i * 10);
  results.push({ i, label, params, mDO, mSS, sub, key });

  if ((i + 1) % 3 === 0 || ci === C_COMBOS.length - 1) {
    writeProgress(results, i + 1, TOTAL);
  }
}

log('');
log(`  All 13 combos complete.  Elapsed: ${elapsed()}`);
log('');

// ── Final scoring ──────────────────────────────────────────────────────────────
recomputeScores(results);

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
log('═══ PHASE 3 COMPLETE ═══');
log(`  Runtime: ${elapsed()}`);
log('');
log('  Baseline (combo #0 — original defaults):');
log(`    Dirt Oval:    hard=${pct(baseDO.hardOverlapRate,3)}  soft=${pct(baseDO.softOverlapRate,3)}  zig=${f4(baseDO.zigzagScore)}  lat=${f4(baseDO.lateralSpeedScore)}  stOvt=${f2(baseDO.stableOvertakes)}  p=${baseDO.pValue.toFixed(3)}  finT=${f2(baseDO.meanFinishTime)}s`);
log(`    Space Sprint: hard=${pct(baseSS.hardOverlapRate,3)}  soft=${pct(baseSS.softOverlapRate,3)}  zig=${f4(baseSS.zigzagScore)}  lat=${f4(baseSS.lateralSpeedScore)}  stOvt=${f2(baseSS.stableOvertakes)}  p=${baseSS.pValue.toFixed(3)}  finT=${f2(baseSS.meanFinishTime)}s`);
log(`    Combined score: ${base.score.toFixed(5)}`);
log('');
const w1 = results[1];
log('  Phase 2 winner (combo #1):');
log(`    Dirt Oval:    hard=${pct(w1.mDO.hardOverlapRate,3)}  soft=${pct(w1.mDO.softOverlapRate,3)}  zig=${f4(w1.mDO.zigzagScore)}  lat=${f4(w1.mDO.lateralSpeedScore)}  stOvt=${f2(w1.mDO.stableOvertakes)}  p=${w1.mDO.pValue.toFixed(3)}  finT=${f2(w1.mDO.meanFinishTime)}s  ${w1.passDO ? 'OK' : 'FAIL:' + failReasons(w1.mDO, baseDO)}`);
log(`    Space Sprint: hard=${pct(w1.mSS.hardOverlapRate,3)}  soft=${pct(w1.mSS.softOverlapRate,3)}  zig=${f4(w1.mSS.zigzagScore)}  lat=${f4(w1.mSS.lateralSpeedScore)}  stOvt=${f2(w1.mSS.stableOvertakes)}  p=${w1.mSS.pValue.toFixed(3)}  finT=${f2(w1.mSS.meanFinishTime)}s  ${w1.passSS ? 'OK' : 'FAIL:' + failReasons(w1.mSS, baseSS)}`);
log(`    Combined score: ${w1.score.toFixed(5)}`);
log('');
log(`  Pass/fail summary (13 combos):`);
log(`    Passed BOTH: ${passedBoth.length}  |  Failed one: ${failedOne.length}  |  Failed both: ${failedBoth.length}`);
log('');

// ── Full table ─────────────────────────────────────────────────────────────────
const toReport = passedBoth.length > 0 ? passedBoth : [...results].sort((a, b) => a.score - b.score);
if (passedBoth.length === 0)
  log('  WARNING: No combos passed BOTH tracks. Showing all 13 by composite score:');
else
  log(`  All ${passedBoth.length} passing combos sorted by composite score:`);
log('');

const H = ['  #', 'label                     ', ' score', ' DO-hard%', ' DO-soft%', 'DO-zig ', 'DO-lat ', 'DO-stOvt', 'DO-finT ', ' SS-hard%', ' SS-soft%', 'SS-zig ', 'SS-lat ', 'SS-stOvt', 'SS-finT ', ' DO', ' SS'];
log(H.join(' | '));
log('─'.repeat(H.join(' | ').length));
for (const r of toReport) {
  const d = r.mDO, s = r.mSS;
  const row = [
    String(r.i).padStart(3),
    r.label.padEnd(26),
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

// ── Top 3 with full parameter values ──────────────────────────────────────────
const top3 = toReport.slice(0, 3);
log(`  Top ${top3.length} combos — full parameter values:`);
log('');
for (let rank = 0; rank < top3.length; rank++) {
  const r = top3[rank];
  log(`  #${rank + 1}  combo ${r.i} "${r.label}"  score=${r.score.toFixed(5)}  score_DO=${r.score_mDO.toFixed(5)}  score_SS=${r.score_mSS.toFixed(5)}`);
  for (const key of PARAM_KEYS) {
    const val = r.params[key];
    const def = ORIG_DEFAULTS[key];
    const win = PH2_WINNER[key];
    const pch = ((val - def) / def * 100).toFixed(1);
    const wch = Math.abs(val - win) < 1e-9 ? '  (=ph2-winner)' : `  (ph2-winner ${win.toFixed(5)})`;
    log(`    ${SHORT[key].padEnd(4)} = ${val.toFixed(5)}  (default ${def.toFixed(5)}, ${pch.padStart(5)}%)${wch}`);
  }
  const d = r.mDO, s = r.mSS;
  log(`    Dirt Oval:    hard=${pct(d.hardOverlapRate)}  soft=${pct(d.softOverlapRate)}  zig=${f4(d.zigzagScore)}  lat=${f4(d.lateralSpeedScore)}  stOvt=${f2(d.stableOvertakes)}  p=${d.pValue.toFixed(3)}  finT=${f2(d.meanFinishTime)}s  ${r.passDO ? 'OK' : 'FAIL:' + failReasons(d, baseDO)}`);
  log(`    Space Sprint: hard=${pct(s.hardOverlapRate)}  soft=${pct(s.softOverlapRate)}  zig=${f4(s.zigzagScore)}  lat=${f4(s.lateralSpeedScore)}  stOvt=${f2(s.stableOvertakes)}  p=${s.pValue.toFixed(3)}  finT=${f2(s.meanFinishTime)}s  ${r.passSS ? 'OK' : 'FAIL:' + failReasons(s, baseSS)}`);
  log('');
}

// ── Sub-sweep gradient analysis ───────────────────────────────────────────────
log('  Gradient analysis — did optimum flatten or reverse?');
log('  (All scores normalized within this sweep; lower = better)');
log('');

// A — lateralDamping
{
  log('  ld (lateralDamping):');
  log('    Phase 2 best was 0.175, still descending — extended lower:');
  const aLdLevels = [0.100, 0.125, 0.150, 0.175, 0.200];
  const aLdScores = [];
  for (const lvl of aLdLevels) {
    const r = results.find((res) => Math.abs(res.params.lateralDamping - lvl) < 1e-9 &&
      Math.abs(res.params.homeForceStrength - PH2_HFS) < 1e-9); // A sweep holds hfs at ph2 value
    const def = ORIG_DEFAULTS.lateralDamping;
    const pch = ((lvl - def) / def * 100).toFixed(0).padStart(4);
    if (r) {
      const marker = Math.abs(lvl - PH2_LD) < 1e-9 ? '  ← ph2 winner' : '';
      const passTag = r.passAll ? 'OK  ' : 'FAIL';
      log(`    ${pch}%  ${lvl.toFixed(4).padStart(6)}  score=${r.score.toFixed(4)}  DO-hard=${pct(r.mDO.hardOverlapRate)}  SS-hard=${pct(r.mSS.hardOverlapRate)}  ${passTag}${marker}`);
      aLdScores.push({ lvl, score: r.score, pass: r.passAll });
    } else {
      log(`    ${pch}%  ${lvl.toFixed(4).padStart(6)}  (not run)`);
    }
  }
  if (aLdScores.length >= 2) {
    const bestIdx = aLdScores.reduce((bi, d, i) => d.score < aLdScores[bi].score ? i : bi, 0);
    const best    = aLdScores[bestIdx];
    const atLower = bestIdx === 0;
    const atUpper = bestIdx === aLdScores.length - 1;
    let mono = true;
    const dir = aLdScores[1].score - aLdScores[0].score;
    for (let ii = 2; ii < aLdScores.length; ii++) {
      if ((aLdScores[ii].score - aLdScores[ii - 1].score) * dir < 0) { mono = false; break; }
    }
    log(`    → Best level: ${best.lvl.toFixed(4)} (score ${best.score.toFixed(4)})${best.pass ? '' : ' [FAILS cutoff]'}`);
    if (atLower) {
      log(`    → Gradient STILL descending — optimum is BELOW tested range. Further extension needed.`);
    } else if (atUpper) {
      log(`    → Gradient ascending — optimum is ABOVE tested range.`);
    } else if (mono) {
      log(`    → Optimum FOUND within range (monotonic gradient reversed at best level).`);
    } else {
      log(`    → Non-monotonic — optimum FOUND within range (local minimum).`);
    }
  }
  log('');
}

// B — homeForceStrength
{
  log('  hfs (homeForceStrength):');
  log('    Phase 2 best was 0.028, still descending — extended lower:');
  // Show 0.028 as reference from phase 2 (not re-run here — mark as ref)
  const bHfsLevels = [0.010, 0.016, 0.020, 0.024, 0.028, 0.036];
  const bHfsScores = [];
  for (const lvl of bHfsLevels) {
    const def = ORIG_DEFAULTS.homeForceStrength;
    const pch = ((lvl - def) / def * 100).toFixed(0).padStart(4);
    if (Math.abs(lvl - 0.028) < 1e-9) {
      log(`    ${pch}%  ${lvl.toFixed(4).padStart(6)}  (phase 2 A-hfs reference — not re-run in phase 3)`);
      continue;
    }
    const r = results.find((res) => Math.abs(res.params.homeForceStrength - lvl) < 1e-9 &&
      Math.abs(res.params.lateralDamping - PH2_LD) < 1e-9); // B sweep holds ld at ph2 value
    if (r) {
      const marker = Math.abs(lvl - PH2_HFS) < 1e-9 ? '  ← ph2 winner' : '';
      const passTag = r.passAll ? 'OK  ' : 'FAIL';
      log(`    ${pch}%  ${lvl.toFixed(4).padStart(6)}  score=${r.score.toFixed(4)}  DO-hard=${pct(r.mDO.hardOverlapRate)}  SS-hard=${pct(r.mSS.hardOverlapRate)}  ${passTag}${marker}`);
      bHfsScores.push({ lvl, score: r.score, pass: r.passAll });
    } else {
      log(`    ${pch}%  ${lvl.toFixed(4).padStart(6)}  (not run)`);
    }
  }
  if (bHfsScores.length >= 2) {
    const bestIdx = bHfsScores.reduce((bi, d, i) => d.score < bHfsScores[bi].score ? i : bi, 0);
    const best    = bHfsScores[bestIdx];
    const atLower = bestIdx === 0;
    const atUpper = bestIdx === bHfsScores.length - 1;
    let mono = true;
    const dir = bHfsScores[1].score - bHfsScores[0].score;
    for (let ii = 2; ii < bHfsScores.length; ii++) {
      if ((bHfsScores[ii].score - bHfsScores[ii - 1].score) * dir < 0) { mono = false; break; }
    }
    log(`    → Best level: ${best.lvl.toFixed(4)} (score ${best.score.toFixed(4)})${best.pass ? '' : ' [FAILS cutoff]'}`);
    if (atLower) {
      log(`    → Gradient STILL descending — optimum is BELOW tested range. Further extension needed.`);
    } else if (atUpper) {
      log(`    → Gradient ascending — optimum is ABOVE tested range.`);
    } else if (mono) {
      log(`    → Optimum FOUND within range (monotonic gradient reversed at best level).`);
    } else {
      log(`    → Non-monotonic — optimum FOUND within range (local minimum).`);
    }
  }
  log('');
}

// ── Final recommendation ──────────────────────────────────────────────────────
log('  FINAL RECOMMENDATION — which 8 values to use as new defaults:');
log('');

const overallBest = passedBoth.length > 0
  ? passedBoth[0]
  : [...results].sort((a, b) => a.score - b.score)[0];

if (passedBoth.length === 0) {
  log('  WARNING: No combo passed all hard cutoffs on both tracks.');
  log(`  Least-bad combo: #${overallBest.i} "${overallBest.label}"  score=${overallBest.score.toFixed(5)}`);
  log('  Review failure reasons before applying any values.');
} else {
  log(`  Best passing combo: #${overallBest.i} "${overallBest.label}"  score=${overallBest.score.toFixed(5)}`);
  log(`  Improvement over baseline: ${((1 - overallBest.score / base.score) * 100).toFixed(1)}%`);
  log(`  Improvement over phase2-winner: ${((1 - overallBest.score / w1.score) * 100).toFixed(1)}%`);
  log('');
  log('  Recommended values:');
  for (const key of PARAM_KEYS) {
    const val = overallBest.params[key];
    const def = ORIG_DEFAULTS[key];
    const pch = ((val - def) / def * 100).toFixed(1);
    log(`    ${SHORT[key].padEnd(4)} = ${val.toFixed(5)}  (${pch}% from original default ${def.toFixed(5)})`);
  }
  log('');
  // Gameplay concern note for very low ld / hfs
  const finalLd  = overallBest.params.lateralDamping;
  const finalHfs = overallBest.params.homeForceStrength;
  if (finalLd < 0.15 || finalHfs < 0.02) {
    log('  GAMEPLAY CONCERN:');
    if (finalLd < 0.15)
      log(`    lateralDamping=${finalLd.toFixed(5)} is very low (>${Math.round((1 - finalLd / 0.25) * 100)}% below original).`);
    if (finalHfs < 0.02)
      log(`    homeForceStrength=${finalHfs.toFixed(5)} is very low (>${Math.round((1 - finalHfs / 0.04) * 100)}% below original).`);
    log('    Very low damping → racers may feel "floaty" or take very long to settle laterally.');
    log('    Very low home force → racers may drift far from centerline without recovering.');
    log('    Recommend browser-testing on at least 3 tracks before committing.');
  } else {
    log('  No major gameplay concerns at these values — within reasonable range.');
    log('  Recommend browser-testing on at least 2 tracks as routine validation.');
  }
}
log('');
log('AWAITING USER INPUT — no further phases started.');
