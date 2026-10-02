// ============================================================
// File:        burstParticles.js
// Path:        client/src/screens/RaceScreen/burstParticles.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1
// Description: One frame of the finish-line burst particles (the ones `emitBurst` in
//              drawing/particleRendering.js spawns when a racer crosses): move, fall, fade, and
//              remove the faded ones. Render-only state — nothing here touches physics.
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. RaceScreen's frame loop carried this loop TWICE,
// once in the RACING branch and once in the FINISHED branch, as two inline copies that differ in
// exactly one line: the RACING copy also shrinks each particle (`p.r *= 0.97`), the FINISHED copy
// does not. One function now, and that one difference is the `shrink` argument — KEPT, not
// unified, because unifying it would change what the ending draws, and this piece changes no
// behaviour. Whether the difference was intended is not recorded anywhere; it is named here so a
// later reader does not have to rediscover it. It is its own module rather than a sibling of
// `emitBurst` because `drawing/` is the renderer's directory, inside the render fingerprint's
// reach, and this is per-frame state stepping that the screen does, as `racerDust.js` is.
//
// Moved verbatim (P4-RACESCREEN-SPLIT-1): same arithmetic, same order, same in-place mutation and
// swap-remove.
// ============================================================

/**
 * Advance the burst particles one frame — in-place mutation + swap-remove (no allocation).
 *
 * @param {object[]} burstParticles  the race's burst pool (`st.burstParticles`), mutated in place
 * @param {boolean} shrink           true in the RACING branch (radius × 0.97 per frame), false in
 *                                   the FINISHED branch — exactly as the two inline copies were
 */
export function advanceBurstParticles(burstParticles, shrink) {
  let i = 0;
  while (i < burstParticles.length) {
    const p = burstParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;
    p.alpha -= 0.014;
    if (shrink) p.r *= 0.97;
    if (p.alpha <= 0) {
      burstParticles[i] = burstParticles[burstParticles.length - 1];
      burstParticles.length--;
    } else i++;
  }
}
