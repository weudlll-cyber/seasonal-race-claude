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
 * @returns {HTMLCanvasElement}
 */
export function tintSprite(sourceImage, tintColor, mode = 'multiply') {
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
 * Clear the masked-variant cache. Only use in tests.
 */
export function _clearMaskedTintCache() {
  _maskedVariantCache.clear();
}
