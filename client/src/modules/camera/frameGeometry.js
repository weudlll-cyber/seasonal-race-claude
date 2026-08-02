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
