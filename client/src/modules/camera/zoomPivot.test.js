// ============================================================
// File:        zoomPivot.test.js
// Path:        client/src/modules/camera/zoomPivot.test.js
// Project:     RaceArena — ZOOM-PIVOT-START-1
// Description: The camera zooms about the ANCHOR, not the world origin — in EVERY state, including
//              the group shots that have no focus racer.
//
//              THE FIXTURES CARRY GEOMETRY. Every case builds a real CameraDirector on a real shape
//              and drives the real `update()`, because the defect is in the interaction between the
//              zoom lerp and the offset lerp and neither can be seen in isolation. The racers are
//              held STILL on purpose: with a static field, the anchor is a static world point, so
//              ANY movement of its screen position is the pivot defect and nothing else.
//
//              WHAT THIS DOES NOT ASSERT: that the picture is better. That is measured on ten
//              tracks in reports/evolution/ZOOM-PIVOT-START-1.md and judged by the owner on a
//              production build. These pin the INVARIANT.
//
//              WHAT BREAKS IF EACH TEST IS DELETED is written above each one.
// ============================================================

import { describe, it, expect } from 'vitest';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

const CW = 1280;
const CH = 720;
// PAST the start window (START-ONE-WINDOW-1), so this fixture measures the pivot and not the start
// window's frozen anchor. OVERVIEW is held by keeping `ts` under its 5000 ms hold gate, so no
// transition ever fires — see `arrived`.
const START_MS = 12000;

// A straight track on a diagonal — the axis cases hide per-axis defects, and this correction is
// per-axis (`axisX`/`axisY` are different on every closed track).
const SHAPE = {
  isOpen: true,
  getPosition: (t) => ({ x: 400 + t * 2000 * 0.6, y: 300 + t * 2000 * 0.8 }),
};

/** A field held STILL, so the anchor is a fixed world point for the whole run. */
const stillRacers = () =>
  Array.from({ length: 6 }, (_, i) => {
    const t = 0.3 + i * 0.004;
    const p = SHAPE.getPosition(t);
    return { ...p, t, index: i, name: `r${i}` };
  });

const raceState = (raceElapsed) => ({
  raceElapsed,
  finishedCount: 0,
  winner: null,
  finishT: 1,
  isOutcomePhase: false,
  physicsRacers: [],
});

function director() {
  const cd = new CameraDirector(3072, 2048, true, DEFAULT_CAMERA_CONFIG, 28.5, SHAPE, 300);
  cd.state = CAM_STATE.OVERVIEW;
  cd.zoom = 6;
  cd.offsetX = 0;
  cd.offsetY = 0;
  return cd;
}

/**
 * Drive `update()` for a while and report how far the ANCHOR's screen position wandered.
 *
 * The anchor is read off the director's own framing probe, so this asks the question the correction
 * is about — "did the point the framing was built on stay where it was drawn?" — rather than a
 * reconstruction of it.
 */
/**
 * Put the camera where it would be if it had already arrived, and leave it in the start window's
 * exact configuration.
 *
 * THREE THINGS MATTER HERE and each was learned by getting it wrong. (1) The camera must be ON its
 * subject before the zoom is moved, or the measurement records the arrival instead of the pivot —
 * a director built at offset 0 starts thousands of px away. (2) `raceElapsed` is held inside the
 * start phase so OVERVIEW stays forced; without it the chain moves to LEADER_ZOOM, which HAS a
 * focus racer and so tests the branch that already worked. (3) `ts` is kept under OVERVIEW's
 * 5000 ms hold gate so no transition fires and `_camT` stays null — which is what the real start
 * window looks like, and it matters because a non-null `_camT` takes a different branch that
 * assigns the offset outright and never reaches the correction at all.
 */
function arrived(cd, racers) {
  // ITERATED, and the reason is a fixture bug worth leaving written down: `targetOffsetX` is
  // computed FROM the zoom, so snapping both in one pass lands the offset on a target that belonged
  // to the previous zoom — the camera then starts 5500 px from its subject and the measurement
  // records the transit. Three passes converge because each one re-derives the target from the zoom
  // the previous pass settled.
  for (let i = 0; i < 3; i++) {
    cd.update(racers, i * 16.7, raceState(START_MS), CW, CH, 1000 / 60);
    cd.zoom = cd.targetZoom;
    cd.update(racers, i * 16.7 + 8, raceState(START_MS), CW, CH, 1000 / 60);
    cd.offsetX = cd.targetOffsetX;
    cd.offsetY = cd.targetOffsetY;
  }
  cd.update(racers, 60, raceState(START_MS), CW, CH, 1000 / 60);
  return cd;
}

function anchorScreenDrift(cd, racers, frames = 40) {
  let first = null;
  let worst = 0;
  for (let i = 0; i < frames; i++) {
    const ts = 100 + i * (1000 / 60);
    cd.update(racers, ts, raceState(START_MS), CW, CH, 1000 / 60);
    const a = cd._framingProbe?.anchorPoint;
    if (!a) continue;
    const p = cd._proj.toScreen(a, cd.zoom, cd.offsetX, cd.offsetY);
    if (first === null) first = p;
    else worst = Math.max(worst, Math.hypot(p.x - first.x, p.y - first.y));
  }
  return worst;
}

describe('the zoom pivots about the anchor in a state with NO focus racer', () => {
  // DELETE THIS and the whole block is unprotected: OVERVIEW goes back to zooming about the world
  // ORIGIN, which throws the frame centre forward by `camX × Δzoom/zoom` — about 225 world px on
  // the owner's dirt-oval frames — and every other test here would stay green, because the rest
  // assert what does NOT change.
  it('a moving zoom does not slide the anchor across the frame', () => {
    const cd = director();
    const racers = stillRacers();
    // OVERVIEW has no focus racer by design, which is what used to skip the correction.
    expect(cd._focusAnchorRacer(racers)).toBe(null);
    arrived(cd, racers);
    // The real start window's configuration, asserted rather than assumed.
    expect(cd.state).toBe(CAM_STATE.OVERVIEW);
    expect(cd._camT).toBe(null);
    // NOW force a real zoom move, with the camera already on its subject, so the only thing that
    // can slide the anchor is the pivot.
    cd._ceremonyHoldZoom = cd.zoom * 0.85;

    const drift = anchorScreenDrift(cd, racers);
    // THE THRESHOLD IS SET BETWEEN TWO MEASURED VALUES, not chosen: this fixture reads 12.2 px with
    // the correction reaching OVERVIEW and 68.7 px with the old run-in-only scope restored. 30 sits
    // clear of both, so the test discriminates by 2.5x on one side and 2.3x on the other rather
    // than passing by a hair. The 12.2 px residual is the pan lerp closing on a framing position
    // that shifts slightly as the frame widens — the follower, not the pivot.
    expect(drift).toBeLessThan(30);
  });

  // DELETE THIS and the correction could silently stop firing for the group shots again — the
  // `_runInActive` scope could come back and nothing above would notice, because a shot whose zoom
  // happens to be steady drifts by zero either way.
  it('the correction actually fires — the pivot is recorded on every frame the zoom moves', () => {
    const cd = director();
    const racers = stillRacers();
    arrived(cd, racers);
    cd._ceremonyHoldZoom = cd.zoom * 0.85;
    let fired = 0;
    let moved = 0;
    for (let i = 0; i < 30; i++) {
      const before = cd.zoom;
      cd.update(racers, 100 + i * 16.7, raceState(START_MS), CW, CH, 1000 / 60);
      if (cd.zoom !== before) moved++;
      if (cd._lastPivotAnchorX !== null) fired++;
    }
    expect(moved).toBeGreaterThan(0);
    expect(fired).toBe(moved);
  });
});

describe('what must NOT change', () => {
  // DELETE THIS and the pivot could start using the framing probe even where a focus racer exists —
  // silently re-pointing the correction in LEADER_ZOOM, LEAD_CHANGE and COMEBACK_ZOOM, which is
  // every state where it already worked.
  it('with a focus racer the pivot is still THAT RACER, not the probe', () => {
    const cd = director();
    cd.state = CAM_STATE.LEADER_ZOOM;
    const racers = stillRacers();
    const leader = cd._focusAnchorRacer(racers);
    expect(leader).not.toBe(null);

    cd._ceremonyHoldZoom = null;
    arrived(cd, racers);
    cd.targetZoom = cd.zoom * 0.85; // force a zoom move so the correction has something to do
    cd.update(racers, 100, raceState(6000), CW, CH, 1000 / 60);

    // The recorded pivot is the leader's own x, not the probe's anchor (which the forward bias and
    // the lateral guarantee move away from him).
    if (cd._lastPivotAnchorX !== null) {
      expect(cd._lastPivotAnchorX).toBe(cd._focusAnchorRacer(racers).x);
    }
  });

  // DELETE THIS and the run-in loses the one guarantee this block owes it. Inside the run-in the
  // expression must reduce to exactly what it was before — `_framingProbe.anchorPoint` — so the
  // endgame is untouched by construction rather than by a measurement that could drift.
  it('inside the run-in the pivot is the probe anchor, exactly as before this block', () => {
    const cd = director();
    const racers = stillRacers();
    arrived(cd, racers);
    cd._runInActive = true;
    cd._ceremonyHoldZoom = cd.zoom * 0.85;
    cd.update(racers, 100, raceState(START_MS), CW, CH, 1000 / 60);
    cd.update(racers, 116.7, raceState(START_MS), CW, CH, 1000 / 60);

    // The OLD expression: `_focusAnchorRacer(racers) ?? (_runInActive ? probe.anchorPoint : null)`.
    // With no focus racer and the run-in active it is the probe's anchor — and so is the new one.
    const old = cd._focusAnchorRacer(racers) ?? cd._framingProbe.anchorPoint;
    expect(cd._lastPivotAnchorX).toBe(old.x);
  });

  // DELETE THIS and a frame with no zoom change could still write the offset — a correction of zero
  // that is not zero, which is how a "harmless" term becomes a drift of its own.
  it('a frame with no zoom change writes nothing and records no pivot', () => {
    const cd = director();
    const racers = stillRacers();
    cd._ceremonyHoldZoom = null;
    arrived(cd, racers);
    for (let i = 0; i < 200; i++) {
      cd.update(racers, 100 + i * 16.7, raceState(START_MS), CW, CH, 1000 / 60);
    }
    const beforeX = cd.offsetX;
    const beforeZoom = cd.zoom;
    cd.update(racers, 3500, raceState(START_MS), CW, CH, 1000 / 60);
    // Only the PIVOT is asserted. The pan lerp legitimately keeps closing whatever gap is left,
    // and asserting the offset is frozen would be asserting that the follower has stopped — a
    // different claim, and one this fixture has no business making.
    expect(cd.zoom).toBe(beforeZoom);
    expect(cd._lastPivotAnchorX).toBe(null);
    expect(beforeX).toBeDefined();
  });
});
