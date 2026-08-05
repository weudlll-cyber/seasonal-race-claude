// ============================================================
// File:        hudLayout.js
// Path:        client/src/screens/RaceScreen/hudLayout.js
// Project:     RaceArena — CAMERA-COMPANY-ONLY-2 §1
//
// WHY THIS EXISTS: the build-identity line we added to stop the owner misreading the screen ended up
// drawn on top of the LAP counter. Two right-aligned things, in two different files, each with its
// own hardcoded y — `34`/`54` for the pills in renderRaceFrame.js and a bare `66` inside
// drawLapInfo. Neither knew the other existed, so nothing could have prevented the collision.
//
// THE FIX IS A LAYOUT, NOT A NUDGE. Moving the build line down by a magic offset would have worked
// today and broken the next time somebody added a row or changed the canvas size — that is precisely
// the class of defect this project has paid for repeatedly. Instead there is ONE owner of the
// right-hand HUD column: it stacks the rows in order, sizes everything as a FRACTION OF THE FRAME
// per the standing rule, and returns rectangles. A row cannot overlap another row because it is
// placed after it, not at a number somebody chose.
//
// The reference is the 720-px canvas the rest of the HUD was drawn against, so at the default size
// the picture is close to what it was; at any other size it now scales instead of drifting.
// ============================================================

/** Fractions of frame height. Named so the arithmetic below reads as intent, not as magic. */
const TOP_MARGIN_FRAC = 0.0111; // 8 px at 720
const ROW_GAP_FRAC = 0.0056; // 4 px at 720
const RIGHT_MARGIN_FRAC = 0.00625; // 8 px at a 1280 width

const ROWS = [
  // key, height fraction, font fraction — in draw order, top to bottom.
  { key: 'racePlan', hFrac: 0.0306, fontFrac: 0.0153 }, // 22 px tall, 11 px font
  { key: 'cfg', hFrac: 0.0278, fontFrac: 0.0139 }, // 20 px tall, 10 px font
  { key: 'lap', hFrac: 0.0306, fontFrac: 0.025 }, // 22 px tall, 18 px font
  { key: 'build', hFrac: 0.0278, fontFrac: 0.0139 }, // 20 px tall, 10 px font
];

/**
 * The right-hand HUD column, as rectangles.
 *
 * Rows that are not shown still occupy no space: pass `visible` and the stack closes up, so hiding
 * the Race Plan pill does not leave a hole and does not change what the rows below can collide with.
 *
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {Record<string, boolean>} [visible]  key -> shown; absent means shown
 * @returns {Record<string, {x:number, y:number, h:number, fontPx:number, right:number}>}
 *   `right` is the right edge to align against; `x` is the same value, kept for callers that read
 *   a rectangle rather than an alignment point.
 */
export function hudRightColumn(canvasW, canvasH, visible = {}) {
  const right = canvasW - Math.round(canvasW * RIGHT_MARGIN_FRAC);
  let y = Math.round(canvasH * TOP_MARGIN_FRAC);
  const gap = Math.round(canvasH * ROW_GAP_FRAC);
  const out = {};
  for (const row of ROWS) {
    const shown = visible[row.key] !== false;
    const h = Math.max(10, Math.round(canvasH * row.hFrac));
    const fontPx = Math.max(8, Math.round(canvasH * row.fontFrac));
    out[row.key] = { x: right, right, y, h, fontPx, shown };
    if (shown) y += h + gap;
  }
  return out;
}

/**
 * Do two laid-out rows overlap vertically? They are all right-aligned, so a vertical overlap IS an
 * overlap — this is the predicate the regression test asserts against, kept next to the layout it
 * describes so the two cannot drift apart.
 */
export function rowsOverlap(a, b) {
  if (!a?.shown || !b?.shown) return false;
  return a.y < b.y + b.h && b.y < a.y + a.h;
}
