// ============================================================
// File:        corridorOverlay.js
// Path:        client/src/screens/RaceScreen/drawing/corridorOverlay.js
// Project:     RaceArena — CORRIDOR-OVERLAY-1
//
// WHAT THIS IS FOR: making the LOGICAL corridor visible, because two people arguing about numbers
// could not settle where it is.
//
// The dispute it exists to end: a measurement said the camera's centre sits inside the track
// corridor at the gun on river-run; the owner's screenshot shows that centre in the bank, with the
// racers plainly on the water. Both cannot be true, and no further arithmetic was going to say which
// — the corridor is a quantity nothing draws, so nobody had ever seen it.
//
// It draws exactly three things, and nothing it draws is inferred:
//   • the CENTRELINE, from `shape.getPosition(t, 0)` — the same call the camera's heading uses
//   • BOTH CORRIDOR EDGES, from `shape.getPosition(t, ±trackWidthPx/2)` — the same half-width the
//     corridor guarantee and the zoom unit are expressed in
//   • a CROSS on the frame's centre, in screen space, which is the point under dispute
//
// DIAGNOSTIC ONLY, DEFAULT OFF. It is drawn after the world layers and before the racers, so it can
// never hide a racer — the question is where the racers sit RELATIVE to it, and a line painted over
// them would beg that question.
// ============================================================

/** How many samples along the path. Enough that a serpentine reads as a curve, not a polygon. */
const SAMPLES = 400;

/**
 * Draw the logical corridor into the world-space layer.
 *
 * Called INSIDE the world transform, so it works in world coordinates like the track surface does.
 * Line widths are divided by the effective zoom so they stay a constant thickness on screen at any
 * zoom — the same trick the trails use.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} shape  EditorShape
 * @param {number} trackWidthPx  kept for the caller's clarity; the edges come from the shape's own
 *        normalised offset, which is what actually defines them
 * @param {number} effZoomX  effective world→screen scale, for constant-thickness lines
 */
export function drawCorridorOverlay(ctx, shape, trackWidthPx, effZoomX) {
  if (!shape) return;
  const inv = 1 / (effZoomX > 0 ? effZoomX : 1);
  // THE OFFSET IS NORMALISED, NOT WORLD PIXELS. `EditorShape.getPosition(t, offset)` computes
  // `offset * this._centerWidth`, so +/-1 IS the corridor edge and a world-px value sent here goes
  // that many half-widths off the map. Passing `trackWidthPx / 2` drew the edges 150 half-widths
  // away — off the world entirely, which is why they were invisible in the first capture.
  const EDGE = 1;

  const path = (lateral) => {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= SAMPLES; i++) {
      const p = shape.getPosition(i / SAMPLES, lateral);
      if (!p) continue;
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  };

  ctx.save();
  ctx.globalAlpha = 1;
  // The two edges first, in one colour, so the corridor reads as a band.
  ctx.strokeStyle = '#ff2d55';
  ctx.lineWidth = 3 * inv;
  ctx.setLineDash([]);
  path(EDGE);
  path(-EDGE);
  // The centreline, dashed, so it cannot be mistaken for an edge.
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2 * inv;
  ctx.setLineDash([12 * inv, 8 * inv]);
  path(0);
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw the cross on the frame's centre, in SCREEN space.
 *
 * Called after the world transform is restored, so it is fixed to the frame rather than to the
 * world — which is the whole point: the claim under test is about where the frame's centre lands.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasW
 * @param {number} canvasH
 */
export function drawFrameCentreCross(ctx, canvasW, canvasH) {
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const arm = 28;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  // A dark backing stroke, so the cross is legible over water and over bank alike.
  for (const [w, colour] of [
    [6, 'rgba(0,0,0,0.75)'],
    [2, '#ffee00'],
  ]) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy);
    ctx.lineTo(cx + arm, cy);
    ctx.moveTo(cx, cy - arm);
    ctx.lineTo(cx, cy + arm);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
