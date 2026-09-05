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
    // The OTHER silent exit, and it is not an exception so the catch below never saw it.
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  } catch (err) {
    // QUIET-FAILURES-1: a dropped geometry used to be invisible — this returned null, the caller
    // discarded it through `Promise.allSettled`, and the track then rendered from the list with no
    // geometry behind it. `SetupScreen` reads a missing geometry as a CLOSED track, so an open
    // track became a laps race with the right name and the right picture. Say it instead.
    console.warn(
      `[tracks] geometry for "${summaryTrack?.id}" could not be cached — ${err?.message ?? 'request failed'}; this track will be REFUSED rather than raced on a guess`
    );
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
/** SERVER-GONE-1: report by event, never by import — this file is in the engine hull. See apiClient.js. */
function reportServerReachable(reachable) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('racearena:server-status', { detail: { reachable } }));
}

export async function fetchServerTracks() {
  // SERVER-GONE-1: whether the server ANSWERED this call, which is not the same question as the
  // module-wide status — that could still say `reachable` from an earlier request, and reading it
  // here would let a real transport failure pass unreported.
  let answered = false;
  try {
    const res = await withTimeout(
      fetch(`${API_BASE_URL}/api/tracks`, { credentials: 'include' }),
      FETCH_TIMEOUT_MS
    );
    // SERVER-GONE-1: this loader has its own fetch and does not pass through `apiClient.apiCall`,
    // so it reports for itself. A response of any status is an answer; see `serverStatus.js`.
    answered = true;
    reportServerReachable(true);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tracks = await res.json();
    storageSet(CACHE_KEY, tracks);
    // QUIET-FAILURES-1: `allSettled` discards its results by design — it must not let one bad
    // geometry take the whole list down. What it must NOT do is stay silent about how many were
    // lost, because the list then renders complete while some of its tracks have nothing behind
    // them. Each drop already announced itself in `cacheTrackGeometry`; this is the tally.
    const settled = await Promise.allSettled(tracks.map(cacheTrackGeometry));
    const missing = settled.filter((s) => s.status !== 'fulfilled' || s.value === null).length;
    if (missing > 0) {
      console.warn(
        `[tracks] ${missing} of ${tracks.length} track geometries could not be cached — those tracks cannot be raced until the server answers for them`
      );
    }
    return tracks;
  } catch (err) {
    // SERVER-GONE-1: an HTTP error from a running server is NOT an unreachable server, and this
    // catch takes both. Only the branch where nothing answered is reported.
    if (!answered) reportServerReachable(false);
    // QUIET-FAILURES-1: the list itself failed, so what is on screen is the LAST KNOWN list, not
    // the server's. Silently identical to a successful load until now.
    const cached = getCachedServerTracks();
    console.warn(
      `[tracks] the track list could not be fetched — ${err?.message ?? 'request failed'}; showing ${cached.length} track(s) from the last successful load`
    );
    return cached;
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
