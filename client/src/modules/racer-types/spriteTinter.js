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
 * Tint a sprite image with a color using multiply composite.
 * Returns an offscreen HTMLCanvasElement matching source dimensions.
 *
 * @param {HTMLImageElement|object} sourceImage
 * @param {string} tintColor - CSS color string
 * @returns {HTMLCanvasElement}
 */
export function tintSprite(sourceImage, tintColor) {
  const w = sourceImage.naturalWidth || sourceImage.width;
  const h = sourceImage.naturalHeight || sourceImage.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(sourceImage, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
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
 * Results are cached — subsequent calls with the same URL return the cached Map.
 *
 * @param {string} sourceUrl
 * @param {Array<{id: string, tint: string|null}>} coats
 * @returns {Promise<Map<string, HTMLImageElement|HTMLCanvasElement>>}
 */
export async function getCoatVariants(sourceUrl, coats) {
  if (_variantCache.has(sourceUrl)) {
    return _variantCache.get(sourceUrl);
  }
  const img = await loadSprite(sourceUrl);
  const map = new Map();
  for (const coat of coats) {
    map.set(coat.id, coat.tint === null ? img : tintSprite(img, coat.tint));
  }
  _variantCache.set(sourceUrl, map);
  return map;
}

/**
 * Synchronous cache lookup — returns the variant Map if already loaded,
 * or undefined if getCoatVariants has not yet completed for this URL.
 *
 * @param {string} sourceUrl
 * @returns {Map<string, HTMLImageElement|HTMLCanvasElement>|undefined}
 */
getCoatVariants.cached = function (sourceUrl) {
  return _variantCache.get(sourceUrl);
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
