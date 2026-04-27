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

// Camera zoom on the 1280px reference track (LEADER state). Used to keep sprites
// visually consistent across track sizes when camera-aware scaling is active.
export const REFERENCE_CAMERA_ZOOM = 1.4;

/**
 * Returns the inverse-zoom factor so sprites appear at the same screen size
 * regardless of camera zoom level.
 *
 * factor = REFERENCE_CAMERA_ZOOM / currentZoom
 *   - At zoom 1.4 (1280 reference track): factor = 1.0 → no change
 *   - At zoom 0.3 (6000px track): factor ≈ 4.67 → world sprites 4.67× larger,
 *     but rendered at 0.3× scale → same on-screen size as reference
 *
 * @param {number} currentZoom  Current camera zoom (from CameraDirector)
 * @returns {number}            Scale factor to multiply into displaySizeScale
 */
export function computeCameraZoomFactor(currentZoom) {
  if (!currentZoom || currentZoom <= 0) return 1;
  return REFERENCE_CAMERA_ZOOM / currentZoom;
}

export const DEFAULT_AUTO_SCALE_CONFIG = {
  enabled: true,
  referenceValue: 23,
  minScale: 0.65,
  maxScale: 2.5,
};

/**
 * Compute the auto scale factor for racer display size.
 *
 * Formula: clamp( (trackWidth / racerCount) / referenceValue, minScale, maxScale )
 *
 * A referenceValue of 23 means: at the default 140px track with 6 racers (ratio ≈ 23.3),
 * the factor is ≈ 1.0 (neutral — no change from default displaySize).
 *
 * @param {number} trackWidth   Track width in world pixels
 * @param {number} racerCount   Number of racers in the race
 * @param {object} config       Config object (referenceValue, minScale, maxScale)
 * @returns {number}            Scale factor to apply to displaySize
 */
export function computeAutoScaleFactor(trackWidth, racerCount, config) {
  const { referenceValue, minScale, maxScale } = config;
  if (!racerCount || !trackWidth) return minScale;
  const ratio = trackWidth / racerCount / referenceValue;
  return Math.max(minScale, Math.min(maxScale, ratio));
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
