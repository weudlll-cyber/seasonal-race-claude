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
const N_RACES        = Number(argVal('races', '50'));
const N_RACERS       = Number(argVal('racers', '40'));
// --openRacers / --closedRacers: per-topology racer count (Phase-1 matrix).
// Fall back to N_RACERS when not specified so existing --racers= still works.
const N_RACERS_OPEN   = Number(argVal('openRacers',   String(N_RACERS)));
const N_RACERS_CLOSED = Number(argVal('closedRacers', String(N_RACERS)));
const OUT_DIR        = join(ROOT, argVal('out', 'client/tmp'));
const TRACK_FILTER   = argVal('track', null);   // e.g. --track=river-run
const RACER_FILTER   = argVal('racer', null);   // e.g. --racer=horse
const DUR_FILTER     = argVal('dur', null);     // e.g. --dur=30

// ── Phase-3A: global seed + Race Plan activation ──────────────────────────────
// --seed=<n>  n>0: deterministic batch (race i uses seed (n-1)*N_RACES+i+1)
//             n=0 (default): non-deterministic (Math.random()), exploration only
// --race-plan=true|false  (default false): activate Race Plan controller
// --bonusMult=<x>  Bereichs-Bonus strength multiplier (default 1.0 = original values)
// Race Plan timing (fraction of race duration, mirroring racePlanBonusTransitionEnd etc. in defaults.js)
const GLOBAL_SEED             = Number(argVal('seed', '0'));
const RACE_PLAN_ACTIVE        = argVal('race-plan', 'false') === 'true';
const BONUS_MULT              = Number(argVal('bonusMult',            '1.0'));
const RP_BONUS_TRANSITION_END = Number(argVal('bonusTransitionEnd',   '0.75'));
const RP_BONUS_FADE_MS        = Number(argVal('bonusFadeDuration',    '1500'));
const RP_CORRIDOR_START       = Number(argVal('corridorStart',        '0.55'));
const RP_CORRIDOR_END         = Number(argVal('corridorEnd',          '0.95'));

// ── Phase-3B: COMEBACK analysis mode ─────────────────────────────────────────
const COMEBACK_ANALYSIS = argVal('comeback-analysis', 'false') === 'true';
const CB_MIN_POSITIONS  = Number(argVal('cbMinPositions', '3'));
const CB_WINDOW_SEC     = Number(argVal('cbWindowSec', '5'));
const CB_ENDGAME_THRESH = Number(argVal('cbEndgameThresh', '0.85'));

// ── Rubber-band catch-up (mirrors DEFAULT_RUBBER_BAND_CONFIG in browser) ─────
// Default true = matches game default (enabled:true). Use --rubber-band=false to disable.
const RUBBER_BAND_ACTIVE   = argVal('rubber-band', 'true') !== 'false';
const RB_FLAT_BOOST        = Number(argVal('rbFlatBoost',        '0.10'));
const RB_GAP_THRESHOLD     = Number(argVal('rbGapThreshold',     '0.003'));
const RB_RAMP_MS           = Number(argVal('rbRampMs',           '2000'));
const RB_ENDGAME_THRESHOLD = Number(argVal('rbEndgameThreshold', '0.9'));

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
// --behavior='{"lateralForce":0.016,"lateralDamping":0.30}' — JSON object merged into behaviorConfig
const BEHAVIOR_OVERRIDE_RAW = argVal('behavior', null);
const BEHAVIOR_OVERRIDE = BEHAVIOR_OVERRIDE_RAW ? (() => {
  try { return JSON.parse(BEHAVIOR_OVERRIDE_RAW); }
  catch { console.error('⚠️  --behavior: invalid JSON, ignoring'); return {}; }
})() : {};

// ── Phase-2K v4: diagnostic snapshot mode ────────────────────────────────────
const DIAG_MODE         = argVal('diagnosticMode', null) === 'true';
const DIAG_SNAP_TIMES_S = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 2.0, 5.0];

// ── Game modules (same code the browser uses) ─────────────────────────────────
import { EditorShape } from '../client/src/modules/track-editor/EditorShape.js';
import { applyRacerBehavior, initRacerBehavior } from '../client/src/modules/raceBehavior.js';
import {
  computeEvenRowLayout,
  computeRacerLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
} from '../client/src/modules/rowLayout.js';
import { REFERENCE_FPS, computeSpeedScaleFactor, computeClosedTrackSsf } from '../client/src/modules/camera/lapUtils.js';
import {
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
} from '../client/src/modules/storage/defaults.js';
import { computeEffectiveBrakeFactor } from '../client/src/modules/raceBehaviorConfig.js';
import { createRacePlan, createTrajectoryController } from '../client/src/modules/racePlanner.js';
import { DEFAULT_AUTO_SCALE_CONFIG } from '../client/src/modules/autoSpriteScale.js';

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
// speedMultiplier, displaySize, bodyFillX, bodyFillY sourced from *RacerType.js files.
// displaySize affects racersPerRow (track capacity) and avoidance pixel distances.
// bodyFillX/Y: fraction of frame occupied by body pixels (measured from spritesheet).
// surfaceClasses mirrors each *RacerType.js — used to filter racers by track surface.
export const RACER_CONFIGS = {
  horse:      { speedMultiplier: 1.00, displaySize: 47, bodyFillX: 0.353, bodyFillY: 0.800, surfaceClasses: ['sand', 'earth', 'grass', 'asphalt', 'snow', 'mud'] },
  duck:       { speedMultiplier: 0.85, displaySize: 36, bodyFillX: 0.875, bodyFillY: 0.875, surfaceClasses: ['water', 'grass'] },
  snail:      { speedMultiplier: 0.30, displaySize: 35, bodyFillX: 0.727, bodyFillY: 0.938, surfaceClasses: ['grass'] },
  elephant:   { speedMultiplier: 0.60, displaySize: 44, bodyFillX: 0.539, bodyFillY: 0.938, surfaceClasses: ['sand', 'earth', 'grass'] },
  giraffe:    { speedMultiplier: 0.90, displaySize: 48, bodyFillX: 0.271, bodyFillY: 0.767, surfaceClasses: ['sand', 'earth', 'grass'] },
  snake:      { speedMultiplier: 0.75, displaySize: 44, bodyFillX: 0.374, bodyFillY: 0.806, surfaceClasses: ['sand', 'earth', 'grass'] },
  dragon:     { speedMultiplier: 1.10, displaySize: 50, bodyFillX: 0.836, bodyFillY: 0.898, surfaceClasses: ['air', 'asphalt', 'earth', 'water'] },
  f1:         { speedMultiplier: 1.20, displaySize: 38, bodyFillX: 0.555, bodyFillY: 0.953, surfaceClasses: ['asphalt'] },
  rocket:     { speedMultiplier: 1.25, displaySize: 47, bodyFillX: 0.278, bodyFillY: 0.801, surfaceClasses: ['air', 'water'] },
  buggy:      { speedMultiplier: 0.95, displaySize: 38, bodyFillX: 0.844, bodyFillY: 0.875, surfaceClasses: ['sand', 'earth', 'mud'] },
  motorbike:  { speedMultiplier: 1.05, displaySize: 42, bodyFillX: 0.400, bodyFillY: 0.800, surfaceClasses: ['asphalt', 'earth'] },
  plane:      { speedMultiplier: 1.15, displaySize: 42, bodyFillX: 0.836, bodyFillY: 0.930, surfaceClasses: ['air'] },
  luge:       { speedMultiplier: 1.10, displaySize: 80, bodyFillX: 0.313, bodyFillY: 0.641, surfaceClasses: ['ice', 'snow'] },
  beetle:     { speedMultiplier: 0.90, displaySize: 38, bodyFillX: 0.398, bodyFillY: 0.672, surfaceClasses: ['asphalt', 'cobble', 'earth'] },
  boarder:    { speedMultiplier: 1.00, displaySize: 40, bodyFillX: 0.398, bodyFillY: 0.719, surfaceClasses: ['asphalt', 'cobble', 'earth'] },
  koi:        { speedMultiplier: 0.95, displaySize: 52, bodyFillX: 0.578, bodyFillY: 0.914, surfaceClasses: ['water'] },
  turtle:     { speedMultiplier: 0.85, displaySize: 48, bodyFillX: 0.578, bodyFillY: 0.734, surfaceClasses: ['water'] },
  manta:      { speedMultiplier: 1.10, displaySize: 56, bodyFillX: 0.633, bodyFillY: 0.805, surfaceClasses: ['water'] },
  dolphin:    { speedMultiplier: 1.15, displaySize: 52, bodyFillX: 0.402, bodyFillY: 0.887, surfaceClasses: ['water'] },
  snowmobile: { speedMultiplier: 1.10, displaySize: 52, bodyFillX: 0.459, bodyFillY: 0.797, surfaceClasses: ['snow', 'ice', 'earth'] },
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
 * @param {number}  [p.bodyFillX=0.75]     body width / frameWidth (from spritesheet measurement)
 * @param {number}  [p.bodyFillY=0.75]     body height / frameHeight (from spritesheet measurement)
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
  bodyFillX = 0.75,
  bodyFillY = 0.75,
  finishT,
  targetSeconds,
  seed,
  nRacers,
  diagnosticMode = false,
  behaviorConfigOverrides = {},
  racePlanController = null,   // Phase-3A: TrajectoryController instance or null
  comebackAnalysisConfig = null,  // Phase-3B: { b1Indices, minPositions, windowSec, endgameThresh }
  frameHook = null,            // diag: called after applyRacerBehavior each frame — (raceTs, diagOut, racers)
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
    // Closed tracks: closedSsf normalizes race_baseSpeed by path length so all closed tracks
    // produce comparable on-screen speeds — mirrors the closedSsf change in RaceScreen/index.jsx.
    const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
    const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
    const expectedMinSF   = spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (nRacers + 1);
    const closedSsf       = isOpen ? 1 : computeClosedTrackSsf(pathLengthPx);
    const race_baseSpeed  = isOpen
      ? finishT / (REFERENCE_FPS * targetSeconds * expectedMinSF * speedMultiplier)
      : BASE_SPEED_MEAN / (expectedMinSF * closedSsf);

    // Row layout — mirrors browser's bottom-up computeRacerLayout path (Sim adjusted to match)
    const effectiveWidth      = geometricTrackWidth * behaviorConfig.startSpreadRange;
    const { spriteSize: effectiveDisplaySize, rowCount } = computeRacerLayout(effectiveWidth, nRacers, displaySize, DEFAULT_AUTO_SCALE_CONFIG);
    const rowGapPx            = effectiveDisplaySize * rowConfig.rowGapMultiplier;
    const deltaT              = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;
    const rowLayout           = computeEvenRowLayout(nRacers, rowCount);

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
        spriteWorldSizePx:      effectiveDisplaySize,
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
        trajectoryMult:           1.0, // Phase-3A: smoothed by easeInOutCubic transition; 1.0 when Race Plan inactive
        trajectoryMultTarget:     1.0,
        trajectoryMultPrev:       1.0,
        trajectoryMultTransStart: 0,
        bereichsBonusMult:        1.0, // Phase-3A: set by controller.update(); 1.0 when Race Plan inactive
        rubberBandMult:           1.0,
        rubberBandMultPrev:       1.0,
        rubberBandMultTarget:     1.0,
        rubberBandTransStart:     0,
        rbActivatedThisRace:      false,
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

    // ── Phase-3B: COMEBACK rank tracking state ────────────────────────────────
    const cbCfg            = comebackAnalysisConfig;
    const cbRankHistory    = cbCfg ? new Map() : null; // b1Idx → [{ts, rank}]
    const cbLastTriggerTs  = cbCfg ? new Map() : null; // b1Idx → last trigger raceTs (ms)
    let   cbOutcomeStartMs = null;
    let   cbOutcomeEndMs   = null;
    let   cbEndgameStartMs = null;
    const cbTriggers       = cbCfg ? [] : null;
    const cbMaxGainByRacer = cbCfg ? new Map() : null;

    // ── Lightweight per-race stats (always collected, low overhead) ───────────
    let liteRow1BrakeFrames = 0;  // racer-frames where startRowIndex=1 AND avoidanceActive
    let liteRow0BrakeFrames = 0;  // racer-frames where startRowIndex=0 AND avoidanceActive
    let liteRow2BrakeFrames = 0;  // racer-frames where startRowIndex=2 AND avoidanceActive
    let liteLateralMoves    = 0;  // racer-frames where |physicalY delta| > 1e-4
    const liteRow1EverAhead = new Set(); // row-1 racer indices that at any point had t > some row-0 t
    let litePrevPhysY       = null;
    // Overlap thresholds: 10% of body diameter in normalised track-space.
    // bodyDiameterX/Y are in world pixels; divide by track dimensions to get normalised units.
    const bodyDiameterX       = displaySize * bodyFillX;
    const bodyDiameterY       = displaySize * bodyFillY;
    const overlapThreshold_t  = 0.10 * bodyDiameterY / pathLengthPx;
    const overlapThreshold_y  = 0.10 * bodyDiameterX / geometricTrackWidth;

    // Lateral quality metrics
    let liteOverlapPairFrames    = 0;   // pair-frames with |dT|<overlapThreshold_t AND |dY|<overlapThreshold_y
    let liteOverlapPairTotal     = 0;   // total pair-frames checked
    // Honest overlap metric: actual body-extent collision (Step 2).
    // Uses effectiveDisplaySize (auto-scaled sprite size) × bodyFillX/Y.
    // Lateral body (half-span each): effectiveDisplaySize × bodyFillX
    // Longitudinal body (half-span each): effectiveDisplaySize × bodyFillY
    // Overlap fires when both axes touch simultaneously.
    // For closed tracks: t is wrapped mod finishT so lapping pairs are correctly detected.
    const honestBodyLong  = effectiveDisplaySize * bodyFillY;   // px
    const honestBodyLat   = effectiveDisplaySize * bodyFillX;   // px
    let honestOverlapPairFrames = 0;
    let honestOverlapPairTotal  = 0;
    // Lapping instrumentation (closed tracks only, Part 1 verification):
    // maxRealSpread: max(t_leading - t_trailing) seen during the race, in laps (1.0 = one full lap).
    // honestSameLapFrames: honest overlap where |ra.t - rb.t| < 1.0 (same or seam-adjacent lap).
    // honestCrossLapFrames: honest overlap where |ra.t - rb.t| >= 1.0 (genuine lapping: 1+ lap ahead).
    let maxRealSpread        = 0;
    let honestSameLapFrames  = 0;
    let honestCrossLapFrames = 0;
    let liteZigzagSum            = 0;   // sum of |physicalYVelocity change| per racer-frame (after 4s)
    let liteZigzagFrames         = 0;   // racer-frames counted for zigzag (after 4s warmup)
    let litePrevPhysYVel         = null;// previous physicalYVelocity per racer index
    const liteOverlapPairState   = new Map(); // pairKey → consecutive overlapping frame count
    let liteOverlapResolutionSum = 0;   // sum of resolved overlap-run lengths (frames)
    let liteOverlapResolutionN   = 0;   // count of resolved overlap runs
    // New metrics: lateralSpeedScore, brakeRate, stableOvertakes
    let liteLatSpeedSum          = 0;   // sum of |physicalYVelocity| per active racer-frame (after 4s)
    let liteLatSpeedFrames       = 0;
    let liteBrakeSum             = 0;   // racer-frames where avoidanceActive=true (after 4s)
    let liteBrakeFrames          = 0;
    // brakeMatchFailureCount: events where brake-to-match is engaged (brakeMatchFactor<1)
    // but the trailer still out-advances its locked leader for 5 consecutive frames while
    // both remain in the longitudinal brake zone (report 06 §7 metric).
    let brakeMatchFailureCount   = 0;
    let brakeMatchLeaderBraked   = 0; // bypass events where the leader was itself braked (bmFactor<1)
    const brakeMatchFailState    = new Map(); // pairKey → consecutive qualifying frames
    // stableOvertakes: confirmed lead-swaps (3s+ duration) in 20%–80% of race, per racer
    const SO_CONFIRM_FRAMES      = Math.round(3000 / DT); // 3 s at 60 fps ≈ 180 frames
    const soPairLeader           = new Map(); // pairKey → currentLeaderIdx
    const soPairSince            = new Map(); // pairKey → consecutive frames at current lead
    const soPairConfirmed        = new Map(); // pairKey → confirmed (≥3s) leader idx
    let soCount                  = 0;

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
    // Δ5s ring buffers: track trajectoryMult during OUTCOME; detect controller oscillation
    const TM_RING_SIZE = 313; // ≈5s at 16ms/step
    const tmRings = new Map(); // racerIndex → { buf: Float32Array, idx: number }
    let natOvertakeCount = 0, natNaturalOvertakeCount = 0;
    let natPulkFrames = 0, natStableFrames = 0;
    let natPulkWasActive = false;
    let natPulkTriggersInWindow = 0, natPulkTriggersOutOfWindow = 0;

    // frameHook support: reusable Map cleared before each applyRacerBehavior call
    const _frameDiagOut = frameHook ? new Map() : null;

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

      // ── Controller-Pass: write trajectoryMultTarget (Race Plan only) ────────
      if (racePlanController) {
        racePlanController.update(racers, raceTs);
        // easeInOutCubic transition — mirrors index.jsx pattern, same parameters
        const TT_DUR_MS = dynamicsConfig.trajectoryTransitionDuration * 1000;
        for (const r of racers) {
          const elapsed = raceTs - r.trajectoryMultTransStart;
          r.trajectoryMult =
            elapsed < TT_DUR_MS
              ? r.trajectoryMultPrev +
                (r.trajectoryMultTarget - r.trajectoryMultPrev) *
                  easeInOutCubic(elapsed / TT_DUR_MS)
              : r.trajectoryMultTarget;
        }
      } else {
        for (const r of racers) r.trajectoryMult = 1.0;
      }

      // ── Rubber-band: flat catch-up boost for all non-leaders (mirrors index.jsx) ──
      if (RUBBER_BAND_ACTIVE) {
        let leaderT = -Infinity;
        for (const r of racers) { if (!r.finished && r.t > leaderT) leaderT = r.t; }
        const leaderProgress = leaderT > -Infinity ? leaderT / finishT : 0;
        if (leaderT > -Infinity && leaderProgress < RB_ENDGAME_THRESHOLD) {
          let secondT = -Infinity;
          for (const r of racers) {
            if (!r.finished && r.t < leaderT && r.t > secondT) secondT = r.t;
          }
          const leaderGap = secondT > -Infinity ? (leaderT - secondT) / finishT : 0;
          const boostActive = leaderGap > RB_GAP_THRESHOLD;
          for (const r of racers) {
            if (r.finished) { r.rubberBandMult = 1.0; continue; }
            const isLeader = r.t === leaderT;
            const newTarget = !isLeader && boostActive ? 1.0 + RB_FLAT_BOOST : 1.0;
            if (Math.abs(newTarget - r.rubberBandMultTarget) > 0.001) {
              r.rubberBandMultPrev = r.rubberBandMult;
              r.rubberBandMultTarget = newTarget;
              r.rubberBandTransStart = raceTs;
            }
            const el = raceTs - r.rubberBandTransStart;
            r.rubberBandMult = el < RB_RAMP_MS
              ? r.rubberBandMultPrev + (r.rubberBandMultTarget - r.rubberBandMultPrev) * easeInOutCubic(el / RB_RAMP_MS)
              : r.rubberBandMultTarget;
            if (r.rubberBandMult > 1.001) r.rbActivatedThisRace = true;
          }
        }
      }

      // ── Δ5s ring buffers: sample trajectoryMult during OUTCOME for oscillation detection ──
      if (racePlanController && racePlanController.getPhase(raceTs) === 'OUTCOME') {
        for (const r of racers) {
          if (r.finished) continue;
          let ring = tmRings.get(r.index);
          if (!ring) {
            ring = { buf: new Float32Array(TM_RING_SIZE).fill(1.0), idx: 0 };
            tmRings.set(r.index, ring);
          }
          ring.buf[ring.idx % TM_RING_SIZE] = r.trajectoryMult;
          ring.idx++;
        }
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
          // Sim-Browser Parity: mirror the Step-1 min() from index.jsx so the sim
          // accurately reflects brake-to-match behavior (report 07 parity fix).
          const brake = r.avoidanceActive
            ? Math.min(effectiveBrakeFactor, r.brakeMatchFactor ?? effectiveBrakeFactor)
            : 1.0;
          // TEF v3: scale down the aggressive bonus proportionally as racer closes the tStart gap.
          let tefMult = 1.0;
          if (TEF_ACTIVE && TEF_BASE_BONUS !== null && (!TEF_OPEN_ONLY || isOpen) && r.initialGap > 0) {
            const curGap   = tefMeanT0 - r.t;
            const gapRatio = Math.max(0, Math.min(1, curGap / r.initialGap));
            const targetBonusMult = 1.0 + (r.initialSpeedBonusMult - 1.0) * gapRatio;
            tefMult = targetBonusMult / r.initialSpeedBonusMult;
          }
          // trajectoryMult + bereichsBonusMult: both 1.0 when Race Plan inactive
          r.t +=
            r.baseSpeed * boost * brake * tefMult * r.v4BonusMult * r.trajectoryMult * r.bereichsBonusMult * r.rubberBandMult * (DT / 16);
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

      // Phase-3B: COMEBACK rank tracking (during OUTCOME phase)
      if (cbCfg && racePlanController) {
        const phase     = racePlanController.getPhase(raceTs);
        const isOutcome = phase === 'OUTCOME';

        if (isOutcome && cbOutcomeStartMs === null)                              cbOutcomeStartMs = raceTs;
        if (!isOutcome && cbOutcomeStartMs !== null && cbOutcomeEndMs === null)  cbOutcomeEndMs   = raceTs;

        if (cbEndgameStartMs === null) {
          let leaderT = -Infinity;
          for (const r of racers) { if (!r.finished && r.t > leaderT) leaderT = r.t; }
          if (finishT > 0 && leaderT / finishT >= cbCfg.endgameThresh) cbEndgameStartMs = raceTs;
        }

        if (isOutcome) {
          const active  = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
          const rankMap = new Map(active.map((r, i) => [r.index, i + 1]));
          const windowMs = cbCfg.windowSec * 1000;
          const cutoff   = raceTs - windowMs;

          for (const b1Idx of cbCfg.b1Indices) {
            const racer = racers[b1Idx];
            if (!racer || racer.finished) continue;
            const currentRank = rankMap.get(b1Idx) ?? 999;
            if (!cbRankHistory.has(b1Idx)) cbRankHistory.set(b1Idx, []);
            const hist = cbRankHistory.get(b1Idx);
            hist.push({ ts: raceTs, rank: currentRank });
            while (hist.length > 1 && hist[0].ts < cutoff) hist.shift();

            if (hist.length >= 2) {
              const gain = hist[0].rank - currentRank; // positive = positions gained
              if (gain > (cbMaxGainByRacer.get(b1Idx) ?? 0)) cbMaxGainByRacer.set(b1Idx, gain);
              if (gain >= cbCfg.minPositions) {
                const lastTs = cbLastTriggerTs.get(b1Idx) ?? -Infinity;
                if (raceTs - lastTs > windowMs) {
                  cbTriggers.push({ ts: raceTs / 1000, racerIdx: b1Idx, name: racer.name, gain });
                  cbLastTriggerTs.set(b1Idx, raceTs);
                }
              }
            }
          }
        }
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
      if (frameHook) _frameDiagOut.clear();
      applyRacerBehavior(racers, behaviorConfig, undefined, _frameDiagOut);
      if (frameHook) frameHook(raceTs, _frameDiagOut, racers);
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
        // Lateral quality: zigzag score (avg |Δv| per racer-frame, after 4s warmup)
        // Measures jerk-like lateral oscillation: large when params cause oscillation,
        // near-zero when motion is smooth. Sign reversals alone are misleading in a
        // dense pack since avoidance interactions cause frequent small-amplitude
        // direction changes even with well-tuned parameters.
        if (litePrevPhysYVel && raceTs > 4000) {
          for (let ri = 0; ri < racers.length; ri++) {
            if (!racers[ri].finished) {
              liteZigzagSum += Math.abs((racers[ri].physicalYVelocity ?? 0) - litePrevPhysYVel[ri]);
              liteZigzagFrames++;
            }
          }
        }
        if (!litePrevPhysYVel) litePrevPhysYVel = new Array(racers.length).fill(0);
        for (let ri = 0; ri < racers.length; ri++) litePrevPhysYVel[ri] = racers[ri].physicalYVelocity ?? 0;
        // Lateral quality: overlap rate + resolution
        // Skip the first 4 s — start-phase packing always produces overlaps before
        // avoidance kicks in; counting them would inflate overlapRate artificially.
        if (raceTs > 4000) for (let a = 0; a < racers.length; a++) {
          if (racers[a].finished) continue;
          for (let b = a + 1; b < racers.length; b++) {
            if (racers[b].finished) continue;
            const ra = racers[a], rb = racers[b];
            const dY = Math.abs(ra.physicalY - rb.physicalY);
            const dT = Math.abs(ra.t - rb.t);
            const pairKey = ra.index * 100 + rb.index;
            liteOverlapPairTotal++;
            if (dT < overlapThreshold_t && dY < overlapThreshold_y) {
              liteOverlapPairFrames++;
              liteOverlapPairState.set(pairKey, (liteOverlapPairState.get(pairKey) ?? 0) + 1);
            } else if (liteOverlapPairState.has(pairKey)) {
              liteOverlapResolutionSum += liteOverlapPairState.get(pairKey);
              liteOverlapResolutionN++;
              liteOverlapPairState.delete(pairKey);
            }
          }
        }
        // Honest overlap: body-extent check (all pairs, open + closed, after 4s warmup).
        // dT_px: path-pixel gap along track (wraps for closed tracks so lapping is detected).
        // dY_px: lateral pixel gap (physicalY × trackWidth/2).
        // Fires when both rendered bodies physically overlap or touch.
        if (raceTs > 4000) for (let a = 0; a < racers.length; a++) {
          if (racers[a].finished) continue;
          for (let b = a + 1; b < racers.length; b++) {
            if (racers[b].finished) continue;
            const ra = racers[a], rb = racers[b];
            // Closed tracks: wrap by 1.0 (one lap), not finishT (which is several laps).
            // tPos = ((t % 1) + 1) % 1 gives the racer's position within the current lap.
            // Two racers at the same tPos are visually co-located even if on different laps.
            let dT_px;
            if (isOpen) {
              dT_px = Math.abs(ra.t - rb.t) * pathLengthPx;
            } else {
              const tPosA = ((ra.t % 1) + 1) % 1;
              const tPosB = ((rb.t % 1) + 1) % 1;
              const dtNorm = Math.abs(tPosA - tPosB);
              dT_px = Math.min(dtNorm, 1 - dtNorm) * pathLengthPx;
            }
            const dY_px  = Math.abs(ra.physicalY - rb.physicalY) * geometricTrackWidth / 2;
            honestOverlapPairTotal++;
            if (dT_px < honestBodyLong && dY_px < honestBodyLat) {
              honestOverlapPairFrames++;
              if (!isOpen) {
                // Decompose: same-lap (|Δt| < 1.0) vs genuine lapping (|Δt| ≥ 1.0).
                if (Math.abs(ra.t - rb.t) >= 1.0) honestCrossLapFrames++;
                else honestSameLapFrames++;
              }
            }
          }
        }
        // brakeMatchFailureCount: open-track pass-through telemetry (after 4s warmup).
        // Fires when brake-to-match is engaged on a trailer AND the trailer still advances
        // faster than its locked leader for 5 consecutive frames while in the brake zone.
        // natPrevT (saved at line 676 before the t-update) gives the previous t for delta.
        if (raceTs > 4000 && isOpen) {
          for (let ri = 0; ri < racers.length; ri++) {
            const trailer = racers[ri];
            if (trailer.finished) continue;
            if (!(trailer.brakeMatchFactor < 1.0)) { brakeMatchFailState.delete(trailer.index * 10000); continue; }
            const leaderIdx = trailer.brakeMatchLeaderIndex;
            if (leaderIdx === -1) continue;
            let leader = null;
            for (let lj = 0; lj < racers.length; lj++) {
              if (racers[lj].index === leaderIdx && !racers[lj].finished) { leader = racers[lj]; break; }
            }
            if (!leader) continue;
            // Longitudinal zone check: same dynamicBrakeT gate as raceBehavior.js.
            const sizeT = (trailer.visibleWidthPx ?? 0) > 0 && pathLengthPx > 0
              ? (trailer.visibleWidthPx / pathLengthPx) * behaviorConfig.speedBrakeTMultiplier
              : 0.014;
            const dT = Math.abs(trailer.t - leader.t);
            if (dT > sizeT) { brakeMatchFailState.delete(trailer.index * 10000 + leaderIdx); continue; }
            // 1-frame advance delta: natPrevT holds t before the t-update this frame.
            const trailerDelta = trailer.t - (natPrevT.get(trailer.index) ?? trailer.t);
            const leaderDelta  = leader.t  - (natPrevT.get(leader.index)  ?? leader.t);
            const pairKey = trailer.index * 10000 + leaderIdx;
            if (trailerDelta > leaderDelta) {
              const consec = (brakeMatchFailState.get(pairKey) ?? 0) + 1;
              if (consec >= 5) {
                brakeMatchFailureCount++;
                // Diagnostic: is the leader avoidanceActive (receiving the floor brake)?
                // The primary bypass: cap = leaderRawSpeed but leader advances at
                // 0.945 × leaderRawSpeed → trailer systematically out-advances leader.
                if (leader.avoidanceActive) brakeMatchLeaderBraked++;
                brakeMatchFailState.set(pairKey, 0); // reset after counting event
              } else {
                brakeMatchFailState.set(pairKey, consec);
              }
            } else {
              brakeMatchFailState.delete(pairKey);
            }
          }
        }

        // Track max real progress spread (closed tracks, for lapping verification)
        if (!isOpen && raceTs > 4000) {
          let tMin = Infinity, tMax = -Infinity;
          for (const r of racers) {
            if (r.finished) continue;
            if (r.t < tMin) tMin = r.t;
            if (r.t > tMax) tMax = r.t;
          }
          if (tMax > tMin) {
            const spread = tMax - tMin;
            if (spread > maxRealSpread) maxRealSpread = spread;
          }
        }
        // lateralSpeedScore + brakeRate (after 4 s warmup)
        if (raceTs > 4000) {
          for (let ri = 0; ri < racers.length; ri++) {
            if (!racers[ri].finished) {
              liteLatSpeedSum += Math.abs(racers[ri].physicalYVelocity ?? 0);
              liteLatSpeedFrames++;
              if (racers[ri].avoidanceActive) liteBrakeSum++;
              liteBrakeFrames++;
            }
          }
        }
        // stableOvertakes: confirmed lead-swaps between 20%–80% of race
        {
          const durMs = targetSeconds * 1000;
          if (raceTs >= durMs * 0.2 && raceTs <= durMs * 0.8) {
            for (let a = 0; a < racers.length; a++) {
              if (racers[a].finished) continue;
              for (let b = a + 1; b < racers.length; b++) {
                if (racers[b].finished) continue;
                const pairKey  = racers[a].index * 100 + racers[b].index;
                const curLeader = racers[a].t >= racers[b].t ? racers[a].index : racers[b].index;
                const prevLeader = soPairLeader.get(pairKey);
                if (prevLeader === undefined) {
                  soPairLeader.set(pairKey, curLeader);
                  soPairSince.set(pairKey, 1);
                } else if (prevLeader === curLeader) {
                  const newSince = (soPairSince.get(pairKey) ?? 0) + 1;
                  soPairSince.set(pairKey, newSince);
                  if (newSince >= SO_CONFIRM_FRAMES && soPairConfirmed.get(pairKey) !== curLeader) {
                    if (soPairConfirmed.has(pairKey)) soCount++;
                    soPairConfirmed.set(pairKey, curLeader);
                  }
                } else {
                  soPairLeader.set(pairKey, curLeader);
                  soPairSince.set(pairKey, 1);
                }
              }
            }
          }
        }
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

    // Flush any overlap runs still open at race end
    for (const [, count] of liteOverlapPairState) {
      liteOverlapResolutionSum += count;
      liteOverlapResolutionN++;
    }
    liteOverlapPairState.clear();

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
      rbActivated:   r.rbActivatedThisRace,
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
    results.liteRow1EverAheadCount       = liteRow1EverAhead.size;
    results.liteOverlapRate              = liteOverlapPairTotal > 0 ? liteOverlapPairFrames / liteOverlapPairTotal : 0;
    results.honestOverlapRate            = honestOverlapPairTotal > 0 ? honestOverlapPairFrames / honestOverlapPairTotal : 0;
    results.maxRealSpread                = maxRealSpread;           // laps; 0 on open tracks
    results.honestSameLapFrames          = honestSameLapFrames;     // closed tracks only
    results.honestCrossLapFrames         = honestCrossLapFrames;    // closed tracks only
    results.liteOverlapResolutionFrames  = liteOverlapResolutionN > 0 ? liteOverlapResolutionSum / liteOverlapResolutionN : 0;
    results.liteZigzagScore              = liteZigzagFrames > 0 ? liteZigzagSum / liteZigzagFrames : 0;
    results.liteLatSpeedScore            = liteLatSpeedFrames > 0 ? liteLatSpeedSum / liteLatSpeedFrames : 0;
    results.liteBrakeRate                = liteBrakeFrames > 0 ? liteBrakeSum / liteBrakeFrames : 0;
    results.liteStableOvertakes          = soCount / racers.length;
    results.brakeMatchFailureCount       = brakeMatchFailureCount;
    results.brakeMatchLeaderBraked       = brakeMatchLeaderBraked;
    // Phase-3A: Δ5s per-racer oscillation metric
    let tmDelta5sMax = 0;
    let tmOscillatingCount = 0;
    if (racePlanController && tmRings.size > 0) {
      for (const [, ring] of tmRings) {
        const filled = Math.min(ring.idx, TM_RING_SIZE);
        if (filled < 2) continue;
        let mn = Infinity, mx = -Infinity;
        for (let j = 0; j < filled; j++) {
          if (ring.buf[j] < mn) mn = ring.buf[j];
          if (ring.buf[j] > mx) mx = ring.buf[j];
        }
        const delta = mx - mn;
        if (delta > tmDelta5sMax) tmDelta5sMax = delta;
        if (delta > 0.15) tmOscillatingCount++;
      }
    }

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
      // Δ5s oscillation: max trajectoryMult swing over any 5s window during OUTCOME
      tmDelta5sMax,
      tmOscillatingCount,
    };
    results.physicalDurationS   = Math.max(...racers.map((r) => r.finishTime ?? 0));
    results.avgRerollsPerRacer  = racers.reduce((s, r) => s + r.rerollCount, 0) / racers.length;
    // outcomeReached: true if at least one racer crossed the finish line (race didn't time out)
    results.outcomeReached = finishedCount > 0;

    // Phase-3B: COMEBACK analysis result
    if (cbCfg) {
      const finalTs = raceTs;
      const effectiveOutcomeEndMs = cbEndgameStartMs !== null
        ? Math.min(cbEndgameStartMs, cbOutcomeEndMs ?? finalTs)
        : (cbOutcomeEndMs ?? finalTs);
      const outcomeDurS   = cbOutcomeStartMs != null ? ((cbOutcomeEndMs   ?? finalTs) - cbOutcomeStartMs) / 1000 : 0;
      const effectiveDurS = cbOutcomeStartMs != null ? (effectiveOutcomeEndMs - cbOutcomeStartMs) / 1000          : 0;
      results.comebackDiag = {
        outcomeStartS:  cbOutcomeStartMs != null ? cbOutcomeStartMs / 1000 : null,
        outcomeEndS:    cbOutcomeEndMs   != null ? cbOutcomeEndMs   / 1000 : null,
        outcomeDurS:    Math.max(0, outcomeDurS),
        endgameStartS:  cbEndgameStartMs != null ? cbEndgameStartMs / 1000 : null,
        effectiveDurS:  Math.max(0, effectiveDurS),
        triggerCount:   cbTriggers.length,
        triggers:       cbTriggers,
        allMaxGains:    [...cbMaxGainByRacer.values()],
      };
    } else {
      results.comebackDiag = null;
    }

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
 * @param {number[]|null} rowSizes  racer count per row; if null, uniform distribution assumed
 * @returns {{ nRaces, totalRows, rowStats, chiSq, df, pValue }}
 */
export function computeFairnessStats(raceResults, totalRows, rowSizes = null) {
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

  // Weighted expected wins: proportional to row size; fall back to uniform if no sizes given
  const totalRacers = rowSizes ? rowSizes.reduce((s, v) => s + v, 0) : totalRows;
  const expectedWinsByRow = Array.from({ length: totalRows }, (_, i) =>
    rowSizes ? nRaces * rowSizes[i] / totalRacers : nRaces / totalRows
  );

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
      winRate:         wins / nRaces,
      expectedWinRate: expectedWinsByRow[rowIdx] / nRaces,
      n,
      avgRank,
      stdRank:  Math.sqrt(variance),
    };
  });

  // Chi-square goodness-of-fit with weighted expectations
  const chiSq = winsByRow.reduce((s, obs, i) => {
    const exp = expectedWinsByRow[i];
    return exp > 0 ? s + (obs - exp) ** 2 / exp : s;
  }, 0);
  const df       = totalRows - 1;
  const pValue   = chiSqPValue(chiSq, df);

  return { nRaces, totalRows, rowStats, chiSq, df, pValue };
}

/**
 * Compute per-zone success rate using the real game zone boundaries (B1–B5)
 * from racePlanner.js getAreaBounds() with bonusStrengthMultiplier=2.0.
 *
 * @param {Array<{result: object[], targetRankMap: Map<number,number>}>} raceEntries
 * @returns {{ zones: object[], overall: object }}
 */
export function computeZoneSuccessRate(raceEntries) {
  const ZONES = [
    { zone: 'B1', lo: 1,  hi: 5,        bonus: '+6%' },
    { zone: 'B2', lo: 6,  hi: 15,       bonus: '+4%' },
    { zone: 'B3', lo: 16, hi: 25,       bonus: '+2%' },
    { zone: 'B4', lo: 26, hi: 40,       bonus: '±0%' },
    { zone: 'B5', lo: 41, hi: Infinity, bonus: '−2%' },
  ];

  function getZoneIdx(rank) {
    if (rank <= 5)  return 0;
    if (rank <= 15) return 1;
    if (rank <= 25) return 2;
    if (rank <= 40) return 3;
    return 4;
  }

  const hits  = [0, 0, 0, 0, 0];
  const total = [0, 0, 0, 0, 0];
  let overallHits = 0, overallTotal = 0;

  for (const { result, targetRankMap } of raceEntries) {
    for (const racer of result) {
      const targetRank = targetRankMap?.get(racer.racerIndex);
      if (targetRank == null) continue;
      const tz = getZoneIdx(targetRank);
      const fz = getZoneIdx(racer.finalRank);
      total[tz]++;
      overallTotal++;
      if (fz === tz) { hits[tz]++; overallHits++; }
    }
  }

  return {
    zones: ZONES.map((z, i) => ({
      ...z,
      hits:  hits[i],
      total: total[i],
      rate:  total[i] > 0 ? hits[i] / total[i] : null,
    })),
    overall: {
      hits:  overallHits,
      total: overallTotal,
      rate:  overallTotal > 0 ? overallHits / overallTotal : null,
    },
  };
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
// ── Diagnostic tables A-E (race-plan mode only) ───────────────────────────────
/**
 * Build Markdown tables A-E from rawData rows for one combo.
 * Only called when sollBereich is present (RACE_PLAN_ACTIVE).
 *
 * @param {object[]} rawRows  rawData filtered for one trackId×racerType×durationSec
 * @param {object[]} rowStats computeFairnessStats rowStats (for row count/expected)
 * @returns {string[]} markdown lines
 */
function buildDiagnosticTables(rawRows, rowStats) {
  if (!rawRows || rawRows.length === 0) return [];

  const lines = [];
  const nRacers = Math.max(...rawRows.map((r) => r.finalRank));
  const nRaces = new Set(rawRows.map((r) => `${r.seed}-${r.raceIdx}`)).size;

  // Row sizes: inferred from any single race's distribution
  const firstKey = rawRows[0].seed + '-' + rawRows[0].raceIdx;
  const firstRace = rawRows.filter((r) => r.seed + '-' + r.raceIdx === firstKey);
  const rowSizeMap = new Map();
  for (const r of firstRace) rowSizeMap.set(r.startRowIndex, (rowSizeMap.get(r.startRowIndex) ?? 0) + 1);
  const totalRows = (Math.max(...rowSizeMap.keys()) + 1);
  const rowSizes = Array.from({ length: totalRows }, (_, i) => rowSizeMap.get(i) ?? 0);

  const bereichBounds = [[1, 5], [6, 15], [16, 25], [26, 40], [41, nRacers]];
  const rankGroups = [
    { label: '1', lo: 1, hi: 1 }, { label: '2', lo: 2, hi: 2 },
    { label: '3', lo: 3, hi: 3 }, { label: '4', lo: 4, hi: 4 },
    { label: '5', lo: 5, hi: 5 }, { label: '6–10', lo: 6, hi: 10 },
    { label: '11–15', lo: 11, hi: 15 }, { label: '16–25', lo: 16, hi: 25 },
    { label: '26–40', lo: 26, hi: 40 }, { label: `41–${nRacers}`, lo: 41, hi: nRacers },
  ];

  const p2 = (n, d) => (d > 0 ? (n / d * 100).toFixed(1) + '%' : '—');
  const cnt = (rows, lo, hi, key, val) =>
    rows.filter((r) => r.finalRank >= lo && r.finalRank <= hi && r[key] === val).length;

  // ── Table A ─────────────────────────────────────────────────────────────────
  lines.push('');
  lines.push('#### A — Bereichstreue');
  lines.push('');
  lines.push('| Soll-Bereich | Zugewiesen | Treffer | Quote |');
  lines.push('|---|---|---|---|');
  for (let b = 1; b <= 5; b++) {
    const [lo, hi] = bereichBounds[b - 1];
    const grp = rawRows.filter((r) => r.sollBereich === b);
    const hits = grp.filter((r) => r.finalRank >= lo && r.finalRank <= hi).length;
    lines.push(`| B${b} (Pl. ${lo}–${hi}) | ${grp.length} | ${hits} | ${p2(hits, grp.length)} |`);
  }

  // ── Table B.1 ───────────────────────────────────────────────────────────────
  const rowHdrs = rowStats.map((rs) => `Row ${rs.rowIndex} (${rowSizes[rs.rowIndex] ?? '?'}R)`);
  lines.push('');
  lines.push('#### B.1 — End-Platz-Gruppen × Start-Reihe');
  lines.push('');
  lines.push(`| End-Platz | ${rowHdrs.join(' | ')} | Gesamt |`);
  lines.push(`|---|${rowHdrs.map(() => '---|').join('')}---|`);
  for (const g of rankGroups) {
    const total = rawRows.filter((r) => r.finalRank >= g.lo && r.finalRank <= g.hi).length;
    const cols = rowStats.map((rs) => {
      const n = cnt(rawRows, g.lo, g.hi, 'startRowIndex', rs.rowIndex);
      return `${n} (${p2(n, total)})`;
    });
    lines.push(`| ${g.label} | ${cols.join(' | ')} | ${total} |`);
  }
  const expRowHdr = rowStats.map((rs) => `${p2(rs.expectedWinRate * nRaces, nRaces)}`).join(' | ');
  lines.push(`| *(erw. je Pl.1)* | ${expRowHdr} | — |`);

  // ── Table B.2 ───────────────────────────────────────────────────────────────
  lines.push('');
  lines.push('#### B.2 — End-Platz-Gruppen × Soll-Bereich');
  lines.push('');
  lines.push('| End-Platz | Soll B1 | Soll B2 | Soll B3 | Soll B4 | Soll B5 | Gesamt |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const g of rankGroups) {
    const total = rawRows.filter((r) => r.finalRank >= g.lo && r.finalRank <= g.hi).length;
    const cols = [1, 2, 3, 4, 5].map((b) => {
      const n = cnt(rawRows, g.lo, g.hi, 'sollBereich', b);
      return `${n} (${p2(n, total)})`;
    });
    lines.push(`| ${g.label} | ${cols.join(' | ')} | ${total} |`);
  }

  // ── Table C — B1 mismatch ───────────────────────────────────────────────────
  const b1Rows = rawRows.filter((r) => r.sollBereich === 1);
  const b1Total = b1Rows.length;
  lines.push('');
  lines.push('#### C — Mismatch Soll-Bereich 1 (Wo landen B1-Racer die ihr Soll verfehlen?)');
  lines.push('');
  lines.push('| Tatsächlich gelandet | Anzahl | Anteil |');
  lines.push('|---|---|---|');
  const cBuckets = [
    { label: 'Pl. 1–5 ✅ Soll erreicht', lo: 1, hi: 5 },
    { label: 'Pl. 6–10', lo: 6, hi: 10 },
    { label: 'Pl. 11–15', lo: 11, hi: 15 },
    { label: 'Pl. 16–25', lo: 16, hi: 25 },
    { label: 'Pl. 26–40', lo: 26, hi: 40 },
    { label: `Pl. 41–${nRacers} ❌ schwerer Miss`, lo: 41, hi: nRacers },
  ];
  for (const b of cBuckets) {
    const n = b1Rows.filter((r) => r.finalRank >= b.lo && r.finalRank <= b.hi).length;
    lines.push(`| ${b.label} | ${n} | ${p2(n, b1Total)} |`);
  }
  // Per-row hit rates for B1
  lines.push('');
  lines.push('Trefferquote B1 nach Start-Reihe:');
  lines.push('');
  const b1RowCols = rowStats.map((rs) => `Row ${rs.rowIndex}`).join(' | ');
  lines.push(`| Metrik | ${b1RowCols} |`);
  lines.push(`|---|${rowStats.map(() => '---|').join('')}`);
  const b1HitRow = rowStats.map((rs) => {
    const grp = b1Rows.filter((r) => r.startRowIndex === rs.rowIndex);
    const hits = grp.filter((r) => r.finalRank >= 1 && r.finalRank <= 5).length;
    return `${hits}/${grp.length} (${p2(hits, grp.length)})`;
  }).join(' | ');
  const b1MissHeavyRow = rowStats.map((rs) => {
    const grp = b1Rows.filter((r) => r.startRowIndex === rs.rowIndex);
    const heavy = grp.filter((r) => r.finalRank >= 41).length;
    return `${heavy} (${p2(heavy, grp.length)})`;
  }).join(' | ');
  lines.push(`| Treffer (Pl. 1–5) | ${b1HitRow} |`);
  lines.push(`| Schwerer Miss (Pl. 41+) | ${b1MissHeavyRow} |`);

  // ── Table D — B5 brake leak ──────────────────────────────────────────────────
  const b5Rows = rawRows.filter((r) => r.sollBereich === 5);
  const b5Total = b5Rows.length;
  lines.push('');
  lines.push('#### D — Brems-Leck Soll-Bereich 5 (Row-0-Diagnose: entkommen trotz Bremsen?)');
  lines.push('');
  lines.push('| Tatsächlich gelandet | Anzahl | Anteil |');
  lines.push('|---|---|---|');
  const dBuckets = [
    { label: `Pl. 41–${nRacers} ✅ Soll erreicht`, lo: 41, hi: nRacers },
    { label: 'Pl. 26–40', lo: 26, hi: 40 },
    { label: 'Pl. 16–25', lo: 16, hi: 25 },
    { label: 'Pl. 6–15', lo: 6, hi: 15 },
    { label: 'Pl. 1–5 ❌ Brems-Leck', lo: 1, hi: 5 },
  ];
  for (const b of dBuckets) {
    const n = b5Rows.filter((r) => r.finalRank >= b.lo && r.finalRank <= b.hi).length;
    lines.push(`| ${b.label} | ${n} | ${p2(n, b5Total)} |`);
  }
  // Per-row escape-to-top-5 rate (the critical Row0 leak metric)
  lines.push('');
  lines.push('Brems-Leck Top-5 nach Start-Reihe:');
  lines.push('');
  lines.push(`| Metrik | ${b1RowCols} |`);
  lines.push(`|---|${rowStats.map(() => '---|').join('')}`);
  const b5LeakRow = rowStats.map((rs) => {
    const grp = b5Rows.filter((r) => r.startRowIndex === rs.rowIndex);
    const leaks = grp.filter((r) => r.finalRank <= 5).length;
    return `${leaks}/${grp.length} (${p2(leaks, grp.length)})`;
  }).join(' | ');
  lines.push(`| Top-5 trotz B5-Ziel | ${b5LeakRow} |`);

  return lines;
}

function fairLabel(p, rowStats) {
  if (p >= 0.05) return '✅ Fair';
  const row0Rate = rowStats[0]?.winRate ?? 0;
  const expected = rowStats[0]?.expectedWinRate ?? (1 / rowStats.length);
  if (row0Rate > expected + 0.05) return '⚠️ Front-Bias';
  if (row0Rate < expected - 0.05) return '⚠️ Rear-Bias';
  return '⚠️ Unequal';
}

function buildReport(allResults, rawData, runDate) {
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
    const r0 = rowStats[0];
    const r1 = rowStats[1];
    const rRest = rowStats.slice(2);
    const restWinRate = rRest.length > 0
      ? rRest.reduce((s, r) => s + r.wins, 0) / (N_RACES * rRest.length || 1)
      : '—';

    // Show R0 weighted expected in overview (uniform expected is the same for all rows when equal)
    const r0Expected = r0?.expectedWinRate ?? (1 / totalRows);
    const verdict = fairLabel(pValue, rowStats);
    lines.push(
      `| ${trackName} | ${racerType} | ${durationSec}s | ${totalRows} | ${fmtPct(r0Expected)} | ` +
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

    lines.push(`### ${trackName} × ${racerType} × ${durationSec}s`);
    lines.push('');
    lines.push(`- **finishT:** ${finishT.toFixed(4)} (Ziellinie in t-Raum)`);
    lines.push(`- **Reihen:** ${totalRows} (gewichtete Erwartung nach Reihengröße)`);
    lines.push(`- **Chi²(${df}):** ${fmtN(chiSq, 2)} — ${sigLabel(pValue)}`);
    lines.push('');

    lines.push('| Reihe | Siege | Win-Rate | Erwartet (gew.) | Δ Erwartet | Ø Rang | σ Rang |');
    lines.push('|-------|-------|----------|-----------------|------------|--------|--------|');
    for (const rs of rowStats) {
      const delta = rs.winRate - rs.expectedWinRate;
      const sign  = delta >= 0 ? '+' : '';
      lines.push(
        `| Row ${rs.rowIndex} | ${rs.wins} | ${fmtPct(rs.winRate)} | ${fmtPct(rs.expectedWinRate)} | ` +
        `${sign}${fmtPct(delta)} | ${fmtN(rs.avgRank, 1)} | ${fmtN(rs.stdRank, 1)} |`
      );
    }
    lines.push('');

    // Diagnostic tables A-E (only when race-plan sollBereich data is available)
    const comboRaw = rawData
      ? rawData.filter(
          (r) =>
            r.trackId === trackId &&
            r.racerType === racerType &&
            r.durationSec === durationSec &&
            r.sollBereich != null
        )
      : [];
    if (comboRaw.length > 0) {
      lines.push('');
      lines.push('#### E — 1.5×-Gate Aggregat (gewichtet)');
      lines.push('');
      const gateRows = rowStats.filter((rs) => rs.expectedWinRate * nRaces >= 3);
      const gatePass = gateRows.every(
        (rs) => rs.winRate >= rs.expectedWinRate / 1.5 && rs.winRate <= rs.expectedWinRate * 1.5
      );
      lines.push(`Gate-Status: **${gatePass ? '✅ PASS' : '❌ FAIL'}** | χ²(${df}) = ${fmtN(chiSq, 2)} | ${sigLabel(pValue)}`);
      lines.push('');
      lines.push(...buildDiagnosticTables(comboRaw, rowStats));
      lines.push('');
    }
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
      const expRate = rowStats[0]?.expectedWinRate ?? (1 / rowStats.length);
      const bias = r0Rate > expRate ? `Row 0 zu oft (${fmtPct(r0Rate)} statt erw. ${fmtPct(expRate)})` :
                   r0Rate < expRate ? `Row 0 zu selten (${fmtPct(r0Rate)} statt erw. ${fmtPct(expRate)})` :
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
    const exp = rs[0]?.expectedWinRate ?? (1 / rs.length);
    return (rs[0]?.winRate ?? 0) > exp + 0.05;
  });
  const rearBias = unfairCombos.filter((r) => {
    const rs = r.stats.rowStats;
    const exp = rs[0]?.expectedWinRate ?? (1 / rs.length);
    return (rs[0]?.winRate ?? 0) < exp - 0.05;
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

  // ── Lateral Quality Metrics (all tracks) ──
  const withLateralQ = allResults.filter((r) => r.avgNaturalness && r.avgNaturalness.overlapRate != null);
  if (withLateralQ.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Lateral Quality Metrics');
    lines.push('');
    lines.push(
      'overlapRate: % of active pair-frames with |dT|<10%·bodyH/pathLen AND |dY|<10%·bodyW/trackW (old center-proximity metric).  \n' +
      'honestOverlapRate: % of pair-frames where rendered body boxes actually overlap — full body extents, all pairs, open+closed (NEW).  \n' +
      'overlapResolution: avg consecutive frames a pair stays in overlap before separating.  \n' +
      'zigzagScore: avg |physicalYVelocity change| per racer-frame (after 4s) — target < 0.003.  \n' +
      'lateralSpeedScore: avg |physicalYVelocity| per racer-frame (after 4s) — lower = smoother.  \n' +
      'brakeRate: fraction of racer-frames where speed-brake is active (after 4s) — lower = less blockage.  \n' +
      'stableOvertakes: confirmed lead-swaps (≥3s) per racer in 20%–80% of race — higher = more action.'
    );
    lines.push('');
    lines.push('| Track | Racer | Dist | N | overlapRate% | honestOverlap% | gap | overlapResolution (fr) | zigzagScore |');
    lines.push('|-------|-------|------|---|-------------|----------------|-----|------------------------|-------------|');
    for (const res of withLateralQ) {
      const n = res.avgNaturalness;
      const zigzagLabel = (n.zigzagScore ?? 0) < 0.005 ? '✅' : '⚠️';
      const oldOvl  = (n.overlapRate    ?? 0) * 100;
      const newOvl  = (n.honestOverlapRate ?? 0) * 100;
      const gapOvl  = newOvl - oldOvl;
      const honestLabel = newOvl > 0.5 ? ' ⚠️' : '';
      lines.push(
        `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${res.nRacers ?? '—'}` +
        ` | ${oldOvl.toFixed(1)}%` +
        ` | ${newOvl.toFixed(1)}%${honestLabel}` +
        ` | +${gapOvl.toFixed(1)}%` +
        ` | ${(n.overlapResolutionFrames ?? 0).toFixed(1)}` +
        ` | ${(n.zigzagScore ?? 0).toFixed(6)} ${zigzagLabel} |`
      );
    }
    lines.push('');

    // Fair-chance placement table (Step 1, only when race plan data is present)
    // Fair-chance placement — aggregate + per-row (all combos with race-plan data)
    const withFairChance = allResults.filter((r) => (r.avgNaturalness?.fairChanceB1Count ?? 0) > 0);
    if (withFairChance.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## Fair-Chance Placement (B1 target ranks 1–5)');
      lines.push('');
      lines.push(
        'B1exact: fraction of B1-assigned racers (targetRank 1–5) finishing at their exact assigned rank.  \n' +
        'B1top5: fraction finishing anywhere in top 5.  \n' +
        'Gap = top5 − exact. By construction B1top5 ≥ B1exact. Aggregate over all races in the combo.'
      );
      lines.push('');
      lines.push('### Aggregate (all B1 racers, across all races)');
      lines.push('');
      lines.push('| Track | Racer | Dist | N | B1exact% | B1top5% | gap% |');
      lines.push('|-------|-------|------|---|----------|---------|------|');
      for (const res of withFairChance) {
        const fc = res.avgNaturalness;
        const exact = (fc.fairChanceExactRate ?? 0) * 100;
        const top5  = (fc.fairChanceTop5Rate  ?? 0) * 100;
        const gap   = top5 - exact;
        lines.push(
          `| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${res.nRacers ?? '—'}` +
          ` | ${exact.toFixed(1)}% | ${top5.toFixed(1)}% | ${gap.toFixed(1)}% |`
        );
      }
      lines.push('');

      // Per-row breakdown: for each combo that has row data, emit a separate table
      const withRowData = withFairChance.filter((r) => (r.avgNaturalness?.fairChanceByRow?.length ?? 0) > 1);
      if (withRowData.length > 0) {
        lines.push('### Per-Starting-Row Breakdown');
        lines.push('');
        lines.push(
          'Does the designation (targetRank 1–5) cash in equally for front-row and back-row racers?  \n' +
          'n = total B1-racer appearances from that row across all 10 races.  \n' +
          'exact% and top5% are the hit rates for that starting row only.'
        );
        lines.push('');
        // Collect all row indices seen across all combos for the header
        const allRowIdxs = [...new Set(withRowData.flatMap((r) => r.avgNaturalness.fairChanceByRow.map((rd) => rd.row)))].sort((a, b) => a - b);
        const rowHdrs = allRowIdxs.flatMap((ri) => [`R${ri} exact%`, `R${ri} top5%`, `R${ri} n`]);
        lines.push(`| Track | Racer | Dist | ${rowHdrs.join(' | ')} |`);
        lines.push(`|-------|-------|------|${allRowIdxs.map(() => '---|---|---').join('')}|`);
        for (const res of withRowData) {
          const rowMap = new Map(res.avgNaturalness.fairChanceByRow.map((rd) => [rd.row, rd]));
          const cells  = allRowIdxs.flatMap((ri) => {
            const rd = rowMap.get(ri);
            if (!rd) return ['—', '—', '0'];
            return [
              rd.exactRate != null ? (rd.exactRate * 100).toFixed(0) + '%' : '—',
              rd.top5Rate  != null ? (rd.top5Rate  * 100).toFixed(0) + '%' : '—',
              String(rd.b1Count),
            ];
          });
          lines.push(`| ${res.trackName} | ${res.racerType} | ${res.durationSec}s | ${cells.join(' | ')} |`);
        }
        lines.push('');
      }
    }
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

// ── Phase-3B: COMEBACK analysis report ────────────────────────────────────────
function printComebackReport(raceResults, { trackName, racerType, durationSec, minPositions, windowSec, endgameThresh }) {
  const diags = raceResults.map((r) => r.comebackDiag).filter(Boolean);
  if (diags.length === 0) return;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`Phase-3B — COMEBACK Analyse: ${trackName} × ${racerType} × ${durationSec}s`);
  console.log(`  Bedingung: OUTCOME-Phase + ≥${minPositions} Plätze in ${windowSec}s  |  Endgame: >${(endgameThresh * 100).toFixed(0)}% finishT`);
  console.log('═'.repeat(70));

  for (let i = 0; i < raceResults.length; i++) {
    const d    = diags[i];
    const seed = raceResults[i]._seed ?? (i + 1);
    const outStart = d.outcomeStartS != null ? d.outcomeStartS.toFixed(1) + 's' : '—';
    const outEnd   = d.outcomeEndS   != null ? d.outcomeEndS.toFixed(1)   + 's' : `>${durationSec}s`;
    const egStr    = d.endgameStartS != null ? d.endgameStartS.toFixed(1) + 's' : 'nie';
    console.log(`\nSeed ${seed}:`);
    console.log(`  OUTCOME:           ${outStart} – ${outEnd}  (${d.outcomeDurS.toFixed(1)}s)`);
    console.log(`  Endgame (>${(endgameThresh * 100).toFixed(0)}%): ${egStr}  → effektives Fenster: ${d.effectiveDurS.toFixed(1)}s`);
    console.log(`  COMEBACK-Trigger:  ${d.triggerCount}`);
    for (const t of d.triggers) {
      console.log(`    t=${t.ts.toFixed(1)}s  ${t.name.padEnd(6)}  +${t.gain} Plätze`);
    }
    if (d.allMaxGains.length > 0) {
      const mn = Math.min(...d.allMaxGains);
      const mx = Math.max(...d.allMaxGains);
      const av = d.allMaxGains.reduce((s, v) => s + v, 0) / d.allMaxGains.length;
      console.log(`  Max-Platzgewinn B1 (${windowSec}s-Fenster): min=${mn}  max=${mx}  avg=${av.toFixed(1)}`);
    } else {
      console.log(`  Max-Platzgewinn B1: keine Daten`);
    }
  }

  // Aggregate
  if (diags.length > 1) {
    console.log(`\n── Aggregat (${diags.length} Rennen) ──`);
    const avgOutDur   = diags.reduce((s, d) => s + d.outcomeDurS,   0) / diags.length;
    const avgEffDur   = diags.reduce((s, d) => s + d.effectiveDurS, 0) / diags.length;
    const avgTriggers = diags.reduce((s, d) => s + d.triggerCount,  0) / diags.length;
    const zeroTrig    = diags.filter((d) => d.triggerCount === 0).length;
    const allMaxGains = diags.flatMap((d) => d.allMaxGains);
    console.log(`  OUTCOME Dauer:       Ø ${avgOutDur.toFixed(1)}s`);
    console.log(`  Effektives Fenster:  Ø ${avgEffDur.toFixed(1)}s`);
    console.log(`  COMEBACK-Trigger:    Ø ${avgTriggers.toFixed(1)}/Rennen  (${zeroTrig}/${diags.length} ohne Trigger)`);
    if (allMaxGains.length > 0) {
      const mn   = Math.min(...allMaxGains);
      const mx   = Math.max(...allMaxGains);
      const av   = allMaxGains.reduce((s, v) => s + v, 0) / allMaxGains.length;
      const n1   = allMaxGains.filter((g) => g >= 1).length;
      const n2   = allMaxGains.filter((g) => g >= 2).length;
      const n3   = allMaxGains.filter((g) => g >= 3).length;
      const tot  = allMaxGains.length;
      console.log(`  Max-Platzgewinn B1:  min=${mn}  max=${mx}  avg=${av.toFixed(1)}  (${tot} Racer×Rennen)`);
      console.log(`  Davon ≥1 Platz: ${n1}/${tot} (${(n1/tot*100).toFixed(0)}%)`);
      console.log(`  Davon ≥2 Plätze: ${n2}/${tot} (${(n2/tot*100).toFixed(0)}%)`);
      console.log(`  Davon ≥3 Plätze: ${n3}/${tot} (${(n3/tot*100).toFixed(0)}%)`);
      // Slider recommendations
      console.log(`\n── Slider-Empfehlungen ──`);
      const rec = n3/tot >= 0.3 ? 3 : n2/tot >= 0.3 ? 2 : 1;
      console.log(`  comebackMinPositionsGained: empfohlen ${rec} (≥30%-Schwelle)`);
      if (avgEffDur < 8 && windowSec > 3) {
        console.log(`  comebackWindowSec: ggf. auf ≤${Math.max(2, Math.floor(avgEffDur / 2))}s senken (effektives Fenster nur ${avgEffDur.toFixed(1)}s)`);
      } else {
        console.log(`  comebackWindowSec: ${windowSec}s passt (effektives Fenster ${avgEffDur.toFixed(1)}s)`);
      }
      if (avgTriggers < 0.5) {
        console.log(`  ⚠️  Sehr wenige Trigger (Ø ${avgTriggers.toFixed(1)}) — minPositionsGained auf ${rec} oder Fenster vergrößern`);
      } else {
        console.log(`  ✅ Ø ${avgTriggers.toFixed(1)} Trigger/Rennen — COMEBACK-Event wird feuern`);
      }
    }
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('sim-fairness.mjs') ||
   process.argv[1].replace(/\\/g, '/').endsWith('scripts/sim-fairness.mjs'));

if (isMain) {
  const trackDataDir = join(ROOT, 'server/data/tracks');
  const trackFiles = [
    'dirt-oval', 'river-run', 'space-sprint', 'garden-path', 'city-circuit',
    '90d3020197da',    // Luger hill (open)
    'ice-track',       // Ice Track (closed)
    'mountainstreet',  // Mountainstreet (open)
    'searound',        // Searound (closed)
    'seatrack',        // Seatrack (open)
  ];

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
  if (RACE_PLAN_ACTIVE) {
    console.log(`  bonusUntil=${(RP_BONUS_TRANSITION_END * 100).toFixed(0)}%  fade=${RP_BONUS_FADE_MS}ms  corridor=${(RP_CORRIDOR_START * 100).toFixed(0)}%→${(RP_CORRIDOR_END * 100).toFixed(0)}%`);
  }
  console.log(`Rubber-Band            : ${RUBBER_BAND_ACTIVE ? `✅ aktiv (boost=${RB_FLAT_BOOST} gap=${RB_GAP_THRESHOLD} ramp=${RB_RAMP_MS}ms endgame=${RB_ENDGAME_THRESHOLD})` : '❌ deaktiviert'}`);
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
  if (Object.keys(BEHAVIOR_OVERRIDE).length > 0) {
    console.log(`⚠️  --behavior override: ${JSON.stringify(BEHAVIOR_OVERRIDE)}`);
  }
  if (COMEBACK_ANALYSIS) {
    if (!RACE_PLAN_ACTIVE) console.warn('⚠️  --comeback-analysis benötigt --race-plan=true — B1-Daten fehlen');
    console.log(`Phase-3B COMEBACK Analyse aktiv: minPositions=${CB_MIN_POSITIONS}  windowSec=${CB_WINDOW_SEC}  endgameThresh=${(CB_ENDGAME_THRESH * 100).toFixed(0)}%`);
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
      const { speedMultiplier, displaySize, bodyFillX, bodyFillY } = cfg;

      for (const durationSec of DURATION_VARIANTS) {
        if (DUR_FILTER && durationSec !== Number(DUR_FILTER)) continue;
        // Phase-1: use topology-specific racer count (open vs closed).
        const nRacersForCombo = isOpen ? N_RACERS_OPEN : N_RACERS_CLOSED;
        // Open tracks: natural speed = BASE_SPEED_MEAN / ssf so traversal time is track-length-invariant.
        // Closed tracks: closedSsf normalizes speed by path length — same pattern as open ssf.
        const trackSsf = isOpen ? computeSpeedScaleFactor(pathLengthPx) : 1;
        const trackClosedSsf = isOpen ? 1 : computeClosedTrackSsf(pathLengthPx);
        const trackNaturalBase = isOpen ? BASE_SPEED_MEAN / trackSsf : race_baseSpeed / trackClosedSsf;
        const finishT = computeFinishT(trackNaturalBase, speedMultiplier, durationSec, isOpen);

        // Compute row count and sizes for this track/racer combo (deterministic, seed-independent).
        // Mirrors browser's bottom-up computeRacerLayout path (Sim adjusted to match).
        const effectiveWidth       = geometricTrackWidth * DEFAULT_RACE_BEHAVIOR_CONFIG.startSpreadRange;
        const comboLayout          = computeRacerLayout(effectiveWidth, nRacersForCombo, displaySize, DEFAULT_AUTO_SCALE_CONFIG);
        const comboEffDisplaySize  = comboLayout.spriteSize;
        const comboAutoScale       = comboEffDisplaySize / displaySize;
        const rowGapPx             = comboEffDisplaySize * DEFAULT_ROW_LAYOUT_CONFIG.rowGapMultiplier;
        const totalRows            = comboLayout.rowCount;
        const rowSizes             = comboLayout.layout;
        const comboRowLayout       = computeEvenRowLayout(nRacersForCombo, totalRows);

        process.stdout.write(
          `   ${racerType.padEnd(10)} ${durationSec}s  finishT=${finishT.toFixed(3)}  rows=${totalRows}  sf=${comboAutoScale.toFixed(2)}  `
        );

        const raceResults   = [];
        const mixingQuotas  = [];
        const v4ThreshLogs  = [];
        for (let raceIdx = 0; raceIdx < N_RACES; raceIdx++) {
          // seed=0 → non-deterministic (exploration); seed>0 → reproducible batch
          const seed = GLOBAL_SEED > 0 ? (GLOBAL_SEED - 1) * N_RACES + raceIdx + 1 : 0;
          // Phase-3A: create Race Plan + TrajectoryController for this race when active
          let racePlanController = null;
          let raceSollRankMap = null;
          let b1Indices = new Set();
          if (RACE_PLAN_ACTIVE) {
            const planRacers = comboRowLayout.assignments.map(
              (a) => ({ index: a.racerIndex, startRowIndex: a.rowIndex })
            );
            const plan = createRacePlan(planRacers, finishT, durationSec * 1000, {
              bonusStrengthMultiplier: BONUS_MULT,
              bonusTransitionEnd:      RP_BONUS_TRANSITION_END,
              bonusFadeDuration:       RP_BONUS_FADE_MS,
              corridorStart:           RP_CORRIDOR_START,
              corridorEnd:             RP_CORRIDOR_END,
            }, seed);
            racePlanController = createTrajectoryController(plan);
            raceSollRankMap = plan._racerTargetRank;
            if (COMEBACK_ANALYSIS) {
              for (const [idx, sr] of raceSollRankMap) {
                if (sr <= 5) b1Indices.add(idx);
              }
            }
          }
          const result = runSingleRace({
            shape,
            pathLengthPx,
            geometricTrackWidth,
            isOpen,
            speedMultiplier,
            displaySize,
            bodyFillX,
            bodyFillY,
            finishT,
            targetSeconds: durationSec,
            seed,
            nRacers: nRacersForCombo,
            diagnosticMode: DIAG_MODE,
            behaviorConfigOverrides: {
              isOpen,
              ...(WARMUP_MS_OVERRIDE !== null ? { avoidanceWarmupMs: WARMUP_MS_OVERRIDE } : {}),
              ...BEHAVIOR_OVERRIDE,
            },
            racePlanController,
            comebackAnalysisConfig: COMEBACK_ANALYSIS && RACE_PLAN_ACTIVE
              ? { b1Indices, minPositions: CB_MIN_POSITIONS, windowSec: CB_WINDOW_SEC, endgameThresh: CB_ENDGAME_THRESH }
              : null,
          });
          // Step 1: fair-chance placement metrics (requires race-plan target ranks)
          if (raceSollRankMap) {
            const b1Entries = [...raceSollRankMap.entries()].filter(([, sr]) => sr <= 5);
            let fcExact = 0, fcTop5 = 0;
            // Gap B: per-starting-row breakdown (rowIndex → {b1Count, exactHits, top5Hits})
            const fcByRow = new Map();
            for (const [racerIdx, sollRank] of b1Entries) {
              const rr = result.find((x) => x.racerIndex === racerIdx);
              if (!rr) continue;
              const row = rr.startRowIndex;
              if (!fcByRow.has(row)) fcByRow.set(row, { b1Count: 0, exactHits: 0, top5Hits: 0 });
              const rd = fcByRow.get(row);
              rd.b1Count++;
              if (rr.finalRank === sollRank) { fcExact++; rd.exactHits++; }
              if (rr.finalRank <= 5) { fcTop5++; rd.top5Hits++; }
            }
            result.fairChanceB1Count   = b1Entries.length;
            result.fairChanceExactHits  = fcExact;
            result.fairChanceTop5Hits   = fcTop5;
            result.fairChanceByRow      = fcByRow;
          } else {
            result.fairChanceB1Count   = 0;
            result.fairChanceExactHits  = 0;
            result.fairChanceTop5Hits   = 0;
            result.fairChanceByRow      = new Map();
          }
          raceResults.push(result);
          if (COMEBACK_ANALYSIS) result._seed = seed;
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
            const sollRank = raceSollRankMap?.get(r.racerIndex) ?? null;
            const sollBereich = sollRank != null ? (
              sollRank <= 5 ? 1 : sollRank <= 15 ? 2 : sollRank <= 25 ? 3 : sollRank <= 40 ? 4 : 5
            ) : null;
            rawData.push({
              trackId,
              trackName,
              isOpen,
              racerType,
              durationSec,
              finishT,
              seed,
              raceIdx,
              sollRank,
              sollBereich,
              ...r,
            });
          }
        }

        const stats = computeFairnessStats(raceResults, totalRows, rowSizes);
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
          tmDelta5sMax:           Math.max(...raceResults.map((r) => r.naturalness?.tmDelta5sMax ?? 0)),
          tmOscillatingCount:     raceResults.reduce((s, r) => s + (r.naturalness?.tmOscillatingCount ?? 0), 0) / raceResults.length,
          overlapRate:             raceResults.reduce((s, r) => s + (r.liteOverlapRate ?? 0), 0) / raceResults.length,
          honestOverlapRate:       raceResults.reduce((s, r) => s + (r.honestOverlapRate ?? 0), 0) / raceResults.length,
          // Lapping instrumentation (closed tracks):
          maxRealSpreadMean:       raceResults.reduce((s, r) => s + (r.maxRealSpread ?? 0), 0) / raceResults.length,
          maxRealSpreadMax:        Math.max(...raceResults.map((r) => r.maxRealSpread ?? 0)),
          honestSameLapFraction:   (() => {
            const tot = raceResults.reduce((s, r) => s + (r.honestSameLapFrames ?? 0) + (r.honestCrossLapFrames ?? 0), 0);
            return tot > 0 ? raceResults.reduce((s, r) => s + (r.honestSameLapFrames ?? 0), 0) / tot : null;
          })(),
          honestCrossLapFraction:  (() => {
            const tot = raceResults.reduce((s, r) => s + (r.honestSameLapFrames ?? 0) + (r.honestCrossLapFrames ?? 0), 0);
            return tot > 0 ? raceResults.reduce((s, r) => s + (r.honestCrossLapFrames ?? 0), 0) / tot : null;
          })(),
          overlapResolutionFrames: raceResults.reduce((s, r) => s + (r.liteOverlapResolutionFrames ?? 0), 0) / raceResults.length,
          zigzagScore:             raceResults.reduce((s, r) => s + (r.liteZigzagScore ?? 0), 0) / raceResults.length,
          lateralSpeedScore:       raceResults.reduce((s, r) => s + (r.liteLatSpeedScore ?? 0), 0) / raceResults.length,
          brakeRate:               raceResults.reduce((s, r) => s + (r.liteBrakeRate ?? 0), 0) / raceResults.length,
          stableOvertakes:         raceResults.reduce((s, r) => s + (r.liteStableOvertakes ?? 0), 0) / raceResults.length,
          outcomeReached:          raceResults.reduce((s, r) => s + (r.outcomeReached ? 1 : 0), 0) / raceResults.length,
          // Sum (not average): total pass-through events over all races in this combo.
          brakeMatchFailureCount:  raceResults.reduce((s, r) => s + (r.brakeMatchFailureCount ?? 0), 0),
          brakeMatchLeaderBraked:  raceResults.reduce((s, r) => s + (r.brakeMatchLeaderBraked ?? 0), 0),
          // Step 1: fair-chance placement (fraction of B1-assigned racers hitting exact rank / top-5)
          fairChanceExactRate:     raceResults.length > 0
            ? raceResults.reduce((s, r) => s + (r.fairChanceB1Count > 0 ? r.fairChanceExactHits / r.fairChanceB1Count : 0), 0) / raceResults.length
            : null,
          fairChanceTop5Rate:      raceResults.length > 0
            ? raceResults.reduce((s, r) => s + (r.fairChanceB1Count > 0 ? r.fairChanceTop5Hits  / r.fairChanceB1Count : 0), 0) / raceResults.length
            : null,
          fairChanceB1Count:       raceResults.reduce((s, r) => s + (r.fairChanceB1Count ?? 0), 0) / raceResults.length,
          // Gap B: per-row fair-chance aggregated across all races (sorted by rowIndex)
          fairChanceByRow: (() => {
            const rowSet = new Set(raceResults.flatMap((r) => r.fairChanceByRow ? [...r.fairChanceByRow.keys()] : []));
            return [...rowSet].sort((a, b) => a - b).map((row) => {
              let b1Count = 0, exactHits = 0, top5Hits = 0;
              for (const r of raceResults) {
                const rd = r.fairChanceByRow?.get(row);
                if (!rd) continue;
                b1Count  += rd.b1Count;
                exactHits += rd.exactHits;
                top5Hits  += rd.top5Hits;
              }
              return {
                row,
                b1Count,
                exactHits,
                top5Hits,
                exactRate: b1Count > 0 ? exactHits / b1Count : null,
                top5Rate:  b1Count > 0 ? top5Hits  / b1Count : null,
              };
            });
          })(),
        } : null;
        allResults.push({ trackId, trackName, racerType, durationSec, finishT, isOpen, stats, avgMixingQuota, avgNaturalness, nRacers: nRacersForCombo });

        // Phase-3B: COMEBACK analysis report (printed per combo when flag active)
        if (COMEBACK_ANALYSIS && raceResults.some((r) => r.comebackDiag)) {
          printComebackReport(raceResults, { trackName, racerType, durationSec, minPositions: CB_MIN_POSITIONS, windowSec: CB_WINDOW_SEC, endgameThresh: CB_ENDGAME_THRESH });
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`χ²=${stats.chiSq.toFixed(1)} p=${stats.pValue.toFixed(3)} [${elapsed}s]`);

        // 1.5× gate: each row win-rate within [expectedWinRate/1.5, expectedWinRate×1.5]
        // Rows with expectedWins < 3 are excluded (too small for meaningful gate check at N=50)
        if (isOpen) {
          const gateRows = stats.rowStats.filter((rs) => rs.expectedWinRate * stats.nRaces >= 3);
          const gatePass = gateRows.every(
            (rs) => rs.winRate >= rs.expectedWinRate / 1.5 && rs.winRate <= rs.expectedWinRate * 1.5
          );
          const rateStr = stats.rowStats
            .map((rs) => {
              const expectedWins = rs.expectedWinRate * stats.nRaces;
              const tag = expectedWins < 3 ? '(skip)' : (rs.winRate >= rs.expectedWinRate / 1.5 && rs.winRate <= rs.expectedWinRate * 1.5 ? '✓' : '✗');
              return `R${rs.rowIndex}=${(rs.winRate * 100).toFixed(0)}%(e${(rs.expectedWinRate * 100).toFixed(0)}%)${tag}`;
            })
            .join(' ');
          console.log(`     1.5×-Gate: ${gatePass ? '✅ PASS' : '❌ FAIL'}  (${rateStr})`);
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
                `  wBlocked=${(avgNaturalness.winnerBlockedFractionInOutcome * 100).toFixed(1)}%` +
                `  Δ5sMax=${(avgNaturalness.tmDelta5sMax ?? 0).toFixed(3)}` +
                `  oscN=${(avgNaturalness.tmOscillatingCount ?? 0).toFixed(1)}Ø`
              );
              const fcExact = avgNaturalness.fairChanceExactRate;
              const fcTop5  = avgNaturalness.fairChanceTop5Rate;
              if (fcExact != null) {
                console.log(
                  `     FairChance: B1exact=${(fcExact * 100).toFixed(1)}%` +
                  `  B1top5=${(fcTop5 * 100).toFixed(1)}%` +
                  `  (gap: top5-exact=${((fcTop5 - fcExact) * 100).toFixed(1)}%)`
                );
              }
            }
            // LateralQ — printed for open tracks in this block (closed tracks: printed in block below)
            console.log(
              `     LateralQ: overlap=${((avgNaturalness.overlapRate ?? 0) * 100).toFixed(1)}%` +
              `  honest=${((avgNaturalness.honestOverlapRate ?? 0) * 100).toFixed(1)}%` +
              `  resolution=Ø${(avgNaturalness.overlapResolutionFrames ?? 0).toFixed(1)}fr` +
              `  zigzag=${(avgNaturalness.zigzagScore ?? 0).toFixed(6)}` +
              `  latSpd=${(avgNaturalness.lateralSpeedScore ?? 0).toFixed(6)}` +
              `  brake=${((avgNaturalness.brakeRate ?? 0) * 100).toFixed(1)}%` +
              `  bmFail=${avgNaturalness.brakeMatchFailureCount ?? 0}(leaderBraked=${avgNaturalness.brakeMatchLeaderBraked ?? 0})` +
              `  stableOvt=${(avgNaturalness.stableOvertakes ?? 0).toFixed(3)}` +
              `  outcomeReached=${((avgNaturalness.outcomeReached ?? 1) * 100).toFixed(0)}%`
            );
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

        // Gap A + Gap B + lapping: for CLOSED tracks, emit LateralQ and FairChance here
        // (open tracks already printed these inside the isOpen block above)
        if (!isOpen && avgNaturalness) {
          const sameLapPct  = avgNaturalness.honestSameLapFraction  != null ? (avgNaturalness.honestSameLapFraction  * 100).toFixed(1) + '%' : '—';
          const crossLapPct = avgNaturalness.honestCrossLapFraction != null ? (avgNaturalness.honestCrossLapFraction * 100).toFixed(1) + '%' : '—';
          const maxSpreadLaps = avgNaturalness.maxRealSpreadMax?.toFixed(3) ?? '—';
          console.log(
            `     LateralQ: honest=${((avgNaturalness.honestOverlapRate ?? 0) * 100).toFixed(1)}%` +
            `  overlap=${((avgNaturalness.overlapRate ?? 0) * 100).toFixed(1)}%` +
            `  maxSpread=${maxSpreadLaps}laps  sameLap=${sameLapPct}  crossLap=${crossLapPct}`
          );
          if (RACE_PLAN_ACTIVE) {
            const fcExact = avgNaturalness.fairChanceExactRate;
            const fcTop5  = avgNaturalness.fairChanceTop5Rate;
            if (fcExact != null) {
              console.log(
                `     FairChance: B1exact=${(fcExact * 100).toFixed(1)}%` +
                `  B1top5=${(fcTop5 * 100).toFixed(1)}%` +
                `  (gap: top5-exact=${((fcTop5 - fcExact) * 100).toFixed(1)}%)`
              );
            }
          }
        }
        // FairChance per-row breakdown (all tracks, when race-plan active)
        if (RACE_PLAN_ACTIVE && avgNaturalness?.fairChanceByRow?.length > 0) {
          const rowParts = avgNaturalness.fairChanceByRow.map((rd) =>
            `R${rd.row}:` +
            `exact=${rd.exactRate != null ? (rd.exactRate * 100).toFixed(0) + '%' : '—'}` +
            `/top5=${rd.top5Rate != null ? (rd.top5Rate * 100).toFixed(0) + '%' : '—'}` +
            `(n=${rd.b1Count})`
          );
          console.log(`     FairChance by row: ${rowParts.join('  ')}`);
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

  // ── Zone Success Rate summary (Race Plan mode only) ───────────────────────
  const zoneRows = rawData.filter((r) => r.sollBereich != null);
  if (RACE_PLAN_ACTIVE && zoneRows.length > 0) {
    function zoneIdxOf(rank) {
      if (rank <= 5)  return 0;
      if (rank <= 15) return 1;
      if (rank <= 25) return 2;
      if (rank <= 40) return 3;
      return 4;
    }
    const ZNAMES = ['B1 (1–5)', 'B2 (6–15)', 'B3 (16–25)', 'B4 (26–40)', 'B5 (41+)'];

    console.log('\n=== Zone Success Rate (Race Plan) ===');
    console.log('| Zone      | Open Hits | Open Tot | Open %  | Closed Hits | Closed Tot | Closed % | All %   | RB-Fail% |');
    console.log('|-----------|-----------|----------|---------|-------------|------------|----------|---------|----------|');

    for (let zi = 0; zi < 5; zi++) {
      const b = zi + 1;
      const grp    = zoneRows.filter((r) => r.sollBereich === b);
      const openG  = grp.filter((r) =>  r.isOpen);
      const closG  = grp.filter((r) => !r.isOpen);
      const oHits  = openG.filter((r) => zoneIdxOf(r.finalRank) === zi).length;
      const cHits  = closG.filter((r) => zoneIdxOf(r.finalRank) === zi).length;
      const allHit = oHits + cHits;
      const oPct   = openG.length ? (oHits  / openG.length  * 100).toFixed(1) + '%' : '—';
      const cPct   = closG.length ? (cHits  / closG.length  * 100).toFixed(1) + '%' : '—';
      const allPct = grp.length   ? (allHit / grp.length    * 100).toFixed(1) + '%' : '—';
      // RB-Fail%: among racers who FAILED their zone target AND had RB active
      const failed = grp.filter((r) => zoneIdxOf(r.finalRank) !== zi);
      const rbFail = failed.filter((r) => r.rbActivated).length;
      const rbPct  = failed.length ? (rbFail / failed.length * 100).toFixed(1) + '%' : '—';
      console.log(`| ${ZNAMES[zi].padEnd(9)} | ${String(oHits).padStart(9)} | ${String(openG.length).padStart(8)} | ${oPct.padStart(7)} | ${String(cHits).padStart(11)} | ${String(closG.length).padStart(10)} | ${cPct.padStart(8)} | ${allPct.padStart(7)} | ${rbPct.padStart(8)} |`);
    }

    // Overall row
    const allHits2  = zoneRows.filter((r) => zoneIdxOf(r.finalRank) === (r.sollBereich - 1)).length;
    const allFailed = zoneRows.filter((r) => zoneIdxOf(r.finalRank) !== (r.sollBereich - 1));
    const allRbFail = allFailed.filter((r) => r.rbActivated).length;
    const overallPct = (allHits2 / zoneRows.length * 100).toFixed(1) + '%';
    const overallRb  = allFailed.length ? (allRbFail / allFailed.length * 100).toFixed(1) + '%' : '—';
    console.log(`| ${'OVERALL'.padEnd(9)} | ${' '.repeat(9)} | ${' '.repeat(8)} | ${' '.repeat(7)} | ${' '.repeat(11)} | ${' '.repeat(10)} | ${' '.repeat(8)} | ${overallPct.padStart(7)} | ${overallRb.padStart(8)} |`);

    // Per-track breakdown
    const trackIds = [...new Set(zoneRows.map((r) => r.trackId))];
    console.log('\n--- Per-Track Zone Success ---');
    for (const tid of trackIds) {
      const tRows = zoneRows.filter((r) => r.trackId === tid);
      const tName = tRows[0].trackName;
      const tOpen = tRows[0].isOpen;
      const parts = [];
      for (let zi = 0; zi < 5; zi++) {
        const grp  = tRows.filter((r) => r.sollBereich === zi + 1);
        if (grp.length === 0) { parts.push('—'); continue; }
        const hits = grp.filter((r) => zoneIdxOf(r.finalRank) === zi).length;
        parts.push((hits / grp.length * 100).toFixed(0) + '%');
      }
      console.log(`  ${tName.padEnd(16)} (${tOpen ? 'open  ' : 'closed'})  B1=${parts[0]}  B2=${parts[1]}  B3=${parts[2]}  B4=${parts[3]}  B5=${parts[4]}`);
    }
    console.log('');
  }

  // Write JSON
  const jsonPath = join(OUT_DIR, 'fairness-data.json');
  writeFileSync(jsonPath, JSON.stringify({ meta: { nRaces: N_RACES, nRacers: N_RACERS, durationVariants: DURATION_VARIANTS }, results: allResults, rawData }, null, 2));
  console.log(`JSON → ${jsonPath}`);

  // Write Markdown report
  const runDate = new Date().toISOString().slice(0, 10);
  const report  = buildReport(allResults, rawData, runDate);
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
      const exp = r0?.expectedWinRate ?? (1 / r.stats.totalRows);
      console.log(`  ${r.trackName} × ${r.racerType} × ${r.durationSec}s  Row0=${fmtPct(r0?.winRate ?? 0)} (erw. ${fmtPct(exp)})  p=${r.stats.pValue.toFixed(3)}`);
    }
  }
}
