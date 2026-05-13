// ============================================================
// File:        raceBehavior.js
// Path:        client/src/modules/raceBehavior.js
// Project:     RaceArena
// Description: Slot-based anti-collision logic replacing the former force-based avoidance.
//              Collision detection in world pixel space using sprite hitboxes.
//              Right-of-way hierarchy: line-holder > leader-of-pair > calmer lateral motion.
//              Speed-brake reused for hybrid fallback when no free slot is found.
//              Lateral movement smoothed via EMA (targetPhysicalY → physicalY) to prevent
//              frame-jump teleportation. Drafting cone unchanged.
//              physicalY ∈ [-1, +1]: -1 = inner boundary, 0 = centerline, +1 = outer.
// ============================================================

const MAX_LATERAL = 0.95;
const LATERAL_STABLE_THRESH = 0.005; // physicalY/frame — below this = "holding line"
const SPEED_DIFF_THRESH = 0.00005; // baseSpeed difference for "faster from behind" rule
// WALL_EPSILON: physicalY margin for "at wall" detection in wall-escape logic (Fix A).
const WALL_EPSILON = 0.02;

/**
 * Normalize an angle to [-π, π].
 * @param {number} a
 * @returns {number}
 */
function normalizeAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * Initialise per-racer behavior state. Call once per racer at race start.
 * physicalY and targetPhysicalY are overwritten by computeRowPhysicalY (rowLayout.js)
 * immediately after — RaceScreen must sync targetPhysicalY = physicalY after that call.
 * @param {{ [key: string]: unknown }} racer
 */
export function initRacerBehavior(racer) {
  racer.physicalY = 0;
  racer.targetPhysicalY = 0; // EMA target; RaceScreen syncs this after computeRowPhysicalY
  racer.prevPhysicalY = undefined; // set at end of first applyRacerBehavior call
  racer.avoidanceActive = false;
  racer.draftingBoostActive = false;
  // visibleWidthPx / visibleLengthPx: set from sprite hitbox in RaceScreen.
  // If not set before first applyRacerBehavior call, DEFAULT_HITBOX_PX is used.
}

/**
 * Apply slot-based anti-collision + drafting for one frame. Mutates racer state in-place.
 *
 * Must be called AFTER world positions (r.x, r.y, r.angle) have been computed for
 * the current frame — collision detection uses world-space pixel positions.
 *
 * @param {Array<{
 *   index: number, x: number, y: number, angle: number, t: number,
 *   physicalY: number, prevPhysicalY?: number,
 *   visibleWidthPx?: number, visibleLengthPx?: number,
 *   baseSpeed?: number, finished: boolean,
 *   avoidanceActive: boolean, draftingBoostActive: boolean
 * }>} racers
 * @param {{
 *   enabled: boolean,
 *   safetyMarginPx: number,
 *   lookAheadFrames: number,
 *   slotSearchRadiusPx: number,
 *   lateralReturnSpeed: number,
 *   speedBrakeFactor: number,
 *   draftingMaxDistance: number, draftingConeAngle: number, draftingBoost: number,
 *   corridorHalfWidthPx?: number
 * }} config
 */
export function applyRacerBehavior(racers, config) {
  if (!config.enabled) {
    for (const r of racers) {
      r.targetPhysicalY = r.physicalY; // keep target in sync when behavior is disabled
      r.avoidanceActive = false;
      r.draftingBoostActive = false;
    }
    return;
  }

  const active = racers.filter((r) => !r.finished);
  for (const r of active) {
    r.draftingBoostActive = false;
    r.avoidanceActive = false;
  }

  const safety = config.safetyMarginPx ?? 3;
  const lookAhead = config.lookAheadFrames ?? 3;
  const searchRadius = config.slotSearchRadiusPx ?? 60;
  const corridorHalf = config.corridorHalfWidthPx ?? 75;

  // Effective longitudinal safety buffer: safetyMarginPx scaled by look-ahead frames.
  // lookAheadFrames=0 means just the hitbox + safetyMarginPx; higher values add extra buffer
  // so the system starts resolving before the hitboxes touch.
  const longBuffer = safety * (1 + lookAhead);

  // ── Collision detection ────────────────────────────────────────────────────
  // For each pair compute separation in track-aligned axes (pixel space).
  const collisions = []; // { yielder, keeper }

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const rA = active[i];
      const rB = active[j];

      // Pixel separation decomposed along track direction (mid-angle of both racers).
      const midAngle = (rA.angle + rB.angle) * 0.5;
      const cosM = Math.cos(midAngle);
      const sinM = Math.sin(midAngle);
      const dx = rB.x - rA.x;
      const dy = rB.y - rA.y;
      const longSep = Math.abs(dx * cosM + dy * sinM);
      const latSep = Math.abs(-dx * sinM + dy * cosM);

      const wA = rA.visibleWidthPx ?? 24;
      const wB = rB.visibleWidthPx ?? 24;
      const lA = rA.visibleLengthPx ?? 24;
      const lB = rB.visibleLengthPx ?? 24;

      const minLat = (wA + wB) * 0.5 + safety;
      const minLong = (lA + lB) * 0.5 + longBuffer;

      if (longSep >= minLong || latSep >= minLat) continue;

      // Collision — classify right-of-way.
      const latSpeedA =
        rA.prevPhysicalY !== undefined ? Math.abs(rA.physicalY - rA.prevPhysicalY) : 0;
      const latSpeedB =
        rB.prevPhysicalY !== undefined ? Math.abs(rB.physicalY - rB.prevPhysicalY) : 0;

      const aStable = latSpeedA <= LATERAL_STABLE_THRESH;
      const bStable = latSpeedB <= LATERAL_STABLE_THRESH;

      let yielder, keeper;

      // (a) Line-holder has right of way.
      if (aStable && !bStable) {
        yielder = rB;
        keeper = rA;
      } else if (bStable && !aIsTrailer(rA, rB)) {
        // B is stable, A is the trailer by t-position — A should yield
        yielder = rA;
        keeper = rB;
      } else {
        // Both stable or both moving — apply t-position and speed rules.
        const aTrailer = aIsTrailer(rA, rB);
        const trailer = aTrailer ? rA : rB;
        const leader = aTrailer ? rB : rA;

        const trailerSpeed = trailer.baseSpeed ?? 0;
        const leaderSpeed = leader.baseSpeed ?? 0;

        if (trailerSpeed > leaderSpeed + SPEED_DIFF_THRESH) {
          // (b) Faster-from-behind: overtaker yields.
          yielder = trailer;
          keeper = leader;
        } else {
          // (c) Calmer lateral motion holds; more active one yields.
          yielder = latSpeedA <= latSpeedB ? rB : rA;
          keeper = yielder === rA ? rB : rA;
        }
      }

      // (d) Schutz-Regel: if the resolved keeper is actually falling back fast (higher lateral
      // motion than the yielder), swap them. Protects a racer that has just started a new slot
      // from being immediately overridden.
      if (keeper.prevPhysicalY !== undefined) {
        const keeperLat =
          keeper.prevPhysicalY !== undefined
            ? Math.abs(keeper.physicalY - keeper.prevPhysicalY)
            : 0;
        const yielderLat =
          yielder.prevPhysicalY !== undefined
            ? Math.abs(yielder.physicalY - yielder.prevPhysicalY)
            : 0;
        if (keeperLat > yielderLat * 2 && keeperLat > LATERAL_STABLE_THRESH) {
          [yielder, keeper] = [keeper, yielder];
        }
      }

      collisions.push({ yielder, keeper });
    }
  }

  // ── Slot search ────────────────────────────────────────────────────────────
  // For each yielder find the nearest physicalY where it does not collide with anyone.
  const targetY = new Map(active.map((r) => [r.index, r.physicalY]));
  const resolved = new Set();

  for (const { yielder, keeper } of collisions) {
    if (resolved.has(yielder.index)) continue;

    // Slot step ≥ minLat so each candidate clears a full neighbor in one jump (Fix B).
    // Prevents the squeeze-attractor dead-lock where fine-grained steps land in occupied gaps.
    // Resolves Pair 4_9 pattern documented in classification-trace-analysis.md.
    const wYielder = yielder.visibleWidthPx ?? 24;
    const slotStepPx = wYielder + safety;
    // Guarantee at least 4 search steps per side regardless of slotSearchRadiusPx setting.
    const effectiveRadius = Math.max(searchRadius, slotStepPx * 4);

    // Build candidate slots: try increasing offsets in both lateral directions.
    const candidates = [];
    for (let deltaPx = slotStepPx; deltaPx <= effectiveRadius; deltaPx += slotStepPx) {
      const dY = deltaPx / corridorHalf;
      candidates.push(yielder.physicalY + dY);
      candidates.push(yielder.physicalY - dY);
    }
    // Prefer minimum displacement from current position (already in distance order above).

    let foundSlot = false;
    for (const cy of candidates) {
      if (Math.abs(cy) > MAX_LATERAL) continue;

      // Predicted world position for yielder at candidate physicalY.
      const sinYA = Math.sin(yielder.angle);
      const cosYA = Math.cos(yielder.angle);
      const dPhys = cy - yielder.physicalY;
      const predX = yielder.x + dPhys * corridorHalf * -sinYA;
      const predY = yielder.y + dPhys * corridorHalf * cosYA;

      const wY = yielder.visibleWidthPx ?? 24;
      const lY = yielder.visibleLengthPx ?? 24;

      let slotClear = true;
      for (const other of active) {
        if (other.index === yielder.index) continue;

        const midAngle = (yielder.angle + other.angle) * 0.5;
        const cosM = Math.cos(midAngle);
        const sinM = Math.sin(midAngle);
        const ddx = predX - other.x;
        const ddy = predY - other.y;
        const ls = Math.abs(ddx * cosM + ddy * sinM);
        const lats = Math.abs(-ddx * sinM + ddy * cosM);

        const wO = other.visibleWidthPx ?? 24;
        const lO = other.visibleLengthPx ?? 24;
        const minLat = (wY + wO) * 0.5 + safety;
        const minLong = (lY + lO) * 0.5 + safety; // no extra look-ahead buffer for slot check

        if (ls < minLong && lats < minLat) {
          slotClear = false;
          break;
        }
      }

      if (slotClear) {
        targetY.set(yielder.index, cy);
        resolved.add(yielder.index);
        foundSlot = true;
        break;
      }
    }

    if (!foundSlot) {
      // Hybrid fallback: activate speed brake + small nudge away from keeper.
      yielder.avoidanceActive = true;
      resolved.add(yielder.index);
      const nudgeDir = yielder.physicalY >= keeper.physicalY ? 1 : -1;
      const nudged = Math.max(
        -MAX_LATERAL,
        Math.min(MAX_LATERAL, yielder.physicalY + nudgeDir * 0.02)
      );
      targetY.set(yielder.index, nudged);

      // Wall-Escape (Fix A): if the nudge is clamped to zero movement (yielder is pinned
      // at MAX_LATERAL and cannot move outward), nudge the keeper toward center instead.
      // Resolves Wall-Lock dead-lock: Pair 8_11 pattern, classification-trace-analysis.md.
      const yielderClamped = nudged === yielder.physicalY;
      if (yielderClamped && Math.abs(keeper.physicalY) < MAX_LATERAL - WALL_EPSILON) {
        const keeperNudgeDir = -nudgeDir; // push keeper toward center
        const keeperNudged = Math.max(
          -MAX_LATERAL,
          Math.min(MAX_LATERAL, keeper.physicalY + keeperNudgeDir * 0.02)
        );
        if (!resolved.has(keeper.index)) {
          targetY.set(keeper.index, keeperNudged);
          keeper.avoidanceActive = true;
          resolved.add(keeper.index); // lock target; no other pair may override this frame
        }
      }
    }
  }

  // Apply EMA toward slot targets — prevents frame-jump teleportation (D11 pattern).
  // lateralReturnSpeed=0.2 → ~14 frames to reach 95% of a new slot (≈233ms at 60fps).
  // Higher than D11's avoidanceReturnSpeed=0.05 because this governs approach-to-slot
  // (active movement), not return-to-home (relaxation). See lateral-jumps-diagnose.md §8.
  const returnSpeed = config.lateralReturnSpeed ?? 0.2;
  for (const r of active) {
    r.targetPhysicalY = targetY.get(r.index) ?? r.physicalY;
    r.prevPhysicalY = r.physicalY;
    r.physicalY = Math.max(
      -MAX_LATERAL,
      Math.min(MAX_LATERAL, r.physicalY + (r.targetPhysicalY - r.physicalY) * returnSpeed)
    );
  }

  // ── Drafting — cone behind leader in world-pixel space ────────────────────
  // Unchanged from the original implementation.
  const coneHalf = (config.draftingConeAngle * Math.PI) / 180 / 2;
  for (let i = 0; i < active.length; i++) {
    const follower = active[i];
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

      follower.draftingBoostActive = true;
      break;
    }
  }
}

// Returns true if rA is the trailer (lower t, or tie-break by index).
function aIsTrailer(rA, rB) {
  return rA.t < rB.t || (rA.t === rB.t && rA.index < rB.index);
}
