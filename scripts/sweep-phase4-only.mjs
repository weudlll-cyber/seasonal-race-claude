// ============================================================
// File:        sweep-phase4-only.mjs
// Path:        scripts/sweep-phase4-only.mjs
// Project:     RaceArena
// Created:     2026-06-04
// Description: Phase 4 validation — Phase-3 top-3 combos × 10 tracks × 100 races
//              (3100 total); appends to sweep-full-4phase-results.txt.
// ============================================================

/**
 * sweep-phase4-only.mjs
 * Phase 4 validation run using Phase-3 top-3 combos from sweep-full-4phase.mjs.
 * Top-3 combos are hardcoded from the Phase-3 output.
 *
 * 10 tracks × (10 baseline + 3×100) races = 3100 races
 * Appends results to sweep-full-4phase-results.txt.
 */

import { readFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { EditorShape }                                              from '../client/src/modules/track-editor/EditorShape.js';
import { DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG } from '../client/src/modules/storage/defaults.js';
import { RACER_CONFIGS, runSingleRace, computeFinishT }            from './sim-fairness.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const OUT   = join(ROOT, 'sweep-full-4phase-results.txt');

function log(...args) {
  const line = args.map(String).join(' ');
  process.stdout.write(line + '\n');
  appendFileSync(OUT, line + '\n');
}

const pct  = (v, d = 3) => (v * 100).toFixed(d) + '%';
const f4   = (v) => v.toFixed(4);
const f2   = (v) => v.toFixed(2);
const f8   = (v) => v.toFixed(8);
const elap = (ms) => `${(ms / 60000).toFixed(1)} min`;
const T_START = Date.now();
const elapsed = () => elap(Date.now() - T_START);

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

// ── Phase-3 top-3 combos (hardcoded from sweep-full-4phase output) ────────────
const P3_TOP3 = [
  // #1 — Phase-3 combo 5 × 0.95, score=0.1894
  { lateralForce: 0.0095, lateralDamping: 0.19, homeForceStrength: 0.0304,
    homeForceReductionOnOverlap: 0.228, avoidanceDistance: 0.114,
    speedBrakeFactor: 0.90725, speedBrakeTThreshold: 0.015675, speedBrakeYThreshold: 0.152 },
  // #2 — Phase-3 combo 4 × 0.95, score=0.2292
  { lateralForce: 0.0095, lateralDamping: 0.19, homeForceStrength: 0.0304,
    homeForceReductionOnOverlap: 0.342, avoidanceDistance: 0.114,
    speedBrakeFactor: 0.90725, speedBrakeTThreshold: 0.015675, speedBrakeYThreshold: 0.152 },
  // #3 — Phase-3 combo 2 × 0.95, score=0.2324
  { lateralForce: 0.0095, lateralDamping: 0.19, homeForceStrength: 0.0304,
    homeForceReductionOnOverlap: 0.285, avoidanceDistance: 0.114,
    speedBrakeFactor: 0.90725, speedBrakeTThreshold: 0.015675, speedBrakeYThreshold: 0.152 },
];

// ── Track list ────────────────────────────────────────────────────────────────
const P4_TRACKS = [
  { id: 'dirt-oval',       label: 'Dirt Oval',      racer: 'horse',   n: 40 },
  { id: 'garden-path',     label: 'Garden Path',    racer: 'horse',   n: 40 },
  { id: 'city-circuit',    label: 'City Circuit',   racer: 'f1',      n: 40 },
  { id: 'ice-track',       label: 'Ice Track',      racer: 'luge',    n: 40 },
  { id: 'searound',        label: 'Searound',       racer: 'manta',   n: 40 },
  { id: 'luger-hill',    label: 'Luger Hill',     racer: 'luge',    n: 50 },
  { id: 'space-sprint',    label: 'Space Sprint',   racer: 'rocket',  n: 60 },
  { id: 'river-run',       label: 'River Run',      racer: 'dolphin', n: 50 },
  { id: 'mountainstreet',  label: 'Mountainstreet', racer: 'horse',   n: 50 },
  { id: 'seatrack',        label: 'Seatrack',       racer: 'dolphin', n: 50 },
];

// ── Chi-square p-value ────────────────────────────────────────────────────────
function chiSquareP(observed) {
  const total = observed.reduce((s, c) => s + c, 0);
  if (total === 0) return 1;
  const n = observed.length, exp = total / n;
  let chi2 = 0;
  for (const c of observed) chi2 += (c - exp) ** 2 / exp;
  const df = n - 1;
  const h = chi2 / df - 1 + 2 / (9 * df);
  const z = h / Math.sqrt(2 / (9 * df));
  const p = 1 - 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
  return Math.max(0, Math.min(1, p));
}

// ── Track loader (cached) ─────────────────────────────────────────────────────
const _tc = {};
function loadTrack(id) {
  if (_tc[id]) return _tc[id];
  const raw = JSON.parse(readFileSync(join(ROOT, 'server/data/tracks', `${id}.json`), 'utf8'));
  const shape = new EditorShape(raw);
  _tc[id] = { shape, isOpen: !!shape.isOpen,
               pathLengthPx: raw.pathLengthPx ?? shape.getTotalLength(),
               geometricTrackWidth: raw.width ?? shape.getActualTrackWidth() };
  return _tc[id];
}

// ── Run N races ───────────────────────────────────────────────────────────────
function runCombo({ trackId, racerType, nRacers, durSec = 60, nRaces = 10, params, seed0 = 42 }) {
  const { shape, isOpen, pathLengthPx, geometricTrackWidth } = loadTrack(trackId);
  const { displaySize, bodyFillX, bodyFillY, speedMultiplier } = RACER_CONFIGS[racerType];
  const finishT = computeFinishT(BASE_SPEED_MEAN, speedMultiplier, durSec, isOpen);
  const hard = [], soft = [], zig = [], lat = [], so = [], fin = [];
  const tally = new Array(nRacers).fill(0);
  for (let r = 0; r < nRaces; r++) {
    const res = runSingleRace({ shape, pathLengthPx, geometricTrackWidth, isOpen,
      speedMultiplier, displaySize, bodyFillX, bodyFillY, finishT,
      targetSeconds: durSec, seed: seed0 + r, nRacers,
      behaviorConfigOverrides: params });
    hard.push(res.liteHardOverlapRate ?? 0);
    soft.push(res.liteSoftOverlapRate ?? 0);
    zig .push(res.liteZigzagScore     ?? 0);
    lat .push(res.liteLatSpeedScore   ?? 0);
    so  .push(res.liteStableOvertakes ?? 0);
    const fin2 = res.filter((r2) => r2.finishTime != null);
    fin.push(fin2.length > 0 ? fin2.reduce((s, r2) => s + r2.finishTime, 0) / fin2.length : durSec);
    for (const r2 of res)
      if (r2.finalRank != null && r2.finalRank >= 1 && r2.finalRank <= nRacers)
        tally[r2.finalRank - 1]++;
  }
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  return { hardOverlapRate: avg(hard), softOverlapRate: avg(soft), zigzagScore: avg(zig),
           lateralSpeedScore: avg(lat), stableOvertakes: avg(so),
           meanFinishTime: avg(fin), pValue: chiSquareP(tally) };
}

// ── Composite score weights ───────────────────────────────────────────────────
const W = [
  { k: 'hardOverlapRate',   w: 0.30, inv: false },
  { k: 'zigzagScore',       w: 0.25, inv: false },
  { k: 'lateralSpeedScore', w: 0.20, inv: false },
  { k: 'softOverlapRate',   w: 0.10, inv: false },
  { k: 'stableOvertakes',   w: 0.10, inv: true  },
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

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 4
// ══════════════════════════════════════════════════════════════════════════════

log('');
log('══════════════════════════════════════════════════════════════════════');
log(' PHASE 4 — Validation across 10 tracks × 100 races  (resumed)');
log(`  Started: ${new Date().toISOString()}`);
log('  Running defaults baseline (10 races) + 3 combos (100 races) per track');
log('  Estimated: ~50 min');
log('══════════════════════════════════════════════════════════════════════');
log('');
log('  Phase-3 top-3 combos:');
for (let i = 0; i < 3; i++) {
  const c = P3_TOP3[i];
  log(`  #${i+1}  lf=${c.lateralForce}  ld=${c.lateralDamping}  hfs=${c.homeForceStrength}  hfr=${c.homeForceReductionOnOverlap}`);
  log(`      ad=${c.avoidanceDistance}  sbf=${c.speedBrakeFactor}  sbt=${c.speedBrakeTThreshold}  sby=${c.speedBrakeYThreshold}`);
}
log('');

// Per-track baselines
log('── Computing per-track baselines (10 races/track with current defaults)…');
const p4Baselines = {};
for (const { id, label, racer, n } of P4_TRACKS) {
  p4Baselines[id] = runCombo({ trackId: id, racerType: racer, nRacers: n,
                               durSec: 60, nRaces: 10, params: DEFAULTS });
  process.stderr.write(`  Baseline done: ${label}\n`);
}
log('  All baselines computed.');
log('');

// Run 3 combos × 10 tracks × 100 races
const p4Results = [];
for (let ci = 0; ci < 3; ci++) {
  const combo = P3_TOP3[ci];
  log(`── Combo #${ci+1} / 3 (100 races per track)…`);
  for (const { id, label, racer, n } of P4_TRACKS) {
    const m = runCombo({ trackId: id, racerType: racer, nRacers: n,
                         durSec: 60, nRaces: 100, params: combo });
    p4Results.push({ ci, id, label, m });
    process.stderr.write(`  Combo ${ci+1}/3  ${label}\n`);
  }
  log(`  Combo #${ci+1} done.  Elapsed: ${elapsed()}`);
}
log('');

// Composite scores per track (normalize across 3 combos per track)
const p4MeanScores = [0, 0, 0];
const p4PassAll    = [true, true, true];

for (const { id } of P4_TRACKS) {
  const rows = p4Results.filter((r) => r.id === id).map((r) => ({ m: r.m, ci: r.ci }));
  addScores(rows);
  for (const row of rows) {
    if (!passes(row.m, p4Baselines[id])) p4PassAll[row.ci] = false;
    p4MeanScores[row.ci] += row.score ?? 0;
  }
}
for (let i = 0; i < 3; i++) p4MeanScores[i] /= P4_TRACKS.length;

log('═══ PHASE 4 COMPLETE ═══');
log(`  Total elapsed: ${elapsed()}`);
log('');

// Per-combo per-track table
for (let ci = 0; ci < 3; ci++) {
  log(`  ── Combo #${ci+1} per-track results:`);
  log('');
  log(`  ${'Track'.padEnd(16)} | ${'hard%'.padStart(7)} | ${'soft%'.padStart(7)} | ${'zigzag'.padStart(7)} | ${'latSpd'.padStart(7)} | ${'stOvt'.padStart(6)} | ${'p'.padStart(6)} | ${'finT'.padStart(7)} | pass`);
  log('  ' + '─'.repeat(98));
  for (const { id, label, m } of p4Results.filter((r) => r.ci === ci)) {
    const ok = passes(m, p4Baselines[id]);
    log(
      `  ${label.padEnd(16)} | ${pct(m.hardOverlapRate, 2).padStart(7)} | ${pct(m.softOverlapRate, 2).padStart(7)} ` +
      `| ${m.zigzagScore.toFixed(4).padStart(7)} | ${m.lateralSpeedScore.toFixed(4).padStart(7)} ` +
      `| ${f2(m.stableOvertakes).padStart(6)} | ${m.pValue.toFixed(3).padStart(6)} | ${f2(m.meanFinishTime).padStart(6)}s | ${ok ? ' OK' : 'FAIL'}`
    );
  }
  log(`  Mean composite score: ${p4MeanScores[ci].toFixed(5)}`);
  log(`  Passes all cutoffs on all tracks: ${p4PassAll[ci] ? 'YES' : 'NO'}`);
  log('');
}

// Pick winner
const eligible = [0, 1, 2].filter((i) => p4PassAll[i]);
const winnerIdx = eligible.length > 0
  ? eligible.reduce((best, i) => p4MeanScores[i] < p4MeanScores[best] ? i : best, eligible[0])
  : [0, 1, 2].reduce((best, i) => p4MeanScores[i] < p4MeanScores[best] ? i : best, 0);

if (eligible.length === 0)
  log('  ⚠ No combo passed all cutoffs on all tracks — using best mean score as fallback.');

const winner = P3_TOP3[winnerIdx];

log('══════════════════════════════════════════════════════════════════════');
log('  OVERALL WINNER');
log('══════════════════════════════════════════════════════════════════════');
log('');
log(`  Winner: Combo #${winnerIdx + 1}  (mean composite score: ${p4MeanScores[winnerIdx].toFixed(5)})`);
log(`  Passes all cutoffs on all 10 tracks: ${p4PassAll[winnerIdx] ? 'YES' : 'NO'}`);
log('');

log('╔══════════════════════════════════════════════════════════════════╗');
log('║  RECOMMENDED NEW DEFAULTS                                       ║');
log('╚══════════════════════════════════════════════════════════════════╝');
log('');
const paramNames = Object.keys(winner);
for (const k of paramNames)
  log(`  ${k.padEnd(26)}: ${f8(winner[k])}`);
log('');

log('  Full comparison — winner vs current defaults:');
log('');
log(`  ${'parameter'.padEnd(26)}  ${'default'.padStart(10)}  ${'winner'.padStart(12)}  ${'% change'.padStart(10)}`);
log('  ' + '─'.repeat(65));
for (const k of paramNames) {
  const def = DEFAULTS[k];
  const win = winner[k];
  const pch = ((win - def) / def * 100).toFixed(2) + '%';
  log(`  ${k.padEnd(26)}  ${String(def).padStart(10)}  ${f8(win).padStart(12)}  ${pch.padStart(10)}`);
}
log('');

// Per-metric improvement vs Space Sprint baseline
const sprintRows = p4Results.filter((r) => r.ci === winnerIdx && r.id === 'space-sprint');
if (sprintRows.length > 0) {
  const wm = sprintRows[0].m;
  const base = p4Baselines['space-sprint'];
  log('  Per-metric improvement vs defaults (Space Sprint / rocket, 100 races):');
  const diff = (a, b) => {
    const d = ((a - b) / b * 100).toFixed(1) + '%';
    return (a < b ? '▼' : '▲') + d;
  };
  log(`    hardOverlapRate:    ${pct(wm.hardOverlapRate)}  vs ${pct(base.hardOverlapRate)}  ${diff(wm.hardOverlapRate, base.hardOverlapRate)}`);
  log(`    softOverlapRate:    ${pct(wm.softOverlapRate)}  vs ${pct(base.softOverlapRate)}  ${diff(wm.softOverlapRate, base.softOverlapRate)}`);
  log(`    zigzagScore:        ${f4(wm.zigzagScore)}  vs ${f4(base.zigzagScore)}  ${diff(wm.zigzagScore, base.zigzagScore)}`);
  log(`    lateralSpeedScore:  ${f4(wm.lateralSpeedScore)}  vs ${f4(base.lateralSpeedScore)}  ${diff(wm.lateralSpeedScore, base.lateralSpeedScore)}`);
  log(`    stableOvertakes:    ${f2(wm.stableOvertakes)}  vs ${f2(base.stableOvertakes)}`);
  log(`    meanFinishTime:     ${f2(wm.meanFinishTime)}s  vs ${f2(base.meanFinishTime)}s`);
}
log('');
log(`  Total elapsed: ${elapsed()}`);
log('=== PHASE 4 COMPLETE — 4-PHASE SWEEP DONE ===');
