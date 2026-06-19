// ============================================================
// File:        headlessRaceSimulator.js
// Path:        client/src/modules/headlessRaceSimulator.js
// Project:     RaceArena
// Description: Pure-JS headless race simulation for empirical distribution
//              measurement. No Canvas, no DOM, no React.
//              Replicates the core race loop from RaceScreen/index.jsx.
//
// Track parameters default to dirt-oval (closed, 1280×720) when trackConfig is omitted:
//   pathLengthPx = 3245, trackWidthPx = 93, raceDurationSeconds = 60
// Pass trackConfig = { pathLengthPx, trackWidthPx, raceDurationSeconds } for other closed tracks.
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
import { computeRaceBaseSpeed } from './raceBaseSpeed.js';
import { computeClosedTrackSsf, lapsFromDuration } from './camera/lapUtils.js';
import { resolveZones, zoneMultAt } from './raceZones.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const DT = 16; // fixed frame delta in ms (reference frame)
const FRAMES_PER_RACE = 250; // 4000ms / 16ms = 250 frames of RACING time
const RACE_DURATION_SECONDS = 60; // Dirt Oval target race duration — must match game's 60 s calibration

/** Convert a RACING duration in seconds to the equivalent frame count. */
export const secondsToFrames = (seconds) => Math.round((seconds * 1000) / DT);

// Dirt-oval geometry constants (from server/data/tracks/dirt-oval.json)
export const DIRT_OVAL_PATH_LENGTH_PX = 3245;
const DIRT_OVAL_TRACK_WIDTH_PX = 93;
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

// ── Neighbor counting ─────────────────────────────────────────────────────────
/**
 * Count neighbors within threshold t-distance for each racer.
 * Uses shortest-arc distance on a closed track (wraps at 1.0).
 * A racer does not count itself. Threshold comparison is strict less-than.
 *
 * @param {number[]} racerTs   - t-positions of all racers
 * @param {number}   threshold - racer at |Δt| < threshold counts as a neighbor
 * @returns {number[]} neighbor count per racer, same order as racerTs
 */
export function countNeighbors(racerTs, threshold) {
  return racerTs.map((t, i) => {
    let count = 0;
    for (let j = 0; j < racerTs.length; j++) {
      if (j === i) continue;
      let dT = Math.abs(t - racerTs[j]);
      if (dT > 0.5) dT = 1 - dT; // shortest arc on closed track
      if (dT < threshold) count++;
    }
    return count;
  });
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
  framesPerRace = FRAMES_PER_RACE,
  trackConfig = null,
  zoneConfig = null,
}) {
  const rng = mulberry32(seed);
  const { min: BASE_SPEED_MIN, max: BASE_SPEED_MAX } = baseSpeedConfig;
  const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;

  const raceDurationSeconds = trackConfig?.raceDurationSeconds ?? RACE_DURATION_SECONDS;
  const pathLengthPx = trackConfig?.pathLengthPx ?? DIRT_OVAL_PATH_LENGTH_PX;
  const geometricTrackWidthPx = trackConfig?.trackWidthPx ?? DIRT_OVAL_TRACK_WIDTH_PX;
  const spriteSize = SPRITE_SIZE;
  const finishT = lapsFromDuration(raceDurationSeconds);
  // N-calibrated base speed — same path as RaceScreen/index.jsx.
  // closedSsf normalizes for Dirt Oval path length (3245/3200 ≈ 1.014).
  const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
  const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
  const ems = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1);
  const closedSsf = computeClosedTrackSsf(pathLengthPx);
  const race_baseSpeed = computeRaceBaseSpeed(finishT, raceDurationSeconds * ems * closedSsf);
  const zones = resolveZones(zoneConfig ?? { enabled: false });

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
      dynamicsConfig.reRollIntervalDivisor > 0
        ? raceDurationSeconds / dynamicsConfig.reRollIntervalDivisor
        : 2
    )
  );
  const rollInterval =
    ((dynamicsConfig.reRollLastPositionPercent / 100) * raceDurationSeconds * 1000) / rollCount;

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
  const targetDuration = raceDurationSeconds;
  const lastRollDeadline = targetDuration * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);

  for (let frame = 0; frame < framesPerRace; frame++) {
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
      // Zone mult: closed-track only in sim (headlessRaceSimulator always uses closed tracks).
      const zt = ((r.t % 1) + 1) % 1;
      const zoneMult = zoneMultAt(zt, zones);
      if (!r.finished) {
        r.t = Math.min(r.t + r.baseSpeed * boost * brake * (DT / 16) * zoneMult, finishT + 0.001);
      }
    }
  }

  // ── Measure neighbors after FRAMES_PER_RACE frames ────────────────────────
  const spriteLengthInT = (drawnBodyLengthPx ?? spriteSize) / pathLengthPx;
  const neighborCounts = countNeighbors(
    racers.map((r) => r.t),
    spriteLengthInT
  );

  return {
    neighborCounts,
    racerTs: racers.map((r) => r.t),
    spriteLengthInT,
  };
}
