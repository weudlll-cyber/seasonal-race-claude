// ============================================================
// File:        overlayGeometry.test.js
// Path:        client/src/screens/RaceScreen/overlayGeometry.test.js
// Project:     RaceArena — COORD-SYSTEM-1
// Created:     2026-08-13
// Description: Two things measured, and one of them a sabotage-proof guard.
//
//              1. AT SCALE 1.0, every overlay lands where it did before COORD-SYSTEM-1. The
//                 percentages were CHOSEN to match the shipped px offsets at 1280x720, and this is
//                 how that choice is defended.
//              2. AT ANY SCALE, no overlay overlaps the minimap or a sibling on the finish frame —
//                 what the WinnerCard bug once did, and the sabotage tests prove the guard can
//                 catch it.
//
//              THE OWNER'S SIZE, 1037x583 CSS (scale 0.81), is one of the three sizes on purpose:
//              the WinnerCard bug lived at exactly that scale.
// ============================================================

import { describe, it, expect } from 'vitest';

import {
  CANVAS_W,
  CANVAS_H,
  OVERLAY_ANCHORS,
  overlayRectCssPx,
  overlayRectCssPxShipped,
  rectsOverlap,
} from './overlayGeometry.js';

const SIZES = [
  { name: 'canvas 1:1', wrapperCssW: 1280, wrapperCssH: 720 },
  { name: 'owner (0.81)', wrapperCssW: 1037, wrapperCssH: 583 },
  { name: 'small (0.5)', wrapperCssW: 640, wrapperCssH: 360 },
];

describe('COORD-SYSTEM-1 — at scale 1.0, nothing moves', () => {
  const size = SIZES[0];

  it('BrandLogoOverlay (bottom-right) is where it shipped, to the pixel', () => {
    const now = overlayRectCssPx('brandLogoBottomRight', size);
    const before = overlayRectCssPxShipped('brandLogoBottomRight', size);
    expect(now.x).toBeCloseTo(before.x, 3);
    expect(now.y).toBeCloseTo(before.y, 3);
    expect(now.w).toBe(before.w);
    expect(now.h).toBe(before.h);
  });

  it('StateOverlay is where it shipped, to the pixel', () => {
    const now = overlayRectCssPx('stateOverlay', size);
    const before = overlayRectCssPxShipped('stateOverlay', size);
    expect(now.x).toBeCloseTo(before.x, 3);
    expect(now.y).toBeCloseTo(before.y, 3);
    expect(now.w).toBe(before.w);
    expect(now.h).toBe(before.h);
  });
});

// AT ANY NON-1x SCALE, a percentage anchor gives a different CSS-pixel offset than a fixed CSS-px
// anchor did — that is the WHOLE POINT of the change, so an overlay that pinned to `16px` off the
// corner now pins to `1.25% x wrapperCssW`. On the owner's 1037x583 wrapper that is 12.96 CSS px
// instead of 16 — about 3 CSS px inward. This IS a visible change and it is why the branch is
// pushed rather than merged.
describe('COORD-SYSTEM-1 — at the owner scale (0.81), overlays move slightly INWARD', () => {
  const size = SIZES[1];

  it('BrandLogoOverlay is ~3 CSS px further from the corner than it was', () => {
    const now = overlayRectCssPx('brandLogoBottomRight', size);
    const before = overlayRectCssPxShipped('brandLogoBottomRight', size);
    // The corner CLEARANCE from the wrapper's right/bottom edge.
    const nowRightClear = size.wrapperCssW - (now.x + now.w);
    const beforeRightClear = size.wrapperCssW - (before.x + before.w);
    const nowBottomClear = size.wrapperCssH - (now.y + now.h);
    const beforeBottomClear = size.wrapperCssH - (before.y + before.h);
    expect(beforeRightClear).toBe(16);
    expect(beforeBottomClear).toBe(16);
    expect(nowRightClear).toBeCloseTo(12.96, 1);
    expect(nowBottomClear).toBeCloseTo(12.96, 1);
    // The shift is INWARD (smaller clearance) at scales < 1.0, because the percentage was chosen
    // to hit 16 canvas px, which is 16 * scale CSS px at scale < 1.0.
    expect(beforeRightClear - nowRightClear).toBeCloseTo(3.04, 1);
  });

  it('StateOverlay pill drops ~5 CSS px lower than it was', () => {
    const now = overlayRectCssPx('stateOverlay', size);
    const before = overlayRectCssPxShipped('stateOverlay', size);
    const nowBottomClear = size.wrapperCssH - (now.y + now.h);
    const beforeBottomClear = size.wrapperCssH - (before.y + before.h);
    expect(beforeBottomClear).toBe(28);
    expect(nowBottomClear).toBeCloseTo(28 * (size.wrapperCssW / CANVAS_W), 1);
  });
});

describe('COORD-SYSTEM-1 — the overlap guard, and it can fail by sabotage', () => {
  // The list of pairs a source-level check cannot rule out on its own: DOM-vs-canvas (WinnerCard
  // vs Minimap was the shipped incident), DOM-vs-DOM (WinnerCard vs BrandLogo covers the corner
  // stack), and the finish frame is when everything the ending shows is on-screen at once.
  const pairs = [
    ['winnerCard', 'minimap'],
    ['winnerCard', 'brandLogoBottomRight'],
    ['brandLogoBottomRight', 'minimap'],
    ['stateOverlay', 'minimap'],
    ['stateOverlay', 'brandLogoBottomRight'],
  ];

  for (const size of SIZES) {
    it(`nothing overlaps on the finish frame at ${size.name}`, () => {
      for (const [a, b] of pairs) {
        const rectA = overlayRectCssPx(a, size);
        const rectB = overlayRectCssPx(b, size);
        const overlaps = rectsOverlap(rectA, rectB);
        expect(overlaps, `${a} vs ${b} at ${size.name}`).toBe(false);
      }
    });
  }

  // THE SABOTAGE. Two mutations, each one the shape of a real mistake:
  //   1. WinnerCard back at its original `left: 26px; bottom: 26px` — the shipped bug.
  //   2. BrandLogo's `right` anchor grows from 1.25% to 60% — a "let's centre the logo" refactor
  //      that drags a corner overlay into the diagonally opposite corner the minimap owns. The
  //      guard reads it at every size, because a percentage mistake goes wrong equally on all of
  //      them (that is the whole point of a percentage — and its cost when it is wrong).
  // If the guard cannot catch either, it is telling the eye nothing the eye did not already know.

  it('SABOTAGE: the original WinnerCard position overlaps the minimap on the owner size', () => {
    const size = SIZES[1];
    const minimap = overlayRectCssPx('minimap', size);
    // A CSS-pixel anchor rebuilt from the shipped bug's coordinates.
    const sabotaged = { x: 26, y: size.wrapperCssH - 26 - 55, w: 220, h: 55 };
    expect(rectsOverlap(sabotaged, minimap)).toBe(true);
  });

  it('SABOTAGE: shifting the BrandLogo left overlaps the minimap at every size', () => {
    for (const size of SIZES) {
      const minimap = overlayRectCssPx('minimap', size);
      const bl = OVERLAY_ANCHORS.brandLogoBottomRight;
      const sabotagedRightFrac = 0.85; // "let's move the logo to the far side"
      const w = bl.widthCssPxAt1x;
      const h = bl.heightCssPxAt1x;
      const sabotaged = {
        x: size.wrapperCssW - sabotagedRightFrac * size.wrapperCssW - w,
        y: size.wrapperCssH - bl.bottomFrac * size.wrapperCssH - h,
        w,
        h,
      };
      expect(
        rectsOverlap(sabotaged, minimap),
        `sabotaged brand logo vs minimap at ${size.name}`
      ).toBe(true);
    }
  });
});
