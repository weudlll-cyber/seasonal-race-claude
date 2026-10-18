// ============================================================
// File:        bgImageCache.js
// Path:        client/src/modules/track-effects/bgImageCache.js
// Project:     RaceArena
// Description: Module-level cache for background images, keyed by path.
//              Ensures each image is loaded at most once across all
//              environment instances — once it has LOADED.
//
// OFFLINE-1 F1 (the owner's decision of 2026-10-18): a FAILED load is no longer kept for the life of
// the page. A race started while the server was unreachable used to be drawn without its track
// background until a reload, because the failure stayed cached and was never tried again. Now:
//   · a failed path is tried again at most once every RETRY_FAILED_MS while something asks for it
//     (the race screen asks every frame, so a background can arrive DURING a race after recovery);
//   · the moment the server answers anything (`racearena:server-status`, reachable), every failed
//     path is forgotten, so the next request for it — at the latest the next race — loads it afresh.
// And a failed load asks the recovery probe to check the server once (`racearena:server-check`),
// because the race makes no requests of its own and would otherwise not notice an outage (F3).
// The status arrives as a window EVENT, not an import: this file is inside raceCore.js's import
// closure (scripts/engine-reach.mjs), and importing modules/serverStatus.js would pull that module
// into the hull — the same reason services/apiClient.js reports by event.
// ============================================================

const _cache = new Map();

/** How long a failed path waits before it is tried again (a request per path, never per frame). */
export const RETRY_FAILED_MS = 10_000;

/** Paths already warned about on this page — one warning per path, however often it is retried. */
const _warned = new Set();

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
    if (entry.ready) return entry.img;
    // Loading, or failed less than RETRY_FAILED_MS ago: wait. Failed longer ago: load it again.
    if (!entry.failed || Date.now() - entry.failedAt < RETRY_FAILED_MS) return null;
  }

  const img = new Image();
  const record = { img, ready: false, failed: false, failedAt: 0 };
  img.onload = () => {
    record.ready = true;
  };
  img.onerror = () => {
    record.failed = true;
    record.failedAt = Date.now();
    // OFFLINE-1 F3: an image error carries no status, so it cannot say whether the server is gone.
    // Ask the recovery probe (modules/serverRecoveryProbe.js) to find out once — by event, for the
    // same hull reason as above. At most once per path per RETRY_FAILED_MS, like the load itself.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('racearena:server-check'));
    }
    if (!_warned.has(path)) {
      _warned.add(path);
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

/** Forget every FAILED path, so the next request for it loads it again. Loaded images stay. */
export function forgetFailedBackgroundImages() {
  for (const [path, record] of _cache) {
    if (record.failed) _cache.delete(path);
  }
}

// The server answered (services/apiClient.js, storage/trackLoader.js and the recovery probe all
// dispatch this): whatever failed while it was gone is worth one fresh try.
if (typeof window !== 'undefined') {
  window.addEventListener('racearena:server-status', (e) => {
    if (e?.detail?.reachable) forgetFailedBackgroundImages();
  });
}

/**
 * Test helper — clear the cache. Only use in tests.
 */
export function _clearBackgroundImageCache() {
  _cache.clear();
  _warned.clear();
}
