// ============================================================
// File:        sourceUrl.test.js
// Path:        server/src/sourceUrl.test.js
// Project:     RaceArena — LEGAL-PAGES-1
// Description: RA_SOURCE_URL: unset is fine (null, the client uses its default); a usable link is
//              passed on; present but wrong refuses to start, naming the variable.
// ============================================================

import { describe, it, expect } from 'vitest';
import { judgeSourceUrl, resolveSourceUrl, assertSourceUrlUsable } from './sourceUrl.js';

describe('RA_SOURCE_URL', () => {
  it('unset or blank is null, and starts', () => {
    expect(resolveSourceUrl({})).toBeNull();
    expect(assertSourceUrlUsable({})).toBeNull();
    expect(assertSourceUrlUsable({ RA_SOURCE_URL: '  ' })).toBeNull();
  });

  it('an absolute http(s) link is passed on', () => {
    expect(assertSourceUrlUsable({ RA_SOURCE_URL: ' https://example.org/fork/tree/v1 ' })).toBe(
      'https://example.org/fork/tree/v1'
    );
    expect(resolveSourceUrl({ RA_SOURCE_URL: 'http://git.lan/race' })).toBe('http://git.lan/race');
  });

  it.each([
    ['example.org/fork', 'not a URL'],
    ['javascript:alert(1)', 'scheme'],
    ['ftp://example.org/x', 'scheme'],
    ['https://user:pw@example.org/x', 'credentials'],
  ])('%s refuses to start (%s)', (value, why) => {
    expect(judgeSourceUrl(value).ok).toBe(false);
    expect(judgeSourceUrl(value).reason).toMatch(new RegExp(why));
    expect(() => assertSourceUrlUsable({ RA_SOURCE_URL: value })).toThrow(/RA_SOURCE_URL/);
    expect(resolveSourceUrl({ RA_SOURCE_URL: value })).toBeNull();
  });
});
