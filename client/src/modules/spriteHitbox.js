// ============================================================
// File:        spriteHitbox.js
// Path:        client/src/modules/spriteHitbox.js
// Project:     RaceArena
// Description: Auto-detection of visible bounding-box from sprite-sheet assets.
//              Analyzes first animation frame only (representative for all frames).
//              Results are cached per URL — computed once per sprite type.
// ============================================================

const _cache = new Map();
const DEFAULT_ALPHA_THRESHOLD = 16;

/**
 * Compute the visible bounding box of the first animation frame in a sprite sheet.
 * Scans non-transparent pixels (alpha > alphaThreshold) within the first frame region
 * (x ∈ [0, frameWidth), y ∈ [0, frameHeight)) and scales the result to displaySize.
 *
 * @param {{ data: Uint8ClampedArray|number[], width: number, height: number }} imageData
 *   Standard ImageData shape — data is RGBA, width/height in pixels.
 * @param {number} frameWidth   One animation frame's width in sprite-sheet pixels.
 * @param {number} frameHeight  One animation frame's height in sprite-sheet pixels.
 * @param {number} displaySize  Rendered size in world pixels (used for scaling).
 * @param {number} [alphaThreshold=16]  Pixels with alpha ≤ this value are transparent.
 * @returns {{ visibleWidthPx: number, visibleLengthPx: number }}
 */
export function computeHitboxFromImageData(
  imageData,
  frameWidth,
  frameHeight,
  displaySize,
  alphaThreshold = DEFAULT_ALPHA_THRESHOLD
) {
  const { data, width } = imageData;
  const fw = Math.min(frameWidth, imageData.width);
  const fh = Math.min(frameHeight, imageData.height);

  let minX = fw;
  let maxX = -1;
  let minY = fh;
  let maxY = -1;

  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    // Fully transparent frame — fall back to displaySize-based estimate
    return fallbackHitbox(displaySize);
  }

  const bboxWidth = maxX - minX + 1;
  const bboxHeight = maxY - minY + 1;

  return {
    visibleWidthPx: (bboxWidth / fw) * displaySize,
    visibleLengthPx: (bboxHeight / fh) * displaySize,
  };
}

/**
 * Compute hitbox from a loaded HTMLImageElement using an OffscreenCanvas or regular canvas.
 * Browser-only (requires canvas API). Returns null if canvas is unavailable.
 *
 * @param {HTMLImageElement} img
 * @param {number} frameWidth
 * @param {number} frameHeight
 * @param {number} displaySize
 * @param {number} [alphaThreshold]
 * @returns {{ visibleWidthPx: number, visibleLengthPx: number } | null}
 */
export function computeHitboxFromImage(img, frameWidth, frameHeight, displaySize, alphaThreshold) {
  try {
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    let canvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(imgW, imgH);
    } else if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = imgW;
      canvas.height = imgH;
    } else {
      return null;
    }
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, imgW, imgH);
    return computeHitboxFromImageData(
      imageData,
      frameWidth,
      frameHeight,
      displaySize,
      alphaThreshold
    );
  } catch {
    return null;
  }
}

/**
 * Get cached hitbox for a sprite URL. Computes on first call, returns cached result thereafter.
 * Returns null if the image is not yet available.
 *
 * @param {string} url
 * @param {HTMLImageElement | null | undefined} img
 * @param {number} frameWidth
 * @param {number} frameHeight
 * @param {number} displaySize
 * @returns {{ visibleWidthPx: number, visibleLengthPx: number } | null}
 */
export function getSpriteHitbox(url, img, frameWidth, frameHeight, displaySize) {
  if (_cache.has(url)) return _cache.get(url);
  if (!img) return null;
  const hitbox =
    computeHitboxFromImage(img, frameWidth, frameHeight, displaySize) ??
    fallbackHitbox(displaySize);
  _cache.set(url, hitbox);
  return hitbox;
}

/**
 * Fallback hitbox when pixel data is unavailable. Uses 75% of displaySize as both dimensions.
 *
 * @param {number} displaySize
 * @returns {{ visibleWidthPx: number, visibleLengthPx: number }}
 */
export function fallbackHitbox(displaySize) {
  return {
    visibleWidthPx: displaySize * 0.75,
    visibleLengthPx: displaySize * 0.75,
  };
}

/**
 * Clear the hitbox cache. Only use in tests.
 */
export function _clearHitboxCache() {
  _cache.clear();
}
