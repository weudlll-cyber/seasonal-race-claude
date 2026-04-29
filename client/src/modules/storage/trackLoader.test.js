// ============================================================
// File:        trackLoader.test.js
// Path:        client/src/modules/storage/trackLoader.test.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Unit tests for trackLoader — server fetch, geometry caching,
//              cache fallback, combined track list
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCachedServerTracks,
  fetchServerTracks,
  cacheTrackGeometry,
  getInitialTracks,
  getTrackBackgroundUrl,
  removeCachedTrackData,
  CACHE_KEY,
} from './trackLoader.js';
import { cacheBackground, getCachedBackground } from './trackCache.js';
import { storageSet, storageGet, KEYS } from './storage.js';

const MOCK_TRACK_SUMMARY = {
  id: 'test-track-1',
  name: 'Test Track',
  icon: '🏁',
  geometryId: 'custom-geo-abc',
  worldWidth: 1280,
  worldHeight: 720,
  isDefault: false,
};

const MOCK_TRACK_FULL = {
  ...MOCK_TRACK_SUMMARY,
  closed: true,
  sourceMode: 'center',
  centerPoints: [{ x: 100, y: 100 }],
  innerPoints: [{ x: 90, y: 90 }],
  outerPoints: [{ x: 110, y: 110 }],
  effects: [],
  width: 140,
  pathLengthPx: 1234,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getCachedServerTracks', () => {
  it('returns empty array when cache is empty', () => {
    expect(getCachedServerTracks()).toEqual([]);
  });

  it('returns cached tracks when cache is populated', () => {
    storageSet(CACHE_KEY, [MOCK_TRACK_SUMMARY]);
    expect(getCachedServerTracks()).toEqual([MOCK_TRACK_SUMMARY]);
  });
});

describe('fetchServerTracks', () => {
  it('fetches tracks and caches them', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [MOCK_TRACK_SUMMARY],
        })
        .mockResolvedValue({ ok: true, json: async () => MOCK_TRACK_FULL })
    );

    const result = await fetchServerTracks();
    expect(result).toEqual([MOCK_TRACK_SUMMARY]);
    expect(storageGet(CACHE_KEY, [])).toEqual([MOCK_TRACK_SUMMARY]);
  });

  it('falls back to cache when server returns non-ok status', async () => {
    storageSet(CACHE_KEY, [MOCK_TRACK_SUMMARY]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const result = await fetchServerTracks();
    expect(result).toEqual([MOCK_TRACK_SUMMARY]);
  });

  it('falls back to cache when fetch throws (server unreachable)', async () => {
    storageSet(CACHE_KEY, [MOCK_TRACK_SUMMARY]);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await fetchServerTracks();
    expect(result).toEqual([MOCK_TRACK_SUMMARY]);
  });

  it('returns empty array when server unreachable and no cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await fetchServerTracks();
    expect(result).toEqual([]);
  });
});

describe('cacheTrackGeometry', () => {
  it('stores geometry in localStorage under the geometry key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_TRACK_FULL,
      })
    );

    await cacheTrackGeometry(MOCK_TRACK_SUMMARY);

    const cached = storageGet(`racearena:trackGeometries:${MOCK_TRACK_FULL.geometryId}`, null);
    expect(cached).not.toBeNull();
    expect(cached.innerPoints).toEqual(MOCK_TRACK_FULL.innerPoints);
  });

  it('sets backgroundImage to the server URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_TRACK_FULL,
      })
    );

    await cacheTrackGeometry(MOCK_TRACK_SUMMARY);

    const cached = storageGet(`racearena:trackGeometries:${MOCK_TRACK_FULL.geometryId}`, null);
    expect(cached.backgroundImage).toContain(`/api/tracks/${MOCK_TRACK_FULL.id}/background`);
  });

  it('returns null without throwing when server returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const result = await cacheTrackGeometry(MOCK_TRACK_SUMMARY);
    expect(result).toBeNull();
  });
});

describe('getInitialTracks', () => {
  it('returns DEFAULT_TRACKS when no localStorage data', () => {
    const tracks = getInitialTracks();
    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length).toBeGreaterThan(0);
  });

  it('deduplicates server tracks from local tracks', () => {
    storageSet(KEYS.TRACKS, [{ id: 'test-track-1', name: 'Local Copy' }]);
    storageSet(CACHE_KEY, [MOCK_TRACK_SUMMARY]);

    const tracks = getInitialTracks();
    const testTrack = tracks.filter((t) => t.id === 'test-track-1');
    expect(testTrack).toHaveLength(1);
    expect(testTrack[0].name).toBe('Test Track'); // server version wins
  });
});

describe('getTrackBackgroundUrl', () => {
  it('returns server URL for server tracks', () => {
    storageSet(CACHE_KEY, [MOCK_TRACK_SUMMARY]);
    const url = getTrackBackgroundUrl('test-track-1', '/local/path.jpg');
    expect(url).toContain('/api/tracks/test-track-1/background');
  });

  it('returns geometry backgroundImage for non-server tracks', () => {
    const url = getTrackBackgroundUrl('dirt-oval', '/assets/tracks/dirt-oval.jpg');
    expect(url).toBe('/assets/tracks/dirt-oval.jpg');
  });

  it('returns empty string when no backgroundImage and not a server track', () => {
    const url = getTrackBackgroundUrl('unknown', undefined);
    expect(url).toBe('');
  });
});

describe('removeCachedTrackData', () => {
  it('removes cached geometry from localStorage', () => {
    storageSet('racearena:trackGeometries:custom-geo-xyz', { id: 'custom-geo-xyz', name: 'X' });
    removeCachedTrackData('custom-geo-xyz', 'track-xyz');
    const after = storageGet('racearena:trackGeometries:custom-geo-xyz', null);
    expect(after).toBeNull();
  });

  it('removes background from background cache', () => {
    cacheBackground('track-xyz', 'data:image/jpeg;base64,abc==');
    expect(getCachedBackground('track-xyz')).toBeTruthy();
    removeCachedTrackData('custom-geo-xyz', 'track-xyz');
    expect(getCachedBackground('track-xyz')).toBeNull();
  });

  it('is a no-op when geometry or track ID is falsy', () => {
    expect(() => removeCachedTrackData(null, null)).not.toThrow();
    expect(() => removeCachedTrackData(undefined, undefined)).not.toThrow();
  });
});

describe('fetchServerTracks — purge stale geometries', () => {
  it('removes geometry for a track that disappeared from server', async () => {
    // Seed cache with two tracks
    storageSet(CACHE_KEY, [
      MOCK_TRACK_SUMMARY,
      { id: 'old-track', geometryId: 'custom-old-geo', name: 'Old' },
    ]);
    storageSet('racearena:trackGeometries:custom-old-geo', { id: 'custom-old-geo', name: 'Old' });

    // Server now returns only the new track (old-track removed)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [MOCK_TRACK_SUMMARY],
      })
    );

    await fetchServerTracks();

    const gone = storageGet('racearena:trackGeometries:custom-old-geo', null);
    expect(gone).toBeNull();
  });
});
