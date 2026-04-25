// ============================================================
// File:        spriteLoader.js
// Path:        client/src/modules/racer-types/spriteLoader.js
// Project:     RaceArena
// Description: Module-level sprite image cache, keyed by URL.
//              Mirrors bgImageCache.js pattern — each URL is loaded
//              at most once; getCachedSprite returns undefined until
//              the image is ready.
// ============================================================

const _cache = new Map();

/**
 * Load a sprite image and cache it. Returns a Promise that resolves to the
 * HTMLImageElement on success. Subsequent calls with the same URL resolve
 * immediately from cache.
 *
 * @param {string} url - Absolute path from public root, e.g. '/assets/racers/horse-trot.png'
 * @returns {Promise<HTMLImageElement>}
 */
export function loadSprite(url) {
  if (_cache.has(url)) {
    return Promise.resolve(_cache.get(url));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      _cache.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load sprite: ${url}`));
    img.src = url;
  });
}

/**
 * Return the cached Image for the given URL, or undefined if not yet loaded.
 *
 * @param {string} url
 * @returns {HTMLImageElement | undefined}
 */
export function getCachedSprite(url) {
  return _cache.get(url);
}

/**
 * Clear the cache. Only use in tests.
 */
export function _clearSpriteCache() {
  _cache.clear();
}
