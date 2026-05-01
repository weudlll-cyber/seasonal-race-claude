// ============================================================
// File:        trackLoader.js
// Path:        client/src/modules/storage/trackLoader.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Async loader that merges code-defined defaults with custom
//              tracks served by the backend. Geometry is eagerly cached in
//              localStorage so existing getTrack(geometryId) calls work
//              unchanged. Falls back to localStorage cache when offline.
// ============================================================

import { API_BASE_URL } from '../../services/api.js';
import { storageGet, storageSet, storageRemove, KEYS } from './storage.js';
import { DEFAULT_TRACKS } from './defaults.js';
import { cacheBackground, getCachedBackground, removeBackgroundFromCache } from './trackCache.js';
import { registerInIndex, unregisterFromIndex } from '../track-editor/trackStorage.js';

export const CACHE_KEY = 'racearena:cache:serverTracks';
const GEO_KEY = (id) => `racearena:trackGeometries:${id}`;
const FETCH_TIMEOUT_MS = 3000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

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
      fetch(`${API_BASE_URL}/api/tracks/${summaryTrack.id}`),
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

    // Fetch and cache the background image as a data-URL for offline use.
    // Best-effort: failures are silently ignored — server URL still works when online.
    _cacheBackgroundAsync(serverId).catch(() => {});

    return geometry;
  } catch {
    return null;
  }
}

async function _cacheBackgroundAsync(trackId) {
  try {
    const res = await withTimeout(
      fetch(`${API_BASE_URL}/api/tracks/${trackId}/background`),
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    cacheBackground(trackId, dataUrl);
  } catch {
    // Background cache failure is non-critical — online URL still works
  }
}

/**
 * Remove the cached geometry and background for a single track.
 * Call after deleting a track or when a track is no longer on the server.
 * @param {string} geometryId
 * @param {string} trackId
 */
export function removeCachedTrackData(geometryId, trackId) {
  if (geometryId) {
    storageRemove(GEO_KEY(geometryId));
    unregisterFromIndex(geometryId);
  }
  if (trackId) removeBackgroundFromCache(trackId);
}

/**
 * Remove cached geometries and backgrounds for server tracks that no longer
 * exist on the server (evicted between two successful fetches).
 * @param {object[]} newTracks — fresh list from server
 */
function purgeStaleServerGeometries(newTracks) {
  const oldTracks = getCachedServerTracks();
  const newIds = new Set(newTracks.map((t) => t.id));
  for (const old of oldTracks) {
    if (!newIds.has(old.id)) {
      removeCachedTrackData(null, old.id);
    }
  }
}

/**
 * Fetch fresh server tracks, eagerly cache their geometries, and persist the
 * track list in the local cache. Falls back to the last cached list on any error.
 * @returns {Promise<object[]>}  array of server track summary objects
 */
export async function fetchServerTracks() {
  try {
    const res = await withTimeout(fetch(`${API_BASE_URL}/api/tracks`), FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tracks = await res.json();
    purgeStaleServerGeometries(tracks); // A5.4 — remove cache entries for deleted tracks
    storageSet(CACHE_KEY, tracks);
    await Promise.allSettled(tracks.map(cacheTrackGeometry));
    return tracks;
  } catch {
    return getCachedServerTracks();
  }
}

/**
 * Returns all tracks: local defaults (from KEYS.TRACKS in localStorage, falling
 * back to code DEFAULT_TRACKS), merged with server custom tracks.
 * Server tracks deduplicate any local copy of the same ID.
 * @returns {Promise<object[]>}
 */
export async function loadAllTracks() {
  const localTracks = storageGet(KEYS.TRACKS, DEFAULT_TRACKS);
  const serverTracks = await fetchServerTracks();
  const serverIds = new Set(serverTracks.map((t) => t.id));
  return [...localTracks.filter((t) => !serverIds.has(t.id)), ...serverTracks];
}

/**
 * Sync version for initial render — uses cached server tracks.
 * @returns {object[]}
 */
export function getInitialTracks() {
  const localTracks = storageGet(KEYS.TRACKS, DEFAULT_TRACKS);
  const cached = getCachedServerTracks();
  const serverIds = new Set(cached.map((t) => t.id));
  return [...localTracks.filter((t) => !serverIds.has(t.id)), ...cached];
}

/**
 * Returns the background URL for a track.
 * Server tracks: returns cached data-URL if available (works offline),
 * otherwise the live server endpoint URL.
 * Local tracks: returns geometry's backgroundImage field as-is.
 * @param {string} trackId
 * @param {string|undefined} geometryBackgroundImage  — from cached geometry
 * @returns {string}
 */
export function getTrackBackgroundUrl(trackId, geometryBackgroundImage) {
  const serverIds = new Set(getCachedServerTracks().map((t) => t.id));
  if (serverIds.has(trackId)) {
    return getCachedBackground(trackId) ?? `${API_BASE_URL}/api/tracks/${trackId}/background`;
  }
  return geometryBackgroundImage ?? '';
}
