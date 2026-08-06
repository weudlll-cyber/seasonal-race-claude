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
 * The reference canvas height the frame fractions below are expressed against.
 *
 * THIS IS A DELIBERATE DUPLICATE OF `camera/projection.js`'s `REFERENCE_CANVAS_H`, and it stays one
 * (ONE-TRUTH-1 stage 6). It is the same 720 and the same fact, but it cannot be imported from there:
 *
 *   1. This file is inside the ENGINE REACH — the transitive closure of `raceCore.js`'s imports,
 *      the set the mint tripwire and `npm run verify` both route on. Importing from `camera/` would
 *      pull the projection module INTO that closure, growing it from 19 files and changing what
 *      every future block is asked to mint for.
 *   2. It would breach the one-way rule (CAMERA_DIRECTOR.md §1): the camera imports from the
 *      modules, never the reverse.
 *
 * So the duplication is kept and GUARDED instead: `autoSpriteScale.test.js` asserts this constant
 * equals `REFERENCE_CANVAS_H`, and fails the moment they diverge. A test may import from anywhere;
 * it is not in the closure. Exporting the value costs nothing and changes no behaviour — it only
 * makes the fact reachable by the guard.
 */
export const CANVAS_H_REF = 720;

/**
 * Compute the final world-space sprite scale for rendering.
 *
 * Sprites scale proportionally with the camera zoom — closer is bigger. Two bounds sit on that, and
 * they answer different questions:
 *
 *   CEILING (`maxTargetScreenPx`) — stop sprites growing without bound at very tight zoom.
 *   FLOOR   (`minDrawnFrameFrac`) — CAMERA-MIN-DRAW-1: never draw a racer too small to RECOGNISE.
 *
 * THE FLOOR'S HISTORY, because it has been here before and was removed for a real reason.
 * CAMERA-PICTURE-FIXES-1 deleted `Math.max(proportionalScreenPx, minTargetScreenPx)` on the reading
 * that a racer's size should say how far in the camera is and nothing else. That reading was wrong
 * about the PURPOSE and right about the IMPLEMENTATION: the old floor was expressed in absolute
 * screen pixels against a zoom unit that has since changed twice, and it fought the owner's zoom
 * setting. Removing it made the start formation on Space Sprint shrink 29% — from the 32.0 screen px
 * he had approved to 22.8 — and the rockets became, in his words, tiny.
 *
 * So it returns with its purpose stated and its implementation fixed, exactly as the min-racers floor
 * did in CAMERA-COMPANY-1:
 *   • a FRACTION OF THE FRAME, not pixels, so it survives the next unit change
 *   • DRAWING ONLY. It cannot reach the zoom — see the zoom-independence test in the suite. The old
 *     one was a second, silent zoom authority; this one is a lower bound on one multiplication.
 *
 * screenPx = displaySize × result × frameEffZoom
 *
 * Neither bound applies: result = displaySizeScale (track-density factor, unchanged).
 * Floor applies:         result = (minDrawnFrameFrac × canvasH) / (displaySize × frameEffZoom).
 * Ceiling applies:       result = maxTargetScreenPx / (displaySize × frameEffZoom).
 * Both would apply:      the FLOOR wins — being readable outranks being small.
 *
 * @param {number}           displaySize        Racer type base display size in world pixels
 * @param {number}           displaySizeScale   Track-density auto-scale factor (from computeAutoScaleFactor)
 * @param {number}           frameEffZoom       Effective canvas scale this frame
 * @param {number|undefined} maxTargetScreenPx  Ceiling: maximum sprite size in screen pixels (optional)
 * @param {number}           [minDrawnFrameFrac=0]  Floor, as a fraction of frame height; 0 = off
 * @param {number}           [canvasH=720]      Frame height the fraction is measured against
 * @returns {number}  World-space scale factor to pass to drawRacer
 */
export function computeRenderDisplayScale(
  displaySize,
  displaySizeScale,
  frameEffZoom,
  maxTargetScreenPx,
  minDrawnFrameFrac = 0,
  canvasH = CANVAS_H_REF
) {
  if (!frameEffZoom || frameEffZoom <= 0 || !displaySize || displaySize <= 0)
    return displaySizeScale;
  const proportionalScreenPx = displaySize * displaySizeScale * frameEffZoom;
  const minScreenPx = minDrawnFrameFrac > 0 && canvasH > 0 ? minDrawnFrameFrac * canvasH : 0;
  // The floor is applied LAST so it outranks the ceiling: a sprite that is somehow both too big and
  // too small to read is a contradiction, and readability is the one the owner asked for.
  if (proportionalScreenPx < minScreenPx) return minScreenPx / (displaySize * frameEffZoom);
  if (!(maxTargetScreenPx > 0) || proportionalScreenPx <= maxTargetScreenPx)
    return displaySizeScale;
  return Math.max(maxTargetScreenPx, minScreenPx) / (displaySize * frameEffZoom);
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
