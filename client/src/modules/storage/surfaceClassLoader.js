// ============================================================
// File:        surfaceClassLoader.js
// Path:        client/src/modules/storage/surfaceClassLoader.js
// Project:     RaceArena
// Description: Fetches backend surface classes and fills the localStorage cache.
//              Analogous to trackLoader.js. Falls back to the cache
//              (= code defaults only when it is empty) when the backend is unreachable.
//
// ★ HULL-SURFACE-SPLIT-1 — THIS IS THE NETWORK HALF, AND IT IS OUTSIDE THE RACE HULL.
// The cache READ moved to `surfaceClassCache.js`, which is what `RaceScreen` imports. Everything
// here reaches `services/surfaceClassApi.js` and so, transitively, `services/api.js` and
// `services/apiClient.js` — none of which can change a race. Keeping the read here put all three
// inside the hull, because a module-level import comes along whether the importer calls it or not.
//
// ★ DO NOT RE-EXPORT `getCachedServerSurfaceClasses` FROM HERE. It would read as a convenience and
// would put the network back into the closure of anything that used it.
// ============================================================

import { fetchSurfaceClasses } from '../../services/surfaceClassApi.js';
import {
  getCachedServerSurfaceClasses,
  setCachedServerSurfaceClasses,
} from './surfaceClassCache.js';
import { loadServerClasses } from '../surface-effects/registry.js';
import { withTimeout } from '../../utils/withTimeout.js';

const FETCH_TIMEOUT_MS = 3000;

/**
 * Fetch fresh surface classes from the backend, persist to localStorage cache,
 * and update the in-memory registry. Falls back to the last cache on any error.
 *
 * Designed to be called once at startup (e.g. in App.jsx or a top-level hook).
 * @returns {Promise<object[]>}  backend classes (custom + overrides); code defaults are separate
 */
export async function fetchServerSurfaceClasses() {
  try {
    const classes = await withTimeout(fetchSurfaceClasses(), FETCH_TIMEOUT_MS);
    setCachedServerSurfaceClasses(classes);
    loadServerClasses(classes);
    return classes;
  } catch (err) {
    // QUIET-FAILURES-1: on a cold profile this cache is EMPTY, so the registry falls all the way
    // back to the code defaults and every custom class and every override simply is not there —
    // in the Setup filter and in the trails. Indistinguishable from a successful load until now.
    const cached = getCachedServerSurfaceClasses();
    loadServerClasses(cached);
    console.warn(
      `[surface-classes] could not be fetched — ${err?.message ?? 'request failed'}; using ${cached.length} cached class(es), so custom classes and overrides may be missing`
    );
    return cached;
  }
}
