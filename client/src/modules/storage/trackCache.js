// ============================================================
// File:        trackCache.js
// Path:        client/src/modules/storage/trackCache.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Offline cache for server track backgrounds as data-URLs.
//              Track list and geometry are already cached in localStorage
//              by trackLoader; this module handles the heavy background images.
//              Cache is capped at 3 MB (sum of stored data-URL strings).
// ============================================================

import { storageGet, storageSet, storageRemove } from './storage.js';

const BACKGROUNDS_KEY = 'racearena:cache:backgrounds';
const META_KEY = 'racearena:cache:backgroundsMeta';
const CACHE_LIMIT_BYTES = 3 * 1024 * 1024; // 3 MB

/**
 * Returns the stored backgrounds map: { [trackId]: dataUrl }
 * @returns {Record<string, string>}
 */
export function readBackgroundCache() {
  return storageGet(BACKGROUNDS_KEY, {});
}

/**
 * Returns the metadata map: { [trackId]: { size: number, savedAt: string } }
 * @returns {Record<string, { size: number, savedAt: string }>}
 */
function readMeta() {
  return storageGet(META_KEY, {});
}

function writeMeta(meta) {
  storageSet(META_KEY, meta);
}

/**
 * Store one background as a data-URL. Evicts oldest entries if over the limit.
 * @param {string} trackId
 * @param {string} dataUrl  — base64 data URL
 */
export function cacheBackground(trackId, dataUrl) {
  const cache = readBackgroundCache();
  const meta = readMeta();

  cache[trackId] = dataUrl;
  meta[trackId] = { size: dataUrl.length, savedAt: new Date().toISOString() };

  _evictIfNeeded(cache, meta);

  const ok = storageSet(BACKGROUNDS_KEY, cache);
  if (!ok) {
    // Quota exceeded even after eviction — remove the entry we just tried to add
    delete cache[trackId];
    delete meta[trackId];
  }
  writeMeta(meta);
}

/**
 * Returns the cached data-URL for a track, or null if not cached.
 * @param {string} trackId
 * @returns {string|null}
 */
export function getCachedBackground(trackId) {
  return readBackgroundCache()[trackId] ?? null;
}

/** Remove all background cache entries (used in tests and system reset). */
export function clearBackgroundCache() {
  storageRemove(BACKGROUNDS_KEY);
  storageRemove(META_KEY);
}

function _totalSize(meta) {
  return Object.values(meta).reduce((sum, m) => sum + m.size, 0);
}

function _evictIfNeeded(cache, meta) {
  if (_totalSize(meta) <= CACHE_LIMIT_BYTES) return;

  // Sort by savedAt ascending → evict oldest first
  const sorted = Object.entries(meta).sort(
    ([, a], [, b]) => new Date(a.savedAt) - new Date(b.savedAt)
  );

  for (const [id] of sorted) {
    if (_totalSize(meta) <= CACHE_LIMIT_BYTES) break;
    delete cache[id];
    delete meta[id];
  }
}
