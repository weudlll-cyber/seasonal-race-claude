// ============================================================
// File:        comebackCutDelay.test.js
// Path:        client/src/modules/camera/comebackCutDelay.test.js
// Project:     RaceArena — COMEBACK-CUT-DELAY-1 (2026-10-02)
// Description: The owner's decision of 2026-10-02: when the camera would cut to the comeback racer,
//              it WAITS `comebackCutDelayMs` first and keeps the shot it has, so that he is already
//              visibly on the catch-up when the comeback shot starts. The cut happens only if he is
//              still the offered comebacker and the final scene is not due; otherwise that shot is
//              dropped. The delay is READ from defaults.js, so a later move of the value cannot leave
//              these tests asserting an old number.
//
// Both routes into the shot are tested: the precedence (the cast comebacker's first shot, which
// interrupts a running hold) and the weighted offer (taken when a hold ends). Who is climbing is
// stubbed at `_detectComebackRacer`, the one read both routes share; every gate around it is real.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { TRANSITION_REASON } from './transitionDecision.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

const DELAY = DEFAULT_CAMERA_CONFIG.comebackCutDelayMs;
const ENDGAME = DEFAULT_CAMERA_CONFIG.endgameThreshold;
const NOW = 40000;

// Every shot is taken when offered — the lottery is not what these tests are about. The battle and
// overview shots are off so the only competitor is the one a test puts there on purpose.
const CFG = {
  ...DEFAULT_CAMERA_CONFIG,
  battleWeight: 0,
  overviewWeight: 0,
  leadChangeWeight: 1,
  comebackWeight: 1,
};

// Leader at 0.80: inside the outcome phase, short of the endgame. Index 2 is the cast comebacker.
const field = (leaderT) => [
  { t: leaderT, x: 800, y: 300, finished: false, index: 0, name: 'Leader' },
  { t: leaderT - 0.2, x: 600, y: 300, finished: false, index: 1, name: 'Second' },
  { t: leaderT - 0.5, x: 300, y: 300, finished: false, index: 2, name: 'Comebacker' },
];
const RACERS = field(0.8);
const rs = (over = {}) => ({
  raceElapsed: 90000,
  finishedCount: 0,
  winner: null,
  finishT: 1.0,
  isOutcomePhase: true,
  ...over,
});

/**
 * A director on the leader shot with the comebacker climbing (the detector stubbed to name him).
 * `midHold` puts it mid-hold (the precedence route) or with the hold already over (the weighted
 * route, which only runs when a hold ends); `precedenceSpent` takes the precedence out of play.
 */
function director({ midHold = true, precedenceSpent = false, delay } = {}) {
  const cd = new CameraDirector(
    1280,
    720,
    false,
    delay == null ? CFG : { ...CFG, comebackCutDelayMs: delay }
  );
  cd.updateRacePlan(new Set([2]), {
    heroes: [{ index: 2, role: 'comebacker', finalRank: 3, beats: [] }],
  });
  cd.state = CAM_STATE.LEADER_ZOOM;
  cd._prevCommittedState = CAM_STATE.LEADER_ZOOM;
  cd.stateEnteredAt = midHold ? NOW - 1000 : NOW - 60000;
  cd._activeStateMinHoldMs = null;
  cd._lastComebackExitTs = -1e9;
  if (precedenceSpent) cd._comebackPrecedenceShown.add(2);
  const detect = vi.spyOn(cd, '_detectComebackRacer').mockReturnValue(RACERS[2]);
  return { cd, detect };
}

describe('COMEBACK-CUT-DELAY-1 — the delay is the decided shape', () => {
  it('the delay READ from defaults.js is above 0 and within the decided 1–2 s', () => {
    expect(DELAY).toBeGreaterThanOrEqual(1000);
    expect(DELAY).toBeLessThanOrEqual(2000);
  });

  it('★ CONTROL: with the delay at 0 the precedence cuts on the frame it is offered (the old behaviour)', () => {
    const { cd } = director({ delay: 0 });
    cd.update(RACERS, NOW, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
  });
});

describe('COMEBACK-CUT-DELAY-1 — the precedence route', () => {
  it('NO CUT BEFORE THE DELAY: the camera keeps the leader shot until the last ms of the wait', () => {
    const { cd } = director();
    cd.update(RACERS, NOW, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._comebackDue).toMatchObject({ index: 2, since: NOW });
    cd.update(RACERS, NOW + DELAY - 1, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
  });

  it('CUT AFTER THE DELAY: on the first frame at the delay, to HIM, as the precedence', () => {
    const { cd } = director();
    cd.update(RACERS, NOW, rs(), 1280, 720);
    cd.update(RACERS, NOW + DELAY, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.COMEBACK_PRECEDENCE);
    expect(cd.comebackLockedRacerIndex).toBe(2);
    expect(cd._comebackDue).toBeNull();
  });

  it('NO SHOT IF HE IS NO LONGER CLIMBING when the delay ends — and nothing is left waiting', () => {
    const { cd, detect } = director();
    cd.update(RACERS, NOW, rs(), 1280, 720);
    detect.mockReturnValue(null);
    cd.update(RACERS, NOW + DELAY, rs(), 1280, 720);
    expect(cd.state).not.toBe(CAM_STATE.COMEBACK_ZOOM);
    expect(cd._comebackDue).toBeNull();
  });
});

describe('COMEBACK-CUT-DELAY-1 — the weighted route', () => {
  it('NO CUT BEFORE THE DELAY, CUT AFTER IT: the accepted offer waits, then is taken without a second draw', () => {
    const { cd } = director({ midHold: false, precedenceSpent: true });
    cd.update(RACERS, NOW, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    expect(cd._comebackDue).toMatchObject({ index: 2, since: NOW, route: 'pick' });
    cd.update(RACERS, NOW + DELAY - 1, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM);
    const draw = vi.spyOn(cd, '_weightedRandomPick');
    cd.update(RACERS, NOW + DELAY, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
    expect(cd.comebackLockedRacerIndex).toBe(2);
    expect(draw).not.toHaveBeenCalled();
  });
});

describe('COMEBACK-CUT-DELAY-1 — the final scene during the delay: no shot', () => {
  it('the ENDGAME arriving during the wait drops the shot, then and at the end of the wait', () => {
    const { cd } = director();
    cd.update(RACERS, NOW, rs(), 1280, 720);
    expect(cd._comebackDue).not.toBeNull();
    const late = field(ENDGAME + 0.02);
    cd.update(late, NOW + DELAY / 2, rs(), 1280, 720);
    expect(cd._comebackDue).toBeNull();
    cd.update(late, NOW + DELAY, rs(), 1280, 720);
    cd.update(late, NOW + 2 * DELAY, rs(), 1280, 720);
    expect(cd.state).not.toBe(CAM_STATE.COMEBACK_ZOOM);
  });

  it('the FIRST RACER HOME during the wait drops the shot (weighted route)', () => {
    const { cd } = director({ midHold: false, precedenceSpent: true });
    cd.update(RACERS, NOW, rs(), 1280, 720);
    expect(cd._comebackDue).not.toBeNull();
    cd.update(RACERS, NOW + DELAY / 2, rs({ finishedCount: 1 }), 1280, 720);
    expect(cd._comebackDue).toBeNull();
    cd.update(RACERS, NOW + DELAY, rs({ finishedCount: 1 }), 1280, 720);
    expect(cd.state).not.toBe(CAM_STATE.COMEBACK_ZOOM);
  });
});

describe('COMEBACK-CUT-DELAY-1 — nothing drops a waiting comeback', () => {
  it('a LEAD CHANGE confirmed during the wait does not take the slot; the comeback is cut on time', () => {
    const { cd } = director();
    cd.update(RACERS, NOW, rs(), 1280, 720);
    cd._leadChangePending = true; // as `_updateLeaderTracking` leaves it on a confirmed change
    cd.update(RACERS, NOW + DELAY / 2, rs(), 1280, 720);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.LEAD_CHANGE_INTERRUPT);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM); // the interrupt ran, and kept the shot
    expect(cd._comebackDue).toMatchObject({ index: 2, since: NOW });
    cd.update(RACERS, NOW + DELAY, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
  });
});
