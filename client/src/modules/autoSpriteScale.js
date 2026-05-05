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
 * Track-density formula: clamp((trackWidth / racerCount) / referenceValue, minScale, maxScale)
 *
 * A referenceValue of 23 means: at the default 140px track with 6 racers (ratio ≈ 23.3),
 * the density factor is ≈ 1.0 (neutral — no change from default displaySize).
 *
 * @param {number} trackWidth   Track width in world pixels
 * @param {number} racerCount   Number of racers in the race
 * @param {object} config       Config object (referenceValue, minScale, maxScale)
 * @returns {number}            Scale factor to apply to displaySize
 */
export function computeAutoScaleFactor(trackWidth, racerCount, config) {
  const { referenceValue, minScale, maxScale } = config;
  if (!racerCount || !trackWidth) return minScale;
  const densityFactor = trackWidth / racerCount / referenceValue;
  return Math.max(minScale, Math.min(maxScale, densityFactor));
}

/**
 * Compute the final world-space sprite scale for rendering.
 *
 * Sprites scale proportionally with the camera zoom (natural "closer = bigger").
 * A floor of minTargetScreenPx guarantees visibility on very large tracks where
 * the camera zooms far out. An optional ceiling of maxTargetScreenPx prevents
 * sprites growing too large when the camera zooms in close.
 *
 * screenPx = displaySize × result × frameEffZoom
 *
 * When neither bound applies: result = displaySizeScale (track-density factor unchanged).
 * When floor applies:         result = minTargetScreenPx / (displaySize × frameEffZoom).
 * When ceiling applies:       result = maxTargetScreenPx / (displaySize × frameEffZoom).
 * When min > max:             ceiling is ignored (min wins).
 *
 * @param {number}           displaySize        Racer type base display size in world pixels
 * @param {number}           displaySizeScale   Track-density auto-scale factor (from computeAutoScaleFactor)
 * @param {number}           frameEffZoom       Effective canvas scale this frame (cam.zoom×bsX or BASE_ZOOM×cam.zoom)
 * @param {number}           minTargetScreenPx  Floor: minimum sprite size in screen pixels
 * @param {number|undefined} maxTargetScreenPx  Ceiling: maximum sprite size in screen pixels (optional)
 * @returns {number}  World-space scale factor to pass to drawRacer
 */
export function computeRenderDisplayScale(
  displaySize,
  displaySizeScale,
  frameEffZoom,
  minTargetScreenPx,
  maxTargetScreenPx
) {
  if (!frameEffZoom || frameEffZoom <= 0 || !displaySize || displaySize <= 0)
    return displaySizeScale;
  const proportionalScreenPx = displaySize * displaySizeScale * frameEffZoom;
  const flooredScreenPx = Math.max(proportionalScreenPx, minTargetScreenPx);
  const applyMax = maxTargetScreenPx != null && maxTargetScreenPx > minTargetScreenPx;
  const targetScreenPx = applyMax ? Math.min(flooredScreenPx, maxTargetScreenPx) : flooredScreenPx;
  return targetScreenPx / (displaySize * frameEffZoom);
}

/**
 * Resolve the effective minTargetScreenPx for a single racer type.
 *
 * Scale-invariant floor: uses a percentage of canvas height so the floor stays
 * proportional on large-world tracks (e.g. 6000px) where overviewZoom is ~0.21 and
 * an absolute pixel floor like 32px would clamp sprites almost constantly.
 *
 * If a per-type absolute override is set it wins directly (backwards-compatible).
 *
 * @param {number|undefined} typeOverridePx       Per-type absolute override (from racerType.config.minTargetScreenPx)
 * @param {number}           minSpritePctOfCanvas  Fraction of canvas height (e.g. 0.05 = 5%)
 * @param {number}           canvasH               Canvas height in pixels (e.g. CANVAS_H = 720)
 * @returns {number}  Effective floor in screen pixels
 */
export function getEffectiveMinTargetScreenPx(typeOverridePx, minSpritePctOfCanvas, canvasH) {
  if (typeOverridePx != null) return typeOverridePx;
  return minSpritePctOfCanvas * canvasH;
}

/**
 * Resolve the effective maxTargetScreenPx for a single racer type.
 * Returns the type-specific override if set, otherwise the global default.
 *
 * @param {number|undefined} typeOverridePx  Per-type override (from racerType.config.maxTargetScreenPx)
 * @param {number}           globalMaxPx     Global default (from cameraConfig.maxTargetScreenPx)
 * @returns {number}
 */
export function getEffectiveMaxTargetScreenPx(typeOverridePx, globalMaxPx) {
  return typeOverridePx != null ? typeOverridePx : globalMaxPx;
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
