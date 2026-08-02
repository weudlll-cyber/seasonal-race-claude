// ============================================================
// File:        zoomUnit.js
// Path:        client/src/modules/camera/zoomUnit.js
// Project:     RaceArena
// Created:     2026-08-02
// Description: THE camera's zoom unit (CAMERA-ZOOM-UNIT-1): TRACK WIDTHS.
//
//              The owner's design, in his words: "Eigentlich wird immer genau das Gleiche
//              angezeigt, ich kann aber über den Zoomfaktor steuern, wie viel ich wirklich sehen
//              will." One framing rule for every state; the state says WHO the camera is on, a
//              per-state number says HOW FAR IN. This module is that number's definition.
//
//              THE UNIT. `trackWidths` = how many track widths of world fit ACROSS THE FRAME —
//              measured on the SHORT screen axis. Two reasons it is the short axis and not the
//              long one:
//                1. The owner's floor is "at minimum I must see the full track width, so that in
//                   the worst case both racers are still visible". A track corridor is drawn
//                   horizontally at one point of the lap and vertically at another, so the honest
//                   guarantee has to hold on the WORST axis. Defining the parameter on that same
//                   axis makes the guarantee exactly `trackWidths >= 1` — his sentence IS the
//                   number, on every track, with no per-topology threshold to remember.
//                2. On every shipped track the short axis is Y (visible height / visible width is
//                   0.67 closed, 0.56 open), so "short axis" is not a moving target.
//
//              WHY IT IS RESOLUTION- AND TOPOLOGY-INVARIANT, by construction:
//                camZoom   = canvasH / (n * trackWidthPx * axisY)
//                effY      = camZoom * axisY = canvasH / (n * trackWidthPx)
//                visibleH  = canvasH / effY  = n * trackWidthPx        ← the world size cancels
//              The same n therefore shows the same number of track widths on a 3072-px closed
//              world and a 6144-px open one. That is the owner's precondition, met by algebra
//              rather than by calibration.
//
//              WHAT IT REPLACES. Five different formulas whose numbers did not mean the same
//              thing: four states used `spriteScale` (an absolute screen-px-per-world-px scale, so
//              the same setting framed 2.36 track widths on Mountainstreet and 5.40 on Searound)
//              and OVERVIEW derived its zoom from a target SPRITE SIZE normalised by
//              `2 x W_ref / racersPerRow` — a start-grid packing quantity whose racer-count
//              division was measured non-monotonic (30 racers 1.65 TW, 40 racers 2.48, 60 racers
//              1.65). Neither survives here. There is no sprite size in this file.
//
//              Pure: no state, no config reads, no imports. Everything the caller needs to test it
//              is an argument.
// ============================================================

/** Reference canvas the projection's axis scales are defined against. */
const CANVAS_W = 1280;
const CANVAS_H = 720;

/**
 * The cam.zoom that shows exactly `trackWidths` track widths across the short (Y) screen axis.
 *
 * @param {number} trackWidths   the setting, in track widths (> 0)
 * @param {number} trackWidthPx  the track's corridor width in world px
 * @param {number} axisY         the projection's world->screen Y scale at cam.zoom = 1
 * @param {number} [canvasH]     canvas height the projection is defined against
 * @returns {number} cam.zoom (unclamped — the caller applies the projection range and the guarantee)
 */
export function camZoomForTrackWidths(trackWidths, trackWidthPx, axisY, canvasH = CANVAS_H) {
  if (!(trackWidths > 0) || !(trackWidthPx > 0) || !(axisY > 0)) return NaN;
  return canvasH / (trackWidths * trackWidthPx * axisY);
}

/**
 * The inverse: how many track widths a given cam.zoom actually shows across the short axis.
 * This is what a test or a diagnostic should assert on — it reads the picture, not the setting.
 */
export function trackWidthsForCamZoom(camZoom, trackWidthPx, axisY, canvasH = CANVAS_H) {
  if (!(camZoom > 0) || !(trackWidthPx > 0) || !(axisY > 0)) return NaN;
  return canvasH / (camZoom * axisY * trackWidthPx);
}

/**
 * How many track widths are visible on EACH axis at a cam.zoom. The long axis follows from the
 * projection's aspect ratio and is reported, never set: closed tracks scale X and Y differently
 * (an 18.5% anisotropy that predates this block), so the long axis shows 1.50x the short-axis
 * count on a closed track and 1.78x on an open one.
 */
export function visibleTrackWidths(
  camZoom,
  trackWidthPx,
  axisX,
  axisY,
  canvasW = CANVAS_W,
  canvasH = CANVAS_H
) {
  return {
    across: trackWidthsForCamZoom(camZoom, trackWidthPx, axisY, canvasH),
    along: trackWidthsForCamZoom(camZoom, trackWidthPx, axisX, canvasW),
  };
}

/**
 * THE GUARANTEE (Part B): the full track width is always visible.
 *
 * Returns the TIGHTEST cam.zoom at which a full track width still fits on BOTH axes. It is a
 * ceiling on how far in the camera may go — a guarantee that WIDENS the shot when a setting asks
 * for more than it allows. It never steers, never moves the centre, and never picks a subject
 * (Lesson 192); a caller applies it with `Math.min` and nothing else.
 *
 * Under this unit the guarantee is exactly `trackWidths >= 1` on the short axis. The X term is
 * kept anyway so the guarantee stays correct if a future canvas or projection makes X the shorter
 * axis — the property must not depend on which axis happens to be smaller today.
 */
export function guaranteeCamZoom(
  trackWidthPx,
  axisX,
  axisY,
  canvasW = CANVAS_W,
  canvasH = CANVAS_H
) {
  if (!(trackWidthPx > 0)) return Infinity;
  const byX = axisX > 0 ? canvasW / (trackWidthPx * axisX) : Infinity;
  const byY = axisY > 0 ? canvasH / (trackWidthPx * axisY) : Infinity;
  return Math.min(byX, byY);
}

/**
 * Resolve a state's setting into a cam.zoom: the unit, then the guarantee, then the projection's
 * own physical range. ONE function, used by every state — that is the whole point of the block.
 *
 * @param {number} trackWidths  the state's setting
 * @param {object} p
 * @param {number} p.trackWidthPx
 * @param {number} p.axisX
 * @param {number} p.axisY
 * @param {(z:number)=>number} p.clampCamZoom  the projection's range clamp
 * @param {number} [p.fallbackTrackWidths]     used when the setting is not a finite positive number
 * @returns {number} cam.zoom
 */
export function resolveZoomForTrackWidths(
  trackWidths,
  { trackWidthPx, axisX, axisY, clampCamZoom, fallbackTrackWidths = 2 }
) {
  const n = Number.isFinite(trackWidths) && trackWidths > 0 ? trackWidths : fallbackTrackWidths;
  const raw = camZoomForTrackWidths(n, trackWidthPx, axisY);
  if (!Number.isFinite(raw)) return clampCamZoom(NaN);
  // The guarantee outranks the setting: asking for less than one track width gets one track width.
  const guaranteed = Math.min(raw, guaranteeCamZoom(trackWidthPx, axisX, axisY));
  return clampCamZoom(guaranteed);
}
