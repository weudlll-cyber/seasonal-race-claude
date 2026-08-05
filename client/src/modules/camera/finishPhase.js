// ============================================================
// File:        finishPhase.js
// Path:        client/src/modules/camera/finishPhase.js
// Project:     RaceArena — FINISH-SEAM-1
//
// WHAT THIS IS FOR: saying HOW A RACE ENDS, in one place, as values a test can read. The end of a
// race was a sequence that existed only as five latches and three if-chains split across two
// methods of CameraDirector.js — you could execute it but you could not state it. This file states
// it. A later change to the finish sequence is a change here plus the assignments at the call site,
// not an archaeology exercise.
//
// THE SEQUENCE, in the order it happens:
//   APPROACH   the leader is nearly home and nobody has crossed. One question is asked, exactly
//              once: are the top two close enough to be worth a photo finish? (evaluatePhotoFinishGate)
//   THE MOMENT one of two shots, never both:
//                PHOTO FINISH — the tight top-2 shot. Two doors lead into it: the APPROACH gate
//                               (pre-line, predictive) and the first crossing (reactive fallback,
//                               fires only when the gate did not). Same shot, same exit.
//                DRAMA        — the classic single-winner pulse on the leader, finishDramaDurationMs long.
//   THE PAUSE  both shots then HOLD for `finishDramaDurationMs` before the zoom-out — the drama
//              from the moment the winner crosses, the photo finish from the moment BOTH ITS
//              CONTENDERS are home (FINISH-WINDOW-1; the owner's words were "the pause only starts
//              running once the triggers of the photo finish are home"). One dial for both, and a
//              value of 0 means no held frame at all on either path.
//   AFTERMATH  FINISH_OVERVIEW. Absolute: once entered, no further camera state is chosen.
//
// WHAT IT IS NOT FOR: performing any of it. Every function here is pure. It assigns nothing,
// touches no `this`, and names no camera state (CAM_STATE lives in CameraDirector.js, so naming it
// would be circular). The ACTION implies the state and the call site maps it — the same separation
// transitionDecision.js keeps, and for the same reason: the decision is testable, the latch writes
// stay with the object that owns them.
//
// WHY THE LATCHES ARE NOT HERE. `_photoFinishGateDone` and `_photoFinishEnterPending` are written
// DURING evaluation, which is exactly what a pure function must not do. The split is honest rather
// than cosmetic: everything here is a question, and each latch write is keyed off a returned value
// with an exact mapping (see each function's contract). Nothing here remembers anything.
//
// WHAT IS DELIBERATELY LEFT BEHIND: `_inFinishMode` FRAMES as well as decides. It is an INPUT here
// (the absolute lock, and one bypass) and the two END actions tell the caller to set it — but its
// five framing reads (the OVERVIEW zoom-out ease, the lookback anchor, the T-lerp suppression, the
// grammar exemption) stay in CameraDirector.js untouched. Framing is what the owner's eye judges;
// this file does not move it. See reports/evolution/FINISH-SEAM-1.md.
// ============================================================

import { shortestArcDeltaT } from '../../utils/mathUtils.js';

/** What the call site should do about the finish this frame. */
export const FINISH_ACTION = {
  /** No finish phase is running — fall through to the normal priority chain. */
  NONE: 'none',
  /** A finish phase IS running but wants no state change — suppress the transition entirely. */
  HOLD: 'hold',
  /** Enter the photo-finish shot. */
  ENTER_PHOTO_FINISH: 'enter-photo-finish',
  /** Enter the single-winner drama pulse. */
  ENTER_DRAMA: 'enter-drama',
  /**
   * The photo-finish contenders are home: hold the shot for the pause, THEN hand off.
   * The call site stays on the same camera state, so this is a pause, not a cut.
   */
  PAUSE_AFTER_PHOTO_FINISH: 'pause-after-photo-finish',
  /** Leave the photo finish for FINISH_OVERVIEW. */
  END_PHOTO_FINISH: 'end-photo-finish',
  /** Leave the drama pulse for FINISH_OVERVIEW. */
  END_DRAMA: 'end-drama',
};

/** WHY. One per branch of the sequence, so every step of the ending can be asserted by name. */
export const FINISH_REASON = {
  /** Nothing about the finish applies this frame. */
  NOT_FINISHING: 'not-finishing',
  /** The photo-finish shot holds — no other transition may fire. */
  PHOTO_FINISH_HOLDS: 'photo-finish-holds',
  /** The contenders are home (or every racer is): the photo finish is over. */
  PHOTO_FINISH_END: 'photo-finish-end',
  /** The contenders are home and a pause is configured: hold the shot before handing off. */
  PHOTO_FINISH_PAUSE: 'photo-finish-pause',
  /** The pause is set to zero, so the aftermath begins immediately with no pulse at all. */
  PAUSE_DISABLED: 'pause-disabled',
  /** The pre-line gate said the top two were close; the entry was pending and is now taken. */
  PHOTO_FINISH_PRE_LINE: 'photo-finish-pre-line',
  /** No pre-line entry happened and the top two crossed together — the reactive fallback. */
  PHOTO_FINISH_FIRST_CROSSING: 'photo-finish-first-crossing',
  /** First crossing, not a close finish: the classic single-winner pulse. */
  DRAMA_FIRST_CROSSING: 'drama-first-crossing',
  /** The drama pulse is still inside its window. */
  DRAMA_HOLDS: 'drama-holds',
  /** The drama window elapsed. */
  DRAMA_EXPIRED: 'drama-expired',
  /** FINISH_OVERVIEW has begun and is absolute. */
  FINISH_MODE_LOCKED: 'finish-mode-locked',
};

/**
 * The human sentence for the dev console, per reason. Kept HERE rather than at the call site so the
 * file that says how a race ends also says what it says about itself. These strings are the ones
 * `_pickNextState` returned before this file existed, verbatim — the `[CAMERA]` diagnostic line is
 * unchanged.
 */
const FINISH_TEXT = {
  [FINISH_REASON.PHOTO_FINISH_END]:
    'photo-finish: end (contenders home / all finished) → FINISH_OVERVIEW',
  [FINISH_REASON.PHOTO_FINISH_PAUSE]:
    'photo-finish: contenders home → pause before FINISH_OVERVIEW',
  [FINISH_REASON.PAUSE_DISABLED]: 'finish: pause is 0 → FINISH_OVERVIEW immediately',
  [FINISH_REASON.PHOTO_FINISH_PRE_LINE]: 'photo-finish: pre-line gate (top-2 close)',
  [FINISH_REASON.PHOTO_FINISH_FIRST_CROSSING]: 'finish: photo-finish (top-2 close)',
  [FINISH_REASON.DRAMA_FIRST_CROSSING]: 'finish: drama pulse on first finish',
  [FINISH_REASON.DRAMA_EXPIRED]: 'finish: drama expired → FINISH_OVERVIEW',
};

const decision = (action, reason) => ({ action, reason, text: FINISH_TEXT[reason] ?? reason });

/**
 * THE SEQUENCE. Given where the finish currently stands, what happens next and why.
 *
 * PRECEDENCE IS THE BEHAVIOUR, and it is reproduced here exactly as the three priority blocks it
 * replaces were ordered — first match wins:
 *   1. the photo-finish shot, once entered, OWNS the state until its event-driven end
 *   2. somebody has crossed: FINISH_OVERVIEW lock, else the first-crossing fork, else the drama window
 *   3. a pending pre-line entry is taken
 * The order matters in one specific way that is easy to get wrong: block 1 sits ABOVE block 2, so a
 * photo finish entered BEFORE the line is not interrupted by the crossing it was waiting for. That
 * hoist is why the drama and the photo finish can never both run in one race.
 *
 * THERE IS NO WALL-CLOCK CAP ON THE PHOTO FINISH, deliberately. Under the photo-finish slow-motion a
 * wall-time timer expired during the approach, BEFORE the winner crossed, which ended the shot early
 * and ate the winner text. The shot ends on crossings only.
 *
 * @param {object}      p
 * @param {boolean}     p.inPhotoFinish        the photo-finish shot is currently held
 * @param {boolean}     p.inFinishMode         FINISH_OVERVIEW has begun (absolute)
 * @param {boolean}     p.photoFinishEnterPending  the pre-line gate asked to enter and has not been consumed
 * @param {number|null} p.finishMomentExpiry   ts at which the drama window ends; null = no drama yet
 * @param {number}      p.ts                   current rAF timestamp in ms
 * @param {number}      p.finishedCount        racers across the line
 * @param {number}      p.racerCount           racers in the field
 * @param {number}      p.leaderT              track parameter of P1 (the field sorted by t desc)
 * @param {number|null} p.secondT              track parameter of P2, or null in a field of one
 * @param {boolean}     p.photoFinishEnabled
 * @param {number}      p.closeThresholdT      lap-normalised gap below which a finish is "close"
 * @returns {{action: string, reason: string, text: string}} action from FINISH_ACTION, reason from
 *   FINISH_REASON, text = the dev-console sentence for that reason.
 */
export function decideFinishPhase({
  inPhotoFinish,
  inFinishMode,
  photoFinishEnterPending,
  finishMomentExpiry,
  ts,
  finishedCount,
  racerCount,
  contendersHome,
  dramaDurationMs,
  leaderT,
  secondT,
  photoFinishEnabled,
  closeThresholdT,
}) {
  // 1. The photo-finish lifecycle guard. Hoisted above the finishedCount block so it also governs a
  //    pre-line entry while finishedCount is still 0.
  //
  //    IT ENDS WHEN THE CONTENDERS ARE HOME — the two racers the shot was actually following —
  //    not on `finishedCount >= 2`. Those are different conditions and MEASURABLY so: on all nine
  //    finishing tracks they differ by 6–57 frames, and on most of them the second racer across the
  //    line is not one of the pair at all. The old condition could therefore end the shot BEFORE the
  //    pair it exists to show had both crossed. Still crossings only — a more precise crossing —
  //    with everybody-home kept as the logical safety net for a contender who never arrives.
  if (inPhotoFinish) {
    if (contendersHome || finishedCount >= racerCount) {
      // The pause runs HERE on this path (the owner's words: "the pause only starts running once
      // the triggers of the photo finish are home"), on the same dial as the drama pulse. A pause
      // of zero is not a one-frame pause: it hands off immediately, exactly as it did before.
      return dramaDurationMs > 0
        ? decision(FINISH_ACTION.PAUSE_AFTER_PHOTO_FINISH, FINISH_REASON.PHOTO_FINISH_PAUSE)
        : decision(FINISH_ACTION.END_PHOTO_FINISH, FINISH_REASON.PHOTO_FINISH_END);
    }
    return decision(FINISH_ACTION.HOLD, FINISH_REASON.PHOTO_FINISH_HOLDS);
  }

  // 2. Somebody has crossed. Reached only when NOT already in a photo finish, so the photo finish
  //    below is a pure fallback — it fires only if the pre-line gate did not enter.
  if (finishedCount > 0) {
    if (inFinishMode) {
      return decision(FINISH_ACTION.HOLD, FINISH_REASON.FINISH_MODE_LOCKED);
    }
    if (finishMomentExpiry === null) {
      // THE FORK, and it is asked exactly once per race — the expiry latch is what makes it once.
      // Measured with the same lap-normalised helper BATTLE uses, top-2 only.
      const close =
        photoFinishEnabled &&
        racerCount >= 2 &&
        shortestArcDeltaT(leaderT, secondT) <= closeThresholdT;
      if (close) {
        return decision(
          FINISH_ACTION.ENTER_PHOTO_FINISH,
          FINISH_REASON.PHOTO_FINISH_FIRST_CROSSING
        );
      }
      // A pause of zero means no pulse at all on this path either — not a one-frame pulse. Both
      // paths read the same dial, so both must honour the same zero.
      return dramaDurationMs > 0
        ? decision(FINISH_ACTION.ENTER_DRAMA, FINISH_REASON.DRAMA_FIRST_CROSSING)
        : decision(FINISH_ACTION.END_DRAMA, FINISH_REASON.PAUSE_DISABLED);
    }
    if (ts >= finishMomentExpiry) {
      return decision(FINISH_ACTION.END_DRAMA, FINISH_REASON.DRAMA_EXPIRED);
    }
    return decision(FINISH_ACTION.HOLD, FINISH_REASON.DRAMA_HOLDS);
  }

  // 3. The one-shot pre-line entry. The gate DECISION was made in the director's update() (where the
  //    hold-gate bypasses live); here the pending flag is only consumed, so the transition is
  //    produced in the normal place. Unreachable while finishedCount > 0 — block 2 returns first —
  //    which is exactly why the flag is guaranteed consumed on the frame it is set.
  if (photoFinishEnterPending) {
    return decision(FINISH_ACTION.ENTER_PHOTO_FINISH, FINISH_REASON.PHOTO_FINISH_PRE_LINE);
  }

  return decision(FINISH_ACTION.NONE, FINISH_REASON.NOT_FINISHING);
}

/**
 * The APPROACH question, as a PREDICATE: is this going to be a photo finish?
 *
 * Asked at most once per race. The original evaluated this inline and SET TWO LATCHES while doing
 * so. Both latch writes stay at the call site, keyed off the two booleans returned: the caller sets
 * `_photoFinishGateDone` on `evaluated` and `_photoFinishEnterPending` on `close`, in that order,
 * and nothing else changes. `close` can only be true when `evaluated` is true, which is what makes
 * that mapping exact.
 *
 * @returns {{evaluated: boolean, close: boolean}} `evaluated` = the one-shot check ran this frame
 *   (the caller must latch it done); `close` = the top two are within the threshold.
 */
export function evaluatePhotoFinishGate({
  gateDone,
  enabled,
  finishedCount,
  leaderProgress,
  leadProgressThreshold,
  racers,
  closeThresholdT,
}) {
  if (gateDone || !enabled || finishedCount !== 0 || leaderProgress < leadProgressThreshold) {
    return { evaluated: false, close: false };
  }
  const ord = [...racers].sort((a, b) => b.t - a.t);
  const close = ord.length >= 2 && shortestArcDeltaT(ord[0].t, ord[1].t) <= closeThresholdT;
  return { evaluated: true, close };
}

/**
 * The three ways the finish sequence reaches the TRANSITION decision — each one a bypass of the
 * hold gate, because none of them may wait for a state's minStateHold to elapse.
 *
 * ONE OF THESE OVERLAPS ANOTHER, and it is worth knowing before changing the sequence:
 * `forceFinishDrama` is true on every frame between the FIRST and SECOND crossing of a photo
 * finish (finishedCount is 1, no drama ever started, so finishMomentExpiry is still null). It
 * therefore outranks `photoFinishEndReady` in decideTransition's precedence and the recorded
 * transition reason reads FINISH_DRAMA_FORCED while what actually happens is the photo-finish end.
 * Harmless today — both produce a transition and decideFinishPhase then picks the right branch —
 * but it means the reason is not a reliable label during a photo finish.
 *
 * @returns {{finishDramaExpired: boolean, forceFinishDrama: boolean, photoFinishEndReady: boolean}}
 */
export function finishTransitionBypasses({
  inFinishDrama,
  inPhotoFinish,
  inFinishMode,
  finishMomentExpiry,
  ts,
  finishedCount,
  racerCount,
}) {
  return {
    // The drama pulse is exempt from minStateHoldMs: when the window expires, transition
    // immediately regardless of how long the state has been held.
    finishDramaExpired: inFinishDrama && ts >= finishMomentExpiry,
    // Force an immediate transition on first finish detection, so no state (COMEBACK, BATTLE, ...)
    // can block the drama pulse from starting.
    forceFinishDrama: finishedCount > 0 && !inFinishMode && finishMomentExpiry === null,
    // The photo finish's event-driven end, mirroring decideFinishPhase's block 1.
    photoFinishEndReady: inPhotoFinish && (finishedCount >= 2 || finishedCount >= racerCount),
  };
}
