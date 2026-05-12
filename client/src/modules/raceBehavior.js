// ============================================================
// File:        raceBehavior.js
// Path:        client/src/modules/raceBehavior.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Pure racer-behavior logic for D7b: lane-free avoidance and
//              drafting on continuous physicalY in normalized track-width space.
//              physicalY ∈ [-1, +1]: -1 = inner boundary, 0 = centerline, +1 = outer.
//              Functions mutate racer objects in-place, no React or DOM deps.
// ============================================================

/**
 * Initialise per-racer behavior state. Call once per racer at race start.
 * physicalY is set by computeRowPhysicalY (rowLayout.js) before this is called.
 * @param {{ [key: string]: unknown }} racer
 */
export function initRacerBehavior(racer) {
  racer.physicalY = 0;
  racer.avoidanceActive = false;
  racer.draftingBoostActive = false;
}

/**
 * Normalize an angle to [-π, π].
 * @param {number} a
 * @returns {number}
 */
function normalizeAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// Per-race phase state. Key = race ID (or a symbol for singleton use), value = 'start' | 'race'.
// Populated lazily; cleared when a new race starts via resetRacePhase().
const _phaseMap = new Map();

/**
 * Reset phase tracking for a given race instance.
 * Call once at race start (before the first applyRacerBehavior call).
 * @param {string|symbol} raceId
 */
export function resetRacePhase(raceId) {
  _phaseMap.set(raceId, 'start');
}

/**
 * Apply avoidance + drafting forces for one frame. Mutates racer state in-place.
 * Must be called AFTER world positions (r.x, r.y, r.angle) have been computed for
 * the current frame — drafting uses world-space positions; avoidance uses
 * anisotropic (t, physicalY) distance.
 *
 * @param {Array<{
 *   index: number, x: number, y: number, angle: number, t: number,
 *   physicalY: number, finished: boolean,
 *   avoidanceActive: boolean, draftingBoostActive: boolean
 * }>} racers
 * @param {{
 *   enabled: boolean,
 *   homeForceStrength: number,
 *   comfortThreshold: number, softRepulsionStrength: number,
 *   avoidanceDistance: number, tWeight: number, yWeight: number,
 *   lateralForce: number, maxLateral: number,
 *   speedBrakeYThreshold: number, speedBrakeTThreshold: number,
 *   speedBrakeFactor: number,
 *   draftingMaxDistance: number, draftingConeAngle: number, draftingBoost: number,
 *   minLateralEpsilon: number, crowdNormalizationExponent: number,
 *   symmetricAvoidance: boolean, draftingMaxTargets: number,
 *   avoidanceStrictness: number,
 *   startPhaseSpreadThreshold: number,
 *   startPhaseAvoidanceFactor: number, startPhaseHomeForceFactor: number
 * }} config
 * @param {string|symbol} [raceId]  Race identifier for phase tracking. Omit for
 *   legacy callers / tests — phase tracking is skipped and race-phase forces are applied.
 */
export function applyRacerBehavior(racers, config, raceId) {
  if (!config.enabled) {
    for (const r of racers) {
      r.avoidanceActive = false;
      r.draftingBoostActive = false;
    }
    return;
  }

  // ── Phase detection ───────────────────────────────────────────────────────
  // Dynamically detect start vs race phase from field spread (max(t) - min(t)).
  // Once field spread exceeds threshold, switch permanently to race phase.
  let inStartPhase = false;
  if (raceId !== undefined) {
    if (!_phaseMap.has(raceId)) _phaseMap.set(raceId, 'start');
    if (_phaseMap.get(raceId) === 'start') {
      const active0 = racers.filter((r) => !r.finished);
      if (active0.length >= 2) {
        const tVals = active0.map((r) => r.t);
        const spread = Math.max(...tVals) - Math.min(...tVals);
        if (spread >= config.startPhaseSpreadThreshold) {
          _phaseMap.set(raceId, 'race');
        } else {
          inStartPhase = true;
        }
      }
    }
  }

  // Effective force multipliers for this frame
  const avoidMult = inStartPhase ? config.startPhaseAvoidanceFactor : 1.0;
  const homeMult = inStartPhase ? config.startPhaseHomeForceFactor : 1.0;

  // avoidanceStrictness scales both lateralForce and avoidanceDistance.
  // strictness=0.5 → effectiveLateral = lateralForce × 2 (so default 0.04 × 2 = 0.08)
  // Clamped so the scaler is never < 1/3.
  const s = config.avoidanceStrictness ?? 0.5;
  const effectiveLateralForce = config.lateralForce * (1 + 2 * s);
  const effectiveAvoidanceDist = config.avoidanceDistance * (1 + s);

  const active = racers.filter((r) => !r.finished);
  for (const r of active) r.draftingBoostActive = false;

  // Accumulate physicalY deltas from home force + avoidance
  const yDeltas = new Map(active.map((r) => [r.index, 0]));
  // Avoidance accumulated separately for normalization
  const yAvoidDeltas = new Map(active.map((r) => [r.index, 0]));
  const neighborCounts = new Map(active.map((r) => [r.index, 0]));
  const speedBrakeSet = new Set();

  // ── Home force — spring toward centerline ──────────────────────────────────
  for (const r of active) {
    yDeltas.set(r.index, -r.physicalY * config.homeForceStrength * homeMult);
  }

  // ── Avoidance ──────────────────────────────────────────────────────────────
  const epsilon = config.minLateralEpsilon ?? 0.01;
  const symmetric = config.symmetricAvoidance ?? true;

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const rA = active[i];
      const rB = active[j];

      // Anisotropic distance in (t, physicalY) space
      let dT = Math.abs(rA.t - rB.t);
      if (dT > 0.5) dT = 1 - dT; // shortest arc on closed tracks
      const dY = rA.physicalY - rB.physicalY;
      const dist = Math.sqrt((dT * config.tWeight) ** 2 + (dY * config.yWeight) ** 2);
      if (dist >= effectiveAvoidanceDist) continue;

      // Proximity-scaled lateral force (uses strictness-scaled values)
      const forceMag = effectiveLateralForce * avoidMult * (1 - dist / effectiveAvoidanceDist);

      // Trailer = lower t, tie-break by index.
      const aIsTrailer = rA.t < rB.t || (rA.t === rB.t && rA.index < rB.index);
      const trailer = aIsTrailer ? rA : rB;
      const leader = aIsTrailer ? rB : rA;

      // Speed brake: apply to trailer when truly side-by-side.
      if (Math.abs(dY) < config.speedBrakeYThreshold && dT < config.speedBrakeTThreshold) {
        speedBrakeSet.add(trailer.index);
      }

      // Determine lateral push direction.
      // If |dY| < epsilon, use deterministic tie-breaking:
      // racer with higher index pushes toward +Y, lower index toward -Y.
      let pushDir;
      if (Math.abs(dY) < epsilon) {
        pushDir = trailer.index > leader.index ? 1 : -1;
      } else {
        pushDir = dY >= 0 ? 1 : -1; // push trailer away from leader
      }

      if (symmetric) {
        // Both racers share the force: trailer moves away, leader moves toward
        // (half force each — net separation is the same, but leader participates)
        yAvoidDeltas.set(trailer.index, yAvoidDeltas.get(trailer.index) + pushDir * forceMag * 0.5);
        yAvoidDeltas.set(leader.index, yAvoidDeltas.get(leader.index) - pushDir * forceMag * 0.5);
        neighborCounts.set(trailer.index, neighborCounts.get(trailer.index) + 1);
        neighborCounts.set(leader.index, neighborCounts.get(leader.index) + 1);
      } else {
        // Legacy: only trailer yields
        yAvoidDeltas.set(trailer.index, yAvoidDeltas.get(trailer.index) + pushDir * forceMag);
        neighborCounts.set(trailer.index, neighborCounts.get(trailer.index) + 1);
      }
    }
  }

  // Anti-stacking: normalize by neighborCount^crowdNormalizationExponent.
  const exp = config.crowdNormalizationExponent ?? 0.5;
  for (const r of active) {
    const count = neighborCounts.get(r.index);
    const avoid =
      count > 1 ? yAvoidDeltas.get(r.index) / Math.pow(count, exp) : yAvoidDeltas.get(r.index);
    yDeltas.set(r.index, yDeltas.get(r.index) + avoid);
  }

  // Apply deltas + soft repulsion + hard clamp
  for (const r of active) {
    let newY = r.physicalY + (yDeltas.get(r.index) ?? 0);

    // Soft repulsion: grows quadratically as physicalY approaches boundary
    const absY = Math.abs(newY);
    if (absY >= config.comfortThreshold && absY < 1.0) {
      const pen = (absY - config.comfortThreshold) / (1.0 - config.comfortThreshold);
      newY -= Math.sign(newY) * config.softRepulsionStrength * pen * pen;
    }

    // maxLateral cap + hard boundary clamp
    const cap = Math.min(config.maxLateral, 1.0);
    r.physicalY = Math.max(-cap, Math.min(cap, newY));
    r.avoidanceActive = speedBrakeSet.has(r.index);
  }

  // ── Drafting — cone behind leader in world-pixel space ────────────────────
  // Structural note (PR-A2.6 diagnosis): on tight curves the track direction rotates quickly,
  // so the cone occasionally misses a follower that is physically in the slipstream.
  // A full cone-geometry refactor is a separate Backlog item and is NOT done here.
  const coneHalf = (config.draftingConeAngle * Math.PI) / 180 / 2;
  const maxTargets = config.draftingMaxTargets ?? 1;
  for (let i = 0; i < active.length; i++) {
    const follower = active[i];
    let targetsHit = 0;
    for (let j = 0; j < active.length; j++) {
      if (i === j) continue;
      if (targetsHit >= maxTargets) break;
      const leader = active[j];
      if (leader.t <= follower.t) continue; // leader must be ahead in race progress

      // World-space distance between follower and leader
      const dx = follower.x - leader.x;
      const dy = follower.y - leader.y;
      const worldDist = Math.sqrt(dx * dx + dy * dy);
      if (worldDist >= config.draftingMaxDistance) continue;

      // Cone check: is follower in the wake zone directly behind leader?
      // The wake opens opposite to the leader's movement direction.
      const behindAngle = leader.angle + Math.PI;
      const followerAngle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(normalizeAngle(followerAngle - behindAngle));
      if (angleDiff > coneHalf) continue;

      follower.draftingBoostActive = true;
      targetsHit++;
    }
  }
}
