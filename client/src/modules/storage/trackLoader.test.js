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
import { storageSet, storageGet } from './storage.js';
import { listTracks } from '../track-editor/trackStorage.js';

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
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
  it('cold cache + stale local data → returns [] (server cache is the only source)', () => {
    storageSet('racearena:tracks', [{ id: 'local-only', name: 'Local Only' }]); // ignored
    const tracks = getInitialTracks();
    expect(tracks).toEqual([]);
  });

  it('returns cached server tracks when server cache is populated', () => {
    storageSet(CACHE_KEY, [MOCK_TRACK_SUMMARY]);
    const tracks = getInitialTracks();
    expect(tracks).toEqual([MOCK_TRACK_SUMMARY]);
  });
});

describe('getTrackBackgroundUrl', () => {
  it('returns server URL for any track id (all tracks are server-only, step 1)', () => {
    const url = getTrackBackgroundUrl('test-track-1');
    expect(url).toContain('/api/tracks/test-track-1/background');
  });

  it('returns cached data-URL when the background is cached (offline use)', () => {
    cacheBackground('test-track-1', 'data:image/jpeg;base64,abc==');
    const url = getTrackBackgroundUrl('test-track-1');
    expect(url).toBe('data:image/jpeg;base64,abc==');
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
  it('preserves geometry for a track that disappeared from server (TLH-1)', async () => {
    // Seed cache with two tracks
    storageSet(CACHE_KEY, [
      MOCK_TRACK_SUMMARY,
      { id: 'old-track', geometryId: 'custom-old-geo', name: 'Old' },
    ]);
    const geoData = { id: 'custom-old-geo', name: 'Old' };
    storageSet('racearena:trackGeometries:custom-old-geo', geoData);

    // Server now returns only the new track (old-track removed)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [MOCK_TRACK_SUMMARY],
      })
    );

    await fetchServerTracks();

    // Geometry must NOT be removed — it may represent manual drawing work
    const preserved = storageGet('racearena:trackGeometries:custom-old-geo', null);
    expect(preserved).toEqual(geoData);
  });
});

describe('removeCachedTrackData — TLH-1 geometry preservation', () => {
  it('null geometryId skips geometry removal but still clears background', () => {
    storageSet('racearena:trackGeometries:some-geo', { id: 'some-geo' });
    cacheBackground('track-abc', 'data:image/jpeg;base64,abc==');

    removeCachedTrackData(null, 'track-abc');

    // Geometry must survive
    expect(storageGet('racearena:trackGeometries:some-geo', null)).toEqual({ id: 'some-geo' });
    // Background cleared
    expect(getCachedBackground('track-abc')).toBeNull();
  });
});

describe('cacheTrackGeometry — index registration (L.6-Bug2 fix)', () => {
  it('registers the geometry id in the index after caching', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK_FULL })
    );

    await cacheTrackGeometry(MOCK_TRACK_SUMMARY);

    const index = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') ?? '[]');
    expect(index).toContain(MOCK_TRACK_FULL.geometryId);
  });

  it('listTracks() returns the server geometry after cacheTrackGeometry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK_FULL })
    );

    await cacheTrackGeometry(MOCK_TRACK_SUMMARY);

    const list = listTracks();
    expect(list.some((g) => g.id === MOCK_TRACK_FULL.geometryId)).toBe(true);
  });

  it('does not duplicate an id that is already in the index', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK_FULL })
    );

    await cacheTrackGeometry(MOCK_TRACK_SUMMARY);
    await cacheTrackGeometry(MOCK_TRACK_SUMMARY);

    const index = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') ?? '[]');
    const count = index.filter((id) => id === MOCK_TRACK_FULL.geometryId).length;
    expect(count).toBe(1);
  });
});

describe('removeCachedTrackData — index cleanup (L.6-Bug2 fix)', () => {
  it('removes geometry id from the index', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK_FULL })
    );
    await cacheTrackGeometry(MOCK_TRACK_SUMMARY);

    const before = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') ?? '[]');
    expect(before).toContain(MOCK_TRACK_FULL.geometryId);

    removeCachedTrackData(MOCK_TRACK_FULL.geometryId, MOCK_TRACK_SUMMARY.id);

    const after = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') ?? '[]');
    expect(after).not.toContain(MOCK_TRACK_FULL.geometryId);
  });

  it('listTracks() no longer returns the geometry after removeCachedTrackData', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK_FULL })
    );
    await cacheTrackGeometry(MOCK_TRACK_SUMMARY);
    removeCachedTrackData(MOCK_TRACK_FULL.geometryId, MOCK_TRACK_SUMMARY.id);

    const list = listTracks();
    expect(list.some((g) => g.id === MOCK_TRACK_FULL.geometryId)).toBe(false);
  });
});

// ── Cache round-trip: all server fields must survive cacheTrackGeometry ────────
//
// This suite catches regressions when new fields are added to the track data model.
// With the spread-pattern refactor, new fields flow through automatically — but the
// tests document intent and guard against future whitelist regressions.

const FULL_TRACK_ALL_FIELDS = {
  id: 'track-server-001',
  geometryId: 'geo-abc123',
  name: 'Round-Trip Test Track',
  icon: '🏎️',
  description: 'A track used for round-trip field tests',
  defaultRacerTypeId: 'car',
  color: '#ff8844',
  defaultDuration: 90,
  defaultWinners: 3,
  worldWidth: 1920,
  worldHeight: 1080,
  isDefault: false,
  closed: true,
  sourceMode: 'center',
  width: 100,
  centerPoints: [
    { x: 100, y: 200 },
    { x: 400, y: 200 },
  ],
  innerPoints: [
    { x: 100, y: 150 },
    { x: 400, y: 150 },
  ],
  outerPoints: [
    { x: 100, y: 250 },
    { x: 400, y: 250 },
  ],
  effects: [{ id: 'glow', config: {} }],
  pathLengthPx: 1500,
  backgroundImageFile: 'uploads/bg-internal.jpg', // server-internal — must NOT appear in cache
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-05-01T12:00:00.000Z',
  surfaceClasses: { default: 'asphalt', zone_1: 'grass' },
  maxRacers: 8,
  trackLights: { color: '#3aa0ff', style: 'sync_pulse', speed: 0.7 },
};

describe('cacheTrackGeometry — field round-trip preservation (L37)', () => {
  let cached;

  beforeEach(async () => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => FULL_TRACK_ALL_FIELDS,
        blob: async () => {
          throw new Error('no bg');
        },
      })
    );
    cached = await cacheTrackGeometry({
      id: FULL_TRACK_ALL_FIELDS.id,
      geometryId: FULL_TRACK_ALL_FIELDS.geometryId,
    });
  });

  it('uses geometryId as the cache id', () => {
    expect(cached.id).toBe('geo-abc123');
  });

  it('sets backgroundImage to a computed server URL', () => {
    expect(cached.backgroundImage).toContain(`/api/tracks/${FULL_TRACK_ALL_FIELDS.id}/background`);
  });

  it('does not include backgroundImageFile (server-internal field)', () => {
    expect(cached.backgroundImageFile).toBeUndefined();
  });

  it('does not expose geometryId as a separate field (already mapped to id)', () => {
    expect(cached.geometryId).toBeUndefined();
  });

  // Per-field passthrough: each field is a separate test so failures name the missing field.
  const PASSTHROUGH_FIELDS = [
    'name',
    'icon',
    'description',
    'defaultRacerTypeId',
    'color',
    'defaultDuration',
    'defaultWinners',
    'worldWidth',
    'worldHeight',
    'isDefault',
    'closed',
    'sourceMode',
    'width',
    'centerPoints',
    'innerPoints',
    'outerPoints',
    'effects',
    'pathLengthPx',
    'createdAt',
    'updatedAt',
    'surfaceClasses',
    'maxRacers',
    'trackLights',
  ];

  for (const field of PASSTHROUGH_FIELDS) {
    it(`preserves field "${field}" from server response`, () => {
      expect(cached[field]).toEqual(FULL_TRACK_ALL_FIELDS[field]);
    });
  }

  it('persists trackLights in localStorage', () => {
    const stored = storageGet(
      `racearena:trackGeometries:${FULL_TRACK_ALL_FIELDS.geometryId}`,
      null
    );
    expect(stored).not.toBeNull();
    expect(stored.trackLights).toEqual(FULL_TRACK_ALL_FIELDS.trackLights);
  });

  it('persists surfaceClasses in localStorage', () => {
    const stored = storageGet(
      `racearena:trackGeometries:${FULL_TRACK_ALL_FIELDS.geometryId}`,
      null
    );
    expect(stored.surfaceClasses).toEqual(FULL_TRACK_ALL_FIELDS.surfaceClasses);
  });
});

// ── Honesty proof: credentials:'include' on all server fetches ────────────────
//
// These tests were RED before the fix (fetch was called without credentials,
// causing 401 on every server request after auth was introduced) and GREEN after.

describe('fetchServerTracks — honesty proof: credentials:include (fix: was 401)', () => {
  it('calls fetch with credentials:include for the track list request', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', mockFetch);

    await fetchServerTracks();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tracks'),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('falls back to cache on 401 — no throw propagated to caller', async () => {
    storageSet(CACHE_KEY, [MOCK_TRACK_SUMMARY]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const result = await fetchServerTracks();

    expect(result).toEqual([MOCK_TRACK_SUMMARY]);
  });
});

describe('cacheTrackGeometry — honesty proof: credentials:include (fix: was 401)', () => {
  it('calls fetch with credentials:include for the track detail request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_TRACK_FULL,
    });
    vi.stubGlobal('fetch', mockFetch);

    await cacheTrackGeometry(MOCK_TRACK_SUMMARY);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/tracks/${MOCK_TRACK_SUMMARY.id}`),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('returns null on 401 — no throw propagated to caller', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const result = await cacheTrackGeometry(MOCK_TRACK_SUMMARY);

    expect(result).toBeNull();
  });
});
