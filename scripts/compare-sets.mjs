// Comparison: Master baseline vs Sweep winner — 100 races per set, seed=42
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

import {
  runSingleRace, computeFairnessStats, computeFinishT, RACER_CONFIGS,
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

const SET_A = {  // Master baseline
  lateralForce: 0.010, lateralDamping: 0.45, homeForceStrength: 0.040,
  homeForceReductionOnOverlap: 0.300, avoidanceDistance: 0.150,
  speedBrakeFactor: 0.950, speedBrakeTThreshold: 0.015, speedBrakeYThreshold: 0.200,
};
const SET_B = {  // Sweep winner
  lateralForce: 0.0175, lateralDamping: 0.3906, homeForceStrength: 0.0202,
  homeForceReductionOnOverlap: 0.2243, avoidanceDistance: 0.0398,
  speedBrakeFactor: 0.8733, speedBrakeTThreshold: 0.0005, speedBrakeYThreshold: 0.1123,
};

function loadTracks() {
  const dir = join(ROOT, 'server/data/tracks');
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
    const expMinSF    = sfMin + (sfMax - sfMin) / (spec.nRacers + 1);
    const raceBaseSpeed = BSMean / expMinSF;

    const trackSsf  = isOpen ? computeSpeedScaleFactor(pathLengthPx) : 1;
    const naturalBase = isOpen ? BSMean / trackSsf : raceBaseSpeed;
    const { speedMultiplier, displaySize } = RACER_CONFIGS[spec.racerType];
    const finishT = computeFinishT(naturalBase, speedMultiplier, DURATION_S, isOpen);

    const bCfg   = DEFAULT_RACE_BEHAVIOR_CONFIG;
    const effWidth = geometricTrackWidth * bCfg.startSpreadRange;
    const layout   = computeRacerLayout(effWidth, spec.nRacers, displaySize, DEFAULT_AUTO_SCALE_CONFIG);
    const totalRows  = layout.rowCount;
    const rowSizes   = layout.layout;
    const comboRowLayout = computeEvenRowLayout(spec.nRacers, totalRows);

    return { ...spec, shape, isOpen, pathLengthPx, geometricTrackWidth, speedMultiplier, displaySize, finishT, totalRows, rowSizes, comboRowLayout };
  });
}

const BEREICH_BOUNDS = [[1,5],[6,15],[16,25],[26,40],[41,Infinity]];
function sollBereichOf(rank) {
  if (rank <= 5)  return 1;
  if (rank <= 15) return 2;
  if (rank <= 25) return 3;
  if (rank <= 40) return 4;
  return 5;
}

function runSet(setParams, tracks) {
  const results = [];
  for (const track of tracks) {
    process.stdout.write(`  ${track.label}...`);

    const raceResults = [];
    let totalRPSHits = 0, totalRacerSlots = 0;

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
      raceResults.push(result);

      // racePlanSuccessRate
      if (plan._racerTargetRank?.size > 0) {
        for (const racer of result) {
          const targetRank = plan._racerTargetRank.get(racer.racerIndex);
          if (targetRank == null) continue;
          const bereich = sollBereichOf(targetRank);
          const [lo, hi] = BEREICH_BOUNDS[bereich - 1];
          totalRacerSlots++;
          if (racer.finalRank >= lo && racer.finalRank <= hi) totalRPSHits++;
        }
      }
    }

    const avg = fn => raceResults.reduce((s, r) => s + (fn(r) ?? 0), 0) / RACES;
    const fairness = computeFairnessStats(raceResults, track.totalRows, track.rowSizes);

    results.push({
      label:   track.label,
      rps:     totalRacerSlots > 0 ? (totalRPSHits / totalRacerSlots * 100).toFixed(1) : 'N/A',
      zigzag:  avg(r => r.liteZigzagScore).toFixed(5),
      latSpd:  avg(r => r.liteLatSpeedScore).toFixed(5),
      brake:   (avg(r => r.liteBrakeRate) * 100).toFixed(1),
      stable:  avg(r => r.liteStableOvertakes).toFixed(3),
      overlap: (avg(r => r.liteOverlapRate) * 100).toFixed(1),
      pValue:  fairness.pValue != null ? fairness.pValue.toFixed(3) : 'N/A',
    });
    console.log(' done');
  }
  return results;
}

const tracks = loadTracks();

console.log('\nSet A — Master baseline:');
const resA = runSet(SET_A, tracks);

console.log('\nSet B — Sweep winner:');
const resB = runSet(SET_B, tracks);

// Per-track table
const METRICS = [
  ['racePlanSuccessRate %', 'rps'],
  ['zigzagScore',           'zigzag'],
  ['lateralSpeedScore',     'latSpd'],
  ['brakeRate %',           'brake'],
  ['stableOvertakes',       'stable'],
  ['overlapRate %',         'overlap'],
  ['fairness p-value',      'pValue'],
];

console.log('\n');
for (let i = 0; i < tracks.length; i++) {
  const W = 58;
  console.log(`\n┌${'─'.repeat(W)}┐`);
  console.log(`│  Track: ${tracks[i].label.padEnd(W - 9)}│`);
  console.log(`├${'─'.repeat(26)}┬${'─'.repeat(15)}┬${'─'.repeat(15)}┤`);
  console.log(`│ ${'Metric'.padEnd(25)}│ ${'Master baseline'.padEnd(14)}│ ${'Sweep winner'.padEnd(14)}│`);
  console.log(`├${'─'.repeat(26)}┼${'─'.repeat(15)}┼${'─'.repeat(15)}┤`);
  for (const [name, key] of METRICS) {
    const a = resA[i][key];
    const b = resB[i][key];
    console.log(`│ ${name.padEnd(25)}│ ${String(a).padEnd(14)}│ ${String(b).padEnd(14)}│`);
  }
  console.log(`└${'─'.repeat(26)}┴${'─'.repeat(15)}┴${'─'.repeat(15)}┘`);
}
