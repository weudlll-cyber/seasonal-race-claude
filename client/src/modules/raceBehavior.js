// ============================================================
// File:        raceBehavior.js
// Path:        client/src/modules/raceBehavior.js
// Project:     RaceArena
// Description: PBD (Position-Based Dynamics) race AI — replaces all prior
//              force/slot/sight-based anti-collision architectures.
//              Frame structure per tick:
//                Step 1 — Predicted Positions: apply centerline attraction to targetPhysicalY.
//                Step 2 — Constraint Resolution: iteratively push overlapping pairs apart,
//                         writing corrections to targetPhysicalY (never physicalY directly).
//                Step 3 — Smooth Movement: move physicalY toward targetPhysicalY at most
//                         maxLateralStepPerFrame px per frame — no visible jumps.
//                Drafting: smooth cone activation via draftingBoostFactor (0→1 over frames).
//              physicalY ∈ [-1, +1]: -1 = inner boundary, 0 = centerline, +1 = outer.
//              Asymmetric resolution: leader (higher t) yields frontWeight fraction,
//              follower yields (1 - frontWeight) fraction.
// ============================================================

const MAX_LATERAL = 0.95;

function normalizeAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * Signed t-gap from rA to rB on circular track [0, 1).
 * Positive means rB is ahead of rA.
 */
function tGapSigned(rA, rB) {
  let gap = rB.t - rA.t;
  if (gap > 0.5) gap -= 1;
  if (gap < -0.5) gap += 1;
  return gap;
}

/**
 * Initialise per-racer behavior state. Call once per racer at race start.
 * physicalY is set by computeRowPhysicalY (rowLayout.js) before this is called.
 * @param {{ [key: string]: unknown }} racer
 */
export function initRacerBehavior(racer) {
  racer.physicalY = racer.physicalY ?? 0;
  racer.targetPhysicalY = racer.physicalY;
  racer.draftingBoostFactor = 0;
  racer.avoidanceActive = false;
  racer.draftingBoostActive = false;
}

/**
 * Apply PBD anti-collision + centerline attraction + drafting for one frame.
 * Mutates racer state in-place.
 *
 * Must be called AFTER world positions (r.x, r.y, r.angle) have been computed
 * for the current frame — longitudinal overlap check and drafting use world positions.
 *
 * @param {Array<{
 *   index: number, x: number, y: number, angle: number, t: number,
 *   physicalY: number, targetPhysicalY: number, draftingBoostFactor: number,
 *   visibleWidthPx?: number, visibleLengthPx?: number,
 *   finished: boolean, avoidanceActive: boolean, draftingBoostActive: boolean
 * }>} racers
 * @param {{
 *   enabled: boolean,
 *   pbdIterationsPerFrame: number,
 *   frontWeight: number,
 *   centerlineForce: number,
 *   safetyMarginPx: number,
 *   maxLateralStepPerFrame: number,
 *   speedBrakeFactor: number,
 *   draftingActivationFrames: number,
 *   draftingMaxDistance: number, draftingConeAngle: number, draftingBoost: number,
 *   corridorHalfWidthPx?: number
 * }} config
 */
export function applyRacerBehavior(racers, config) {
  if (!config.enabled) {
    for (const r of racers) {
      r.avoidanceActive = false;
      r.draftingBoostActive = false;
    }
    return;
  }

  const active = racers.filter((r) => !r.finished);
  const corridorHalf = config.corridorHalfWidthPx ?? 75;
  const safetyPx = config.safetyMarginPx ?? 4;
  const maxLatStep = (config.maxLateralStepPerFrame ?? 4) / corridorHalf;
  const centerlineForce = config.centerlineForce ?? 0.02;
  const frontWeight = config.frontWeight ?? 0.2;
  const iterations = config.pbdIterationsPerFrame ?? 5;
  const draftActivStep = 1 / (config.draftingActivationFrames ?? 20);
  const coneHalf = ((config.draftingConeAngle ?? 30) * Math.PI) / 180 / 2;

  for (const r of active) {
    r.avoidanceActive = false;
    r.draftingBoostActive = false;
  }

  // ── Step 1: Predicted Positions — centerline attraction ───────────────────
  // Pull targetPhysicalY toward 0 by centerlineForce fraction each frame.
  // This is a "wish" — PBD step 2 corrects it if overlap results.
  for (const r of active) {
    r.targetPhysicalY = r.targetPhysicalY * (1 - centerlineForce);
    r.targetPhysicalY = Math.max(-MAX_LATERAL, Math.min(MAX_LATERAL, r.targetPhysicalY));
  }

  // ── Step 2: PBD Constraint Resolution ────────────────────────────────────
  // Iterate pbdIterationsPerFrame times. Each pass checks all pairs.
  // Lateral overlap: targetPhysicalY difference in normalized space.
  // Longitudinal overlap: world-space projection along track direction.
  // Corrections go to targetPhysicalY only — physicalY is never written here.
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const rA = active[i];
        const rB = active[j];

        // Lateral: check predicted positions in normalized space
        const halfWidthA = (rA.visibleWidthPx ?? 24) / 2 / corridorHalf;
        const halfWidthB = (rB.visibleWidthPx ?? 24) / 2 / corridorHalf;
        const minLat = halfWidthA + halfWidthB + safetyPx / corridorHalf;

        const latDiff = rA.targetPhysicalY - rB.targetPhysicalY;
        if (Math.abs(latDiff) >= minLat) continue; // no lateral overlap

        // Longitudinal: project world-space vector onto midpoint track direction
        const midAngle = (rA.angle + rB.angle) * 0.5;
        const cosM = Math.cos(midAngle);
        const sinM = Math.sin(midAngle);
        const dx = rB.x - rA.x;
        const dy = rB.y - rA.y;
        const longDist = Math.abs(dx * cosM + dy * sinM);
        const minLong = (rA.visibleLengthPx ?? 24) / 2 + (rB.visibleLengthPx ?? 24) / 2 + safetyPx;
        if (longDist >= minLong) continue; // longitudinally clear — no correction

        // True hitbox overlap — asymmetric push-apart.
        // Leader (positive tGap means rB is ahead of rA) yields frontWeight.
        // Follower yields (1 - frontWeight).
        const overlap = minLat - Math.abs(latDiff);
        const tGap = tGapSigned(rA, rB); // > 0 → rB ahead of rA
        const aIsLeader = tGap < 0;
        const shareA = aIsLeader ? frontWeight : 1 - frontWeight;
        const shareB = aIsLeader ? 1 - frontWeight : frontWeight;

        // Push direction: positive latDiff → rA is "outer" → push rA further out, rB further in.
        // Tiebreaker when latDiff === 0: rA goes positive, rB goes negative.
        const pushDir = latDiff !== 0 ? Math.sign(latDiff) : 1;

        rA.targetPhysicalY = Math.max(
          -MAX_LATERAL,
          Math.min(MAX_LATERAL, rA.targetPhysicalY + pushDir * shareA * overlap)
        );
        rB.targetPhysicalY = Math.max(
          -MAX_LATERAL,
          Math.min(MAX_LATERAL, rB.targetPhysicalY - pushDir * shareB * overlap)
        );
      }
    }
  }

  // ── Step 3: Smooth lateral movement — hard cap prevents visible jumps ─────
  // physicalY follows targetPhysicalY at most maxLateralStepPerFrame px/frame.
  // Smooth movement comes from the model; no Render-EMA (Lesson 70).
  for (const r of active) {
    const delta = r.targetPhysicalY - r.physicalY;
    const step = Math.sign(delta) * Math.min(Math.abs(delta), maxLatStep);
    r.physicalY = Math.max(-MAX_LATERAL, Math.min(MAX_LATERAL, r.physicalY + step));
  }

  // ── Drafting: smooth cone activation via draftingBoostFactor ─────────────
  for (let i = 0; i < active.length; i++) {
    const follower = active[i];
    let inCone = false;

    for (let j = 0; j < active.length; j++) {
      if (i === j) continue;
      const leader = active[j];
      if (leader.t <= follower.t) continue;

      const dx = follower.x - leader.x;
      const dy = follower.y - leader.y;
      const worldDist = Math.sqrt(dx * dx + dy * dy);
      if (worldDist >= config.draftingMaxDistance) continue;

      const behindAngle = leader.angle + Math.PI;
      const followerAngle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(normalizeAngle(followerAngle - behindAngle));
      if (angleDiff > coneHalf) continue;

      inCone = true;
      break;
    }

    if (inCone) {
      follower.draftingBoostFactor = Math.min(
        1,
        (follower.draftingBoostFactor ?? 0) + draftActivStep
      );
    } else {
      follower.draftingBoostFactor = Math.max(
        0,
        (follower.draftingBoostFactor ?? 0) - draftActivStep
      );
    }
    follower.draftingBoostActive = follower.draftingBoostFactor > 0.01;
  }
}
