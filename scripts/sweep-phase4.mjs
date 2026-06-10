// ============================================================
// File:        sweep-phase4.mjs
// Path:        scripts/sweep-phase4.mjs
// Project:     RaceArena
// Created:     2026-06-04
// Description: Fine-tunes 7 params ±2.5/5% around Phase 2 winner
//              (homeForceStrength fixed at 0.030) — 30 combos × 600 races.
// ============================================================

/**
 * sweep-phase4.mjs
 * Phase 4: homeForceStrength fixed at 0.030, fine-tune all other 7 params
 *           ±2.5% and ±5% around Phase 2 winner values. VOOT design.
 * 30 combos × 10 races/track × 2 tracks = 600 races.
 * Outputs to sweep-phase4-results.txt with incremental progress every 5 combos.
 */

import { readFileSync, appendFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { EditorShape }               from '../client/src/modules/track-editor/EditorShape.js';
import { DEFAULT_BASE_SPEED_CONFIG } from '../client/src/modules/storage/defaults.js';
import { RACER_CONFIGS, runSingleRace, computeFinishT } from './sim-fairness.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const OUT   = join(ROOT, 'sweep-phase4-results.txt');

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

// ── Hard-coded originals (pre-sweep defaults) ─────────────────────────────────
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

// Fixed hfs value for this entire sweep
const FIXED_HFS = 0.03000;

// Phase 2 winner values (center points for variation; hfs replaced by FIXED_HFS)
const BASE = {
  lateralForce:                0.01140,
  lateralDamping:              0.17500,
  homeForceStrength:           FIXED_HFS,
  homeForceReductionOnOverlap: 0.30000,
  avoidanceDistance:           0.18000,
  speedBrakeFactor:            0.94500,
  speedBrakeTThreshold:        0.01350,
  speedBrakeYThreshold:        0.18000,
};

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

// ── Sweep definitions — 7 params × 4 non-base levels ─────────────────────────
// Base level excluded from each (covered by combo #1).
const SWEEPS = [
  { key: 'lateralForce',                short: 'lf',  levels: [0.010830, 0.011115, 0.011685, 0.011970] },
  { key: 'lateralDamping',              short: 'ld',  levels: [0.166250, 0.170625, 0.179375, 0.183750] },
  { key: 'homeForceReductionOnOverlap', short: 'hfr', levels: [0.285000, 0.292500, 0.307500, 0.315000] },
  { key: 'avoidanceDistance',           short: 'ad',  levels: [0.171000, 0.175500, 0.184500, 0.189000] },
  { key: 'speedBrakeFactor',            short: 'sbf', levels: [0.947750, 0.946375, 0.943625, 0.942250] },
  { key: 'speedBrakeTThreshold',        short: 'sbt', levels: [0.012825, 0.013163, 0.013838, 0.014175] },
  { key: 'speedBrakeYThreshold',        short: 'sby', levels: [0.171000, 0.175500, 0.184500, 0.189000] },
];

// ── Build combo list ──────────────────────────────────────────────────────────
const allCombos = [];

// #0: baseline (original defaults)
allCombos.push({ params: { ...ORIG_DEFAULTS }, label: 'baseline', sweepKey: null });

// #1: Phase 2 winner with hfs fixed at 0.030
allCombos.push({ params: { ...BASE }, label: 'ph2w-hfs0.030', sweepKey: null });

// #2–#29: VOOT — 7 params × 4 non-base levels
for (const { key, short, levels } of SWEEPS) {
  for (const lvl of levels) {
    allCombos.push({
      params:   { ...BASE, [key]: lvl },
      label:    `${short}=${lvl.toFixed(6)}`,
      sweepKey: key,
    });
  }
}

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
  const topN = tmp.slice(0, Math.min(5, tmp.length));

  const lines = [
    ``,
    `--- Progress update after combo ${completed}/${total} ---`,
    `Elapsed: ${elapsed()}`,
    `Best so far: combo #${best.i} (${best.label}) score ${best.score.toFixed(4)}`,
    `  params: lf=${p.lateralForce.toFixed(6)} ld=${p.lateralDamping.toFixed(6)} hfs=${p.homeForceStrength.toFixed(6)} hfr=${p.homeForceReductionOnOverlap.toFixed(6)} ad=${p.avoidanceDistance.toFixed(6)} sbf=${p.speedBrakeFactor.toFixed(6)} sbt=${p.speedBrakeTThreshold.toFixed(6)} sby=${p.speedBrakeYThreshold.toFixed(6)}`,
    `Top ${topN.length} so far:`,
    `  rank | combo | label                        | score  | DO-hard  | SS-hard`,
    `  ────────────────────────────────────────────────────────────────────────`,
  ];
  for (let ri = 0; ri < topN.length; ri++) {
    const r = topN[ri];
    lines.push(
      `  ${String(ri + 1).padStart(4)} | ${String(r.i).padStart(5)} | ${r.label.padEnd(28)} | ${r.score.toFixed(4)} | ${pct(r.mDO.hardOverlapRate).padStart(8)} | ${pct(r.mSS.hardOverlapRate).padStart(8)}`
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
log(' SWEEP Phase 4 — hfs=0.030 fixed, fine-tune 7 params ±2.5% and ±5%');
log(`  Started: ${new Date().toISOString()}`);
log(`  30 combos × 10 races/track × 2 tracks = 600 races`);
log('  Estimated runtime: ~9 min');
log('══════════════════════════════════════════════════════════════════════');
log('');

const tDO = loadTrack('dirt-oval',    'horse',  40, 60);
const tSS = loadTrack('space-sprint', 'rocket', 60, 60);

log(`  Dirt Oval    (horse  40): isOpen=${tDO.isOpen}  pathLen=${Math.round(tDO.pathLengthPx)}px  width=${Math.round(tDO.geometricTrackWidth)}px  finishT=${tDO.finishT.toFixed(5)}`);
log(`  Space Sprint (rocket 60): isOpen=${tSS.isOpen}  pathLen=${Math.round(tSS.pathLengthPx)}px  width=${Math.round(tSS.geometricTrackWidth)}px  finishT=${tSS.finishT.toFixed(5)}`);
log('');
log(`  Fixed: homeForceStrength = ${FIXED_HFS.toFixed(5)}`);
log('  Base values (Phase 2 winner, center for ±2.5%/±5% variation):');
for (const key of PARAM_KEYS) {
  if (key === 'homeForceStrength') continue;
  const base = BASE[key];
  const def  = ORIG_DEFAULTS[key];
  const pch  = ((base - def) / def * 100).toFixed(1);
  log(`    ${SHORT[key].padEnd(4)} = ${base.toFixed(6)}  (default ${def.toFixed(5)}, ${pch.padStart(5)}%)`);
}
log('');
log('  VOOT sweep levels (base level covered by combo #1):');
for (const { key, short, levels } of SWEEPS) {
  const base = BASE[key];
  const allLevels = [...levels, base].sort((a, b) => a - b);
  log(`    ${short.padEnd(4)}: [${allLevels.map((v) => v.toFixed(6)).join(', ')}]  (* = base)`);
}
log('');
log(`  Total: ${allCombos.length} combos (#0=baseline, #1=ph2w-hfs0.030, #2-#29=VOOT)`);
log('');
log('── Running sweep…');
log('');

const results = [];
const TOTAL   = allCombos.length;

for (let i = 0; i < TOTAL; i++) {
  const { params, label, sweepKey } = allCombos[i];
  const mDO = runOnTrack(tDO, params, 10, 4000 + i * 10);
  const mSS = runOnTrack(tSS, params, 10, 8000 + i * 10);
  results.push({ i, label, params, mDO, mSS, sweepKey });

  if ((i + 1) % 5 === 0 || i === TOTAL - 1) {
    writeProgress(results, i + 1, TOTAL);
  }
}

log('');
log(`  All ${TOTAL} combos complete.  Elapsed: ${elapsed()}`);
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
log('═══ PHASE 4 COMPLETE ═══');
log(`  Runtime: ${elapsed()}`);
log('');
log('  Baseline (combo #0 — original defaults):');
log(`    Dirt Oval:    hard=${pct(baseDO.hardOverlapRate,3)}  soft=${pct(baseDO.softOverlapRate,3)}  zig=${f4(baseDO.zigzagScore)}  lat=${f4(baseDO.lateralSpeedScore)}  stOvt=${f2(baseDO.stableOvertakes)}  p=${baseDO.pValue.toFixed(3)}  finT=${f2(baseDO.meanFinishTime)}s`);
log(`    Space Sprint: hard=${pct(baseSS.hardOverlapRate,3)}  soft=${pct(baseSS.softOverlapRate,3)}  zig=${f4(baseSS.zigzagScore)}  lat=${f4(baseSS.lateralSpeedScore)}  stOvt=${f2(baseSS.stableOvertakes)}  p=${baseSS.pValue.toFixed(3)}  finT=${f2(baseSS.meanFinishTime)}s`);
log(`    Combined score: ${base.score.toFixed(5)}`);
log('');
const w1 = results[1];
log('  Phase 2 winner with hfs=0.030 (combo #1):');
log(`    Dirt Oval:    hard=${pct(w1.mDO.hardOverlapRate,3)}  soft=${pct(w1.mDO.softOverlapRate,3)}  zig=${f4(w1.mDO.zigzagScore)}  lat=${f4(w1.mDO.lateralSpeedScore)}  stOvt=${f2(w1.mDO.stableOvertakes)}  p=${w1.mDO.pValue.toFixed(3)}  finT=${f2(w1.mDO.meanFinishTime)}s  ${w1.passDO ? 'OK' : 'FAIL:' + failReasons(w1.mDO, baseDO)}`);
log(`    Space Sprint: hard=${pct(w1.mSS.hardOverlapRate,3)}  soft=${pct(w1.mSS.softOverlapRate,3)}  zig=${f4(w1.mSS.zigzagScore)}  lat=${f4(w1.mSS.lateralSpeedScore)}  stOvt=${f2(w1.mSS.stableOvertakes)}  p=${w1.mSS.pValue.toFixed(3)}  finT=${f2(w1.mSS.meanFinishTime)}s  ${w1.passSS ? 'OK' : 'FAIL:' + failReasons(w1.mSS, baseSS)}`);
log(`    Combined score: ${w1.score.toFixed(5)}`);
log('');
log(`  Pass/fail summary (${TOTAL} combos):`);
log(`    Passed BOTH: ${passedBoth.length}  |  Failed one: ${failedOne.length}  |  Failed both: ${failedBoth.length}`);
log('');

// ── Full table ─────────────────────────────────────────────────────────────────
const toReport = passedBoth.length > 0 ? passedBoth : [...results].sort((a, b) => a.score - b.score);
if (passedBoth.length === 0)
  log(`  WARNING: No combos passed BOTH tracks. Showing all ${TOTAL} by composite score:`);
else
  log(`  All ${passedBoth.length} passing combos sorted by composite score:`);
log('');

const H = ['  #', 'label                        ', ' score', ' DO-hard%', ' DO-soft%', 'DO-zig ', 'DO-lat ', 'DO-stOvt', 'DO-finT ', ' SS-hard%', ' SS-soft%', 'SS-zig ', 'SS-lat ', 'SS-stOvt', 'SS-finT ', ' DO', ' SS'];
log(H.join(' | '));
log('─'.repeat(H.join(' | ').length));
for (const r of toReport) {
  const d = r.mDO, s = r.mSS;
  const row = [
    String(r.i).padStart(3),
    r.label.padEnd(29),
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

// ── Top 5 with full parameter values ──────────────────────────────────────────
const top5 = toReport.slice(0, 5);
log(`  Top ${top5.length} combos — full parameter values:`);
log('');
for (let rank = 0; rank < top5.length; rank++) {
  const r = top5[rank];
  log(`  #${rank + 1}  combo ${r.i} "${r.label}"  score=${r.score.toFixed(5)}  score_DO=${r.score_mDO.toFixed(5)}  score_SS=${r.score_mSS.toFixed(5)}`);
  for (const key of PARAM_KEYS) {
    const val  = r.params[key];
    const def  = ORIG_DEFAULTS[key];
    const base = BASE[key];
    const pch  = ((val - def) / def * 100).toFixed(1);
    const bch  = Math.abs(val - base) < 1e-9 ? '  (=base)' : `  (base ${base.toFixed(6)})`;
    const fixed = key === 'homeForceStrength' ? '  [FIXED]' : '';
    log(`    ${SHORT[key].padEnd(4)} = ${val.toFixed(6)}  (default ${def.toFixed(5)}, ${pch.padStart(5)}%)${bch}${fixed}`);
  }
  const d = r.mDO, s = r.mSS;
  log(`    Dirt Oval:    hard=${pct(d.hardOverlapRate)}  soft=${pct(d.softOverlapRate)}  zig=${f4(d.zigzagScore)}  lat=${f4(d.lateralSpeedScore)}  stOvt=${f2(d.stableOvertakes)}  p=${d.pValue.toFixed(3)}  finT=${f2(d.meanFinishTime)}s  ${r.passDO ? 'OK' : 'FAIL:' + failReasons(d, baseDO)}`);
  log(`    Space Sprint: hard=${pct(s.hardOverlapRate)}  soft=${pct(s.softOverlapRate)}  zig=${f4(s.zigzagScore)}  lat=${f4(s.lateralSpeedScore)}  stOvt=${f2(s.stableOvertakes)}  p=${s.pValue.toFixed(3)}  finT=${f2(s.meanFinishTime)}s  ${r.passSS ? 'OK' : 'FAIL:' + failReasons(s, baseSS)}`);
  log('');
}

// ── Per-parameter analysis ────────────────────────────────────────────────────
log('  Per-parameter analysis (VOOT — did any level beat base value?):');
log(`  Base combo is #1 "ph2w-hfs0.030"  score=${w1.score.toFixed(5)}`);
log('');

for (const { key, short, levels } of SWEEPS) {
  const baseVal  = BASE[key];
  const baseScore = w1.score;
  // All 5 levels including base, sorted ascending
  const allLevels = [...levels, baseVal].sort((a, b) => a - b);
  const levelData = [];

  for (const lvl of allLevels) {
    let r;
    if (Math.abs(lvl - baseVal) < 1e-9) {
      r = results[1]; // combo #1 is the base
    } else {
      r = results.find((res) =>
        res.sweepKey === key && Math.abs(res.params[key] - lvl) < 1e-9
      );
    }
    if (r) levelData.push({ lvl, score: r.score, pass: r.passAll, r });
  }

  const bestInSweep = levelData.reduce((b, d) => d.score < b.score ? d : b);
  const beatBase    = bestInSweep.score < baseScore - 1e-6;

  log(`  ${short} (${key}):`);
  for (const { lvl, score, pass, r } of levelData) {
    const isBase = Math.abs(lvl - baseVal) < 1e-9;
    const marker = isBase ? '  ← base' : '';
    const def    = ORIG_DEFAULTS[key];
    const pch    = ((lvl - def) / def * 100).toFixed(1).padStart(5);
    const bpct   = ((lvl - baseVal) / baseVal * 100).toFixed(1);
    const bpctStr = isBase ? '  base ' : `  ${bpct.padStart(5)}%`;
    const passTag = pass ? 'OK  ' : 'FAIL';
    log(`    ${pch}% from orig | ${bpctStr} from base | ${lvl.toFixed(6)}  score=${score.toFixed(4)}  ${passTag}${marker}`);
  }
  if (beatBase) {
    const dir = bestInSweep.lvl > baseVal ? 'higher' : 'lower';
    const imp = ((baseScore - bestInSweep.score) / baseScore * 100).toFixed(1);
    log(`    → YES: ${dir} is better. Best: ${bestInSweep.lvl.toFixed(6)} (score ${bestInSweep.score.toFixed(4)}, ${imp}% improvement over base)`);
  } else {
    log(`    → No level beats base value (base score ${baseScore.toFixed(4)} is optimal in this sweep)`);
  }
  log('');
}

// ── Final recommended set ─────────────────────────────────────────────────────
log('  FINAL RECOMMENDED SET — all 8 values (hfs=0.030 fixed):');
log('');

// Best combo among passing; if none, least-bad overall
const overall = passedBoth.length > 0
  ? passedBoth[0]
  : [...results].sort((a, b) => a.score - b.score)[0];

if (passedBoth.length === 0) {
  log('  WARNING: No combo passed all hard cutoffs on both tracks.');
  log(`  Least-bad combo: #${overall.i} "${overall.label}"  score=${overall.score.toFixed(5)}`);
} else {
  log(`  Best passing combo: #${overall.i} "${overall.label}"  score=${overall.score.toFixed(5)}`);
  log(`  Improvement over baseline: ${((1 - overall.score / base.score) * 100).toFixed(1)}%`);
  log(`  Improvement over ph2w-hfs0.030 (combo #1): ${((1 - overall.score / w1.score) * 100).toFixed(1)}%`);
}
log('');
for (const key of PARAM_KEYS) {
  const val  = overall.params[key];
  const def  = ORIG_DEFAULTS[key];
  const pch  = ((val - def) / def * 100).toFixed(1);
  const fixed = key === 'homeForceStrength' ? '  [FIXED]' : '';
  log(`    ${SHORT[key].padEnd(4)} = ${val.toFixed(6)}  (${pch}% from original default ${def.toFixed(5)})${fixed}`);
}
log('');
log('AWAITING USER INPUT.');
