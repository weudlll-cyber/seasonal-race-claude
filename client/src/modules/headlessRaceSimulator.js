// ============================================================
// File:        headlessRaceSimulator.js
// Path:        client/src/modules/headlessRaceSimulator.js
// Project:     RaceArena
// Description: Pure-JS headless race simulation for empirical distribution
//              measurement. No Canvas, no DOM, no React.
//              Replicates the core race loop from RaceScreen/index.jsx.
//
// Track parameters are hardcoded for dirt-oval (closed, 1280×720):
//   pathLengthPx ≈ 3245 (from server geometry data)
//   geometricTrackWidthPx ≈ 93 (median track width at runtime)
//   spriteSize = 40 (horse displaySize, no auto-scale applied)
//
// World positions for drafting: simplified circular approximation
//   radius = pathLengthPx / (2π), centered at (640, 360)
//   This is an approximation documented in the Phase-1 Decision Log.
// ============================================================

import {
  computeRacersPerRow,
  computeRowPhysicalY,
  computeSpeedBonus,
  computeBodyNarrowRef,
} from './rowLayout.js';
import { initRacerBehavior, applyRacerBehavior } from './raceBehavior.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const REFERENCE_FPS = 62.5; // 1000ms / 16ms, same as camera/lapUtils.js
const DT = 16; // fixed frame delta in ms (reference frame)
const FRAMES_PER_RACE = 250; // 4000ms / 16ms = 250 frames of RACING time

// Dirt-oval geometry constants (from server/data/tracks/dirt-oval.json)
export const DIRT_OVAL_PATH_LENGTH_PX = 3245;
export const DIRT_OVAL_TRACK_WIDTH_PX = 93;
const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;
const SPRITE_SIZE = 40; // horse displaySize without auto-scale

// ── Seeded row layout (replicates computeRowLayout with seeded shuffle) ───────
function computeRowLayoutSeeded(racerCount, racersPerRow, rng) {
  const perRow = Math.max(1, racersPerRow);
  const indices = Array.from({ length: racerCount }, (_, i) => i);
  // Fisher-Yates with seeded RNG
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const assignments = indices.map((racerIndex, position) => ({
    racerIndex,
    rowIndex: Math.floor(position / perRow),
    indexInRow: position % perRow,
  }));
  return { racersPerRow: perRow, totalRows: Math.ceil(racerCount / perRow), assignments };
}

// ── Seeded PRNG (Mulberry32) ───────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Speed calibration ──────────────────────────────────────────────────────────
// Replicates RaceScreen: lapsFromDuration(60)=2, N-calibrated base speed.
function calibrateBaseSpeed(nRacers, baseSpeedConfig, speedMultiplier = 1.0) {
  const { min, max } = baseSpeedConfig;
  const mean = (min + max) / 2;
  const finishT = 2; // lapsFromDuration(60) = 2 for a 60s dirt-oval race
  const targetDuration = finishT / (mean * REFERENCE_FPS);
  const spreadMinFactor = min / mean;
  const spreadMaxFactor = max / mean;
  const expectedMinSpreadFactor =
    spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1);
  // computeRaceBaseSpeed(finishT, targetDuration * expectedMinSpreadFactor * speedMultiplier)
  const calibratedDuration = targetDuration * expectedMinSpreadFactor * speedMultiplier;
  return calibratedDuration > 0 ? finishT / (REFERENCE_FPS * calibratedDuration) : 0;
}

// ── World position from t (circular approximation) ────────────────────────────
// Simplified oval: treats the track as a circle with circumference = pathLengthPx.
// Only needed for the drafting cone check in applyRacerBehavior.
function computeWorldPos(t, pathLengthPx) {
  const tNorm = ((t % 1) + 1) % 1; // normalize to [0, 1)
  const angle = 2 * Math.PI * tNorm;
  const r = pathLengthPx / (2 * Math.PI);
  const cx = WORLD_WIDTH / 2;
  const cy = WORLD_HEIGHT / 2;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
    angle: angle + Math.PI / 2, // tangent direction (counterclockwise travel)
  };
}

// ── Single race simulation ─────────────────────────────────────────────────────
/**
 * Simulate one race for FRAMES_PER_RACE frames and return the per-racer
 * neighbor counts at the end.
 *
 * @param {object} opts
 * @param {number}  opts.nRacers        - number of racers (e.g. 40)
 * @param {number}  opts.seed           - PRNG seed for reproducibility
 * @param {object}  opts.baseSpeedConfig  - { min, max }
 * @param {object}  opts.behaviorConfig   - DEFAULT_RACE_BEHAVIOR_CONFIG shape
 * @param {object}  opts.rowConfig        - DEFAULT_ROW_LAYOUT_CONFIG shape
 * @param {object}  opts.dynamicsConfig   - DEFAULT_RACE_DYNAMICS_CONFIG shape
 * @returns {{ neighborCounts: number[], racerTs: number[] }}
 */
export function simulateRace({
  nRacers,
  seed,
  baseSpeedConfig,
  behaviorConfig,
  rowConfig,
  dynamicsConfig,
  racerTypeConfig,
  autoScaleConfig,
}) {
  const rng = mulberry32(seed);
  const { min: BASE_SPEED_MIN, max: BASE_SPEED_MAX } = baseSpeedConfig;
  const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;

  const pathLengthPx = DIRT_OVAL_PATH_LENGTH_PX;
  const geometricTrackWidthPx = DIRT_OVAL_TRACK_WIDTH_PX;
  const spriteSize = SPRITE_SIZE;
  const race_baseSpeed = calibrateBaseSpeed(nRacers, baseSpeedConfig);

  // finishT = 2 laps, but since this is only a 4-second window, racers won't finish
  const finishT = 2;

  // Row layout (seeded shuffle for reproducibility)
  const effectiveWidth = geometricTrackWidthPx * behaviorConfig.startSpreadRange;

  // Browser-matched body dimensions — mirrors RaceScreen's auto-scale guard exactly.
  // computeBodyNarrowRef is called only when autoScaleConfig.enabled && !hasDisplaySizeOverride,
  // matching the if(autoScaleConfig.enabled)+if(!hasDisplaySizeOverride) guard in RaceScreen.
  // Bypass path: displaySizeScale=1 → drawnBodyWidthPx=displaySize (same as browser bypass).
  const W_REF = Math.min(285, effectiveWidth);
  const bodyFillNarrow = racerTypeConfig
    ? Math.min(racerTypeConfig.bodyFillX, racerTypeConfig.bodyFillY)
    : 0;
  const bodyFillLong = racerTypeConfig
    ? Math.max(racerTypeConfig.bodyFillX, racerTypeConfig.bodyFillY)
    : 0;

  let drawnBodyWidthPx;
  let drawnBodyLengthPx;
  if (racerTypeConfig && autoScaleConfig && bodyFillNarrow > 0) {
    const useAutoScale = autoScaleConfig.enabled && !racerTypeConfig.hasDisplaySizeOverride;
    const effectiveBodyNarrow = useAutoScale
      ? computeBodyNarrowRef(
          W_REF,
          nRacers,
          racerTypeConfig.displaySize,
          bodyFillNarrow,
          autoScaleConfig
        ).bodyNarrow
      : racerTypeConfig.displaySize;
    if (effectiveBodyNarrow > 0) {
      drawnBodyWidthPx = effectiveBodyNarrow;
      drawnBodyLengthPx = effectiveBodyNarrow * (bodyFillLong / bodyFillNarrow);
    }
  }

  if (seed === 1 && drawnBodyLengthPx !== undefined) {
    const brakeT =
      (drawnBodyLengthPx / pathLengthPx) * (behaviorConfig.speedBrakeTMultiplier ?? 1.5);
    console.warn(
      `[SimGeom] drawnBodyWidthPx=${drawnBodyWidthPx.toFixed(2)} drawnBodyLengthPx=${drawnBodyLengthPx.toFixed(2)} dynamicBrakeT≈${brakeT.toFixed(5)}`
    );
  }

  // Use the actual displaySize (not stale SPRITE_SIZE=40) so row count and gap
  // match the racer type's true nominal size — same source as the browser.
  const rowFrameSize = racerTypeConfig?.displaySize ?? spriteSize;
  const racersPerRow = computeRacersPerRow(effectiveWidth, rowFrameSize);
  const rowLayout = computeRowLayoutSeeded(nRacers, racersPerRow, rng);
  const rowGapPx = rowFrameSize * rowConfig.rowGapMultiplier;
  const deltaT_per_row = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;

  const rowSizeByRow = new Map();
  for (const a of rowLayout.assignments) {
    rowSizeByRow.set(a.rowIndex, (rowSizeByRow.get(a.rowIndex) ?? 0) + 1);
  }
  const assignmentByRacer = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a]));

  // Re-roll schedule
  const rollCount = Math.max(
    2,
    Math.floor(
      dynamicsConfig.reRollIntervalDivisor > 0 ? 60 / dynamicsConfig.reRollIntervalDivisor : 2
    )
  );
  const rollInterval = ((dynamicsConfig.reRollLastPositionPercent / 100) * 60 * 1000) / rollCount;

  // Initialize racers
  const racers = Array.from({ length: nRacers }, (_, i) => {
    const assignment = assignmentByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
    const rowSize = rowSizeByRow.get(assignment.rowIndex) ?? 1;
    const speedBonus = computeSpeedBonus(
      assignment.rowIndex,
      rowGapPx,
      pathLengthPx,
      rowConfig.speedBonusFactor,
      finishT,
      false,
      rowLayout.totalRows
    );
    // Closed track: tStart = -(rowIndex * deltaT_per_row)
    const tStart = -(assignment.rowIndex * deltaT_per_row);
    const spreadFactor =
      (BASE_SPEED_MIN + rng() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;
    const speedBonusMult = 1 + speedBonus;
    const rollJitter = (rng() - 0.5) * 2 * rollInterval * 0.2;

    const racer = {
      index: i,
      name: `r${i}`,
      t: tStart,
      finished: false,
      spreadFactor,
      spreadFactorPrev: spreadFactor,
      spreadFactorTarget: spreadFactor,
      speedBonusMult,
      baseSpeed: race_baseSpeed * spreadFactor * speedBonusMult,
      transitionStartTime: 0,
      transitionDuration: dynamicsConfig.reRollTransitionDuration * 1000,
      nextRollTime: rollInterval + rollJitter, // relative to raceStart ts=0
      runoutDecay: 1,
      // World position fields (updated each frame)
      x: 0,
      y: 0,
      angle: 0,
      // Behavior state
      avoidanceActive: false,
      draftingBoostActive: false,
      physicalY: 0,
      // Geometry fields needed by raceBehavior.js
      frameSizePx: spriteSize,
      drawnBodyWidthPx,
      drawnBodyLengthPx,
      trackWidthPx: geometricTrackWidthPx,
      pathLengthPx,
    };

    initRacerBehavior(racer);
    racer.physicalY = computeRowPhysicalY(
      assignment.indexInRow,
      rowSize,
      behaviorConfig.startSpreadRange
    );

    return racer;
  });

  // Speed Re-Roll: nextRollTime is already relative to ts=0 (simulated raceStart)
  // No conversion needed since we start at ts=0

  // ── Simulation loop (RACING phase only, ts=0..FRAMES_PER_RACE*DT) ──────────
  const spreadRange = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN;
  const halfWidth = spreadRange * (dynamicsConfig.reRollVariationPercent / 100);
  const targetDuration = 60; // seconds
  const lastRollDeadline = targetDuration * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);

  for (let frame = 0; frame < FRAMES_PER_RACE; frame++) {
    const ts = frame * DT;

    // Update world positions for drafting (circular approximation)
    for (const r of racers) {
      const wp = computeWorldPos(r.t, pathLengthPx);
      r.x = wp.x;
      r.y = wp.y;
      r.angle = wp.angle;
    }

    // Apply behavior (avoidance, free-lane, home force, drafting, etc.)
    // headlessRaceSimulator always uses Dirt Oval (closed track) — isOpen=false.
    applyRacerBehavior(racers, { ...behaviorConfig, isOpen: false });

    // Per-racer speed update + re-roll
    for (const r of racers) {
      if (!r.finished) {
        // Re-roll check
        if (ts >= r.nextRollTime && ts < lastRollDeadline) {
          const newTarget = Math.max(
            BASE_SPEED_MIN / BASE_SPEED_MEAN,
            Math.min(
              BASE_SPEED_MAX / BASE_SPEED_MEAN,
              r.spreadFactor + (rng() - 0.5) * 2 * halfWidth
            )
          );
          r.spreadFactorPrev = r.spreadFactor;
          r.spreadFactorTarget = newTarget;
          r.transitionStartTime = ts;
          const jOff = (rng() - 0.5) * 2 * rollInterval * 0.2;
          r.nextRollTime = ts + rollInterval + jOff;
        }
        // Smooth spreadFactor transition
        const elapsed = ts - r.transitionStartTime;
        if (elapsed < r.transitionDuration) {
          const tProg = elapsed / r.transitionDuration;
          const easedProg =
            tProg < 0.5 ? 4 * tProg * tProg * tProg : 1 - Math.pow(-2 * tProg + 2, 3) / 2;
          r.spreadFactor =
            r.spreadFactorPrev + (r.spreadFactorTarget - r.spreadFactorPrev) * easedProg;
          r.baseSpeed = race_baseSpeed * r.spreadFactor * r.speedBonusMult;
        }
      }

      const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
      const brake = r.avoidanceActive ? behaviorConfig.speedBrakeFactor : 1.0;
      if (!r.finished) {
        r.t = Math.min(r.t + r.baseSpeed * boost * brake * (DT / 16), finishT + 0.001);
      }
    }
  }

  // ── Measure neighbors after FRAMES_PER_RACE frames ────────────────────────
  const spriteLengthInT = (drawnBodyLengthPx ?? spriteSize) / pathLengthPx;
  const neighborCounts = racers.map((r) => {
    let count = 0;
    for (const other of racers) {
      if (other.index === r.index) continue;
      let dT = Math.abs(r.t - other.t);
      if (dT > 0.5) dT = 1 - dT; // shortest arc on closed track
      if (dT < spriteLengthInT) count++;
    }
    return count;
  });

  return {
    neighborCounts,
    racerTs: racers.map((r) => r.t),
    spriteLengthInT,
  };
}

// ── Aggregate statistics ───────────────────────────────────────────────────────
/**
 * Run nRuns races and compute aggregate statistics.
 * @param {number} nRuns
 * @param {object} raceConfig - same shape as simulateRace opts (minus seed)
 * @param {function} onProgress - called after each run with { run, total }
 * @returns {object} statistics
 */
export function runDistributionMeasurement(nRuns, raceConfig, onProgress) {
  const runResults = [];

  for (let run = 0; run < nRuns; run++) {
    const { neighborCounts } = simulateRace({ ...raceConfig, seed: run * 7919 + 1 });

    const maxNeighbors = Math.max(...neighborCounts);
    const meanNeighbors = neighborCounts.reduce((s, c) => s + c, 0) / neighborCounts.length;
    const countWithMany = neighborCounts.filter((c) => c > 5).length;
    const countWithNone = neighborCounts.filter((c) => c === 0).length;

    runResults.push({
      run,
      maxNeighbors,
      meanNeighbors,
      countWithMany,
      countWithNone,
      neighborCounts,
    });

    if (onProgress) onProgress({ run: run + 1, total: nRuns });
  }

  const maxArr = runResults.map((r) => r.maxNeighbors);
  const meanArr = runResults.map((r) => r.meanNeighbors);
  const withManyArr = runResults.map((r) => r.countWithMany);
  const withNoneArr = runResults.map((r) => r.countWithNone);

  const sortedMax = [...maxArr].sort((a, b) => a - b);

  function avg(arr) {
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }
  function median(sorted) {
    const m = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[m - 1] + sorted[m]) / 2 : sorted[m];
  }
  function percentile95(sorted) {
    const idx = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
  }
  function stddev(arr, mean) {
    const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
  }

  const maxMean = avg(maxArr);
  const maxMedian = median(sortedMax);
  const max95 = percentile95(sortedMax);
  const maxAbsolute = Math.max(...maxArr);
  const meanMean = avg(meanArr);
  const withManyMean = avg(withManyArr);
  const runsWithAnyMany = withManyArr.filter((c) => c > 0).length;
  const withNoneMean = avg(withNoneArr);
  const maxStddev = stddev(maxArr, maxMean);

  // Histogram of MAX_NACHBARN (0..maxAbsolute)
  const histogram = {};
  for (const v of maxArr) {
    histogram[v] = (histogram[v] ?? 0) + 1;
  }

  return {
    nRuns,
    nRacers: raceConfig.nRacers,
    framesPerRace: FRAMES_PER_RACE,
    spriteLengthInT: SPRITE_SIZE / DIRT_OVAL_PATH_LENGTH_PX,
    maxNeighbors: {
      mean: maxMean,
      median: maxMedian,
      p95: max95,
      max: maxAbsolute,
      stddev: maxStddev,
    },
    meanNeighbors: { mean: meanMean, min: Math.min(...meanArr), max: Math.max(...meanArr) },
    withMany: { mean: withManyMean, runsWithAny: runsWithAnyMany },
    withNone: { mean: withNoneMean },
    histogram,
    runResults,
  };
}
