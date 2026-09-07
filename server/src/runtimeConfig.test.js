// ============================================================
// File:        runtimeConfig.test.js
// Path:        server/src/runtimeConfig.test.js
// Project:     RaceArena — RUNTIME-API-URL-1
//
// What is pinned here is the ASYMMETRY the piece turns on: absent is fine and starts, present-but-
// wrong refuses. Everything else in this file exists to keep the injected script from being a way
// to put script into a page.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  judgePublicOrigin,
  resolvePublicOrigin,
  assertPublicOriginUsable,
  runtimeConfigScript,
  injectRuntimeConfig,
  RUNTIME_CONFIG_GLOBAL,
} from './runtimeConfig.js';

describe('judgePublicOrigin — what counts as an address', () => {
  it.each([
    ['https://races.example.com', 'https://races.example.com'],
    ['http://198.51.100.7:4000', 'http://198.51.100.7:4000'],
    ['https://races.example.com/', 'https://races.example.com'],
    ['  https://races.example.com  ', 'https://races.example.com'],
    ['http://localhost:4000', 'http://localhost:4000'],
  ])('accepts %s', (input, origin) => {
    expect(judgePublicOrigin(input)).toEqual({ ok: true, origin });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'blank'],
    ['races.example.com', 'no scheme'],
    ['ftp://races.example.com', 'wrong scheme'],
    ['https://races.example.com/app', 'a path'],
    ['https://races.example.com?a=1', 'a query'],
    ['https://user:pw@races.example.com', 'credentials'],
    [undefined, 'undefined'],
    [42, 'not a string'],
  ])('refuses %s (%s)', (input) => {
    expect(judgePublicOrigin(input).ok).toBe(false);
  });

  it('★ every refusal names a reason — a refusal with no reason is a dead end', () => {
    for (const bad of ['', 'races.example.com', 'https://x/app', 'ftp://x']) {
      const v = judgePublicOrigin(bad);
      expect(v.ok).toBe(false);
      expect(typeof v.reason === 'string' && v.reason.length > 0).toBe(true);
    }
  });
});

describe('★ the asymmetry: absent starts, wrong refuses', () => {
  it('absent → null, and nothing throws (the owner’s dev machine)', () => {
    expect(resolvePublicOrigin({})).toBeNull();
    expect(assertPublicOriginUsable({})).toBeNull();
    expect(assertPublicOriginUsable({ RA_PUBLIC_ORIGIN: '' })).toBeNull();
    expect(assertPublicOriginUsable({ RA_PUBLIC_ORIGIN: '   ' })).toBeNull();
  });

  it('present and good → the normalised origin', () => {
    expect(assertPublicOriginUsable({ RA_PUBLIC_ORIGIN: 'https://races.example.com/' })).toBe(
      'https://races.example.com'
    );
  });

  it('★ present and malformed → THROWS, and the message says what to do', () => {
    expect(() => assertPublicOriginUsable({ RA_PUBLIC_ORIGIN: 'races.example.com' })).toThrow(
      /RA_PUBLIC_ORIGIN is set but unusable/
    );
    try {
      assertPublicOriginUsable({ RA_PUBLIC_ORIGIN: 'not a url' });
    } catch (err) {
      expect(err.message).toMatch(/npm run configure/);
      expect(err.message).toMatch(/unset it entirely/);
    }
  });

  it('a malformed value resolves to null rather than throwing — the start-up gate is the thrower', () => {
    expect(resolvePublicOrigin({ RA_PUBLIC_ORIGIN: 'nonsense' })).toBeNull();
  });
});

describe('the injected script', () => {
  it('carries the address under the name the client reads', () => {
    const s = runtimeConfigScript('https://races.example.com');
    expect(s).toContain(RUNTIME_CONFIG_GLOBAL);
    expect(s).toContain('"apiBaseUrl":"https://races.example.com"');
  });

  it('★ cannot close its own script element', () => {
    // The origin has already been through `new URL()`, so this is belt AND braces — but a value
    // that could end the tag would put the rest of the payload into the page as markup.
    const s = runtimeConfigScript('https://x.example.com');
    expect(s.match(/<\/script>/g)).toHaveLength(1);
    expect(runtimeConfigScript('https://a</script><b>.example.com')).not.toMatch(/<\/script>.*<b>/);
  });

  it('goes into <head>, before the module bundle at the end of <body>', () => {
    const html =
      '<!DOCTYPE html><html><head><title>x</title></head><body><script type="module" src="/a.js"></script></body></html>';
    const out = injectRuntimeConfig(html, 'https://races.example.com');
    expect(out.indexOf(RUNTIME_CONFIG_GLOBAL)).toBeLessThan(out.indexOf('/a.js'));
    expect(out).toContain('<head>');
  });

  it('handles <head> with attributes', () => {
    const out = injectRuntimeConfig(
      '<html><head lang="en"><x></head></html>',
      'https://a.example.com'
    );
    expect(out).toContain(RUNTIME_CONFIG_GLOBAL);
  });

  it('★ with no <head>, prepends rather than dropping — a lost address is the silent failure', () => {
    const out = injectRuntimeConfig('<div>shell</div>', 'https://a.example.com');
    expect(out.startsWith('<script>')).toBe(true);
    expect(out).toContain('<div>shell</div>');
  });

  it('★ NOTHING CONFIGURED → the html is returned byte-identical', () => {
    const html = '<html><head></head><body></body></html>';
    expect(injectRuntimeConfig(html, null)).toBe(html);
    expect(injectRuntimeConfig(html, '')).toBe(html);
  });
});
