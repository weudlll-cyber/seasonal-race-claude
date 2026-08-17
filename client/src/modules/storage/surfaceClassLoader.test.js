// ============================================================
// File:        surfaceClassLoader.test.js
// Path:        client/src/modules/storage/surfaceClassLoader.test.js
// Project:     RaceArena — QUIET-FAILURES-1
//
// WHAT BREAKS IF THIS FILE IS DELETED: this loader goes back to having NO tests at all — it had
// none before today — and its failure path returns to being indistinguishable from success.
//
// The failure is not academic. `fetchServerSurfaceClasses` has a 3000 ms timeout and falls back to
// the localStorage cache, which is EMPTY on a cold profile. The registry then holds nothing but the
// code defaults, so every custom surface class and every override the owner made is simply absent —
// from the Setup screen's racer filter and from the trails during the race — and nothing anywhere
// said the fetch had failed. On a fast local API this never happens, which is why it went unseen.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchServerSurfaceClasses, getCachedServerSurfaceClasses } from './surfaceClassLoader.js';
import { storageSet, KEYS } from './storage.js';

const CUSTOM = [{ id: 'lava', name: 'Lava', isOverride: false, isDefault: false }];

describe('surfaceClassLoader — the failure path SAYS SO (QUIET-FAILURES-1)', () => {
  let warn;
  beforeEach(() => {
    localStorage.clear();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
    vi.unstubAllGlobals();
  });

  it('a failed fetch on a COLD cache says the classes may be missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

    const classes = await fetchServerSurfaceClasses();

    expect(classes).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be fetched'));
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('custom classes and overrides may be missing')
    );
  });

  it('a failed fetch on a WARM cache says how many it fell back to', async () => {
    storageSet(KEYS.SURFACE_CLASSES_CACHE, CUSTOM);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const classes = await fetchServerSurfaceClasses();

    expect(classes).toEqual(CUSTOM);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('using 1 cached class(es)'));
  });

  it('the cache is still the fallback — the failure is REPORTED, not made fatal', async () => {
    storageSet(KEYS.SURFACE_CLASSES_CACHE, CUSTOM);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(fetchServerSurfaceClasses()).resolves.toEqual(CUSTOM);
    expect(getCachedServerSurfaceClasses()).toEqual(CUSTOM);
  });

  // ── THE HAPPY PATH IS UNCHANGED, AND THAT IS ASSERTED RATHER THAN CLAIMED ──────────────────────
  it('HAPPY PATH: a successful fetch returns the classes, caches them, and says NOTHING', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => CUSTOM }));

    expect(await fetchServerSurfaceClasses()).toEqual(CUSTOM);
    expect(getCachedServerSurfaceClasses()).toEqual(CUSTOM);
    expect(warn).not.toHaveBeenCalled();
  });
});
