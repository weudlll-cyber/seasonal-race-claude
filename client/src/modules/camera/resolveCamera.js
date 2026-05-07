// ============================================================
// File:        resolveCamera.js
// Path:        client/src/modules/camera/resolveCamera.js
// Project:     RaceArena
// Created:     2026-05-07
// Description: Layer 2 of the camera pan reform — pure function that resolves
//              the final camera pan position and effective zoom, given a world-
//              coordinate target and background bounds.
//
//              Guarantees:
//              1. Background never shows black borders (pan clamped to world bounds).
//              2. Target is within the inner-frame percentage if physically possible
//                 (zoom is reduced in steps until target is in-frame OR minEffZoom hit).
//
//              All coordinates are in world space.
//              effectiveZoom = world-to-screen scale factor (bsX×cam.zoom for closed,
//              BASE_ZOOM×cam.zoom for open — the pipeline converts back as needed).
// ============================================================

const ZOOM_STEP = 0.9; // reduce effective zoom by 10% per step when target is out-of-frame
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
  let wasZoomAdapted = false;

  for (let step = 0; step < MAX_STEPS; step++) {
    const attempt = _attempt(targetWorld, effZoom, minX, minY, bMaxX, bMaxY, fw, fh, innerFramePct);
    if (attempt.targetInInnerFrame || effZoom <= safeMin) {
      return { ...attempt, effectiveZoom: effZoom, wasZoomAdapted };
    }
    const next = Math.max(safeMin, effZoom * ZOOM_STEP);
    if (next >= effZoom) break; // minEffZoom >= effZoom: already at floor, give up
    effZoom = next;
    wasZoomAdapted = true;
  }

  // Reached MAX_STEPS or minEffZoom — return best effort
  const final = _attempt(targetWorld, effZoom, minX, minY, bMaxX, bMaxY, fw, fh, innerFramePct);
  return { ...final, effectiveZoom: effZoom, wasZoomAdapted };
}

/**
 * Single pan attempt at a given effectiveZoom.
 * Returns camX/Y (world-space top-left), clamping flags, and in-frame check.
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
  const targetInInnerFrame =
    screenTargetX >= marginX &&
    screenTargetX <= fw - marginX &&
    screenTargetY >= marginY &&
    screenTargetY <= fh - marginY;

  return { camX, camY, wasClamped, targetInInnerFrame };
}
