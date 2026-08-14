// ============================================================
// File:        pointGuarantee.test.js
// Path:        client/src/modules/camera/pointGuarantee.test.js
// Project:     RaceArena — rescued from FINISH-FRAMED-1 (BRANCH-CLEANUP-1)
//
// WHY THIS FILE EXISTS ON MASTER AT ALL. `pointGuarantee` is the run-in ceiling: ZOOM-PACE-2 and -3
// established that it is the BINDING term through the whole endgame — the flat crawl and the leap
// into the photo finish are one monotone curve, and that curve is this function. It shipped with
// ZERO test coverage; grepping the camera test files for its name returned nothing.
//
// The tests were written on `feat/finish-framed`, a branch that declared itself red in its own head
// commit and is superseded by the merged run-in work. Its MECHANISM (a `finishLineFraming` key) is
// not on master and is not coming; these assertions are about the function underneath it, which is,
// and they were the only thing on that branch master did not already have. Two of the original
// twelve are NOT here because they asserted the dead key's value — a test for a key that does not
// exist would fail, and re-pointing it at something else would be inventing a test rather than
// rescuing one.
//
// The reasoning the original carried, kept because it is the finding and not the mechanism:
// `pointGuarantee` rather than `pairGuarantee` was chosen by MEASUREMENT. The pair form fits a
// SEPARATION into the frame's full chord, which is right only when the camera sits between the two
// things; the run-in's camera sits ON the leader, so the room toward the line is measured from the
// leader's own place in the frame. Built the pair way first: the line's in-frame share moved
// 41.4% -> 40.8%, i.e. not at all.
// ============================================================

import { describe, it, expect } from 'vitest';

import { pointGuarantee, pairGuarantee, COMPANY_FRAME_PCT } from './framingRule.js';

const FRAME_W = 1280;
const FRAME_H = 720;
const AXIS = { x: 1280 / 3072, y: 720 / 2048 }; // a closed track's per-axis scale

describe('pointGuarantee — the guarantee derives the zoom from the distance', () => {
  const anchor = { x: 1000, y: 1000 };
  const ceilingAt = (dx) =>
    pointGuarantee(
      anchor,
      { x: anchor.x + dx, y: anchor.y },
      AXIS.x,
      AXIS.y,
      FRAME_W,
      FRAME_H,
      COMPANY_FRAME_PCT,
      { x: FRAME_W / 2, y: FRAME_H / 2 }
    );

  it('further away means a WIDER shot, monotonically — no ramp, just geometry', () => {
    const near = ceilingAt(100);
    const mid = ceilingAt(400);
    const far = ceilingAt(1200);
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
  });

  it('AT the line it stops constraining, so the tight shot is reachable by construction', () => {
    // Zero separation: the ceiling is Infinity, so `Math.min` hands the state its own zoom back.
    expect(ceilingAt(0)).toBe(Infinity);
  });

  it('the ceiling is exactly the room divided by the need', () => {
    // 400 world px on X = 400 * (1280/3072) = 166.67 screen px. From the centre, the room to the
    // edge along +X inside COMPANY_FRAME_PCT is (1280/2) * 0.9 = 576.
    const expected = ((FRAME_W / 2) * COMPANY_FRAME_PCT) / (400 * AXIS.x);
    expect(ceilingAt(400)).toBeCloseTo(expected, 6);
  });
});

describe('pointGuarantee — why the pair form was rejected', () => {
  it('pairGuarantee is more permissive than pointGuarantee for the same distance', () => {
    const anchor = { x: 1000, y: 1000 };
    const line = { x: 1600, y: 1000 };
    const centre = { x: FRAME_W / 2, y: FRAME_H / 2 };
    const asPair = pairGuarantee(anchor, line, AXIS.x, AXIS.y, FRAME_W, FRAME_H, 1, 0);
    const asPoint = pointGuarantee(
      anchor,
      line,
      AXIS.x,
      AXIS.y,
      FRAME_W,
      FRAME_H,
      COMPANY_FRAME_PCT,
      centre
    );
    // The pair form measures against the WHOLE chord and so allows a tighter shot — which is why it
    // left the line outside the frame. Roughly a factor of two, the two halves of the frame.
    expect(asPair).toBeGreaterThan(asPoint);
  });
});

describe('pointGuarantee — a guarantee widens and never steers (Lesson 192)', () => {
  it('returns Infinity when there is nothing to keep in frame', () => {
    const p = { x: 500, y: 500 };
    expect(pointGuarantee(p, p, AXIS.x, AXIS.y, FRAME_W, FRAME_H)).toBe(Infinity);
    expect(pointGuarantee(null, p, AXIS.x, AXIS.y, FRAME_W, FRAME_H)).toBe(Infinity);
    expect(pointGuarantee(p, null, AXIS.x, AXIS.y, FRAME_W, FRAME_H)).toBe(Infinity);
  });

  it('an anchor already outside the region constrains nothing rather than returning zoom 0', () => {
    // Anchor pinned at the far right edge, target further right: no room in that direction.
    const at = { x: FRAME_W, y: FRAME_H / 2 };
    expect(
      pointGuarantee(
        { x: 0, y: 0 },
        { x: 500, y: 0 },
        AXIS.x,
        AXIS.y,
        FRAME_W,
        FRAME_H,
        COMPANY_FRAME_PCT,
        at
      )
    ).toBe(Infinity);
  });
});
