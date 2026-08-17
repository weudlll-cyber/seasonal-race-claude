// ============================================================
// File:        leaderVisible.test.js
// Path:        client/src/modules/camera/leaderVisible.test.js
// Project:     RaceArena — START-LEADER-VISIBLE-1
// Description: The leader-visible ceiling: the visibility requirement read off the DELIVERED frame.
//
//              THE FIXTURES CARRY GEOMETRY. Every case builds a real CameraDirector, so the real
//              per-axis projection decides where a world point lands — the bsX/bsY asymmetry on a
//              closed track is the reason this cannot be tested against a scalar zoom, and it is
//              the third defect class this repository has paid for on exactly that point.
//
//              WHAT IS NOT ASSERTED HERE, deliberately: that the leader ENDS UP inside the picture.
//              He does on dirt-oval and searound and he does NOT on city-circuit, where widening
//              re-resolves the pan against the world edge and pushes him further out. That is
//              measured and reported in reports/evolution/START-LEADER-VISIBLE-1.md, and writing a
//              test that asserts an outcome the code does not deliver would be a test that is red
//              on purpose. These pin the RULE; the report carries the OUTCOME.
//
//              WHAT BREAKS IF EACH TEST IS DELETED is written above each one.
// ============================================================

import { describe, it, expect } from 'vitest';
import { CameraDirector } from './CameraDirector.js';

const FRAME = { width: 1280, height: 720 };

// A director standing where a race stands just after the gun: a delivered frame, and the ceremony
// hold still live. Geometry is the constructor's — a closed track, so the projection applies bsX.
function directorInHold({ zoom = 8, holdZoom = 8 } = {}) {
  const cd = new CameraDirector(3072, 2048, false);
  cd.zoom = zoom;
  cd.offsetX = 0;
  cd.offsetY = 0;
  cd._ceremonyHoldZoom = holdZoom;
  return cd;
}

// Place a racer at a chosen SCREEN x by inverting the director's own projection, so the fixture
// cannot drift from the maths under test.
function racerAtScreenX(cd, screenX, screenY = 360) {
  const probe = { x: 0, y: 0, t: 1 };
  const at0 = cd._proj.toScreen(probe, cd.zoom, cd.offsetX, cd.offsetY);
  const unit = cd._proj.toScreen({ x: 1, y: 1, t: 1 }, cd.zoom, cd.offsetX, cd.offsetY);
  const sx = unit.x - at0.x;
  const sy = unit.y - at0.y;
  return { x: (screenX - at0.x) / sx, y: (screenY - at0.y) / sy, t: 1 };
}

describe('the leader-visible ceiling', () => {
  // DELETE THIS and the whole feature is unprotected: the shot could stop widening when the leader
  // is outside the picture and every other test here would stay green, because they all assert
  // that it does NOT fire.
  it('WIDENS when the leader is outside the delivered frame', () => {
    const cd = directorInHold({ zoom: 8 });
    const leader = racerAtScreenX(cd, 1900); // far right of a 1280 px frame
    const ceiling = cd._leaderVisibleCeiling([leader], FRAME);

    expect(Number.isFinite(ceiling)).toBe(true);
    expect(ceiling).toBeLessThan(cd.zoom);

    // At exactly the returned ceiling he sits ON the border, not inside it — that is what makes
    // this bound "no key, no margin" rather than a tolerance somebody chose.
    const k = ceiling / cd.zoom;
    const p = cd._proj.toScreen(leader, cd.zoom, cd.offsetX, cd.offsetY);
    expect(640 + (p.x - 640) * k).toBeCloseTo(1280, 6);
  });

  // DELETE THIS and the rule could fire on every frame, which would make the whole start wider on
  // all ten tracks — including the five where nothing is wrong — and the acceptance count of
  // "0 frames changed on every open track" would be silently lost.
  it('does NOT widen when the leader is inside the frame', () => {
    const cd = directorInHold({ zoom: 8 });
    const leader = racerAtScreenX(cd, 900); // comfortably inside
    expect(cd._leaderVisibleCeiling([leader], FRAME)).toBe(Infinity);
  });

  // DELETE THIS and the ceiling could start TIGHTENING the shot, which would invert a guarantee
  // into a steer — the failure Lesson 192 names, and the one thing a ceiling must never do.
  it('never tightens — the ceiling is at or below the delivered zoom whenever it applies', () => {
    const cd = directorInHold({ zoom: 8 });
    for (const x of [1300, 1600, 2400, -200, -900]) {
      const ceiling = cd._leaderVisibleCeiling([racerAtScreenX(cd, x)], FRAME);
      expect(ceiling).toBeLessThanOrEqual(cd.zoom);
    }
  });

  // DELETE THIS and the rule could outlive the hold, changing every frame of the rest of the race —
  // the run-in, the battle shots and the photo finish — none of which this feature is about.
  it('is inert once the hold is released', () => {
    const cd = directorInHold({ zoom: 8 });
    const leader = racerAtScreenX(cd, 1900);
    expect(Number.isFinite(cd._leaderVisibleCeiling([leader], FRAME))).toBe(true);

    cd._ceremonyHoldZoom = null; // the release
    expect(cd._leaderVisibleCeiling([leader], FRAME)).toBe(Infinity);
  });

  // DELETE THIS and a shot with the field centred could start being widened by a straggler read as
  // the leader — the rule is about the picture, and a centred picture has nothing to correct.
  it('a centred field does not move the ceiling', () => {
    const cd = directorInHold({ zoom: 8 });
    const field = [640, 700, 580, 660].map((x) => racerAtScreenX(cd, x));
    field[0].t = 9; // the leader, still centred
    expect(cd._leaderVisibleCeiling(field, FRAME)).toBe(Infinity);
  });

  // DELETE THIS and the ceiling could be computed from a racer who is not the leader — the rule
  // would then widen for whoever happened to be furthest from centre, which is the REJECTED
  // every-racer variant arriving by the back door.
  it('reads the LEADER, not the racer furthest from centre', () => {
    const cd = directorInHold({ zoom: 8 });
    const leader = { ...racerAtScreenX(cd, 900), t: 9 }; // inside
    const straggler = { ...racerAtScreenX(cd, 2200), t: 1 }; // far outside, but not the leader
    expect(cd._leaderVisibleCeiling([leader, straggler], FRAME)).toBe(Infinity);
  });
});
