// ============================================================
// File:        comebackPrecedence.test.js
// Path:        client/src/modules/camera/comebackPrecedence.test.js
// Project:     RaceArena — COMEBACK-PRECEDENCE-1
//
// WHAT THIS PINS: the mild precedence. When the plan has CAST a comebacker and he is climbing, the
// camera switches to him — at most ONCE per comebacker, and NEVER into a LEAD_CHANGE already on
// screen. There is no config key and no default behind any of it, so every test here is a statement
// about behaviour rather than about a value.
//
// ★ THE TWO SABOTAGE TARGETS ARE NAMED IN THE TESTS THAT CATCH THEM, because a test nobody has
// watched fail is not yet evidence:
//   (a) 'the forced shot is the CAST comebacker' — red if the precedence fires on the wrong racer;
//   (b) 'a LEAD_CHANGE already on screen is never cut into' — red if the limit is dropped.
//
// WHY THE HOLD IS ALWAYS MID-FLIGHT HERE: with `stateAge` under the gate, `decideTransition` returns
// HELD and nothing moves. So every switch these tests observe came through the precedence's own
// interrupt slot and could not have come from the ordinary hold-elapsed path.
// ============================================================

import { describe, it, expect } from 'vitest';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { decideTransition, TRANSITION_ACTION, TRANSITION_REASON } from './transitionDecision.js';

// Same reason as CameraDirector.test.js's own copy: a weight is a PROPENSITY, so a gate test that
// leaves it at 0.6 is a coin flip. These tests are about the precedence, not about the lottery.
const ALWAYS_TAKE = Object.freeze({
  battleWeight: 1,
  leadChangeWeight: 1,
  comebackWeight: 1,
  overviewWeight: 1,
});

const NOW = 40000;

// Leader at 0.80 of a finishT of 1 → progress 0.80: past `outcomePhaseThreshold` (0.75) and short of
// `endgameThreshold` (0.95), which is the window in which a comeback shot exists at all.
//
// index 2 is the racer the PLAN cast. index 3 is in the B1 roster but was NOT cast, and he is given
// the LARGER rank gain on purpose — so a precedence reading the wider fallback population would
// visibly pick him, and sabotage (a) has something to be caught by.
const RACERS = [
  { t: 0.8, x: 800, y: 300, finished: false, index: 0, name: 'Leader' },
  { t: 0.6, x: 600, y: 300, finished: false, index: 1, name: 'Second' },
  { t: 0.3, x: 300, y: 300, finished: false, index: 2, name: 'CastComebacker' },
  { t: 0.2, x: 200, y: 300, finished: false, index: 3, name: 'UncastClimber' },
];

const castPlan = () => ({
  heroes: [
    { index: 2, role: 'comebacker', finalRank: 3, beats: [] },
    { index: 3, role: 'attacker-b2', finalRank: 8, beats: [] },
  ],
});

const noCastPlan = () => ({
  heroes: [{ index: 2, role: 'sovereign-lead', finalRank: 1, beats: [] }],
});

const raceState = (over = {}) => ({
  raceElapsed: 90000,
  finishedCount: 0,
  winner: null,
  finishT: 1.0,
  isOutcomePhase: true,
  ...over,
});

/**
 * A director mid-hold in `state`, with the roster and plan delivered and a climb already in the rank
 * history for index 2 and index 3. Index 3 is given the bigger gain on purpose.
 */
function heldDirector({ state = CAM_STATE.LEADER_ZOOM, plan = castPlan(), roster = [2, 3] } = {}) {
  const cd = new CameraDirector(1280, 720, false, ALWAYS_TAKE);
  cd.updateRacePlan(new Set(roster), plan);
  cd.state = state;
  // Mid-hold: 1 s into a gate that is 8 s. Nothing may transition on the hold-elapsed path.
  cd.stateEnteredAt = NOW - 1000;
  cd._prevCommittedState = state;
  cd._activeStateMinHoldMs = null;
  const w = cd._comebackGates.windowSec * 1000;
  cd._comeback._history.set(2, [
    { ts: NOW - w + 100, rank: 12 },
    { ts: NOW - 100, rank: 3 },
  ]);
  cd._comeback._history.set(3, [
    { ts: NOW - w + 100, rank: 30 },
    { ts: NOW - 100, rank: 4 },
  ]);
  return cd;
}

describe('COMEBACK-PRECEDENCE-1 — the switch happens, and it happens mid-hold', () => {
  it('a climbing CAST comebacker takes the screen while the previous shot is still held', () => {
    const cd = heldDirector();
    cd.update(RACERS, NOW, raceState(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.COMEBACK_PRECEDENCE);
  });

  it('the same hold is NOT cut when nothing is climbing — this is a precedence, not a shortened hold', () => {
    const cd = heldDirector();
    cd._comeback._history.clear(); // no climb → no candidate → no precedence
    cd.update(RACERS, NOW, raceState(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.HELD);
  });

  // ★ SABOTAGE TARGET (a) — fire the precedence on the wrong racer and this goes red.
  it('the forced shot is the CAST comebacker, not the bigger climber the plan never named', () => {
    const cd = heldDirector();
    cd.update(RACERS, NOW, raceState(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
    expect(cd.comebackLockedRacerIndex).toBe(2);
    expect(cd.comebackLockedRacerIndex).not.toBe(3);
  });
});

describe('COMEBACK-PRECEDENCE-1 — LIMIT 1: at most once per comebacker', () => {
  it('the second climb by the same racer does not force a second shot', () => {
    const cd = heldDirector();
    cd.update(RACERS, NOW, raceState(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);

    // Leave the shot, clear the cooldown, and present exactly the same climb again.
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd.stateEnteredAt = NOW + 19000;
    cd._prevCommittedState = CAM_STATE.LEADER_ZOOM;
    cd._activeStateMinHoldMs = null;
    cd._lastComebackExitTs = -Infinity;
    const later = NOW + 20000;
    const w = cd._comebackGates.windowSec * 1000;
    cd._comeback._history.set(2, [
      { ts: later - w + 100, rank: 12 },
      { ts: later - 100, rank: 3 },
    ]);
    cd.update(RACERS, later, raceState(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.HELD);
  });

  it('the turn is spent on the COMMIT, so a race that never took the shot never burns it', () => {
    // Outcome phase closed → the offer cannot become a shot, and the turn must survive it.
    const cd = heldDirector();
    const early = RACERS.map((r) => ({ ...r, t: r.t * 0.5 }));
    cd.update(early, NOW, raceState({ isOutcomePhase: false }), 1280, 720);
    expect(cd._comebackPrecedenceShown.has(2)).toBe(false);
  });
});

describe('COMEBACK-PRECEDENCE-1 — LIMIT 2: a LEAD_CHANGE on screen is never cut into', () => {
  // ★ SABOTAGE TARGET (b) — let the precedence cut a live LEAD_CHANGE and this goes red.
  it('the same climb that forces a switch out of LEADER_ZOOM forces nothing out of LEAD_CHANGE', () => {
    const fromLeader = heldDirector({ state: CAM_STATE.LEADER_ZOOM });
    fromLeader.update(RACERS, NOW, raceState(), 1280, 720);
    expect(fromLeader.state).toBe(CAM_STATE.COMEBACK_ZOOM); // the control: it does fire

    const fromLeadChange = heldDirector({ state: CAM_STATE.LEAD_CHANGE });
    fromLeadChange.update(RACERS, NOW, raceState(), 1280, 720);
    expect(fromLeadChange.state).toBe(CAM_STATE.LEAD_CHANGE);
    expect(fromLeadChange._lastTransitionReason).toBe(TRANSITION_REASON.HELD);
    expect(fromLeadChange._comebackPrecedenceShown.has(2)).toBe(false);
  });

  it('a confirmed lead change still outranks the precedence in the decision order', () => {
    const both = decideTransition({
      inBattleZoom: false,
      inLeaderZoom: true,
      stateAge: 0,
      battleMinDurationMs: 3000,
      holdGate: 8000,
      originalGroupStillValid: true,
      battleGroupP2Drifted: false,
      leadChangePending: true,
      comebackPrecedencePending: true,
      finishDramaExpired: false,
      forceFinishDrama: false,
      photoFinishGateReady: false,
      photoFinishEndReady: false,
    });
    expect(both.reason).toBe(TRANSITION_REASON.LEAD_CHANGE_INTERRUPT);
  });

  it('the precedence slot sits above the hold gate', () => {
    const base = {
      inBattleZoom: false,
      inLeaderZoom: true,
      stateAge: 0,
      battleMinDurationMs: 3000,
      holdGate: 8000,
      originalGroupStillValid: true,
      battleGroupP2Drifted: false,
      leadChangePending: false,
      finishDramaExpired: false,
      forceFinishDrama: false,
      photoFinishGateReady: false,
      photoFinishEndReady: false,
    };
    expect(decideTransition({ ...base, comebackPrecedencePending: true })).toEqual({
      action: TRANSITION_ACTION.TRANSITION,
      reason: TRANSITION_REASON.COMEBACK_PRECEDENCE,
    });
    expect(decideTransition({ ...base, comebackPrecedencePending: false }).reason).toBe(
      TRANSITION_REASON.HELD
    );
  });
});

describe('COMEBACK-PRECEDENCE-1 — the population is the CAST, and a race with none behaves as today', () => {
  it('a race whose plan cast nobody forces nothing, even though the fallback offers a climber', () => {
    const cd = heldDirector({ plan: noCastPlan() });
    // The detector still has something to offer — `comebackDetector.js:157` falls back to `_b1`.
    expect(cd._comeback.best(RACERS, NOW, 0.8)).toBeTruthy();
    expect(cd._comeback.isCast(3)).toBe(false);
    cd.update(RACERS, NOW, raceState(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.HELD);
  });

  it("...and today's ordinary path still produces the shot once the hold has elapsed", () => {
    const cd = heldDirector({ plan: noCastPlan() });
    cd.stateEnteredAt = NOW - 30000; // hold elapsed → the ordinary weighted pool decides
    cd._overviewWeight = 0; // leave the comeback candidate alone in the pool: this is a gate test,
    // not a draw test, and OVERVIEW is otherwise eligible and wins it about half the time.
    cd.update(RACERS, NOW, raceState(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.HOLD_ELAPSED);
  });
});

describe('COMEBACK-PRECEDENCE-1 — what it may never take the screen from', () => {
  it('nothing is forced before the outcome phase opens', () => {
    const cd = heldDirector();
    const early = RACERS.map((r) => ({ ...r, t: r.t * 0.5 }));
    cd.update(early, NOW, raceState({ isOutcomePhase: false }), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._comebackPrecedenceRacer).toBeNull();
  });

  it('nothing is forced once the endgame owns the picture', () => {
    const cd = heldDirector();
    const late = RACERS.map((r) => (r.index === 0 ? { ...r, t: 0.97 } : r));
    cd.update(late, NOW, raceState(), 1280, 720);
    expect(cd.state).not.toBe(CAM_STATE.COMEBACK_ZOOM);
    expect(cd._comebackPrecedenceRacer).toBeNull();
  });

  it('nothing is forced while the finish sequence is running', () => {
    const cd = heldDirector();
    cd._inFinishMode = true;
    cd.update(RACERS, NOW, raceState(), 1280, 720);
    expect(cd._comebackPrecedenceRacer).toBeNull();
  });

  it('a comebackWeight of 0 means the state does not appear, here as everywhere', () => {
    const cd = heldDirector();
    cd._comebackWeight = 0;
    cd.update(RACERS, NOW, raceState(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._comebackPrecedenceRacer).toBeNull();
  });
});

describe('COMEBACK-PRECEDENCE-1 — the once-per-comebacker record is per RACE', () => {
  it('a new roster clears it', () => {
    const cd = heldDirector();
    cd.update(RACERS, NOW, raceState(), 1280, 720);
    expect(cd._comebackPrecedenceShown.has(2)).toBe(true);
    cd.updateRacePlan(new Set([2, 3]), castPlan());
    expect(cd._comebackPrecedenceShown.size).toBe(0);
  });
});
