// ============================================================
// File:        resolveCamera.js
// Path:        client/src/modules/camera/resolveCamera.js
// Project:     RaceArena
// Created:     2026-05-07
//
// WHAT THIS IS FOR: fitting a DESIRED shot inside the world. Given a world target and the bounds,
// it returns where the camera actually sits and at what effective zoom, backing the zoom off in
// steps when the target cannot otherwise be framed.
//
// WHAT IT IS NOT FOR: choosing the desired shot. The state's setting and the guarantees have
// already decided that, before this is called — this is the last step and it only ever loosens.
//
//              Guarantees:
//              1. Background never shows black borders (pan clamped to world bounds).
//              2. Target is within the inner-frame percentage if a wider shot can bring it there
//                 (zoom is reduced in steps while each step moves the target CLOSER to the inner
//                 frame, and stops at minEffZoom).
//
//              All coordinates are in world space.
//              effectiveZoom = world-to-screen scale factor (bsX×cam.zoom for closed,
//              BASE_ZOOM×cam.zoom for open — the pipeline converts back as needed).
//
// ── THE SECOND GUARANTEE HAS A CONDITION NOW, AND IT IS NOT A TUNING NUMBER (RESOLVE-CONVERGE-1) ──
//
// It used to read "if physically possible" and pursue that by widening to the floor. But nothing
// asked whether the widening was getting anywhere. Where it is not, the loop ran forty steps, gave
// away everything down to the projection minimum, and delivered a target that was outside the inner
// frame at the start and further outside at the end. Measured on ice-track: the shot asked for 68%
// of the world and was handed 100%, with `targetInInnerFrame` false on every frame of the run.
//
// SO THE LOOP NOW CHECKS ITS OWN PROGRESS: `frameMiss` is how far outside the inner band the target
// lands, in screen px, on the worse axis. A step is taken only when it strictly reduces that number.
// The first step that buys nothing ends the loop and the NARROWER shot is what ships — the target
// stays where the world-bounds clamp puts it, which is where it was going to end up in any case.
//
// WHY A PROGRESS TEST RATHER THAN AN UP-FRONT UNREACHABILITY TEST. Both were available, and the
// unreachability one is NOT the one-liner it first looks like. The target only ever falls outside
// the inner frame when the pan is CLAMPED — an unclamped pan centres it exactly — and there are two
// clamped regimes, which answer this question in opposite directions:
//
//   THE WORLD IS WIDER THAN THE FRAME on that axis. The clamp pins the frame to the near world
//   edge, and the target's screen position is `distance-from-that-edge x effZoom`. Widening shrinks
//   a product, so the target slides FURTHER out. Every step here is futile, always.
//
//   THE WORLD IS SMALLER THAN THE FRAME on that axis. The whole world is on screen and the frame
//   cannot move at all; the target's position is `distance-from-the-world-origin x effZoom`, which
//   widening pulls back toward the frame origin. A violation on the FAR side genuinely improves.
//
// So an up-front test would have had to encode both regimes and the boundary between them, and it
// would be wrong the day the clamp changes. The progress test measures the same thing without
// asserting any of it, needs no threshold — only a comparison — and keeps working if some later pan
// rule makes widening useful somewhere new.
//
// WHAT THE GREEDY STOP GIVES UP, stated rather than hidden: a miss that gets worse before it gets
// better would stop the loop at the stall. That requires widening PAST the point where the world
// fits the frame on the violated axis, and on X that point IS the floor — `minCamZoom` is defined as
// exactly "the world width fits" in both shipped projections — so on X it cannot happen at all.
// Measured, nothing is given up anywhere: across ten tracks x 3 seeds x a whole race, 172226 frames
// on each arm, the loop converged on ZERO of them. It has never once done what it exists to do.
//
// WHAT IT COSTS THE PICTURE. Where the goal is unreachable, the frame stays as tight as the shot
// asked for and the subject sits nearer the frame edge than `innerFramePct` wanted — the position
// the clamp was always going to force. What it no longer does is pay world width for that same
// position.
// ============================================================

const ZOOM_STEP = 0.9; // reduce effective zoom by 10% per step while stepping still helps
const MAX_STEPS = 40; // safety cap; 0.9^40 ≈ 0.015 — far below any practical minEffZoom

/**
 * Resolve the final camera pan (world-space top-left) and effective zoom.
 *
 * @param {object} params
 * @param {{ x: number, y: number }} params.targetWorld
 *   World-coordinate point the camera should center on.
 * @param {number} params.desiredEffZoom
 *   Desired effective zoom (world → screen scale). May be reduced if the target
 *   cannot be kept in the inner frame at this zoom.
 * @param {{ minX?: number, minY?: number, maxX: number, maxY: number }} params.worldBounds
 *   Background image extent in world coordinates.
 *   Defaults: minX=0, minY=0. maxX and maxY are required.
 * @param {{ width: number, height: number }} params.frameSize
 *   Canvas/viewport dimensions in screen pixels.
 * @param {number} [params.innerFramePct=0.70]
 *   Target must land within the central innerFramePct of the frame (each axis).
 *   Expressed as a fraction 0–1. Default 0.70 = inner 70%.
 * @param {number} [params.minEffZoom=0]
 *   Floor for zoom reduction. When effectiveZoom reaches this value, the loop
 *   stops regardless of whether the target is in the inner frame.
 *   Typically set to the OVERVIEW effective zoom (world fully visible).
 *   It is no longer the usual reason the loop stops — see the header.
 * @returns {{
 *   camX: number,           // world x of viewport top-left
 *   camY: number,           // world y of viewport top-left
 *   effectiveZoom: number,  // final effective zoom (≤ desiredEffZoom, ≥ minEffZoom)
 *   wasClamped: boolean,    // true if ideal pan was clamped to background bounds
 *   wasZoomAdapted: boolean,// true if zoom was reduced from desiredEffZoom
 *   targetInInnerFrame: boolean  // true if target landed in the inner frame area
 * }}
 */
export function resolveCamera({
  targetWorld,
  desiredEffZoom,
  worldBounds,
  frameSize,
  innerFramePct = 0.7,
  minEffZoom = 0,
}) {
  const { width: fw, height: fh } = frameSize;
  const { minX = 0, minY = 0, maxX: bMaxX, maxY: bMaxY } = worldBounds;
  const safeMin = Math.max(0, minEffZoom);

  let effZoom = Math.max(safeMin, desiredEffZoom);
  let attempt = _attempt(targetWorld, effZoom, minX, minY, bMaxX, bMaxY, fw, fh, innerFramePct);
  let wasZoomAdapted = false;

  for (let step = 0; step < MAX_STEPS; step++) {
    if (attempt.targetInInnerFrame || effZoom <= safeMin) break;
    const next = Math.max(safeMin, effZoom * ZOOM_STEP);
    if (next >= effZoom) break; // minEffZoom >= effZoom: already at floor, give up
    const widened = _attempt(targetWorld, next, minX, minY, bMaxX, bMaxY, fw, fh, innerFramePct);
    // THE STEP HAS TO BUY SOMETHING. A wider shot that leaves the target no closer to the inner
    // frame — or further from it — is width spent for nothing, and every step after it spends more
    // for the same nothing. Keep the narrower shot instead. See the header for why this is a
    // measurement rather than a proof, and for what it means for the picture.
    if (widened.frameMiss >= attempt.frameMiss) break;
    effZoom = next;
    attempt = widened;
    wasZoomAdapted = true;
  }

  // `frameMiss` is the loop's own instrument and not part of the answer — stripped so the returned
  // shape is exactly what the JSDoc above promises.
  const { frameMiss: _miss, ...resolved } = attempt;
  return { ...resolved, effectiveZoom: effZoom, wasZoomAdapted };
}

/**
 * Single pan attempt at a given effectiveZoom.
 * Returns camX/Y (world-space top-left), clamping flags, the in-frame check, and `frameMiss` —
 * how far outside the inner band the target lands, in screen px, on whichever axis is worse
 * (0 when it is inside). That number is what the caller's loop compares between steps.
 * Does NOT include effectiveZoom or wasZoomAdapted in the returned object.
 */
function _attempt(targetWorld, effZoom, bMinX, bMinY, bMaxX, bMaxY, fw, fh, innerFramePct) {
  // Step 1: ideal pan — center target on screen
  const idealCamX = targetWorld.x - fw / (2 * effZoom);
  const idealCamY = targetWorld.y - fh / (2 * effZoom);

  // Step 2: background bounds at this zoom — ensures no black borders
  const camXMin = bMinX;
  const camXMax = Math.max(bMinX, bMaxX - fw / effZoom);
  const camYMin = bMinY;
  const camYMax = Math.max(bMinY, bMaxY - fh / effZoom);

  // Step 3: clamp ideal pan to background bounds
  const camX = Math.max(camXMin, Math.min(camXMax, idealCamX));
  const camY = Math.max(camYMin, Math.min(camYMax, idealCamY));
  const wasClamped = Math.abs(camX - idealCamX) > 0.01 || Math.abs(camY - idealCamY) > 0.01;

  // Step 4: check if target lands within inner frame
  const screenTargetX = (targetWorld.x - camX) * effZoom;
  const screenTargetY = (targetWorld.y - camY) * effZoom;
  const marginX = (fw * (1 - innerFramePct)) / 2;
  const marginY = (fh * (1 - innerFramePct)) / 2;
  // How far outside the inner band, on the worse axis, in screen px. Zero means inside — so this is
  // the same test the boolean used to make on its own, plus the distance the loop needs to tell
  // progress from stalemate.
  const frameMiss = Math.max(
    0,
    marginX - screenTargetX,
    screenTargetX - (fw - marginX),
    marginY - screenTargetY,
    screenTargetY - (fh - marginY)
  );

  return { camX, camY, wasClamped, targetInInnerFrame: frameMiss <= 0, frameMiss };
}
