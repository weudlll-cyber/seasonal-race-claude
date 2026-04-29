// ============================================================
// File:        trackCache.test.js
// Path:        client/src/modules/storage/trackCache.test.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Unit tests for offline background image cache
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cacheBackground,
  getCachedBackground,
  clearBackgroundCache,
  readBackgroundCache,
} from './trackCache.js';

const SMALL_DATA_URL = 'data:image/jpeg;base64,/9j/smallimage==';
const LARGE_DATA_URL = 'data:image/jpeg;base64,' + 'A'.repeat(2 * 1024 * 1024); // 2 MB

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('cacheBackground / getCachedBackground', () => {
  it('stores and retrieves a background', () => {
    cacheBackground('track-a', SMALL_DATA_URL);
    expect(getCachedBackground('track-a')).toBe(SMALL_DATA_URL);
  });

  it('returns null when track is not cached', () => {
    expect(getCachedBackground('nonexistent')).toBeNull();
  });

  it('overwrites an existing cached background', () => {
    cacheBackground('track-a', SMALL_DATA_URL);
    cacheBackground('track-a', 'data:image/png;base64,updated==');
    expect(getCachedBackground('track-a')).toBe('data:image/png;base64,updated==');
  });
});

describe('clearBackgroundCache', () => {
  it('removes all cached backgrounds', () => {
    cacheBackground('track-a', SMALL_DATA_URL);
    cacheBackground('track-b', SMALL_DATA_URL);
    clearBackgroundCache();
    expect(getCachedBackground('track-a')).toBeNull();
    expect(getCachedBackground('track-b')).toBeNull();
  });
});

describe('eviction on quota', () => {
  it('evicts oldest entries when total exceeds 3 MB', () => {
    // Two 2 MB entries exceed the 3 MB limit — oldest should be evicted
    cacheBackground('old-track', LARGE_DATA_URL);
    cacheBackground('new-track', LARGE_DATA_URL);

    const cache = readBackgroundCache();
    // At least one entry should have been evicted to stay under limit
    const storedCount = Object.keys(cache).length;
    expect(storedCount).toBeLessThan(2);
    // The newer entry should be retained (LRU eviction, oldest goes first)
    expect(getCachedBackground('new-track')).toBe(LARGE_DATA_URL);
  });

  it('survives a localStorage quota error gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new DOMException('QuotaExceededError');
      Object.defineProperty(err, 'name', { value: 'QuotaExceededError' });
      throw err;
    });

    // Should not throw
    expect(() => cacheBackground('any-track', SMALL_DATA_URL)).not.toThrow();
    spy.mockRestore();
  });
});
