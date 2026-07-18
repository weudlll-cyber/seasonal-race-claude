// ============================================================
// raceStep.js — the ONE per-frame t-update, imported by BOTH the browser race
// loop (screens/RaceScreen/index.jsx) AND the fairness sim (scripts/sim-fairness.mjs).
//
// WHY THIS FILE EXISTS
// Before this module the advance formula lived inline in two places. The factor
// NAMES matched, but the sim NEVER applied `rowEnvMult` (it lived behind a
// dormant CLI experiment that defaulted to 1.0) and the sim did NOT apply the
// finish clamp. The browser applied both. That was a live divergence: under
// choreo-OFF the browser slows back-row racers through the PULK window and the sim
// did not. One formula in one file, imported by both, makes the divergence
// impossible rather than merely monitored.
//
// rowEnvMult — the start-row speed-bonus PHASE ENVELOPE.
//   `baseSpeed` bakes in the FULL start-row bonus (= 1 + rawRowBonus). This
//   envelope corrects that to the per-phase strength s (EARLY / PULK / POST):
//     effective bonus = 1 + rawRowBonus·s  →  envMult = (1 + rawRowBonus·s)/(1 + rawRowBonus)
//   The phase boundaries (chaosEnd = pulkStart, pulkEnd) are the LIVE plan
//   fractions passed in by the caller — NEVER a literal, NEVER a stale constant.
//   When the plan's PULK window has zero width (the choreo case, pulkStart == pulkEnd)
//   only the EARLY and POST arms are reachable; with the shipped strengths
//   (early = post = 1) the envelope is identically 1.0 there.
//
// dt — the per-frame time factor. Exactly 1.0 in the browser's fixed timestep
//   (FIXED_DT/16) and in the sim (DT/16 = 16/16). Kept as an EXPLICIT parameter
//   with a default of 1.0 so neither side hides it.
//
// The finish clamp (Math.min(..., finishT + 0.001)) is applied here, so a racer
// never advances past the finish line by more than an epsilon.
// ============================================================

import { easeInOutCubic } from '../utils/mathUtils.js';

/**
 * Start-row speed-bonus phase envelope for one racer at one frame. Pure.
 * Single source of truth for the formula — the browser's `vt` velocity factor
 * calls this too, so it can never drift from the t-update.
 *
 * @param {number} rawRowBonus  the racer's raw start-row bonus (0 → no bonus)
 * @param {number} raceProgress monotonic leader progress in [0,1]
 * @param {{enabled:boolean, chaosEndFrac:number, pulkEndFrac:number,
 *          early:number, pulk:number, post:number}} phase
 *          phase-split config: `enabled` = phaseSplitBonusEnabled; the two
 *          fractions are the LIVE plan pulkStart / pulkEnd; early/pulk/post are
 *          the per-phase bonus strengths (1 = full, 0 = off).
 * @returns {number} multiplicative envelope (1.0 when disabled / no bonus)
 */
export function computeRowEnvMult(rawRowBonus, raceProgress, phase) {
  if (!phase.enabled || !(rawRowBonus > 0)) return 1.0;
  const s =
    raceProgress < phase.chaosEndFrac
      ? phase.early
      : raceProgress < phase.pulkEndFrac
        ? phase.pulk
        : phase.post;
  return (1 + rawRowBonus * s) / (1 + rawRowBonus);
}

/**
 * Eased rowEnvMult for one racer. Smooths the rowEnvMult STEP at a phase boundary
 * (the PULK→OUTCOME kink) over `durMs` with easeInOutCubic — the SAME easing pattern
 * trajectoryMult already uses in both callers. Stateful: stashes private
 * _rowEnvSm/_rowEnvFrom/_rowEnvTransStart/_rowEnvTgtPrev on the racer and re-arms a
 * transition whenever the target steps. OPT-IN: the caller only calls this when its
 * phase config has `smooth === true`; when off, the caller passes the raw
 * computeRowEnvMult value and these fields are never touched → byte-identical.
 *
 * @param {object} racer  the racer (mutated: private _rowEnv* fields only)
 * @param {number} target the instantaneous computeRowEnvMult value to ease toward
 * @param {number} nowMs  the frame clock (browser physicsTs / sim raceTs)
 * @param {number} durMs  transition duration in ms (default 1000 = 1s, like trajectoryMult)
 * @returns {number} the eased multiplier
 */
export function computeRowEnvSmoothed(racer, target, nowMs, durMs = 1000) {
  if (racer._rowEnvSm === undefined) {
    racer._rowEnvSm = target;
    racer._rowEnvTgtPrev = target;
    return target;
  }
  if (target !== racer._rowEnvTgtPrev) {
    racer._rowEnvFrom = racer._rowEnvSm;
    racer._rowEnvTransStart = nowMs;
    racer._rowEnvTgtPrev = target;
  }
  // No transition armed yet (target unchanged since init) → hold at target. Guards against reading an
  // undefined `_rowEnvFrom` (which would NaN the multiplier) before the first boundary step.
  if (racer._rowEnvTransStart === undefined) {
    racer._rowEnvSm = target;
    return target;
  }
  const el = nowMs - racer._rowEnvTransStart;
  const sm =
    el < durMs
      ? racer._rowEnvFrom + (target - racer._rowEnvFrom) * easeInOutCubic(el / durMs)
      : target;
  racer._rowEnvSm = sm;
  return sm;
}

/**
 * Advance one racer's t by a single frame. Pure — reads the racer's per-frame
 * factors and returns the new t; writes nothing.
 *
 * Multiplication order is fixed to match the historical inline expressions
 * byte-for-byte:
 *   baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult · dt
 *
 * @param {{t:number, baseSpeed:number, trajectoryMult:number, areaBonusMult:number,
 *          governorMult?:number, rawRowBonus:number}} racer
 * @param {{boost:number, brake:number, raceProgress:number, finishT:number,
 *          dt?:number, phase:object}} f  per-frame inputs; `phase` is passed
 *          straight to computeRowEnvMult; `dt` defaults to 1.0.
 * @returns {number} the new (finish-clamped) t
 */
export function advanceRacerT(racer, f) {
  const dt = f.dt ?? 1.0;
  // `f.rowEnvMult` is an optional pre-computed override (the caller may have eased it via
  // computeRowEnvSmoothed). Absent → compute the raw step here, exactly as before (byte-identical).
  const rowEnvMult =
    f.rowEnvMult !== undefined
      ? f.rowEnvMult
      : computeRowEnvMult(racer.rawRowBonus, f.raceProgress, f.phase);
  const advanced =
    racer.t +
    racer.baseSpeed *
      f.boost *
      f.brake *
      rowEnvMult *
      racer.trajectoryMult *
      racer.areaBonusMult *
      (racer.governorMult ?? 1.0) *
      dt;
  return Math.min(advanced, f.finishT + 0.001);
}
