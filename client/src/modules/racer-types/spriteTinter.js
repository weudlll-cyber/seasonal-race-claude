// ============================================================
// File:        spriteTinter.js
// Path:        client/src/modules/racer-types/spriteTinter.js
// Project:     RaceArena
// Description: Offscreen canvas tinting for sprite coat variants.
//              Produces one pre-tinted canvas per coat via multiply
//              composite, cached at module level so tinting runs once.
//              tintSpriteWithMask() supports mask-restricted tinting
//              for vehicle racers that have small tinted regions on
//              otherwise-fixed bodies (added D3.5).
// ============================================================

import { loadSprite } from './spriteLoader.js';

const _variantCache = new Map();

// ── Pattern system ──────────────────────────────────────────────────────────

/** The three available pattern IDs. 'solid' is the default (no pattern overlay). */
export const PATTERN_IDS = ['solid', 'stripes', 'dots'];

// Tiny tile canvases built once and re-used for createPattern().
const _patternTileCache = new Map();

// Patterned variant cache — parallel to _variantCache, indexed by
// `${sourceUrl}::${tintMode}::${coatId}::${patternId}`.
const _patternedVariantCache = new Map();

function _buildStripeTile() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  // Hexagonal fill that, when tiled, produces 45° diagonal stripes.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(8, 0);
  ctx.lineTo(16, 8);
  ctx.lineTo(16, 16);
  ctx.lineTo(8, 16);
  ctx.lineTo(0, 8);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

function _buildDotsTile() {
  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(10, 10, 4, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function _getPatternTile(patternId) {
  if (_patternTileCache.has(patternId)) return _patternTileCache.get(patternId);
  let tile = null;
  if (patternId === 'stripes') tile = _buildStripeTile();
  else if (patternId === 'dots') tile = _buildDotsTile();
  _patternTileCache.set(patternId, tile);
  return tile;
}

// Apply a pattern overlay on top of a tinted full-sheet canvas.
// Returns a NEW canvas — the input is not mutated.
function _applyPatternOverlay(tintedCanvas, patternId) {
  const w = tintedCanvas.width;
  const h = tintedCanvas.height;
  const result = document.createElement('canvas');
  result.width = w;
  result.height = h;
  const ctx = result.getContext('2d');
  if (!ctx) return result;
  ctx.drawImage(tintedCanvas, 0, 0);
  const tile = _getPatternTile(patternId);
  if (tile && typeof ctx.createPattern === 'function') {
    const pattern = ctx.createPattern(tile, 'repeat');
    if (pattern) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  return result;
}

/**
 * Get (or lazily bake) a patterned variant canvas for the given coat + pattern.
 *
 * Solid path: returns the solid canvas from _variantCache (no extra allocation).
 * Non-solid path: bakes once from the solid canvas and stores in _patternedVariantCache.
 * Returns null if the solid variants have not been loaded yet.
 *
 * @param {string} sourceUrl
 * @param {'multiply'|'screen'|'auto'} tintMode
 * @param {string} coatId
 * @param {string} patternId - one of PATTERN_IDS
 * @returns {HTMLCanvasElement|HTMLImageElement|null}
 */
export function getPatternedVariant(sourceUrl, tintMode, coatId, patternId) {
  const solidVariants = _variantCache.get(`${sourceUrl}::${tintMode}`);
  if (!solidVariants) return null;
  if (!patternId || patternId === 'solid') {
    return solidVariants.get(coatId) ?? null;
  }
  const key = `${sourceUrl}::${tintMode}::${coatId}::${patternId}`;
  if (_patternedVariantCache.has(key)) {
    return _patternedVariantCache.get(key);
  }
  const solidCanvas = solidVariants.get(coatId);
  if (!solidCanvas) return null;
  const result = _applyPatternOverlay(solidCanvas, patternId);
  _patternedVariantCache.set(key, result);
  return result;
}

/** Clear patterned variant cache and tile cache. Only use in tests. */
export function _clearPatternedVariantCache() {
  _patternedVariantCache.clear();
  _patternTileCache.clear();
}

/** Number of entries currently in the patterned variant cache. Only use in tests. */
export function _patternedVariantCacheSize() {
  return _patternedVariantCache.size;
}

// Separate cache for mask-based tinting, keyed on sourceUrl:maskUrl:tintColor.
const _maskedVariantCache = new Map();

/**
 * Detect whether multiply or screen composite produces better tinting for a sprite.
 * Samples every 16th pixel; considers only opaque pixels (alpha > 128).
 * Average Rec.709 luminance < 80 → 'screen' (dark / line-art sprites).
 * Average luminance ≥ 80, or no opaque pixels → 'multiply'.
 *
 * Pure function — no canvas API; takes any ImageData-shaped object {data, width, height}.
 *
 * @param {{data: Uint8ClampedArray, width: number, height: number}} imageData
 * @returns {'multiply'|'screen'}
 */
export function detectTintMode(imageData) {
  const { data } = imageData;
  let totalLuminance = 0;
  let opaqueCount = 0;
  for (let i = 0; i < data.length; i += 64) {
    if (data[i + 3] > 128) {
      totalLuminance += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      opaqueCount++;
    }
  }
  if (opaqueCount === 0) return 'multiply';
  return totalLuminance / opaqueCount < 80 ? 'screen' : 'multiply';
}

/**
 * Tint a sprite image with a color using the given composite mode.
 * Returns an offscreen HTMLCanvasElement matching source dimensions.
 *
 * @param {HTMLImageElement|object} sourceImage
 * @param {string} tintColor - CSS color string
 * @param {'multiply'|'screen'} [mode='multiply']
 * @param {string} [patternId='solid'] - optional pattern overlay (see PATTERN_IDS)
 * @returns {HTMLCanvasElement}
 */
export function tintSprite(sourceImage, tintColor, mode = 'multiply', patternId = 'solid') {
  const w = sourceImage.naturalWidth || sourceImage.width;
  const h = sourceImage.naturalHeight || sourceImage.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(sourceImage, 0, 0);
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = tintColor;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(sourceImage, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  if (patternId && patternId !== 'solid') {
    const tile = _getPatternTile(patternId);
    if (tile && typeof ctx.createPattern === 'function') {
      const pattern = ctx.createPattern(tile, 'repeat');
      if (pattern) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
  return canvas;
}

/**
 * Build coat variants for all coats of a sprite URL.
 * Coats with tint=null get the original Image; the rest get a tinted canvas.
 * Results are cached per (sourceUrl, tintMode) pair.
 *
 * @param {string} sourceUrl
 * @param {Array<{id: string, tint: string|null}>} coats
 * @param {'multiply'|'screen'|'auto'} [tintMode='multiply']
 *   'auto' — run detectTintMode on the loaded sprite and select multiply or screen.
 *   'multiply' / 'screen' — use that mode directly.
 * @returns {Promise<Map<string, HTMLImageElement|HTMLCanvasElement>>}
 */
export async function getCoatVariants(sourceUrl, coats, tintMode = 'multiply') {
  const cacheKey = `${sourceUrl}::${tintMode}`;
  if (_variantCache.has(cacheKey)) {
    return _variantCache.get(cacheKey);
  }
  const img = await loadSprite(sourceUrl);

  let resolvedMode = tintMode;
  if (tintMode === 'auto') {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(img, 0, 0);
    resolvedMode = detectTintMode(ctx.getImageData(0, 0, w, h));
  }

  const map = new Map();
  for (const coat of coats) {
    map.set(coat.id, coat.tint === null ? img : tintSprite(img, coat.tint, resolvedMode));
  }
  _variantCache.set(cacheKey, map);
  return map;
}

/**
 * Synchronous cache lookup — returns the variant Map if already loaded,
 * or undefined if getCoatVariants has not yet completed for this (url, tintMode) pair.
 *
 * @param {string} sourceUrl
 * @param {'multiply'|'screen'|'auto'} [tintMode='multiply']
 * @returns {Map<string, HTMLImageElement|HTMLCanvasElement>|undefined}
 */
getCoatVariants.cached = function (sourceUrl, tintMode = 'multiply') {
  return _variantCache.get(`${sourceUrl}::${tintMode}`);
};

/**
 * Clear the variant cache. Only use in tests.
 */
export function _clearTintCache() {
  _variantCache.clear();
}

/**
 * Tint a sprite image using a mask canvas to restrict which pixels are affected.
 * White pixels in the mask mark areas to tint; black pixels leave the source unchanged.
 * The original alpha channel of the source sprite is always preserved.
 *
 * Results are cached per (sourceUrl, maskUrl, tintColor) triple so tinting runs once.
 * Cache key reads sourceImage.src / maskImage.src; falls back to '' for objects without src.
 *
 * @param {HTMLImageElement|object} sourceImage - Full sprite sheet.
 * @param {HTMLImageElement|object} maskImage   - Grayscale mask, same dimensions as source.
 * @param {string} tintColor                   - CSS color string (e.g. '#ff0000').
 * @returns {HTMLCanvasElement}
 */
export function tintSpriteWithMask(sourceImage, maskImage, tintColor) {
  const sourceUrl = sourceImage.src || '';
  const maskUrl = maskImage.src || '';
  const cacheKey = `${sourceUrl}:${maskUrl}:${tintColor}`;
  if (_maskedVariantCache.has(cacheKey)) {
    return _maskedVariantCache.get(cacheKey);
  }

  const w = sourceImage.naturalWidth || sourceImage.width;
  const h = sourceImage.naturalHeight || sourceImage.height;

  // Result canvas: starts as a copy of the source sprite.
  const result = document.createElement('canvas');
  result.width = w;
  result.height = h;
  const ctx = result.getContext('2d');
  if (!ctx) {
    _maskedVariantCache.set(cacheKey, result);
    return result;
  }
  ctx.drawImage(sourceImage, 0, 0);

  // Color-layer canvas: tint color clipped to the white areas of the mask.
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = w;
  colorCanvas.height = h;
  const colorCtx = colorCanvas.getContext('2d');
  if (colorCtx) {
    colorCtx.drawImage(maskImage, 0, 0);
    colorCtx.globalCompositeOperation = 'source-in';
    colorCtx.fillStyle = tintColor;
    colorCtx.fillRect(0, 0, w, h);
    colorCtx.globalCompositeOperation = 'source-over';
  }

  // Blend color layer onto source via multiply (only masked areas are affected).
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(colorCanvas, 0, 0);

  // Restore the original alpha channel so transparent areas stay transparent.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(sourceImage, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  _maskedVariantCache.set(cacheKey, result);
  return result;
}

/**
 * Tint a sprite in two passes: whole-body multiply tint first, then a
 * screen-blend patch color applied only in the masked area.
 *
 * Used by manta and dolphin coats where each coat has a dark body color
 * (bodyTint, applied via multiply to the whole sprite) and a lighter patch
 * color (patchTint, applied via screen only in the masked region so it
 * brightens rather than darkens the already-tinted area).
 *
 * Results cached per (sourceUrl, bodyTint, maskUrl, patchTint) quartet.
 *
 * @param {HTMLImageElement|object} sourceImage
 * @param {string} bodyTint  - CSS color applied multiply to the whole body.
 * @param {HTMLImageElement|object} maskImage  - Mask (alpha=brightness convention).
 * @param {string} patchTint - CSS color applied screen in the masked patch area.
 * @returns {HTMLCanvasElement}
 */
export function tintSpriteBodyAndMask(sourceImage, bodyTint, maskImage, patchTint) {
  const sourceUrl = sourceImage.src || '';
  const maskUrl = maskImage.src || '';
  const cacheKey = `bm:${sourceUrl}:${bodyTint}:${maskUrl}:${patchTint}`;
  if (_maskedVariantCache.has(cacheKey)) return _maskedVariantCache.get(cacheKey);

  const w = sourceImage.naturalWidth || sourceImage.width;
  const h = sourceImage.naturalHeight || sourceImage.height;
  const result = document.createElement('canvas');
  result.width = w;
  result.height = h;
  const ctx = result.getContext('2d');
  if (!ctx) {
    _maskedVariantCache.set(cacheKey, result);
    return result;
  }

  // Pass 1: draw sprite then multiply-blend body tint over the whole canvas.
  ctx.drawImage(sourceImage, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = bodyTint;
  ctx.fillRect(0, 0, w, h);
  // Restore original alpha (multiply with fillRect does not preserve it).
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(sourceImage, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  // Pass 2: build a color layer clipped to mask, then screen-blend onto result.
  const patchCanvas = document.createElement('canvas');
  patchCanvas.width = w;
  patchCanvas.height = h;
  const pCtx = patchCanvas.getContext('2d');
  if (pCtx) {
    pCtx.drawImage(maskImage, 0, 0);
    pCtx.globalCompositeOperation = 'source-in';
    pCtx.fillStyle = patchTint;
    pCtx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(patchCanvas, 0, 0);

  // Final clip to original sprite alpha.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(sourceImage, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  _maskedVariantCache.set(cacheKey, result);
  return result;
}

/**
 * Tint a sprite with two independent masks — used by the turtle dual-mask system:
 * mask1+tint1 for shell plate centers, mask2+tint2 for border lines between plates.
 * Both overlays use multiply blend so that darker tints produce visible color on
 * the white sprite base. The two masks are designed to be non-overlapping.
 *
 * Results cached per (sourceUrl, mask1Url, tint1, mask2Url, tint2) quintuple.
 *
 * @param {HTMLImageElement|object} sourceImage
 * @param {HTMLImageElement|object} mask1  - Plate-center mask.
 * @param {string} tint1                  - Plate color.
 * @param {HTMLImageElement|object} mask2  - Border mask.
 * @param {string} tint2                  - Border color.
 * @returns {HTMLCanvasElement}
 */
export function tintSpriteWithDualMask(sourceImage, mask1, tint1, mask2, tint2) {
  const sourceUrl = sourceImage.src || '';
  const mask1Url = mask1.src || '';
  const mask2Url = mask2.src || '';
  const cacheKey = `dm:${sourceUrl}:${mask1Url}:${tint1}:${mask2Url}:${tint2}`;
  if (_maskedVariantCache.has(cacheKey)) return _maskedVariantCache.get(cacheKey);

  const w = sourceImage.naturalWidth || sourceImage.width;
  const h = sourceImage.naturalHeight || sourceImage.height;
  const result = document.createElement('canvas');
  result.width = w;
  result.height = h;
  const ctx = result.getContext('2d');
  if (!ctx) {
    _maskedVariantCache.set(cacheKey, result);
    return result;
  }

  // Draw base sprite.
  ctx.drawImage(sourceImage, 0, 0);

  // Helper: build a color layer clipped to a mask, then multiply-blend onto result.
  function applyMaskedLayer(mask, tint) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cc = c.getContext('2d');
    if (!cc) return;
    cc.drawImage(mask, 0, 0);
    cc.globalCompositeOperation = 'source-in';
    cc.fillStyle = tint;
    cc.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(c, 0, 0);
  }

  applyMaskedLayer(mask1, tint1);
  applyMaskedLayer(mask2, tint2);

  // Final clip to source alpha.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(sourceImage, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  _maskedVariantCache.set(cacheKey, result);
  return result;
}

/**
 * Clear the masked-variant cache. Only use in tests.
 */
export function _clearMaskedTintCache() {
  _maskedVariantCache.clear();
}
