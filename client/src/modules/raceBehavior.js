// ============================================================
// File:        raceBehavior.js
// Path:        client/src/modules/raceBehavior.js
// Project:     RaceArena
// Description: Sight-based preventive race AI replacing force/slot-based anti-collision.
//              Each racer looks ahead sightHorizonFrames, picks a clear lane proactively,
//              and commits to lane-changes for laneCommitFrames to prevent oscillation.
//              All lateral movement is hard-capped at maxLateralStepPerFrame (px/frame),
//              guaranteeing no visible jumps regardless of sight-logic output.
//              Drafting cone activation smooth (draftingBoostFactor 0→1 over N frames).
//              physicalY ∈ [-1, +1]: -1 = inner boundary, 0 = centerline, +1 = outer.
// ============================================================

const MAX_LATERAL = 0.95;

/**
 * Normalize an angle to [-π, π].
 */
function normalizeAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * Forward t-gap from r to rAhead on a circular track [0, 1).
 * Returns a value in (0, 1]. A gap of ~1 means rAhead is just behind r.
 */
function tGapForward(r, rAhead) {
  let gap = rAhead.t - r.t;
  if (gap <= 0) gap += 1;
  return gap;
}

/**
 * Check if a candidate physicalY is laterally clear of all given racers.
 */
function slotIsClear(cy, halfWidthSelf, others, corridorHalf, safetyLat) {
  for (const o of others) {
    const halfWidthO = (o.visibleWidthPx ?? 24) / 2 / corridorHalf;
    const needed = halfWidthSelf + halfWidthO + safetyLat;
    if (Math.abs(cy - o.physicalY) < needed) return false;
  }
  return true;
}

/**
 * Find the nearest clear lateral slot for racer r, avoiding all given racers.
 * Candidates radiate outward from r.physicalY, sorted center-first to prefer
 * inner positions over wall-hugging.
 * @returns {number|null} clear physicalY or null if none found
 */
function findClearLane(r, visibleAhead, corridorHalf, safetyLat) {
  const halfWidthSelf = (r.visibleWidthPx ?? 24) / 2 / corridorHalf;
  const stepPhys = halfWidthSelf * 2 + safetyLat; // full own-width + safety per step

  const candidates = [];
  for (let n = 1; n <= 8; n++) {
    const dY = n * stepPhys;
    candidates.push(r.physicalY + dY);
    candidates.push(r.physicalY - dY);
  }
  // Center-first: prefer lanes closer to track center over wall positions
  candidates.sort((a, b) => Math.abs(a) - Math.abs(b));

  for (const cy of candidates) {
    if (Math.abs(cy) > MAX_LATERAL) continue;
    if (slotIsClear(cy, halfWidthSelf, visibleAhead, corridorHalf, safetyLat)) return cy;
  }
  return null;
}

/**
 * Detect world-space hitbox overlap between two racers.
 */
function racersOverlap(rA, rB, safetyPx) {
  const mid = (rA.angle + rB.angle) * 0.5;
  const cosM = Math.cos(mid),
    sinM = Math.sin(mid);
  const dx = rB.x - rA.x,
    dy = rB.y - rA.y;
  const ls = Math.abs(dx * cosM + dy * sinM);
  const lats = Math.abs(-dx * sinM + dy * cosM);
  const wA = rA.visibleWidthPx ?? 24,
    wB = rB.visibleWidthPx ?? 24;
  const lA = rA.visibleLengthPx ?? 24,
    lB = rB.visibleLengthPx ?? 24;
  return ls < (lA + lB) * 0.5 + safetyPx && lats < (wA + wB) * 0.5 + safetyPx;
}

/**
 * Initialise per-racer behavior state. Call once per racer at race start.
 * physicalY is set by computeRowPhysicalY (rowLayout.js) before this is called.
 * @param {{ [key: string]: unknown }} racer
 */
export function initRacerBehavior(racer) {
  racer.physicalY = racer.physicalY ?? 0;
  racer.targetPhysicalY = racer.physicalY;
  racer.laneCommitFrames = 0;
  racer.draftingBoostFactor = 0; // smooth 0..1
  racer.avoidanceActive = false;
  racer.draftingBoostActive = false;
}

/**
 * Apply sight-based preventive race AI for one frame. Mutates racer state in-place.
 *
 * Must be called AFTER world positions (r.x, r.y, r.angle) have been computed.
 *
 * @param {Array<{
 *   index: number, x: number, y: number, angle: number, t: number,
 *   physicalY: number, targetPhysicalY: number, laneCommitFrames: number,
 *   draftingBoostFactor: number,
 *   visibleWidthPx?: number, visibleLengthPx?: number,
 *   baseSpeed?: number, finished: boolean,
 *   avoidanceActive: boolean, draftingBoostActive: boolean
 * }>} racers
 * @param {{
 *   enabled: boolean,
 *   sightHorizonFrames: number,
 *   safetyMarginPx: number,
 *   laneCommitFrames: number,
 *   overtakeAggressionDefault: number,
 *   speedAdvantageThreshold: number,
 *   maxLateralStepPerFrame: number,
 *   draftingActivationFrames: number,
 *   speedBrakeFactor: number,
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
  for (const r of active) {
    r.avoidanceActive = false;
    r.draftingBoostActive = false;
  }

  const corridorHalf = config.corridorHalfWidthPx ?? 75;
  const safetyPx = config.safetyMarginPx ?? 4;
  const safetyLat = safetyPx / corridorHalf;
  const commitDuration = config.laneCommitFrames ?? 30;
  const aggression = config.overtakeAggressionDefault ?? 0.5;
  const speedAdvThresh = config.speedAdvantageThreshold ?? 0.00003;
  const maxLatStep = (config.maxLateralStepPerFrame ?? 4) / corridorHalf;
  const draftActivFrames = config.draftingActivationFrames ?? 20;
  const draftActivStep = 1 / draftActivFrames;
  const coneHalf = (config.draftingConeAngle * Math.PI) / 180 / 2;

  // ── Sight-based phase logic ────────────────────────────────────────────────
  for (const r of active) {
    // Count down lane commitment each frame
    if (r.laneCommitFrames > 0) r.laneCommitFrames--;

    // Sight horizon in t-units: faster racers see further ahead proportionally
    const tHorizon = (r.baseSpeed ?? 0.001045) * (config.sightHorizonFrames ?? 90);

    // Visible-ahead: racers within tHorizon in front of r
    const visibleAhead = active.filter((r2) => {
      if (r2.index === r.index) return false;
      const gap = tGapForward(r, r2);
      return gap > 0 && gap < tHorizon;
    });

    const halfWidthSelf = (r.visibleWidthPx ?? 24) / 2 / corridorHalf;

    // Threats: visible-ahead racers that share r's lane (lateral conflict)
    const threats = visibleAhead.filter((r2) => {
      const halfWidthR2 = (r2.visibleWidthPx ?? 24) / 2 / corridorHalf;
      const needed = halfWidthSelf + halfWidthR2 + safetyLat;
      return Math.abs(r.physicalY - r2.physicalY) < needed;
    });

    if (r.laneCommitFrames > 0) {
      // Committed to a lane: only override if that committed target is now blocked
      if (!slotIsClear(r.targetPhysicalY, halfWidthSelf, visibleAhead, corridorHalf, safetyLat)) {
        r.laneCommitFrames = 0; // release and replan below
      } else {
        continue; // commitment intact — skip to movement step
      }
    }

    // ── No active commitment: run phase logic ────────────────────────────────
    if (threats.length === 0) {
      // Phase 2: free running — hold current lane, no forced center drift
    } else {
      // Phase 1: threat in lane — find a clear alternative lane
      const nearestThreat = [...threats].sort((a, b) => tGapForward(r, a) - tGapForward(r, b))[0];

      const hasStraightAdvantage =
        (r.baseSpeed ?? 0) > (nearestThreat.baseSpeed ?? 0) + speedAdvThresh;

      const clearLane = findClearLane(r, visibleAhead, corridorHalf, safetyLat);

      if (clearLane !== null) {
        // Clear lane exists — switch if overtaking or if current lane is truly blocked
        const currentLaneClear = slotIsClear(
          r.physicalY,
          halfWidthSelf,
          visibleAhead,
          corridorHalf,
          safetyLat
        );
        if (!currentLaneClear || hasStraightAdvantage) {
          r.targetPhysicalY = Math.max(-MAX_LATERAL, Math.min(MAX_LATERAL, clearLane));
          r.laneCommitFrames = commitDuration;
        } else {
          // Speed advantage racer waiting for a dodge opportunity — gentle brake
          r.avoidanceActive = true;
        }
      } else {
        // All visible lanes blocked: brake and wait for longitudinal separation
        r.avoidanceActive = true;
      }
    }
  }

  // ── Safety net: resolve actual hitbox overlaps with micro-nudge ───────────
  // Should rarely fire with working sight logic. Tracks per-racer emergencies.
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const rA = active[i],
        rB = active[j];
      if (!racersOverlap(rA, rB, safetyPx)) continue;

      rA.avoidanceActive = true;
      rB.avoidanceActive = true;

      // Racer closer to wall has less room — the other one yields
      const aYields = Math.abs(rA.physicalY) < Math.abs(rB.physicalY);
      const yielder = aYields ? rA : rB;
      const keeper = aYields ? rB : rA;
      const nudgeDir = yielder.physicalY >= keeper.physicalY ? 1 : -1;
      // Nudge strictly within maxLatStep — no jumps even in emergencies
      const nudgePhy = Math.min(maxLatStep, safetyLat * 0.5);
      yielder.targetPhysicalY = Math.max(
        -MAX_LATERAL,
        Math.min(MAX_LATERAL, yielder.physicalY + nudgeDir * nudgePhy)
      );
    }
  }

  // ── Apply smooth lateral movement — HARD cap guarantees no visible jumps ──
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

    // Smooth factor: ramp up when in cone, ramp down when out
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
