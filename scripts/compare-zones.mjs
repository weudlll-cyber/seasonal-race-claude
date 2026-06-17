// ============================================================
// File:        compare-zones.mjs
// Path:        scripts/compare-zones.mjs
// Project:     RaceArena
// Created:     2026-05-31
// Description: Zone success rate comparison — Set A vs Set B lateral params,
//              100 races × 3 tracks × 5 zones (B1–B5), seed=42.
// ============================================================

// Zone success rate: Set A (lateralDamping=0.25, lateralForce=0.012) vs
//                   Set B (lateralDamping=0.45, lateralForce=0.010)
// 100 races × 3 tracks × 5 zones (B1–B5), seed=42
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

import {
  runSingleRace, computeZoneSuccessRate, computeFinishT, RACER_CONFIGS,
} from './sim-fairness.mjs';
import { EditorShape }                                   from '../client/src/modules/track-editor/EditorShape.js';
import { computeRacerLayout, computeEvenRowLayout }      from '../client/src/modules/rowLayout.js';
import { computeSpeedScaleFactor }                       from '../client/src/modules/camera/lapUtils.js';
import { DEFAULT_BASE_SPEED_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG } from '../client/src/modules/storage/defaults.js';
import { DEFAULT_AUTO_SCALE_CONFIG }                     from '../client/src/modules/autoSpriteScale.js';
import { createRacePlan, createTrajectoryController }    from '../client/src/modules/racePlanner.js';

const RACES       = 100;
const DURATION_S  = 60;
const GLOBAL_SEED = 42;
const BONUS       = 2.0;

const TRACK_SPECS = [
  { trackId: 'space-sprint', racerType: 'rocket', nRacers: 50, label: 'Space Sprint' },
  { trackId: 'luger-hill', racerType: 'luge',   nRacers: 50, label: 'Luger Hill'  },
  { trackId: 'dirt-oval',    racerType: 'horse',  nRacers: 40, label: 'Dirt Oval'   },
];

// Master baseline shared params (same for both sets)
const SHARED = {
  homeForceStrength:         0.040,
  homeForceReductionOnOverlap: 0.300,
  avoidanceDistance:         0.150,
  speedBrakeFactor:          0.950,
  speedBrakeTThreshold:      0.015,
  speedBrakeYThreshold:      0.200,
};

const SET_A = { ...SHARED, lateralDamping: 0.25,  lateralForce: 0.012 }; // current
const SET_B = { ...SHARED, lateralDamping: 0.45,  lateralForce: 0.010 }; // master baseline

function loadTracks() {
  const dir = join(ROOT, 'server/seeds/tracks');
  return TRACK_SPECS.map(spec => {
    const track  = JSON.parse(readFileSync(join(dir, `${spec.trackId}.json`), 'utf8'));
    const shape  = new EditorShape(track);
    const isOpen = !!shape.isOpen;
    const pathLengthPx        = track.pathLengthPx ?? shape.getTotalLength();
    const geometricTrackWidth = track.width ?? shape.getActualTrackWidth();

    const BS     = DEFAULT_BASE_SPEED_CONFIG;
    const BSMean = (BS.min + BS.max) / 2;
    const sfMin  = BS.min / BSMean;
    const sfMax  = BS.max / BSMean;
    const expMinSF      = sfMin + (sfMax - sfMin) / (spec.nRacers + 1);
    const raceBaseSpeed = BSMean / expMinSF;

    const trackSsf  = isOpen ? computeSpeedScaleFactor(pathLengthPx) : 1;
    const naturalBase = isOpen ? BSMean / trackSsf : raceBaseSpeed;
    const { speedMultiplier, displaySize } = RACER_CONFIGS[spec.racerType];
    const finishT = computeFinishT(naturalBase, speedMultiplier, DURATION_S, isOpen);

    const bCfg   = DEFAULT_RACE_BEHAVIOR_CONFIG;
    const effWidth = geometricTrackWidth * bCfg.startSpreadRange;
    const layout   = computeRacerLayout(effWidth, spec.nRacers, displaySize, DEFAULT_AUTO_SCALE_CONFIG);
    const comboRowLayout = computeEvenRowLayout(spec.nRacers, layout.rowCount);

    return {
      ...spec, shape, isOpen, pathLengthPx, geometricTrackWidth,
      speedMultiplier, displaySize, finishT,
      totalRows: layout.rowCount, rowSizes: layout.layout, comboRowLayout,
    };
  });
}

function runSet(setParams, tracks) {
  return tracks.map(track => {
    process.stdout.write(`  ${track.label}...`);
    const raceEntries = [];

    for (let r = 0; r < RACES; r++) {
      const seed = (GLOBAL_SEED - 1) * RACES + r + 1;
      const planRacers = track.comboRowLayout.assignments.map(a => ({
        index: a.racerIndex, startRowIndex: a.rowIndex,
      }));
      const plan = createRacePlan(
        planRacers, track.finishT, DURATION_S * 1000,
        { bonusStrengthMultiplier: BONUS }, seed,
      );
      const racePlanController = createTrajectoryController(plan);

      const result = runSingleRace({
        shape: track.shape,
        pathLengthPx: track.pathLengthPx,
        geometricTrackWidth: track.geometricTrackWidth,
        isOpen: track.isOpen,
        speedMultiplier: track.speedMultiplier,
        displaySize: track.displaySize,
        finishT: track.finishT,
        targetSeconds: DURATION_S,
        seed,
        nRacers: track.nRacers,
        behaviorConfigOverrides: setParams,
        racePlanController,
      });

      raceEntries.push({ result, targetRankMap: plan._racerTargetRank });
    }

    const zsr = computeZoneSuccessRate(raceEntries);
    process.stdout.write(' done\n');
    return { label: track.label, nRacers: track.nRacers, zsr };
  });
}

// ── Run ───────────────────────────────────────────────────────────────────────
const tracks = loadTracks();

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  Zone success rate: Set A vs Set B');
console.log(`  ${RACES} races × ${tracks.length} tracks | seed=${GLOBAL_SEED}`);
console.log('══════════════════════════════════════════════════════════════\n');
console.log('Set A: lateralDamping=0.25  lateralForce=0.012  (current)');
console.log('Set B: lateralDamping=0.45  lateralForce=0.010  (master baseline)');
console.log();

console.log('Running Set A...');
const resA = runSet(SET_A, tracks);

console.log('Running Set B...');
const resB = runSet(SET_B, tracks);

// ── Output ────────────────────────────────────────────────────────────────────
const ZONE_LABELS = [
  { zone: 'B1', ranks: '1–5',   bonus: '+6%' },
  { zone: 'B2', ranks: '6–15',  bonus: '+4%' },
  { zone: 'B3', ranks: '16–25', bonus: '+2%' },
  { zone: 'B4', ranks: '26–40', bonus: '±0%' },
  { zone: 'B5', ranks: '41+',   bonus: '−2%' },
];

const pct = (r) => r?.rate != null ? (r.rate * 100).toFixed(1) + '%' : '—';

console.log();
for (let i = 0; i < tracks.length; i++) {
  const A = resA[i].zsr;
  const B = resB[i].zsr;
  const nRacers = tracks[i].nRacers;

  const W = 66;
  console.log(`┌${'─'.repeat(W)}┐`);
  const trackTitle = `Track: ${tracks[i].label}  (${nRacers} racers)`;
  console.log(`│  ${trackTitle.padEnd(W - 2)}│`);
  console.log(`├${'─'.repeat(6)}┬${'─'.repeat(8)}┬${'─'.repeat(6)}┬${'─'.repeat(21)}┬${'─'.repeat(21)}┤`);
  console.log(`│ Zone │ Ranks  │ Bonus│ Set A (current)     │ Set B (baseline)    │`);
  console.log(`├${'─'.repeat(6)}┼${'─'.repeat(8)}┼${'─'.repeat(6)}┼${'─'.repeat(21)}┼${'─'.repeat(21)}┤`);

  for (let z = 0; z < ZONE_LABELS.length; z++) {
    const { zone, ranks, bonus } = ZONE_LABELS[z];
    const za = A.zones[z];
    const zb = B.zones[z];
    const rateA = za.total > 0 ? pct(za) : '  —  ';
    const rateB = zb.total > 0 ? pct(zb) : '  —  ';
    const cellA = `${rateA.padStart(6)} (${za.hits}/${za.total})`.padEnd(21);
    const cellB = `${rateB.padStart(6)} (${zb.hits}/${zb.total})`.padEnd(21);
    console.log(`│ ${zone.padEnd(4)} │ ${ranks.padEnd(6)} │ ${bonus.padEnd(4)} │ ${cellA}│ ${cellB}│`);
  }

  console.log(`├${'─'.repeat(6)}┴${'─'.repeat(8)}┴${'─'.repeat(6)}┼${'─'.repeat(21)}┼${'─'.repeat(21)}┤`);
  const oA = `${pct(A.overall).padStart(6)} (${A.overall.hits}/${A.overall.total})`.padEnd(21);
  const oB = `${pct(B.overall).padStart(6)} (${B.overall.hits}/${B.overall.total})`.padEnd(21);
  console.log(`│ Overall                       │ ${oA}│ ${oB}│`);
  console.log(`└${'─'.repeat(22)}────────────────┴${'─'.repeat(21)}┴${'─'.repeat(21)}┘`);
  console.log();
}

// Cross-track zone summary (averaged)
console.log('══════════════════════════════════════════════════════════════');
console.log('  Average across all tracks');
console.log('══════════════════════════════════════════════════════════════');
console.log(`${'Zone'.padEnd(4)}  ${'Ranks'.padEnd(7)}  ${'Bonus'.padEnd(4)}  ${'Set A %'.padStart(8)}  ${'Set B %'.padStart(8)}  ${'Δ'.padStart(8)}`);
console.log('─'.repeat(52));
for (let z = 0; z < ZONE_LABELS.length; z++) {
  const { zone, ranks, bonus } = ZONE_LABELS[z];
  const ratesA = resA.map(t => t.zsr.zones[z]).filter(z => z.total > 0);
  const ratesB = resB.map(t => t.zsr.zones[z]).filter(z => z.total > 0);
  if (ratesA.length === 0) continue;
  const avgA = ratesA.reduce((s, z) => s + z.rate, 0) / ratesA.length;
  const avgB = ratesB.reduce((s, z) => s + z.rate, 0) / ratesB.length;
  const delta = avgA - avgB;
  const sign  = delta >= 0 ? '+' : '';
  console.log(`${zone.padEnd(4)}  ${ranks.padEnd(7)}  ${bonus.padEnd(4)}  ${(avgA * 100).toFixed(1).padStart(7)}%  ${(avgB * 100).toFixed(1).padStart(7)}%  ${(sign + (delta * 100).toFixed(1)).padStart(7)}pp`);
}
const oA = resA.reduce((s, t) => s + t.zsr.overall.rate, 0) / resA.length;
const oB = resB.reduce((s, t) => s + t.zsr.overall.rate, 0) / resB.length;
const od = oA - oB;
console.log('─'.repeat(52));
console.log(`${'All'.padEnd(4)}  ${'1+'.padEnd(7)}  ${'mix'.padEnd(4)}  ${(oA * 100).toFixed(1).padStart(7)}%  ${(oB * 100).toFixed(1).padStart(7)}%  ${((od >= 0 ? '+' : '') + (od * 100).toFixed(1)).padStart(7)}pp`);
