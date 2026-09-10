// ============================================================
// File:        surfaceClassCache.js
// Path:        client/src/modules/storage/surfaceClassCache.js
// Project:     RaceArena — HULL-SURFACE-SPLIT-1
//
// WHAT THIS IS FOR: the localStorage cache of the backend's surface classes — reading it and writing
// it. That is the whole job, and it needs no network.
//
// WHY IT IS ITS OWN FILE. `surfaceClassLoader.js` carried BOTH the cache and the fetch that fills
// it, and `RaceScreen` imports it for the cache alone. A module-level import is not conditional, so
// the loader's `import … from '../../services/surfaceClassApi.js'` came with it, and that file
// imports `services/api.js` and `services/apiClient.js`. The result was three `services/` files
// inside the race hull that can no more change a race than a stylesheet can.
//
// RACER-TYPES-SPLIT-1 fixed the identical shape in `racer-types/index.js` and found this second path
// by re-running the hull rather than assuming its own split had cleared it. This is that path.
//
// ★ THE DEPENDENCY IS ONE-WAY AND MUST STAY SO: the loader imports this file; this file imports
// nothing but `storage.js`. If it ever reaches back for the loader, the network is inside the hull
// again and the split is undone while still looking tidy.
//
// ★ AND THIS IS NOT RE-EXPORTED FROM THE LOADER, deliberately — same rule, same reason. A re-export
// would let an importer reach the cache THROUGH the loader and drag the network back into its
// closure. Every importer names the half it actually uses.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage.js';

/**
 * The last successfully fetched server classes. An empty array when no cache exists, which means
 * "code defaults only" rather than "no classes" — see the loader's failure path for why that
 * distinction had to be made audible.
 * @returns {object[]}
 */
export function getCachedServerSurfaceClasses() {
  return storageGet(KEYS.SURFACE_CLASSES_CACHE, []);
}

/**
 * Persist a freshly fetched set. Called by the loader after a successful fetch and by nothing else.
 * @param {object[]} classes
 */
export function setCachedServerSurfaceClasses(classes) {
  storageSet(KEYS.SURFACE_CLASSES_CACHE, classes);
}
