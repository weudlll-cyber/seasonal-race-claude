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

// lateralForce calibration baseline in px — a fixed anchor, close to Dirt Oval's ~93px width. Do not retune to match any specific track (see ARCHITECTURE.md).
// Wider tracks divide lateralForce by the ratio; narrower tracks multiply it (clamped 0.1–3.0).
const REFERENCE_TRACK_WIDTH = 98;

// Stuck-mode thresholds (match diagnosis-recommended band from diag-stuck-mode.mjs).
// A racer is "stuck" when bilateral avoidance forces nearly cancel, leaving it motionless.
// Used by stuckModeSuppress: when all three conditions hold, lateral delta is zeroed.
const STUCK_P_THRESH = 0.008; // minimum totalPressure (rawPos + rawNeg) to qualify
const STUCK_BALANCE_RATIO = 0.25; // max |rawPos - rawNeg| / totalPressure (near-cancel)
const STUCK_VEL_THRESH = 0.0015; // max |physicalYVelocity| to consider the racer motionless

// Lateral-wedge debounce (Weg 1): a racer counts as "blocked" for the drive cap only after a few
// consistent wedged frames, and releases with the same hysteresis — prevents single-frame flicker
// from toggling the cap (speed jitter). Mirrors the commit-latch debounce idiom used elsewhere.
const LATERAL_BLOCK_THRESH = 3; // consecutive wedged frames before lateralBlocked engages
const LATERAL_BLOCK_CAP = 6; // counter ceiling → releases a few free frames after saturation

// Pre-allocated per-step structures reused across every applyRacerBehavior call.
// Eliminates ~10 new Map/Set allocations per physics step (~37,500 per 60s race).
// Each call clears + repopulates; no stale values leak between steps.
const _yDeltas = new Map();
const _yAvoidDeltas = new Map();
const _yFreeLaneDeltas = new Map();
const _freeLaneCounts = new Map();
const _overlapSet = new Set();
const _neighborCounts = new Map();
const _speedBrakeSet = new Set();
const _brakeMatchCaps = new Map();
const _brakeMatchLeaderIdxs = new Map();
const _dRawPos = new Map();
const _dRawNeg = new Map();
const _dCntPos = new Map();
const _dCntNeg = new Map();
// Step-2 clearance accumulators (Stage A — populated, not yet consumed).
// Sets of racer index: which racers have a neighbor in each directional corridor.
// Populated before Y-rejection so the corridor is not clipped by the avoidance gate.
const _approachLeft = new Set();
const _approachRight = new Set();
const _forwardLeft = new Set();
const _forwardRight = new Set();
// Step-2 Stage B: same-lane detection (open tracks, post-Y-rejection pair loop body).
// _sameLaneApproach:    trailer indices that have a leader nearly directly ahead this step.
// _approachForceMag:    per-trailer max forceMag seen for same-lane pairs (force scaling).
// _sameLaneLeaderPhysY: per-trailer leader physicalY — primary direction source for commit.
const _sameLaneApproach = new Set();
const _approachForceMag = new Map();
const _sameLaneLeaderPhysY = new Map();
// _sameLaneLeaderObj: per-trailer leader object for the most-constraining leader —
// used only to derive the stable tie-break side at relPos ≈ 0 (pairTieDir).
const _sameLaneLeaderObj = new Map();
// OVL-C: per-step free-side direction + partner physicalY for the sustained-OVERLAP escape.
// Populated in the free-lane overlap block once dirA/dirB are final; cleared every step.
const _ovlcEscapeDir = new Map(); // racerIndex → free-side direction (±1); absent = blocked
const _ovlcPartnerY = new Map(); // racerIndex → overlapping partner physicalY (ramp source)
// Weg 1: per-step set of racers that are overlapping AND have no free lateral side (wedged).
// Debounced into racer.lateralBlocked in the apply-deltas loop; cleared every step.
const _wedgedSet = new Set();

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
 * Effective controller/boost drive multiplier (trajectoryMult × areaBonusMult × rubberBandMult),
 * capped to ≤1.0 when the racer is braking (avoidanceActive) AND laterally wedged (no free side).
 * (Weg 1) Keeps the collision brake's precedence: a braked, boxed-in racer is not additionally
 * accelerated into the body ahead. Over-drive removal ONLY — it never reduces drive below the raw
 * value (min, not a new brake), so net speed never drops below the existing brake floor.
 * Topology-neutral: on open a free side almost always exists → lateralBlocked rarely set → no-op.
 * SINGLE SOURCE: read by BOTH the brake-match denominator (below) and the t-update (index.jsx + sim)
 * so the cap can never diverge between the brake-match cap and the actual advance.
 *
 * @param {{trajectoryMult?:number, areaBonusMult?:number, rubberBandMult?:number,
 *          avoidanceActive?:boolean, lateralBlocked?:boolean}} r
 * @returns {number}
 */
export function effectiveDriveMult(r) {
  const raw = (r.trajectoryMult ?? 1.0) * (r.areaBonusMult ?? 1.0) * (r.rubberBandMult ?? 1.0);
  return r.avoidanceActive && r.lateralBlocked ? Math.min(1.0, raw) : raw;
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
  // Step-2 Stage B: lateral commitment state (all tracks).
  // approachCommitDir: −1 (left), 0 (none), +1 (right). Debounced to prevent zigzag.
  racer.approachCommitDir = 0;
  racer.approachCommitFrames = 0;
  // OVL-C: escape latch (all tracks). Mirrors approachCommitDir debounce.
  racer.escapeCommitDir = 0;
  racer.escapeCommitFrames = 0;
  // Weg 1: debounced "braking with no free lateral side" flag, read by effectiveDriveMult to cap
  // the controller over-drive. One-frame-lag cross-file pattern, same as avoidanceActive.
  racer.lateralBlocked = false;
  racer.lateralBlockedFrames = 0;
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
 *   homeForceStrength: number,
 *   homeForceReductionOnOverlap: number,
 *   comfortThreshold: number, softRepulsionStrength: number,
 *   avoidanceBufferPct: number,
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

  // Clear + repopulate pre-allocated module-level structures (no per-step allocation).
  _yDeltas.clear();
  _yAvoidDeltas.clear();
  _yFreeLaneDeltas.clear();
  _freeLaneCounts.clear();
  _overlapSet.clear();
  _neighborCounts.clear();
  _speedBrakeSet.clear();
  _brakeMatchCaps.clear();
  _brakeMatchLeaderIdxs.clear();
  _approachLeft.clear();
  _approachRight.clear();
  _forwardLeft.clear();
  _forwardRight.clear();
  _sameLaneApproach.clear();
  _approachForceMag.clear();
  _sameLaneLeaderPhysY.clear();
  _sameLaneLeaderObj.clear();
  _ovlcEscapeDir.clear();
  _ovlcPartnerY.clear();
  _wedgedSet.clear();
  for (const r of active) {
    _yDeltas.set(r.index, 0);
    _yAvoidDeltas.set(r.index, 0);
    _yFreeLaneDeltas.set(r.index, 0);
    _freeLaneCounts.set(r.index, 0);
    _neighborCounts.set(r.index, 0);
  }
  // Accumulate physicalY deltas from home force + avoidance
  const yDeltas = _yDeltas;
  // Avoidance accumulated separately for sqrt(neighborCount) normalization (A3/B3)
  const yAvoidDeltas = _yAvoidDeltas;
  // Free-lane separation impulses — normalized by sqrt(freeLaneCount) to prevent
  // stacking explosion at race start where many pairs overlap simultaneously.
  const yFreeLaneDeltas = _yFreeLaneDeltas;
  const freeLaneCounts = _freeLaneCounts;
  const overlapSet = _overlapSet;
  const neighborCounts = _neighborCounts;
  const speedBrakeSet = _speedBrakeSet;
  // Brake-to-match: per-frame minimum cap per trailer (most constraining leader wins).
  // Populated in the pair loop; consumed in the apply-deltas loop to update racer state.
  const brakeMatchCaps = _brakeMatchCaps; // trailer.index → lowest requiredBrakeFactor this frame
  const brakeMatchLeaderIdxs = _brakeMatchLeaderIdxs; // trailer.index → leader.index for that cap
  // rawPos/rawNeg: pre-normalization avoidance + free-lane force magnitudes by direction.
  // Reuse pre-allocated module-level maps when needed; null signals "not needed" to inner loops.
  // cntPos/cntNeg: pair-force counts — only needed for external diagnostic output.
  const needsBreakdown = diagOut !== null || (config.stuckModeSuppress ?? false);
  let dRawPos = null;
  let dRawNeg = null;
  let dCntPos = null;
  let dCntNeg = null;
  if (needsBreakdown) {
    _dRawPos.clear();
    _dRawNeg.clear();
    for (const r of active) {
      _dRawPos.set(r.index, 0);
      _dRawNeg.set(r.index, 0);
    }
    dRawPos = _dRawPos;
    dRawNeg = _dRawNeg;
  }
  if (diagOut !== null) {
    _dCntPos.clear();
    _dCntNeg.clear();
    for (const r of active) {
      _dCntPos.set(r.index, 0);
      _dCntNeg.set(r.index, 0);
    }
    dCntPos = _dCntPos;
    dCntNeg = _dCntNeg;
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

      // ── Step-2 clearance accumulators (Stage A — all tracks) ──────────────────
      // Runs BEFORE Y-rejection so the clearance corridor is not clipped by the
      // avoidance gate. Uses its own geometric gate (2 × honest half-span).
      // Not yet consumed — populated here for budget measurement only.
      // Bare block (no isOpen gate): de-stacking now runs on closed tracks too.
      {
        const twA = getTrackWidthAtTpx(rA);
        const twB = getTrackWidthAtTpx(rB);
        const pairTW = Math.max(twA, twB);
        if (pairTW > 0) {
          const rAHH = pxToPhysicalY(rA.drawnBodyWidthPx ?? rA.frameSizePx ?? 0, pairTW);
          const rBHH = pxToPhysicalY(rB.drawnBodyWidthPx ?? rB.frameSizePx ?? 0, pairTW);
          const pairHH = Math.max(rAHH, rBHH);
          if (pairHH > 0 && Math.abs(dY) < 2 * pairHH) {
            const aIsAhead = rA.t >= rB.t;
            const front = aIsAhead ? rA : rB;
            const back = aIsAhead ? rB : rA;
            const lateralDelta = front.physicalY - back.physicalY;
            if (lateralDelta > 0) {
              _approachRight.add(back.index);
              _approachLeft.add(front.index);
            } else if (lateralDelta < 0) {
              _approachLeft.add(back.index);
              _approachRight.add(front.index);
            }
            if (lateralDelta > pairHH) _forwardRight.add(back.index);
            else if (lateralDelta < -pairHH) _forwardLeft.add(back.index);
          }
        }
      }

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
          // Weg 1: read the (possibly capped) drive via effectiveDriveMult so the brake-match cap
          // and the actual t-update advance use the IDENTICAL drive value (no divergence).
          const leaderRawSpeed = (leader.baseSpeed ?? 0) * boostL * effectiveDriveMult(leader);
          const trailerDenom = (trailer.baseSpeed ?? 0) * boostT * effectiveDriveMult(trailer);
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

      // Track-relative scaling: wider tracks get proportionally weaker lateralForce
      // so the pixel-space force is consistent across all track widths.
      const lateralScale =
        pairTW > 0 ? Math.max(0.1, Math.min(3.0, REFERENCE_TRACK_WIDTH / pairTW)) : 1.0;

      // Proximity-scaled lateral force: min penetration fraction across both axes.
      // Decays from lateralForce (centers touching) to 0 (at the trigger boundary).
      const latFraction = 1 - latPx / latTrigger;
      const longFraction = 1 - longPx / longTrigger;
      const forceMag = config.lateralForce * Math.min(latFraction, longFraction);

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

          // Weg 1: this racer is overlapping AND has no free side → wedged (debounced below).
          if (aBlocked) _wedgedSet.add(rA.index);
          if (bBlocked) _wedgedSet.add(rB.index);

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
          // OVL-C: record free-side direction and partner Y for the escape.
          // All overlapping pairs write; last-written wins when multiple pairs overlap.
          if (dirA !== 0) _ovlcEscapeDir.set(rA.index, dirA);
          _ovlcPartnerY.set(rA.index, rB.physicalY);
          if (dirB !== 0) _ovlcEscapeDir.set(rB.index, dirB);
          _ovlcPartnerY.set(rB.index, rA.physicalY);
        }
      }

      // Push trailer away from leader's physicalY.
      // When yDiff ≈ 0 there is no meaningful push direction — skip to avoid all trailers
      // rushing toward positive physicalY (the degenerate yDiff≥0 branch).
      const yDiff = trailer.physicalY - leader.physicalY;

      // ── Step-2 Stage B: same-lane approach detection (all tracks) ─────────────
      // Fires when the trailer is within one honest body half-span of the leader laterally.
      // Stores this trailer as needing a committed side choice, plus the current forceMag
      // for magnitude-bounded force injection in the apply-deltas loop.
      if (trackWidth > 0) {
        const sameLaneHH = pxToPhysicalY(
          Math.max(
            trailer.drawnBodyWidthPx ?? trailer.frameSizePx ?? 0,
            leader.drawnBodyWidthPx ?? leader.frameSizePx ?? 0
          ),
          trackWidth
        );
        if (sameLaneHH > 0 && Math.abs(yDiff) < sameLaneHH) {
          _sameLaneApproach.add(trailer.index);
          if (forceMag > (_approachForceMag.get(trailer.index) ?? 0)) {
            _approachForceMag.set(trailer.index, forceMag);
          }
          // Store leader physicalY for the deadlock-break fallback in apply-deltas.
          // Most-constraining leader (highest forceMag) wins so the same priority as
          // forceMag selection applies to the direction reference.
          if (forceMag >= (_approachForceMag.get(trailer.index) ?? 0)) {
            _sameLaneLeaderPhysY.set(trailer.index, leader.physicalY);
            _sameLaneLeaderObj.set(trailer.index, leader);
          }
        }
      }

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

    // ── Step-2 Stage B/C/D + OVL-C: lateral commitment + escape (all tracks) ──
    // Consume the Stage A/B accumulators to update the committed side and inject force.
    // Bare block (no isOpen gate): the active de-stacking now runs on closed tracks too.
    {
      const inSameLane = _sameLaneApproach.has(r.index);
      if (inSameLane) {
        // Leader-relative direction: steer to the side the trailer is already on,
        // away from this specific leader. Removes the t-blind corridor false-positive
        // (_approachLeft/Right) that deadlocked 91.5% of dense-field triggers and caused
        // Stage B force to cancel the natural avoidance push instead of reinforcing it.
        // Stage C two-part override: switch from naturalDir only when (a) natural side
        // has a forward obstacle AND (b) the opposite side is clear both AHEAD and
        // ADJACENTLY — preventing a switch into a lane with a racer right beside us.
        // _approachLeft/Right used here only as a gate on the switch, never as the
        // primary direction source (no force-cancellation risk on the primary case).
        let desiredDir = 0;
        const lpy = _sameLaneLeaderPhysY.get(r.index);
        if (lpy !== undefined) {
          const relPos = r.physicalY - lpy;
          const naturalDir =
            Math.abs(relPos) >= 1e-6
              ? relPos >= 0
                ? 1
                : -1
              : pairTieDir(r, _sameLaneLeaderObj.get(r.index));
          const naturalFwdBlocked =
            naturalDir > 0 ? _forwardRight.has(r.index) : _forwardLeft.has(r.index);
          const oppFwdBlocked =
            naturalDir > 0 ? _forwardLeft.has(r.index) : _forwardRight.has(r.index);
          // Part 1 (adjacent): is the opposite side free right now?
          const oppApproachBlocked =
            naturalDir > 0 ? _approachLeft.has(r.index) : _approachRight.has(r.index);
          desiredDir =
            naturalFwdBlocked && !oppFwdBlocked && !oppApproachBlocked ? -naturalDir : naturalDir;
        }

        const commitTimeout = config.brakeHoldTimeoutFrames ?? 90;
        if (desiredDir !== 0) {
          if (desiredDir === r.approachCommitDir) {
            r.approachCommitFrames++;
          } else {
            // Debounce direction flip: decay the counter before switching.
            r.approachCommitFrames--;
            if (r.approachCommitFrames <= 0) {
              r.approachCommitDir = desiredDir;
              r.approachCommitFrames = 1;
            }
          }
          if (r.approachCommitFrames >= commitTimeout) {
            // Anti-starvation: abandon commit after too many consecutive frames.
            r.approachCommitDir = 0;
            r.approachCommitFrames = 0;
          }
        } else {
          // desiredDir still 0: no leader physicalY available — decay gently.
          r.approachCommitFrames = Math.max(0, r.approachCommitFrames - 1);
          if (r.approachCommitFrames === 0) r.approachCommitDir = 0;
        }
      } else {
        // No same-lane leader: decay commitment over bmDebounce frames.
        const dbDecay = config.brakeReleaseDebounceFrames ?? 3;
        if (r.approachCommitDir !== 0) {
          r.approachCommitFrames = Math.max(0, r.approachCommitFrames - dbDecay);
          if (r.approachCommitFrames === 0) r.approachCommitDir = 0;
        }
      }

      // Inject committed lateral force + Stage D gap-clearing force into this frame's delta.
      if (r.approachCommitDir !== 0) {
        const fMag = _approachForceMag.get(r.index) ?? 0;
        if (fMag > 0) {
          let injected = fMag;
          // ── Step-2 Stage D: self-limiting honest-clearance force ───────────────
          // Proportional push toward one honest body width of lateral separation.
          // Three gates ensure this only fires in the genuine direct-behind pass scenario:
          //   (1) inSameLane: leader is within sameLaneHH laterally, leaderPhysY is fresh.
          //   (2) speedBrakeSet: trailer is actively decelerating behind a leader (close in T).
          //       Excludes "alongside" pairs (similar track position, large T separation) that
          //       would otherwise get extra lateral push causing zigzag and excess contact.
          //   (3) lpy defined: fresh leader physicalY available this frame.
          // Ramps from lateralForce×strength at |yDiff|=0 down to 0 at |yDiff|=2×honestHalfSpan.
          const lpy = _sameLaneLeaderPhysY.get(r.index);
          if (inSameLane && speedBrakeSet.has(r.index) && lpy !== undefined) {
            const tw = getTrackWidthAtTpx(r);
            if (tw > 0) {
              const honestHalfSpan = pxToPhysicalY(r.drawnBodyWidthPx ?? r.frameSizePx ?? 0, tw);
              if (honestHalfSpan > 0) {
                const absYDiff = Math.abs(r.physicalY - lpy);
                const clearanceSpan = 2 * honestHalfSpan;
                const gapRatio = Math.max(0, (clearanceSpan - absYDiff) / clearanceSpan);
                const gapForce = config.lateralForce * (config.gapForceStrength ?? 1.0) * gapRatio;
                // Safety ceiling: total Stage B injection ≤ lateralForce × gapForceCap.
                const cap = config.lateralForce * (config.gapForceCap ?? 1.5);
                injected = Math.min(injected + gapForce, cap);
              }
            }
          }
          delta += r.approachCommitDir * injected;
        }
      }

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
        // No longer eligible: gentle decay, same pattern as approachCommitDir.
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

    // Weg 1: debounce the wedged signal into r.lateralBlocked (hysteresis prevents flicker).
    r.lateralBlockedFrames = _wedgedSet.has(r.index)
      ? Math.min(LATERAL_BLOCK_CAP, r.lateralBlockedFrames + 1)
      : Math.max(0, r.lateralBlockedFrames - 1);
    r.lateralBlocked = r.lateralBlockedFrames >= LATERAL_BLOCK_THRESH;

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
