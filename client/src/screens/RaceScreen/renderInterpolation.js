// ============================================================
// File:        renderInterpolation.js
// Path:        client/src/screens/RaceScreen/renderInterpolation.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1
// Description: The interpolated racer snapshot RaceScreen hands the camera and the renderer while
//              a race runs: each racer's `t`, `x`, `y` and `angle` placed between the previous
//              physics step and the current one by the accumulator's leftover fraction.
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. Physics advances in fixed 16 ms steps, so between
// steps a frame would show every racer where the LAST step left it — the 2:1 judder a fixed
// timestep trades for determinism. This fills a reused buffer with the in-between pose. It sat
// inline in RaceScreen's frame loop; it reads the racers and writes only the buffer, never a
// physics field, and the decision WHETHER to use it (`frameTimingConfig.renderInterpolation` and
// the RACING phase) stays at the call site.
//
// ★ THE BUFFER HOLDS COPIES, NOT THE RACERS (renderInterpolation object identity). Each slot is a
// plain object refreshed with `Object.assign` every frame, so a consumer must never compare a slot
// to a racer by reference — use `r.index`.
//
// Moved verbatim (P4-RACESCREEN-SPLIT-1): same buffer reuse, same assignments in the same order.
// ============================================================

import { lerp, lerpAngle } from '../../utils/mathUtils.js';

/**
 * Fill `renderBuf` with the interpolated pose of every racer and return it.
 * `renderBuf` is pre-allocated once per race mount — Object.assign reuses existing objects rather
 * than spreading new ones each frame (eliminates N fat allocations/frame).
 *
 * @param {object[]} renderBuf  the race's reusable buffer, grown/truncated to `racers.length`
 * @param {object[]} racers     the physics racers (`_prevT/_prevX/_prevY/_prevAngle` from the step)
 * @param {number} renderAlpha  fraction of the next physics step already elapsed, in [0, 1]
 * @returns {object[]} `renderBuf`
 */
export function interpolateRacers(renderBuf, racers, renderAlpha) {
  const n = racers.length;
  while (renderBuf.length < n) renderBuf.push({});
  renderBuf.length = n;
  for (let _i = 0; _i < n; _i++) {
    const r = racers[_i];
    Object.assign(renderBuf[_i], r);
    renderBuf[_i].t = lerp(r._prevT ?? r.t, r.t, renderAlpha);
    renderBuf[_i].x = lerp(r._prevX ?? r.x, r.x, renderAlpha);
    renderBuf[_i].y = lerp(r._prevY ?? r.y, r.y, renderAlpha);
    renderBuf[_i].angle = lerpAngle(r._prevAngle ?? r.angle, r.angle, renderAlpha);
  }
  return renderBuf;
}
