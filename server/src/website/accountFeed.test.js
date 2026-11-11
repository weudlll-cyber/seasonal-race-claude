// ============================================================
// File:        accountFeed.test.js
// Path:        server/src/website/accountFeed.test.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3b
// Created:     2026-11-11
// Description: The account-changes feed against a FAKE feed and REAL stores (one temporary
//              registrations.sqlite holding both the registrations and the identities, as in an
//              install): the settings and their refusals; the tolerant reader; paging past 500;
//              a repeated batch changing nothing; an error, then backoff, then recovery; and each
//              event's effect — locked, unlocked, rights, deleted.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import Database from 'better-sqlite3';
import { createRegistrationStore } from '../registrations/registrationStore.js';
import { createIdentityStore } from './identityStore.js';
import { liveWebsiteIdentity } from './websiteSession.js';
import {
  loadFeedConfig,
  readFeedPage,
  applyFeedPage,
  createFeedPoller,
  PAGE_MAX,
  BACKOFF_MAX_MS,
  FEED_PATH,
} from './accountFeed.js';

const TOKEN = 'unit-test-sync-token';
const reader = (files) => (p) => {
  if (!(p in files)) throw Object.assign(new Error('nope'), { code: 'ENOENT' });
  return files[p];
};

describe('loadFeedConfig', () => {
  const env = {
    RA_WEBSITE_FEED_URL: 'http://site:3800/',
    RA_WEBSITE_SYNC_TOKEN_FILE: '/t',
  };
  it('a complete config; the interval defaults to 60 s; the token is never in a refusal', () => {
    const cfg = loadFeedConfig(env, { readFile: reader({ '/t': `${TOKEN}\n` }) });
    expect(cfg).toEqual({ url: 'http://site:3800', token: TOKEN, intervalMs: 60_000 });
  });
  it('refuses a missing or non-http URL, a missing/unreadable/empty token file', () => {
    const r = reader({ '/t': TOKEN, '/e': ' ' });
    expect(() => loadFeedConfig({ ...env, RA_WEBSITE_FEED_URL: '' }, { readFile: r })).toThrow(
      /RA_WEBSITE_FEED_URL/
    );
    expect(() =>
      loadFeedConfig({ ...env, RA_WEBSITE_FEED_URL: 'ftp://x' }, { readFile: r })
    ).toThrow(/RA_WEBSITE_FEED_URL/);
    expect(() =>
      loadFeedConfig({ ...env, RA_WEBSITE_SYNC_TOKEN_FILE: '' }, { readFile: r })
    ).toThrow(/SYNC_TOKEN_FILE/);
    expect(() =>
      loadFeedConfig({ ...env, RA_WEBSITE_SYNC_TOKEN_FILE: '/x' }, { readFile: r })
    ).toThrow(/cannot be read/);
    expect(() =>
      loadFeedConfig({ ...env, RA_WEBSITE_SYNC_TOKEN_FILE: '/e' }, { readFile: r })
    ).toThrow(/is empty/);
  });
  it('the interval must be a whole number of ms from 15000 to 120000', () => {
    const r = reader({ '/t': TOKEN });
    expect(
      loadFeedConfig({ ...env, RA_WEBSITE_FEED_INTERVAL_MS: '15000' }, { readFile: r }).intervalMs
    ).toBe(15000);
    for (const bad of ['14999', '120001', '60s', '1.5']) {
      expect(() =>
        loadFeedConfig({ ...env, RA_WEBSITE_FEED_INTERVAL_MS: bad }, { readFile: r })
      ).toThrow(/INTERVAL/);
    }
  });
});

describe('readFeedPage', () => {
  it('reads the obvious spellings, skips what it does not know, and wants a cursor', () => {
    const page = readFeedPage({
      events: [
        { type: 'locked', userId: 'a' },
        { event: 'DELETED', user_id: 'b' },
        { type: 'renamed', userId: 'c' },
        { type: 'rights' },
      ],
      nextCursor: 42,
    });
    expect(page).toEqual({
      events: [
        { type: 'locked', userId: 'a' },
        { type: 'deleted', userId: 'b' },
      ],
      cursor: '42',
      hasMore: false,
    });
    expect(() => readFeedPage({ events: [] })).toThrow(/cursor/);
    expect(() => readFeedPage({ nope: true, cursor: 'x' })).toThrow(/events/);
  });
  it('a full page means "ask again now" unless the feed says otherwise', () => {
    const full = Array.from({ length: PAGE_MAX }, (_, i) => ({ type: 'rights', userId: `u${i}` }));
    expect(readFeedPage({ events: full, cursor: 'c' }).hasMore).toBe(true);
    expect(readFeedPage({ events: full, cursor: 'c', hasMore: false }).hasMore).toBe(false);
  });
});

// ── With real stores ──────────────────────────────────────────────────────────────────────────

let dir, file, clock, identities, registrations;
const MIN = 60_000;

beforeEach(() => {
  dir = mkdtempSync(join(os.tmpdir(), 'ra-feed-'));
  file = join(dir, 'registrations.sqlite');
  clock = Date.UTC(2026, 10, 11, 12, 0, 0);
  registrations = createRegistrationStore(file, { now: () => clock });
  identities = createIdentityStore(file, { now: () => clock });
});
afterEach(() => {
  registrations.closeDatabase();
  identities.close();
  rmSync(dir, { recursive: true, force: true });
});

/** A registration with one website entry for `userId` (written as piece 4's join would write it). */
function registrationWith(userId, { open = true } = {}) {
  const reg = registrations.create({
    team: 'Seasonal Entertainment',
    createdBy: 'website:host',
    trackId: 'dirt-oval',
    trackName: 'Dirt Oval',
    capacity: 10,
    eventName: null,
    closesAt: new Date(clock + 10 * MIN).toISOString(),
  });
  const db = new Database(file);
  db.prepare(
    `INSERT INTO registration_entries (id, registration_id, name, name_key, source, external_id, created_at_ms)
     VALUES (?, ?, ?, ?, 'website', ?, ?)`
  ).run(`e-${userId}-${reg.id}`, reg.id, `Name ${userId}`, `name ${userId}`, userId, clock);
  db.close();
  if (!open) registrations.close(reg.id, 'Seasonal Entertainment');
  return reg.id;
}
const entryCount = (regId) => registrations.get(regId, 'Seasonal Entertainment').entries.length;

/** A fake feed: a list of answers, served in order; `null` is a network failure. */
function fakeFeed(answers) {
  const asked = [];
  const fetchImpl = async (url, init) => {
    asked.push({ url, token: init.headers['X-Games-Sync-Token'] });
    const next = answers.shift();
    if (next === null || next === undefined) throw new Error('connect ECONNREFUSED');
    if (typeof next === 'number') return { ok: false, status: next, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => next };
  };
  return { fetchImpl, asked };
}

function poller(fetchImpl) {
  return createFeedPoller({
    config: { url: 'http://site:3800', token: TOKEN, intervalMs: 60_000 },
    identities,
    registrations,
    fetchImpl,
    now: () => clock,
    log: () => {},
  });
}

describe('each event’s effect', () => {
  it('locked: sessions end and sign-in is refused; unlocked: allowed again', () => {
    identities.recordSignIn({ websiteUserId: 'm1', displayName: 'Mia', role: 'player' });
    const session = {
      websiteMember: { websiteUserId: 'm1' },
      websiteEpoch: identities.get('m1').epoch,
    };
    expect(liveWebsiteIdentity(session, identities)).toBeTruthy();
    applyFeedPage(
      { identities, registrations },
      { events: [{ type: 'locked', userId: 'm1' }], cursor: '1' }
    );
    expect(identities.get('m1').locked).toBe(true);
    expect(liveWebsiteIdentity(session, identities)).toBeNull();
    applyFeedPage(
      { identities, registrations },
      { events: [{ type: 'unlocked', userId: 'm1' }], cursor: '2' }
    );
    expect(identities.get('m1').locked).toBe(false);
  });

  it('a lock for a member the race has never met is remembered for their first sign-in', () => {
    applyFeedPage(
      { identities, registrations },
      { events: [{ type: 'locked', userId: 'new' }], cursor: '1' }
    );
    expect(identities.get('new').locked).toBe(true);
  });

  it('rights: sessions end (the role is recomputed at the next sign-in)', () => {
    identities.recordSignIn({ websiteUserId: 'h1', displayName: 'Hugo', role: 'operator' });
    const session = {
      websiteMember: { websiteUserId: 'h1' },
      websiteEpoch: identities.get('h1').epoch,
    };
    applyFeedPage(
      { identities, registrations },
      { events: [{ type: 'rights', userId: 'h1' }], cursor: '1' }
    );
    expect(liveWebsiteIdentity(session, identities)).toBeNull();
    expect(identities.get('h1').locked).toBe(false);
  });

  it('★ deleted: gone at once from OPEN registrations, kept in closed ones, identity marked deleted', () => {
    const open = registrationWith('d1');
    const closed = registrationWith('d1', { open: false });
    const other = registrationWith('keep');
    applyFeedPage(
      { identities, registrations },
      { events: [{ type: 'deleted', userId: 'd1' }], cursor: '1' }
    );
    expect(entryCount(open)).toBe(0);
    expect(entryCount(closed)).toBe(1);
    expect(entryCount(other)).toBe(1);
    expect(identities.get('d1').deleted).toBe(true);
    expect(identities.deletedIds()).toEqual(['d1']);
  });
});

describe('the poller against a fake feed', () => {
  it('★ pages past 500: a full page is followed at once (one second apart), the cursor advances', async () => {
    const full = Array.from({ length: PAGE_MAX }, (_, i) => ({ type: 'rights', userId: `u${i}` }));
    const feed = fakeFeed([
      { events: full, nextCursor: 'p1', hasMore: true },
      { events: [{ type: 'locked', userId: 'u7' }], nextCursor: 'p2', hasMore: false },
    ]);
    const p = poller(feed.fetchImpl);
    const first = await p.pollOnce();
    expect(feed.asked[0].url).toBe(`http://site:3800${FEED_PATH}`);
    expect(feed.asked[0].token).toBe(TOKEN);
    expect(identities.getFeedCursor()).toBe('p1');
    const wait = p.nextDelay(first);
    expect(wait).toBeGreaterThanOrEqual(0);
    expect(wait).toBeLessThanOrEqual(1000); // under 60 requests a minute however far behind
    clock += wait;
    const second = await p.pollOnce();
    expect(feed.asked[1].url).toBe(`http://site:3800${FEED_PATH}?since=p1`);
    expect(identities.getFeedCursor()).toBe('p2');
    expect(identities.get('u7').locked).toBe(true);
    expect(p.nextDelay(second)).toBe(60_000);
  });

  it('★ a repeated batch changes nothing the second time', async () => {
    registrationWith('d2');
    const batch = {
      events: [
        { type: 'deleted', userId: 'd2' },
        { type: 'locked', userId: 'x' },
      ],
      cursor: 'c1',
    };
    const feed = fakeFeed([batch, { ...batch }]);
    const p = poller(feed.fetchImpl);
    await p.pollOnce();
    const after1 = { d2: identities.get('d2'), x: identities.get('x') };
    clock += 5000;
    await p.pollOnce();
    expect(identities.get('d2').deleted).toBe(true);
    expect(identities.get('x').locked).toBe(true);
    expect(identities.deletedIds()).toEqual(['d2']);
    expect(identities.get('d2').displayName).toBe(after1.d2.displayName);
  });

  it('★ an error backs off — doubling, capped at ten minutes — and a success resets it', async () => {
    // Five failures in a row (a refused connection, as a real outage looks), then an answer. The
    // timer is the test's own, so every wait the poller asks for is recorded rather than slept.
    const delays = [];
    const queue = [];
    const p = createFeedPoller({
      config: { url: 'http://site:3800', token: TOKEN, intervalMs: 60_000 },
      identities,
      registrations,
      fetchImpl: fakeFeed([null, 500, null, 503, null, { events: [], cursor: 'back' }]).fetchImpl,
      setTimer: (fn, ms) => {
        delays.push(ms);
        queue.push(fn);
        return { unref() {} };
      },
      clearTimer: () => {},
      now: () => clock,
      log: () => {},
    });
    p.start();
    for (let i = 0; i < 6; i++) await queue.shift()();
    p.stop();
    // start at once; then 2x, 4x, 8x the interval, then capped at ten minutes; then the interval again
    expect(delays).toEqual([0, 120_000, 240_000, 480_000, BACKOFF_MAX_MS, BACKOFF_MAX_MS, 60_000]);
    expect(p.failures).toBe(0);
    expect(identities.getFeedCursor()).toBe('back');
  });
});

describe('★ website mode without the feed refuses to start', () => {
  it('loadWebsiteConfig names the missing feed setting', async () => {
    const { loadWebsiteConfig } = await import('./websiteConfig.js');
    const env = {
      RA_MODE: 'website',
      RA_WEBSITE_PROXY_SECRET_FILE: '/s',
      RA_WEBSITE_TRUSTED_PROXIES: '127.0.0.1',
    };
    expect(() => loadWebsiteConfig(env, { readFile: reader({ '/s': 'secret' }) })).toThrow(
      /RA_WEBSITE_FEED_URL/
    );
  });
});
