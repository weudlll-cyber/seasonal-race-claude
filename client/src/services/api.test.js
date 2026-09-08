// @vitest-environment node
// SUITE-ENV-SPLIT: no DOM and no browser global, here or in anything this file imports — see the
// note in vitest.config.js. Verified by running it in BOTH environments: same tests, same count.
// ============================================================
// File:        api.test.js
// Path:        client/src/services/api.test.js
// Project:     RaceArena — RUNTIME-API-URL-1
//
// `API_BASE_URL` is a module-level constant evaluated at IMPORT, which is the whole reason the
// server injects its script into <head> rather than fetching later. So each case here sets the
// world, resets the module registry, and imports fresh — testing it any other way would test a
// value that was decided before the test began.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const GLOBAL = '__RA_RUNTIME_CONFIG__';

async function freshApi() {
  vi.resetModules();
  return import('./api.js');
}

describe('API_BASE_URL — where the address comes from', () => {
  beforeEach(() => {
    delete globalThis[GLOBAL];
  });
  afterEach(() => {
    delete globalThis[GLOBAL];
  });

  it('★ nothing configured → today’s behaviour, exactly', async () => {
    const { API_BASE_URL, DEFAULT_API_BASE_URL } = await freshApi();
    expect(DEFAULT_API_BASE_URL).toBe('http://localhost:4000');
    expect(API_BASE_URL).toBe('http://localhost:4000');
  });

  it('★ the RUNTIME value is used when the server injected one', async () => {
    globalThis[GLOBAL] = { apiBaseUrl: 'https://races.example.com' };
    const { API_BASE_URL } = await freshApi();
    expect(API_BASE_URL).toBe('https://races.example.com');
  });

  it('★ the SAME bundle answers a DIFFERENT address — no rebuild in between', async () => {
    globalThis[GLOBAL] = { apiBaseUrl: 'https://one.example.com' };
    const first = (await freshApi()).API_BASE_URL;
    globalThis[GLOBAL] = { apiBaseUrl: 'https://two.example.com' };
    const second = (await freshApi()).API_BASE_URL;
    expect(first).toBe('https://one.example.com');
    expect(second).toBe('https://two.example.com');
    expect(first).not.toBe(second);
  });

  it('a trailing slash cannot produce two different request URLs', async () => {
    globalThis[GLOBAL] = { apiBaseUrl: 'https://races.example.com/' };
    expect((await freshApi()).API_BASE_URL).toBe('https://races.example.com');
  });

  it.each([
    ['an absent global', undefined],
    ['a non-object', 'nonsense'],
    ['an empty string', { apiBaseUrl: '' }],
    ['whitespace', { apiBaseUrl: '   ' }],
    ['a non-string', { apiBaseUrl: 42 }],
    ['no such key', { somethingElse: 1 }],
  ])('%s falls through to the fallback rather than throwing', async (_label, value) => {
    if (value !== undefined) globalThis[GLOBAL] = value;
    const { API_BASE_URL } = await freshApi();
    expect(API_BASE_URL).toBe('http://localhost:4000');
  });
});

describe('★ no deployment address is written into this module', () => {
  it('the only host literal in the source is the localhost fallback', async () => {
    // Read from the working directory, not from `import.meta.url`: under Vite that is not a file
    // URL. The client suite runs with cwd = `client/` (scripts/verify.mjs spawns it there).
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'src/services/api.js'), 'utf8');
    // Comments are free to name example hosts while explaining the design — the JSDoc does, and
    // should. What must name only the fallback is the CODE, so line and block comments both go.
    const code = src
      .split('\n')
      .filter((l) => {
        const t = l.trimStart();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      })
      .join('\n');
    const hosts = [...code.matchAll(/https?:\/\/([A-Za-z0-9._-]+)/g)].map((m) => m[1]);
    expect([...new Set(hosts)]).toEqual(['localhost']);
  });
});
