// ============================================================
// File:        autoSpriteScale.js
// Path:        client/src/modules/autoSpriteScale.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Auto-sprite-scaling formula and config storage (D10).
//              Computes a display-size scale factor based on track width
//              and racer count. Operator overrides from D3.5.5 take priority
//              over the auto factor when applied by the caller.
//              D7a: sprites now scale proportionally with camera zoom
//              (natural "closer = bigger"). Floor in computeRenderDisplayScale
//              guarantees minimum visibility on large tracks.
// ============================================================

import { KEYS, storageGet, storageSet } from './storage/storage.js';

export const DEFAULT_AUTO_SCALE_CONFIG = {
  enabled: true,
  referenceValue: 23,
  minScale: 0.65,
  maxScale: 2.5,
  minTargetScreenPx: 32,
};

/**
 * Compute the auto scale factor for racer display size.
 *
 * Lane-density formula: clamp((trackWidth / racerCount) / referenceValue, minScale, maxScale)
 *
 * A referenceValue of 23 means: at the default 140px track with 6 racers (ratio ≈ 23.3),
 * the lane factor is ≈ 1.0 (neutral — no change from default displaySize).
 *
 * @param {number} trackWidth   Track width in world pixels
 * @param {number} racerCount   Number of racers in the race
 * @param {object} config       Config object (referenceValue, minScale, maxScale)
 * @returns {number}            Scale factor to apply to displaySize
 */
export function computeAutoScaleFactor(trackWidth, racerCount, config) {
  const { referenceValue, minScale, maxScale } = config;
  if (!racerCount || !trackWidth) return minScale;
  const laneFactor = trackWidth / racerCount / referenceValue;
  return Math.max(minScale, Math.min(maxScale, laneFactor));
}

/**
 * Compute the final world-space sprite scale for rendering.
 *
 * Sprites scale proportionally with the camera zoom (natural "closer = bigger").
 * A floor of minTargetScreenPx guarantees visibility on very large tracks where
 * the camera zooms far out.
 *
 * screenPx = displaySize × result × frameEffZoom
 *
 * When floor doesn't apply: result = displaySizeScale (lane-density factor unchanged).
 * When floor applies:       result = minTargetScreenPx / (displaySize × frameEffZoom).
 *
 * @param {number} displaySize        Racer type base display size in world pixels
 * @param {number} displaySizeScale   Lane-density auto-scale factor (from computeAutoScaleFactor)
 * @param {number} frameEffZoom       Effective canvas scale this frame (cam.zoom×bsX or BASE_ZOOM×cam.zoom)
 * @param {number} minTargetScreenPx  Floor: minimum sprite size in screen pixels
 * @returns {number}  World-space scale factor to pass to drawRacer
 */
export function computeRenderDisplayScale(
  displaySize,
  displaySizeScale,
  frameEffZoom,
  minTargetScreenPx
) {
  if (!frameEffZoom || frameEffZoom <= 0 || !displaySize || displaySize <= 0)
    return displaySizeScale;
  const proportionalScreenPx = displaySize * displaySizeScale * frameEffZoom;
  const targetScreenPx = Math.max(proportionalScreenPx, minTargetScreenPx);
  return targetScreenPx / (displaySize * frameEffZoom);
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
