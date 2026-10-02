// ============================================================
// File:        comebackHold.test.js
// Path:        client/src/modules/camera/comebackHold.test.js
// Project:     RaceArena — COMEBACK-HOLD-1, rewritten for COMEBACK-HOLD-2 (2026-10-02)
// Description: The comeback shot's length, as the owner decided on 2026-10-02: AT LEAST the comeback
//              minimum, then until the comeback racer holds `comebackTargetRank` or better, NEVER past
//              the COMEBACK_ZOOM profile's maximum, and NEVER into the final scene — which ends it at
//              once, minimum or not. Every bound is READ from defaults.js, so a later move of a value
//              cannot leave these tests asserting an old number.
//
// Three seams, each tested where it lives:
//   · comebackDetector.latestRank — the rank read over the existing rank history
//   · transitionDecision          — the two reasons, and that the final scene outranks the target
//   · CameraDirector.update       — the bounds end to end, with the rank read stubbed so each case
//                                   controls "where is he" exactly
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { ComebackDetector } from './comebackDetector.js';
import { decideTransition, TRANSITION_ACTION, TRANSITION_REASON } from './transitionDecision.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

const MIN_MS = DEFAULT_CAMERA_CONFIG.comebackMinDuration * 1000;
const MAX_MS = DEFAULT_CAMERA_CONFIG.cameraStateProfiles.COMEBACK_ZOOM.maxStateDuration;
const TARGET = DEFAULT_CAMERA_CONFIG.comebackTargetRank;
const ENDGAME = DEFAULT_CAMERA_CONFIG.endgameThreshold;

// ── the rank read ───────────────────────────────────────────────────────────────────────────────
describe('ComebackDetector.latestRank — the rank recordRanks last recorded', () => {
  it('is the newest sample of his history', () => {
    const d = new ComebackDetector({ windowSec: 4 });
    d._history.set(7, [
      { ts: 1000, rank: 9 },
      { ts: 2000, rank: 4 },
    ]);
    expect(d.latestRank(7)).toBe(4);
  });
  it('is null for a racer with no history', () => {
    expect(new ComebackDetector({ windowSec: 4 }).latestRank(99)).toBeNull();
  });
});

// ── the decision ────────────────────────────────────────────────────────────────────────────────
describe('decideTransition — the comeback reasons', () => {
  const base = { stateAge: 3000, holdGate: MAX_MS, battleMinDurationMs: 3000 };
  it('the final scene ends the shot, and it outranks the target', () => {
    const d = decideTransition({
      ...base,
      comebackFinalSceneDue: true,
      comebackTargetReached: true,
    });
    expect(d).toEqual({
      action: TRANSITION_ACTION.TRANSITION,
      reason: TRANSITION_REASON.COMEBACK_FINAL_SCENE,
    });
  });
  it('the target reached ends the shot', () => {
    const d = decideTransition({ ...base, comebackTargetReached: true });
    expect(d.reason).toBe(TRANSITION_REASON.COMEBACK_TARGET_REACHED);
  });
  it('holds when neither flag is set — every other state is untouched', () => {
    expect(decideTransition(base).action).toBe(TRANSITION_ACTION.NONE);
  });
});

// ── the director, end to end ────────────────────────────────────────────────────────────────────
// The comeback is the ONLY shot that could be offered (every other weight 0, cooldown 0), so if the
// director were allowed to re-pick a running comeback, the maximum case would visibly stay in
// COMEBACK_ZOOM. `comebackCooldownMs: 0` is what makes that case a test: `_transition` stamps the
// comeback exit BEFORE it picks, so any cooldown above 0 refuses the re-pick on its own.
const ONLY_COMEBACK = {
  ...DEFAULT_CAMERA_CONFIG,
  leadChangeWeight: 0,
  overviewWeight: 0,
  battleWeight: 0,
  comebackWeight: 1,
  comebackCooldownMs: 0,
};
const field = (leaderT) => [
  { index: 0, t: leaderT, x: 500, y: 300, finished: false },
  { index: 1, t: leaderT - 0.05, x: 450, y: 300, finished: false },
  { index: 2, t: leaderT - 0.1, x: 400, y: 300, finished: false }, // the comeback racer
];
const MID = field(0.5); // well before the endgame
const rs = (over = {}) => ({
  raceElapsed: 60000,
  finishedCount: 0,
  winner: null,
  finishT: 1.0,
  isOutcomePhase: true,
  ...over,
});

function inComeback({ rank }) {
  const cd = new CameraDirector(1280, 720, false, ONLY_COMEBACK);
  // the state a fresh comeback entry leaves behind (`_pickNextState` → `_transition`)
  cd.state = CAM_STATE.COMEBACK_ZOOM;
  cd._prevCommittedState = CAM_STATE.COMEBACK_ZOOM;
  cd.stateEnteredAt = 0;
  cd._activeStateMinHoldMs = cd._minStateHoldByState[CAM_STATE.COMEBACK_ZOOM];
  cd._comebackLockedRacerIndex = 2;
  cd._comebackLockedRacer = MID[2];
  cd._lastComebackExitTs = -1e9;
  const spy = vi.spyOn(cd._comeback, 'latestRank').mockReturnValue(rank);
  // the detector would offer HIM again — the repeat guard is what must refuse it
  vi.spyOn(cd, '_detectComebackRacer').mockReturnValue(MID[2]);
  return { cd, spy };
}

describe('the comeback shot: minimum, target place, maximum, never into the final scene', () => {
  it('the bounds READ from defaults.js are the decided shape: 8 s < 20 s, target 3rd', () => {
    expect(MIN_MS).toBeGreaterThan(0);
    expect(MAX_MS).toBeGreaterThan(MIN_MS);
    expect(TARGET).toBeGreaterThanOrEqual(1);
  });

  it('ENDS AT THE TARGET once the minimum is reached', () => {
    const { cd, spy } = inComeback({ rank: TARGET });
    cd.update(MID, MIN_MS, rs(), 1280, 720);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.COMEBACK_TARGET_REACHED);
    expect(cd.state).not.toBe(CAM_STATE.COMEBACK_ZOOM);
    expect(spy).toHaveBeenCalledWith(2); // it asked about HIS rank
  });

  it('NEVER BEFORE the minimum: already at the target, one ms short of it → still on him', () => {
    const { cd } = inComeback({ rank: 1 });
    cd.update(MID, MIN_MS - 1, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
  });

  it('STAYS past the minimum while he is still behind the target', () => {
    const { cd } = inComeback({ rank: TARGET + 3 });
    cd.update(MID, MIN_MS + 5000, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
  });

  it('NEVER ABOVE the maximum: still behind and offered again, it leaves at the cap and is not re-picked', () => {
    const { cd } = inComeback({ rank: TARGET + 3 });
    cd.update(MID, MAX_MS - 1, rs(), 1280, 720);
    expect(cd.state).toBe(CAM_STATE.COMEBACK_ZOOM);
    cd.update(MID, MAX_MS, rs(), 1280, 720);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.HOLD_ELAPSED);
    expect(cd.state).not.toBe(CAM_STATE.COMEBACK_ZOOM);
  });

  it('NEVER INTO THE ENDGAME: leader past the threshold ends it at once, BEFORE the minimum, and the endgame shot starts', () => {
    const { cd } = inComeback({ rank: TARGET + 3 });
    cd.update(field(ENDGAME + 0.02), 3000, rs(), 1280, 720);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.COMEBACK_FINAL_SCENE);
    expect(cd.state).toBe(CAM_STATE.LEADER_ZOOM); // `_pickNextState`'s endgame answer, unchanged
  });

  it('NEVER INTO THE FINISH: the first racer home ends it at once, BEFORE the minimum', () => {
    const { cd } = inComeback({ rank: TARGET + 3 });
    cd.update(MID, 3000, rs({ finishedCount: 1 }), 1280, 720);
    expect(cd._lastTransitionReason).toBe(TRANSITION_REASON.COMEBACK_FINAL_SCENE);
    expect(cd.state).not.toBe(CAM_STATE.COMEBACK_ZOOM);
  });
});
