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
  removeCachedTrackData,
  CACHE_KEY,
} from './trackLoader.js';
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

// QUIET-FAILURES-1 made this loader SPEAK on its failure paths, and most of the tests in this file
// provoke exactly those paths on purpose. A file-level spy captures the output instead of printing
// it: an intentional failure is not console noise, and vitest forwards every worker console line to
// the main process over an RPC that must not still be in flight at teardown. CI-DOCS-ONLY-1's merge
// run went red on precisely that — `EnvironmentTeardownError: Closing rpc while "onUserConsoleLog"
// was pending` — with all 4111 tests passing. The suite was right; the console traffic was the
// problem. `warn` is exported to the tests below so they can still ASSERT what was said.
let warn;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
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

describe('removeCachedTrackData', () => {
  it('removes cached geometry from localStorage', () => {
    storageSet('racearena:trackGeometries:custom-geo-xyz', { id: 'custom-geo-xyz', name: 'X' });
    removeCachedTrackData('custom-geo-xyz');
    const after = storageGet('racearena:trackGeometries:custom-geo-xyz', null);
    expect(after).toBeNull();
  });

  it('is a no-op when geometryId is falsy', () => {
    expect(() => removeCachedTrackData(null)).not.toThrow();
    expect(() => removeCachedTrackData(undefined)).not.toThrow();
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

    removeCachedTrackData(MOCK_TRACK_FULL.geometryId);

    const after = JSON.parse(localStorage.getItem('racearena:trackGeometries:index') ?? '[]');
    expect(after).not.toContain(MOCK_TRACK_FULL.geometryId);
  });

  it('listTracks() no longer returns the geometry after removeCachedTrackData', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK_FULL })
    );
    await cacheTrackGeometry(MOCK_TRACK_SUMMARY);
    removeCachedTrackData(MOCK_TRACK_FULL.geometryId);

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

// ── QUIET-FAILURES-1 ─────────────────────────────────────────────────────────────────────────────
//
// WHAT BREAKS IF THIS BLOCK IS DELETED: the loader goes back to failing in complete silence, and
// nothing in the repository exercises its failure path — which is exactly how the class survived.
// A dropped geometry returned null, `Promise.allSettled` discarded it, and the track then rendered
// from the list with nothing behind it; `SetupScreen` read that as a CLOSED track, so an open track
// became a laps race with the right name and the right picture and no message anywhere.
//
// Each test states the failure it simulates and asserts the HONEST behaviour. The happy-path tests
// at the end are the other half of the piece's promise: on success, nothing changed and nothing is
// said.
describe('trackLoader — the failure path SAYS SO (QUIET-FAILURES-1)', () => {
  // Uses the file-level `warn` spy installed above — one spy, so a test cannot accidentally assert
  // against a console that something else already replaced.

  it('a geometry that times out is NAMED, not silently dropped', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

    const result = await cacheTrackGeometry(MOCK_TRACK_SUMMARY);

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(`geometry for "${MOCK_TRACK_SUMMARY.id}" could not be cached`)
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('REFUSED'));
  });

  it('an HTTP error is NAMED too — it was the silent exit the catch never saw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    expect(await cacheTrackGeometry(MOCK_TRACK_SUMMARY)).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('HTTP 500'));
  });

  it('the LIST failing says how many tracks are being shown from the last good load', async () => {
    storageSet(CACHE_KEY, [MOCK_TRACK_SUMMARY]);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const tracks = await fetchServerTracks();

    expect(tracks).toEqual([MOCK_TRACK_SUMMARY]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('the track list could not be fetched')
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('1 track(s) from the last'));
  });

  it('a list that loads while its geometries drop reports the TALLY', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((url) =>
          String(url).endsWith('/api/tracks')
            ? Promise.resolve({ ok: true, json: async () => [MOCK_TRACK_SUMMARY] })
            : Promise.reject(new Error('timeout'))
        )
    );

    await fetchServerTracks();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('1 of 1 track geometries could not be cached')
    );
  });

  // ── THE HAPPY PATH IS UNCHANGED, AND THAT IS ASSERTED RATHER THAN CLAIMED ──────────────────────
  it('HAPPY PATH: a successful geometry fetch returns the same object and says NOTHING', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK_FULL })
    );

    const geometry = await cacheTrackGeometry(MOCK_TRACK_SUMMARY);

    expect(geometry.id).toBe(MOCK_TRACK_FULL.geometryId);
    expect(geometry.closed).toBe(MOCK_TRACK_FULL.closed);
    expect(warn).not.toHaveBeenCalled();
  });

  it('HAPPY PATH: a successful list fetch returns the tracks and says NOTHING', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) =>
        Promise.resolve({
          ok: true,
          json: async () =>
            String(url).endsWith('/api/tracks') ? [MOCK_TRACK_SUMMARY] : MOCK_TRACK_FULL,
        })
      )
    );

    expect(await fetchServerTracks()).toEqual([MOCK_TRACK_SUMMARY]);
    expect(warn).not.toHaveBeenCalled();
  });
});
