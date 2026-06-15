// ============================================================
// File:        spriteLoader.js
// Path:        client/src/modules/racer-types/spriteLoader.js
// Project:     RaceArena
// Description: Module-level sprite image cache, keyed by URL.
//              Cross-origin http(s) URLs (server sprites) are loaded via a
//              credentialed fetch→blob→Object-URL pipeline so the resulting
//              Image is never canvas-tainted. Same-origin / data: URLs use the
//              direct img.src path unchanged.
// ============================================================

const _cache = new Map();
// Tracks object URLs created for http(s) sprites so they can be revoked on clear.
const _objectUrls = new Map();

/**
 * Load a sprite image and cache it. Returns a Promise that resolves to the
 * HTMLImageElement on success. Subsequent calls with the same URL resolve
 * immediately from cache.
 *
 * Cross-origin http(s) URLs are fetched with { credentials: 'include' } and
 * converted to a same-origin blob: URL before being assigned to the Image —
 * this avoids canvas taint and works identically to the authenticated JSON
 * fetch used elsewhere in the app.
 *
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
export function loadSprite(url) {
  console.info(
    `[ls] enter url=${url} cacheHit=${_cache.has(url)} branch=${url.startsWith('http') ? 'http' : 'direct'}`
  );
  if (_cache.has(url)) {
    return Promise.resolve(_cache.get(url));
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return fetch(url, { credentials: 'include' })
      .then((res) => {
        console.info(`[ls] fetched ${url} status=${res.status} ok=${res.ok}`);
        if (!res.ok) {
          console.error(`[RaceArena] loadSprite: "${url}" — HTTP ${res.status} ${res.statusText}`);
          throw new Error(`loadSprite: HTTP ${res.status} for ${url}`);
        }
        return res.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            console.info(`[ls] blob ${url} size=${blob.size}`);
            const objectUrl = URL.createObjectURL(blob);
            _objectUrls.set(url, objectUrl);
            const img = new Image();
            img.onload = () => {
              console.info(`[ls] ONLOAD ${url} -> cached`);
              _cache.set(url, img);
              resolve(img);
            };
            img.onerror = () => {
              console.error(`[RaceArena] loadSprite: blob render failed for "${url}"`);
              reject(new Error(`loadSprite: blob load failed for ${url}`));
            };
            img.src = objectUrl;
          })
      );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.info(`[ls] direct ONLOAD ${url}`);
      _cache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      console.error(`[RaceArena] loadSprite: failed to load sprite "${url}"`);
      reject(new Error(`Failed to load sprite: ${url}`));
    };
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
 * Clear the cache and revoke all Object-URLs created for cross-origin sprites.
 * Only use in tests.
 */
export function _clearSpriteCache() {
  for (const objectUrl of _objectUrls.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  _objectUrls.clear();
  _cache.clear();
}
