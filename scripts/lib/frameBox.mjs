// ============================================================
// File:        scripts/lib/frameBox.mjs
// Project:     RaceArena — ONE-HOME-THREE-TRUTHS-1
//
// "IS THIS POINT IN THE PICTURE?" — one home for the one condition every camera instrument asks.
//
// WHY THIS FILE EXISTS. The condition was spelled out SIX times across FIVE files:
//   scripts/contender-truth.mjs:293 · scripts/diag/runin-forward-reach.mjs:102
//   scripts/diag/runin-pin-drift.mjs:96 · scripts/diag/start-frame-capture.mjs:360
//   scripts/straggler-truth.mjs:159 and :176
// every one of them written as `p.x >= 0 && p.x <= CW && p.y >= 0 && p.y <= CH`, and every one of
// them AGREEING — which is the dangerous variant. Six copies of a predicate agree until one of them
// is edited, and the harness that then disagrees does not report a disagreement: it reports a
// DIFFERENT NUMBER OF RACERS ON SCREEN, which reads as a finding about the camera.
//
// THE INCLUSIVE BOUNDS ARE PRESERVED EXACTLY, and they are a real decision rather than an
// oversight: a racer whose projected centre lands exactly on x = 0 is counted as in frame. Every
// one of the six copies used `>=` and `<=`; changing that here would silently move a number in five
// instruments at once, which is exactly what this file exists to prevent. If the boundary should be
// exclusive, that is a change to make deliberately, in one place, with the numbers re-measured.
//
// THIS IS THE FRAME, NOT THE SAFE AREA. It answers whether a point is inside the canvas at all. The
// inner framing box — the region the director tries to keep the field inside — is a different
// quantity and lives in `client/src/modules/camera/framingConfig.js`.
// ============================================================

/**
 * True when a projected point lies within the canvas, bounds INCLUSIVE.
 *
 * @param {{x: number, y: number}} p projected screen point
 * @param {number} cw canvas width in screen px
 * @param {number} ch canvas height in screen px
 * @returns {boolean}
 */
export function inFrame(p, cw, ch) {
  // A PURE TRANSCRIPTION of the six copies — no null guard was added. All six call sites take `p`
  // straight from `cd._proj.toScreen(...)`, which always returns an object, so a guard would be
  // dead code that also quietly changed what a null would do (throw, today) in five instruments.
  return p.x >= 0 && p.x <= cw && p.y >= 0 && p.y <= ch;
}

/**
 * How many of a list of projected points are in frame.
 * @param {Array<{x: number, y: number}>} points
 * @param {number} cw
 * @param {number} ch
 * @returns {number}
 */
export function countInFrame(points, cw, ch) {
  let n = 0;
  for (const p of points) if (inFrame(p, cw, ch)) n++;
  return n;
}
