// ============================================================
// File:        websiteSignIn.test.js
// Path:        server/src/website/websiteSignIn.test.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3a
// Created:     2026-11-11
// Description: The units of website sign-in: the settings and their refusals (websiteConfig.js),
//              reading the identity headers, the role mapping for all four kinds, and the
//              returnTo rule. What the real app does with them is websiteMode.integration.test.js.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  resolveSiteMode,
  loadWebsiteConfig,
  parseTrustedProxies,
  normalizePeerAddress,
  DEFAULT_WEBSITE_TEAM,
} from './websiteConfig.js';
import { readIdentityHeaders, mapWebsiteRole, safeReturnTo } from './websiteSignIn.js';

const SECRET = 'unit-test-secret-not-a-real-one';
const reader = (files) => (path) => {
  if (!(path in files)) throw Object.assign(new Error('nope'), { code: 'ENOENT' });
  return files[path];
};

describe('RA_MODE', () => {
  it('unset or empty is standalone; standalone and website are accepted; anything else refuses', () => {
    expect(resolveSiteMode({})).toBe('standalone');
    expect(resolveSiteMode({ RA_MODE: '' })).toBe('standalone');
    expect(resolveSiteMode({ RA_MODE: 'website' })).toBe('website');
    expect(resolveSiteMode({ RA_MODE: 'Standalone' })).toBe('standalone');
    expect(() => resolveSiteMode({ RA_MODE: 'websight' })).toThrow(/RA_MODE/);
  });
});

describe('loadWebsiteConfig', () => {
  it('★ standalone reads no file at all and answers null', () => {
    const readFile = () => {
      throw new Error('must not be called');
    };
    expect(loadWebsiteConfig({}, { readFile })).toBeNull();
  });

  it('website mode with no secret file, an unreadable one or an empty one refuses to start', () => {
    const base = { RA_MODE: 'website', RA_WEBSITE_TRUSTED_PROXIES: '127.0.0.1' };
    expect(() => loadWebsiteConfig(base, { readFile: reader({}) })).toThrow(
      /RA_WEBSITE_PROXY_SECRET_FILE/
    );
    expect(() =>
      loadWebsiteConfig({ ...base, RA_WEBSITE_PROXY_SECRET_FILE: '/s' }, { readFile: reader({}) })
    ).toThrow(/cannot be read/);
    expect(() =>
      loadWebsiteConfig(
        { ...base, RA_WEBSITE_PROXY_SECRET_FILE: '/s' },
        { readFile: reader({ '/s': '  \n' }) }
      )
    ).toThrow(/is empty/);
  });

  it('website mode with an empty trusted-network list refuses to start', () => {
    const env = { RA_MODE: 'website', RA_WEBSITE_PROXY_SECRET_FILE: '/s' };
    expect(() => loadWebsiteConfig(env, { readFile: reader({ '/s': SECRET }) })).toThrow(
      /RA_WEBSITE_TRUSTED_PROXIES/
    );
  });

  it('★ no refusal message ever carries the secret', () => {
    const env = {
      RA_MODE: 'website',
      RA_WEBSITE_PROXY_SECRET_FILE: '/s',
      RA_WEBSITE_TRUSTED_PROXIES: 'x',
    };
    try {
      loadWebsiteConfig(env, { readFile: reader({ '/s': SECRET }) });
      throw new Error('expected a refusal');
    } catch (err) {
      expect(err.message).not.toContain(SECRET);
    }
  });

  it('a complete config: team default, peer check by network, secret check by value', () => {
    const cfg = loadWebsiteConfig(
      {
        RA_MODE: 'website',
        RA_WEBSITE_PROXY_SECRET_FILE: '/s',
        RA_WEBSITE_TRUSTED_PROXIES: '172.18.0.0/16, ::1',
      },
      { readFile: reader({ '/s': `${SECRET}\n` }) }
    );
    expect(cfg.team).toBe(DEFAULT_WEBSITE_TEAM);
    expect(cfg.isTrustedPeer('172.18.0.1')).toBe(true);
    expect(cfg.isTrustedPeer('::ffff:172.18.3.4')).toBe(true);
    expect(cfg.isTrustedPeer('::1')).toBe(true);
    expect(cfg.isTrustedPeer('172.19.0.1')).toBe(false);
    expect(cfg.isTrustedPeer(undefined)).toBe(false);
    expect(cfg.secretMatches(SECRET)).toBe(true);
    expect(cfg.secretMatches(`${SECRET}x`)).toBe(false);
    expect(cfg.secretMatches('')).toBe(false);
    expect(cfg.secretMatches(undefined)).toBe(false);
    expect(JSON.stringify(cfg)).not.toContain(SECRET);
  });

  it('RA_WEBSITE_TEAM names the team', () => {
    const cfg = loadWebsiteConfig(
      {
        RA_MODE: 'website',
        RA_WEBSITE_PROXY_SECRET_FILE: '/s',
        RA_WEBSITE_TRUSTED_PROXIES: '10.0.0.1',
        RA_WEBSITE_TEAM: 'Crew',
      },
      { readFile: reader({ '/s': SECRET }) }
    );
    expect(cfg.team).toBe('Crew');
  });
});

describe('parseTrustedProxies / normalizePeerAddress', () => {
  it('refuses an entry that is not an address or a network, naming it', () => {
    for (const bad of ['10.0.0.0/33', 'host.example', '10.0.0.0/8/1', '::1/129']) {
      expect(() => parseTrustedProxies(bad)).toThrow(bad);
    }
  });
  it('maps an IPv4-mapped IPv6 peer to IPv4', () => {
    expect(normalizePeerAddress('::ffff:10.1.2.3')).toBe('10.1.2.3');
    expect(normalizePeerAddress('::1')).toBe('::1');
  });
});

describe('the identity headers and the role mapping', () => {
  const member = (extra) => ({
    'x-acting-user-id': 'u-42',
    'x-acting-user': 'Ada',
    'x-acting-user-roles': 'member',
    'x-acting-user-can-host': 'false',
    ...extra,
  });

  it('★ the four kinds: admin → admin, host → operator, member → player, guest → no identity', () => {
    expect(
      mapWebsiteRole(readIdentityHeaders(member({ 'x-acting-user-roles': 'member,admin' })))
    ).toBe('admin');
    expect(mapWebsiteRole(readIdentityHeaders(member({ 'x-acting-user-can-host': 'true' })))).toBe(
      'operator'
    );
    expect(mapWebsiteRole(readIdentityHeaders(member()))).toBe('player');
    expect(readIdentityHeaders({ 'x-acting-guest': 'true' })).toEqual({ guest: true });
  });

  it('an organiser who may not host is a player; nothing maps above admin', () => {
    expect(
      mapWebsiteRole(readIdentityHeaders(member({ 'x-acting-user-roles': 'organiser' })))
    ).toBe('player');
    const who = readIdentityHeaders(member({ 'x-acting-user-roles': 'superadmin,owner,admin' }));
    expect(who.roles).toEqual(['admin']);
    expect(mapWebsiteRole(who)).toBe('admin');
  });

  it('a missing or malformed id, or no display name, is not an identity', () => {
    expect(readIdentityHeaders(member({ 'x-acting-user-id': '' }))).toBeNull();
    expect(readIdentityHeaders(member({ 'x-acting-user-id': 'a b' }))).toBeNull();
    expect(readIdentityHeaders(member({ 'x-acting-user': '  ' }))).toBeNull();
  });

  it('a UTF-8 display name, which Node reads as latin1, arrives as written', () => {
    const latin1 = Buffer.from('Zoë', 'utf8').toString('latin1');
    expect(readIdentityHeaders(member({ 'x-acting-user': latin1 })).displayName).toBe('Zoë');
  });
});

describe('safeReturnTo', () => {
  const B = '/games/race';
  it('keeps a path under the base path, with its query', () => {
    expect(safeReturnTo('/games/race/join/abc?x=1', B)).toBe('/games/race/join/abc?x=1');
    expect(safeReturnTo('/games/race', B)).toBe('/games/race');
  });
  it('★ anything that leaves the base path or the origin goes home instead', () => {
    for (const bad of [
      undefined,
      'https://evil.example/games/race/',
      '//evil.example/games/race/',
      '/\\evil.example',
      '/games/racex/setup',
      '/other',
      'games/race/setup',
      '/games/race/../admin',
    ]) {
      expect(safeReturnTo(bad, B), String(bad)).toBe('/games/race/');
    }
  });
});
