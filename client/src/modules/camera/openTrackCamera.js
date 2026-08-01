// ============================================================
// File:        openTrackCamera.js
// Path:        client/src/modules/camera/openTrackCamera.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Pure math helpers for the open-track camera mode (D7c-Phase4).
//              All functions are side-effect-free and accept explicit dimensions
//              so they can be unit-tested without a DOM or React context.
// ============================================================

// CAMERA-PROJECTION-1: this used to be a SECOND independent `= 1.5` that could drift away from the
// director's copy with nothing to catch it (CAMERA-REFACTOR-0 C3 #1). Re-exported from the one
// definition in projection.js.
export { OPEN_TRACK_BASE_ZOOM } from './projection.js';
import { OPEN_TRACK_BASE_ZOOM } from './projection.js';

/**
 * Combine the base zoom for open tracks with the CameraDirector action zoom.
 * @param {number} directorZoom  Value returned by CameraDirector (1.0–1.6)
 * @param {number} [baseZoom]    Base zoom constant (default OPEN_TRACK_BASE_ZOOM)
 * @returns {number}
 */
export function effectiveZoom(directorZoom, baseZoom = OPEN_TRACK_BASE_ZOOM) {
  return baseZoom * (directorZoom || 1);
}
