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
 * @param {string} path - the URL to load. In the product this is always the API's background
 *   endpoint, which `trackLoader.js` builds: `<API_BASE_URL>/api/tracks/<id>/background`.
 *   (This example used to name a file under `/assets/tracks/backgrounds/`; that folder was emptied
 *   on 2026-09-04 and never fed this function in the first place — DROP-DEAD-BACKGROUNDS-1.)
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
  const record = { img, ready: false, failed: false, warned: false };
  img.onload = () => {
    record.ready = true;
  };
  img.onerror = () => {
    record.failed = true;
    if (!record.warned) {
      record.warned = true;
      console.warn(
        `[bgImageCache] Background image failed to load: ${path}\n` +
          `Hint: Backend server may be offline. Run \`docker compose up\` in project root to enable custom-track backgrounds.`
      );
    }
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
