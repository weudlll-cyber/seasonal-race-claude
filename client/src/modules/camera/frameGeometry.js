// ============================================================
// File:        frameGeometry.js
// Path:        client/src/modules/camera/frameGeometry.js
// Project:     RaceArena
// Created:     2026-08-02
// Description: Frame geometry the camera needs in DIRECTIONS, not on axes (CAMERA-PICTURE-FIXES-1).
//
//              WHY THIS EXISTS. `_applyLeaderForwardBias` needs "how far does the frame reach along
//              the subject's heading" so it can put the subject at a chosen fraction along that
//              axis. It computed it as `|cosθ|·W + |sinθ|·H` — a BLEND of the two side lengths.
//              That is right on both axes and wrong everywhere between them: the weights sum to
//              |cosθ| + |sinθ|, which is 1 on an axis and up to √2 on the diagonal, so the blend
//              over-states the frame by up to 41%. Measured at the owner's 74° heading: 1091.4 px
//              where the frame actually reaches 759.9 px — 1.436× over — which turned a
//              `leaderForwardFrac` of 0.66 into a 23.0pp displacement instead of the 16.0pp it asks
//              for. His eye caught it before any test did, because no test covered a diagonal.
//
//              This is the same SHAPE as the bsX/bsY defect the projection refactor retired: a
//              geometry formula that agrees with reality on the axes and diverges between them, so
//              every axis-aligned test passes against the bug. Both now live behind a named helper
//              rather than being written inline at the call site.
//
//              Pure: no state, no config, no imports.
// ============================================================

/**
 * The full extent of a centred W×H frame along a direction, in screen px.
 *
 * This is the chord of the rectangle through its centre in direction (dirX, dirY) — the distance
 * from one edge to the other along that heading, which is what "the subject sits at fraction f
 * along the frame" has to be measured against.
 *
 *   horizontal (1, 0) → W          vertical (0, 1) → H
 *   45° on a 1280×720 frame → 1018 px  (the blend it replaces said 1414)
 *
 * The rectangle is hit on whichever pair of sides the ray reaches first, hence the `min`.
 *
 * @param {number} dirX  screen-space direction, any length (need not be normalised)
 * @param {number} dirY
 * @param {number} frameW
 * @param {number} frameH
 * @returns {number} extent in screen px, or 0 for a degenerate direction/frame
 */
export function frameExtentAlong(dirX, dirY, frameW, frameH) {
  const len = Math.hypot(dirX, dirY);
  if (!(len > 0) || !(frameW > 0) || !(frameH > 0)) return 0;
  const c = Math.abs(dirX) / len;
  const s = Math.abs(dirY) / len;
  // A ray from the centre leaves through the vertical sides after W/2 ÷ c and through the
  // horizontal sides after H/2 ÷ s; the frame ends at whichever comes first. Doubled for the full
  // chord. c or s being 0 sends that term to Infinity, which `min` then ignores — exactly right,
  // because a ray parallel to a pair of sides never reaches them.
  const toVertical = c > 0 ? frameW / c : Infinity;
  const toHorizontal = s > 0 ? frameH / s : Infinity;
  return Math.min(toVertical, toHorizontal);
}

/**
 * How far a POINT in the frame can reach in a direction before leaving it — CAMERA-COMPANY-2.
 *
 * `frameExtentAlong` answers this for the centre, where the two halves are equal. Nothing else in
 * the frame has that symmetry: a subject pushed forward has more room behind it than ahead, and
 * exactly as much to either side as the rectangle allows in THAT direction. The company guarantee
 * measures from the anchor, not from the centre, so it needs this rather than a fraction of a chord.
 *
 * The region is the centred `framePct` sub-rectangle, so a margin can be kept at the edge without a
 * second parameter: `framePct` 0.9 reserves 5% of each side.
 *
 * @param {number} px  point x in frame coordinates (0 = left edge)
 * @param {number} py  point y in frame coordinates (0 = top edge)
 * @param {number} dirX  direction, any length
 * @param {number} dirY
 * @param {number} frameW
 * @param {number} frameH
 * @param {number} [framePct=1]  the centred fraction of the frame the point may reach into
 * @returns {number} distance in screen px; 0 when the point is already outside that region
 */
export function roomFromPointAlong(px, py, dirX, dirY, frameW, frameH, framePct = 1) {
  const len = Math.hypot(dirX, dirY);
  if (!(len > 0) || !(frameW > 0) || !(frameH > 0)) return 0;
  const pct = framePct > 1 ? 1 : framePct < 0 ? 0 : framePct;
  const ux = dirX / len;
  const uy = dirY / len;
  const marginX = (frameW * (1 - pct)) / 2;
  const marginY = (frameH * (1 - pct)) / 2;
  // Distance to each bounding line along the ray; a component of 0 never reaches its pair of sides.
  const toX = ux > 0 ? (frameW - marginX - px) / ux : ux < 0 ? (marginX - px) / ux : Infinity;
  const toY = uy > 0 ? (frameH - marginY - py) / uy : uy < 0 ? (marginY - py) / uy : Infinity;
  const room = Math.min(toX, toY);
  return room > 0 ? room : 0;
}
