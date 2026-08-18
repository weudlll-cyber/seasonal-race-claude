// ============================================================
// File:        startWindow.test.js
// Path:        client/src/modules/camera/startWindow.test.js
// Project:     RaceArena — START-ONE-WINDOW-1
// Description: One start window, one framing rule. The shot opens where it stands and does not pan;
//              the camera begins to follow when the leader reaches the place in frame he holds for
//              the rest of the race; and for the whole window nothing else takes the picture.
//
//              THE FIXTURES CARRY GEOMETRY. Every case builds a real CameraDirector on a real
//              shape, runs a real countdown so the freeze point is captured the way a race captures
//              it, and then drives the real `update()`. The racers advance ALONG the shape rather
//              than in world x, because the mark is a fraction along the leader's own heading and a
//              field that moves across it can never reach one — a fixture that gets this wrong tests
//              nothing and looks like the rule failing.
//
//              WHAT BREAKS IF EACH TEST IS DELETED is written above each one.
// ============================================================

import { describe, it, expect } from 'vitest';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

const CW = 1280;
const CH = 720;
const WORLD_W = 3072;
const WORLD_H = 2048;
const FRAME = 1000 / 60;
const MARK = DEFAULT_CAMERA_CONFIG.leaderForwardFrac;

// A straight track on a diagonal: the axis cases hide the per-axis projection, and the mark is
// measured along a heading.
const SHAPE = {
  isOpen: true,
  getPosition: (t) => ({ x: 300 + t * 2400 * 0.6, y: 400 + t * 2400 * 0.8 }),
};

const at = (t, lane = 0) => {
  const p = SHAPE.getPosition(t);
  return { x: p.x + lane * 4, y: p.y - lane * 3 };
};

/** A grid ON the racing line, so advancing `t` advances the leader along his own heading. */
const grid = (n) =>
  Array.from({ length: n }, (_, i) => ({
    index: i,
    name: `R${i}`,
    t: 0.2 - i * 0.0015,
    ...at(0.2 - i * 0.0015, (i % 8) - 3.5),
    speed: 0,
    lap: 0,
  }));

function director(config = DEFAULT_CAMERA_CONFIG) {
  return new CameraDirector(WORLD_W, WORLD_H, true, config, 36, SHAPE, 300);
}

/**
 * The race as a race runs it: the whole countdown, then RACING frames. `onFrame` sees each racing
 * frame after `update()`; returning `false` stops the drive.
 */
function driveGun(cd, racers, frames, onFrame, step = 0.0006) {
  const total = cd.ceremonySchedule(racers).totalMs;
  for (let e = 0; e <= total; e += FRAME) cd.updateCountdown(racers, 1000 + e, e, CW, CH);
  let el = 0;
  for (let f = 0; f < frames; f++) {
    for (const r of racers) {
      r.t += step;
      Object.assign(r, at(r.t, (r.index % 8) - 3.5));
    }
    cd.update(
      racers,
      1000 + total + el,
      { raceElapsed: el, finishedCount: 0, winner: null, finishT: 1, isOutcomePhase: false },
      CW,
      CH,
      FRAME
    );
    if (onFrame && onFrame({ el, f }) === false) return el;
    el += FRAME;
  }
  return el;
}

const camCentre = (cd) => ({
  x: (CW / 2 - cd.offsetX) / cd._proj.effX(cd.zoom),
  y: (CH / 2 - cd.offsetY) / cd._proj.effY(cd.zoom),
});

/**
 * A fixture that STAYS before the hand-over long enough to measure it.
 *
 * TWO THINGS ARE DELIBERATE AND BOTH WERE LEARNED BY MEASURING. The mark is put at the top of its
 * valid band (0.8): on a compact grid the ceremony's framing FITS THE FORMATION, so the leader sits
 * at its leading edge and is already past 0.66 when the gun fires — which is not a fixture artefact
 * but the real behaviour on four of the ten tracks at 40 racers, reported in the block's own report.
 * And the racers crawl, so the field does not spread and the hand-over stays away. The zoom is then
 * moved by hand, because with a crawling field nothing else would move it and the second assertion
 * below would pass on a shot that never opened.
 */
function frozenFixture() {
  const cd = director({ ...DEFAULT_CAMERA_CONFIG, leaderForwardFrac: 0.8 });
  const racers = grid(20);
  const total = cd.ceremonySchedule(racers).totalMs;
  for (let e = 0; e <= total; e += FRAME) cd.updateCountdown(racers, 1000 + e, e, CW, CH);
  cd._ceremonyHoldZoom = cd.zoom * 0.85; // the shot opens
  return { cd, racers, total };
}

function driveFrozen(cd, racers, total, frames, onFrame) {
  let el = 0;
  for (let f = 0; f < frames; f++) {
    for (const r of racers) {
      r.t += 0.00002; // a crawl: the field must not spread, or the hand-over arrives
      Object.assign(r, at(r.t, (r.index % 8) - 3.5));
    }
    cd.update(
      racers,
      1000 + total + el,
      { raceElapsed: el, finishedCount: 0, winner: null, finishT: 1 },
      CW,
      CH,
      FRAME
    );
    if (cd._startHandoverDone) return { el, handed: true };
    onFrame?.({ el });
    el += FRAME;
  }
  return { el, handed: false };
}

describe('before the hand-over the shot opens where it stands', () => {
  // DELETE THIS and the rule itself is unguarded: the anchor could go back to the field's centroid,
  // or forward to the leader, and the only thing that would notice is the owner's eye. It is the
  // ONE assertion that names what the anchor IS rather than what it does.
  it('the anchor IS the point the ceremony left at the centre — not the leader, not the centroid', () => {
    const { cd, racers, total } = frozenFixture();
    const freeze = { ...cd._startFreezePoint };
    expect(freeze.x).toEqual(expect.any(Number));
    driveFrozen(cd, racers, total, 5);

    expect(cd._framingProbe.anchorPoint).toEqual(freeze);
    // And it is NOT the leader, which is what the anchor becomes the moment the hand-over fires.
    const leader = [...racers].sort((a, b) => b.t - a.t)[0];
    expect(cd._framingProbe.anchorPoint.x).not.toBeCloseTo(leader.x, 0);
  });

  // DELETE THIS and the camera can pan away from the grid at the gun again — measured at 187 world
  // px in the first 400 ms before this block — and the test above would still pass, because an
  // anchor can be right while the delivery drifts (that is the whole of START-OVERSHOOT-1).
  it('the camera does not pan while the leader is still short of his place', () => {
    const { cd, racers, total } = frozenFixture();
    let start = null;
    let worst = 0;
    const out = driveFrozen(cd, racers, total, 120, () => {
      const c = camCentre(cd);
      if (start === null) start = c;
      else worst = Math.max(worst, Math.hypot(c.x - start.x, c.y - start.y));
    });
    expect(out.handed).toBe(false); // the fixture really did stay before the hand-over
    // A drawn body is ~36 world px here. Measured, this reads 1.4; the drift it replaces was 187.
    expect(worst).toBeLessThan(6);
  });

  // DELETE THIS and the freeze could quietly become a freeze of the WHOLE framing — the owner asked
  // for the shot to OPEN at the gun and only the pan to stand still, and a frozen zoom would look
  // like a working start until he watched one.
  it('…but the shot DOES open — the freeze is on the pan only', () => {
    const { cd, racers, total } = frozenFixture();
    const zooms = [];
    driveFrozen(cd, racers, total, 120, () => zooms.push(cd.zoom));
    expect(zooms.length).toBeGreaterThan(60);
    // A real opening, not a rounding wobble: measured at 4.57 -> 3.90 on this fixture.
    expect(Math.max(...zooms) / Math.min(...zooms)).toBeGreaterThan(1.05);
  });
});

describe('the hand-over', () => {
  // DELETE THIS and the camera never starts following: the start would hold its opening shot for
  // the whole ten seconds and the leader would simply leave it.
  it('fires when the leader reaches his racing place, and only then', () => {
    const cd = director();
    const racers = grid(20);
    let fracAtHandover = null;
    driveGun(cd, racers, 600, () => {
      if (cd._startHandoverDone && fracAtHandover === null) {
        fracAtHandover = cd._lastHandoverFrac;
        return false;
      }
      const f = cd._leaderFrameFrac([...racers].sort((a, b) => b.t - a.t)[0]);
      // Before it fires, the leader has NOT reached the mark. This is the half that makes the
      // assertion below mean something.
      if (f !== null) expect(f).toBeLessThan(MARK + 1e-9);
    });
    expect(cd._startHandoverDone).toBe(true);
    expect(cd._startHandoverAtMs).not.toBeNull();
  });

  // DELETE THIS and `leaderForwardFrac` could go on being inert through the start — which is what
  // it was before this block, and it is the difference between "follows him" and "follows him to
  // the place he belongs".
  it('after it the leader is placed by the racing rule, not left where he was', () => {
    const cd = director();
    const racers = grid(20);
    let after = null;
    driveGun(cd, racers, 900, ({ el }) => {
      if (cd._startHandoverDone && after === null && cd._startHandoverAtMs !== null) {
        if (el > cd._startHandoverAtMs + 3000) {
          after = cd._leaderFrameFrac([...racers].sort((a, b) => b.t - a.t)[0]);
          return false;
        }
      }
    });
    expect(after).not.toBeNull();
    // He sits at his racing place, within the ordinary tracking lag — not at dead centre, which is
    // where an inert `leaderForwardFrac` would leave him.
    expect(after).toBeGreaterThan(0.5);
  });

  // DELETE THIS and the hand-over could re-arm on a later lap, cancelling a state's minimum display
  // mid-race — which shows up as "the camera is twitchy" three reports later.
  it('happens once', () => {
    const cd = director();
    const racers = grid(20);
    let firstAt = null;
    driveGun(cd, racers, 600, () => {
      if (cd._startHandoverDone && firstAt === null) firstAt = cd._startHandoverAtMs;
    });
    expect(firstAt).not.toBeNull();
    expect(cd._startHandoverAtMs).toBe(firstAt);
  });
});

describe('the window owns the picture, and it is one number', () => {
  // DELETE THIS and BATTLE can take the start again — the one half of the old post-start hold that
  // was load-bearing, and the reason it existed at all.
  it('nothing but the start framing holds the picture for the whole window', () => {
    const cd = director();
    const racers = grid(40);
    const seen = new Set();
    driveGun(cd, racers, 620, ({ el }) => {
      if (el < DEFAULT_CAMERA_CONFIG.startWindowMs) seen.add(cd.hudState);
    });
    expect([...seen].sort()).toEqual([CAM_STATE.LEADER_ZOOM, CAM_STATE.OVERVIEW].sort());
  });

  // DELETE THIS and the window's length stops being the key's — the two clocks could creep back,
  // one of them unreachable from any slider, which is the shape this block removed.
  it('the window is exactly `startWindowMs`, and the key moves it', () => {
    const short = { ...DEFAULT_CAMERA_CONFIG, startWindowMs: 4000 };
    const cd = director(short);
    expect(cd._startWindowMs).toBe(4000);
    const racers = grid(20);
    let lastOwnedMs = -1;
    driveGun(cd, racers, 500, ({ el }) => {
      if (cd.hudState === CAM_STATE.OVERVIEW || cd.hudState === CAM_STATE.LEADER_ZOOM) {
        if (el < 4000) lastOwnedMs = el;
      }
    });
    expect(lastOwnedMs).toBeGreaterThan(3900);
  });

  // DELETE THIS and the retired keys could come back by the back door — a stored `postStartHoldMs`
  // silently re-read, or a second hard-coded start phase added beside the one number.
  it('the two clocks it replaced are gone from the director', () => {
    const cd = director();
    expect(cd._postStartHoldMs).toBeUndefined();
    expect(DEFAULT_CAMERA_CONFIG.postStartHoldMs).toBeUndefined();
    expect(DEFAULT_CAMERA_CONFIG.startWindowMs).toBe(10000);
  });
});

describe('a race with no ceremony', () => {
  // DELETE THIS and a director entered without a countdown — a test, a resumed race — would hold a
  // freeze point it never captured, or crash reading one.
  it('has no freeze point and frames the leader from the first frame', () => {
    const cd = director();
    const racers = grid(20);
    expect(cd._startFreezePoint).toBe(null);
    // No countdown: straight into racing frames.
    for (let f = 0; f < 10; f++) {
      for (const r of racers) {
        r.t += 0.0006;
        Object.assign(r, at(r.t, (r.index % 8) - 3.5));
      }
      cd.update(
        racers,
        1000 + f * FRAME,
        { raceElapsed: f * FRAME, finishedCount: 0, winner: null, finishT: 1 },
        CW,
        CH,
        FRAME
      );
    }
    expect(cd._framingProbe.anchorPoint).not.toBe(null);
  });
});
