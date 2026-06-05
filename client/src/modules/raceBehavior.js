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

// Priority-system mode constants. Exported so RaceScreen can read them for the debug overlay.
export const PRIORITY_MODE = Object.freeze({
  NORMAL: 'NORMAL',
  OVERLAP: 'OVERLAP',
  COOLDOWN: 'COOLDOWN',
  BLOCKED: 'BLOCKED',
});

// Dirt Oval track width in px — the baseline where lateralForce is visually calibrated.
// Wider tracks divide lateralForce by the ratio; narrower tracks multiply it (clamped 0.1–3.0).
const REFERENCE_TRACK_WIDTH = 98;

// Stuck-mode thresholds (match diagnosis-recommended band from diag-stuck-mode.mjs).
// A racer is "stuck" when bilateral avoidance forces nearly cancel, leaving it motionless.
// Used by stuckModeSuppress: when all three conditions hold, lateral delta is zeroed.
const STUCK_P_THRESH = 0.008; // minimum totalPressure (rawPos + rawNeg) to qualify
const STUCK_BALANCE_RATIO = 0.25; // max |rawPos - rawNeg| / totalPressure (near-cancel)
const STUCK_VEL_THRESH = 0.0015; // max |physicalYVelocity| to consider the racer motionless

/**
 * Compute the per-pair brake cap for brake-to-match behavior.
 *
 * Returns 1.0 (no braking) when the trailer is not meaningfully faster than the
 * leader, keeping the existing fixed-% brake as the effective floor.
 *
 * The returned cap is applied in index.jsx as:
 *   brake = min(computeEffectiveBrakeFactor(...), computeBrakeMatchFactor(...))
 * so the warmup ramp and the cap interact correctly (Flag 3, report 06).
 *
 * @param {number} leaderFwdSpeed  leader's ACTUAL expected advance speed — raw speed × the
 *   leader's own effective brake (speedBrakeFactor floor when avoidanceActive, else 1.0).
 *   Callers must multiply by the leader's brake BEFORE passing to this function.
 * @param {number} trailerDenom    trailer's forward speed denominator (no brake term)
 * @param {number} minDifferential fractional excess above which cap engages (e.g. 0.005)
 * @param {number} safetyMargin    fractional undercut below exact leader speed (e.g. 0.001)
 * @returns {number} cap in (0, 1]; 1.0 = no extra braking beyond existing floor
 */
export function computeBrakeMatchFactor(
  leaderFwdSpeed,
  trailerDenom,
  minDifferential,
  safetyMargin
) {
  if (leaderFwdSpeed <= 0 || trailerDenom <= 0) return 1.0;
  // Engage only when trailer is meaningfully faster (prevents jitter on near-speed pairs).
  if (trailerDenom <= leaderFwdSpeed * (1 + minDifferential)) return 1.0;
  const rawFactor = leaderFwdSpeed / trailerDenom;
  return rawFactor * (1 - safetyMargin);
}

/**
 * Initialise per-racer behavior state. Call once per racer at race start.
 * physicalY is set by computeRowPhysicalY (rowLayout.js) before this is called.
 * @param {{ [key: string]: unknown }} racer
 */
export function initRacerBehavior(racer) {
  racer.physicalY = 0;
  racer.physicalYVelocity = 0;
  racer.avoidanceActive = false;
  racer.draftingBoostActive = false;
  // Priority-system fields (Phase 2). Safe to set on all racers; ignored when
  // applyRacerBehavior is called without priorityExtras (legacy path).
  racer.currentMode = PRIORITY_MODE.NORMAL;
  racer.lastOverlapEndTime = -Infinity;
  racer.currentModeFrameCount = 0;
  // Brake-to-match hold state (Step 1 — overtaking rebuild, report 06 §3).
  // brakeMatchLeaderIndex: locked leader's index, or -1 (no hold active).
  //   Negative values encode escape/cooldown: -(escapeFrames+cooldownFrames) → 0.
  // brakeMatchFactor: current cap written by raceBehavior.js, read by index.jsx
  //   (same cross-file pattern as avoidanceActive — one-frame lag is intentional).
  // brakeMatchFrames: consecutive hold frames (anti-trap counter); negative = escape/cooldown countdown.
  // brakeReleaseFrames: consecutive clear frames counted toward debounced release.
  racer.brakeMatchLeaderIndex = -1;
  racer.brakeMatchFactor = 1.0;
  racer.brakeMatchFrames = 0;
  racer.brakeReleaseFrames = 0;
}

/**
 * Normalize an angle to [-π, π].
 * @param {number} a
 * @returns {number}
 */
function normalizeAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function shortestArcDeltaT(a, b) {
  let dT = Math.abs(a - b);
  if (dT > 0.5) dT = 1 - dT;
  return dT;
}

function stablePairBit(a, b) {
  const aId = String(a.name ?? a.id ?? a.index ?? '0');
  const bId = String(b.name ?? b.id ?? b.index ?? '0');
  const key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) & 1;
}

function getSpriteWorldSizePx(racer) {
  if (Number.isFinite(racer.visibleWidthPx) && racer.visibleWidthPx > 0)
    return racer.visibleWidthPx;
  if (Number.isFinite(racer.spriteWorldSizePx) && racer.spriteWorldSizePx > 0)
    return racer.spriteWorldSizePx;
  return 0;
}

function getTrackWidthPx(racer) {
  if (Number.isFinite(racer.trackWidthPx) && racer.trackWidthPx > 0) return racer.trackWidthPx;
  if (Number.isFinite(racer.geometricTrackWidthPx) && racer.geometricTrackWidthPx > 0)
    return racer.geometricTrackWidthPx;
  return 0;
}

function getPathLengthPx(racer) {
  if (Number.isFinite(racer.pathLengthPx) && racer.pathLengthPx > 0) return racer.pathLengthPx;
  return 0;
}

function chooseGeometricDirection(self, other, tieBitForSelf) {
  if (self.physicalY < other.physicalY) return -1;
  if (self.physicalY > other.physicalY) return 1;
  return tieBitForSelf === 0 ? -1 : 1;
}

function chooseSingleSideDirection(canLeft, canRight) {
  if (canLeft && !canRight) return -1;
  if (!canLeft && canRight) return 1;
  return 0;
}

function isSideFree(racer, counterpart, active, dir, lateralHalfSpan, tHalfSpan, cap) {
  const targetY = racer.physicalY + dir * lateralHalfSpan;
  if (targetY < -cap || targetY > cap) return false;

  for (const other of active) {
    if (other.index === racer.index || other.index === counterpart.index) continue;
    const dT = shortestArcDeltaT(racer.t, other.t);
    if (dT > tHalfSpan) continue;
    if (Math.abs(other.physicalY - targetY) < lateralHalfSpan) return false;
  }

  return true;
}

/**
 * Check whether the centerline at r's current t-position is blocked by another racer.
 * Returns true (BLOCKED) if any other active racer is within spriteSize pixels of the
 * target point (r.t, 0) in pixel space — checked reactively per frame, no lookahead needed.
 *
 * Replaces the earlier bounding-box (Decision Log #9) and line-segment approaches.
 * Per-frame re-evaluation means a racer crossing the path mid-frame is caught next frame.
 */
function _computeBlockedMode(r, active) {
  const trackWidth = getTrackWidthPx(r);
  const pathLength = getPathLengthPx(r);
  if (trackWidth <= 0 || pathLength <= 0) {
    r.blockerInfo = null;
    return false;
  }

  const spriteSize = getSpriteWorldSizePx(r);
  if (spriteSize <= 0) {
    r.blockerInfo = null;
    return false;
  }

  // Edge case: already within one sprite-width of center — trivially clear
  if (Math.abs(r.physicalY) * trackWidth < spriteSize) {
    r.blockerInfo = null;
    return false;
  }

  const tHalfSpan = spriteSize / pathLength;

  for (const other of active) {
    if (other.index === r.index) continue;

    let dT = other.t - r.t;
    if (Math.abs(dT) > 0.5) dT = dT > 0 ? dT - 1 : dT + 1;

    if (Math.abs(dT) > tHalfSpan) continue;

    // Distance from other racer to target point (r.t, physicalY=0) in pixel space
    const dx = dT * pathLength;
    const dy = other.physicalY * trackWidth;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < spriteSize) {
      r.blockerInfo = {
        index: other.index,
        name: other.name ?? `#${other.index}`,
        dT: Math.round(dT * pathLength),
        dY: Math.round((other.physicalY - r.physicalY) * trackWidth),
        otherPhysicalY: other.physicalY,
      };
      return true;
    }
  }
  r.blockerInfo = null;
  return false;
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
 *   avoidanceActive: boolean, draftingBoostActive: boolean,
 *   spriteWorldSizePx?: number, visibleWidthPx?: number,
 *   geometricTrackWidthPx?: number, trackWidthPx?: number,
 *   pathLengthPx?: number
 * }>} racers
 * @param {{
 *   enabled: boolean,
 *   homeForceStrength: number,
 *   homeForceReductionOnOverlap: number,
 *   comfortThreshold: number, softRepulsionStrength: number,
 *   avoidanceDistance: number, tWeight: number, yWeight: number,
 *   lateralForce: number, maxLateral: number,
 *   speedBrakeYThreshold: number, speedBrakeTMultiplier: number,
 *   speedBrakeFactor: number,
 *   draftingMaxDistance: number, draftingConeAngle: number, draftingBoost: number
 * }} config
 * @param {{ cooldownMs: number, currentTs: number, blockedTimeoutFrames?: number, blockedEscapeForce?: number }|undefined} priorityExtras
 *   Optional. When provided, activates the 4-mode priority system for Home Force (Phase 2).
 *   When omitted, falls back to the legacy homeForceReductionOnOverlap behavior.
 */
export function applyRacerBehavior(racers, config, priorityExtras, diagOut = null) {
  if (!config.enabled) {
    for (const r of racers) {
      r.avoidanceActive = false;
      r.draftingBoostActive = false;
      if (priorityExtras) r.currentMode = PRIORITY_MODE.NORMAL;
    }
    return;
  }

  const active = racers.filter((r) => !r.finished);
  for (const r of active) r.draftingBoostActive = false;

  // Accumulate physicalY deltas from home force + avoidance
  const yDeltas = new Map(active.map((r) => [r.index, 0]));
  // Avoidance accumulated separately for sqrt(neighborCount) normalization (A3/B3)
  const yAvoidDeltas = new Map(active.map((r) => [r.index, 0]));
  // Free-lane separation impulses — normalized by sqrt(freeLaneCount) to prevent
  // stacking explosion at race start where many pairs overlap simultaneously.
  const yFreeLaneDeltas = new Map(active.map((r) => [r.index, 0]));
  const freeLaneCounts = new Map(active.map((r) => [r.index, 0]));
  const overlapSet = new Set();
  const neighborCounts = new Map(active.map((r) => [r.index, 0]));
  const speedBrakeSet = new Set();
  // Brake-to-match: per-frame minimum cap per trailer (most constraining leader wins).
  // Populated in the pair loop; consumed in the apply-deltas loop to update racer state.
  const brakeMatchCaps = new Map(); // trailer.index → lowest requiredBrakeFactor this frame
  const brakeMatchLeaderIdxs = new Map(); // trailer.index → leader.index for that cap
  // rawPos/rawNeg: pre-normalization avoidance + free-lane force magnitudes by direction.
  // Allocated when diagOut is provided (external diagnostic) OR when stuck suppression is active
  // (suppression reads the same per-direction breakdown to decide if the racer is sandwiched).
  // cntPos/cntNeg: pair-force counts — only needed for external diagnostic output.
  const needsBreakdown = diagOut !== null || (config.stuckModeSuppress ?? false);
  const dRawPos = needsBreakdown ? new Map(active.map((r) => [r.index, 0])) : null;
  const dRawNeg = needsBreakdown ? new Map(active.map((r) => [r.index, 0])) : null;
  const dCntPos = diagOut ? new Map(active.map((r) => [r.index, 0])) : null;
  const dCntNeg = diagOut ? new Map(active.map((r) => [r.index, 0])) : null;

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

      // Track-relative scaling: wider tracks get proportionally weaker lateralForce
      // so the pixel-space force is consistent across all track widths.
      const pairTrackWidth = Math.max(getTrackWidthPx(rA), getTrackWidthPx(rB));
      const lateralScale =
        pairTrackWidth > 0
          ? Math.max(0.1, Math.min(3.0, REFERENCE_TRACK_WIDTH / pairTrackWidth))
          : 1.0;

      // Proximity-scaled lateral force
      const forceMag = config.lateralForce * (1 - dist / config.avoidanceDistance);

      // Trailer = lower t, tie-break by index. Trailer yields; leader holds.
      const aIsTrailer = rA.t < rB.t || (rA.t === rB.t && rA.index < rB.index);
      const trailer = aIsTrailer ? rA : rB;
      const leader = aIsTrailer ? rB : rA;

      // Sprite geometry for this pair — used by both speed brake and free-lane separation.
      const sizeA = getSpriteWorldSizePx(rA);
      const sizeB = getSpriteWorldSizePx(rB);
      const spriteWorldSize = Math.max(sizeA, sizeB);
      const trackWidthA = getTrackWidthPx(rA);
      const trackWidthB = getTrackWidthPx(rB);
      const trackWidth = Math.max(trackWidthA, trackWidthB);
      const pathLengthA = getPathLengthPx(rA);
      const pathLengthB = getPathLengthPx(rB);
      const pathLength = Math.max(pathLengthA, pathLengthB);

      // Speed brake + brake-to-match: open tracks only (report 12).
      // On closed tracks (config.isOpen === false), pack dynamics are handled by
      // avoidance forces alone — the speed-brake chain lock regresses closed-track
      // fairness when the activation zone is tuned for open-track chain-lock prevention.
      if (config.isOpen !== false) {
        // Dynamic threshold: scales with sprite size and path length so the brake fires
        // at the same relative proximity (in sprite-widths) on every open track.
        // Falls back to a fixed 0.014 when geometry is unavailable (e.g. unit tests).
        const dynamicBrakeT =
          spriteWorldSize > 0 && pathLength > 0
            ? (spriteWorldSize / pathLength) * config.speedBrakeTMultiplier
            : 0.014;
        if (Math.abs(dY) < config.speedBrakeYThreshold && dT < dynamicBrakeT) {
          speedBrakeSet.add(trailer.index);

          // Brake-to-match: compute leader-speed cap for this pair.
          // All multipliers default to 1.0 if missing (e.g. unit tests or race-plan off).
          const boostL = leader.draftingBoostActive ? config.draftingBoost : 1.0;
          const boostT = trailer.draftingBoostActive ? config.draftingBoost : 1.0;
          const leaderRawSpeed =
            (leader.baseSpeed ?? 0) *
            boostL *
            (leader.trajectoryMult ?? 1.0) *
            (leader.areaBonusMult ?? 1.0) *
            (leader.rubberBandMult ?? 1.0);
          const trailerDenom =
            (trailer.baseSpeed ?? 0) *
            boostT *
            (trailer.trajectoryMult ?? 1.0) *
            (trailer.areaBonusMult ?? 1.0) *
            (trailer.rubberBandMult ?? 1.0);
          // Account for the leader's own effective brake so the cap targets the leader's
          // ACTUAL advance, not its raw speed. Primary bypass mechanism (report 09): when
          // the leader is avoidanceActive, it advances at rawSpeed × 0.945 (floor brake),
          // but the old cap allowed the trailer to advance at rawSpeed — 5.8% bypass.
          // Using speedBrakeFactor as the floor approximation (exact after 3s warmup;
          // slightly conservative during warmup when effectiveBrakeFactor > speedBrakeFactor).
          const leaderBrake = leader.avoidanceActive
            ? Math.min(config.speedBrakeFactor ?? 0.945, leader.brakeMatchFactor ?? 1.0)
            : 1.0;
          const cap = computeBrakeMatchFactor(
            leaderRawSpeed * leaderBrake,
            trailerDenom,
            config.speedMatchMinDifferential ?? 0.005,
            config.speedMatchSafetyMargin ?? 0.001
          );
          // Track the most constraining leader (lowest cap). Tie-break: first-found
          // (lower pair indices) wins because strict < never updates on equal caps.
          if (cap < (brakeMatchCaps.get(trailer.index) ?? 1.0)) {
            brakeMatchCaps.set(trailer.index, cap);
            brakeMatchLeaderIdxs.set(trailer.index, leader.index);
          }
        }
      }

      // Free-lane separation: when racers overlap, add deterministic, smooth lateral
      // impulses based on local left/right free-space checks.

      if (spriteWorldSize > 0 && trackWidth > 0 && pathLength > 0) {
        const lateralHalfSpan = spriteWorldSize / trackWidth;
        const tHalfSpan = spriteWorldSize / pathLength;
        const overlaps = dT <= tHalfSpan && Math.abs(dY) <= lateralHalfSpan;

        if (overlaps) {
          overlapSet.add(rA.index);
          overlapSet.add(rB.index);

          const cap = Math.min(config.maxLateral, 1.0);
          const aLeftFree = isSideFree(rA, rB, active, -1, lateralHalfSpan, tHalfSpan, cap);
          const aRightFree = isSideFree(rA, rB, active, 1, lateralHalfSpan, tHalfSpan, cap);
          const bLeftFree = isSideFree(rB, rA, active, -1, lateralHalfSpan, tHalfSpan, cap);
          const bRightFree = isSideFree(rB, rA, active, 1, lateralHalfSpan, tHalfSpan, cap);

          const tieBit = stablePairBit(rA, rB);
          const aGeomDir = chooseGeometricDirection(rA, rB, tieBit);
          const bGeomDir = chooseGeometricDirection(rB, rA, tieBit ^ 1);

          let dirA = 0;
          let dirB = 0;

          const aBlocked = !aLeftFree && !aRightFree;
          const bBlocked = !bLeftFree && !bRightFree;

          if (!aBlocked && !bBlocked) {
            if (aLeftFree && aRightFree && bLeftFree && bRightFree) {
              dirA = aGeomDir;
              dirB = bGeomDir;
            } else {
              const aSingle = chooseSingleSideDirection(aLeftFree, aRightFree);
              const bSingle = chooseSingleSideDirection(bLeftFree, bRightFree);

              if (aSingle !== 0 && bSingle !== 0) {
                dirA = aSingle;
                dirB = bSingle;
              } else if (aSingle === 0 && bSingle !== 0) {
                dirA = aGeomDir;
                dirB = bSingle;
              } else if (aSingle !== 0 && bSingle === 0) {
                dirA = aSingle;
                dirB = bGeomDir;
              }
            }
          } else if (!aBlocked) {
            dirA = chooseSingleSideDirection(aLeftFree, aRightFree) || aGeomDir;
          } else if (!bBlocked) {
            dirB = chooseSingleSideDirection(bLeftFree, bRightFree) || bGeomDir;
          }

          if (dirA !== 0) {
            yFreeLaneDeltas.set(rA.index, yFreeLaneDeltas.get(rA.index) + dirA * forceMag);
            freeLaneCounts.set(rA.index, freeLaneCounts.get(rA.index) + 1);
          }
          if (dirB !== 0) {
            yFreeLaneDeltas.set(rB.index, yFreeLaneDeltas.get(rB.index) + dirB * forceMag);
            freeLaneCounts.set(rB.index, freeLaneCounts.get(rB.index) + 1);
          }
          if (dRawPos !== null) {
            if (dirA > 0) dRawPos.set(rA.index, dRawPos.get(rA.index) + forceMag);
            else if (dirA < 0) dRawNeg.set(rA.index, dRawNeg.get(rA.index) + forceMag);
            if (dirB > 0) dRawPos.set(rB.index, dRawPos.get(rB.index) + forceMag);
            else if (dirB < 0) dRawNeg.set(rB.index, dRawNeg.get(rB.index) + forceMag);
          }
        }
      }

      // Push trailer away from leader's physicalY.
      // When yDiff ≈ 0 there is no meaningful push direction — skip to avoid all trailers
      // rushing toward positive physicalY (the degenerate yDiff≥0 branch).
      const yDiff = trailer.physicalY - leader.physicalY;
      if (Math.abs(yDiff) < 1e-6) continue;
      const pushDir = yDiff >= 0 ? 1 : -1;
      yAvoidDeltas.set(
        trailer.index,
        yAvoidDeltas.get(trailer.index) + pushDir * forceMag * lateralScale
      );
      neighborCounts.set(trailer.index, neighborCounts.get(trailer.index) + 1);
      if (dRawPos !== null) {
        const scaled = forceMag * lateralScale;
        if (pushDir > 0) {
          dRawPos.set(trailer.index, dRawPos.get(trailer.index) + scaled);
          if (dCntPos !== null) dCntPos.set(trailer.index, dCntPos.get(trailer.index) + 1);
        } else {
          dRawNeg.set(trailer.index, dRawNeg.get(trailer.index) + scaled);
          if (dCntNeg !== null) dCntNeg.set(trailer.index, dCntNeg.get(trailer.index) + 1);
        }
      }
    }
  }

  // ── Priority-mode computation (Phase 2) ───────────────────────────────────
  // When priorityExtras is provided, each racer gets a mode that controls whether
  // Home Force contributes. When omitted (legacy), falls back to homeForceReductionOnOverlap.
  if (priorityExtras) {
    const { cooldownMs, currentTs } = priorityExtras;

    for (const r of active) {
      const prevMode = r.currentMode;
      const wasOverlapping = prevMode === PRIORITY_MODE.OVERLAP;
      const inOverlapNow = overlapSet.has(r.index);

      if (inOverlapNow) {
        // Transition INTO overlap: keep lastOverlapEndTime unchanged (not ended yet)
        r.currentMode = PRIORITY_MODE.OVERLAP;
      } else {
        // Just left overlap — record the end timestamp
        if (wasOverlapping) {
          r.lastOverlapEndTime = currentTs;
        }

        const timeSinceOverlap = currentTs - (r.lastOverlapEndTime ?? -Infinity);
        if (timeSinceOverlap < cooldownMs) {
          r.currentMode = PRIORITY_MODE.COOLDOWN;
        } else {
          // Path-free check: is the centerline at r's current t clear of other racers?
          r.currentMode = _computeBlockedMode(r, active)
            ? PRIORITY_MODE.BLOCKED
            : PRIORITY_MODE.NORMAL;
        }
      }

      // Track consecutive frames in the same mode (used for escape hatch + telemetry)
      r.currentModeFrameCount = r.currentMode === prevMode ? (r.currentModeFrameCount ?? 0) + 1 : 0;
    }
  }

  // ── Home force — spring toward centerline ─────────────────────────────────
  if (priorityExtras) {
    // Priority-mode path: home force = 0 for OVERLAP / COOLDOWN / BLOCKED.
    // Escape hatch: after blockedTimeoutFrames consecutive BLOCKED frames, apply a
    // reduced home force (blockedEscapeForce × homeForceStrength) so racers can exit
    // a permanently-blocked corridor in high-density racing.
    const { blockedTimeoutFrames = 0, blockedEscapeForce = 0 } = priorityExtras;
    for (const r of active) {
      let homeContrib = 0;
      if (r.currentMode === PRIORITY_MODE.NORMAL) {
        homeContrib = -r.physicalY * config.homeForceStrength;
      } else if (
        r.currentMode === PRIORITY_MODE.BLOCKED &&
        blockedTimeoutFrames > 0 &&
        (r.currentModeFrameCount ?? 0) >= blockedTimeoutFrames
      ) {
        // Escape hatch: gentle pull back toward center after prolonged BLOCKED state
        homeContrib = -r.physicalY * config.homeForceStrength * blockedEscapeForce;
      }
      yDeltas.set(r.index, homeContrib);
    }
  } else {
    // Legacy path: homeForceReductionOnOverlap (unchanged behavior for existing tests)
    const overlapFactorRaw = Number.isFinite(config.homeForceReductionOnOverlap)
      ? config.homeForceReductionOnOverlap
      : 1;
    const overlapFactor = Math.max(0, Math.min(1, overlapFactorRaw));
    for (const r of active) {
      const factor = overlapSet.has(r.index) ? overlapFactor : 1;
      yDeltas.set(r.index, -r.physicalY * config.homeForceStrength * factor);
    }
  }

  // Anti-stacking: normalize avoidance and free-lane sums by sqrt(N).
  // Prevents stacking explosion when many pairs overlap simultaneously (e.g. race start
  // with 40 racers where each racer can overlap 10+ neighbors at once).
  for (const r of active) {
    const count = neighborCounts.get(r.index);
    const avoid =
      count > 1 ? yAvoidDeltas.get(r.index) / Math.sqrt(count) : yAvoidDeltas.get(r.index);
    const flCount = freeLaneCounts.get(r.index);
    const freeLane =
      flCount > 1
        ? yFreeLaneDeltas.get(r.index) / Math.sqrt(flCount)
        : yFreeLaneDeltas.get(r.index);
    yDeltas.set(r.index, yDeltas.get(r.index) + avoid);
    yDeltas.set(r.index, yDeltas.get(r.index) + freeLane);
  }

  // Apply deltas via velocity + damping + hard clamp
  const damping = Number.isFinite(config.lateralDamping) ? config.lateralDamping : 0.35;
  const stuckSuppress = (config.stuckModeSuppress ?? false) && dRawPos !== null;
  for (const r of active) {
    let delta = yDeltas.get(r.index) ?? 0;

    // Stuck-mode suppression: when bilaterally sandwiched (equal pressure from both sides and
    // near-zero velocity), suppress all lateral delta so the racer waits rather than jittering.
    // Normal behavior resumes the moment the stuck condition clears (space opens).
    if (stuckSuppress) {
      const rp = dRawPos.get(r.index);
      const rn = dRawNeg.get(r.index);
      const totalP = rp + rn;
      if (totalP > STUCK_P_THRESH) {
        const imbalance = Math.abs(rp - rn) / totalP;
        if (
          imbalance < STUCK_BALANCE_RATIO &&
          Math.abs(r.physicalYVelocity ?? 0) < STUCK_VEL_THRESH
        ) {
          delta = 0;
        }
      }
    }

    // Accumulate lateral forces into velocity, then damp
    r.physicalYVelocity = ((r.physicalYVelocity ?? 0) + delta) * damping;
    let newY = r.physicalY + r.physicalYVelocity;

    // Soft repulsion: grows quadratically as physicalY approaches boundary
    const absY = Math.abs(newY);
    if (absY >= config.comfortThreshold && absY < 1.0) {
      const pen = (absY - config.comfortThreshold) / (1.0 - config.comfortThreshold);
      newY -= Math.sign(newY) * config.softRepulsionStrength * pen * pen;
    }

    // maxLateral cap + hard boundary clamp; reset velocity on boundary hit
    const cap = Math.min(config.maxLateral, 1.0);
    const clamped = Math.max(-cap, Math.min(cap, newY));
    if (clamped !== newY) r.physicalYVelocity = 0;
    r.physicalY = clamped;
    r.avoidanceActive = speedBrakeSet.has(r.index);

    // ── Brake-to-match hold state update ──────────────────────────────────
    // Constants read once per racer for clarity; values from config with safe defaults.
    const bmTimeout = config.brakeHoldTimeoutFrames ?? 90;
    const bmEscape = config.brakeHoldEscapeReleaseDurationFrames ?? 15;
    const bmCooldown = config.brakeHoldEscapeCooldownFrames ?? 60;
    const bmDebounce = config.brakeReleaseDebounceFrames ?? 3;

    if (r.brakeMatchFrames < 0) {
      // Counting up from -(bmEscape+bmCooldown) toward 0: escape release then cooldown.
      // No new hold allowed until brakeMatchFrames reaches 0.
      r.brakeMatchFrames += 1;
      r.brakeMatchFactor = 1.0;
      r.brakeMatchLeaderIndex = -1;
    } else {
      // Stale-index guard: if locked leader is no longer active, reset immediately.
      if (r.brakeMatchLeaderIndex !== -1) {
        let leaderStillActive = false;
        for (const a of active) {
          if (a.index === r.brakeMatchLeaderIndex) {
            leaderStillActive = true;
            break;
          }
        }
        if (!leaderStillActive) {
          r.brakeMatchLeaderIndex = -1;
          r.brakeMatchFactor = 1.0;
          r.brakeMatchFrames = 0;
          r.brakeReleaseFrames = 0;
        }
      }

      const newCap = brakeMatchCaps.get(r.index);
      if (newCap !== undefined) {
        // A constraining leader is in the brake zone this frame — hold or enter hold.
        r.brakeMatchLeaderIndex = brakeMatchLeaderIdxs.get(r.index);
        r.brakeMatchFactor = newCap;
        r.brakeMatchFrames += 1;
        r.brakeReleaseFrames = 0;

        // Anti-trap: force escape after too many consecutive hold frames.
        if (r.brakeMatchFrames >= bmTimeout) {
          r.brakeMatchLeaderIndex = -1;
          r.brakeMatchFactor = 1.0;
          // Negative countdown: -(escape + cooldown) counts up to 0 over (escape+cooldown) frames.
          r.brakeMatchFrames = -(bmEscape + bmCooldown);
          r.brakeReleaseFrames = 0;
        }
      } else {
        // No constraining leader this frame.
        if (r.brakeMatchLeaderIndex !== -1) {
          // Was in hold — debounced release: count consecutive clear frames.
          r.brakeReleaseFrames += 1;
          if (r.brakeReleaseFrames >= bmDebounce) {
            r.brakeMatchLeaderIndex = -1;
            r.brakeMatchFactor = 1.0;
            r.brakeMatchFrames = 0;
            r.brakeReleaseFrames = 0;
          }
          // During debounce window: retain previous brakeMatchFactor (hold persists briefly).
        } else {
          // No hold active; ensure clean state.
          r.brakeMatchFactor = 1.0;
          r.brakeMatchFrames = 0;
          r.brakeReleaseFrames = 0;
        }
      }
    }

    if (diagOut) {
      diagOut.set(r.index, {
        rawPos: dRawPos.get(r.index),
        rawNeg: dRawNeg.get(r.index),
        cntPos: dCntPos !== null ? dCntPos.get(r.index) : 0,
        cntNeg: dCntNeg !== null ? dCntNeg.get(r.index) : 0,
        netDelta: yDeltas.get(r.index) ?? 0, // pre-suppression physics balance
        velAfter: r.physicalYVelocity,
      });
    }
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
