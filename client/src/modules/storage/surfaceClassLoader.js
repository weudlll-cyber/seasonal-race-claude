// ============================================================
// File:        surfaceClassLoader.js
// Path:        client/src/modules/storage/surfaceClassLoader.js
// Project:     RaceArena
// Description: Fetches backend surface classes and caches them in localStorage.
//              Analogous to trackLoader.js. Falls back to an empty cache
//              (= code defaults only) when the backend is unreachable.
// ============================================================

import { fetchSurfaceClasses } from '../../services/surfaceClassApi.js';
import { storageGet, storageSet, KEYS } from './storage.js';
import { loadServerClasses } from '../surface-effects/registry.js';
import { withTimeout } from '../../utils/withTimeout.js';

const FETCH_TIMEOUT_MS = 3000;

/**
 * Returns the last successfully fetched server classes from localStorage cache.
 * Returns an empty array when no cache exists (= show code defaults only).
 * @returns {object[]}
 */
export function getCachedServerSurfaceClasses() {
  return storageGet(KEYS.SURFACE_CLASSES_CACHE, []);
}

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
    storageSet(KEYS.SURFACE_CLASSES_CACHE, classes);
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
