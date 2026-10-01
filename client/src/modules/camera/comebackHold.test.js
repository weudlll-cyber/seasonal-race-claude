// ============================================================
// File:        comebackHold.test.js
// Path:        client/src/modules/camera/comebackHold.test.js
// Project:     RaceArena — COMEBACK-HOLD-1 (2026-10-02)
// Description: The comeback shot's length, as the owner decided on 2026-10-02: AT LEAST the comeback
//              minimum, then only while the racer is still gaining places, and NEVER past the
//              COMEBACK_ZOOM profile's maximum. Every bound is READ from defaults.js, so a later move
//              of a value cannot leave these tests asserting an old number.
//
// Three seams, each tested where it lives:
//   · comebackDetector.gainedWithin — the "still gaining" read over the existing rank history
//   · transitionDecision            — the new reason, and that it is the CALLER's flag that drives it
//   · CameraDirector.update         — the three bounds end to end, with the gain read stubbed so each
//                                     case controls "still gaining" exactly
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { ComebackDetector } from './comebackDetector.js';
import { decideTransition, TRANSITION_ACTION, TRANSITION_REASON } from './transitionDecision.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

const MIN_MS = DEFAULT_CAMERA_CONFIG.comebackMinDuration * 1000;
const MAX_MS = DEFAULT_CAMERA_CONFIG.cameraStateProfiles.COMEBACK_ZOOM.maxStateDuration;
const W_MS = DEFAULT_CAMERA_CONFIG.comebackGainStopMs;

// ── the gain read ───────────────────────────────────────────────────────────────────────────────
describe('ComebackDetector.gainedWithin — net places gained over the last W ms', () => {
  const det = () => new ComebackDetector({ windowSec: 4 });
  it('true when his rank now is better than at the start of the window', () => {
    const d = det();
    d._history.set(7, [
      { ts: 1000, rank: 9 },
      { ts: 2500, rank: 8 },
      { ts: 3000, rank: 7 },
    ]);
    expect(d.gainedWithin(7, 3000, 2000)).toBe(true);
  });
  it('false when the rank is unchanged across the window', () => {
    const d = det();
    d._history.set(7, [
      { ts: 1000, rank: 5 },
      { ts: 3000, rank: 5 },
    ]);
    expect(d.gainedWithin(7, 3000, 2000)).toBe(false);
  });
  it('false when a place was gained and lost again inside the window (NET gain counts)', () => {
    const d = det();
    d._history.set(7, [
      { ts: 1500, rank: 5 },
      { ts: 2000, rank: 4 },
      { ts: 3000, rank: 5 },
    ]);
    expect(d.gainedWithin(7, 3000, 2000)).toBe(false);
  });
  it('false for an unknown racer or a single sample — no extension on a guess', () => {
    const d = det();
    expect(d.gainedWithin(99, 3000, 2000)).toBe(false);
    d._history.set(7, [{ ts: 3000, rank: 5 }]);
    expect(d.gainedWithin(7, 3000, 2000)).toBe(false);
  });
});

// ── the decision ────────────────────────────────────────────────────────────────────────────────
describe('decideTransition — the comeback gain-stop reason', () => {
  const base = { stateAge: 9000, holdGate: MAX_MS, battleMinDurationMs: 3000 };
  it('transitions with COMEBACK_GAIN_STOPPED when the caller says the gain stopped', () => {
    const d = decideTransition({ ...base, comebackGainStopped: true });
    expect(d).toEqual({
      action: TRANSITION_ACTION.TRANSITION,
      reason: TRANSITION_REASON.COMEBACK_GAIN_STOPPED,
    });
  });
  it('holds when the flag is absent — every other state is untouched', () => {
    expect(decideTransition(base).action).toBe(TRANSITION_ACTION.NONE);
  });
});

// ── the director, end to end ────────────────────────────────────────────────────────────────────
// The comeback is the ONLY shot that could be offered (every other weight 0), so if the director
// were allowed to re-pick a running comeback, the 15 s case would visibly stay in COMEBACK_ZOOM.
// ★ `comebackCooldownMs: 0` IS WHAT MAKES THAT CASE A TEST. `_transition` stamps the comeback exit
// time BEFORE it picks (CameraDirector.js `_transition`), so with any cooldown above 0 the shipped
// cooldown alone already refuses the re-pick and the guard would never be reached. A Dev Screen
// cooldown of 0 is the case the guard exists for.
const ONLY_COMEBACK = {
  ...DEFAULT_CAMERA_CONFIG,
  leadChangeWeight: 0,
  overviewWeight: 0,
  battleWeight: 0,
  comebackWeight: 1,
  comebackCooldownMs: 0,
};
const racers = [
  { index: 0, t: 0.5, x: 500, y: 300, finished: false },
  { index: 1, t: 0.45, x: 450, y: 300, finished: false },
  { index: 2, t: 0.4, x: 400, y: 300, finished: false }, // the comeback racer
];
const rs = {
  raceElapsed: 60000,
  finishedCount: 0,
  winner: null,
  finishT: 1.0,
  isOutcomePhase: true,
};

function inComeback(cfg = ONLY_COMEBACK, { gaining }) {
  const cd = new CameraDirector(1280, 720, false, cfg);
  // the state a fresh comeback entry leaves behind (`_pickNextState` → `_transition`)
  cd.state = CAM_STATE.COMEBACK_ZOOM;
  cd._prevCommittedState = CAM_STATE.COMEBACK_ZOOM;
  cd.stateEnteredAt = 0;
  cd._activeStateMinHoldMs = cd._minStateHoldByState[CAM_STATE.COMEBACK_ZOOM];
  cd._comebackLockedRacerIndex = 2;
  cd._comebackLockedRacer = racers[2];
  cd._lastComebackExitTs = -1e9; // cooled down: a re-pick would be allowed if nothing refused it
  const spy = vi.spyOn(cd._comeback, 'gainedWithin').mockReturnValue(gaining);
  // the detector would offer HIM again — the repeat guard is what must refuse it
  vi.spyOn(cd, '_detectComebackRacer').mockReturnValue(racers[2]);
  return { cd, spy };
}

describe('the comeback shot: at least the minimum, while gaining, never past the maximum', () => {
  it('the bounds READ from defaults.js are the decided shape: 8 s minimum < 15 s maximum', () => {
    expect(MIN_MS).toBeGreaterThan(0);
    expect(MAX_MS).toBeGreaterThan(MIN_MS);
    expect(W_MS).toBeGreaterThan(0);
  });

  it('NEVER BELOW the minimum: not gaining, one ms short of it → still on the comeback', () => {
    const { cd } = inComeback(undefined, { gaining: false });
    cd.update(racers, MIN_MS - 1, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
  });

  it('ENDS ON GAIN-STOP once the minimum is reached and he gained nothing in the last W ms', () => {
    const { cd, spy } = inComeback(undefined, { gaining: false });
    cd.update(racers, MIN_MS, rs, 1280, 720);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.COMEBACK_GAIN_STOPPED);
    expect(cd.state).not.toBe(CAM_STATE.COMEBACK_ZOOM);
    // it asked about HIS racer over the configured window
    expect(spy).toHaveBeenCalledWith(2, MIN_MS, W_MS);
  });

  it('STAYS while he is still gaining, past the minimum', () => {
    const { cd } = inComeback(undefined, { gaining: true });
    cd.update(racers, MIN_MS + 3000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
  });

  it('NEVER ABOVE the maximum: still gaining and offered again, it leaves at the cap and is not re-picked', () => {
    const { cd } = inComeback(undefined, { gaining: true });
    cd.update(racers, MAX_MS - 1, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
    cd.update(racers, MAX_MS, rs, 1280, 720);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.HOLD_ELAPSED);
    expect(cd.state).not.toBe(CAM_STATE.COMEBACK_ZOOM);
  });

  it('W = 0 switches the gain-stop off: not gaining, past the minimum, it stays', () => {
    const { cd } = inComeback({ ...ONLY_COMEBACK, comebackGainStopMs: 0 }, { gaining: false });
    cd.update(racers, MIN_MS + 3000, rs, 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
  });
});
