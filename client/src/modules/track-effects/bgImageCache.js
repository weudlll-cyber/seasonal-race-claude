// ============================================================
// File:        bgImageCache.js
// Path:        client/src/modules/track-effects/bgImageCache.js
// Project:     RaceArena
// Description: Module-level cache for background images, keyed by path.
//              Ensures each image is loaded at most once across all
//              environment instances.
// ============================================================

const _cache = new Map();

/**
 * Get a cached Image for the given path. If not yet loaded, starts loading.
 * Returns null until the image is ready. Subsequent calls with the same path
 * return the same Image instance.
 *
 * @param {string} path - Absolute path from public root, e.g. '/assets/tracks/backgrounds/dirt-oval.jpg'
 * @returns {HTMLImageElement | null}
 */
export function getBackgroundImage(path) {
  if (typeof Image === 'undefined') return null;
  if (!path) return null;

  const entry = _cache.get(path);
  if (entry) {
    return entry.ready ? entry.img : null;
  }

  const img = new Image();
  const record = { img, ready: false, failed: false };
  img.onload = () => {
    record.ready = true;
  };
  img.onerror = () => {
    record.failed = true;
  };
  img.src = path;
  _cache.set(path, record);
  return null;
}

/**
 * Test helper — clear the cache. Only use in tests.
 */
export function _clearBackgroundImageCache() {
  _cache.clear();
}
