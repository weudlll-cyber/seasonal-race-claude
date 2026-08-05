// ============================================================
// File:        transitionDecision.js
// Path:        client/src/modules/camera/transitionDecision.js
// Project:     RaceArena — CAMERA-ANCHOR-TRUTH-1
//
// WHAT THIS IS FOR: deciding WHETHER the camera changes state this frame, and saying WHY in a value
// a test can read. It is the first ~85 lines of `update()` turned from five OR-ed conditions into
// one function with a machine-readable answer. CAMERA-HYGIENE-1 §5.7 listed "the trigger reasons of
// the state machine" as protected by CONVENTION only — nothing could assert why a transition fired,
// because the reason existed only as control flow. A reason that is a return value can be asserted.
//
// WHAT IT IS NOT FOR: performing the transition. It assigns nothing, touches no `this`, and knows
// nothing about zoom, targets or the frame. The call site keeps ownership of every action and of
// every assignment — that separation is the whole point, not a side effect of the extraction.
//
// WHY THE TRANSITION MACHINERY IS NOT HERE: `_transition()` and `_exitBattle()` stay in the
// director. CAMERA-HYGIENE-2 rejected that seam and the argument still holds — their correctness IS
// an ordering, and a file boundary would hide it. This module decides; it does not act.
//
// WHERE THE FINISH WENT (FINISH-SEAM-1): the photo-finish gate predicate used to live here, which
// put half the finish sequence in the transition file and the other half in the director. All of it
// is in finishPhase.js now — the gate, the phase decision and the three bypasses fed into
// `decideTransition` below. This file keeps only the question it is named for: does the camera
// change state this frame?
//
// PRECEDENCE IS THE BEHAVIOUR. The five reasons were OR-ed in a fixed order and the first match won.
// That order is reproduced exactly below, so this function is a restatement and not a redesign:
//   1. battle group dispersed      2. battle group P2 drift      3. lead-change interrupt
//   4. hold elapsed / finish-drama expired / finish-drama forced / photo-finish gate / photo-finish end
// ============================================================

/** What the call site should do. */
export const TRANSITION_ACTION = {
  NONE: 'none',
  EXIT_BATTLE: 'exit-battle',
  TRANSITION: 'transition',
};

/** Why it should do it. One per OR-ed condition in the original `update()`. */
export const TRANSITION_REASON = {
  HELD: 'held',
  BATTLE_GROUP_DISPERSED: 'battle-group-dispersed',
  BATTLE_GROUP_P2_DRIFT: 'battle-group-p2-drift',
  LEAD_CHANGE_INTERRUPT: 'lead-change-interrupt',
  HOLD_ELAPSED: 'hold-elapsed',
  FINISH_DRAMA_EXPIRED: 'finish-drama-expired',
  FINISH_DRAMA_FORCED: 'finish-drama-forced',
  PHOTO_FINISH_GATE: 'photo-finish-gate',
  PHOTO_FINISH_END: 'photo-finish-end',
};

/**
 * Decide whether the camera transitions this frame, and why.
 *
 * Takes DERIVED FLAGS, not the director: `inBattleZoom`/`inLeaderZoom` rather than a state enum, so
 * this file needs no import from CameraDirector.js (which would be circular — CAM_STATE lives
 * there) and so the decision is testable without naming states.
 *
 * @returns {{action: string, reason: string}} action from TRANSITION_ACTION, reason from TRANSITION_REASON.
 */
export function decideTransition({
  inBattleZoom,
  inLeaderZoom,
  stateAge,
  battleMinDurationMs,
  holdGate,
  originalGroupStillValid,
  battleGroupP2Drifted,
  leadChangePending,
  finishDramaExpired,
  forceFinishDrama,
  photoFinishGateReady,
  photoFinishEndReady,
}) {
  // 1. Early BATTLE exit: the original group dispersed after battleMinDurationMs.
  if (inBattleZoom && stateAge >= battleMinDurationMs && !originalGroupStillValid) {
    return {
      action: TRANSITION_ACTION.EXIT_BATTLE,
      reason: TRANSITION_REASON.BATTLE_GROUP_DISPERSED,
    };
  }
  // 2. P2-drift exit: a locked group member moved into P1/P2 — exit after minHold (no hard-cut).
  if (inBattleZoom && stateAge >= battleMinDurationMs && battleGroupP2Drifted) {
    return {
      action: TRANSITION_ACTION.EXIT_BATTLE,
      reason: TRANSITION_REASON.BATTLE_GROUP_P2_DRIFT,
    };
  }
  // 3. Early LEAD_CHANGE interrupt: confirmed leader change while in LEADER_ZOOM.
  if (inLeaderZoom && leadChangePending) {
    return {
      action: TRANSITION_ACTION.TRANSITION,
      reason: TRANSITION_REASON.LEAD_CHANGE_INTERRUPT,
    };
  }
  // 4. The hold gate and its four bypasses, in the order they were OR-ed.
  if (stateAge >= holdGate) {
    return { action: TRANSITION_ACTION.TRANSITION, reason: TRANSITION_REASON.HOLD_ELAPSED };
  }
  if (finishDramaExpired) {
    return { action: TRANSITION_ACTION.TRANSITION, reason: TRANSITION_REASON.FINISH_DRAMA_EXPIRED };
  }
  if (forceFinishDrama) {
    return { action: TRANSITION_ACTION.TRANSITION, reason: TRANSITION_REASON.FINISH_DRAMA_FORCED };
  }
  if (photoFinishGateReady) {
    return { action: TRANSITION_ACTION.TRANSITION, reason: TRANSITION_REASON.PHOTO_FINISH_GATE };
  }
  if (photoFinishEndReady) {
    return { action: TRANSITION_ACTION.TRANSITION, reason: TRANSITION_REASON.PHOTO_FINISH_END };
  }
  return { action: TRANSITION_ACTION.NONE, reason: TRANSITION_REASON.HELD };
}
