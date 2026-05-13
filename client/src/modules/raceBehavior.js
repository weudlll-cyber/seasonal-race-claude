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
  racer.avoidanceBrakeFactor = 0;
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
 *   draftingMaxDistance: number, draftingConeAngle: number, draftingBoost: number
 * }} config
 * @param {number} antiCollisionFactor - activation factor in [0,1] for lateral anti-collision and speed brake
 */
export function applyRacerBehavior(racers, config, antiCollisionFactor = 1) {
  const factor = Math.max(0, Math.min(1, antiCollisionFactor));

  if (!config.enabled) {
    for (const r of racers) {
      r.avoidanceActive = false;
      r.avoidanceBrakeFactor = 0;
      r.draftingBoostActive = false;
    }
    return;
  }

  const active = racers.filter((r) => !r.finished);
  for (const r of active) {
    r.draftingBoostActive = false;
    r.avoidanceBrakeFactor = 0;
  }

  // Accumulate physicalY deltas from home force + avoidance
  const yDeltas = new Map(active.map((r) => [r.index, 0]));
  // Avoidance accumulated separately for sqrt(neighborCount) normalization (A3/B3)
  const yAvoidDeltas = new Map(active.map((r) => [r.index, 0]));
  const neighborCounts = new Map(active.map((r) => [r.index, 0]));
  const speedBrakeSet = new Set();

  // ── Home force — spring toward centerline ──────────────────────────────────
  for (const r of active) {
    yDeltas.set(r.index, -r.physicalY * config.homeForceStrength);
  }

  // ── Avoidance (anisotropic, asymmetric: trailer yields, leader holds) ──────
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const rA = active[i];
      const rB = active[j];

      // Anisotropic distance in (t, physicalY) space
      let dT = Math.abs(rA.t - rB.t);
      if (dT > 0.5) dT = 1 - dT; // shortest arc on closed tracks
      const dY = rA.physicalY - rB.physicalY;
      const dist = Math.sqrt((dT * config.tWeight) ** 2 + (dY * config.yWeight) ** 2);
      if (dist >= config.avoidanceDistance) continue;

      // Proximity-scaled lateral force
      const forceMag = config.lateralForce * (1 - dist / config.avoidanceDistance);

      // Trailer = lower t, tie-break by index. Trailer yields; leader holds.
      const aIsTrailer = rA.t < rB.t || (rA.t === rB.t && rA.index < rB.index);
      const trailer = aIsTrailer ? rA : rB;
      const leader = aIsTrailer ? rB : rA;

      // Speed brake: apply to trailer when truly side-by-side (close in both Y and T).
      // Evaluated before the yDiff skip so it fires even when racers share the same Y.
      if (Math.abs(dY) < config.speedBrakeYThreshold && dT < config.speedBrakeTThreshold) {
        speedBrakeSet.add(trailer.index);
      }

      // Push trailer away from leader's physicalY.
      // When yDiff ≈ 0 there is no meaningful push direction — skip to avoid all trailers
      // rushing toward positive physicalY (the degenerate yDiff≥0 branch).
      const yDiff = trailer.physicalY - leader.physicalY;
      if (Math.abs(yDiff) < 1e-6) continue;
      const pushDir = yDiff >= 0 ? 1 : -1;
      yAvoidDeltas.set(trailer.index, yAvoidDeltas.get(trailer.index) + pushDir * forceMag);
      neighborCounts.set(trailer.index, neighborCounts.get(trailer.index) + 1);
    }
  }

  // Anti-stacking: normalize each racer's avoidance sum by sqrt(neighborCount).
  // Prevents boundary-clinging at high racer counts where linear force accumulation
  // across N neighbors would otherwise overwhelm restoring forces.
  for (const r of active) {
    const count = neighborCounts.get(r.index);
    const avoid =
      count > 1 ? yAvoidDeltas.get(r.index) / Math.sqrt(count) : yAvoidDeltas.get(r.index);
    yDeltas.set(r.index, yDeltas.get(r.index) + avoid);
  }

  // Apply deltas + soft repulsion + hard clamp
  for (const r of active) {
    const beforeY = r.physicalY;
    let targetY = beforeY + (yDeltas.get(r.index) ?? 0);

    // Soft repulsion: grows quadratically as physicalY approaches boundary
    const absY = Math.abs(targetY);
    if (absY >= config.comfortThreshold && absY < 1.0) {
      const pen = (absY - config.comfortThreshold) / (1.0 - config.comfortThreshold);
      targetY -= Math.sign(targetY) * config.softRepulsionStrength * pen * pen;
    }

    // maxLateral cap + hard boundary clamp
    const cap = Math.min(config.maxLateral, 1.0);
    const cappedTargetY = Math.max(-cap, Math.min(cap, targetY));
    const blendedY = beforeY + (cappedTargetY - beforeY) * factor;
    r.physicalY = Math.max(-cap, Math.min(cap, blendedY));
    r.avoidanceActive = speedBrakeSet.has(r.index);
    r.avoidanceBrakeFactor = r.avoidanceActive ? factor : 0;
  }

  // ── Drafting — cone behind leader in world-pixel space ────────────────────
  // Structural note (PR-A2.6 diagnosis): on tight curves the track direction rotates quickly,
  // so the cone occasionally misses a follower that is physically in the slipstream.
  // A full cone-geometry refactor is a separate Backlog item and is NOT done here.
  const coneHalf = (config.draftingConeAngle * Math.PI) / 180 / 2;
  for (let i = 0; i < active.length; i++) {
    const follower = active[i];
    for (let j = 0; j < active.length; j++) {
      if (i === j) continue;
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
      break;
    }
  }
}
