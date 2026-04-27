// ============================================================
// File:        raceBehavior.js
// Path:        client/src/modules/raceBehavior.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Pure racer-behavior logic for D11: soft avoidance and drafting.
//              Functions mutate racer objects in-place, no React or DOM deps.
// ============================================================

/**
 * Initialise per-racer behavior state. Call once per racer at race start.
 * @param {{ trackOffset: number, [key: string]: unknown }} racer
 */
export function initRacerBehavior(racer) {
  racer.targetLaneY = racer.trackOffset;
  racer.currentLaneY = racer.trackOffset;
  racer.avoidanceActive = false;
  racer.draftingBoostActive = false;
}

/**
 * Apply avoidance + drafting forces. Mutates racer state in-place.
 * Must be called AFTER world positions (r.x, r.y) have been computed.
 *
 * @param {Array<{ index: number, x: number, y: number, t: number,
 *                 currentLaneY: number, targetLaneY: number,
 *                 finished: boolean, avoidanceActive: boolean,
 *                 draftingBoostActive: boolean }>} racers
 * @param {{ enabled: boolean, avoidanceDistance: number,
 *            avoidanceLateralForce: number, avoidanceMaxLateral: number,
 *            avoidanceSpeedBrake: number, avoidanceReturnSpeed: number,
 *            draftingDistanceT: number, draftingLaneThreshold: number,
 *            draftingBoostFactor: number }} config
 */
export function applyRacerBehavior(racers, config) {
  if (!config.enabled) {
    for (const r of racers) {
      r.currentLaneY = r.targetLaneY;
      r.avoidanceActive = false;
      r.draftingBoostActive = false;
    }
    return;
  }

  const active = racers.filter((r) => !r.finished);

  // Accumulate lateral forces per racer index
  const lateralForces = new Map(active.map((r) => [r.index, 0]));
  const speedBrakeSet = new Set();

  // Reset drafting flags
  for (const r of active) r.draftingBoostActive = false;

  // ── Avoidance ──────────────────────────────────────────────────────────────
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const r1 = active[i];
      const r2 = active[j];
      const dx = r2.x - r1.x;
      const dy = r2.y - r1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0 || dist >= config.avoidanceDistance) continue;

      // Scale force by proximity: full force at dist=0, zero force at avoidanceDistance
      const forceMag = config.avoidanceLateralForce * (1 - dist / config.avoidanceDistance);

      // Push apart in normalized-offset space: racer with higher offset goes higher,
      // racer with lower offset goes lower. Ties break deterministically (r1 → +).
      const laneDiff = r1.currentLaneY - r2.currentLaneY;
      const pushSign = laneDiff >= 0 ? 1 : -1;

      lateralForces.set(r1.index, lateralForces.get(r1.index) + pushSign * forceMag);
      lateralForces.set(r2.index, lateralForces.get(r2.index) - pushSign * forceMag);
      speedBrakeSet.add(r1.index);
      speedBrakeSet.add(r2.index);
    }
  }

  // Apply lateral forces and smooth-return to targetLaneY
  for (const r of active) {
    const force = lateralForces.get(r.index) ?? 0;
    r.avoidanceActive = speedBrakeSet.has(r.index);

    if (force !== 0) {
      r.currentLaneY += force;
      // Clamp: max deviation from target, also within valid track range [-0.5, 0.5]
      const lo = Math.max(-0.5, r.targetLaneY - config.avoidanceMaxLateral);
      const hi = Math.min(0.5, r.targetLaneY + config.avoidanceMaxLateral);
      r.currentLaneY = Math.max(lo, Math.min(hi, r.currentLaneY));
    } else {
      // Smooth interpolation back to target when no avoidance force
      r.currentLaneY += (r.targetLaneY - r.currentLaneY) * config.avoidanceReturnSpeed;
    }
  }

  // ── Drafting ───────────────────────────────────────────────────────────────
  for (let i = 0; i < active.length; i++) {
    const follower = active[i];
    for (let j = 0; j < active.length; j++) {
      if (i === j) continue;
      const leader = active[j];
      if (leader.t <= follower.t) continue; // leader must be ahead
      if (leader.t - follower.t > config.draftingDistanceT) continue;
      if (Math.abs(follower.currentLaneY - leader.currentLaneY) > config.draftingLaneThreshold)
        continue;
      follower.draftingBoostActive = true;
      break; // one drafter target is enough
    }
  }
}
