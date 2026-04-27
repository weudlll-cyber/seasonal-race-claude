// ============================================================
// File:        autoSpriteScale.js
// Path:        client/src/modules/autoSpriteScale.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Auto-sprite-scaling formula and config storage (D10).
//              Computes a display-size scale factor based on track width
//              and racer count. Operator overrides from D3.5.5 take priority
//              over the auto factor when applied by the caller.
// ============================================================

import { KEYS, storageGet, storageSet } from './storage/storage.js';
import { OPEN_TRACK_BASE_ZOOM } from './camera/openTrackCamera.js';

// Camera zoom on the 1280px reference track (LEADER state). Used to keep sprites
// visually consistent across track sizes when camera-aware scaling is active.
export const REFERENCE_CAMERA_ZOOM = 1.4;

/**
 * Returns the inverse-zoom factor so sprites appear at the same screen size
 * regardless of camera zoom level and world size.
 *
 * The full canvas transform for closed tracks is: cam.zoom × bsX
 * (bsX = canvasW / worldW). Both factors shrink the on-screen sprite, so
 * both must be compensated.
 *
 *   factor = REFERENCE_CAMERA_ZOOM / (camZoom × bsX)
 *
 * Verification: displaySize × factor × camZoom × bsX
 *   = displaySize × REFERENCE_CAMERA_ZOOM — constant for any camZoom, worldW.
 *
 * bsX defaults to 1 for backward-compatibility (open tracks, old call-sites).
 * Open tracks use computeOpenTrackCameraZoomFactor instead.
 *
 * @param {number} camZoom   Current camera zoom (from CameraDirector)
 * @param {number} [bsX=1]  Canvas-to-world X scale (canvasW / worldW)
 * @returns {number}         Scale factor to multiply into displaySizeScale
 */
export function computeCameraZoomFactor(camZoom, bsX = 1) {
  if (!camZoom || camZoom <= 0) return 1;
  return REFERENCE_CAMERA_ZOOM / (camZoom * bsX);
}

/**
 * Camera-aware scale factor for open tracks.
 *
 * Open tracks apply effectiveZoom = OPEN_TRACK_BASE_ZOOM × cam.zoom to the canvas,
 * so the inverse factor must account for that base multiplier:
 *
 *   factor = REFERENCE_CAMERA_ZOOM / (OPEN_TRACK_BASE_ZOOM × camZoom)
 *
 * Verification: displaySize × factor × effZoom
 *   = displaySize × REFERENCE_CAMERA_ZOOM/(BASE×z) × BASE×z = displaySize × REFERENCE_CAMERA_ZOOM
 * — identical to closed-track reference, regardless of cam.zoom.
 *
 * @param {number} camZoom  Director zoom (from CameraDirector.update())
 * @returns {number}        Scale factor to multiply into displaySizeScale
 */
export function computeOpenTrackCameraZoomFactor(camZoom) {
  if (!camZoom || camZoom <= 0) return 1;
  return REFERENCE_CAMERA_ZOOM / (OPEN_TRACK_BASE_ZOOM * camZoom);
}

export const DEFAULT_AUTO_SCALE_CONFIG = {
  enabled: true,
  referenceValue: 23,
  minScale: 0.65,
  maxScale: 2.5,
  minVisiblePixels: 32,
};

/**
 * Compute the auto scale factor for racer display size.
 *
 * Lane-density formula: (trackWidth / racerCount) / referenceValue
 * Pixel floor: minVisiblePixels / (displaySize × REFERENCE_CAMERA_ZOOM)
 * Result: clamp( max(laneBasedFactor, pixelFloor), minScale, maxScale )
 *
 * A referenceValue of 23 means: at the default 140px track with 6 racers (ratio ≈ 23.3),
 * the lane factor is ≈ 1.0 (neutral — no change from default displaySize).
 *
 * The pixel floor ensures sprites stay visible at minVisiblePixels on canvas regardless
 * of racerCount, when the racer type's displaySize is supplied by the caller.
 *
 * @param {number} trackWidth   Track width in world pixels
 * @param {number} racerCount   Number of racers in the race
 * @param {object} config       Config object (referenceValue, minScale, maxScale, minVisiblePixels)
 * @param {number} [displaySize] Racer type display size in world pixels (optional; enables pixel floor)
 * @returns {number}            Scale factor to apply to displaySize
 */
export function computeAutoScaleFactor(trackWidth, racerCount, config, displaySize) {
  const { referenceValue, minScale, maxScale, minVisiblePixels } = config;
  if (!racerCount || !trackWidth) return minScale;
  const laneBasedFactor = trackWidth / racerCount / referenceValue;
  const pixelFloor =
    displaySize > 0 && minVisiblePixels > 0
      ? minVisiblePixels / (displaySize * REFERENCE_CAMERA_ZOOM)
      : 0;
  const combined = Math.max(laneBasedFactor, pixelFloor);
  return Math.max(minScale, Math.min(maxScale, combined));
}

/** Load config from localStorage, merging with defaults. */
export function loadAutoScaleConfig() {
  const stored = storageGet(KEYS.AUTO_SCALE_CONFIG, null);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_AUTO_SCALE_CONFIG };
  return { ...DEFAULT_AUTO_SCALE_CONFIG, ...stored };
}

/** Persist config to localStorage. */
export function saveAutoScaleConfig(config) {
  storageSet(KEYS.AUTO_SCALE_CONFIG, config);
}
