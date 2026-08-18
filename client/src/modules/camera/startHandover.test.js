// ============================================================
// File:        startHandover.test.js
// Path:        client/src/modules/camera/startHandover.test.js
// Project:     RaceArena — START-HANDOVER-MARK-1
// Description: The hand-over as a CONDITION on the leader's place in frame, not as a clock.
//
//              THE FIXTURES CARRY GEOMETRY. Every case builds a real CameraDirector with a real
//              shape, so the real per-axis projection decides where a world point lands and the
//              real `frameExtentAlong` decides how far the frame reaches along a heading. The
//              heading is deliberately DIAGONAL: the axis-aligned cases agree with the wrong
//              formula this project already shipped once (`|cos|·W + |sin|·H`), so a test on an
//              axis proves nothing about this arithmetic.
//
//              WHAT IS NOT ASSERTED HERE, deliberately: that the switch is an improvement. It is
//              measured on all ten tracks in reports/evolution/START-HANDOVER-MARK-1.md, where two
//              of the four acceptance criteria are met and two are missed. These tests pin the
//              RULE; the report carries the OUTCOME, and the default stays OFF because of it.
//
//              WHAT BREAKS IF EACH TEST IS DELETED is written above each one.
// ============================================================

import { describe, it, expect } from 'vitest';
import { CameraDirector } from './CameraDirector.js';
import { anchorScreenPoint } from './framingRule.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

const FRAME_W = 1280;
const FRAME_H = 720;
const MARK = DEFAULT_CAMERA_CONFIG.leaderForwardFrac;

// A straight track on a DIAGONAL, so the frame chord is neither W nor H. `getPosition` is the only
// method `_headingAt` and the centreline need, and a line is enough: nothing under test reads
// curvature. The direction is 3:4 so the arithmetic lands on round numbers if it is ever traced.
const DIAGONAL = {
  isOpen: true,
  getPosition: (t) => ({ x: 400 + t * 2400 * 0.6, y: 300 + t * 2400 * 0.8 }),
};

/**
 * A director standing where a race stands just after the gun: a delivered frame, the ceremony hold
 * live, and the start still forced to OVERVIEW.
 */
function directorInHold({ handover, zoom = 4 } = {}) {
  const cfg = { ...DEFAULT_CAMERA_CONFIG, startHandoverOnLeaderMark: handover };
  const cd = new CameraDirector(3072, 2048, true, cfg, 28.5, DIAGONAL, 300);
  cd.zoom = zoom;
  cd.offsetX = 0;
  cd.offsetY = 0;
  cd._ceremonyHoldZoom = zoom;
  return cd;
}

/**
 * A racer at a chosen fraction along his own heading, built by asking the framing rule where that
 * fraction IS and then inverting the director's own projection to get there.
 *
 * The fixture therefore cannot drift from the maths under test: if `anchorScreenPoint` or the
 * projection changes, this moves with it.
 */
function racerAtFrac(cd, frac, t = 0.4) {
  const h = cd._headingAt(t);
  const hLen = Math.hypot(h.x, h.y);
  const headingScreen = {
    x: (h.x / hLen) * cd._proj.effX(cd.zoom),
    y: (h.y / hLen) * cd._proj.effY(cd.zoom),
  };
  const target = anchorScreenPoint(FRAME_W, FRAME_H, frac, headingScreen);
  // Invert `toScreen` by measuring it: one probe for the origin, one for the unit step.
  const at0 = cd._proj.toScreen({ x: 0, y: 0, t }, cd.zoom, cd.offsetX, cd.offsetY);
  const unit = cd._proj.toScreen({ x: 1, y: 1, t }, cd.zoom, cd.offsetX, cd.offsetY);
  return {
    x: (target.x - at0.x) / (unit.x - at0.x),
    y: (target.y - at0.y) / (unit.y - at0.y),
    t,
    index: 0,
  };
}

describe('the leader’s place in frame is READ, not chosen', () => {
  // DELETE THIS and the hand-over could compare against a fraction of its own — a second opinion
  // about where the leader belongs, silently disagreeing with the framing the race actually uses.
  // Every other test here would stay green, because they all place the racer with the same
  // (wrong) arithmetic they then assert against.
  it('`_leaderFrameFrac` is the exact inverse of `anchorScreenPoint`, on a diagonal', () => {
    const cd = directorInHold({ handover: true });
    for (const frac of [0.2, 0.5, MARK, 0.8, 1.15]) {
      expect(
        cd._leaderFrameFrac(racerAtFrac(cd, frac), FRAME_W, FRAME_H),
        `frac=${frac}`
      ).toBeCloseTo(frac, 6);
    }
  });

  // DELETE THIS and a degenerate frame — no shape, a racer with no t — could throw inside update()
  // on the last line of the frame loop, which is the worst place in the director to throw from.
  it('returns null rather than a number when the geometry is missing', () => {
    const cd = directorInHold({ handover: true });
    expect(cd._leaderFrameFrac(null)).toBe(null);
    expect(cd._leaderFrameFrac({ x: 0, y: 0 })).toBe(null);
    const noShape = new CameraDirector(3072, 2048, true);
    expect(noShape._leaderFrameFrac({ x: 0, y: 0, t: 0.4 })).toBe(null);
  });
});

describe('the hand-over fires on the condition and only on it', () => {
  // DELETE THIS and the feature is unprotected: the hold could stop releasing entirely and every
  // other test in this file would stay green, because the rest assert that it does NOT fire.
  it('ON — the hold ends the frame the leader has reached his racing place', () => {
    const cd = directorInHold({ handover: true });
    cd._maybeHandOverAtLeaderMark([racerAtFrac(cd, MARK)], 1200);

    expect(cd._ceremonyHoldZoom).toBe(null);
    expect(cd._startHandoverDone).toBe(true);
    expect(cd._startHandoverAtMs).toBe(1200);
    // The ordinary chain is unblocked for the next frame rather than steered here.
    expect(cd._activeStateMinHoldMs).toBe(0);
  });

  // DELETE THIS and the rule could fire on every frame from the gun, which would end the ceremony's
  // framing before the leader has gone anywhere — the opposite of the owner's design, and it would
  // look plausible on screen because the camera would simply follow him from the start.
  it('ON — it does NOT fire while the leader is still short of the mark', () => {
    const cd = directorInHold({ handover: true });
    // Just short: a hair below the mark is still short. No tolerance is permitted here.
    cd._maybeHandOverAtLeaderMark([racerAtFrac(cd, MARK - 0.001)], 400);

    expect(cd._ceremonyHoldZoom).not.toBe(null);
    expect(cd._startHandoverDone).toBe(false);
    expect(cd._activeStateMinHoldMs).toBe(null);
  });

  // DELETE THIS and the switch stops being a switch: the new behaviour would ship to everyone the
  // moment this file is merged, which is exactly what the acceptance gate said must not happen
  // while two of its four criteria are missed.
  it('OFF — the shipped default holds even with the leader far past the mark', () => {
    const cd = directorInHold({ handover: false });
    cd._maybeHandOverAtLeaderMark([racerAtFrac(cd, 1.4)], 400);

    expect(cd._ceremonyHoldZoom).not.toBe(null);
    expect(cd._startHandoverDone).toBe(false);
  });

  // DELETE THIS and `startHandoverOnLeaderMark: false` in defaults.js becomes the only thing
  // standing between the owner and a changed start — and a default is a value, not a guarantee.
  it('OFF is what a director built from the SHIPPED config does', () => {
    const cd = new CameraDirector(3072, 2048, true, DEFAULT_CAMERA_CONFIG, 28.5, DIAGONAL, 300);
    expect(cd._startHandoverOnLeaderMark).toBe(false);
  });
});

describe('it happens once, and it moves nothing', () => {
  // DELETE THIS and a later lap could re-arm the hand-over. The hold is null by then, so the visible
  // damage would be `_activeStateMinHoldMs = 0` mid-race — a state hold silently cancelled, which
  // is the kind of thing that shows up as "the camera is twitchy" three reports later.
  it('a second crossing of the mark changes nothing', () => {
    const cd = directorInHold({ handover: true });
    const leader = racerAtFrac(cd, 0.9);
    cd._maybeHandOverAtLeaderMark([leader], 1000);
    expect(cd._startHandoverAtMs).toBe(1000);

    // A later frame, past the mark again, and a hold that somehow came back.
    cd._ceremonyHoldZoom = 7;
    cd._activeStateMinHoldMs = 5000;
    cd._maybeHandOverAtLeaderMark([leader], 40000);

    expect(cd._startHandoverAtMs).toBe(1000);
    expect(cd._ceremonyHoldZoom).toBe(7);
    expect(cd._activeStateMinHoldMs).toBe(5000);
  });

  // DELETE THIS and the hand-over could start writing a position — a cut, which is the one thing
  // the owner's design forbids ("from that moment follow him", not "jump to him"). It reads as a
  // lurch on the eye and as nothing at all in every other assertion here.
  it('the camera is byte-identical across the hand-over — it ends a hold, it does not move', () => {
    const cd = directorInHold({ handover: true });
    const before = { zoom: cd.zoom, x: cd.offsetX, y: cd.offsetY };
    cd._maybeHandOverAtLeaderMark([racerAtFrac(cd, MARK)], 1200);

    expect(cd.zoom).toBe(before.zoom);
    expect(cd.offsetX).toBe(before.x);
    expect(cd.offsetY).toBe(before.y);
  });

  // DELETE THIS and a race entered without a countdown — a test, a resumed race — could have a
  // hand-over performed on it, cancelling a state hold it never asked for.
  it('a race with no ceremony has no hold to end, and nothing happens', () => {
    const cd = directorInHold({ handover: true });
    cd._ceremonyHoldZoom = null;
    cd._maybeHandOverAtLeaderMark([racerAtFrac(cd, 1.4)], 400);

    expect(cd._startHandoverDone).toBe(false);
    expect(cd._activeStateMinHoldMs).toBe(null);
  });

  // DELETE THIS and the leader could be picked by array order rather than by track position, which
  // is right in a fixture and wrong in a race for every frame after the first overtake.
  it('the leader is the racer furthest along, not the first in the array', () => {
    const cd = directorInHold({ handover: true });
    const behind = racerAtFrac(cd, 0.2, 0.2);
    const ahead = racerAtFrac(cd, MARK, 0.4);
    cd._maybeHandOverAtLeaderMark([behind, ahead], 900);
    expect(cd._startHandoverDone).toBe(true);
  });
});
