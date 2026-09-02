// ============================================================
// File:        companyHeadcount.test.js
// Path:        client/src/modules/camera/companyHeadcount.test.js
// Project:     RaceArena — COMPANY-HEADCOUNT-1
//
// WHAT THIS PROTECTS: that `companyGuarantee` delivers the number of RACERS it promises, whether or
// not a racer happens to stand on its anchor.
//
// It used to deduct one unconditionally, under the comment "the anchor itself is one of them" — true
// when written, and false from the moment CAMERA-LATERAL-1 moved the anchor to the track centreline.
// A promise of five then asked for four companions and delivered four racers, on 100% of the frames
// where the anchor is the centreline point (AIM-ROOM-LOST-1). No test caught it because every test
// here asserted the CEILING's arithmetic rather than the HEADCOUNT it buys.
//
// So these assertions are deliberately behavioural: at the zoom the guarantee returns, COUNT how many
// racers are actually inside the region it promises them inside. That is the property that broke, and
// it is the one a future anchor change would break again.
// ============================================================
import { describe, it, expect } from 'vitest';
import { companyGuarantee, COMPANY_FRAME_PCT } from './framingRule.js';
import { roomFromPointAlong } from './frameGeometry.js';

const W = 1280;
const H = 720;
const AXIS = 1;
const AT = { x: W / 2, y: H / 2 }; // anchor dead centre, so the room is symmetric and easy to reason about
const ANCHOR = { x: 0, y: 0 };

/** Racers strung out along +x from the anchor, nearest first. */
const strungOut = (n, step = 100) =>
  Array.from({ length: n }, (_, i) => ({ x: (i + 1) * step, y: 0 }));

/**
 * How many racers are inside the promised region at cam.zoom `z` — the guarantee's own criterion,
 * evaluated with the product's own geometry rather than a reimplementation of it.
 */
const countInside = (racers, z) =>
  racers.filter((r) => {
    const dx = r.x - ANCHOR.x;
    const dy = r.y - ANCHOR.y;
    if (dx === 0 && dy === 0) return true; // a racer standing on the anchor is in shot by definition
    const sx = dx * AXIS;
    const sy = dy * AXIS;
    const needed = Math.hypot(sx, sy);
    const room = roomFromPointAlong(AT.x, AT.y, sx, sy, W, H, COMPANY_FRAME_PCT);
    return needed * z <= room + 1e-9;
  }).length;

const ceilingFor = (racers, minVisible) =>
  companyGuarantee(ANCHOR, racers, minVisible, AXIS, AXIS, W, H, COMPANY_FRAME_PCT, AT);

describe('COMPANY-HEADCOUNT-1 — the promise is kept when NO racer stands on the anchor', () => {
  // This is the live case: since CAMERA-LATERAL-1 the anchor is the centreline point and the leader
  // is in his lane, so the field never contains the anchor.
  it.each([2, 3, 5, 8])(
    'a promise of %i delivers exactly that many racers, not one fewer',
    (minVisible) => {
      const racers = strungOut(12);
      const z = ceilingFor(racers, minVisible);
      expect(z).toBeLessThan(Infinity);
      expect(countInside(racers, z)).toBe(minVisible);
    }
  );

  it('FAILURE PROOF: deducting one unconditionally delivers one racer too few', () => {
    // The old arithmetic, reproduced here so the defect stays visible after the repair.
    const racers = strungOut(12);
    const need = 5 - 1; // what the function used to ask for
    const ceilings = racers
      .map((r) => {
        const sx = r.x * AXIS;
        const needed = Math.hypot(sx, 0);
        return roomFromPointAlong(AT.x, AT.y, sx, 0, W, H, COMPANY_FRAME_PCT) / needed;
      })
      .sort((a, b) => b - a);
    const oldZ = ceilings[need - 1];
    expect(countInside(racers, oldZ)).toBe(4); // promised 5
    expect(countInside(racers, ceilingFor(racers, 5))).toBe(5); // and now delivers 5
  });
});

describe('COMPANY-HEADCOUNT-1 — the deduction still applies when a racer DOES stand on the anchor', () => {
  it.each([2, 3, 5])('a promise of %i counts the anchor racer as one of them', (minVisible) => {
    const racers = [{ x: 0, y: 0 }, ...strungOut(12)];
    const z = ceilingFor(racers, minVisible);
    expect(countInside(racers, z)).toBe(minVisible);
  });

  it('the two cases differ, so the detection is demonstrably doing something', () => {
    const withAnchor = [{ x: 0, y: 0 }, ...strungOut(12)];
    const withoutAnchor = strungOut(12);
    // Same promise, same companions available; the anchor-racer case may keep a tighter shot because
    // it needs one companion fewer.
    expect(ceilingFor(withAnchor, 5)).toBeGreaterThan(ceilingFor(withoutAnchor, 5));
  });

  it('a FINISHED racer on the anchor does not count as one of them', () => {
    // A finished racer cannot be one of the live racers the promise is about, and it is skipped
    // before the anchor test — so this must behave like the no-racer-on-the-anchor case.
    const finishedOnAnchor = [{ x: 0, y: 0, finished: true }, ...strungOut(12)];
    expect(ceilingFor(finishedOnAnchor, 5)).toBe(ceilingFor(strungOut(12), 5));
  });
});

describe('COMPANY-HEADCOUNT-1 — the contract at the edges is unchanged', () => {
  it.each([0, 1, -3])('minVisible %i disables, with or without a racer on the anchor', (mv) => {
    expect(ceilingFor(strungOut(12), mv)).toBe(Infinity);
    expect(ceilingFor([{ x: 0, y: 0 }, ...strungOut(12)], mv)).toBe(Infinity);
  });

  it('THE FIELD CALL SITE IS UNAFFECTED: `racers.length + 1` still means EVERYONE', () => {
    // `_fieldCeiling` passes one more than the field can supply on purpose, and the
    // `Math.min(need, ceilings.length)` clamp turns any over-ask into "take everything". The
    // deduction was absorbed by that clamp and never mattered there — which is why this site was
    // NOT under-asking and is not changed by the repair.
    for (const racers of [strungOut(6), [{ x: 0, y: 0 }, ...strungOut(6)]]) {
      const everyone = ceilingFor(racers, racers.length + 1);
      const countable = racers.filter((r) => !(r.x === 0 && r.y === 0));
      const tightest = countable
        .map((r) => {
          const sx = r.x * AXIS;
          return roomFromPointAlong(AT.x, AT.y, sx, 0, W, H, COMPANY_FRAME_PCT) / Math.hypot(sx, 0);
        })
        .sort((a, b) => b - a)
        .at(-1);
      expect(everyone).toBeCloseTo(tightest, 12);
      expect(countInside(racers, everyone)).toBe(racers.length);
    }
  });

  it('asking for more than the field can supply takes what exists rather than zooming to a point', () => {
    const racers = strungOut(3);
    const z = ceilingFor(racers, 99);
    expect(z).toBeGreaterThan(0);
    expect(countInside(racers, z)).toBe(3);
  });
});
