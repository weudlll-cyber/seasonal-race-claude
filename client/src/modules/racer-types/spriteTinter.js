// ============================================================
// File:        spriteTinter.js
// Path:        client/src/modules/racer-types/spriteTinter.js
// Project:     RaceArena
// Description: Offscreen canvas tinting for sprite coat variants.
//              Produces one pre-tinted canvas per coat via multiply
//              composite, cached at module level so tinting runs once.
// ============================================================

import { loadSprite } from './spriteLoader.js';

const _variantCache = new Map();

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
