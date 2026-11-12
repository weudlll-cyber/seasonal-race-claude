// ============================================================
// File:        accountFeed.test.js
// Path:        server/src/website/accountFeed.test.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3b
// Created:     2026-11-11
// Description: The account-changes feed against a FAKE feed and REAL stores (one temporary
//              registrations.sqlite holding both the registrations and the identities, as in an
//              install): the settings and their refusals; the reader of the website's exact answer
//              (piece 5c: F1, and anything else an error); paging past 500;
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

// ★ PIECE 5c (2026-11-11): the website's OWN answer, exactly — website master eb1bbe9,
// server/src/accounts/accountChanges.js accountChangesSince and games/embeddedRoutes.js: a list
// `changes` of { id (a JSON number), kind }, at most 500, and `next`, a digit string.
const F1 = {
  changes: [
    { id: 42, kind: 'locked' },
    { id: 17, kind: 'deleted' },
  ],
  next: '118',
};
describe("readFeedPage — the website's own answer (F1)", () => {
  it('★ the website’s example: ids as String(id), the next cursor, caught up', () => {
    expect(readFeedPage(F1)).toEqual({
      events: [
        { type: 'locked', userId: '42' },
        { type: 'deleted', userId: '17' },
      ],
      cursor: '118',
      hasMore: false,
    });
  });
  it('★ a page of 500 means "ask again with next"; fewer means caught up', () => {
    const page = (n) => ({
      changes: Array.from({ length: n }, (_, i) => ({ id: i + 1, kind: 'rights' })),
      next: '900',
    });
    expect(readFeedPage(page(PAGE_MAX)).hasMore).toBe(true);
    expect(readFeedPage(page(PAGE_MAX - 1)).hasMore).toBe(false);
    expect(readFeedPage({ changes: [], next: '118' })).toEqual({
      events: [],
      cursor: '118',
      hasMore: false,
    });
  });
  it('★ any other shape is an ERROR, never silence', () => {
    const bad = [
      { events: [{ type: 'locked', userId: '42' }], nextCursor: '1' }, // the old guesses
      { changes: [{ id: '42', kind: 'locked' }], next: '1' }, // id as a string
      { changes: [{ id: 42, kind: 'renamed' }], next: '1' }, // an unknown kind
      { changes: [{ kind: 'locked' }], next: '1' }, // no id
      { changes: [], next: 118 }, // next not a string
      { changes: [], next: 'abc' }, // next not digits
      { changes: [] }, // no next
    ];
    for (const body of bad) expect(() => readFeedPage(body), JSON.stringify(body)).toThrow();
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
    const full = Array.from({ length: PAGE_MAX }, (_, i) => ({ id: i + 1, kind: 'rights' }));
    const feed = fakeFeed([
      { changes: full, next: '500' },
      { changes: [{ id: 7, kind: 'locked' }], next: '501' },
    ]);
    const p = poller(feed.fetchImpl);
    const first = await p.pollOnce();
    expect(feed.asked[0].url).toBe(`http://site:3800${FEED_PATH}?since=0`);
    expect(feed.asked[0].token).toBe(TOKEN);
    expect(identities.getFeedCursor()).toBe('500');
    const wait = p.nextDelay(first);
    expect(wait).toBeGreaterThanOrEqual(0);
    expect(wait).toBeLessThanOrEqual(1000); // under 60 requests a minute however far behind
    clock += wait;
    const second = await p.pollOnce();
    expect(feed.asked[1].url).toBe(`http://site:3800${FEED_PATH}?since=500`);
    expect(identities.getFeedCursor()).toBe('501');
    expect(identities.get('7').locked).toBe(true);
    expect(p.nextDelay(second)).toBe(60_000);
  });

  it('★ a repeated batch changes nothing the second time', async () => {
    registrationWith('2');
    const batch = {
      changes: [
        { id: 2, kind: 'deleted' },
        { id: 3, kind: 'locked' },
      ],
      next: '11',
    };
    const feed = fakeFeed([batch, { ...batch }]);
    const p = poller(feed.fetchImpl);
    await p.pollOnce();
    const after1 = { d2: identities.get('2') };
    clock += 5000;
    await p.pollOnce();
    expect(identities.get('2').deleted).toBe(true);
    expect(identities.get('3').locked).toBe(true);
    expect(identities.deletedIds()).toEqual(['2']);
    expect(identities.get('2').displayName).toBe(after1.d2.displayName);
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
      fetchImpl: fakeFeed([null, 500, null, 503, null, { changes: [], next: '40' }]).fetchImpl,
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
    expect(identities.getFeedCursor()).toBe('40');
  });
});

describe('★ the poller against the F1 answer (piece 5c)', () => {
  it('first contact asks since=0; the example applies; ids match the sign-in route’s String(id)', async () => {
    // The sign-in route records the member by the header X-Acting-User-Id: "42" (a string).
    identities.recordSignIn({ websiteUserId: '42', displayName: 'Mia', role: 'player' });
    const feed = fakeFeed([F1]);
    await poller(feed.fetchImpl).pollOnce();
    expect(feed.asked[0].url).toBe(`http://site:3800${FEED_PATH}?since=0`);
    expect(identities.getFeedCursor()).toBe('118');
    expect(identities.get('42').locked).toBe(true);
    expect(identities.deletedIds()).toEqual(['17']);
  });
  it('★ a malformed answer is an error: nothing applied, the cursor unchanged', async () => {
    identities.setFeedCursor('7');
    const feed = fakeFeed([{ changes: [{ id: '42', kind: 'locked' }], next: '9' }]);
    const p = poller(feed.fetchImpl);
    await expect(p.pollOnce()).rejects.toThrow();
    expect(identities.getFeedCursor()).toBe('7');
    expect(identities.get('42')).toBeNull();
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
