// ============================================================
// File:        racerAdapter.js
// Path:        client/src/modules/planner/racerAdapter.js
// Project:     RaceArena
// Description: Bi-directional adapter between the existing racer state
//              (r.t ∈ [0, maxLaps], r.physicalY ∈ [-1, 1]) and the planner's
//              HorseState (s in pixels, y in pixels, vS in px/s).
//
//              Coordinate system:
//                s  = (r.t % 1 + 1) % 1 * pathLengthPx   (arc-length within current lap)
//                y  = r.physicalY * corridorHalfWidthPx
//                vS = r.baseSpeed * pathLengthPx * 62.5   (approx px/sec at 60fps)
// ============================================================

import { computeScaledConfig } from './constraintsPlanner.js';

const FRAMES_PER_SEC = 62.5; // inverse of 16 ms frame time

/**
 * Build the initial PlannerState at race start. Called once before the first frame.
 * The caller must pass `createDiagnostics` imported from constraintsPlanner.js.
 *
 * @param {{
 *   racers: object[],
 *   pathLengthPx: number,
 *   corridorHalfWidthPx: number,
 *   isOpenTrack: boolean,
 *   trackModel: object,
 *   config: object,
 *   draftApi: object | null,
 *   createDiagnostics: Function,
 *   race_baseSpeed: number
 * }} opts
 * @returns {object} PlannerState
 */
export function initPlannerState({
  racers,
  pathLengthPx,
  corridorHalfWidthPx,
  isOpenTrack,
  trackModel,
  config,
  draftApi,
  createDiagnostics,
  race_baseSpeed,
}) {
  const horses = racers.map((r) => racerToHorse(r, pathLengthPx, corridorHalfWidthPx, isOpenTrack));

  // Scale kinematic limits to the actual pixel-space reference speed.
  // race_baseSpeed * pathLengthPx * 62.5 is the typical vS a racer runs at.
  const refVS = (race_baseSpeed ?? 0) * pathLengthPx * FRAMES_PER_SEC;
  const scaledConfig =
    refVS > 0 ? computeScaledConfig(config, refVS, corridorHalfWidthPx) : { ...config };

  return {
    timeSec: 0,
    frameIndex: 0,
    trackModel,
    horses,
    config: scaledConfig,
    diagnostics: createDiagnostics(),
    draftApi: draftApi ?? null,
  };
}

/**
 * Convert a live racer to a HorseState snapshot for the planner.
 * Called once at init; horse state is subsequently maintained by the planner.
 *
 * @param {object} r  Racer
 * @param {number} pathLengthPx
 * @param {number} corridorHalfWidthPx
 * @param {boolean} isOpenTrack
 * @returns {object} HorseState
 */
export function racerToHorse(r, pathLengthPx, corridorHalfWidthPx, isOpenTrack) {
  const tNorm = ((r.t % 1) + 1) % 1;
  const lapCount = isOpenTrack ? 0 : Math.max(0, Math.floor(r.t));
  const s = tNorm * pathLengthPx;
  const y = (r.physicalY ?? 0) * corridorHalfWidthPx;
  const vS = (r.baseSpeed ?? 0) * pathLengthPx * FRAMES_PER_SEC;
  const halfLong = r.visibleLengthPx ? r.visibleLengthPx / 2 : 12;
  const halfLat = r.visibleWidthPx ? r.visibleWidthPx / 2 : 10;

  return {
    id: String(r.index),
    lapCount,
    s,
    vS,
    aS: 0,
    y,
    vY: 0,
    aY: 0,
    headingError: 0,
    visibleWidthPx: r.visibleWidthPx ?? halfLat * 2,
    visibleLengthPx: r.visibleLengthPx ?? halfLong * 2,
    bboxLat: halfLat,
    bboxLong: halfLong,
    phase: r.finished ? 'finish' : 'race',
    commit: { mode: 'none', side: 0, remainingSec: 0 },
    target: {
      desiredY: 0,
      desiredVS: vS,
    },
    lastFeasiblePlan: null,
    render: { spriteX: r.x ?? 0, spriteY: r.y ?? 0, nameTagX: r.x ?? 0, nameTagY: r.y ?? 0 },
  };
}

/**
 * Sync the desired speed from the re-roll system into a horse's target before planFrame.
 * Call this for each live racer before planFrame() each frame.
 *
 * @param {object} horse  live HorseState (in plannerState.horses)
 * @param {object} r      live racer
 * @param {number} pathLengthPx
 */
export function syncDesiredSpeed(horse, r, pathLengthPx) {
  if (r.finished) {
    horse.phase = 'finish';
    horse.target.desiredVS = 0;
  } else {
    horse.phase = 'race';
    horse.target.desiredVS = r.baseSpeed * pathLengthPx * FRAMES_PER_SEC;
  }
}

/**
 * Write the planner's updated horse position back to the live racer.
 * Call this for each horse after planFrame().
 *
 * @param {object} horse   live HorseState (updated by planner)
 * @param {object} r       live racer (mutated in-place)
 * @param {number} pathLengthPx
 * @param {number} corridorHalfWidthPx
 * @param {boolean} isOpenTrack
 * @param {number} raceBaseSpeed  calibrated base speed (race_baseSpeed from init)
 */
export function applyHorseToRacer(
  horse,
  r,
  pathLengthPx,
  corridorHalfWidthPx,
  isOpenTrack,
  raceBaseSpeed
) {
  // Update t: lap-offset + fractional position within lap.
  // Applies to both racing and finished racers — planner decelerates finished horses,
  // so their t keeps increasing slightly during the runout until vS → 0.
  const tFrac = horse.s / pathLengthPx;
  r.t = isOpenTrack ? tFrac : horse.lapCount + tFrac;

  // Lateral: horse.y (px) → r.physicalY (normalised [-1, 1])
  r.physicalY =
    corridorHalfWidthPx > 0 ? Math.max(-1, Math.min(1, horse.y / corridorHalfWidthPx)) : 0;

  // vt for CameraDirector: dimensionless speed relative to race_baseSpeed
  const refVS = raceBaseSpeed * pathLengthPx * FRAMES_PER_SEC;
  r.vt = refVS > 0 ? horse.vS / refVS : 0;

  if (!r.finished) {
    // Surface flags only meaningful for still-racing horses
    r.avoidanceActive = horse.lastFeasiblePlan?.flags.slowedForSafety ?? false;
    r.draftingBoostActive = Boolean(
      horse.lastFeasiblePlan?.flags.isFeasible &&
      !horse.lastFeasiblePlan?.flags.slowedForSafety &&
      (horse.lastFeasiblePlan?.appliedControl.aS_cmd ?? 0) > 0
    );
  }
}

/**
 * Build a TrackModel from race-init geometry data.
 *
 * @param {{
 *   pathLengthPx: number,
 *   corridorHalfWidthPx: number
 * }} opts
 * @returns {object} TrackModel
 */
export function buildTrackModel({ pathLengthPx, corridorHalfWidthPx }) {
  return {
    lengthS: pathLengthPx,
    corridorHalfWidthPx,
    yMin: () => -corridorHalfWidthPx,
    yMax: () => corridorHalfWidthPx,
    centerlineY: () => 0,
    curvature: () => 0,
    surfaceParams: { baseGrip: 1.0, dirtSlipFactor: 0.05 },
  };
}

/**
 * Build a draftApi compatible with the existing drafting logic in raceBehavior.js.
 * World-space cone-based drafting check using racer x/y positions.
 *
 * @param {{
 *   draftingMaxDistance: number,
 *   draftingConeAngle: number,
 *   draftingBoost: number
 * }} behaviorConfig
 * @param {Map<string, object>} racersByHorseId  horse.id → live racer
 * @returns {{ computeDraftBonus: Function }}
 */
export function buildDraftApi(behaviorConfig, racersByHorseId) {
  return {
    computeDraftBonus(horse, allHorses, _trackModel) {
      const r = racersByHorseId.get(horse.id);
      if (!r) return { targetId: null, bonus: 0 };

      const coneHalf = (behaviorConfig.draftingConeAngle * Math.PI) / 180 / 2;

      for (const other of allHorses) {
        if (other.id === horse.id) continue;
        const otherR = racersByHorseId.get(other.id);
        if (!otherR) continue;

        // leader must be ahead in race progress
        if (other.lapCount < horse.lapCount) continue;
        if (other.lapCount === horse.lapCount && other.s <= horse.s) continue;

        // World-space distance
        const dx = r.x - otherR.x;
        const dy = r.y - otherR.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= behaviorConfig.draftingMaxDistance) continue;

        // Cone check: follower must be directly behind leader
        const behindAngle = otherR.angle + Math.PI;
        const followerAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(_normalizeAngle(followerAngle - behindAngle));
        if (angleDiff > coneHalf) continue;

        return { targetId: other.id, bonus: behaviorConfig.draftingBoost - 1 };
      }

      return { targetId: null, bonus: 0 };
    },
  };
}

function _normalizeAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
