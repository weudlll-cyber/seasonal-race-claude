// ============================================================
// File:        runtimeMarker.test.js
// Path:        client/src/modules/runtimeMarker.test.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 2
// Created:     2026-11-11
// Description: The client's base path, read from the server's runtime marker: "" (identity) when
//              there is no marker or no basePath in it — every flow that exists today — and a
//              prefix for root-absolute app paths when there is one. The modules read the marker
//              at import, so each case re-imports them with its own global.
// ============================================================

import { describe, it, expect, afterEach, vi } from 'vitest';

const GLOBAL = '__RA_RUNTIME_CONFIG__';

async function load(config) {
  vi.resetModules();
  if (config === undefined) delete globalThis[GLOBAL];
  else globalThis[GLOBAL] = config;
  return import('./runtimeMarker.js');
}

afterEach(() => {
  delete globalThis[GLOBAL];
});

describe('no base path — today', () => {
  it('★ no marker, or the standalone marker: BASE_PATH is "" and appUrl is the identity', async () => {
    for (const config of [undefined, { apiBaseUrl: '' }, { apiBaseUrl: 'https://x.example' }]) {
      const { BASE_PATH, appUrl } = await load(config);
      expect(BASE_PATH).toBe('');
      for (const p of ['/assets/racers/beetle.png', '/join/abc', 'blob:x', 'data:,x']) {
        expect(appUrl(p)).toBe(p);
      }
    }
  });

  it('a malformed basePath in the marker is ignored rather than trusted', async () => {
    for (const basePath of ['games/race', '/games/race/', '/', '//evil.example', 42]) {
      expect((await load({ apiBaseUrl: '', basePath })).BASE_PATH).toBe('');
    }
  });
});

describe('under "/games/race"', () => {
  it('root-absolute app paths are prefixed; everything else is left alone', async () => {
    const { BASE_PATH, appUrl } = await load({
      apiBaseUrl: '/games/race',
      basePath: '/games/race',
    });
    expect(BASE_PATH).toBe('/games/race');
    expect(appUrl('/assets/racers/beetle.png')).toBe('/games/race/assets/racers/beetle.png');
    expect(appUrl('/join/abc')).toBe('/games/race/join/abc');
    for (const p of [
      'https://x.example/a.png',
      '//cdn.example/a.png',
      'blob:x',
      'data:,x',
      'a.png',
    ]) {
      expect(appUrl(p)).toBe(p);
    }
  });

  it('★ a path already under the base (an API_BASE_URL-built URL) is not prefixed twice', async () => {
    const { appUrl } = await load({ apiBaseUrl: '/games/race', basePath: '/games/race' });
    expect(appUrl('/games/race/api/racers/x/sprite')).toBe('/games/race/api/racers/x/sprite');
    expect(appUrl('/games/race')).toBe('/games/race');
    // ...but a sibling that only SHARES the prefix text is not "under" it
    expect(appUrl('/games/racers.png')).toBe('/games/race/games/racers.png');
  });

  it('the sprite loader asks for a built-in sprite below the base path, cache key unchanged', async () => {
    globalThis[GLOBAL] = { apiBaseUrl: '/games/race', basePath: '/games/race' };
    vi.resetModules();
    const { loadSprite, getCachedSprite } = await import('../racer-types/spriteLoader.js');
    const assigned = [];
    const RealImage = globalThis.Image;
    globalThis.Image = class {
      set src(v) {
        assigned.push(v);
        queueMicrotask(() => this.onload?.());
      }
    };
    try {
      await loadSprite('/assets/racers/beetle.png');
      expect(assigned).toEqual(['/games/race/assets/racers/beetle.png']);
      expect(getCachedSprite('/assets/racers/beetle.png')).toBeTruthy();
    } finally {
      globalThis.Image = RealImage;
    }
  });
});
