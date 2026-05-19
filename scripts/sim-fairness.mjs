// ============================================================
// File:        sim-fairness.mjs
// Path:        scripts/sim-fairness.mjs
// Project:     RaceArena
// Created:     2026-05-17
// Description: Headless fairness simulation — tests whether start-row
//              position affects win probability across all tracks and
//              racer types, with speedBonusMult (catch-up) fully active.
//
//              Key design choices:
//              - baseSpeed uses the N-calibrated natural formula identical
//                to the browser race engine (BASE_SPEED_MEAN / expectedMinSF)
//              - finishT is SHIFTED (not speed) to create 30s / 120s races:
//                  finishT = naturalSpeed × REFERENCE_FPS × targetSeconds
//                This keeps speedBonusMult meaningful and comparable across
//                racer types and durations.
//              - speedBonusMult is always applied (that's what we're testing).
//              - No PNG output, no camera, no rendering — pure physics.
//
// Usage:
//   node scripts/sim-fairness.mjs [--races=50] [--racers=40]
//                                  [--out=client/tmp]
//
// Output:
//   <out>/fairness-data.json   — machine-readable raw data
//   <out>/fairness-report.md   — human-readable Markdown report
// ============================================================

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const ROOT = join(__dir, '..');

// ── CLI args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function argVal(key, def) {
  const m = argv.find((a) => a.startsWith(`--${key}=`));
  return m ? m.slice(key.length + 3) : def;
}
const N_RACES       = Number(argVal('races', '50'));
const N_RACERS      = Number(argVal('racers', '40'));
const OUT_DIR       = join(ROOT, argVal('out', 'client/tmp'));
const TRACK_FILTER  = argVal('track', null);   // e.g. --track=river-run
const RACER_FILTER  = argVal('racer', null);   // e.g. --racer=horse
const DUR_FILTER    = argVal('dur', null);     // e.g. --dur=30

// ── Phase-3A: global seed + Race Plan activation ──────────────────────────────
// --seed=<n>  n>0: deterministic batch (race i uses seed (n-1)*N_RACES+i+1)
//             n=0 (default): non-deterministic (Math.random()), exploration only
// --race-plan=true|false  (default false): activate Race Plan controller
const GLOBAL_SEED      = Number(argVal('seed', '0'));
const RACE_PLAN_ACTIVE = argVal('race-plan', 'false') === 'true';

// ── Phase-2K: TEF (tStart-Equalization-Feedback) overrides ───────────────────
const TEF_ACTIVE             = argVal('tefActive', null) === 'true';
const TEF_ALPHA              = Number(argVal('tefAlpha', '0.03'));
const TEF_MAX_GAP            = Number(argVal('tefMaxGap', '0.015'));
const TEF_OPEN_ONLY          = argVal('tefIsOpenOnly', 'true') !== 'false';
// v3: aggressive base bonus override for rear rows; TEF modulates it toward 1.0 as gap closes
const TEF_BASE_BONUS_OVERRIDE = argVal('tefBaseBonusOverride', null);
const TEF_BASE_BONUS          = TEF_BASE_BONUS_OVERRIDE !== null ? Number(TEF_BASE_BONUS_OVERRIDE) : null;

// ── Phase-2K v4: threshold-based bonus with smooth re-roll-style transitions ──
const V4_ACTIVE        = argVal('v4ThresholdActive', null) === 'true';
const V4_INITIAL_BOOST = Number(argVal('v4InitialBoost', '1.20'));
// Overtake-fraction thresholds (percent) at which bonus steps down
const V4_THRESHOLDS    = argVal('v4Thresholds', '20,40,60,80').split(',').map(Number);
// speedBonusMult value active in each band (length = V4_THRESHOLDS.length + 1)
const V4_BOOST_SCHEDULE = argVal('v4BoostSchedule', '1.20,1.15,1.10,1.05,1.0').split(',').map(Number);
// 'physical_overtake': require lateral proximity before t-crossing counts as overtake
// 'legacy': original t_value_compare (lax — for reference only)
const V4_METRIC_TYPE       = argVal('v4MetricType', 'physical_overtake');
const V4_LATERAL_PROXIMITY = Number(argVal('v4LateralProximity', '0.3'));
// Row-differentiated thresholds (per_racer mode); fall back to V4_THRESHOLDS if not specified
// v4RowRestThresholds applies to Row 2 and all deeper rows; v4Row2Thresholds is a legacy alias.
const V4_ROW1_THRESHOLDS_RAW    = argVal('v4Row1Thresholds', null);
const V4_ROW_REST_THRESHOLDS_RAW = argVal('v4RowRestThresholds', null) ?? argVal('v4Row2Thresholds', null);
const V4_ROW1_THRESHOLDS  = V4_ROW1_THRESHOLDS_RAW    ? V4_ROW1_THRESHOLDS_RAW.split(',').map(Number)    : V4_THRESHOLDS;
const V4_ROW2_THRESHOLDS  = V4_ROW_REST_THRESHOLDS_RAW ? V4_ROW_REST_THRESHOLDS_RAW.split(',').map(Number) : V4_THRESHOLDS;

// ── Phase-2L: behaviorConfig overrides via CLI ────────────────────────────────
const WARMUP_MS_RAW      = argVal('avoidanceWarmupMs', null);
const WARMUP_MS_OVERRIDE = WARMUP_MS_RAW !== null ? Number(WARMUP_MS_RAW) : null;

// ── Phase-2K v4: diagnostic snapshot mode ────────────────────────────────────
const DIAG_MODE         = argVal('diagnosticMode', null) === 'true';
const DIAG_SNAP_TIMES_S = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 2.0, 5.0];

// ── Game modules (same code the browser uses) ─────────────────────────────────
import { EditorShape } from '../client/src/modules/track-editor/EditorShape.js';
import { applyRacerBehavior, initRacerBehavior } from '../client/src/modules/raceBehavior.js';
import {
  computeRowLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
  computeRacersPerRow,
} from '../client/src/modules/rowLayout.js';
import { REFERENCE_FPS } from '../client/src/modules/camera/lapUtils.js';
import {
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
} from '../client/src/modules/storage/defaults.js';
import { computeEffectiveBrakeFactor } from '../client/src/modules/raceBehaviorConfig.js';
import { createRacePlan, createTrajectoryController } from '../client/src/modules/racePlanner.js';

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────
export function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Speed transition easing (mirrors index.jsx) ───────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Racer type configs ────────────────────────────────────────────────────────
// speedMultiplier and displaySize sourced from the respective *RacerType.js files.
// displaySize affects racersPerRow (track capacity) and avoidance pixel distances.
// surfaceClasses mirrors each *RacerType.js — used to filter racers by track surface.
export const RACER_CONFIGS = {
  horse:     { speedMultiplier: 1.00, displaySize: 40, surfaceClasses: ['sand', 'earth', 'grass', 'asphalt', 'snow', 'mud'] },
  duck:      { speedMultiplier: 0.85, displaySize: 36, surfaceClasses: ['water', 'grass'] },
  snail:     { speedMultiplier: 0.30, displaySize: 35, surfaceClasses: ['grass'] },
  elephant:  { speedMultiplier: 0.60, displaySize: 44, surfaceClasses: ['sand', 'earth', 'grass'] },
  giraffe:   { speedMultiplier: 0.90, displaySize: 48, surfaceClasses: ['sand', 'earth', 'grass'] },
  snake:     { speedMultiplier: 0.75, displaySize: 36, surfaceClasses: ['sand', 'earth', 'grass'] },
  dragon:    { speedMultiplier: 1.10, displaySize: 50, surfaceClasses: ['air', 'asphalt', 'earth', 'water'] },
  f1:        { speedMultiplier: 1.20, displaySize: 38, surfaceClasses: ['asphalt'] },
  rocket:    { speedMultiplier: 1.25, displaySize: 40, surfaceClasses: ['air', 'water'] },
  buggy:     { speedMultiplier: 0.95, displaySize: 38, surfaceClasses: ['sand', 'earth', 'mud'] },
  motorbike: { speedMultiplier: 1.05, displaySize: 36, surfaceClasses: ['asphalt', 'earth'] },
  plane:     { speedMultiplier: 1.15, displaySize: 42, surfaceClasses: ['air'] },
};

// ── Duration variants (seconds) ───────────────────────────────────────────────
// --dur overrides to a single arbitrary duration (enables e.g. --dur=60 / --dur=90)
export const DURATION_VARIANTS = DUR_FILTER ? [Number(DUR_FILTER)] : [30, 120];

// ── Compute adjusted finishT ──────────────────────────────────────────────────
/**
 * Returns the finishT (t-space target) for a race of targetSeconds duration.
 * baseSpeed stays at the natural N-calibrated value; only the finish line moves.
 *
 * For open tracks finishT is capped at (1 - runoutZone) since the track
 * has a physical end. The effective race will then be shorter than targetSeconds
 * for fast types on short open tracks — still valid, just recorded as-is.
 *
 * @param {number} naturalBaseSpeed  race_baseSpeed (N-calibrated, before speedMultiplier)
 * @param {number} speedMultiplier   racer-type factor
 * @param {number} targetSeconds
 * @param {boolean} isOpen
 * @param {number} [runoutZone=0.05]
 * @returns {number}
 */
export function computeFinishT(naturalBaseSpeed, speedMultiplier, targetSeconds, isOpen, runoutZone = 0.05) {
  const ft = naturalBaseSpeed * speedMultiplier * REFERENCE_FPS * targetSeconds;
  return isOpen ? Math.min(ft, 1.0 - runoutZone) : ft;
}

// ── Single race simulation ────────────────────────────────────────────────────
/**
 * Run one deterministic race and return per-racer results.
 *
 * @param {object} p
 * @param {object}  p.shape                EditorShape instance (or compatible mock)
 * @param {number}  p.pathLengthPx
 * @param {number}  p.geometricTrackWidth  inner→outer width in world pixels
 * @param {boolean} p.isOpen
 * @param {number}  p.speedMultiplier      racer-type factor
 * @param {number}  p.displaySize          sprite size in world pixels
 * @param {number}  p.finishT              adjusted finish line in t-space
 * @param {number}  p.targetSeconds        used for re-roll scheduling
 * @param {number}  p.seed                 PRNG seed
 * @param {number}  p.nRacers
 * @returns {Array<{racerIndex,startRowIndex,indexInRow,finalT,finalRank,finishTime}>}
 */
export function runSingleRace({
  shape,
  pathLengthPx,
  geometricTrackWidth,
  isOpen,
  speedMultiplier,
  displaySize,
  finishT,
  targetSeconds,
  seed,
  nRacers,
  diagnosticMode = false,
  behaviorConfigOverrides = {},
  racePlanController = null,   // Phase-3A: TrajectoryController instance or null
}) {
  const savedRandom = Math.random;
  if (seed > 0) Math.random = makePRNG(seed);

  try {
    const BASE_SPEED_MIN  = DEFAULT_BASE_SPEED_CONFIG.min;
    const BASE_SPEED_MAX  = DEFAULT_BASE_SPEED_CONFIG.max;
    const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;
    const behaviorConfig  = { ...DEFAULT_RACE_BEHAVIOR_CONFIG, ...behaviorConfigOverrides };
    const rowConfig       = { ...DEFAULT_ROW_LAYOUT_CONFIG };
    const dynamicsConfig  = { ...DEFAULT_RACE_DYNAMICS_CONFIG };

    // N-calibrated base speed — mirrors index.jsx computeRaceBaseSpeed formula.
    // Open tracks: speed derived from finishT/targetSeconds so physical race lasts exactly
    // targetSeconds; re-roll schedule (keyed to targetSeconds) then fires the correct count.
    // Closed tracks: natural formula kept unchanged (finishT already encodes targetSeconds).
    const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
    const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
    const expectedMinSF   = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1);
    const race_baseSpeed  = isOpen
      ? finishT / (REFERENCE_FPS * targetSeconds * expectedMinSF * speedMultiplier)
      : BASE_SPEED_MEAN / expectedMinSF;

    // Row layout
    const rowGapPx       = displaySize * rowConfig.rowGapMultiplier;
    const deltaT         = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;
    const effectiveWidth = geometricTrackWidth * behaviorConfig.startSpreadRange;
    const racersPerRow   = computeRacersPerRow(effectiveWidth, displaySize);
    const rowLayout      = computeRowLayout(nRacers, racersPerRow);

    const rowSizeByRow = new Map();
    for (const a of rowLayout.assignments) {
      rowSizeByRow.set(a.rowIndex, (rowSizeByRow.get(a.rowIndex) ?? 0) + 1);
    }
    const assignmentByRacer = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a]));

    // Re-roll schedule keyed to targetSeconds (the intended race length).
    const rollCount        = Math.max(2, Math.floor(targetSeconds / dynamicsConfig.reRollIntervalDivisor));
    const rollInterval     = ((dynamicsConfig.reRollLastPositionPercent / 100) * targetSeconds * 1000) / rollCount;
    const lastRollDeadline = targetSeconds * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);

    // Init racers
    const racers = Array.from({ length: nRacers }, (_, i) => {
      const assignment    = assignmentByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
      const rowSize       = rowSizeByRow.get(assignment.rowIndex) ?? 1;
      const speedBonus    = computeSpeedBonus(
        assignment.rowIndex, rowGapPx, pathLengthPx, rowConfig.speedBonusFactor,
        finishT, isOpen, rowLayout.totalRows
      );
      // Open track: front row has the largest positive tStart (assembly area).
      // Closed track: row 0 starts at 0, rear rows at negative t (behind start).
      const tStart = isOpen
        ? (rowLayout.totalRows - assignment.rowIndex) * deltaT
        : -(assignment.rowIndex * deltaT);
      const spreadFactor  = (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;
      const isRearRowOpen = isOpen && assignment.rowIndex > 0;
      const speedBonusMult =
        (TEF_ACTIVE && TEF_BASE_BONUS !== null && (!TEF_OPEN_ONLY || isOpen) && isRearRowOpen)
          ? TEF_BASE_BONUS
          : (V4_ACTIVE && isRearRowOpen)
            ? V4_INITIAL_BOOST
            : (1 + speedBonus);
      const rollJitter    = (Math.random() - 0.5) * 2 * rollInterval * 0.2;

      const r = {
        index:                 i,
        name:                  `R${i + 1}`,
        t:                     tStart,
        tStart,
        initialSpeedBonusMult: speedBonusMult,
        initialGap:            0,
        spreadFactor,
        speedBonusMult,
        baseSpeed:           race_baseSpeed * speedMultiplier * spreadFactor * speedBonusMult,
        spreadFactorPrev:    spreadFactor,
        spreadFactorTarget:  spreadFactor,
        transitionStartTime: 0,
        transitionDuration:  dynamicsConfig.reRollTransitionDuration * 1000,
        nextRollTime:        rollInterval + rollJitter,
        finished:            false,
        finishRank:          null,
        finishTime:          null,
        startRowIndex:       assignment.rowIndex,
        indexInRow:          assignment.indexInRow,
        runoutDecay:         1,
        x: 0, y: 0, angle:   0,
        spriteWorldSizePx:      displaySize,
        geometricTrackWidthPx:  geometricTrackWidth,
        pathLengthPx,
        // v4: per-racer bonus-level transition state (mirrors re-roll transition)
        v4BonusMult:              1.0,
        v4BonusMultPrev:          1.0,
        v4BonusMultTarget:        1.0,
        v4BonusTransitionStart:   -Infinity,
        v4BonusTransitionDuration: dynamicsConfig.reRollTransitionDuration * 1000,
        v4RacerThreshIdx:         0, // per_racer metric: next threshold index for this racer (ratchet)
        v4RacerThreshTimes:       [], // per_racer: raceTs (ms) when each threshold was crossed
        rerollCount:              0, // total speed re-rolls fired for this racer
        trajectoryMult:           1.0, // Phase-3A: set by controller pass; 1.0 when Race Plan inactive
      };
      initRacerBehavior(r);
      r.physicalY = computeRowPhysicalY(
        assignment.indexInRow, rowSize, behaviorConfig.startSpreadRange
      );
      return r;
    });

    // World position helper
    const tPos = (t) => ((t % 1) + 1) % 1;
    function computePositions() {
      for (const r of racers) {
        const tNorm = isOpen ? Math.min(r.t, 1) : tPos(r.t);
        const p = shape.getPosition(tNorm, r.physicalY / 2);
        r.x = p.x; r.y = p.y; r.angle = p.angle;
      }
    }

    const DT          = 1000 / 60; // ms per frame at 60 fps
    const maxTime     = Math.max(targetSeconds * 3, 600) * 1000; // safety cap: 3× or 10 min
    let raceTs        = 0;
    let finishedCount = 0;

    // Mixing-quota: fraction of Row-1 racers that have overtaken at least one Row-0
    // racer in t-space by the time avoidanceWarmupMs elapses.
    let mixingQuota    = null;
    let warmupMeasured = false;

    // TEF: compute per-racer initialGap = how far behind Row-0's start each racer begins
    if (TEF_ACTIVE && (!TEF_OPEN_ONLY || isOpen)) {
      const tStartRow0 = Math.max(...racers.map((r) => r.tStart));
      for (const r of racers) {
        r.initialGap = Math.max(0, tStartRow0 - r.tStart);
      }
    }

    // v4: per-race overtaking state
    const v4Row1Total    = V4_ACTIVE && isOpen ? racers.filter((r) => r.startRowIndex === 1).length : 0;
    const v4Row1Racers   = V4_ACTIVE && isOpen ? racers.filter((r) => r.startRowIndex === 1) : [];
    const v4Row0Racers   = V4_ACTIVE && isOpen ? racers.filter((r) => r.startRowIndex === 0) : [];
    // per_racer: each row compares against ALL rows that started ahead of it (correct for Row 3+)
    const v4FrontPoolByRow = (V4_ACTIVE && isOpen && V4_METRIC_TYPE === 'per_racer') ? (() => {
      const map = new Map();
      const maxRow = Math.max(0, ...racers.map((r) => r.startRowIndex));
      for (let ri = 1; ri <= maxRow; ri++) {
        map.set(ri, racers.filter((r) => r.startRowIndex < ri));
      }
      return map;
    })() : null;
    // legacy alias kept for physical_overtake metric
    const v4FrontRacers  = V4_ACTIVE && isOpen && V4_METRIC_TYPE !== 'per_racer'
      ? racers.filter((r) => r.startRowIndex === 0 || r.startRowIndex === 1) : [];
    const v4HasOvertaken = new Set(); // racerIndex of Row-1 racers that have completed ≥1 overtake
    // physical_overtake metric: track pairs that were "near and behind" (prerequisite for an overtake)
    const v4WasNearBehind = new Set(); // keys "r1idx:r0idx" — pair was once laterally close while r1 behind
    const v4OvertakePairs = new Set(); // keys "r1idx:r0idx" — completed overtakes
    let   v4NextThreshIdx = 0;
    const v4ThreshLog     = []; // { threshold, timeS, fromBonus, toBonus }

    computePositions();

    // ── Diagnostic snapshot state ─────────────────────────────────────────────
    const diagSnapshots = [];
    let diagSnapIdx = 0;
    const DIAG_SNAP_MS   = diagnosticMode ? DIAG_SNAP_TIMES_S.map((s) => s * 1000) : [];
    let diagIntLateralPushes = 0;
    let diagIntBrakeActs     = 0;
    let diagIntOvertakes     = 0;
    let diagLastOvertakeCount = 0;

    function diagTakeSnapshot(nominalTimeS, actualTimeMs) {
      const snap = {
        timeS: nominalTimeS, actualTimeMs,
        interval: { lateralPushes: diagIntLateralPushes, brakeActivations: diagIntBrakeActs, newOvertakes: diagIntOvertakes },
        racers: racers.map((r) => ({
          idx: r.index, row: r.startRowIndex,
          t: +r.t.toFixed(6), physY: +r.physicalY.toFixed(4),
          speed: +r.baseSpeed.toFixed(6), avoidance: r.avoidanceActive,
          v4Mult: +(r.v4BonusMult ?? 1).toFixed(4),
        })),
        brakeZonePairs: [],
        closePairs: [],
      };
      for (let a = 0; a < racers.length; a++) {
        for (let b = a + 1; b < racers.length; b++) {
          const ra = racers[a], rb = racers[b];
          const dT = rb.t - ra.t;
          const dY = Math.abs(ra.physicalY - rb.physicalY);
          if (dT > 0 && dT < 0.015 && dY < 0.2)  snap.brakeZonePairs.push({ follower: ra.index, followerRow: ra.startRowIndex, leader: rb.index, leaderRow: rb.startRowIndex, dT: +dT.toFixed(5), dY: +dY.toFixed(4) });
          if (dT < 0 && -dT < 0.015 && dY < 0.2) snap.brakeZonePairs.push({ follower: rb.index, followerRow: rb.startRowIndex, leader: ra.index, leaderRow: ra.startRowIndex, dT: +(-dT).toFixed(5), dY: +dY.toFixed(4) });
          if (Math.abs(dT) < 0.005 && dY < 0.3)  snap.closePairs.push({ a: ra.index, aRow: ra.startRowIndex, b: rb.index, bRow: rb.startRowIndex, dT: +dT.toFixed(5), dY: +dY.toFixed(4) });
        }
      }
      diagSnapshots.push(snap);
      diagIntLateralPushes = 0;
      diagIntBrakeActs     = 0;
      diagIntOvertakes     = 0;
    }

    if (diagnosticMode) {
      diagTakeSnapshot(0.0, 0);
      diagSnapIdx = 1; // t=0 already captured
    }

    // ── Lightweight per-race stats (always collected, low overhead) ───────────
    let liteRow1BrakeFrames = 0;  // racer-frames where startRowIndex=1 AND avoidanceActive
    let liteRow0BrakeFrames = 0;  // racer-frames where startRowIndex=0 AND avoidanceActive
    let liteRow2BrakeFrames = 0;  // racer-frames where startRowIndex=2 AND avoidanceActive
    let liteLateralMoves    = 0;  // racer-frames where |physicalY delta| > 1e-4
    const liteRow1EverAhead = new Set(); // row-1 racer indices that at any point had t > some row-0 t
    let litePrevPhysY       = null;

    // ── Phase-3A: Naturalness metrics state ──────────────────────────────────
    const JERK_BASESPEED_EPSILON = 1e-5;
    const JERK_HIGH_THRESHOLD    = 0.05; // calibrated post-baseline; ≈ 95th-pct jerk
    const stablePhaseStartMs     = Math.max(0, 0.25 * targetSeconds * 1000);
    const stablePhaseEndMs       = 0.95 * targetSeconds * 1000;
    const PULK_T_THRESHOLD       = pathLengthPx > 0 ? 200 / pathLengthPx : 0.01;
    const pulkWindowStartMs      = 0.25 * targetSeconds * 1000;
    const pulkWindowEndMs        = 0.50 * targetSeconds * 1000;
    const natPrevEffSpeed        = new Map(); // racerIndex → prev effective speed
    const natPrevT               = new Map(); // racerIndex → t before Pass-2
    let natJerkSum = 0, natJerkMax = 0, natJerkSteps = 0, natJerkHighCount = 0;
    let natOvertakeCount = 0, natNaturalOvertakeCount = 0;
    let natPulkFrames = 0, natStableFrames = 0;
    let natPulkWasActive = false;
    let natPulkTriggersInWindow = 0, natPulkTriggersOutOfWindow = 0;

    while (finishedCount < nRacers && raceTs < maxTime) {
      raceTs += DT;

      // ── Pass 1: re-rolls + spreadFactor transitions + baseSpeed update ─────────
      const spreadRange = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN;
      const halfWidth   = spreadRange * (dynamicsConfig.reRollVariationPercent / 100);
      for (const r of racers) {
        if (r.finished) continue;
        if (raceTs >= r.nextRollTime && raceTs < lastRollDeadline) {
          const rawTarget   = r.spreadFactor + (Math.random() - 0.5) * 2 * halfWidth;
          // Phase-3A: pulk-bias hook (active when Race Plan is running, wired in E-Step 5)
          const biasedTarget = racePlanController
            ? racePlanController.computePulkBiasedTarget(
                r.index, rawTarget,
                BASE_SPEED_MIN / BASE_SPEED_MEAN,
                BASE_SPEED_MAX / BASE_SPEED_MEAN,
                racers, raceTs
              )
            : rawTarget;
          const newTarget   = Math.max(
            BASE_SPEED_MIN / BASE_SPEED_MEAN,
            Math.min(BASE_SPEED_MAX / BASE_SPEED_MEAN, biasedTarget)
          );
          r.spreadFactorPrev    = r.spreadFactor;
          r.spreadFactorTarget  = newTarget;
          r.transitionStartTime = raceTs;
          const jOff = (Math.random() - 0.5) * 2 * rollInterval * 0.2;
          r.nextRollTime = raceTs + rollInterval + jOff;
          r.rerollCount++;
        }
        const elapsed = raceTs - r.transitionStartTime;
        if (elapsed < r.transitionDuration) {
          const prog = elapsed / r.transitionDuration;
          r.spreadFactor = r.spreadFactorPrev + (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(prog);
          r.baseSpeed    = race_baseSpeed * speedMultiplier * r.spreadFactor * r.speedBonusMult;
        }

        // v4: smooth bonus-level transition triggered by threshold crossing
        if (V4_ACTIVE && isOpen && r.startRowIndex > 0) {
          const v4El = raceTs - r.v4BonusTransitionStart;
          if (v4El >= 0 && v4El < r.v4BonusTransitionDuration) {
            r.v4BonusMult = r.v4BonusMultPrev + (r.v4BonusMultTarget - r.v4BonusMultPrev) * easeInOutCubic(v4El / r.v4BonusTransitionDuration);
          } else if (v4El >= r.v4BonusTransitionDuration) {
            r.v4BonusMult = r.v4BonusMultTarget;
          }
        }
      }

      // ── Controller-Pass: write r.trajectoryMult (Race Plan only) ─────────────
      if (racePlanController) {
        racePlanController.update(racers, raceTs);
      } else {
        for (const r of racers) r.trajectoryMult = 1.0;
      }

      // ── Jerk metric: computed in stable phase, after baseSpeed/trajectoryMult set ──
      if (raceTs >= stablePhaseStartMs && raceTs <= stablePhaseEndMs) {
        natStableFrames++;
        for (const r of racers) {
          if (r.finished) continue;
          const effSpeed = r.baseSpeed * r.trajectoryMult;
          const prev     = natPrevEffSpeed.get(r.index);
          if (prev !== undefined) {
            const jerkStep = Math.abs(effSpeed - prev) / DT / Math.max(r.baseSpeed, JERK_BASESPEED_EPSILON);
            natJerkSum += jerkStep;
            natJerkMax  = Math.max(natJerkMax, jerkStep);
            natJerkSteps++;
            if (jerkStep > JERK_HIGH_THRESHOLD) natJerkHighCount++;
          }
          natPrevEffSpeed.set(r.index, effSpeed);
        }
      }
      // Save pre-Pass-2 t values for overtake detection
      for (const r of racers) natPrevT.set(r.index, r.t);

      // ── Pass 2: t-update (mirrors index.jsx RACING loop) ─────────────────────
      const effectiveBrakeFactor = computeEffectiveBrakeFactor(behaviorConfig, isOpen, raceTs);
      // TEF v3: per-frame meanT of Row-0 (computed once, used per-racer below)
      let tefMeanT0 = 0;
      if (TEF_ACTIVE && TEF_BASE_BONUS !== null && (!TEF_OPEN_ONLY || isOpen)) {
        const row0Live = racers.filter((q) => q.startRowIndex === 0 && !q.finished);
        tefMeanT0 = row0Live.length > 0
          ? row0Live.reduce((s, q) => s + q.t, 0) / row0Live.length
          : 0;
      }
      for (const r of racers) {
        if (!r.finished) {
          const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
          const brake = r.avoidanceActive     ? effectiveBrakeFactor : 1.0;
          // TEF v3: scale down the aggressive bonus proportionally as racer closes the tStart gap.
          let tefMult = 1.0;
          if (TEF_ACTIVE && TEF_BASE_BONUS !== null && (!TEF_OPEN_ONLY || isOpen) && r.initialGap > 0) {
            const curGap   = tefMeanT0 - r.t;
            const gapRatio = Math.max(0, Math.min(1, curGap / r.initialGap));
            const targetBonusMult = 1.0 + (r.initialSpeedBonusMult - 1.0) * gapRatio;
            tefMult = targetBonusMult / r.initialSpeedBonusMult;
          }
          // trajectoryMult = 1.0 when Race Plan inactive; controlled by plan in OUTCOME phase
          r.t += r.baseSpeed * boost * brake * tefMult * r.v4BonusMult * r.trajectoryMult * (DT / 16);
        }
      }

      // ── Post-Pass-2: overtake detection + pulk state ─────────────────────────
      if (raceTs >= stablePhaseStartMs && raceTs <= stablePhaseEndMs) {
        // Overtake detection (O(n²), stable phase only)
        const refGap = finishT > 0 ? finishT / nRacers : 0.001;
        for (let a = 0; a < racers.length - 1; a++) {
          const ra = racers[a];
          if (ra.finished) continue;
          const raPrev = natPrevT.get(ra.index) ?? ra.t;
          for (let b = a + 1; b < racers.length; b++) {
            const rb = racers[b];
            if (rb.finished) continue;
            const rbPrev = natPrevT.get(rb.index) ?? rb.t;
            // ra overtook rb
            if (raPrev <= rbPrev && ra.t > rb.t) {
              natOvertakeCount++;
              if (rbPrev - raPrev <= refGap * 0.3) natNaturalOvertakeCount++;
            }
            // rb overtook ra
            else if (rbPrev <= raPrev && rb.t > ra.t) {
              natOvertakeCount++;
              if (raPrev - rbPrev <= refGap * 0.3) natNaturalOvertakeCount++;
            }
          }
        }
      }
      // Pulk state (any time — window check uses absolute ms)
      {
        const active = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
        let isPulk = false;
        for (let i = 0; i + 2 < active.length; i++) {
          if (active[i].t - active[i + 2].t <= PULK_T_THRESHOLD) { isPulk = true; break; }
        }
        if (raceTs >= stablePhaseStartMs && raceTs <= stablePhaseEndMs && isPulk) natPulkFrames++;
        if (!natPulkWasActive && isPulk) {
          if (raceTs >= pulkWindowStartMs && raceTs <= pulkWindowEndMs) natPulkTriggersInWindow++;
          else natPulkTriggersOutOfWindow++;
        }
        natPulkWasActive = isPulk;
      }

      // Mixing-quota snapshot: taken at the first frame at or after avoidanceWarmupMs
      if (!warmupMeasured && isOpen && raceTs >= behaviorConfig.avoidanceWarmupMs) {
        const row0Ts   = racers.filter((r) => r.startRowIndex === 0 && !r.finished).map((r) => r.t);
        const row1     = racers.filter((r) => r.startRowIndex === 1);
        const minRow0T = row0Ts.length > 0 ? Math.min(...row0Ts) : Infinity;
        const mixed    = row1.filter((r) => r.t > minRow0T).length;
        mixingQuota    = row1.length > 0 ? mixed / row1.length : null;
        warmupMeasured = true;
      }

      // v4: overtake detection + threshold check
      if (V4_ACTIVE && isOpen && v4Row1Total > 0) {
        if (V4_METRIC_TYPE === 'physical_overtake') {
          // Physical overtake: r1 must have been laterally close and behind r0 before crossing ahead.
          for (const r1 of v4Row1Racers) {
            if (r1.finished) continue;
            for (const r0 of v4Row0Racers) {
              if (r0.finished) continue;
              const key = `${r1.index}:${r0.index}`;
              if (v4OvertakePairs.has(key)) continue; // already counted
              const dY = Math.abs(r1.physicalY - r0.physicalY);
              if (!v4WasNearBehind.has(key)) {
                // Check whether this pair is now "near and behind" (prerequisite phase)
                if (dY < V4_LATERAL_PROXIMITY && r1.t < r0.t) {
                  v4WasNearBehind.add(key);
                }
              } else {
                // Prerequisite met — did r1 now cross ahead in t?
                if (r1.t > r0.t) {
                  v4OvertakePairs.add(key);
                  v4HasOvertaken.add(r1.index);
                }
              }
            }
          }
        } else if (V4_METRIC_TYPE === 'per_racer') {
          // Per-racer metric: each non-Row-0 racer independently tracks its own overtake fraction
          // and triggers its own bonus reduction (ratchet — never reverts).
          for (const r of racers) {
            if (r.finished || r.startRowIndex === 0) continue;
            const racerThresholds = r.startRowIndex === 1 ? V4_ROW1_THRESHOLDS : V4_ROW2_THRESHOLDS;
            if (r.v4RacerThreshIdx >= racerThresholds.length) continue;
            const frontPool  = v4FrontPoolByRow?.get(r.startRowIndex) ?? v4Row0Racers;
            const totalFront = frontPool.length;
            if (totalFront === 0) continue;
            const aheadCount = frontPool.reduce((n, f) => n + (f.t < r.t ? 1 : 0), 0);
            const fraction   = aheadCount / totalFront;
            while (r.v4RacerThreshIdx < racerThresholds.length && fraction >= racerThresholds[r.v4RacerThreshIdx] / 100) {
              const toBonus = V4_BOOST_SCHEDULE[Math.min(r.v4RacerThreshIdx + 1, V4_BOOST_SCHEDULE.length - 1)];
              r.v4BonusMultPrev        = r.v4BonusMult;
              r.v4BonusMultTarget      = toBonus / V4_INITIAL_BOOST;
              r.v4BonusTransitionStart = raceTs;
              r.v4RacerThreshTimes.push(raceTs);
              r.v4RacerThreshIdx++;
            }
          }
        } else {
          // Legacy metric: r1.t > min(Row-0 t) — lax, t-value only
          const row0Live = v4Row0Racers.filter((r) => !r.finished);
          if (row0Live.length > 0) {
            const minRow0T = Math.min(...row0Live.map((r) => r.t));
            for (const r1 of v4Row1Racers) {
              if (!r1.finished && r1.t > minRow0T) v4HasOvertaken.add(r1.index);
            }
          }
        }

        // Trigger global threshold step-downs (skipped for per_racer which handles this per-racer)
        if (V4_METRIC_TYPE !== 'per_racer' && v4NextThreshIdx < V4_THRESHOLDS.length) {
          const fraction = v4Row1Total > 0 ? v4HasOvertaken.size / v4Row1Total : 0;
          while (v4NextThreshIdx < V4_THRESHOLDS.length && fraction >= V4_THRESHOLDS[v4NextThreshIdx] / 100) {
            const fromBonus = V4_BOOST_SCHEDULE[v4NextThreshIdx];
            const toBonus   = V4_BOOST_SCHEDULE[Math.min(v4NextThreshIdx + 1, V4_BOOST_SCHEDULE.length - 1)];
            v4ThreshLog.push({ threshold: V4_THRESHOLDS[v4NextThreshIdx], timeS: raceTs / 1000, fromBonus, toBonus });
            const newTarget = toBonus / V4_INITIAL_BOOST;
            for (const r of racers) {
              if (r.startRowIndex > 0 && !r.finished) {
                r.v4BonusMultPrev        = r.v4BonusMult;
                r.v4BonusMultTarget      = newTarget;
                r.v4BonusTransitionStart = raceTs;
              }
            }
            v4NextThreshIdx++;
          }
        }
      }

      // Diagnostic: save pre-frame state for lateral-push and brake-activation counting
      let diagPrevPhysY, diagPrevAvoidance;
      if (diagnosticMode) {
        diagPrevPhysY     = racers.map((r) => r.physicalY);
        diagPrevAvoidance = racers.map((r) => r.avoidanceActive);
      }
      computePositions();
      applyRacerBehavior(racers, behaviorConfig, undefined);
      // Lite stats: always-on, low-overhead per-frame counters
      {
        for (let ri = 0; ri < racers.length; ri++) {
          const r = racers[ri];
          if (r.avoidanceActive && r.startRowIndex === 1) liteRow1BrakeFrames++;
          if (r.avoidanceActive && r.startRowIndex === 0) liteRow0BrakeFrames++;
          if (r.avoidanceActive && r.startRowIndex === 2) liteRow2BrakeFrames++;
          if (litePrevPhysY && Math.abs(r.physicalY - litePrevPhysY[ri]) > 1e-4) liteLateralMoves++;
        }
        if (!litePrevPhysY) litePrevPhysY = new Array(racers.length);
        for (let ri = 0; ri < racers.length; ri++) litePrevPhysY[ri] = racers[ri].physicalY;
        if (isOpen) {
          const row0Live = racers.filter((r) => r.startRowIndex === 0 && !r.finished);
          if (row0Live.length > 0) {
            const minRow0T = Math.min(...row0Live.map((r) => r.t));
            for (const r of racers) {
              if (r.startRowIndex === 1 && !r.finished && r.t > minRow0T) liteRow1EverAhead.add(r.index);
            }
          }
        }
      }
      // Diagnostic: post-frame counting + snapshot check
      if (diagnosticMode) {
        for (let ri = 0; ri < racers.length; ri++) {
          if (Math.abs(racers[ri].physicalY - diagPrevPhysY[ri]) > 1e-4) diagIntLateralPushes++;
          if (!diagPrevAvoidance[ri] && racers[ri].avoidanceActive)       diagIntBrakeActs++;
        }
        diagIntOvertakes     += v4OvertakePairs.size - diagLastOvertakeCount;
        diagLastOvertakeCount = v4OvertakePairs.size;
        while (diagSnapIdx < DIAG_SNAP_MS.length && raceTs >= DIAG_SNAP_MS[diagSnapIdx]) {
          diagTakeSnapshot(DIAG_SNAP_TIMES_S[diagSnapIdx], raceTs);
          diagSnapIdx++;
        }
      }

      // Finish check
      for (const r of racers) {
        if (!r.finished && r.t >= finishT) {
          r.finished   = true;
          finishedCount++;
          r.finishRank = finishedCount;
          r.finishTime = raceTs / 1000;
        }
      }
    }

    // DNF: rank unfinished by current t-position (higher = better)
    const dnf = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
    for (let k = 0; k < dnf.length; k++) {
      dnf[k].finishRank = finishedCount + 1 + k;
    }

    const results = racers.map((r) => ({
      racerIndex:    r.index,
      startRowIndex: r.startRowIndex,
      indexInRow:    r.indexInRow,
      finalT:        r.t,
      finalRank:     r.finishRank,
      finishTime:    r.finishTime,
    }));
    // Attach mixing-quota and v4 diagnostics as non-iterable properties.
    results.mixingQuota     = mixingQuota;
    results.v4ThreshLog     = v4ThreshLog;
    results.v4OvertakeCount = v4HasOvertaken.size;     // Row-1 racers with ≥1 physical overtake
    results.v4NearBehindCount = v4WasNearBehind.size;  // pairs that entered near-behind state
    results.v4PairOvertakes = v4OvertakePairs.size;    // total completed pair-overtakes
    results.diagSnapshots   = diagnosticMode ? diagSnapshots : null;
    results.liteRow1BrakeFrames = liteRow1BrakeFrames;
    results.liteRow0BrakeFrames = liteRow0BrakeFrames;
    results.liteRow2BrakeFrames = liteRow2BrakeFrames;
    results.liteLateralMoves    = liteLateralMoves;
    results.v4PerRacerEndStats  = (V4_ACTIVE && V4_METRIC_TYPE === 'per_racer')
      ? racers.filter((r) => r.startRowIndex > 0).map((r) => ({ row: r.startRowIndex, threshIdx: r.v4RacerThreshIdx, threshTimes: r.v4RacerThreshTimes }))
      : null;
    results.liteRow1EverAheadCount = liteRow1EverAhead.size;
    // Phase-3A: Naturalness metrics
    results.naturalness = {
      meanJerk:               natJerkSteps > 0 ? natJerkSum  / natJerkSteps : 0,
      maxJerkSpike:           natJerkMax,
      jerkFraction_high:      natJerkSteps > 0 ? natJerkHighCount / natJerkSteps : 0,
      naturalOvertakeFraction: natOvertakeCount > 0 ? natNaturalOvertakeCount / natOvertakeCount : 1,
      pulkTimeFraction:        natStableFrames > 0 ? natPulkFrames / natStableFrames : 0,
      pulkTriggersInWindow:   natPulkTriggersInWindow,
      pulkTriggersOutOfWindow: natPulkTriggersOutOfWindow,
      // From controller telemetry (0 when Race Plan inactive)
      ...(racePlanController ? racePlanController.collectTelemetry() : {
        winnerBlockedFractionInOutcome: 0,
        planBiasDeltaMean: 0,
        pulkBiasEventCount: 0,
      }),
    };
    results.physicalDurationS   = Math.max(...racers.map((r) => r.finishTime ?? 0));
    results.avgRerollsPerRacer  = racers.reduce((s, r) => s + r.rerollCount, 0) / racers.length;
    return results;
  } finally {
    Math.random = savedRandom;
  }
}

// ── Statistics ────────────────────────────────────────────────────────────────
/**
 * Aggregate fairness statistics over a series of races.
 *
 * @param {Array<Array<{startRowIndex,finalRank}>>} raceResults  one entry per race
 * @param {number} totalRows
 * @returns {{ nRaces, totalRows, rowStats, chiSq, df, pValue }}
 */
export function computeFairnessStats(raceResults, totalRows) {
  const nRaces     = raceResults.length;
  const winsByRow  = new Array(totalRows).fill(0);
  const ranksByRow = Array.from({ length: totalRows }, () => []);

  for (const race of raceResults) {
    const winner = race.reduce((best, r) => (r.finalRank < best.finalRank ? r : best));
    if (winner.startRowIndex < totalRows) winsByRow[winner.startRowIndex]++;
    for (const r of race) {
      if (r.startRowIndex < totalRows) ranksByRow[r.startRowIndex].push(r.finalRank);
    }
  }

  const rowStats = Array.from({ length: totalRows }, (_, rowIdx) => {
    const ranks   = ranksByRow[rowIdx];
    const n       = ranks.length;
    const wins    = winsByRow[rowIdx];
    const avgRank = n > 0 ? ranks.reduce((s, v) => s + v, 0) / n : null;
    const variance =
      n > 1 ? ranks.reduce((s, v) => s + (v - avgRank) ** 2, 0) / (n - 1) : 0;
    return {
      rowIndex: rowIdx,
      wins,
      winRate:  wins / nRaces,
      n,
      avgRank,
      stdRank:  Math.sqrt(variance),
    };
  });

  // Chi-square goodness-of-fit: H0 = all rows equally likely to win
  const expected = nRaces / totalRows;
  const chiSq    = winsByRow.reduce((s, obs) => s + (obs - expected) ** 2 / expected, 0);
  const df       = totalRows - 1;
  const pValue   = chiSqPValue(chiSq, df);

  return { nRaces, totalRows, rowStats, chiSq, df, pValue };
}

// Wilson-Hilferty chi-square p-value approximation (upper tail)
function chiSqPValue(x, k) {
  if (k <= 0 || x < 0) return 1;
  const mu  = 1 - 2 / (9 * k);
  const sig = Math.sqrt(2 / (9 * k));
  const z   = ((x / k) ** (1 / 3) - mu) / sig;
  return 1 - normalCDF(z);
}

// Abramowitz & Stegun normal CDF approximation (max error 7.5e-8)
function normalCDF(z) {
  const t    = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t * (0.319381530 +
    t * (-0.356563782 +
    t * (1.781477937 +
    t * (-1.821255978 +
    t * 1.330274429))));
  const phi = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
  return z >= 0 ? phi : 1 - phi;
}

// ── Report generation ─────────────────────────────────────────────────────────
function fmtPct(v) { return (v * 100).toFixed(1) + '%'; }
function fmtN(v, d = 2) { return v != null ? v.toFixed(d) : '—'; }
function sigLabel(p) {
  if (p < 0.001) return '*** (p<0.001)';
  if (p < 0.01)  return '** (p<0.01)';
  if (p < 0.05)  return '* (p<0.05)';
  return 'n.s.';
}
function fairLabel(p, rowStats) {
  if (p >= 0.05) return '✅ Fair';
  // Is front row over- or under-performing?
  const row0Rate = rowStats[0]?.winRate ?? 0;
  const expected = 1 / rowStats.length;
  if (row0Rate > expected + 0.05) return '⚠️ Front-Bias';
  if (row0Rate < expected - 0.05) return '⚠️ Rear-Bias';
  return '⚠️ Unequal';
}

function buildReport(allResults, runDate) {
  const lines = [];

  lines.push('# RaceArena — Fairness Simulation Report');
  lines.push('');
  lines.push(`**Datum:** ${runDate}  `);
  lines.push(`**Rennen pro Kombination:** ${N_RACES}  `);
  lines.push(`**Teilnehmer pro Rennen:** ${N_RACERS}  `);
  lines.push(`**Distanz-Varianten:** 30s / 120s  `);
  lines.push(`**Catch-Up (speedBonusFactor):** ${DEFAULT_ROW_LAYOUT_CONFIG.speedBonusFactor}  `);
  lines.push(`**PRNG:** mulberry32, Seeds 1–${N_RACES}  `);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Overview table ──
  lines.push('## Übersicht — Win-Rate pro Startreihe');
  lines.push('');
  lines.push('Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  ');
  lines.push('Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  ');
  lines.push('`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  ');
  lines.push('');

  lines.push(
    '| Track | Racer | Dist | Reihen | Erwart. | ' +
    'R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |'
  );
  lines.push(
    '|-------|-------|------|--------|---------|' +
    '-----------|------------|-------------|-----|--------|--------|'
  );

  const FAIR_THRESHOLD = 0.05;
  const unfairCombos = [];
  const fairCombos   = [];

  for (const res of allResults) {
    const { trackId, trackName, racerType, durationSec, stats } = res;
    const { totalRows, rowStats, chiSq, pValue } = stats;
    const expected = 1 / totalRows;
    const r0 = rowStats[0];
    const r1 = rowStats[1];
    const rRest = rowStats.slice(2);
    const restWinRate = rRest.length > 0
      ? rRest.reduce((s, r) => s + r.wins, 0) / (N_RACES * rRest.length || 1)
      : '—';

    const verdict = fairLabel(pValue, rowStats);
    lines.push(
      `| ${trackName} | ${racerType} | ${durationSec}s | ${totalRows} | ${fmtPct(expected)} | ` +
      `${r0 ? fmtPct(r0.winRate) : '—'} | ` +
      `${r1 ? fmtPct(r1.winRate) : '—'} | ` +
      `${typeof restWinRate === 'number' ? fmtPct(restWinRate) : restWinRate} | ` +
      `${fmtN(chiSq, 1)} | ${sigLabel(pValue)} | ${verdict} |`
    );

    if (pValue < FAIR_THRESHOLD) unfairCombos.push(res);
    else fairCombos.push(res);
  }
  lines.push('');

  // ── Per-combination detail sections ──
  lines.push('---');
  lines.push('');
  lines.push('## Detail-Auswertung pro Kombination');
  lines.push('');

  for (const res of allResults) {
    const { trackId, trackName, racerType, durationSec, finishT, stats } = res;
    const { nRaces, totalRows, rowStats, chiSq, df, pValue } = stats;
    const expected = 1 / totalRows;

    lines.push(`### ${trackName} × ${racerType} × ${durationSec}s`);
    lines.push('');
    lines.push(`- **finishT:** ${finishT.toFixed(4)} (Ziellinie in t-Raum)`);
    lines.push(`- **Reihen:** ${totalRows} à max. ${Math.ceil(N_RACERS / totalRows)} Racer`);
    lines.push(`- **Erwartete Win-Rate (fair):** ${fmtPct(expected)}`);
    lines.push(`- **Chi²(${df}):** ${fmtN(chiSq, 2)} — ${sigLabel(pValue)}`);
    lines.push('');

    lines.push('| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |');
    lines.push('|-------|-------|----------|------------|--------|--------|');
    for (const rs of rowStats) {
      const delta = rs.winRate - expected;
      const sign  = delta >= 0 ? '+' : '';
      lines.push(
        `| Row ${rs.rowIndex} | ${rs.wins} | ${fmtPct(rs.winRate)} | ` +
        `${sign}${fmtPct(delta)} | ${fmtN(rs.avgRank, 1)} | ${fmtN(rs.stdRank, 1)} |`
      );
    }
    lines.push('');
  }

  // ── Mixing-Quote (nur Open Tracks) ──
  const openResults = allResults.filter((r) => r.isOpen && r.avgMixingQuota != null);
  if (openResults.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Mixing-Quote — Open Tracks (t-Space-Mixing-Validierung)');
    lines.push('');
    lines.push(
      'Anteil der Row-1-Racer die bei Ablauf von `avoidanceWarmupMs` mindestens einen Row-0-Racer ' +
      'im t-Raum überholt haben. Zielbereich: **60–95 %**.'
    );
    lines.push('');
    lines.push('| Track | Racer | Dist | Mixing-Quote | Bewertung |');
    lines.push('|-------|-------|------|-------------|-----------|');
    for (const res of openResults) {
      const q     = res.avgMixingQuota;
      const pct   = fmtPct(q);
      const label = q < 0.60 ? '⚠️ Zu wenig Mixing' : q > 0.95 ? '⚠️ Zu viel Mixing' : '✅ OK';
      lines.push(`| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${pct} | ${label} |`);
    }
    lines.push('');
  }

  // ── Gesamtauswertung ──
  lines.push('---');
  lines.push('');
  lines.push('## Gesamtauswertung');
  lines.push('');
  lines.push(`**Getestete Kombinationen:** ${allResults.length}  `);
  lines.push(`**Davon statistisch fair (p≥0.05):** ${fairCombos.length}  `);
  lines.push(`**Davon statistisch unfair (p<0.05):** ${unfairCombos.length}  `);
  lines.push('');

  if (unfairCombos.length === 0) {
    lines.push('**Befund:** Keine Kombination zeigt statistisch signifikante Unfairness. ✅');
  } else {
    lines.push('**Kombinationen mit signifikantem Ungleichgewicht (p < 0.05):**');
    lines.push('');
    for (const res of unfairCombos) {
      const { trackName, racerType, durationSec, stats } = res;
      const { rowStats, pValue } = stats;
      const r0Rate = rowStats[0]?.winRate ?? 0;
      const expRate = 1 / rowStats.length;
      const bias = r0Rate > expRate ? `Row 0 zu oft (${fmtPct(r0Rate)} statt ${fmtPct(expRate)})` :
                   r0Rate < expRate ? `Row 0 zu selten (${fmtPct(r0Rate)} statt ${fmtPct(expRate)})` :
                   'mittlere Reihen bevorzugt';
      lines.push(`- **${trackName} × ${racerType} × ${durationSec}s:** ${bias} — ${sigLabel(pValue)}`);
    }
  }
  lines.push('');

  // ── Empfehlung ──
  lines.push('---');
  lines.push('');
  lines.push('## Empfehlung');
  lines.push('');

  // Analyze patterns
  const frontBias = unfairCombos.filter((r) => {
    const rs = r.stats.rowStats;
    return (rs[0]?.winRate ?? 0) > 1 / rs.length + 0.05;
  });
  const rearBias = unfairCombos.filter((r) => {
    const rs = r.stats.rowStats;
    return (rs[0]?.winRate ?? 0) < 1 / rs.length - 0.05;
  });
  const shortUnfair = unfairCombos.filter((r) => r.durationSec === 30);
  const longUnfair  = unfairCombos.filter((r) => r.durationSec === 120);

  lines.push('### Front-Row-Vorteil (Row 0 gewinnt zu oft)');
  if (frontBias.length === 0) {
    lines.push('Keine Kombination zeigt statistisch signifikanten Front-Row-Vorteil.');
  } else {
    for (const r of frontBias) {
      lines.push(`- **${r.trackName} × ${r.racerType} × ${r.durationSec}s** — ${sigLabel(r.stats.pValue)}`);
    }
  }
  lines.push('');

  lines.push('### Hinter-Row-Nachteil (Row 0 gewinnt zu selten / Catch-Up überkompensiert)');
  if (rearBias.length === 0) {
    lines.push('Keine Kombination zeigt Hinter-Row-Nachteil oder Überkompensation.');
  } else {
    for (const r of rearBias) {
      lines.push(`- **${r.trackName} × ${r.racerType} × ${r.durationSec}s** — ${sigLabel(r.stats.pValue)}`);
    }
  }
  lines.push('');

  lines.push('### Catch-Up-Mechanismus (speedBonusFactor = 1.0)');
  if (unfairCombos.length === 0) {
    lines.push(
      'Der Catch-Up-Mechanismus wirkt auf allen getesteten Tracks und Racer-Typen ausreichend. ' +
      'Kein statistisch signifikanter Reihen-Bias nachweisbar.'
    );
  } else {
    if (shortUnfair.length > longUnfair.length) {
      lines.push(
        `Unfairness tritt häufiger bei **kurzen Rennen (30s)** auf (${shortUnfair.length}/${unfairCombos.length} unfaire Kombos). ` +
        'Der Catch-Up-Mechanismus benötigt Renndauer zum Wirken — bei sehr kurzen Rennen ist die Ausgleichswirkung begrenzt.'
      );
    } else if (longUnfair.length > shortUnfair.length) {
      lines.push(
        `Unfairness tritt häufiger bei **langen Rennen (120s)** auf (${longUnfair.length}/${unfairCombos.length} unfaire Kombos). ` +
        'Das deutet auf akkumulierende Effekte hin, die den Bonus langfristig aus dem Gleichgewicht bringen.'
      );
    } else {
      lines.push(
        `Unfairness verteilt sich gleichmäßig auf kurze und lange Rennen ` +
        `(${shortUnfair.length} × 30s, ${longUnfair.length} × 120s).`
      );
    }
  }
  lines.push('');
  lines.push('*Hinweis: Dieser Abschnitt enthält ausschließlich statistische Beurteilungen, keine Code-Empfehlungen.*');
  lines.push('');

  // ── Phase-3A: Naturalness section (Open Tracks only) ──
  const openWithNat = allResults.filter((r) => r.isOpen && r.avgNaturalness);
  if (openWithNat.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Phase-3A — Naturalness-Metriken (Open Tracks)');
    lines.push('');
    lines.push(
      'Stabile Phase: 25%–95% der targetDuration. ' +
      'Jerk: |Δ(effSpeed)/DT| / max(baseSpeed, ε). ' +
      'naturalOvt: Anteil Überholungen mit tDiff ≤ 30% des Referenzabstands.'
    );
    lines.push('');
    lines.push(
      '| Track | Racer | Dist | meanJerk | maxJerk | jerkHigh% | natOvt% | pulkTime% | pulkTrigIn | pulkTrigOut |'
    );
    lines.push(
      '|-------|-------|------|----------|---------|-----------|---------|-----------|-----------|-------------|'
    );
    for (const res of openWithNat) {
      const n = res.avgNaturalness;
      lines.push(
        `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s` +
        ` | ${n.meanJerk.toFixed(4)} | ${n.maxJerkSpike.toFixed(4)}` +
        ` | ${(n.jerkFraction_high * 100).toFixed(1)}%` +
        ` | ${(n.naturalOvertakeFraction * 100).toFixed(1)}%` +
        ` | ${(n.pulkTimeFraction * 100).toFixed(1)}%` +
        ` | ${n.pulkTriggersInWindow.toFixed(2)}` +
        ` | ${n.pulkTriggersOutOfWindow.toFixed(2)} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Diagnostic printer ───────────────────────────────────────────────────────
function printDiagnosticReport(diagSnapshots, trackName, racerType, durationSec, seed) {
  const lines = [];
  lines.push(`\n${'='.repeat(70)}`);
  lines.push(`Phase-2K v4 — Frame-by-Frame Diagnostic`);
  lines.push(`Track: ${trackName} | Racer: ${racerType} | Duration: ${durationSec}s | Seed: ${seed}`);
  lines.push('='.repeat(70));

  for (const snap of diagSnapshots) {
    lines.push(`\n── Snapshot t=${snap.timeS.toFixed(3)}s (actual: ${snap.actualTimeMs.toFixed(0)}ms) ──`);
    // Interval stats
    lines.push(
      `   Interval: ${snap.interval.lateralPushes} lateral pushes | ` +
      `${snap.interval.brakeActivations} brake activations | ` +
      `${snap.interval.newOvertakes} new v4 overtakes`
    );
    // Per-row summary
    const rows = new Map();
    for (const r of snap.racers) {
      if (!rows.has(r.row)) rows.set(r.row, []);
      rows.get(r.row).push(r);
    }
    for (const [rowIdx, racersInRow] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
      const ts     = racersInRow.map((r) => r.t);
      const avd    = racersInRow.filter((r) => r.avoidance).length;
      const v4Mults = racersInRow.map((r) => r.v4Mult).filter((m) => m !== 1.0);
      const v4Str  = v4Mults.length > 0 ? ` | v4Mult=${v4Mults[0].toFixed(4)}` : '';
      lines.push(
        `   Row ${rowIdx} (${racersInRow.length} racers): ` +
        `t=[${Math.min(...ts).toFixed(4)}, ${Math.max(...ts).toFixed(4)}]` +
        `${v4Str} | avoidance: ${avd}/${racersInRow.length}`
      );
    }
    // Brake-zone pairs grouped by row combination
    const bz = snap.brakeZonePairs;
    if (bz.length === 0) {
      lines.push(`   Brake-zone pairs (dT<0.015 AND |dY|<0.2): 0`);
    } else {
      const rowComboCount = new Map();
      for (const p of bz) {
        const key = `R${p.followerRow}→R${p.leaderRow}`;
        rowComboCount.set(key, (rowComboCount.get(key) ?? 0) + 1);
      }
      const comboStr = [...rowComboCount.entries()].map(([k, v]) => `${k}: ${v}`).join(', ');
      lines.push(`   Brake-zone pairs: ${bz.length} (${comboStr})`);
      // Show top 5 by dT (smallest gap = most likely to brake)
      const top = [...bz].sort((a, b) => a.dT - b.dT).slice(0, 5);
      for (const p of top) {
        lines.push(`     R${p.follower}(Row${p.followerRow}) → R${p.leader}(Row${p.leaderRow})  dT=${p.dT.toFixed(5)}  dY=${p.dY.toFixed(4)}`);
      }
    }
    // Close pairs (|dT|<0.005 AND |dY|<0.3)
    const cp = snap.closePairs;
    if (cp.length === 0) {
      lines.push(`   Close pairs (|dT|<0.005 AND |dY|<0.3): 0`);
    } else {
      lines.push(`   Close pairs: ${cp.length}`);
      for (const p of cp.slice(0, 5)) {
        lines.push(`     R${p.a}(Row${p.aRow}) ↔ R${p.b}(Row${p.bRow})  dT=${p.dT.toFixed(5)}  dY=${p.dY.toFixed(4)}`);
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('sim-fairness.mjs') ||
   process.argv[1].replace(/\\/g, '/').endsWith('scripts/sim-fairness.mjs'));

if (isMain) {
  const trackDataDir = join(ROOT, 'server/data/tracks');
  const trackFiles = ['dirt-oval', 'river-run', 'space-sprint', 'garden-path', 'city-circuit', 'mogcvuipw2y5'];

  console.log('\n=== sim-fairness — RaceArena Fairness Simulation ===');
  console.log(`Rennen pro Kombination : ${N_RACES}`);
  console.log(`Teilnehmer pro Rennen  : ${N_RACERS}`);
  console.log(`Racer-Typen            : ${Object.keys(RACER_CONFIGS).length}`);
  console.log(`Tracks                 : ${trackFiles.length}`);
  console.log(
    `Gesamt-Rennen          : ${N_RACES} × ${Object.keys(RACER_CONFIGS).length} × ${trackFiles.length} × ${DURATION_VARIANTS.length} = ` +
    `${N_RACES * Object.keys(RACER_CONFIGS).length * trackFiles.length * DURATION_VARIANTS.length}`
  );
  console.log(`Output                 : ${OUT_DIR}`);
  console.log(`Seed                   : ${GLOBAL_SEED > 0 ? GLOBAL_SEED + ' (deterministisch)' : '0 (Math.random, Exploration)'}`);
  console.log(`Race Plan              : ${RACE_PLAN_ACTIVE ? '✅ aktiv' : '❌ inaktiv (Baseline-Modus)'}`);
  if (TEF_ACTIVE) {
    console.log(`⚠️  Phase-2K TEF aktiv: α=${TEF_ALPHA} maxGap=${TEF_MAX_GAP} openOnly=${TEF_OPEN_ONLY}`);
    if (TEF_BASE_BONUS !== null) {
      console.log(`   v3: baseBonusOverride=${TEF_BASE_BONUS} für Rear-Rows, moduliert via tStart-Gap`);
    } else {
      console.log(`   v2: speedBonusMult wird bei Re-Rolls auf Basis tStart-Gap moduliert`);
    }
  }
  if (WARMUP_MS_OVERRIDE !== null) {
    console.log(`⚠️  Phase-2L: avoidanceWarmupMs=${WARMUP_MS_OVERRIDE} (Override; Default=${DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceWarmupMs})`);
  }
  if (V4_ACTIVE) {
    console.log(`⚠️  Phase-2K v4 aktiv: initBonus=${V4_INITIAL_BOOST} openOnly=true`);
    console.log(`   Metrik: ${V4_METRIC_TYPE}${V4_METRIC_TYPE === 'physical_overtake' ? ` (lateralProximity=${V4_LATERAL_PROXIMITY})` : ''}`);
    if (V4_METRIC_TYPE === 'per_racer' && (V4_ROW1_THRESHOLDS_RAW || V4_ROW_REST_THRESHOLDS_RAW)) {
      console.log(`   Row-1-Schwellen: ${V4_ROW1_THRESHOLDS.map((t) => t + '%').join(' → ')}`);
      console.log(`   Row-2+-Schwellen: ${V4_ROW2_THRESHOLDS.map((t) => t + '%').join(' → ')}`);
    } else {
      console.log(`   Schwellen: ${V4_THRESHOLDS.map((t) => t + '%').join(' → ')} Überholungen`);
    }
    console.log(`   Bonus-Schedule: ${V4_BOOST_SCHEDULE.join(' → ')}`);
    console.log(`   Übergänge: easeInOutCubic über ${DEFAULT_RACE_DYNAMICS_CONFIG.reRollTransitionDuration}s (wie Re-Roll)`);
  }
  console.log('');

  mkdirSync(OUT_DIR, { recursive: true });

  const BASE_SPEED_MIN  = DEFAULT_BASE_SPEED_CONFIG.min;
  const BASE_SPEED_MAX  = DEFAULT_BASE_SPEED_CONFIG.max;
  const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;
  const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
  const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
  const expectedMinSF   = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (N_RACERS + 1);
  const race_baseSpeed  = BASE_SPEED_MEAN / expectedMinSF;

  const allResults = [];
  const rawData    = [];
  const startTime  = Date.now();

  for (const trackId of trackFiles) {
    if (TRACK_FILTER && trackId !== TRACK_FILTER) continue;
    const trackPath = join(trackDataDir, `${trackId}.json`);
    if (!existsSync(trackPath)) {
      console.warn(`  [SKIP] Track nicht gefunden: ${trackPath}`);
      continue;
    }
    const track  = JSON.parse(readFileSync(trackPath, 'utf8'));
    const shape  = new EditorShape(track);
    const isOpen = !!shape.isOpen;
    const pathLengthPx       = track.pathLengthPx ?? shape.getTotalLength();
    const geometricTrackWidth = shape.getActualTrackWidth();
    const trackName = track.name ?? trackId;

    console.log(`── ${trackName} (${trackId}) — open=${isOpen} path=${Math.round(pathLengthPx)}px width=${Math.round(geometricTrackWidth)}px`);

    const trackSurfaces = track.surfaceClasses ?? [];
    for (const [racerType, cfg] of Object.entries(RACER_CONFIGS)) {
      if (RACER_FILTER && racerType !== RACER_FILTER) continue;
      // Skip racers incompatible with this track's surface (empty surfaceClasses = no restriction)
      if (cfg.surfaceClasses.length > 0 && trackSurfaces.length > 0 &&
          !cfg.surfaceClasses.some((s) => trackSurfaces.includes(s))) continue;
      const { speedMultiplier, displaySize } = cfg;

      for (const durationSec of DURATION_VARIANTS) {
        if (DUR_FILTER && durationSec !== Number(DUR_FILTER)) continue;
        const finishT = computeFinishT(race_baseSpeed, speedMultiplier, durationSec, isOpen);

        // Compute row count for this track/racer combo (for stats aggregation)
        const rowGapPx     = displaySize * DEFAULT_ROW_LAYOUT_CONFIG.rowGapMultiplier;
        const effectiveWidth = geometricTrackWidth * DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange;
        const racersPerRow = computeRacersPerRow(effectiveWidth, displaySize);
        // Estimate totalRows from layout (deterministic, seed-independent for count)
        const totalRows = Math.ceil(N_RACERS / Math.max(1, racersPerRow));

        process.stdout.write(
          `   ${racerType.padEnd(10)} ${durationSec}s  finishT=${finishT.toFixed(3)}  rows=${totalRows}  `
        );

        const raceResults   = [];
        const mixingQuotas  = [];
        const v4ThreshLogs  = [];
        for (let raceIdx = 0; raceIdx < N_RACES; raceIdx++) {
          // seed=0 → non-deterministic (exploration); seed>0 → reproducible batch
          const seed = GLOBAL_SEED > 0 ? (GLOBAL_SEED - 1) * N_RACES + raceIdx + 1 : 0;
          // Phase-3A: create Race Plan + TrajectoryController for this race when active
          let racePlanController = null;
          if (RACE_PLAN_ACTIVE) {
            const planRacers = computeRowLayout(N_RACERS, racersPerRow).assignments.map(
              (a) => ({ index: a.racerIndex, startRowIndex: a.rowIndex })
            );
            const plan = createRacePlan(planRacers, finishT, durationSec * 1000, {}, seed);
            racePlanController = createTrajectoryController(plan);
          }
          const result = runSingleRace({
            shape,
            pathLengthPx,
            geometricTrackWidth,
            isOpen,
            speedMultiplier,
            displaySize,
            finishT,
            targetSeconds: durationSec,
            seed,
            nRacers: N_RACERS,
            diagnosticMode: DIAG_MODE,
            behaviorConfigOverrides: WARMUP_MS_OVERRIDE !== null ? { avoidanceWarmupMs: WARMUP_MS_OVERRIDE } : {},
            racePlanController,
          });
          raceResults.push(result);
          if (result.mixingQuota != null) mixingQuotas.push(result.mixingQuota);
          if (result.v4ThreshLog != null) v4ThreshLogs.push(result.v4ThreshLog);
          if (DIAG_MODE && result.diagSnapshots) {
            const diagText = printDiagnosticReport(result.diagSnapshots, trackName, racerType, durationSec, seed);
            console.log(diagText);
            const diagPath = join(OUT_DIR, `diag-${trackId}-${racerType}-${durationSec}s-seed${seed}.json`);
            writeFileSync(diagPath, JSON.stringify({ trackId, trackName, racerType, durationSec, seed, snapshots: result.diagSnapshots }, null, 2));
            console.log(`Diagnostic JSON → ${diagPath}`);
          }

          // Collect raw data
          for (const r of result) {
            rawData.push({
              trackId,
              trackName,
              racerType,
              durationSec,
              finishT,
              seed,
              raceIdx,
              ...r,
            });
          }
        }

        const stats = computeFairnessStats(raceResults, totalRows);
        const avgMixingQuota = mixingQuotas.length > 0
          ? mixingQuotas.reduce((s, v) => s + v, 0) / mixingQuotas.length
          : null;
        // Aggregate naturalness metrics over all races in this combo
        const avgNaturalness = raceResults.length > 0 ? {
          meanJerk:               raceResults.reduce((s, r) => s + (r.naturalness?.meanJerk ?? 0), 0) / raceResults.length,
          maxJerkSpike:           Math.max(...raceResults.map((r) => r.naturalness?.maxJerkSpike ?? 0)),
          jerkFraction_high:      raceResults.reduce((s, r) => s + (r.naturalness?.jerkFraction_high ?? 0), 0) / raceResults.length,
          naturalOvertakeFraction: raceResults.reduce((s, r) => s + (r.naturalness?.naturalOvertakeFraction ?? 0), 0) / raceResults.length,
          pulkTimeFraction:       raceResults.reduce((s, r) => s + (r.naturalness?.pulkTimeFraction ?? 0), 0) / raceResults.length,
          pulkTriggersInWindow:   raceResults.reduce((s, r) => s + (r.naturalness?.pulkTriggersInWindow ?? 0), 0) / raceResults.length,
          pulkTriggersOutOfWindow: raceResults.reduce((s, r) => s + (r.naturalness?.pulkTriggersOutOfWindow ?? 0), 0) / raceResults.length,
          winnerBlockedFractionInOutcome: raceResults.reduce((s, r) => s + (r.naturalness?.winnerBlockedFractionInOutcome ?? 0), 0) / raceResults.length,
          planBiasDeltaMean:      raceResults.reduce((s, r) => s + (r.naturalness?.planBiasDeltaMean ?? 0), 0) / raceResults.length,
          pulkBiasEventCount:     raceResults.reduce((s, r) => s + (r.naturalness?.pulkBiasEventCount ?? 0), 0) / raceResults.length,
          racersInCorridorFraction: raceResults.reduce((s, r) => s + (r.naturalness?.racersInCorridorFraction ?? 0), 0) / raceResults.length,
          corridorViolationMean:  raceResults.reduce((s, r) => s + (r.naturalness?.corridorViolationMean ?? 0), 0) / raceResults.length,
          corridorViolationMax:   Math.max(...raceResults.map((r) => r.naturalness?.corridorViolationMax ?? 0)),
          bidirectionalBoostFraction: raceResults.reduce((s, r) => s + (r.naturalness?.bidirectionalBoostFraction ?? 0), 0) / raceResults.length,
          bidirectionalBrakeFraction: raceResults.reduce((s, r) => s + (r.naturalness?.bidirectionalBrakeFraction ?? 0), 0) / raceResults.length,
          racersBlockedInOutcome: raceResults.reduce((s, r) => s + (r.naturalness?.racersBlockedInOutcome ?? 0), 0) / raceResults.length,
        } : null;
        allResults.push({ trackId, trackName, racerType, durationSec, finishT, isOpen, stats, avgMixingQuota, avgNaturalness });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`χ²=${stats.chiSq.toFixed(1)} p=${stats.pValue.toFixed(3)} [${elapsed}s]`);

        // 1.5× gate: pass if every row win-rate is within [expected/1.5, expected×1.5]
        if (isOpen) {
          const expected1_5 = 1 / totalRows;
          const gatePass = stats.rowStats.every(
            (rs) => rs.winRate >= expected1_5 / 1.5 && rs.winRate <= expected1_5 * 1.5
          );
          const rateStr = stats.rowStats.map((rs) => `R${rs.rowIndex}=${(rs.winRate * 100).toFixed(0)}%`).join(' ');
          console.log(`     1.5×-Gate: ${gatePass ? '✅ PASS' : '❌ FAIL'}  (${rateStr}  erw.=${(expected1_5 * 100).toFixed(1)}%)`);
        }

        // Lite stats: avoidance activity and lateral dynamics
        if (isOpen && raceResults.length > 0) {
          const avgRow1Brake    = raceResults.reduce((s, r) => s + (r.liteRow1BrakeFrames ?? 0), 0) / raceResults.length;
          const avgRow0Brake    = raceResults.reduce((s, r) => s + (r.liteRow0BrakeFrames ?? 0), 0) / raceResults.length;
          const avgRow2Brake    = raceResults.reduce((s, r) => s + (r.liteRow2BrakeFrames ?? 0), 0) / raceResults.length;
          const avgLateralMoves = raceResults.reduce((s, r) => s + (r.liteLateralMoves ?? 0), 0) / raceResults.length;
          const avgRow1EverAhead = raceResults.reduce((s, r) => s + (r.liteRow1EverAheadCount ?? 0), 0) / raceResults.length;
          const rowSize0 = Math.ceil(N_RACERS / totalRows);
          const avgRerolls  = raceResults.reduce((s, r) => s + (r.avgRerollsPerRacer ?? 0), 0) / raceResults.length;
          const avgPhysDur  = raceResults.reduce((s, r) => s + (r.physicalDurationS ?? 0), 0) / raceResults.length;
          console.log(
            `     Avoidance: R0=${avgRow0Brake.toFixed(0)}Ø  R1=${avgRow1Brake.toFixed(0)}Ø  R2=${avgRow2Brake.toFixed(0)}Ø` +
            `  Lateral=${avgLateralMoves.toFixed(0)}Ø  R1≥1×vorne=${avgRow1EverAhead.toFixed(1)}/${rowSize0}Ø`
          );
          console.log(
            `     Re-Rolls: Ø ${avgRerolls.toFixed(1)} pro Racer  Physische Renndauer: Ø ${avgPhysDur.toFixed(1)}s` +
            `  (target=${durationSec}s)`
          );
          // Phase-3A: Naturalness metrics summary
          if (avgNaturalness) {
            console.log(
              `     Naturalness: jerk=${avgNaturalness.meanJerk.toFixed(4)}Ø  max=${avgNaturalness.maxJerkSpike.toFixed(4)}` +
              `  highFrac=${(avgNaturalness.jerkFraction_high * 100).toFixed(1)}%` +
              `  natOvt=${(avgNaturalness.naturalOvertakeFraction * 100).toFixed(1)}%` +
              `  pulk=${(avgNaturalness.pulkTimeFraction * 100).toFixed(1)}%` +
              `  pulkTrig=[${avgNaturalness.pulkTriggersInWindow.toFixed(1)}in/${avgNaturalness.pulkTriggersOutOfWindow.toFixed(1)}out]`
            );
            if (RACE_PLAN_ACTIVE) {
              console.log(
                `     M2v2: corridor=${(avgNaturalness.racersInCorridorFraction * 100).toFixed(1)}%` +
                `  viol=Ø${avgNaturalness.corridorViolationMean.toFixed(1)}/max${avgNaturalness.corridorViolationMax.toFixed(0)}` +
                `  boost=${(avgNaturalness.bidirectionalBoostFraction * 100).toFixed(1)}%` +
                `  brake=${(avgNaturalness.bidirectionalBrakeFraction * 100).toFixed(1)}%` +
                `  blocked=${(avgNaturalness.racersBlockedInOutcome * 100).toFixed(1)}%` +
                `  wBlocked=${(avgNaturalness.winnerBlockedFractionInOutcome * 100).toFixed(1)}%`
              );
            }
          }
          // per_racer: per-row bonus distribution at race end (all rows > 0)
          if (V4_ACTIVE && V4_METRIC_TYPE === 'per_racer') {
            const allRowIndices = [...new Set(
              raceResults.flatMap((r) => (r.v4PerRacerEndStats ?? []).map((s) => s.row))
            )].sort((a, b) => a - b);
            for (const rowIdx of allRowIndices) {
              const rowThresholds = rowIdx === 1 ? V4_ROW1_THRESHOLDS : V4_ROW2_THRESHOLDS;
              const all = raceResults.flatMap((r) => (r.v4PerRacerEndStats ?? []).filter((s) => s.row === rowIdx));
              if (all.length === 0) continue;
              const full    = all.filter((s) => s.threshIdx === 0).length;
              const partial = all.filter((s) => s.threshIdx > 0 && s.threshIdx < rowThresholds.length).length;
              const none    = all.filter((s) => s.threshIdx >= rowThresholds.length).length;
              const tot     = all.length;
              console.log(
                `     Row-${rowIdx} Bonus-End (N=${tot}): ` +
                `voll=${(full/tot*100).toFixed(0)}% (${full})  ` +
                `teilw=${(partial/tot*100).toFixed(0)}% (${partial})  ` +
                `kein=${(none/tot*100).toFixed(0)}% (${none})`
              );
            }
          }
        }

        // v4 diagnostics: per-threshold average crossing time + physical overtake counts
        if (V4_ACTIVE && isOpen && V4_METRIC_TYPE !== 'per_racer' && v4ThreshLogs.length > 0) {
          // Physical overtake summary
          const avgOvertakes   = raceResults.reduce((s, r) => s + (r.v4OvertakeCount   ?? 0), 0) / N_RACES;
          const avgNearBehind  = raceResults.reduce((s, r) => s + (r.v4NearBehindCount ?? 0), 0) / N_RACES;
          const avgPairOvt     = raceResults.reduce((s, r) => s + (r.v4PairOvertakes   ?? 0), 0) / N_RACES;
          console.log(
            `     v4 Physik (Ø pro Rennen): ${avgOvertakes.toFixed(1)} Row-1 mit Überholung, ` +
            `${avgPairOvt.toFixed(1)} Paar-Überholungen, ${avgNearBehind.toFixed(1)} near-behind-Paare`
          );
          // Threshold timing
          for (const thresh of V4_THRESHOLDS) {
            const times = v4ThreshLogs
              .map((log) => log.find((e) => e.threshold === thresh)?.timeS)
              .filter((t) => t != null);
            if (times.length > 0) {
              const avg = times.reduce((s, v) => s + v, 0) / times.length;
              const entry = v4ThreshLogs.find((log) => log.find((e) => e.threshold === thresh))
                ?.find((e) => e.threshold === thresh);
              console.log(
                `     v4 ${thresh}%-Schwelle: Ø ${avg.toFixed(1)}s ` +
                `(${times.length}/${N_RACES} Rennen) ` +
                `${entry ? entry.fromBonus + ' → ' + entry.toBonus : ''}`
              );
            } else {
              console.log(`     v4 ${thresh}%-Schwelle: nie erreicht`);
            }
          }
        }
        // per_racer: individual threshold timing per row (all rows > 0)
        if (V4_ACTIVE && isOpen && V4_METRIC_TYPE === 'per_racer') {
          const allRowIdxs = [...new Set(
            raceResults.flatMap((r) => (r.v4PerRacerEndStats ?? []).map((s) => s.row))
          )].sort((a, b) => a - b);
          for (const rowIdx of allRowIdxs) {
            const rowThresholds = rowIdx === 1 ? V4_ROW1_THRESHOLDS : V4_ROW2_THRESHOLDS;
            for (let ti = 0; ti < rowThresholds.length; ti++) {
              const thresh   = rowThresholds[ti];
              const allStats = raceResults.flatMap((r) => (r.v4PerRacerEndStats ?? []).filter((s) => s.row === rowIdx));
              const total    = allStats.length;
              const times    = allStats
                .filter((s) => s.threshTimes && s.threshTimes.length > ti)
                .map((s) => s.threshTimes[ti] / 1000);
              if (times.length > 0) {
                const avg = times.reduce((s, v) => s + v, 0) / times.length;
                const min = Math.min(...times);
                const max = Math.max(...times);
                console.log(
                  `     v4 per_racer Row-${rowIdx} ${thresh}%: Ø ${avg.toFixed(1)}s ` +
                  `(${times.length}/${total} Racer) min=${min.toFixed(1)}s max=${max.toFixed(1)}s`
                );
              } else {
                console.log(`     v4 per_racer Row-${rowIdx} ${thresh}%: nie erreicht`);
              }
            }
          }
        }
      }
    }
    console.log('');
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nSimulation abgeschlossen in ${totalElapsed}s`);

  // Write JSON
  const jsonPath = join(OUT_DIR, 'fairness-data.json');
  writeFileSync(jsonPath, JSON.stringify({ meta: { nRaces: N_RACES, nRacers: N_RACERS, durationVariants: DURATION_VARIANTS }, results: allResults, rawData }, null, 2));
  console.log(`JSON → ${jsonPath}`);

  // Write Markdown report
  const runDate = new Date().toISOString().slice(0, 10);
  const report  = buildReport(allResults, runDate);
  const mdPath  = join(OUT_DIR, 'fairness-report.md');
  writeFileSync(mdPath, report);
  console.log(`Bericht → ${mdPath}`);

  // Print quick summary
  const unfair = allResults.filter((r) => r.stats.pValue < 0.05);
  console.log(`\n=== Zusammenfassung ===`);
  console.log(`Kombinationen gesamt : ${allResults.length}`);
  console.log(`Fair (p≥0.05)        : ${allResults.length - unfair.length}`);
  console.log(`Unfair (p<0.05)      : ${unfair.length}`);
  if (unfair.length > 0) {
    console.log('\nUnfaire Kombinationen:');
    for (const r of unfair) {
      const r0 = r.stats.rowStats[0];
      const exp = 1 / r.stats.totalRows;
      console.log(`  ${r.trackName} × ${r.racerType} × ${r.durationSec}s  Row0=${fmtPct(r0?.winRate ?? 0)} (erw. ${fmtPct(exp)})  p=${r.stats.pValue.toFixed(3)}`);
    }
  }
}
