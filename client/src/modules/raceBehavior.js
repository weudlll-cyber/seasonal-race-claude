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

import { easeInOutCubic, shortestArcDeltaT, signedArcDeltaT } from '../utils/mathUtils.js';

// Pre-allocated per-step structures reused across every applyRacerBehavior call.
// Eliminates per-step Map/Set allocations. Each call clears + repopulates; no stale
// values leak between steps.
const _speedBrakeSet = new Set();
const _brakeMatchCaps = new Map();
const _brakeMatchLeaderIdxs = new Map();
// Layer 1 (Soft Steering): per-step target + selection state.
// _ssTarget:   racerIndex → target physicalY (default 0 = centerline).
// _ssForceMag: racerIndex → strongest forceMag seen this step (most-constraining wins).
const _ssTarget = new Map();
const _ssForceMag = new Map();
// Look-before-brake: per-step pass candidate per trailer.
// trailer.index → { leaderIndex, dir, targetY, dT }. Populated in the pair loop when a
// trailer can pass a slower leader through a free lane; consumed in the apply-deltas loop
// to drive decisive lateral steering and update the pass latch. Nearest leader (lowest dT)
// wins, mirroring the brake-match most-constraining-leader rule.
const _passCandidate = new Map();

// Layer 1 spring-constant fallback when config.softSteeringStrength is absent
// (partial-config callers in sim/unit paths). Mirrors the defaults.js value.
const SOFT_STEERING_STRENGTH_FALLBACK = 0.03;

// Lateral feel smoothing (Stage A2). Fallbacks mirror defaults.js for partial-config
// callers (sim/unit). LATERAL_STEP_MS is the fixed physics step (index.jsx FIXED_DT /
// sim DT = 16ms); the target ease advances one step per applyRacerBehavior call, so it
// is deterministic and browser/sim parity-safe without reading any wall-clock.
const LATERAL_STEP_MS = 16;
const LANE_TARGET_EASE_MS_FALLBACK = 200;
const VELOCITY_RESET_SOFTNESS_FALLBACK = 0.5;

// Look-ahead lane-change (Stage A3): uniform per-step cap on lateral motion (physicalY
// units/step), applied to dodge-outs AND returns alike so lateral speed is a single known
// constant. Mirrors the defaults.js value for partial-config callers (sim/unit). The dodge
// trigger (dT_start) is derived from this cap so a capped glide always clears in time.
// NOTE: vLatMax's sweet-spot (field-fanning vs brake-frequency vs glide-feel) is tuned in
// the governor sweep, NOT here — this fallback is a mild, conservative default. 0.028 sits
// modestly below today's front-loaded dodge peak (~0.033/step = pass spring 0.5 × damping
// 0.16), so it visibly caps the "jump" into a glide while the derived dodge trigger widens
// only slightly (closing rates are small vs the longitudinal contact span → little fanning),
// and keeps honestOverlap at/below baseline with overlapRate 0 (sim-checked).
const MAX_LATERAL_SPEED_PER_STEP_FALLBACK = 0.028;

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
  // Look-before-brake latch (this feature). When the trailer commits to passing a
  // slower leader through a free lane instead of braking, it locks the leader and the
  // chosen side so the choice is stable across frames (no left/right zigzag). -1 / 0 =
  // no pass committed. Written by the apply loop from the per-frame pass candidate,
  // read one frame later by chooseFreeLaneDir (same one-frame-lag pattern as brakeMatch).
  racer.passLeaderIndex = -1;
  racer.passDir = 0;
  // Lateral lane-change target smoothing (Stage A2, FEEL only). ssEasedTarget is the
  // smoothed target fed to the steering spring; it eases toward the raw per-step target
  // whenever that target FLIPS (lane change / pass commit), so the spring never sees a
  // step. Snapshot easeInOutCubic transition (same shape as the re-roll / warmup easing).
  // ssTargetGoal = undefined marks "first observation" → the first frame snaps (no
  // startup transient). The steering DECISION is unchanged; only the target motion eases.
  racer.ssEasedTarget = 0;
  racer.ssTargetGoal = undefined;
  racer.ssTargetFrom = 0;
  racer.ssTargetProg = 1;
}

/**
 * Ease the effective lateral steering target toward the raw per-step target (Stage A2,
 * FEEL only). Advances one fixed physics step per call, so it is deterministic and
 * browser/sim parity-safe (both step at LATERAL_STEP_MS). A constant target is a no-op
 * after the first call — only a target FLIP starts a fresh easeInOutCubic ramp. The
 * steering DECISION (which lane / whether to pass) is decided by the caller and is NOT
 * affected; this smooths only the target's motion so the spring never sees a jump.
 *
 * @param {object} r          racer (holds ssEasedTarget / ssTargetGoal / ssTargetFrom / ssTargetProg)
 * @param {number} rawTarget  the discontinuous per-step target the caller would otherwise use
 * @param {number} easeMs     ramp duration; <= 0 disables smoothing (snap = pre-Stage-A2)
 * @returns {number} the eased target to feed into the steering spring this frame
 */
function smoothLaneTarget(r, rawTarget, easeMs) {
  // First observation: snap (no startup transient) — byte-identical to frame 1 pre-smoothing.
  if (r.ssTargetGoal === undefined) {
    r.ssTargetGoal = rawTarget;
    r.ssTargetFrom = rawTarget;
    r.ssEasedTarget = rawTarget;
    r.ssTargetProg = 1;
    return rawTarget;
  }
  // Disabled (easeMs <= 0): snap — byte-identical to pre-Stage-A2 steering.
  if (!(easeMs > 0)) {
    r.ssTargetGoal = rawTarget;
    r.ssEasedTarget = rawTarget;
    r.ssTargetProg = 1;
    return rawTarget;
  }
  // Target flip → decide ease vs snap. SAFETY (Stage A2 addendum P1/P3): ease ONLY a
  // RELAXING move — one whose target magnitude SHRINKS toward centerline (the racer is
  // returning after an obstacle cleared; no body to out-run, so smoothing is free). A move
  // that INCREASES lateral offset is an avoidance/dodge commit that must clear the body in
  // time; easing it delays clearance and inflates overlap / pass-through (measured), so it
  // is SNAPPED decisively — identical to the pre-Stage-A2 dodge. This confines smoothing to
  // the safe half (the return weave) and keeps passThroughCount at/below baseline.
  if (Math.abs(rawTarget - r.ssTargetGoal) > 1e-4) {
    const relaxing = Math.abs(rawTarget) < Math.abs(r.ssEasedTarget) - 1e-9;
    if (!relaxing) {
      r.ssTargetFrom = rawTarget;
      r.ssTargetGoal = rawTarget;
      r.ssEasedTarget = rawTarget;
      r.ssTargetProg = 1;
      return rawTarget; // decisive dodge — no ease
    }
    r.ssTargetFrom = r.ssEasedTarget;
    r.ssTargetGoal = rawTarget;
    r.ssTargetProg = 0;
  }
  const easeFrames = Math.max(1, Math.round(easeMs / LATERAL_STEP_MS));
  r.ssTargetProg = Math.min(1, r.ssTargetProg + 1 / easeFrames);
  r.ssEasedTarget =
    r.ssTargetFrom + (r.ssTargetGoal - r.ssTargetFrom) * easeInOutCubic(r.ssTargetProg);
  return r.ssEasedTarget;
}

/**
 * Normalize an angle to [-π, π].
 * @param {number} a
 * @returns {number}
 */
function normalizeAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
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
// ALL px→physicalY conversions MUST go through this helper.
// Never use raw / trackWidth — that misses the factor of 2.
function pxToPhysicalY(px, trackWidth) {
  return px / (trackWidth / 2);
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

// Look-before-brake side selection with a deterministic hold (latch).
// Returns the committed free side for the trailer to pass its leader: -1 (inner), +1
// (outer), or 0 (neither side free → must brake). Uses the SAME isSideFree geometry as
// the overlap free-lane resolver, so "free now" means the same thing in both places.
//
// Latch (req 4): if the trailer already committed to this leader last frame and that side
// is still free, keep it — this is the short deterministic hold that prevents a frame-to-
// frame left/right flip-flop. When both sides are free with no prior commitment, the side
// is chosen by the same deterministic geometric tie-break as §4a soft steering (the side
// the trailer is already on, pairTieDir at a dead centerline tie) — no new randomness.
function chooseFreeLaneDir(trailer, leader, active, halfSpan, tHalf, cap) {
  const leftFree = isSideFree(trailer, leader, active, -1, halfSpan, tHalf, cap);
  const rightFree = isSideFree(trailer, leader, active, 1, halfSpan, tHalf, cap);
  // Hold: honor the existing latch while its side remains free.
  if (trailer.passLeaderIndex === leader.index) {
    if (trailer.passDir === -1 && leftFree) return -1;
    if (trailer.passDir === 1 && rightFree) return 1;
  }
  if (leftFree && rightFree) {
    return chooseGeometricDirection(trailer, leader, stablePairBit(trailer, leader));
  }
  if (leftFree) return -1;
  if (rightFree) return 1;
  return 0;
}

// Parity-safe per-step forward t-advance components for a pair — the SAME speed model the
// physics loop uses to advance r.t (baseSpeed × drafting boost × trajectory × areaBonus;
// the brake / pulk / zone terms are applied separately by the caller). All
// fields are parity-safe: browser and sim advance t by an identical per-step amount, so a
// closing rate derived from them is identical in both. Returns:
//   trailerDenom   — the trailer's UNBRAKED forward speed (its t-advance when not braking).
//   leaderRawSpeed — the leader's unbraked forward speed.
//   leaderBrake    — the leader's CURRENT effective brake (open tracks only; report 09/14),
//                    so leaderRawSpeed × leaderBrake is the leader's actual advance.
// Consumed by the brake-to-match cap AND the look-before-brake closing-rate gate.
function pairForwardSpeeds(trailer, leader, config) {
  const boostL = leader.draftingBoostActive ? config.draftingBoost : 1.0;
  const boostT = trailer.draftingBoostActive ? config.draftingBoost : 1.0;
  const leaderRawSpeed =
    (leader.baseSpeed ?? 0) *
    boostL *
    (leader.trajectoryMult ?? 1.0) *
    (leader.areaBonusMult ?? 1.0);
  const trailerDenom =
    (trailer.baseSpeed ?? 0) *
    boostT *
    (trailer.trajectoryMult ?? 1.0) *
    (trailer.areaBonusMult ?? 1.0);
  const leaderBrake =
    config.isOpen !== false && leader.avoidanceActive
      ? Math.min(config.speedBrakeFactor ?? 0.945, leader.brakeMatchFactor ?? 1.0)
      : 1.0;
  return { trailerDenom, leaderRawSpeed, leaderBrake };
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
 * @param {{ currentTs: number }|undefined} priorityExtras
 *   Optional. Carries the race clock (currentTs) used solely by the hard-separation
 *   warmup ramp. When omitted (legacy/test callers), the ramp runs at full strength.
 */
export function applyRacerBehavior(racers, config, priorityExtras) {
  if (!config.enabled) {
    for (const r of racers) {
      r.avoidanceActive = false;
      r.draftingBoostActive = false;
    }
    return;
  }

  const active = racers.filter((r) => !r.finished);
  for (const r of active) r.draftingBoostActive = false;

  // Clear + repopulate pre-allocated module-level structures (no per-step allocation).
  _speedBrakeSet.clear();
  _brakeMatchCaps.clear();
  _brakeMatchLeaderIdxs.clear();
  _ssTarget.clear();
  _ssForceMag.clear();
  _passCandidate.clear();
  for (const r of active) {
    _ssTarget.set(r.index, 0);
    _ssForceMag.set(r.index, 0);
  }
  const speedBrakeSet = _speedBrakeSet;
  // Look-ahead lane-change (Stage A3): uniform per-step lateral-speed cap. Read once so the
  // SAME constant feeds both the dodge trigger (dT_start below) and the integrator step clamp.
  const vLatMax = Math.max(0, config.maxLateralSpeedPerStep ?? MAX_LATERAL_SPEED_PER_STEP_FALLBACK);
  // Brake-to-match: per-frame minimum cap per trailer (most constraining leader wins).
  // Populated in the pair loop; consumed in the apply-deltas loop to update racer state.
  const brakeMatchCaps = _brakeMatchCaps; // trailer.index → lowest requiredBrakeFactor this frame
  const brakeMatchLeaderIdxs = _brakeMatchLeaderIdxs; // trailer.index → leader.index for that cap

  // ── Avoidance (anisotropic, asymmetric: trailer yields, leader holds) ──────
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const rA = active[i];
      const rB = active[j];

      // Anisotropic distance in (t, physicalY) space — lap-normalized shortest arc.
      const dT = shortestArcDeltaT(rA.t, rB.t);
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
        // ── Look before you brake ─────────────────────────────────────────────
        // The trailer is same-lane and closing on a slower leader inside the brake zone.
        // Before committing to the speed brake, check for a genuinely free side (same
        // isSideFree geometry the overlap resolver uses). If a side is free AND the brake
        // can still be re-engaged in time should the trailer fail to clear, commit to that
        // side EARLY and pass at speed — do NOT brake. Non-penetration is STRUCTURAL, not
        // delegated to the hard-separation backstop; it is guaranteed by four couplings,
        // all keyed on parity-safe (t, physicalY, per-step speed) fields only:
        //   (a) isSideFree is re-evaluated every frame — the instant a third racer closes
        //       the lane, dir → 0 and the exact brake path below re-engages.
        //   (b) LAG-SAFE LONGITUDINAL RE-ENGAGE (the NO-GO fix). The physics loop applies
        //       the brake one frame late (index.jsx: avoidanceActive/brakeMatchFactor are
        //       read on the step AFTER they are written). So suppression is only safe while
        //       there is enough longitudinal lead that, after the unbraked lag frame(s), a
        //       re-engaged brake still prevents contact. The required lead scales with the
        //       WORST-CASE per-step closing rate vClose (trailer unbraked vs leader at least
        //       at its brake floor): dT must exceed lbTHalf + lagFrames × vClose. Because
        //       one unbraked lag frame closes by ≤ vClose < lagFrames × vClose, the gap
        //       stays above lbTHalf until the brake bites — overlap cannot occur. The fixed
        //       ×multiplier margin stays as a floor for slow/near-speed pairs.
        //   (c) ACHIEVED lateral progress: suppression additionally requires the trailer is
        //       not moving toward the leader's side (losing clearance). Measured from the
        //       trailer's own lateral velocity — "free this frame" is not enough.
        //   (d) Only pass a genuinely SLOWER leader (a real overtake), so racers do not
        //       weave around same-speed traffic (gated by requireSlowerLeader).
        // The hard-separation pass remains ONLY as a last-resort catch, never the guarantee.
        let takeFreeLane = false;
        if (config.lookBeforeBrakeEnabled !== false && trackWidth > 0 && pathLength > 0) {
          const lbHalfSpan = pxToPhysicalY(brakeContactWidth, trackWidth);
          const lbTHalf = brakeContactLength / pathLength;
          const lbCap = Math.min(config.maxLateral, 1.0);
          const reengageFloorT = lbTHalf * (config.lookBeforeBrakeReengageTMultiplier ?? 1.2);

          // Worst-case per-step longitudinal closing rate (parity-safe). Assume the leader
          // will be at least at the brake floor next frame even if it is not braking now, so
          // vClose is never underestimated (conservative — re-engages earlier, never later).
          const { trailerDenom, leaderRawSpeed, leaderBrake } = pairForwardSpeeds(
            trailer,
            leader,
            config
          );
          const leaderBrakeWorst = Math.min(leaderBrake, config.speedBrakeFactor ?? 0.945);
          const vClose = Math.max(0, trailerDenom - leaderRawSpeed * leaderBrakeWorst);
          const lagFrames = config.lookBeforeBrakeLagFrames ?? 2;
          // Effective re-engage threshold: the larger of the fixed floor and the lag-safe
          // dynamic margin. Suppress only while dT is above it.
          const safeReengageT = Math.max(reengageFloorT, lbTHalf + lagFrames * vClose);
          // Look-ahead lane-change (Stage A3): the dodge now glides at the uniform vLatMax cap,
          // so it must START early enough to traverse one body-width sideways (lbHalfSpan) at
          // that capped speed before longitudinal contact. tLat = steps to clear sideways;
          // dT_start = lbTHalf + vClose × (tLat + lagFrames) is the gap at which to commit.
          // Kept as a FLOOR over safeReengageT (never fires later than the brake-lag margin
          // required today), so dT_start >= safeReengageT always — the dodge triggers earlier,
          // never later. Reuses the existing lbHalfSpan / lbTHalf / vClose / lagFrames — no
          // second copy of the geometry. When the side can't be cleared in time the gate stays
          // shut and the trailer brakes (option A: wait, never squeeze).
          const tLat = vLatMax > 0 ? lbHalfSpan / vLatMax : Infinity;
          const dTStart = Math.max(safeReengageT, lbTHalf + vClose * (tLat + lagFrames));

          // (d) real-overtake precondition: trailer must be meaningfully faster (raw speeds).
          // Uses the DEDICATED lookBeforeBrakeMinDifferential (decoupled from brake-to-match's
          // speedMatchMinDifferential); falls back to speedMatchMinDifferential then 0.005 so a
          // config predating this knob is byte-identical to the old shared-threshold behaviour.
          const minDiff =
            config.lookBeforeBrakeMinDifferential ?? config.speedMatchMinDifferential ?? 0.005;
          const slowerLeaderOk =
            config.lookBeforeBrakeRequireSlowerLeader === false ||
            trailerDenom > leaderRawSpeed * (1 + minDiff);

          if (dT > dTStart && slowerLeaderOk) {
            const dir = chooseFreeLaneDir(trailer, leader, active, lbHalfSpan, lbTHalf, lbCap);
            // (c) achieved progress: do not suppress while diverging from the chosen side
            // (physicalYVelocity is last frame's post-damping value — parity-safe). Frame-1
            // velocity ≈ 0 passes; a negative (toward-leader) velocity re-engages the brake.
            const vLatToward = (trailer.physicalYVelocity ?? 0) * dir;
            if (dir !== 0 && vLatToward >= 0) {
              takeFreeLane = true;
              // Record this pass for the trailer. Nearest leader (lowest dT) wins so a
              // trailer sandwiched between two leaders steers around the closer one.
              const prev = _passCandidate.get(trailer.index);
              if (!prev || dT < prev.dT) {
                const offsetY = lbHalfSpan * (1 + (config.softSteeringClearancePct ?? 0));
                let targetY = leader.physicalY + dir * offsetY;
                if (targetY < -lbCap) targetY = -lbCap;
                else if (targetY > lbCap) targetY = lbCap;
                _passCandidate.set(trailer.index, {
                  leaderIndex: leader.index,
                  dir,
                  targetY,
                  dT,
                });
              }
            }
          }
        }

        if (!takeFreeLane) {
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
            // Brake-to-match: compute leader-speed cap for this pair. Speeds come from the
            // shared parity-safe helper (same model the look-before-brake gate uses).
            // All multipliers default to 1.0 if missing (e.g. unit tests or race-plan off).
            // leaderBrake: open tracks only (report 09 bypass fix, report 14 scoping).
            // On open tracks, cap targets leader's ACTUAL advance (rawSpeed × 0.945 when
            // avoidanceActive). On closed tracks leaderBrake=1.0 preserves the pre-rebuild
            // baseline cap — the 5.8%-tighter corrected cap causes chain-lock for beetle
            // and boarder on Dirt Oval.
            const { trailerDenom, leaderRawSpeed, leaderBrake } = pairForwardSpeeds(
              trailer,
              leader,
              config
            );
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
        } // end if (!takeFreeLane)
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
      // INSERT-ONLY. For the most-constraining obstacle (highest forceMag), store a
      // target one contact width to the side it is already on. Always asymmetric
      // (trailer only) regardless of softSteeringSymmetric — see lines 398-402. The
      // overlap block (§4b) may later override this for the same pair (it uses >= so
      // overlap wins on equal forceMag).
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
        // §4a is always asymmetric: trailer yields to leader, leader
        // holds its line. The leader's target stays 0 (centerline reset
        // at line 241) so the home spring pulls it back to centre when
        // no body overlap is active. softSteeringSymmetric applies only
        // to §4b (actual body contact), where both racers must separate.
        assignSoftTarget(trailer, leader);
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
          // delta ≈ 0, which replaces L9 (stuck suppression) for this case.
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
        }
      }
    }
  }

  // Apply deltas via velocity + damping + hard clamp
  const damping = Number.isFinite(config.lateralDamping) ? config.lateralDamping : 0.35;
  // Stage A2 feel knobs (read once; used in this loop and the hard-separation pass below).
  const laneTargetEaseMs = config.laneTargetEaseMs ?? LANE_TARGET_EASE_MS_FALLBACK;
  const velResetKeep = Math.max(
    0,
    Math.min(1, config.lateralVelocityResetSoftness ?? VELOCITY_RESET_SOFTNESS_FALLBACK)
  );
  for (const r of active) {
    let delta = 0;

    // ── Look-before-brake pass steering (req 3 + 4) ─────────────────────────
    // When this racer committed to passing a slower leader through a free lane, drive
    // it toward the free side with a DECISIVE spring (lookBeforeBrakePassStrength ≫ the
    // gentle soft-steering constant) so it actually clears sideways before it reaches
    // longitudinal contact — the "commit" half of the non-penetration coupling. The
    // pass spring REPLACES the soft-steering spring this frame (it aims at the verified-
    // free side, which the naive §4a target may not). The latch (passLeaderIndex/passDir)
    // is written here from the per-step candidate and read one frame later by
    // chooseFreeLaneDir to hold the chosen side stable (no zigzag). No candidate → clear
    // the latch and fall back to the normal soft-steering spring.
    // Resolve this frame's steering DECISION (branch + latch + raw target + spring
    // strength) exactly as before — nothing here changes which lane is chosen. The raw
    // target is then eased (smoothLaneTarget) so the spring never sees a discontinuous
    // flip; the latch writes (passLeaderIndex/passDir) are untouched, so chooseFreeLaneDir
    // reads the identical stable side one frame later.
    const passCand = _passCandidate.get(r.index);
    if (passCand) {
      r.passLeaderIndex = passCand.leaderIndex;
      r.passDir = passCand.dir;
      const passStrength = config.lookBeforeBrakePassStrength ?? 0.5;
      // Stage A2: the pass commit is SAFETY-CRITICAL — it must clear the racer sideways
      // BEFORE longitudinal contact (the non-penetration "commit" half). So it is NOT
      // eased; steer decisively to the free side exactly as before. Passing easeMs=0 also
      // SYNCS the smoothing state to this target, so a later return to soft steering eases
      // from the true current target rather than a stale value. (Verified: easing the pass
      // target inflated passThroughCount/overlap — smoothing is confined to §4a below.)
      const passTarget = smoothLaneTarget(r, passCand.targetY, 0);
      delta += (passTarget - r.physicalY) * passStrength;
    } else {
      r.passLeaderIndex = -1;
      r.passDir = 0;
      // ── Layer 1 (Soft Steering): single target spring ───────────────────────
      // The sole lateral force model. Pulls the racer toward its per-step target:
      // centerline (0) when no obstacle, beside the most-constraining obstacle
      // otherwise, or the current position (hold) when both sides are blocked. Runs
      // before the velocity/damping integration.
      const rawTarget = _ssTarget.get(r.index) ?? r.physicalY;
      const strength = config.softSteeringStrength ?? SOFT_STEERING_STRENGTH_FALLBACK;
      // Stage A2: ease the effective soft-steering target toward the (possibly flipped) raw
      // target so the spring integrates a smooth weave, not a snap. This is FEEL only — the
      // §4a lane choice (rawTarget) is unchanged; only its motion is smoothed.
      const easedTarget = smoothLaneTarget(r, rawTarget, laneTargetEaseMs);
      delta += (easedTarget - r.physicalY) * strength;
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

    // Stage A3: uniform per-step lateral-speed cap. Clamp the NET step magnitude to vLatMax
    // (dodge-out AND return alike) so lateral motion never exceeds the constant speed the
    // look-ahead trigger (dTStart) is derived from — the fast, front-loaded pass "jump" is
    // limited into a glide without weakening the spring. Sync physicalYVelocity to the CLAMPED
    // step so the spring cannot bank unspent force and lurch on release. When the step is
    // already within vLatMax (e.g. the gentle return) this is a no-op; vLatMax very large →
    // never clamps → reproduces the prior near-instant dodge (escape hatch / regression).
    const preCapStep = newY - r.physicalY;
    if (Math.abs(preCapStep) > vLatMax) {
      const cappedStep = preCapStep > 0 ? vLatMax : -vLatMax;
      newY = r.physicalY + cappedStep;
      r.physicalYVelocity = cappedStep;
    }

    // maxLateral cap + hard boundary clamp. Stage A2: the position clamp stays HARD
    // (physicalY pinned to the cap); the velocity is DAMPED toward 0 (retain velResetKeep)
    // instead of hard-zeroed, so a moving racer eases to a stop at the wall rather than
    // stopping dead mid-move. velResetKeep = 0 reproduces the pre-Stage-A2 hard reset.
    const cap = Math.min(config.maxLateral, 1.0);
    const clamped = Math.max(-cap, Math.min(cap, newY));
    if (clamped !== newY) r.physicalYVelocity *= velResetKeep;
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

          // Body overlap BEYOND the tolerance band (both axes). Same body-overlap
          // geometry as the soft-steering pass, shrunk by the tolerance dead-zone.
          const dT = shortestArcDeltaT(rA.t, rB.t);
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
            // Stage A2 NOTE: this reset is deliberately LEFT HARD (not softened). It is an
            // anti-re-overlap SAFETY, not a wall-stop feel artifact — softening it would let
            // a racer re-close into overlap and break the hard-separation guarantee. Only the
            // boundary-clamp velocity reset (a pure wall-stop artifact) is softened this stage.
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
          const sd = signedArcDeltaT(rA.t, rB.t); // signed shortest-arc A→B (positive = B ahead)
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
