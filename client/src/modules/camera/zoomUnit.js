// ============================================================
// File:        zoomUnit.js
// Path:        client/src/modules/camera/zoomUnit.js
// Project:     RaceArena
// Created:     2026-08-02
// Description: THE camera's zoom unit (CAMERA-REFERENCE-WIDTH-1): STANDARD CORRIDORS.
//
//              The owner's design, in his words: "Eigentlich wird immer genau das Gleiche
//              angezeigt, ich kann aber über den Zoomfaktor steuern, wie viel ich wirklich sehen
//              will." One framing rule for every state; the state says WHO the camera is on, a
//              per-state number says HOW FAR IN. This module is that number's definition.
//
//              THE UNIT. `visibleCorridors` = how much world is in shot, measured in STANDARD
//              corridors, on the SHORT screen axis. A standard corridor is one width in world
//              pixels — `referenceCorridorPx`, a Dev Screen value — and NOT the track's own width.
//
//              WHY IT IS NO LONGER THE TRACK'S OWN WIDTH. CAMERA-ZOOM-UNIT-1 divided by the actual
//              corridor, which made the owner's sentence exactly the number ("1.0 = the full track
//              width"). It also made the picture uneven in a way he could see. Measured across all
//              ten tracks at 40 racers, a racer's height on screen came out as
//
//                  racer / frame  =  1.9 / (racers per row)
//
//              because the track width cancels on BOTH sides — the camera divides by it, and the
//              start-grid packing sizes the sprite from it. What survives is an integer. Searound
//              is the extreme on both counts at once (the narrowest corridor, 131 px, carrying the
//              biggest animal, the manta), so only 6 fit in a row and the racer filled 31.7% of the
//              frame against Mountainstreet's 9.5% — a 3.33x spread with no author behind it.
//              Dividing by a FIXED reference drops that spread to 2.21x, and the remainder is
//              exactly the spread of the AUTHORED creature sizes: the manta stays bigger because it
//              IS bigger. Normalising the creatures themselves is the other half and is parked by
//              the owner's decision — sprite size drives `computeRacersPerRow`, so it moves the
//              start grid and every race, and it needs the engine ceremony.
//
//              max(reference, actual width), and why: a track authored WIDER than the reference
//              keeps its own width, so the setting can never ask for less world than that track's
//              corridor occupies. On the ten tracks shipped today the widest is exactly 300, so this
//              is identical to a plain 300 — it is insurance for the next track he draws, not
//              present-day behaviour.
//
//              WHY IT IS RESOLUTION- AND TOPOLOGY-INVARIANT, by construction:
//                camZoom   = canvasH / (n * referenceWidthPx * axisY)
//                effY      = camZoom * axisY = canvasH / (n * referenceWidthPx)
//                visibleH  = canvasH / effY  = n * referenceWidthPx     <- the world size cancels
//              The same n therefore shows the same WORLD on a 131-px corridor and on a 300-px one,
//              on a 3072-px closed world and a 6144-px open one. That is the whole property this
//              unit buys, met by algebra rather than by calibration.
//
//              THE GUARANTEE DOES NOT LIVE HERE ANY MORE. This module used to clamp the setting to
//              at least one real track width. That clamp belonged to a unit whose number MEANT track
//              widths; under a reference it would silently re-introduce the per-track unevenness the
//              unit exists to remove — a narrow track would still be pinned to its own narrow
//              corridor. The corridor guarantee now lives solely in framingRule.js, where it is
//              orientation-aware, reads the REAL corridor, and is applied by the director with
//              Math.min alongside the pair and company guarantees. One place where a shot is
//              widened, not two.
//
//              Pure: no state and no config reads. Everything the caller needs to test it is an
//              argument. The one import is the reference canvas, which has a single home in
//              projection.js — CAMERA-HYGIENE-1 removed the second copy that used to be declared
//              here, and CAMERA-HYGIENE-2 moved the import line out of the middle of this header,
//              where that edit had left it.
// ============================================================

import { REFERENCE_CANVAS_W, REFERENCE_CANVAS_H } from './projection.js';

/** Reference canvas the projection's axis scales are defined against. */
const CANVAS_W = REFERENCE_CANVAS_W;
const CANVAS_H = REFERENCE_CANVAS_H;

/**
 * The width in world px that ONE standard corridor means on this track.
 *
 * `max(reference, actual)`: narrow tracks are framed against the shared reference — that is the
 * point of the unit — while a track wider than the reference keeps its own width. Without the max,
 * authoring a 400-px track would make 1.0 show 0.75 of its corridor and hand every tight shot there
 * to the guarantee instead of to the setting.
 *
 * @param {number} referenceCorridorPx  the standard corridor, in world px (Dev Screen value)
 * @param {number} trackWidthPx         this track's actual corridor width
 * @returns {number} world px per corridor; NaN when neither input is usable
 */
export function referenceWidthFor(referenceCorridorPx, trackWidthPx) {
  const ref =
    Number.isFinite(referenceCorridorPx) && referenceCorridorPx > 0 ? referenceCorridorPx : 0;
  const tw = Number.isFinite(trackWidthPx) && trackWidthPx > 0 ? trackWidthPx : 0;
  const out = Math.max(ref, tw);
  return out > 0 ? out : NaN;
}

/**
 * The cam.zoom that shows exactly `corridors` standard corridors across the short (Y) screen axis.
 *
 * @param {number} corridors        the setting (> 0)
 * @param {number} referenceWidthPx world px per corridor — from `referenceWidthFor`
 * @param {number} axisY            the projection's world->screen Y scale at cam.zoom = 1
 * @param {number} [canvasH]        canvas height the projection is defined against
 * @returns {number} cam.zoom (unclamped — the caller applies the range and the guarantees)
 */
export function camZoomForCorridors(corridors, referenceWidthPx, axisY, canvasH = CANVAS_H) {
  if (!(corridors > 0) || !(referenceWidthPx > 0) || !(axisY > 0)) return NaN;
  return canvasH / (corridors * referenceWidthPx * axisY);
}

/**
 * The inverse: how many standard corridors a given cam.zoom actually shows across the short axis.
 * This is what a test or a diagnostic should assert on — it reads the picture, not the setting.
 */
export function corridorsForCamZoom(camZoom, referenceWidthPx, axisY, canvasH = CANVAS_H) {
  if (!(camZoom > 0) || !(referenceWidthPx > 0) || !(axisY > 0)) return NaN;
  return canvasH / (camZoom * axisY * referenceWidthPx);
}

/**
 * The same picture in the unit a person can check against a ruler: how much WORLD is in shot, in
 * world px, across the short axis. It is `corridorsForCamZoom * referenceWidthPx` by construction,
 * and it exists because "225 world px" is falsifiable against a marker while "0.75 corridors" is not.
 */
export function visibleWorldPx(camZoom, axisY, canvasH = CANVAS_H) {
  if (!(camZoom > 0) || !(axisY > 0)) return NaN;
  return canvasH / (camZoom * axisY);
}

/**
 * How many standard corridors are visible on EACH axis at a cam.zoom. The long axis follows from the
 * projection's aspect ratio and is reported, never set: closed tracks scale X and Y differently (an
 * 18.5% anisotropy that predates this block), so the long axis shows 1.50x the short-axis count on a
 * closed track and 1.78x on an open one.
 */
export function visibleCorridors(
  camZoom,
  referenceWidthPx,
  axisX,
  axisY,
  canvasW = CANVAS_W,
  canvasH = CANVAS_H
) {
  return {
    across: corridorsForCamZoom(camZoom, referenceWidthPx, axisY, canvasH),
    along: corridorsForCamZoom(camZoom, referenceWidthPx, axisX, canvasW),
  };
}

/**
 * Resolve a state's setting into a cam.zoom: the unit, then the projection's physical range. ONE
 * function, used by every state — that is the whole point of the block.
 *
 * No guarantee is applied here; see the file header. The corridor guarantee is orientation-aware,
 * reads the real corridor, and is applied by the director together with the pair and company
 * guarantees.
 *
 * @param {number} corridors  the state's setting
 * @param {object} p
 * @param {number} p.referenceWidthPx
 * @param {number} p.axisY
 * @param {(z:number)=>number} p.clampCamZoom  the projection's range clamp
 * @param {number} [p.fallbackCorridors]  used when the setting is not a finite positive number
 * @returns {number} cam.zoom
 */
export function resolveZoomForCorridors(
  corridors,
  { referenceWidthPx, axisY, clampCamZoom, fallbackCorridors = 0.75 }
) {
  const n = Number.isFinite(corridors) && corridors > 0 ? corridors : fallbackCorridors;
  const raw = camZoomForCorridors(n, referenceWidthPx, axisY);
  if (!Number.isFinite(raw)) return clampCamZoom(NaN);
  return clampCamZoom(raw);
}
