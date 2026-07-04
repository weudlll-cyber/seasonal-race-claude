// ============================================================
// File:        raceRubberBand.js
// Path:        client/src/modules/raceRubberBand.js
// Project:     RaceArena
// Description: Rubber-band "cap the lead" mechanism — shared by the browser race
//              engine (RaceScreen/index.jsx) and the headless sim (sim-fairness.mjs)
//              so both measure the identical mechanism (single-source, L129).
//
//              Intent: bound the leader's maximum gap to the field MEDIAN via a
//              proportional brake on front-breakaway racers, so the field stays
//              catchable (drama) without pulling the legitimate winner into the
//              pack and without fighting the P-controller. Eligibility is gap-based
//              (myGap > brakeThreshold), NOT "is leader" — so braking two breakaway
//              racers does not just shift the runaway to the new 2nd place.
//
//              The brake is a stable negative-feedback attractor: braking a racer
//              shrinks the very gap that triggered it, so it settles at the gap
//              ceiling. No phase-dependent term — the hard-off at
//              rubberBandEndgameThreshold releases the brake for a clean controller
//              window at the finish (under band-reach fairness an in-band swap is
//              fair, so no inversion-prevention / ceiling-widening is needed).
// ============================================================

import { easeInOutCubic } from '../utils/mathUtils.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Median of non-finished racers' RAW cumulative-t.
 *
 * CRITICAL: raw cumulative-t, NOT tPos / ((t % 1) + 1) % 1. tPos is for overlap
 * proximity; the rubber-band measures race-DISTANCE lead, so a racer a full lap
 * ahead must show a large positive gap. Do not "normalize" this with tPos.
 *
 * @param {Array<{t:number, finished:boolean}>} racers
 * @returns {number|null} median raw-t, or null if no non-finished racers
 */
export function computeMedianT(racers) {
  const ts = [];
  for (const r of racers) if (!r.finished) ts.push(r.t);
  if (ts.length === 0) return null;
  ts.sort((a, b) => a - b);
  const n = ts.length;
  // Mean of the two central order-statistics for even N, single middle for odd N.
  return n % 2 ? ts[(n - 1) / 2] : (ts[n / 2 - 1] + ts[n / 2]) / 2;
}

/**
 * Proportional brake target for a racer at gap `myGap` ahead of the field median.
 * Continuous, monotonic non-increasing, clamp-capped at [1 - maxBrake, 1].
 *   - myGap <= brakeThreshold              → 1.0 (no brake; soft, no discontinuity)
 *   - myGap == brakeThreshold + gapScale   → 1 - maxBrake (full)
 *   - myGap >> threshold                   → clamped at 1 - maxBrake (no overshoot)
 *
 * @param {number} myGap  (r.t - medianT) / finishT
 * @param {{brakeThreshold:number, gapScale:number, maxBrake:number}} cfg
 * @returns {number} rubberBandMult target in [1 - maxBrake, 1]
 */
export function rubberBandTargetMult(myGap, cfg) {
  const ramp = clamp((myGap - cfg.brakeThreshold) / cfg.gapScale, 0, 1);
  return 1 - cfg.maxBrake * ramp;
}

/**
 * Apply the rubber-band brake to every racer for one physics step, mutating
 * r.rubberBandMult (smoothed toward target by the easeInOutCubic temporal ramp).
 * Caller multiplies r.rubberBandMult into the t-advance.
 *
 * Hard-off: above rubberBandEndgameThreshold (leader progress) all targets release
 * to 1.0 so the controller gets a clean final window. When cfg.enabled is false the
 * function is a no-op (rubberBandMult stays at its initialized 1.0).
 *
 * @param {Array} racers   live racer objects with .t/.finished + rubberBandMult* state
 * @param {number} finishT
 * @param {number} nowMs   physics timestamp (ms) for the temporal ramp
 * @param {object} cfg     { enabled, brakeThreshold, gapScale, maxBrake, boostRampMs, rubberBandEndgameThreshold }
 * @param {number} [surgeExemptStrength] 0 = surgers fully braked (default, no behaviour change);
 *                                        1 = surgers fully exempt from the rubber-band brake.
 *                                        Only affects racers currently surging (pulkSurgeMult > 1).
 * @param {number} [sharedMedianT] field median for this step, precomputed once and shared with
 *   the governor (A5 — avoids a second sort/step). Omit → computed internally (byte-identical).
 */
export function applyRubberBand(
  racers,
  finishT,
  nowMs,
  cfg,
  surgeExemptStrength = 0,
  sharedMedianT
) {
  if (!cfg || !cfg.enabled) return;

  let leaderT = -Infinity;
  for (const r of racers) if (!r.finished && r.t > leaderT) leaderT = r.t;
  const leaderProgress = leaderT > -Infinity && finishT > 0 ? leaderT / finishT : 0;

  // braking window: active until the leader crosses the hard-off point.
  const braking = leaderT > 0 && leaderProgress < cfg.rubberBandEndgameThreshold;
  // Reuse the shared per-step median when provided (A5), else compute it here (byte-identical).
  const medianT = braking
    ? sharedMedianT !== undefined
      ? sharedMedianT
      : computeMedianT(racers)
    : null;

  for (const r of racers) {
    if (r.finished) {
      r.rubberBandMult = 1.0;
      continue;
    }
    let target = 1.0;
    if (braking && medianT !== null && finishT > 0) {
      const myGap = (r.t - medianT) / finishT;
      if (myGap > cfg.brakeThreshold) target = rubberBandTargetMult(myGap, cfg);
    }
    // Partial brake exemption for surgers: blend the brake target toward 1.0 (no brake) by
    // surgeExemptStrength. At 0 the target is unchanged; at 1.0 the surger is fully exempt.
    // The surge pass (racePlanner update) runs before this in the loop, so pulkSurgeMult is set.
    if (surgeExemptStrength > 0 && (r.pulkSurgeMult ?? 1.0) > 1.0001) {
      target = 1 - (1 - target) * (1 - surgeExemptStrength);
    }
    if (Math.abs(target - r.rubberBandMultTarget) > 0.001) {
      r.rubberBandMultPrev = r.rubberBandMult;
      r.rubberBandMultTarget = target;
      r.rubberBandTransStart = nowMs;
    }
    const elapsed = nowMs - r.rubberBandTransStart;
    r.rubberBandMult =
      elapsed < cfg.boostRampMs
        ? r.rubberBandMultPrev +
          (r.rubberBandMultTarget - r.rubberBandMultPrev) *
            easeInOutCubic(elapsed / cfg.boostRampMs)
        : r.rubberBandMultTarget;
  }
}
