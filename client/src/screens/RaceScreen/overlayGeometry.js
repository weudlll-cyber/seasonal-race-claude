// ============================================================
// File:        overlayGeometry.js
// Path:        client/src/screens/RaceScreen/overlayGeometry.js
// Project:     RaceArena — COORD-SYSTEM-1
//
// WHAT THIS IS FOR: computing the CSS boxes of every overlay in the race-canvas wrapper from the
// ONE source of truth — the CSS anchor values — so the wrapper's coordinate rule can be MEASURED
// rather than trusted. Two things read this: the geometry test that proves nothing moves at scale
// 1.0, and the overlap guard that proves nothing sits on top of anything else.
//
// PURE: no DOM, no browser, no config reads. The canvas is a fixed 1280x720 store (see
// `defaults.js` CANVAS_W/CANVAS_H — the note above them is definitive); the CSS pixel size of the
// wrapper is passed in.
//
// WHY THIS EXISTS. Before COORD-SYSTEM-1 the overlays anchored some in CSS px and some in
// percentages, and the WinnerCard bug proved a source-level check cannot notice a px-vs-canvas
// mismatch — the two files never named the same ruler. The wrapper's ONE-COORDINATE-RULE puts
// every overlay on percentages; this function turns those percentages into CSS boxes at any
// canvas size, so a test can then ask two questions the eye missed: "did anything move at any
// size" and "does anything overlap the minimap or a sibling on the finish frame".
// ============================================================

import { MINIMAP_W, MINIMAP_H, MINIMAP_MARGIN } from '../../modules/camera/Minimap.js';

/** The fixed canvas store — the SAME numbers `RaceScreen/index.jsx` passes to `<canvas width/height>`. */
export const CANVAS_W = 1280;
export const CANVAS_H = 720;

/**
 * The overlays that live inside `.race-canvas-wrapper`, in the anchors they were shipped with
 * AFTER COORD-SYSTEM-1. Each is a percentage of the wrapper — the same ruler the canvas store
 * uses, because the wrapper's width IS the canvas store's width in whatever CSS pixels it happens
 * to be scaled to.
 *
 * `size` is what the element intrinsically occupies. It is not part of the coordinate rule — a
 * font-size in px stays in CSS px whatever the wrapper does — but the overlap guard needs a box,
 * and this is the honest way to name one that reads under measurement rather than being asserted.
 * `widthCanvasPx` is the approximate width in CANVAS pixels at scale 1.0, taken from measurement
 * on the finish frame the WinnerCard.css comment records; it lets the guard's boxes be compared
 * to the minimap (which is drawn in canvas pixels) without a second ruler here.
 */
export const OVERLAY_ANCHORS = {
  minimap: {
    // Not a DOM overlay — drawn INTO the canvas by `Minimap.js`. Included so the guard can catch
    // any DOM overlay that would land on it, which is the mistake WinnerCard made.
    kind: 'canvas',
    xCanvasPx: MINIMAP_MARGIN,
    yCanvasPx: CANVAS_H - MINIMAP_H - MINIMAP_MARGIN,
    widthCanvasPx: MINIMAP_W,
    heightCanvasPx: MINIMAP_H,
  },
  brandLogoBottomRight: {
    // BrandLogoOverlay in its default `bottom-right` corner.
    kind: 'dom',
    // Anchors: `right` and `bottom` from the corner, in EXACT fractional percentages — same values
    // the CSS gets from `calc(16 / 1280 * 100%)` and `calc(16 / 720 * 100%)`. Written as ratios so
    // the test comparison is byte-identical to the CSS rather than rounded to a printed percentage.
    rightFrac: 16 / 1280,
    bottomFrac: 16 / 720,
    // Intrinsic size — the logo defaults to `logoMaxHeight` = 90 CSS px, and this is measured, not
    // asserted: the `<img>` shrinks a wide logo to fit that height. 90 CSS px is a size that lives
    // outside the coordinate rule and drifts vs canvas pixels — a size question, not a position
    // one, and the guard below only checks positioning.
    widthCssPxAt1x: 90,
    heightCssPxAt1x: 90,
  },
  stateOverlay: {
    // StateOverlay pill, centred at the bottom.
    kind: 'dom',
    bottomFrac: 28 / 720, // EXACT — same value the CSS's `calc(28 / 720 * 100%)` produces
    // Centered by `left: 50%; transform: translateX(-50%)`. Width is font-driven and typically
    // 100-260 CSS px; the guard uses the widest measured on the finish frame (260 px).
    widthCssPxAt1x: 260,
    heightCssPxAt1x: 28,
    centered: true,
  },
  winnerCard: {
    // WinnerCard: percentages from the day the winner-card bug was fixed. This file did NOT
    // change WinnerCard.css — it is here so the guard can prove the CARD still clears the MINIMAP.
    kind: 'dom',
    leftFrac: 0.02, // 2% from the left, as `WinnerCard.css:47` sets
    bottomFrac: 0.26, // 26% from the bottom, as `WinnerCard.css:48` sets
    // The card is at most 30% wide of the wrapper (`max-width: 30%`), and grows upward from a
    // bottom anchor — a longer name moves it away from the minimap, never into it. Height is
    // font-driven and measured ~55 CSS px on the finish frame.
    widthFracMax: 0.3,
    heightCssPxAt1x: 55,
  },
};

/** Turn the anchors into a CSS-pixel rect at a wrapper size. Origin at the wrapper's top-left. */
export function overlayRectCssPx(key, { wrapperCssW, wrapperCssH }) {
  const a = OVERLAY_ANCHORS[key];
  if (!a) throw new Error(`unknown overlay: ${key}`);
  const scale = wrapperCssW / CANVAS_W;
  if (a.kind === 'canvas') {
    return {
      x: a.xCanvasPx * scale,
      y: a.yCanvasPx * scale,
      w: a.widthCanvasPx * scale,
      h: a.heightCanvasPx * scale,
    };
  }
  const w = a.widthFracMax != null ? a.widthFracMax * wrapperCssW : a.widthCssPxAt1x;
  const h = a.heightCssPxAt1x ?? 0;
  let x = 0;
  let y = 0;
  if (a.centered) {
    x = wrapperCssW / 2 - w / 2;
  } else if (a.leftFrac != null) {
    x = a.leftFrac * wrapperCssW;
  } else if (a.rightFrac != null) {
    x = wrapperCssW - a.rightFrac * wrapperCssW - w;
  }
  if (a.bottomFrac != null) {
    y = wrapperCssH - a.bottomFrac * wrapperCssH - h;
  } else if (a.topFrac != null) {
    y = a.topFrac * wrapperCssH;
  }
  return { x, y, w, h };
}

/**
 * The shipped anchors, kept here so a test can compare "before" and "after" at every size. Reading
 * them off the CSS is not portable across test environments; encoding them alongside the current
 * anchors is what makes "did anything move at any size" a measurement rather than an assertion.
 */
const SHIPPED_ANCHORS = {
  brandLogoBottomRight: { rightCssPx: 16, bottomCssPx: 16, widthCssPx: 90, heightCssPx: 90 },
  stateOverlay: { bottomCssPx: 28, widthCssPx: 260, heightCssPx: 28, centered: true },
};

/** The same rect calc, using the pre-COORD-SYSTEM anchors. */
export function overlayRectCssPxShipped(key, { wrapperCssW, wrapperCssH }) {
  const a = SHIPPED_ANCHORS[key];
  if (!a) return null;
  let x = 0;
  const y = wrapperCssH - a.bottomCssPx - a.heightCssPx;
  if (a.centered) x = wrapperCssW / 2 - a.widthCssPx / 2;
  else x = wrapperCssW - a.rightCssPx - a.widthCssPx;
  return { x, y, w: a.widthCssPx, h: a.heightCssPx };
}

/** True if two axis-aligned rectangles share any interior area. Boundary-touch does not count. */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
