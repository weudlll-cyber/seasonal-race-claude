// ============================================================
// File:        sim-sweep.mjs
// Path:        scripts/sim-sweep.mjs
// Project:     RaceArena
// Description: Two-phase parameter sweep for Race Plan timing parameters.
//              Phase 1: 10 races/combo/track, applies hard cutoffs, keeps top 3.
//              Phase 2: 100 races/combo/track for full statistical confirmation.
//
// Usage: node scripts/sim-sweep.mjs
// ============================================================

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const ROOT = join(__dir, '..');

import { EditorShape } from '../client/src/modules/track-editor/EditorShape.js';
import {
  computeEvenRowLayout,
  computeRacerLayout,
} from '../client/src/modules/rowLayout.js';
import { computeSpeedScaleFactor } from '../client/src/modules/camera/lapUtils.js';
import {
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG,
} from '../client/src/modules/storage/defaults.js';
import { createRacePlan, createTrajectoryController, BAND_EDGES } from '../client/src/modules/racePlanner.js';
import { DEFAULT_AUTO_SCALE_CONFIG } from '../client/src/modules/autoSpriteScale.js';
import { runSingleRace, computeFinishT, RACER_CONFIGS } from './sim-fairness.mjs';

// ── Constants ─────────────────────────────────────────────────────────────────
const GLOBAL_SEED     = 42;
const BONUS_MULT      = DEFAULT_RACE_DYNAMICS_CONFIG.racePlanBonusStrengthMultiplier; // 2.0
const BONUS_FADE_MS   = 1500; // fixed — not swept

// Sweep tracks: (id, racerType, nRacers, durationSec)
const SWEEP_TRACKS = [
  { id: 'dirt-oval',    name: 'Dirt Oval',   racerType: 'horse',  nRacers: 40, durationSec: 60 },
  { id: 'luger-hill', name: 'Luger Hill',  racerType: 'luge',   nRacers: 60, durationSec: 60 },
  { id: 'space-sprint', name: 'Space Sprint',racerType: 'rocket', nRacers: 90, durationSec: 60 },
];

// Current defaults = baseline
const BASELINE_PARAMS = {
  bonusTransitionEnd: 0.67,
  corridorStart:      0.67,
  corridorEnd:        0.95,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function zoneOf(rank) {
  for (let i = 0; i < BAND_EDGES.length; i++) {
    if (rank <= BAND_EDGES[i]) return i;
  }
  return BAND_EDGES.length;
}

function zoneSuccessRate(items) {
  if (items.length === 0) return 0;
  return items.filter((i) => zoneOf(i.finalRank) === i.sollZone).length / items.length;
}

function pct(v, dec = 1) { return (v * 100).toFixed(dec) + '%'; }
function f6(v)  { return v.toFixed(6); }
function f4(v)  { return v.toFixed(4); }

// ── Track setup ───────────────────────────────────────────────────────────────
function loadTrack(trackId) {
  const trackPath = join(ROOT, 'server/data/tracks', `${trackId}.json`);
  const track     = JSON.parse(readFileSync(trackPath, 'utf8'));
  const shape     = new EditorShape(track);
  const isOpen    = !!shape.isOpen;
  return {
    shape,
    isOpen,
    pathLengthPx:        track.pathLengthPx ?? shape.getTotalLength(),
    geometricTrackWidth: track.width ?? shape.getActualTrackWidth(),
  };
}

// ── Per-track combo runner ─────────────────────────────────────────────────────
function runCombo(trackData, racerType, nRacers, durationSec, params, nRaces, seedBase) {
  const { shape, isOpen, pathLengthPx, geometricTrackWidth } = trackData;
  const { speedMultiplier, displaySize } = RACER_CONFIGS[racerType];

  const BASE_SPEED_MIN  = DEFAULT_BASE_SPEED_CONFIG.min;
  const BASE_SPEED_MAX  = DEFAULT_BASE_SPEED_CONFIG.max;
  const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;
  const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
  const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
  const expectedMinSF   = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1);

  const trackSsf         = isOpen ? computeSpeedScaleFactor(pathLengthPx) : 1;
  const trackNaturalBase = isOpen
    ? BASE_SPEED_MEAN / trackSsf
    : BASE_SPEED_MEAN / expectedMinSF;
  const finishT = computeFinishT(trackNaturalBase, speedMultiplier, durationSec, isOpen);

  const effectiveWidth = geometricTrackWidth * DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange;
  const { rowCount: totalRows } = computeRacerLayout(effectiveWidth, nRacers, displaySize, DEFAULT_AUTO_SCALE_CONFIG);
  const comboRowLayout = computeEvenRowLayout(nRacers, totalRows);
  const planRacers     = comboRowLayout.assignments.map((a) => ({ index: a.racerIndex, startRowIndex: a.rowIndex }));

  const zoneItems = [];
  let sumZigzag = 0, sumOverlap = 0, sumLatSpeed = 0, sumStableOvt = 0;

  for (let raceIdx = 0; raceIdx < nRaces; raceIdx++) {
    const seed = (seedBase - 1) * nRaces + raceIdx + 1;

    const plan = createRacePlan(
      planRacers, finishT, durationSec * 1000,
      {
        bonusStrengthMultiplier: BONUS_MULT,
        bonusTransitionEnd:      params.bonusTransitionEnd,
        bonusFadeDuration:       BONUS_FADE_MS,
        corridorStart:           params.corridorStart,
        corridorEnd:             params.corridorEnd,
      },
      seed,
    );
    const racePlanController = createTrajectoryController(plan);
    const sollRankMap        = plan._racerTargetRank;

    const result = runSingleRace({
      shape, pathLengthPx, geometricTrackWidth, isOpen,
      speedMultiplier, displaySize, finishT,
      targetSeconds: durationSec, seed, nRacers,
      racePlanController,
    });

    for (const r of result) {
      const sollRank = sollRankMap?.get(r.racerIndex) ?? null;
      if (sollRank != null) {
        zoneItems.push({ sollZone: zoneOf(sollRank), finalRank: r.finalRank });
      }
    }

    sumZigzag    += result.liteZigzagScore    ?? 0;
    sumOverlap   += result.liteOverlapRate     ?? 0;
    sumLatSpeed  += result.liteLatSpeedScore   ?? 0;
    sumStableOvt += result.liteStableOvertakes ?? 0;
  }

  return {
    zoneSuccess:  zoneSuccessRate(zoneItems),
    zigzag:       sumZigzag    / nRaces,
    overlapRate:  sumOverlap   / nRaces,
    lateralSpeed: sumLatSpeed  / nRaces,
    stableOvt:    sumStableOvt / nRaces,
    zoneItems,
  };
}

// ── All-track aggregator ───────────────────────────────────────────────────────
function runAllTracks(trackDatas, params, nRaces, seedBase) {
  let allZoneItems = [];
  let sumZigzag = 0, sumOverlap = 0, sumLatSpeed = 0, sumStableOvt = 0;
  const perTrack = [];

  for (let ti = 0; ti < SWEEP_TRACKS.length; ti++) {
    const tc  = SWEEP_TRACKS[ti];
    const res = runCombo(trackDatas[ti], tc.racerType, tc.nRacers, tc.durationSec, params, nRaces, seedBase);
    perTrack.push(res);
    allZoneItems = allZoneItems.concat(res.zoneItems);
    sumZigzag    += res.zigzag;
    sumOverlap   += res.overlapRate;
    sumLatSpeed  += res.lateralSpeed;
    sumStableOvt += res.stableOvt;
  }

  const n = SWEEP_TRACKS.length;
  return {
    zoneSuccess:  zoneSuccessRate(allZoneItems),
    zigzag:       sumZigzag    / n,
    overlapRate:  sumOverlap   / n,
    lateralSpeed: sumLatSpeed  / n,
    stableOvt:    sumStableOvt / n,
    perTrack,
  };
}

// ── Parameter grid ─────────────────────────────────────────────────────────────
// Phase 1 uses a coarser step (0.10) to keep runtime under ~30 minutes.
// Phase 2 tests the top 3 survivors with full statistical confirmation.
function genGrid() {
  const bteRange = [0.55, 0.65, 0.75, 0.85];   // 0.55–0.85 step 0.10
  const csRange  = [0.55, 0.65, 0.75, 0.85];
  const ceRange  = [0.75, 0.85, 0.95];
  const combos   = [];
  for (const ce of ceRange) {
    for (const cs of csRange.filter((v) => v <= ce)) {
      for (const bte of bteRange.filter((v) => v <= ce)) {
        combos.push({ bonusTransitionEnd: bte, corridorStart: cs, corridorEnd: ce });
      }
    }
  }
  return combos;
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log('\n=== Race Plan Timing Sweep — RaceArena ===');
console.log(`Seed: ${GLOBAL_SEED}  bonusMult: ${BONUS_MULT}  bonusFadeDuration: ${BONUS_FADE_MS}ms`);
console.log('Tracks: Dirt Oval (horse 40r), Luger Hill (luge 60r), Space Sprint (rocket 90r) — all 60s');
console.log('Phase 1: step 0.10 grid (coarse) — 10 races/combo/track');
console.log('Phase 2: top 3 survivors — 100 races/combo/track');
console.log('');

const trackDatas = SWEEP_TRACKS.map((tc) => loadTrack(tc.id));

// ── Baseline: pre-captured (seed=42, 50 races/track, BTE=0.67 CS=0.67 CE=0.95) ──
// Recaptured post-B0b (Priority System wired + DT=16 timebase parity).
// Run 1: zone=56.5% zz=0.000071 ol=0.02% ls=0.001314 so=9.2771
// Run 2: zone=57.2% zz=0.000071 ol=0.02% ls=0.001318 so=9.2829  (used here)
const baseline = {
  zoneSuccess:  0.572,
  zigzag:       0.000071,
  overlapRate:  0.000,
  lateralSpeed: 0.001318,
  stableOvt:    9.2829,
  perTrack: [
    { zoneSuccess: 0.626, zigzag: 0.000074, overlapRate: 0.000, lateralSpeed: 0.001456, stableOvt: 5.6570 },
    { zoneSuccess: 0.474, zigzag: 0.000072, overlapRate: 0.000, lateralSpeed: 0.001496, stableOvt: 9.5793 },
    { zoneSuccess: 0.613, zigzag: 0.000069, overlapRate: 0.000, lateralSpeed: 0.001003, stableOvt: 12.6124 },
  ],
};
console.log('── BASELINE (pre-captured, seed=42, 50 races/track, BTE=0.67 CS=0.67 CE=0.95) ──');
console.log(`  Overall : zone=${pct(baseline.zoneSuccess)}  zigzag=${f6(baseline.zigzag)}  overlap=${pct(baseline.overlapRate)}  latSpd=${f6(baseline.lateralSpeed)}  stableOvt=${f4(baseline.stableOvt)}`);
const trackNames = SWEEP_TRACKS.map((t) => t.name);
for (let ti = 0; ti < baseline.perTrack.length; ti++) {
  const b = baseline.perTrack[ti];
  console.log(`    ${trackNames[ti].padEnd(14)}: zone=${pct(b.zoneSuccess)}  zigzag=${f6(b.zigzag)}  overlap=${pct(b.overlapRate)}  latSpd=${f6(b.lateralSpeed)}  stableOvt=${f4(b.stableOvt)}`);
}
console.log('');

// Hard cutoff thresholds (applied in Phase 2 where N=100 makes them reliable)
const zigzagMax   = baseline.zigzag      * 1.05;
const overlapMax  = baseline.overlapRate;
const latSpeedMax = baseline.lateralSpeed;
const successMin  = baseline.zoneSuccess - 0.03;
const stableMin   = baseline.stableOvt;

console.log('Hard cutoffs vs baseline:');
console.log(`  zigzag      <= ${f6(zigzagMax)}  (baseline ${f6(baseline.zigzag)} + 5%)`);
console.log(`  overlapRate <= ${pct(overlapMax)} (must not worsen)`);
console.log(`  lateralSpd  <= ${f6(latSpeedMax)} (must not increase)`);
console.log(`  zoneSuccess >= ${pct(successMin)} (baseline − 3pp)`);
console.log(`  stableOvt   >= ${f4(stableMin)} (must not decrease)`);
console.log('');

function meetsHardCutoffs(m) {
  return (
    m.zigzag      <= zigzagMax   &&
    m.overlapRate <= overlapMax  &&
    m.lateralSpeed <= latSpeedMax &&
    m.zoneSuccess  >= successMin  &&
    m.stableOvt    >= stableMin
  );
}

function deltaStr(val, base, higherBetter = true) {
  const diff = val - base;
  const sign = diff >= 0 ? '+' : '';
  const mark = higherBetter
    ? (diff > 0 ? '▲' : diff < 0 ? '▼' : '=')
    : (diff > 0 ? '▼' : diff < 0 ? '▲' : '=');
  return `${sign}${(diff * 100).toFixed(2)}pp ${mark}`;
}

// ── Phase 1 — coarse screen (no hard cutoffs at N=10; variance too high) ─────
// Hard cutoffs are only reliable at N=100 (Phase 2). Phase 1 purely ranks combos
// by zone success rate and forwards the top 3 to Phase 2 for full validation.
const grid     = genGrid();
const p1Races  = 10;
console.log(`── PHASE 1: ${grid.length} combos × 3 tracks × ${p1Races} races = ${grid.length * 3 * p1Races} total races ──`);
console.log(`  (No hard cutoffs in Phase 1 — stableOvt/overlapRate variance too high at N=${p1Races})`);
const tP1 = Date.now();

const phase1 = [];
for (let ci = 0; ci < grid.length; ci++) {
  const pct10 = Math.round((ci + 1) / grid.length * 100);
  process.stdout.write(`\r  [${String(ci + 1).padStart(3)}/${grid.length}] ${pct10}%  `);
  const params  = grid[ci];
  const metrics = runAllTracks(trackDatas, params, p1Races, GLOBAL_SEED);
  phase1.push({ params, metrics });
}
process.stdout.write('\r' + ' '.repeat(40) + '\r');
console.log(`  Phase 1 done in ${((Date.now() - tP1) / 1000).toFixed(1)}s`);

phase1.sort((a, b) => b.metrics.zoneSuccess - a.metrics.zoneSuccess);
const top3 = phase1.slice(0, 3);

console.log(`  Top 3 by zone success rate (of ${grid.length}):`);
for (let i = 0; i < top3.length; i++) {
  const { params: p, metrics: m } = top3[i];
  console.log(
    `  #${i + 1}  BTE=${p.bonusTransitionEnd.toFixed(2)} CS=${p.corridorStart.toFixed(2)} CE=${p.corridorEnd.toFixed(2)}` +
    `  zone=${pct(m.zoneSuccess)}  zigzag=${f6(m.zigzag)}  overlap=${pct(m.overlapRate)}  latSpd=${f6(m.lateralSpeed)}  stableOvt=${f4(m.stableOvt)}`,
  );
}
console.log('');

// ── Phase 2 ─────────────────────────────────────────────────────────────────
const p2Races = 100;
console.log(`── PHASE 2: top ${top3.length} survivors × 3 tracks × ${p2Races} races ──`);
const tP2 = Date.now();

const phase2 = [];
for (let i = 0; i < top3.length; i++) {
  const { params } = top3[i];
  process.stdout.write(`\r  Running combo ${i + 1}/${top3.length}…  `);
  const metrics  = runAllTracks(trackDatas, params, p2Races, GLOBAL_SEED);
  phase2.push({ params, metrics });
}
process.stdout.write('\r' + ' '.repeat(40) + '\r');
console.log(`  Phase 2 done in ${((Date.now() - tP2) / 1000).toFixed(1)}s\n`);

phase2.sort((a, b) => b.metrics.zoneSuccess - a.metrics.zoneSuccess);

console.log('Phase 2 — Full results (100 races/track):');
console.log('');
console.log('| # | BTE  | CS   | CE   | zoneSuccess | Δzone  | zigzag   | Δzigzag | overlap% | ΔolapR | latSpd   | ΔlatSpd | stableOvt | ΔsOvt |');
console.log('|---|------|------|------|-------------|--------|----------|---------|----------|--------|----------|---------|-----------|-------|');
for (let i = 0; i < phase2.length; i++) {
  const { params: p, metrics: m } = phase2[i];
  const allPass = meetsHardCutoffs(m);
  console.log(
    `| ${i + 1} | ${p.bonusTransitionEnd.toFixed(2)} | ${p.corridorStart.toFixed(2)} | ${p.corridorEnd.toFixed(2)}` +
    ` | ${pct(m.zoneSuccess, 2).padStart(11)} | ${deltaStr(m.zoneSuccess, baseline.zoneSuccess)}` +
    ` | ${f6(m.zigzag)} | ${deltaStr(m.zigzag, baseline.zigzag, false)}` +
    ` | ${pct(m.overlapRate, 2).padStart(8)} | ${deltaStr(m.overlapRate, baseline.overlapRate, false)}` +
    ` | ${f6(m.lateralSpeed)} | ${deltaStr(m.lateralSpeed, baseline.lateralSpeed, false)}` +
    ` | ${f4(m.stableOvt).padStart(9)} | ${deltaStr(m.stableOvt, baseline.stableOvt)}` +
    ` | ${allPass ? 'PASS' : 'FAIL'}`,
  );
}
console.log('');

// Per-track breakdown for the winner
const winner = phase2[0];
if (winner) {
  const { params: wp, metrics: wm } = winner;
  console.log(`Winner: BTE=${wp.bonusTransitionEnd.toFixed(2)} CS=${wp.corridorStart.toFixed(2)} CE=${wp.corridorEnd.toFixed(2)}`);
  console.log(`  Overall zone success: ${pct(wm.zoneSuccess, 2)} (baseline: ${pct(baseline.zoneSuccess, 2)}, delta: ${deltaStr(wm.zoneSuccess, baseline.zoneSuccess)})`);
  console.log('  Per-zone breakdown (across all tracks):');

  const allItems = wm.perTrack.flatMap((t) => t.zoneItems);
  const ZONE_NAMES = ['B1 (1–5)', 'B2 (6–15)', 'B3 (16–25)', 'B4 (26–40)', 'B5 (41+)'];
  for (let zi = 0; zi < 5; zi++) {
    const grp  = allItems.filter((i) => i.sollZone === zi);
    const hits = grp.filter((i) => zoneOf(i.finalRank) === zi).length;
    const rate = grp.length > 0 ? (hits / grp.length * 100).toFixed(1) + '%' : '—';
    console.log(`    ${ZONE_NAMES[zi].padEnd(12)}: ${String(hits).padStart(4)}/${String(grp.length).padStart(5)} = ${rate.padStart(6)}`);
  }
  console.log('');

  console.log('  Per-track zone success (winner):');
  for (let ti = 0; ti < SWEEP_TRACKS.length; ti++) {
    const trackItems = wm.perTrack[ti].zoneItems;
    const parts = [];
    for (let zi = 0; zi < 5; zi++) {
      const grp  = trackItems.filter((i) => i.sollZone === zi);
      const hits = grp.filter((i) => zoneOf(i.finalRank) === zi).length;
      parts.push(grp.length > 0 ? `B${zi + 1}=${(hits / grp.length * 100).toFixed(0)}%` : `B${zi + 1}=—`);
    }
    console.log(`    ${SWEEP_TRACKS[ti].name.padEnd(14)}: ${parts.join('  ')}`);
  }
  console.log('');

  console.log('=== RECOMMENDED NEW DEFAULTS ===');
  console.log(`  racePlanBonusTransitionEnd : ${wp.bonusTransitionEnd}   (was 0.67)`);
  console.log(`  racePlanCorridorStart      : ${wp.corridorStart}   (was 0.67)`);
  console.log(`  racePlanCorridorEnd        : ${wp.corridorEnd}   (was 0.95)`);
  console.log(`  racePlanBonusFadeDuration  : 1500  (unchanged)`);
}

if (phase2.length === 0) {
  console.log('No survivors passed Phase 1 cutoffs — no winner can be recommended.');
}
