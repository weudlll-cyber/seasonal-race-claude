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
 * A referenceValue of 23 means: for an illustrative 140px-wide track with 6 racers (ratio ≈ 23.3) — not an actual track (real widths range 93–300px),
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
 * Sprites scale proportionally with the camera zoom — closer is bigger, always, with nothing
 * holding them up. CAMERA-PICTURE-FIXES-1 removed the minimum-size FLOOR that used to sit here
 * (`Math.max(proportionalScreenPx, minTargetScreenPx)`): the owner's rule is "die Sprites sollten
 * immer angepasst groß sein" — a racer's size on screen should say how far in the camera is and
 * nothing else. The floor bound in OVERVIEW on 9 of the 10 shipped tracks, drawing racers 28 px
 * where the zoom asked for 17–20 px, and it was the last thing making sprite size a second,
 * silent zoom authority.
 *
 * The optional CEILING stays: it stops sprites growing without bound at very tight zoom, which is
 * a different question and one the owner has not asked to change.
 *
 * screenPx = displaySize × result × frameEffZoom
 *
 * With no ceiling:      result = displaySizeScale (track-density factor, unchanged).
 * When ceiling applies: result = maxTargetScreenPx / (displaySize × frameEffZoom).
 *
 * @param {number}           displaySize        Racer type base display size in world pixels
 * @param {number}           displaySizeScale   Track-density auto-scale factor (from computeAutoScaleFactor)
 * @param {number}           frameEffZoom       Effective canvas scale this frame
 * @param {number|undefined} maxTargetScreenPx  Ceiling: maximum sprite size in screen pixels (optional)
 * @returns {number}  World-space scale factor to pass to drawRacer
 */
export function computeRenderDisplayScale(
  displaySize,
  displaySizeScale,
  frameEffZoom,
  maxTargetScreenPx
) {
  if (!frameEffZoom || frameEffZoom <= 0 || !displaySize || displaySize <= 0)
    return displaySizeScale;
  const proportionalScreenPx = displaySize * displaySizeScale * frameEffZoom;
  if (!(maxTargetScreenPx > 0) || proportionalScreenPx <= maxTargetScreenPx)
    return displaySizeScale;
  return maxTargetScreenPx / (displaySize * frameEffZoom);
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
