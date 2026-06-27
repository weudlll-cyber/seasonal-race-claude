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

import { easeInOutCubic } from '../utils/mathUtils.js';

// Priority-system mode constants. Exported so RaceScreen can read them for the debug overlay.
export const PRIORITY_MODE = Object.freeze({
  NORMAL: 'NORMAL',
  OVERLAP: 'OVERLAP',
  COOLDOWN: 'COOLDOWN',
  BLOCKED: 'BLOCKED',
});

// Pre-allocated per-step structures reused across every applyRacerBehavior call.
// Eliminates per-step Map/Set allocations. Each call clears + repopulates; no stale
// values leak between steps.
const _overlapSet = new Set();
const _speedBrakeSet = new Set();
const _brakeMatchCaps = new Map();
const _brakeMatchLeaderIdxs = new Map();
// OVL-C: per-step free-side direction + partner physicalY for the sustained-OVERLAP escape.
// Populated in the overlap block once dirA/dirB are final; cleared every step.
const _ovlcEscapeDir = new Map(); // racerIndex → free-side direction (±1); absent = blocked
const _ovlcPartnerY = new Map(); // racerIndex → overlapping partner physicalY (ramp source)
// Same-lane trailer set — kept solely as the OVL-C `!inSameLane` gate input (leader-only
// escape). Removed in Commit B together with OVL-C; the L4/L5 consumers are already gone.
const _sameLaneApproach = new Set();
// Layer 1 (Soft Steering): per-step target + selection state.
// _ssTarget:   racerIndex → target physicalY (default 0 = centerline).
// _ssForceMag: racerIndex → strongest forceMag seen this step (most-constraining wins).
const _ssTarget = new Map();
const _ssForceMag = new Map();

// Layer 1 spring-constant fallback when config.softSteeringStrength is absent
// (partial-config callers in sim/unit paths). Mirrors the defaults.js value.
const SOFT_STEERING_STRENGTH_FALLBACK = 0.03;

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
  // OVL-C: escape latch (kept until Commit B removes OVL-C). Debounced direction hold.
  racer.escapeCommitDir = 0;
  racer.escapeCommitFrames = 0;
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

// Deterministic tie-break side for a near-coincident same-lane pair (relPos ≈ 0).
// Shared stablePairBit gives the pair one bit; r.index < leader.index flips it for
// exactly one member, so the two members of a mutually-approaching pair commit to
// OPPOSITE sides — stable across frames (no zigzag), unlike per-racer index parity
// which can steer a trailer toward its leader. Guards an absent leader ref by
// retaining the previous parity behavior.
function pairTieDir(r, leader) {
  if (!leader) return (r.index & 1) === 0 ? 1 : -1;
  const bit = stablePairBit(r, leader);
  const first = r.index < leader.index;
  return (bit === 1 ? first : !first) ? 1 : -1;
}

// ── physicalY ↔ world-pixel helpers ─────────────────────────────────────────
// physicalY ∈ [-1, +1] maps through EditorShape.getPosition(t, physicalY/2),
// so 1 physicalY unit = trackWidth/2 world pixels (the /2 is in EditorShape).
// ALL lateral physicalY↔px conversions MUST go through these two helpers.
// Never use raw × trackWidth — that misses the factor of 2.
function pxToPhysicalY(px, trackWidth) {
  return px / (trackWidth / 2);
}
function physicalYToPx(phy, trackWidth) {
  return phy * (trackWidth / 2);
}

function getFrameSizePx(racer) {
  if (Number.isFinite(racer.frameSizePx) && racer.frameSizePx > 0) return racer.frameSizePx;
  return 0;
}

function getTrackWidthAtTpx(racer) {
  // For non-uniform tracks (no _centerWidth): extend here with racer.t per-frame lookup
  if (Number.isFinite(racer.trackWidthPx) && racer.trackWidthPx > 0) return racer.trackWidthPx;
  return 0;
}

function getPathLengthPx(racer) {
  if (Number.isFinite(racer.pathLengthPx) && racer.pathLengthPx > 0) return racer.pathLengthPx;
  return 0;
}

// Geometric contact distances for the avoidance gate and the free-lane overlap check.
//
// contactWidth  = halfWidthA + halfWidthB  (sum of half-sizes — correct 2-body geometry)
// contactLength = halfLengthA + halfLengthB
//
// Bodies touch when the center-to-center pixel distance equals the contact value.
// The gate fires at contactWidth × (1+buffer) — always wider than the free-lane threshold
// (contactWidth), so the invariant "gate ≥ inner check" holds by construction for any pair
// of body sizes, equal or unequal (see dragon 28px vs rocket 14px: contact = 21px, not 28).
// Falls back to frameSizePx/2 per racer when drawnBodyWidthPx is absent (sim racers).
function pairContact(rA, rB) {
  const frameA = getFrameSizePx(rA);
  const frameB = getFrameSizePx(rB);
  const hw_A = (rA.drawnBodyWidthPx ?? frameA) / 2;
  const hw_B = (rB.drawnBodyWidthPx ?? frameB) / 2;
  const hl_A = (rA.drawnBodyLengthPx ?? frameA) / 2;
  const hl_B = (rB.drawnBodyLengthPx ?? frameB) / 2;
  const contactWidth = hw_A + hw_B;
  const contactLength = hl_A + hl_B;
  const pairTW = Math.max(getTrackWidthAtTpx(rA), getTrackWidthAtTpx(rB));
  const pairPL = Math.max(getPathLengthPx(rA), getPathLengthPx(rB));
  return { contactWidth, contactLength, pairTW, pairPL };
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
  const trackWidth = getTrackWidthAtTpx(r);
  const pathLength = getPathLengthPx(r);
  if (trackWidth <= 0 || pathLength <= 0) {
    r.blockerInfo = null;
    return false;
  }

  const spriteSize = getFrameSizePx(r);
  if (spriteSize <= 0) {
    r.blockerInfo = null;
    return false;
  }

  // Edge case: already within one sprite-width of center — trivially clear
  if (physicalYToPx(Math.abs(r.physicalY), trackWidth) < spriteSize) {
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
    const dy = physicalYToPx(other.physicalY, trackWidth);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < spriteSize) {
      r.blockerInfo = {
        index: other.index,
        name: other.name ?? `#${other.index}`,
        dT: Math.round(dT * pathLength),
        dY: Math.round(physicalYToPx(other.physicalY - r.physicalY, trackWidth)),
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
 *   frameSizePx?: number,
 *   drawnBodyWidthPx?: number,
 *   trackWidthPx?: number,
 *   pathLengthPx?: number
 * }>} racers
 * @param {{
 *   enabled: boolean,
 *   comfortThreshold: number, softRepulsionStrength: number,
 *   avoidanceBufferPct: number,
 *   lateralForce: number, maxLateral: number,
 *   speedBrakeYThreshold: number, speedBrakeTMultiplier: number,
 *   speedBrakeFactor: number,
 *   softSteeringStrength: number, softSteeringSymmetric: boolean,
 *   draftingMaxDistance: number, draftingConeAngle: number, draftingBoost: number
 * }} config
 * @param {{ cooldownMs: number, currentTs: number, blockedTimeoutFrames?: number, blockedEscapeForce?: number }|undefined} priorityExtras
 *   Optional. When provided, computes the 4-mode priority state consumed by OVL-C and
 *   the debug overlay (the legacy home force it once gated has been removed).
 */
export function applyRacerBehavior(racers, config, priorityExtras) {
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

  // Clear + repopulate pre-allocated module-level structures (no per-step allocation).
  _overlapSet.clear();
  _speedBrakeSet.clear();
  _brakeMatchCaps.clear();
  _brakeMatchLeaderIdxs.clear();
  _ovlcEscapeDir.clear();
  _ovlcPartnerY.clear();
  _sameLaneApproach.clear();
  _ssTarget.clear();
  _ssForceMag.clear();
  for (const r of active) {
    _ssTarget.set(r.index, 0);
    _ssForceMag.set(r.index, 0);
  }
  const overlapSet = _overlapSet;
  const speedBrakeSet = _speedBrakeSet;
  // Brake-to-match: per-frame minimum cap per trailer (most constraining leader wins).
  // Populated in the pair loop; consumed in the apply-deltas loop to update racer state.
  const brakeMatchCaps = _brakeMatchCaps; // trailer.index → lowest requiredBrakeFactor this frame
  const brakeMatchLeaderIdxs = _brakeMatchLeaderIdxs; // trailer.index → leader.index for that cap

  // ── Avoidance (anisotropic, asymmetric: trailer yields, leader holds) ──────
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const rA = active[i];
      const rB = active[j];

      // Anisotropic distance in (t, physicalY) space
      let dT = Math.abs(rA.t - rB.t);
      if (dT > 0.5) dT = 1 - dT; // shortest arc on closed tracks
      const dY = rA.physicalY - rB.physicalY;

      // Body geometry for the speed-brake — both axes body-based (reports 43/45).
      // Frame size kept as fallback when body dims are absent.
      const frameA = getFrameSizePx(rA);
      const frameB = getFrameSizePx(rB);
      const hlA_b = (rA.drawnBodyLengthPx ?? frameA) / 2;
      const hlB_b = (rB.drawnBodyLengthPx ?? frameB) / 2;
      const hwA_b = (rA.drawnBodyWidthPx ?? frameA) / 2;
      const hwB_b = (rB.drawnBodyWidthPx ?? frameB) / 2;
      const brakeContactLength = hlA_b + hlB_b;
      const brakeContactWidth = hwA_b + hwB_b;
      const trackWidth = Math.max(getTrackWidthAtTpx(rA), getTrackWidthAtTpx(rB));
      const pathLength = Math.max(getPathLengthPx(rA), getPathLengthPx(rB));
      // Same-lane filter: brake only if bodies would collide laterally (no expansion multiplier).
      const brakeSameLaneY =
        trackWidth > 0 ? pxToPhysicalY(brakeContactWidth, trackWidth) : config.speedBrakeYThreshold;

      // Trailer = lower t, tie-break by index. Trailer yields; leader holds.
      const aIsTrailer = rA.t < rB.t || (rA.t === rB.t && rA.index < rB.index);
      const trailer = aIsTrailer ? rA : rB;
      const leader = aIsTrailer ? rB : rA;

      // ── Speed brake (avoidanceActive + 0.945 floor): ALL tracks ─────────────
      // Runs BEFORE the body-contact gate. Both thresholds are body-based (reports 43/45):
      //   longitudinal: bodyContactLength × speedBrakeTMultiplier (lead-time zone)
      //   lateral: bodyContactWidth × 1.0 (same-lane filter only — no expansion multiplier)
      // Lateral proximity must NOT drive braking; it only answers "same lane y/n".
      // Report 13: disabling avoidanceActive on closed tracks caused regressions.
      const dynamicBrakeT =
        brakeContactLength > 0 && pathLength > 0
          ? (brakeContactLength / pathLength) * config.speedBrakeTMultiplier
          : 0.014;
      if (Math.abs(dY) < brakeSameLaneY && dT < dynamicBrakeT) {
        speedBrakeSet.add(trailer.index);

        // ── Brake-to-match cap ──────────────────────────────────────────────────
        // Open tracks: narrower activation zone (brakeMatchActivation*) prevents chain
        // lock without affecting closed-track pack dynamics.
        // Closed tracks: wide zone (same thresholds as outer if) — restores the
        // pre-rebuild baseline that passed all closed combos. Report 14: removing
        // brake-match from closed tracks caused giraffe + boarder regressions.
        let inBrakeMatchZone;
        if (config.isOpen !== false) {
          const bmMultiplier =
            config.brakeMatchActivationTMultiplier ?? config.speedBrakeTMultiplier;
          const dynamicBrakeMatchT =
            brakeContactLength > 0 && pathLength > 0
              ? (brakeContactLength / pathLength) * bmMultiplier
              : 0.014;
          const bmYThreshold = config.brakeMatchActivationYThreshold ?? brakeSameLaneY;
          inBrakeMatchZone = Math.abs(dY) < bmYThreshold && dT < dynamicBrakeMatchT;
        } else {
          inBrakeMatchZone = true; // closed: already inside wide-zone if, all pairs qualify
        }
        if (inBrakeMatchZone) {
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
          // leaderBrake: open tracks only (report 09 bypass fix, report 14 scoping).
          // On open tracks, cap targets leader's ACTUAL advance (rawSpeed × 0.945 when
          // avoidanceActive). On closed tracks leaderBrake=1.0 preserves the pre-rebuild
          // baseline cap — the 5.8%-tighter corrected cap causes chain-lock for beetle
          // and boarder on Dirt Oval.
          const leaderBrake =
            config.isOpen !== false && leader.avoidanceActive
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

      // ── Geometric avoidance gate (report 38/39) ──────────────────────────────
      // Replaced the mixed-unit metric (dT×tWeight + dY×yWeight) that could not be
      // calibrated per-track (required weight ≈ 131 on Space Sprint, ≈ 67 on Dirt Oval).
      // Two independent px-space axes, no sqrt. Speed brake runs BEFORE this gate (above)
      // because its body-based longitudinal zone (×1.5) is wider than the gate (×1.2).
      // Invariant: gate contact threshold × (1+buffer) > contact = free-lane threshold.
      const { contactWidth, contactLength, pairTW, pairPL } = pairContact(rA, rB);
      // Skip pairs with no body size info (real racers always have frameSizePx as fallback).
      if (contactWidth === 0 || contactLength === 0) continue;
      const latPx = Math.abs(dY) * (pairTW / 2);
      const longPx = dT * pairPL;
      const bufferPct = config.avoidanceBufferPct ?? 0.2;
      // Gate = contact × (1+buffer) > contact (free-lane) — invariant by construction.
      const latTrigger = contactWidth * (1 + bufferPct);
      const longTrigger = contactLength * (1 + bufferPct);
      // Two-axis AND: both axes must be inside the buffered contact zone.
      if (latPx >= latTrigger || longPx >= longTrigger) continue;

      // Proximity-scaled lateral force: min penetration fraction across both axes.
      // Decays from lateralForce (centers touching) to 0 (at the trigger boundary).
      const latFraction = 1 - latPx / latTrigger;
      const longFraction = 1 - longPx / longTrigger;
      const forceMag = config.lateralForce * Math.min(latFraction, longFraction);

      // ── Layer 1 (Soft Steering) §4a: non-overlap target accumulation ────────
      // INSERT-ONLY, flag-gated. For the most-constraining obstacle (highest forceMag),
      // store a target one contact width to the side it is already on. Asymmetric
      // (trailer only) unless softSteeringSymmetric. The overlap block (§4b) may later
      // override this for the same pair (it uses >= so overlap wins on equal forceMag).
      if (trackWidth > 0) {
        const contactOffsetY =
          pxToPhysicalY(contactWidth, trackWidth) * (1 + (config.softSteeringClearancePct ?? 0));
        const ssCap = Math.min(config.maxLateral, 1.0);
        const ssHystY = config.softSteeringHysteresisY ?? 0.04;
        const assignSoftTarget = (self, obstacle) => {
          if (forceMag <= (_ssForceMag.get(self.index) ?? 0)) return; // strict: most-constraining wins
          const rel = self.physicalY - obstacle.physicalY;
          const dir = Math.abs(rel) >= ssHystY ? (rel >= 0 ? 1 : -1) : pairTieDir(self, obstacle);
          let target = obstacle.physicalY + dir * contactOffsetY;
          if (target < -ssCap) target = -ssCap;
          else if (target > ssCap) target = ssCap;
          _ssTarget.set(self.index, target);
          _ssForceMag.set(self.index, forceMag);
        };
        if (config.softSteeringSymmetric) {
          assignSoftTarget(rA, rB);
          assignSoftTarget(rB, rA);
        } else {
          assignSoftTarget(trailer, leader);
        }
      }

      // Free-lane separation: when racers overlap, add deterministic, smooth lateral
      // impulses based on local left/right free-space checks.

      if (contactLength > 0 && trackWidth > 0 && pathLength > 0) {
        // lateralHalfSpan and tHalfSpan use the same sum-of-half-sizes base as the gate.
        // Gate = contact × (1+buffer); free-lane = contact exactly — invariant by construction.
        // contactWidth/contactLength already computed above via pairContact; referenced here.
        // Falls back via pairContact's ?? frameSizePx when drawnBodyWidthPx/LengthPx absent.
        // pxToPhysicalY required — raw / trackWidth misses the factor of 2 (report 35).
        const lateralHalfSpan = pxToPhysicalY(contactWidth, trackWidth);
        const tHalfSpan = contactLength / pathLength;
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

          // ── Layer 1 (Soft Steering) §4b: overlap target override ───────────
          // Runs after dirA/dirB are final. The forceMag compare uses >= so an overlap
          // result overrides the §4a non-overlap target of the same pair on equal
          // forceMag. Both sides blocked → hold (target = current physicalY) → spring
          // delta ≈ 0, which replaces L9 (stuck suppression) for this case. F2: the
          // OVL-C population below is NOT guarded, so L6 keeps its inputs when on.
          if (trackWidth > 0) {
            const ssOffsetY =
              pxToPhysicalY(contactWidth, trackWidth) *
              (1 + (config.softSteeringClearancePct ?? 0));
            const ssCap2 = Math.min(config.maxLateral, 1.0);
            const overrideSoftTarget = (self, obstacle, dir, geomDir, blocked) => {
              if (forceMag < (_ssForceMag.get(self.index) ?? 0)) return; // >= : overlap wins on tie
              let target;
              if (blocked) {
                target = self.physicalY; // both sides blocked → hold position
              } else {
                const d = dir !== 0 ? dir : geomDir;
                target = obstacle.physicalY + d * ssOffsetY;
                if (target < -ssCap2) target = -ssCap2;
                else if (target > ssCap2) target = ssCap2;
              }
              _ssTarget.set(self.index, target);
              _ssForceMag.set(self.index, forceMag);
            };
            if (config.softSteeringSymmetric) {
              overrideSoftTarget(rA, rB, dirA, aGeomDir, aBlocked);
              overrideSoftTarget(rB, rA, dirB, bGeomDir, bBlocked);
            } else if (trailer.index === rA.index) {
              overrideSoftTarget(rA, rB, dirA, aGeomDir, aBlocked);
            } else {
              overrideSoftTarget(rB, rA, dirB, bGeomDir, bBlocked);
            }
          }

          // OVL-C: record free-side direction and partner Y for the escape.
          // All overlapping pairs write; last-written wins when multiple pairs overlap.
          if (dirA !== 0) _ovlcEscapeDir.set(rA.index, dirA);
          _ovlcPartnerY.set(rA.index, rB.physicalY);
          if (dirB !== 0) _ovlcEscapeDir.set(rB.index, dirB);
          _ovlcPartnerY.set(rB.index, rA.physicalY);
        }
      }

      // OVL-C input only: mark the trailer same-lane so L6 stays leader-only
      // (BEHALTEN-A — removed in Commit B with OVL-C). Same condition as before.
      if (trackWidth > 0) {
        const yDiff = trailer.physicalY - leader.physicalY;
        const sameLaneHH = pxToPhysicalY(
          Math.max(
            trailer.drawnBodyWidthPx ?? trailer.frameSizePx ?? 0,
            leader.drawnBodyWidthPx ?? leader.frameSizePx ?? 0
          ),
          trackWidth
        );
        if (sameLaneHH > 0 && Math.abs(yDiff) < sameLaneHH) _sameLaneApproach.add(trailer.index);
      }
    }
  }

  // ── Priority-mode computation (Phase 2) ───────────────────────────────────
  // When priorityExtras is provided, each racer gets a mode (NORMAL/OVERLAP/COOLDOWN/
  // BLOCKED) consumed by OVL-C and the debug overlay. Skipped entirely when omitted.
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

  // Apply deltas via velocity + damping + hard clamp
  const damping = Number.isFinite(config.lateralDamping) ? config.lateralDamping : 0.35;
  for (const r of active) {
    let delta = 0;

    // ── OVL-C: sustained-OVERLAP escape (all tracks) ──────────────────────────
    // Consume the Stage A/B accumulators to update the committed side and inject force.
    // Bare block (no isOpen gate): the active de-stacking now runs on closed tracks too.
    {
      const inSameLane = _sameLaneApproach.has(r.index);

      // ── OVL-C: symmetric sustained-OVERLAP escape ─────────────────────────
      // Targets the non-same-lane (leader) member of a locked pair — the racer
      // that Stage D doesn't reach. !inSameLane ensures a pair never gets both.
      if (
        !inSameLane &&
        !!priorityExtras &&
        r.currentMode === PRIORITY_MODE.OVERLAP &&
        (r.currentModeFrameCount ?? 0) >= (config.overlapEscapeTimeout ?? 120)
      ) {
        const rawEscDir = _ovlcEscapeDir.get(r.index) ?? 0;
        const escTimeout = config.brakeHoldTimeoutFrames ?? 90;
        if (rawEscDir !== 0) {
          if (rawEscDir === r.escapeCommitDir) {
            r.escapeCommitFrames++;
          } else {
            r.escapeCommitFrames--;
            if (r.escapeCommitFrames <= 0) {
              r.escapeCommitDir = rawEscDir;
              r.escapeCommitFrames = 1;
            }
          }
          if (r.escapeCommitFrames >= escTimeout) {
            r.escapeCommitDir = 0;
            r.escapeCommitFrames = 0;
          }
        } else {
          // Recorded side is zero (blocked or no overlap partner) — release latch immediately.
          r.escapeCommitDir = 0;
          r.escapeCommitFrames = 0;
        }
      } else if (r.escapeCommitDir !== 0) {
        // No longer eligible: gentle decay of the escape latch.
        const dbDecay = config.brakeReleaseDebounceFrames ?? 3;
        r.escapeCommitFrames = Math.max(0, r.escapeCommitFrames - dbDecay);
        if (r.escapeCommitFrames === 0) r.escapeCommitDir = 0;
      }
      if (r.escapeCommitDir !== 0) {
        const partnerY = _ovlcPartnerY.get(r.index);
        const tw = getTrackWidthAtTpx(r);
        if (partnerY !== undefined && tw > 0) {
          const honestHH = pxToPhysicalY(r.drawnBodyWidthPx ?? r.frameSizePx ?? 0, tw);
          if (honestHH > 0) {
            const clearSpan = 2 * honestHH;
            const absYDiff = Math.abs(r.physicalY - partnerY);
            const gapRatio = Math.max(0, (clearSpan - absYDiff) / clearSpan);
            const escForce = config.lateralForce * (config.overlapEscapeStrength ?? 0) * gapRatio;
            const escCap = config.lateralForce * (config.gapForceCap ?? 1.5);
            delta += r.escapeCommitDir * Math.min(escForce, escCap);
          }
        }
      }
    }

    // ── Layer 1 (Soft Steering): single target spring ───────────────────────
    // The sole lateral force model. Pulls the racer toward its per-step target:
    // centerline (0) when no obstacle, beside the most-constraining obstacle
    // otherwise, or the current position (hold) when both sides are blocked. Runs
    // after L6 (OVL-C transition buffer) and before the velocity/damping integration.
    const target = _ssTarget.get(r.index) ?? r.physicalY;
    const strength = config.softSteeringStrength ?? SOFT_STEERING_STRENGTH_FALLBACK;
    delta += (target - r.physicalY) * strength;

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

  // ── Hard position separation (Layer 2 of the physics redesign) ────────────
  // ABSOLUTE LAST step of applyRacerBehavior: runs after every force (L1–L11), after the
  // velocity/clamp integration above, and after the drafting flags. A force-independent
  // POSITIONAL pass that guarantees two bodies never interpenetrate, resolving only a
  // `relaxation` fraction of any residual overlap per frame (smooth, never a snap).
  // Symmetric (each racer half) → fairness-neutral. All tracks, no isOpen branch.
  // Gated by config.hardSeparationEnabled (default TRUE → backstop active; set false to skip).
  if (config.hardSeparationEnabled) {
    const relax = Number.isFinite(config.hardSeparationRelaxation)
      ? Math.max(0, Math.min(1, config.hardSeparationRelaxation))
      : 0.15;
    // Warmup ramp: separation strength eases 0→full over avoidanceWarmupMs at race start.
    // Reuses the SAME value (avoidanceWarmupMs) and SAME shape (easeInOutCubic) as the
    // open-track brake warmup in computeEffectiveBrakeFactor — but applied here to BOTH
    // open AND closed tracks (deliberate unification). raceElapsedMs comes from the
    // already-passed priorityExtras.currentTs (no new parameter). When no clock is
    // available (legacy/test callers without priorityExtras) → full strength.
    const raceElapsedMs = priorityExtras?.currentTs;
    const warmupMs = config.avoidanceWarmupMs;
    const warmupScale =
      Number.isFinite(raceElapsedMs) && warmupMs > 0
        ? easeInOutCubic(Math.min(1, raceElapsedMs / warmupMs))
        : 1;
    const effectiveRelax = relax * warmupScale;
    // Overlap tolerance (dead-zone): bodies may overlap by up to this fraction of the
    // contact distance before separation engages, and separation only restores the gap to
    // that boundary (soft stop). 0 = separate on the slightest touch back to full contact.
    const tol = Math.max(0, Math.min(1, config.hardSeparationTolerancePct ?? 0.1));
    const capY = Math.min(config.maxLateral, 1.0);
    const EPS = 1e-9;
    // warmupScale 0 (race start) or relax 0 → no separation at all (also no velocity touch).
    if (effectiveRelax > 0)
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const rA = active[i];
          const rB = active[j];
          // Reuse the canonical 2-body geometry (sum-of-half-sizes) and track metrics.
          const { contactWidth, contactLength, pairTW, pairPL } = pairContact(rA, rB);
          if (contactWidth <= 0 || contactLength <= 0 || pairTW <= 0 || pairPL <= 0) continue;
          // Separation targets sit one tolerance band inside true contact (soft stop).
          const latTarget = contactWidth * (1 - tol);
          const longTarget = contactLength * (1 - tol);

          // Body overlap BEYOND the tolerance band (both axes). Same overlapSet shape,
          // shrunk by the tolerance dead-zone.
          let dT = Math.abs(rA.t - rB.t);
          if (dT > 0.5) dT = 1 - dT; // shortest arc on closed tracks
          const dYphys = rA.physicalY - rB.physicalY;
          const latPx = Math.abs(dYphys) * (pairTW / 2);
          const longPx = dT * pairPL;
          if (latPx >= latTarget || longPx >= longTarget) continue; // within tolerance → skip

          // ── Primary: symmetric lateral separation (soft-stop at the tolerance boundary) ─
          // Push apart until latPx reaches latTarget; resolve only effectiveRelax this frame.
          const overlapY = pxToPhysicalY(latTarget - latPx, pairTW); // physicalY units, > 0
          const halfPushY = 0.5 * overlapY * effectiveRelax;
          // Higher physicalY moves out (+), the other in (−). Stable tie-break at dY≈0.
          const signA =
            dYphys > EPS ? 1 : dYphys < -EPS ? -1 : stablePairBit(rA, rB) === 0 ? -1 : 1;
          const signB = -signA;
          const newYA = rA.physicalY + signA * halfPushY;
          const newYB = rB.physicalY + signB * halfPushY;

          if (newYA >= -capY && newYA <= capY && newYB >= -capY && newYB <= capY) {
            // Lateral has room: apply the symmetric push.
            rA.physicalY = newYA;
            rB.physicalY = newYB;
            // Cancel any velocity that OPPOSES the correction so the pre-existing velocity
            // does not re-close the gap next frame. Velocity already separating is kept.
            if ((rA.physicalYVelocity ?? 0) * signA < 0) rA.physicalYVelocity = 0;
            if ((rB.physicalYVelocity ?? 0) * signB < 0) rB.physicalYVelocity = 0;
            continue;
          }

          // ── Emergency: longitudinal separation (lateral blocked by the boundary) ─
          // Open the t-gap until longPx reaches longTarget. Natural order (front +t,
          // back −t) ALWAYS opens the gap → guarantees non-penetration.
          //
          // DESIGN NOTE: direction is natural-order primary, controller intent only a
          // tie-break at dT≈0. A literal per-racer-intent rule cannot guarantee separation
          // when both racers share an intent direction — pushing a trailer that "wants to
          // overtake" forward THROUGH its leader is exactly the pass-through this layer
          // exists to prevent. Non-penetration is the GOAL, so it wins. Intent is read from
          // r.trajectoryMult (the controller's own output — exactly 1.0 outside OUTCOME, so a
          // non-1.0 value IS the OUTCOME-phase signal; no fixed-percentage phase check here).
          const overlapT = (longTarget - longPx) / pairPL; // t-units, > 0
          const halfPushT = 0.5 * overlapT * effectiveRelax;
          let sd = rB.t - rA.t; // signed shortest-arc delta A→B
          if (sd > 0.5) sd -= 1;
          else if (sd < -0.5) sd += 1;
          let frontIsA;
          if (sd < -EPS)
            frontIsA = true; // A ahead
          else if (sd > EPS)
            frontIsA = false; // B ahead
          else {
            // dT≈0: front/back unclear → controller intent (OUTCOME), else stable index.
            const intentA = (rA.trajectoryMult ?? 1) - 1;
            const intentB = (rB.trajectoryMult ?? 1) - 1;
            frontIsA =
              intentA - intentB > EPS
                ? true
                : intentB - intentA > EPS
                  ? false
                  : rA.index < rB.index;
          }
          const front = frontIsA ? rA : rB;
          const back = frontIsA ? rB : rA;
          front.t += halfPushT;
          back.t -= halfPushT;
        }
      }
  }
}
