// ============================================================
// File:        endingSchedule.js
// Path:        client/src/screens/RaceScreen/endingSchedule.js
// Project:     RaceArena — ENDING-HOLD-1
//
// THE ARITHMETIC OF THE ENDING, in one place, so the Dev Screen's read-only total and the race
// screen's timers can never disagree about how long the ending is. Before this the total existed
// only as a number a reader added up by hand from four sliders in two cards.
//
// PURE: no config reading, no clock, no DOM. Callers hand in the resolved values.
// ============================================================

import { DEFAULT_CAMERA_CONFIG } from '../../modules/storage/defaults.js';

/**
 * How long the settled finish picture is HELD after the last racer is home, before `finishPauseMs`
 * starts running.
 *
 * A non-finite or negative value from a hand-edited config reads as 0 — which is also the shipped
 * default, so the safe failure and the default behaviour are the same thing.
 */
export function endingHoldMs(raw) {
  const v = raw ?? DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs;
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * The whole ending, from the LAST racer crossing to the result screen being settled — the number the
 * Dev Screen shows read-only.
 *
 * The terms, in the order they happen:
 *   hold          the settled finish picture, ENDING-HOLD-1 (0 by default)
 *   pause         `finishPauseMs`, which the winner card is a tenant of
 *   transition    the fade to black between screens — a CONSTANT in TransitionContext.jsx, not a key
 *   podium        the result screen's build-up, `4 x podiumRevealBeatMs`
 *
 * `transitionMs` is a parameter rather than a config read because it is NOT configurable: it is 320
 * ms of `setTimeout` in `TransitionContext.jsx` plus a 50 ms settle. Passing it keeps this function
 * pure and keeps the fact that it is a constant visible at every call site.
 */
export function endingTotalMs({ holdMs, pauseMs, podiumBeatMs, transitionMs }) {
  const hold = endingHoldMs(holdMs);
  const pause = Number.isFinite(pauseMs) && pauseMs > 0 ? pauseMs : 0;
  const podium = Number.isFinite(podiumBeatMs) && podiumBeatMs > 0 ? 4 * podiumBeatMs : 0;
  const transition = Number.isFinite(transitionMs) && transitionMs > 0 ? transitionMs : 0;
  return hold + pause + transition + podium;
}

/** The screen transition, which is a constant and not a key. See `endingTotalMs`. */
export const SCREEN_TRANSITION_MS = 370;
