/**
 * sweep-dyn-sbt.mjs
 * Mandatory sim for feat/dynamic-speed-brake.
 * Tests speedBrakeTMultiplier values [0.8, 1.0, 1.5, 2.0, 2.5]
 * against all 7 most-affected tracks using Phase 5 winner physics as base.
 * 5 combos × 7 tracks × 20 races = 700 races.
 */

import { readFileSync, appendFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { EditorShape }               from '../client/src/modules/track-editor/EditorShape.js';
import { DEFAULT_BASE_SPEED_CONFIG } from '../client/src/modules/storage/defaults.js';
import { RACER_CONFIGS, runSingleRace, computeFinishT } from './sim-fairness.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const OUT   = join(ROOT, 'sweep-dyn-sbt-results.txt');

writeFileSync(OUT, '');

function log(...args) {
  const line = args.map(String).join(' ');
  process.stdout.write(line + '\n');
  appendFileSync(OUT, line + '\n');
}

const f6  = (v) => v.toFixed(6);
const f2  = (v) => v.toFixed(2);
const pct = (v) => (v * 100).toFixed(3) + '%';
const T_START = Date.now();
const elapsed = () => {
  const ms = Date.now() - T_START;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

// ── Phase 5 winner — base physics for all combos ──────────────────────────────
const PH5_BASE = {
  lateralForce:                0.011400,
  lateralDamping:              0.160000,
  homeForceStrength:           0.030000,
  homeForceReductionOnOverlap: 0.300000,
  avoidanceDistance:           0.180000,
  speedBrakeFactor:            0.945000,
  speedBrakeYThreshold:        0.180000,
  // speedBrakeTMultiplier set per-combo below
};

// ── Combo list ────────────────────────────────────────────────────────────────
const MULTIPLIERS = [0.8, 1.0, 1.5, 2.0, 2.5];
const COMBOS = MULTIPLIERS.map((m) => ({
  label: `sbt×${m.toFixed(1)}`,
  params: { ...PH5_BASE, speedBrakeTMultiplier: m },
}));

// ── Track list ────────────────────────────────────────────────────────────────
const TRACKS = [
  { id: 'dirt-oval',    name: 'Dirt Oval',    racerType: 'horse',   nRacers: 40, durSec: 60 },
  { id: 'garden-path',  name: 'Garden Path',  racerType: 'horse',   nRacers: 40, durSec: 60 },
  { id: 'city-circuit', name: 'City Circuit', racerType: 'f1',      nRacers: 40, durSec: 60 },
  { id: 'ice-track',    name: 'Ice Track',    racerType: 'luge',    nRacers: 40, durSec: 60 },
  { id: 'searound',     name: 'Searound',     racerType: 'manta',   nRacers: 40, durSec: 60 },
  { id: 'space-sprint', name: 'Space Sprint', racerType: 'rocket',  nRacers: 60, durSec: 60 },
  { id: 'river-run',    name: 'River Run',    racerType: 'dolphin', nRacers: 60, durSec: 60 },
];

const N_RACES = 20;
const BASE_SPEED_MEAN = (DEFAULT_BASE_SPEED_CONFIG.min + DEFAULT_BASE_SPEED_CONFIG.max) / 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function loadTrack(spec) {
  const raw   = JSON.parse(readFileSync(join(ROOT, 'server/data/tracks', `${spec.id}.json`), 'utf8'));
  const shape = new EditorShape(raw);
  const isOpen              = !!shape.isOpen;
  const pathLengthPx        = raw.pathLengthPx ?? shape.getTotalLength();
  const geometricTrackWidth = shape.getActualTrackWidth();
  const { displaySize, bodyFillX, bodyFillY, speedMultiplier } = RACER_CONFIGS[spec.racerType];
  const finishT = computeFinishT(BASE_SPEED_MEAN, speedMultiplier, spec.durSec, isOpen);
  return { ...spec, shape, isOpen, pathLengthPx, geometricTrackWidth,
           displaySize, bodyFillX, bodyFillY, speedMultiplier, finishT };
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
    fin.push(fin2.length > 0 ? fin2.reduce((s2, r2) => s2 + r2.finishTime, 0) / fin2.length : td.durSec);
    for (const r2 of res)
      if (r2.finalRank != null && r2.finalRank >= 1 && r2.finalRank <= td.nRacers)
        tally[r2.finalRank - 1]++;
  }
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  return {
    hardOverlapRate:   avg(hard),
    softOverlapRate:   avg(soft),
    zigzagScore:       avg(zig),
    lateralSpeedScore: avg(lat),
    stableOvertakes:   avg(so),
    meanFinishTime:    avg(fin),
    pValue:            chiSquareP(tally),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

log('');
log('══════════════════════════════════════════════════════════════════════');
log(' SWEEP dynamic speedBrakeTMultiplier — post-implementation validation');
log(`  Started: ${new Date().toISOString()}`);
log(`  ${COMBOS.length} multipliers × ${TRACKS.length} tracks × ${N_RACES} races = ${COMBOS.length * TRACKS.length * N_RACES} races`);
log(`  Base: Phase 5 winner physics (lf=0.0114 ld=0.160 hfs=0.030 ad=0.180 sbf=0.945 sby=0.180)`);
log('══════════════════════════════════════════════════════════════════════');

// Pre-load all tracks
const trackData = TRACKS.map(loadTrack);
for (const td of trackData) {
  log(`  ${td.name.padEnd(15)}: isOpen=${td.isOpen}  pathLen=${Math.round(td.pathLengthPx)}px  racerType=${td.racerType}  nRacers=${td.nRacers}`);
}
log('');

// results[comboIdx][trackIdx] = metrics
const results = COMBOS.map(() => new Array(TRACKS.length).fill(null));

let done = 0;
const total = COMBOS.length * TRACKS.length;

for (let ci = 0; ci < COMBOS.length; ci++) {
  const combo = COMBOS[ci];
  log(`── Combo ${ci + 1}/${COMBOS.length}: "${combo.label}"  (sbt×${MULTIPLIERS[ci].toFixed(1)}) ──`);

  for (let ti = 0; ti < TRACKS.length; ti++) {
    const td   = trackData[ti];
    const seed = 30000 + ci * 10000 + ti * 100;
    const m    = runOnTrack(td, combo.params, N_RACES, seed);
    results[ci][ti] = m;
    done++;

    const pass =
      m.pValue >= 0.05 &&
      m.zigzagScore <= 0.003 &&
      m.hardOverlapRate <= 0.03;

    log(
      `  ${td.name.padEnd(15)}: hard=${pct(m.hardOverlapRate).padStart(8)} zig=${f6(m.zigzagScore)} lat=${f6(m.lateralSpeedScore)} ` +
      `stOvt=${m.stableOvertakes.toFixed(2)} p=${m.pValue.toFixed(3)} finT=${f2(m.meanFinishTime)}s  ${pass ? 'OK' : 'FAIL'}`
    );
  }

  const meanP    = results[ci].reduce((s, m) => s + m.pValue, 0) / TRACKS.length;
  const allPass  = results[ci].every((m) => m.pValue >= 0.05 && m.zigzagScore <= 0.003 && m.hardOverlapRate <= 0.03);
  log(`  → mean p=${meanP.toFixed(3)}  all-cutoffs=${allPass ? 'PASS' : 'FAIL'}  (${elapsed()})`);
  log('');
}

// ── Summary table ─────────────────────────────────────────────────────────────
log('');
log('═══ RESULTS COMPLETE ═══');
log(`  Runtime: ${elapsed()}`);
log('');
log('  Per-combo per-track — hard%, zig, lat, stOvt, p-val, finT, pass/fail');
log('');

for (let ci = 0; ci < COMBOS.length; ci++) {
  const combo = COMBOS[ci];
  const allPass = results[ci].every((m) => m.pValue >= 0.05 && m.zigzagScore <= 0.003 && m.hardOverlapRate <= 0.03);
  log(`  ── Multiplier ${MULTIPLIERS[ci].toFixed(1)} ("${combo.label}")  passes-all=${allPass ? 'YES' : 'NO'} ──`);
  log(`  ${'Track'.padEnd(15)} | ${'hard%'.padStart(7)} | ${'zig'.padStart(8)} | ${'lat'.padStart(8)} | ${'stOvt'.padStart(6)} | ${'p-val'.padStart(6)} | ${'finT'.padStart(7)} | pass`);
  log('  ' + '─'.repeat(90));
  for (let ti = 0; ti < TRACKS.length; ti++) {
    const m = results[ci][ti];
    const pass = m.pValue >= 0.05 && m.zigzagScore <= 0.003 && m.hardOverlapRate <= 0.03;
    log(
      `  ${TRACKS[ti].name.padEnd(15)} | ${pct(m.hardOverlapRate).padStart(7)} | ${f6(m.zigzagScore).padStart(8)} | ` +
      `${f6(m.lateralSpeedScore).padStart(8)} | ${m.stableOvertakes.toFixed(2).padStart(6)} | ` +
      `${m.pValue.toFixed(3).padStart(6)} | ${f2(m.meanFinishTime).padStart(6)}s | ${pass ? 'OK' : 'FAIL'}`
    );
  }
  // Mean row
  const meanM = {
    hardOverlapRate:   results[ci].reduce((s, m) => s + m.hardOverlapRate, 0)   / TRACKS.length,
    zigzagScore:       results[ci].reduce((s, m) => s + m.zigzagScore, 0)       / TRACKS.length,
    lateralSpeedScore: results[ci].reduce((s, m) => s + m.lateralSpeedScore, 0) / TRACKS.length,
    stableOvertakes:   results[ci].reduce((s, m) => s + m.stableOvertakes, 0)   / TRACKS.length,
    pValue:            results[ci].reduce((s, m) => s + m.pValue, 0)            / TRACKS.length,
    meanFinishTime:    results[ci].reduce((s, m) => s + m.meanFinishTime, 0)    / TRACKS.length,
  };
  log('  ' + '─'.repeat(90));
  log(
    `  ${'MEAN'.padEnd(15)} | ${pct(meanM.hardOverlapRate).padStart(7)} | ${f6(meanM.zigzagScore).padStart(8)} | ` +
    `${f6(meanM.lateralSpeedScore).padStart(8)} | ${meanM.stableOvertakes.toFixed(2).padStart(6)} | ` +
    `${meanM.pValue.toFixed(3).padStart(6)} | ${f2(meanM.meanFinishTime).padStart(6)}s |`
  );
  log('');
}

// ── Multiplier comparison ─────────────────────────────────────────────────────
log('  Summary — mean metrics across all 7 tracks per multiplier:');
log('');
log(`  ${'mult'.padStart(6)} | ${'mean-p'.padStart(8)} | ${'mean-zig'.padStart(10)} | ${'mean-lat'.padStart(10)} | ${'mean-stOvt'.padStart(11)} | ${'mean-finT'.padStart(10)} | passes-all`);
log('  ' + '─'.repeat(80));

let bestCombo = null;
let bestAllPass = false;

for (let ci = 0; ci < COMBOS.length; ci++) {
  const allPass = results[ci].every((m) => m.pValue >= 0.05 && m.zigzagScore <= 0.003 && m.hardOverlapRate <= 0.03);
  const meanP   = results[ci].reduce((s, m) => s + m.pValue, 0) / TRACKS.length;
  const meanZ   = results[ci].reduce((s, m) => s + m.zigzagScore, 0) / TRACKS.length;
  const meanL   = results[ci].reduce((s, m) => s + m.lateralSpeedScore, 0) / TRACKS.length;
  const meanSO  = results[ci].reduce((s, m) => s + m.stableOvertakes, 0) / TRACKS.length;
  const meanF   = results[ci].reduce((s, m) => s + m.meanFinishTime, 0) / TRACKS.length;
  log(
    `  ${MULTIPLIERS[ci].toFixed(1).padStart(6)} | ${meanP.toFixed(3).padStart(8)} | ${f6(meanZ).padStart(10)} | ` +
    `${f6(meanL).padStart(10)} | ${meanSO.toFixed(2).padStart(11)} | ${f2(meanF).padStart(9)}s | ${allPass ? 'YES' : 'NO'}`
  );
  if (allPass && !bestAllPass) { bestCombo = ci; bestAllPass = true; }
  if (allPass && bestCombo !== null) bestCombo = ci; // prefer highest passing multiplier
}

log('');
if (bestAllPass) {
  // Find lowest passing multiplier (safest/earliest brake)
  let lowestPass = null;
  for (let ci = 0; ci < COMBOS.length; ci++) {
    const allPass = results[ci].every((m) => m.pValue >= 0.05 && m.zigzagScore <= 0.003 && m.hardOverlapRate <= 0.03);
    if (allPass && lowestPass === null) lowestPass = ci;
  }
  log(`  RECOMMENDED speedBrakeTMultiplier: ${MULTIPLIERS[lowestPass].toFixed(1)}  (lowest value passing all cutoffs on all tracks)`);
} else {
  log('  WARNING: no multiplier passed all cutoffs on all tracks — review results above');
}
log('');
log('AWAITING USER INPUT.');
