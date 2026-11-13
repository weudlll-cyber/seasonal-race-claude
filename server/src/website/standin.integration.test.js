// ============================================================
// File:        standin.integration.test.js
// Path:        server/src/website/standin.integration.test.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3a
// Created:     2026-11-11
// Description: The local stand-in for the website proxy (scripts/website-standin.mjs) in front of
//              a real website-mode app, both on ephemeral 127.0.0.1 ports: picking a fake member on
//              the stand-in's page signs the browser in as that member, through the full path; and
//              identity headers a browser sends itself never get through. The secret is generated
//              per run and never printed.
//              Needs no built client (fix/ci-2026-11-12): a sign-in is followed up to its redirect
//              into the app, never into it — CI's server job builds no client, so the page there
//              answered 404 and the test failed on master f247dafb; the role is asked of the race's
//              own session endpoint under the base path.
//              WEBSITE-EXTRAS-1: its open-sign-ups page lists a marked registration and not an
//              unmarked one (7a), and its /embed/chat placeholder names the room (7b).
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { startStandin } from '../../../scripts/website-standin.mjs';

const BASE = '/games/race';
const SECRET = randomBytes(24).toString('base64url');
let dir;
let race;
let standin;
let origin;
let syncToken;
let feedModules;

const listen = (app) =>
  new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

beforeAll(async () => {
  dir = mkdtempSync(join(os.tmpdir(), 'ra-standin-'));
  const secretFile = join(dir, 'proxy-secret');
  writeFileSync(secretFile, SECRET, { mode: 0o600 });
  vi.resetModules();
  vi.stubEnv('RA_MODE', 'website');
  vi.stubEnv('RA_BASE_PATH', BASE);
  vi.stubEnv('RA_WEBSITE_PROXY_SECRET_FILE', secretFile);
  vi.stubEnv('RA_WEBSITE_TRUSTED_PROXIES', '127.0.0.1/32, ::1');
  // Piece 3b: the stand-in is also the website's feed; the test drives the poller against it.
  const tokenFile = join(dir, 'sync-token');
  syncToken = randomBytes(24).toString('base64url');
  writeFileSync(tokenFile, syncToken, { mode: 0o600 });
  vi.stubEnv('RA_WEBSITE_FEED_URL', 'http://127.0.0.1:9');
  vi.stubEnv('RA_WEBSITE_SYNC_TOKEN_FILE', tokenFile);
  const { createApp } = await import('../app.js');
  // The same module instances the app uses, so the poller writes what the app reads.
  feedModules = {
    ...(await import('./accountFeed.js')),
    ...(await import('./identityStore.js')),
    ...(await import('../routes/registrations.js')),
  };
  race = await listen(createApp());
  standin = await startStandin({
    port: 0,
    target: `http://127.0.0.1:${race.address().port}`,
    base: BASE,
    secret: SECRET,
    token: syncToken,
  });
  origin = `http://127.0.0.1:${standin.address().port}`;
});

afterAll(async () => {
  await new Promise((r) => standin.close(r));
  await new Promise((r) => race.close(r));
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

/**
 * A tiny browser: follows redirects by hand and keeps the cookies it is given, per name.
 * `signIn(who)` picks a fake member and follows the sign-in up to — not into — its redirect into the
 * app: the page there is the built client, which a test run (CI) does not have, so it is never
 * fetched; the session is then asked of the race's own endpoint. Returns the redirect's target, or
 * the response the sign-in stopped with (a refusal).
 */
function browser() {
  const jar = new Map();
  async function go(path, init = {}, { stopAt } = {}) {
    let url = new URL(path, origin);
    for (let hops = 0; hops < 5; hops++) {
      if (hops > 0 && stopAt?.(url)) return { status: 303, stoppedAt: url };
      const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
      const res = await fetch(url, {
        ...init,
        redirect: 'manual',
        headers: { ...(init.headers ?? {}), ...(cookie ? { cookie } : {}) },
      });
      for (const c of res.headers.getSetCookie()) {
        const [pair] = c.split(';');
        const at = pair.indexOf('=');
        jar.set(pair.slice(0, at), pair.slice(at + 1));
      }
      if (res.status < 300 || res.status >= 400) return res;
      url = new URL(res.headers.get('location'), url);
    }
    throw new Error('too many redirects');
  }
  const intoTheApp = (url) =>
    url.pathname.startsWith(`${BASE}/`) && !url.pathname.includes('/auth/');
  const signIn = (who) => go(`/_standin/as/${who}`, {}, { stopAt: intoTheApp });
  return { go, signIn };
}

describe('the website stand-in in front of a website-mode race', () => {
  it('its page offers the four fake members', async () => {
    const html = await (await fetch(`${origin}/`)).text();
    for (const k of ['member', 'host', 'admin', 'guest'])
      expect(html).toContain(`/_standin/as/${k}`);
  });

  it('picking "host" signs the browser in as a race operator, under the base path', async () => {
    const b = browser();
    const landed = await b.signIn('host');
    expect(landed.stoppedAt?.pathname).toBe(`${BASE}/`);
    const me = await b.go(`${BASE}/api/auth/me`);
    expect(me.status).toBe(200);
    const body = await me.json();
    expect(body.role).toBe('operator');
    expect(body.displayName).toBe('Hugo Host');
  });

  it('picking "member" gives a player identity only — no director API', async () => {
    const b = browser();
    await b.signIn('member');
    expect((await b.go(`${BASE}/api/auth/me`)).status).toBe(401);
  });

  it('★ identity headers a browser sends itself are stripped, even on /auth/website', async () => {
    const b = browser();
    // Guest picked (the default): a browser forging an admin's headers and the secret gets nowhere.
    await b.go(`${BASE}/auth/website`, {
      headers: {
        'x-acting-user-id': 'forged',
        'x-acting-user': 'Forged',
        'x-acting-user-roles': 'admin',
        'x-ra-proxy-secret': 'whatever',
      },
    });
    expect((await b.go(`${BASE}/api/auth/me`)).status).toBe(401);
  });

  it('★ piece 3b: an event fired on the stand-in page reaches the race through the feed', async () => {
    const b = browser();
    await b.signIn('host');
    expect((await b.go(`${BASE}/api/auth/me`)).status).toBe(200);
    // The website locks Hugo Host.
    expect(
      (await fetch(`${origin}/_standin/event/locked/host`, { redirect: 'manual' })).status
    ).toBe(303);
    const poller = feedModules.createFeedPoller({
      config: { url: origin, token: syncToken, intervalMs: 60_000 },
      identities: feedModules.getDefaultIdentityStore(),
      registrations: feedModules.getDefaultRegistrationStore(),
      log: () => {},
    });
    const page = await poller.pollOnce();
    expect(page.events).toEqual([{ type: 'locked', userId: '9002' }]);
    // His director session ends on the next request, and he cannot sign in again.
    expect((await b.go(`${BASE}/api/auth/me`)).status).toBe(401);
    const again = await b.signIn('host');
    expect(again.status).toBe(403);
    // A wrong token gets nothing from the feed.
    const refused = await fetch(`${origin}/api/games/race/account-changes`, {
      headers: { 'X-Games-Sync-Token': 'wrong' },
    });
    expect(refused.status).toBe(403);
  });

  it('★ 7a: its open-sign-ups page lists a marked open registration, not an unmarked one', async () => {
    const store = feedModules.getDefaultRegistrationStore();
    const reg = (show, eventName) =>
      store.create({
        team: 'Seasonal Entertainment',
        createdBy: 'website:host',
        trackId: 'dirt-oval',
        trackName: 'Dirt Oval',
        capacity: 6,
        eventName,
        closesAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        websiteAccess: 'members',
        showOnWebsite: show,
      });
    const marked = reg(true, 'Marked Cup');
    const unmarked = reg(false, 'Hidden Cup');
    const html = await (await fetch(`${origin}/_standin/open-rounds`)).text();
    expect(html).toContain(`data-round="${marked.code}"`);
    expect(html).toContain('Marked Cup — Dirt Oval');
    expect(html).toContain('0 of 6 signed up');
    expect(html).not.toContain(unmarked.code);
    expect(html).not.toContain('Hidden Cup');
  });

  it('7b: its /embed/chat placeholder names the room, and escapes it', async () => {
    const ok = await fetch(`${origin}/embed/chat?room=race&theme=auto`);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain('<strong data-room>race</strong>');
    const odd = await (await fetch(`${origin}/embed/chat?room=%3Cb%3E`)).text();
    expect(odd).toContain('&lt;b&gt;');
    expect(odd).not.toContain('<b>');
  });

  it('outside the base path the stand-in answers 404', async () => {
    expect((await fetch(`${origin}/elsewhere`)).status).toBe(404);
  });
});

// Piece 5b: --site, the website ITSELF behind a real proxy (the installer test). It answers the
// proxy's authorize call by its own cookie se.sid, never with the secret, and forwards nothing.
describe('the stand-in as the website itself (--site)', () => {
  let site;
  let siteOrigin;
  beforeAll(async () => {
    site = await startStandin({ port: 0, base: BASE, secret: null, site: true });
    siteOrigin = `http://127.0.0.1:${site.address().port}`;
  });
  afterAll(() => site?.close());

  // As the website answers (piece 5c): 204 always — a member's headers, anyone else a guest —
  // and 403 when the proxy did not say which method the visitor used.
  const authorize = (headers) =>
    fetch(`${siteOrigin}/api/games/race/authorize`, {
      headers: { 'x-original-method': 'GET', ...headers },
    });
  it('authorize: 204 with the identity for se.sid, never the secret; anyone else a guest', async () => {
    const member = await authorize({ cookie: 'se.sid=member' });
    expect(member.status).toBe(204);
    expect(member.headers.get('x-acting-user')).toBe('Mia Member');
    expect(member.headers.get('x-acting-user-id')).toBe('9001');
    expect(member.headers.get('x-ra-proxy-secret')).toBeNull();
    const nobody = await authorize({});
    expect(nobody.status).toBe(204);
    expect(nobody.headers.get('x-acting-guest')).toBe('true');
    expect(nobody.headers.get('x-acting-user-id')).toBeNull();
  });
  it('authorize without the proxy’s X-Original-Method is refused (403, fail closed)', async () => {
    const r = await fetch(`${siteOrigin}/api/games/race/authorize`, {
      headers: { cookie: 'se.sid=member' },
    });
    expect(r.status).toBe(403);
    expect(r.headers.get('x-acting-user')).toBeNull();
  });

  it('picking a member sets the website cookie se.sid; the race path is not forwarded', async () => {
    const pick = await fetch(`${siteOrigin}/_standin/as/host`, { redirect: 'manual' });
    expect(pick.headers.get('set-cookie')).toMatch(/^se\.sid=host;/);
    expect(pick.headers.get('location')).toBe(`${BASE}/auth/website`);
    expect((await fetch(`${siteOrigin}${BASE}/`)).status).toBe(404);
  });
});

// Piece 5c: the stand-in's feed answers EXACTLY what the website sends (F1), so its tests can no
// longer agree with a format the website does not send.
describe("the stand-in's feed is the website's answer (F1)", () => {
  it('★ { changes: [{ id: <number>, kind }], next: "<digits>" }; a non-digit since is 400', async () => {
    const token = randomBytes(16).toString('hex');
    const s = await startStandin({ port: 0, base: BASE, secret: null, token, site: true });
    const at = `http://127.0.0.1:${s.address().port}`;
    try {
      await fetch(`${at}/_standin/event/locked/member`, { redirect: 'manual' });
      const feed = (since) =>
        fetch(`${at}/api/games/race/account-changes?since=${since}`, {
          headers: { 'X-Games-Sync-Token': token },
        });
      expect(await (await feed('0')).json()).toEqual({
        changes: [{ id: 9001, kind: 'locked' }],
        next: '1',
      });
      expect(await (await feed('1')).json()).toEqual({ changes: [], next: '1' });
      expect((await feed('abc')).status).toBe(400);
    } finally {
      s.close();
    }
  });
});
