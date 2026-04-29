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
import { storageGet, storageSet, KEYS } from './storage.js';
import { DEFAULT_TRACKS } from './defaults.js';
import { cacheBackground, getCachedBackground } from './trackCache.js';

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
    const geometry = {
      id: full.geometryId,
      name: full.name,
      backgroundImage: `${API_BASE_URL}/api/tracks/${full.id}/background`,
      closed: full.closed,
      sourceMode: full.sourceMode,
      centerPoints: full.centerPoints,
      innerPoints: full.innerPoints,
      outerPoints: full.outerPoints,
      effects: full.effects ?? [],
      worldWidth: full.worldWidth,
      worldHeight: full.worldHeight,
      width: full.width,
      pathLengthPx: full.pathLengthPx,
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
    };
    storageSet(GEO_KEY(full.geometryId), geometry);

    // Fetch and cache the background image as a data-URL for offline use.
    // Best-effort: failures are silently ignored — server URL still works when online.
    _cacheBackgroundAsync(full.id).catch(() => {});

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
 * Fetch fresh server tracks, eagerly cache their geometries, and persist the
 * track list in the local cache. Falls back to the last cached list on any error.
 * @returns {Promise<object[]>}  array of server track summary objects
 */
export async function fetchServerTracks() {
  try {
    const res = await withTimeout(fetch(`${API_BASE_URL}/api/tracks`), FETCH_TIMEOUT_MS);
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
