// ============================================================
// File:        transitionDecision.test.js
// Project:     RaceArena — CAMERA-ANCHOR-TRUTH-1
//
// These tests exist because CAMERA-HYGIENE-1 §5.7 listed the state machine's trigger reasons as
// protected by CONVENTION only. Before this block the reason a transition fired was control flow and
// could not be asserted; now it is a return value and every one of the five reasons plus the hold
// gate is pinned here.
//
// PRECEDENCE is behaviour, not style — the original OR-ed these in a fixed order and the first match
// won, so the ordering tests below are as load-bearing as the individual ones.
// ============================================================

import { describe, it, expect } from 'vitest';
import { decideTransition, TRANSITION_ACTION, TRANSITION_REASON } from './transitionDecision.js';

/** A frame on which nothing should happen: held, no bypass, no battle, no lead change. */
const held = (over = {}) => ({
  inBattleZoom: false,
  inLeaderZoom: false,
  stateAge: 100,
  battleMinDurationMs: 1000,
  holdGate: 2000,
  originalGroupStillValid: true,
  battleGroupP2Drifted: false,
  leadChangePending: false,
  finishDramaExpired: false,
  forceFinishDrama: false,
  photoFinishGateReady: false,
  photoFinishEndReady: false,
  ...over,
});

describe('decideTransition — the five reasons and the hold gate', () => {
  it('holds when nothing fires', () => {
    expect(decideTransition(held())).toEqual({
      action: TRANSITION_ACTION.NONE,
      reason: TRANSITION_REASON.HELD,
    });
  });

  it('reason 1: BATTLE exits when the original group disperses, after battleMinDurationMs', () => {
    const d = decideTransition(
      held({ inBattleZoom: true, stateAge: 1500, originalGroupStillValid: false })
    );
    expect(d).toEqual({
      action: TRANSITION_ACTION.EXIT_BATTLE,
      reason: TRANSITION_REASON.BATTLE_GROUP_DISPERSED,
    });
  });

  it('reason 1 is gated by battleMinDurationMs — a dispersed group before it does NOT exit', () => {
    const d = decideTransition(
      held({ inBattleZoom: true, stateAge: 999, originalGroupStillValid: false })
    );
    expect(d.action).toBe(TRANSITION_ACTION.NONE);
  });

  it('reason 2: BATTLE exits on P2 drift, after battleMinDurationMs', () => {
    const d = decideTransition(
      held({ inBattleZoom: true, stateAge: 1500, battleGroupP2Drifted: true })
    );
    expect(d).toEqual({
      action: TRANSITION_ACTION.EXIT_BATTLE,
      reason: TRANSITION_REASON.BATTLE_GROUP_P2_DRIFT,
    });
  });

  it('reason 2 is gated by battleMinDurationMs too', () => {
    const d = decideTransition(
      held({ inBattleZoom: true, stateAge: 999, battleGroupP2Drifted: true })
    );
    expect(d.action).toBe(TRANSITION_ACTION.NONE);
  });

  it('reason 3: LEAD_CHANGE interrupts LEADER_ZOOM immediately, with no hold requirement', () => {
    const d = decideTransition(
      held({ inLeaderZoom: true, leadChangePending: true, stateAge: 0, holdGate: 99999 })
    );
    expect(d).toEqual({
      action: TRANSITION_ACTION.TRANSITION,
      reason: TRANSITION_REASON.LEAD_CHANGE_INTERRUPT,
    });
  });

  it('reason 3 requires LEADER_ZOOM — a pending lead change in another state does not interrupt', () => {
    const d = decideTransition(held({ inLeaderZoom: false, leadChangePending: true }));
    expect(d.action).toBe(TRANSITION_ACTION.NONE);
  });

  it('the hold gate: transitions once stateAge reaches holdGate', () => {
    expect(decideTransition(held({ stateAge: 2000, holdGate: 2000 })).reason).toBe(
      TRANSITION_REASON.HOLD_ELAPSED
    );
    expect(decideTransition(held({ stateAge: 1999, holdGate: 2000 })).reason).toBe(
      TRANSITION_REASON.HELD
    );
  });

  it('the hold gate at 0 (same-state repeat) fires every frame', () => {
    expect(decideTransition(held({ stateAge: 0, holdGate: 0 })).reason).toBe(
      TRANSITION_REASON.HOLD_ELAPSED
    );
  });

  it('reason 4: finish-drama expiry bypasses the hold gate', () => {
    const d = decideTransition(held({ finishDramaExpired: true }));
    expect(d).toEqual({
      action: TRANSITION_ACTION.TRANSITION,
      reason: TRANSITION_REASON.FINISH_DRAMA_EXPIRED,
    });
  });

  it('reason 4: forced finish drama bypasses the hold gate', () => {
    expect(decideTransition(held({ forceFinishDrama: true })).reason).toBe(
      TRANSITION_REASON.FINISH_DRAMA_FORCED
    );
  });

  it('reason 5: the predictive photo-finish gate bypasses the hold gate', () => {
    expect(decideTransition(held({ photoFinishGateReady: true })).reason).toBe(
      TRANSITION_REASON.PHOTO_FINISH_GATE
    );
  });

  it('reason 5: photo-finish end bypasses the hold gate', () => {
    expect(decideTransition(held({ photoFinishEndReady: true })).reason).toBe(
      TRANSITION_REASON.PHOTO_FINISH_END
    );
  });
});

describe('decideTransition — precedence is behaviour', () => {
  it('a dispersed battle group outranks P2 drift', () => {
    const d = decideTransition(
      held({
        inBattleZoom: true,
        stateAge: 1500,
        originalGroupStillValid: false,
        battleGroupP2Drifted: true,
      })
    );
    expect(d.reason).toBe(TRANSITION_REASON.BATTLE_GROUP_DISPERSED);
  });

  it('a battle exit outranks the hold gate — it is an EXIT_BATTLE, not a plain transition', () => {
    const d = decideTransition(
      held({
        inBattleZoom: true,
        stateAge: 5000,
        holdGate: 2000,
        originalGroupStillValid: false,
      })
    );
    expect(d.action).toBe(TRANSITION_ACTION.EXIT_BATTLE);
  });

  it('the lead-change interrupt outranks the hold gate and every bypass', () => {
    const d = decideTransition(
      held({
        inLeaderZoom: true,
        leadChangePending: true,
        stateAge: 5000,
        holdGate: 2000,
        finishDramaExpired: true,
        forceFinishDrama: true,
        photoFinishGateReady: true,
        photoFinishEndReady: true,
      })
    );
    expect(d.reason).toBe(TRANSITION_REASON.LEAD_CHANGE_INTERRUPT);
  });

  it('hold-elapsed outranks the four bypasses when all are true', () => {
    const d = decideTransition(
      held({
        stateAge: 5000,
        holdGate: 2000,
        finishDramaExpired: true,
        forceFinishDrama: true,
        photoFinishGateReady: true,
        photoFinishEndReady: true,
      })
    );
    expect(d.reason).toBe(TRANSITION_REASON.HOLD_ELAPSED);
  });

  it('the bypasses rank expired > forced > gate > end', () => {
    expect(
      decideTransition(
        held({
          finishDramaExpired: true,
          forceFinishDrama: true,
          photoFinishGateReady: true,
          photoFinishEndReady: true,
        })
      ).reason
    ).toBe(TRANSITION_REASON.FINISH_DRAMA_EXPIRED);
    expect(
      decideTransition(
        held({ forceFinishDrama: true, photoFinishGateReady: true, photoFinishEndReady: true })
      ).reason
    ).toBe(TRANSITION_REASON.FINISH_DRAMA_FORCED);
    expect(
      decideTransition(held({ photoFinishGateReady: true, photoFinishEndReady: true })).reason
    ).toBe(TRANSITION_REASON.PHOTO_FINISH_GATE);
  });
});
