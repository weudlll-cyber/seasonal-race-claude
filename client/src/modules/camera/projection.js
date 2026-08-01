// ============================================================
// File:        projection.js
// Path:        client/src/modules/camera/projection.js
// Project:     RaceArena
// Created:     2026-08-01
// Description: THE single world<->screen mapping for the camera (CAMERA-PROJECTION-1).
//
//              Every camera state, guardrail and diagnostic goes through this object.
//              Nothing else in the camera path may write `x * zoom * scale + offset` by hand.
//
//              WHY THIS EXISTS. Before this module the director carried TWO world->screen
//              spaces and branched on `isOpenTrack` at ~28 sites to pick between them:
//                closed  cam.zoom = 1.0 means "the whole world width fits the canvas"
//                        (per-axis: bsX = canvasW/worldW on X, bsY = canvasH/worldH on Y)
//                open    cam.zoom = 1.0 means "1.5 screen px per world px"
//                        (uniform: the same 1.5 on BOTH axes)
//              Those are two different meanings for the same field, and every camera defect
//              of the past week traced back to code that assumed one of them. The two are NOT
//              a track-shape distinction — a loop and a line project identically. They are a
//              SCALE distinction that happened to correlate with topology because every closed
//              track ships at 3072 px and every open track at 4096-6144 (CAMERA-REFACTOR-1 B2).
//
//              This module keeps both mappings — changing them would change the picture — but
//              makes them DATA held in one place instead of a branch repeated at every call
//              site. The single decision now lives in `projectionForTrack()`.
//
//              PER-AXIS IS THE POINT. X and Y are NOT the same scale on a closed track
//              (dirt-oval: bsX 0.4167 vs bsY 0.3517, an 18.5% mismatch). Using bsX for Y is
//              the CAMERA-FOCUS-5 defect, and it has been written three separate times. Every
//              accessor here is per-axis so it cannot be written a fourth.
// ============================================================

/** Base zoom multiplier for open tracks — the uniform world->screen scale at cam.zoom = 1. */
export const OPEN_TRACK_BASE_ZOOM = 1.5;

/** Reference canvas the world<->screen scales are defined against. */
export const REFERENCE_CANVAS_W = 1280;
export const REFERENCE_CANVAS_H = 720;

/** Ceiling for cam.zoom. See `maxCamZoom` — this is a cap in cam.zoom space, not effective zoom. */
export const MAX_CAM_ZOOM = 10.0;

/**
 * Build the world<->screen projection for one race.
 *
 * @param {object} p
 * @param {number} p.worldW        world width in world px
 * @param {number} p.worldH        world height in world px
 * @param {number|null} p.uniformScale
 *   null  -> per-axis world-relative scale (axisX = REFERENCE_CANVAS_W/worldW,
 *            axisY = REFERENCE_CANVAS_H/worldH). This is the closed-track mapping.
 *   number-> that value on BOTH axes. This is the open-track mapping (OPEN_TRACK_BASE_ZOOM).
 * @param {number} p.minCamZoom    the loosest cam.zoom this projection allows
 * @returns {object} the projection (frozen)
 */
export function makeProjection({ worldW, worldH, uniformScale = null, minCamZoom = 1.0 }) {
  const w = worldW > 0 ? worldW : REFERENCE_CANVAS_W;
  const h = worldH > 0 ? worldH : REFERENCE_CANVAS_H;
  // The world-relative scale that fits the whole world width into the reference canvas.
  // Historically `bsX` / `overviewZoom` — the same number under two names.
  const worldFitX = REFERENCE_CANVAS_W / w;
  const worldFitY = REFERENCE_CANVAS_H / h;
  const axisX = uniformScale != null ? uniformScale : worldFitX;
  const axisY = uniformScale != null ? uniformScale : worldFitY;

  const proj = {
    worldW: w,
    worldH: h,
    /** world->screen scale on each axis at cam.zoom = 1. NOT equal to each other on closed tracks. */
    axisX,
    axisY,
    /** true when both axes share one scale (the open-track mapping). Diagnostics only. */
    isUniform: axisX === axisY,
    /** the cam.zoom at which the whole world width fits the reference canvas width. */
    worldFitCamZoom: uniformScale != null ? worldFitX / uniformScale : 1.0,
    /** the loosest / tightest cam.zoom this projection allows. */
    minCamZoom,
    maxCamZoom: MAX_CAM_ZOOM,

    /** Effective world->screen scale on X for a given cam.zoom (screen px per world px). */
    effX(camZoom) {
      return camZoom * axisX;
    },
    /** Effective world->screen scale on Y. Differs from effX on every non-square closed world. */
    effY(camZoom) {
      return camZoom * axisY;
    },
    /** The cam.zoom that produces a given effective X scale — the inverse of effX. */
    camZoomForEffX(effZoomX) {
      return effZoomX / axisX;
    },

    /**
     * Project a world point to canvas pixels. THE only sanctioned world->screen call.
     * @param {{x:number,y:number}} pt
     * @param {number} camZoom
     * @param {number} offsetX  canvas-px pan offset (this.offsetX)
     * @param {number} offsetY
     */
    toScreen(pt, camZoom, offsetX, offsetY) {
      return { x: pt.x * camZoom * axisX + offsetX, y: pt.y * camZoom * axisY + offsetY };
    },

    /** Width of the world strip visible at this cam.zoom, in world px. */
    visibleWorldW(camZoom, canvasW = REFERENCE_CANVAS_W) {
      return canvasW / (camZoom * axisX);
    },
    /** Height of the world strip visible at this cam.zoom, in world px. */
    visibleWorldH(camZoom, canvasH = REFERENCE_CANVAS_H) {
      return canvasH / (camZoom * axisY);
    },

    /** Clamp a raw cam.zoom into this projection's allowed range. */
    clampCamZoom(camZoom) {
      if (!Number.isFinite(camZoom)) return minCamZoom;
      return Math.max(minCamZoom, Math.min(MAX_CAM_ZOOM, camZoom));
    },

    /**
     * The loosest EFFECTIVE zoom this projection allows (minCamZoom expressed on the X axis).
     * `resolveCamera` reduces zoom until the target is framed and stops here.
     */
    minEffX() {
      return minCamZoom * axisX;
    },
  };
  return Object.freeze(proj);
}

/**
 * The ONE place that turns a track's topology into a projection. This is the single surviving
 * open/closed decision in the scale path — the ~28 branches it replaces are listed in
 * reports/evolution/CAMERA-PROJECTION-1.md.
 *
 * The two mappings are preserved exactly as they were, including their different minimum zooms:
 *   closed  minCamZoom 1.0            -> can zoom out to the whole world width
 *   open    minCamZoom = worldFitX    -> can zoom out to 1/1.5 of that (67% of the world width)
 * Unifying THOSE two numbers would change the picture and belongs to the slider-unit block.
 *
 * @param {number} worldW
 * @param {number} worldH
 * @param {boolean} isOpenTrack
 */
export function projectionForTrack(worldW, worldH, isOpenTrack) {
  const worldFitX = REFERENCE_CANVAS_W / (worldW > 0 ? worldW : REFERENCE_CANVAS_W);
  return isOpenTrack
    ? makeProjection({
        worldW,
        worldH,
        uniformScale: OPEN_TRACK_BASE_ZOOM,
        minCamZoom: worldFitX,
      })
    : makeProjection({ worldW, worldH, uniformScale: null, minCamZoom: 1.0 });
}
