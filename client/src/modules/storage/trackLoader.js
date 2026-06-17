// ============================================================
// File:        trackLoader.js
// Path:        client/src/modules/storage/trackLoader.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Async loader that merges code-defined defaults with custom
//              tracks served by the backend. Geometry is eagerly cached in
//              localStorage so existing getTrack(geometryId) calls work
//              unchanged. Falls back to localStorage cache when offline.
//              Background-image caching removed (images 4-10 MB, localStorage
//              limit 5-10 MB — structurally too small; offline race runs
//              without background image).
// ============================================================

import { API_BASE_URL } from '../../services/api.js';
import { storageGet, storageSet, storageRemove } from './storage.js';
import { registerInIndex, unregisterFromIndex } from '../track-editor/trackStorage.js';
import { withTimeout } from '../../utils/withTimeout.js';

export const CACHE_KEY = 'racearena:cache:serverTracks';
const GEO_KEY = (id) => `racearena:trackGeometries:${id}`;
const FETCH_TIMEOUT_MS = 3000;

/** Sync — returns the server tracks list from the last successful fetch. */
export function getCachedServerTracks() {
  return storageGet(CACHE_KEY, []);
}

/**
 * Fetch one track's full geometry from the server and cache it in localStorage.
 * After this call, getTrack(track.geometryId) will return the geometry.
 * @param {object} summaryTrack  — item from GET /api/tracks response
 */
export async function cacheTrackGeometry(summaryTrack) {
  try {
    const res = await withTimeout(
      fetch(`${API_BASE_URL}/api/tracks/${summaryTrack.id}`, { credentials: 'include' }),
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const full = await res.json();
    // Three fields need special handling; everything else passes through automatically
    // so new data-model fields (trackLights, surfaceClasses, …) are never silently dropped.
    //   • `id` (server track ID) → used only for the background URL; geometry is keyed by geometryId
    //   • `geometryId` → becomes the cache `id` (matches the key getTrack() looks up)
    //   • `backgroundImageFile` → server-internal path; clients use the computed URL instead
    // eslint-disable-next-line no-unused-vars
    const { id: serverId, geometryId, backgroundImageFile, ...rest } = full;
    const geometry = {
      ...rest,
      id: geometryId,
      backgroundImage: `${API_BASE_URL}/api/tracks/${serverId}/background`,
    };
    storageSet(GEO_KEY(geometryId), geometry);
    registerInIndex(geometryId);
    return geometry;
  } catch {
    return null;
  }
}

/**
 * Remove the cached geometry for a single track.
 * Call after deleting a track or when a track is no longer on the server.
 * @param {string} geometryId
 */
export function removeCachedTrackData(geometryId) {
  if (geometryId) {
    storageRemove(GEO_KEY(geometryId));
    unregisterFromIndex(geometryId);
  }
}

/**
 * Fetch fresh server tracks, eagerly cache their geometries, and persist the
 * track list in the local cache. Falls back to the last cached list on any error.
 * @returns {Promise<object[]>}  array of server track summary objects
 */
export async function fetchServerTracks() {
  try {
    const res = await withTimeout(
      fetch(`${API_BASE_URL}/api/tracks`, { credentials: 'include' }),
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tracks = await res.json();
    storageSet(CACHE_KEY, tracks);
    await Promise.allSettled(tracks.map(cacheTrackGeometry));
    return tracks;
  } catch {
    return getCachedServerTracks();
  }
}

/**
 * Sync version for initial render — uses cached server tracks.
 * Cold cache (offline, first load) → empty list; no DEFAULT_TRACKS fallback.
 * @returns {object[]}
 */
export function getInitialTracks() {
  return getCachedServerTracks();
}
