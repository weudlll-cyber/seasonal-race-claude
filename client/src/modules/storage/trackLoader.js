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
import { storageGet, storageSet, storageRemove } from './storage.js';
import { cacheBackground, getCachedBackground, removeBackgroundFromCache } from './trackCache.js';
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

    // Fetch and cache the background image as a data-URL for offline use.
    // Best-effort: failures are silently ignored — server URL still works when online.
    _cacheBackgroundAsync(serverId).catch(() => {});

    return geometry;
  } catch {
    return null;
  }
}

/**
 * Downscales a blob to a JPEG data-URL that fits within the 3 MB cache limit.
 * Default: max 1280 px on the longest side, JPEG quality 0.6 (~150–350 KB typical).
 * Transparent areas become black — acceptable for the darkened race background.
 * @param {Blob} blob
 * @param {number} maxDim
 * @param {number} quality
 * @returns {Promise<string>}
 */
export async function downscaleToJpegDataUrl(blob, maxDim = 1280, quality = 0.6) {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (typeof bitmap.close === 'function') bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}

async function _cacheBackgroundAsync(trackId) {
  try {
    const res = await withTimeout(
      fetch(`${API_BASE_URL}/api/tracks/${trackId}/background`, { credentials: 'include' }),
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const dataUrl = await downscaleToJpegDataUrl(blob);
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
    const res = await withTimeout(
      fetch(`${API_BASE_URL}/api/tracks`, { credentials: 'include' }),
      FETCH_TIMEOUT_MS
    );
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
 * Sync version for initial render — uses cached server tracks.
 * Cold cache (offline, first load) → empty list; no DEFAULT_TRACKS fallback.
 * @returns {object[]}
 */
export function getInitialTracks() {
  return getCachedServerTracks();
}

/**
 * Returns the background URL for a track.
 * Returns the cached data-URL when available (works offline), otherwise the
 * live server endpoint URL.
 * @param {string} trackId
 * @returns {string}
 */
export function getTrackBackgroundUrl(trackId) {
  return getCachedBackground(trackId) ?? `${API_BASE_URL}/api/tracks/${trackId}/background`;
}

/**
 * Maps a server background URL to its locally-cached data-URL when available.
 * Non-server paths (data: URLs, local paths) are returned unchanged.
 * Offline-safe: resolves to data-URL from localStorage cache first, server URL as fallback.
 * @param {string} backgroundImage
 * @returns {string}
 */
export function resolveBackgroundSrc(backgroundImage) {
  if (!backgroundImage || typeof backgroundImage !== 'string') return backgroundImage;
  let pathname;
  try {
    pathname = new URL(backgroundImage, API_BASE_URL).pathname;
  } catch {
    return backgroundImage;
  }
  const m = pathname.match(/^\/api\/tracks\/([^/]+)\/background\/?$/);
  if (!m) return backgroundImage;
  return getCachedBackground(m[1]) ?? backgroundImage;
}
