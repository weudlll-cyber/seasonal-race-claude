// ============================================================
// File:        accountFeed.js
// Path:        server/src/website/accountFeed.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3b (OWNER-3)
// Created:     2026-11-11
// Description: The race follows the website's account changes. In website mode a poller asks
//              GET <site>/api/games/race/account-changes?since=<cursor> (header X-Games-Sync-Token)
//              and applies what it is told:
//                locked   → end the member's sessions (bump the epoch) and refuse sign-in;
//                unlocked → allow sign-in again;
//                rights   → end the member's sessions; the role is recomputed at the next sign-in;
//                deleted  → remove the member's website entries from OPEN registrations at once, and
//                           mark the identity deleted (past races are masked at display time).
//
// ── DURABLE AND SAFE TWICE ─────────────────────────────────────────────────────────────────────
// The cursor lives in SQLite (identityStore.js), and a page's identity changes and the cursor that
// follows them are written in ONE transaction (the open-registration removals just before it): a
// crash between "applied" and "remembered" leaves the cursor where it was, and the page comes again. Every
// event is therefore written to be safe to apply twice: locking a locked member, unlocking an
// unlocked one, marking a deleted one deleted again (the first time is kept) or bumping an epoch
// once more changes nothing a person could notice.
//
// ── THE WEBSITE'S LIMITS ───────────────────────────────────────────────────────────────────────
// At most 500 events per answer; at most 60 requests a minute. A full page means "there is more",
// so the next page is asked for at once — but never sooner than one second after the last request,
// which keeps the poller under 60 a minute however far behind it is. Otherwise it waits the
// interval (RA_WEBSITE_FEED_INTERVAL_MS, default 60 s, 15–120 s). On an error it backs off: the
// wait doubles per failure in a row, up to ten minutes, and the first success resets it.
//
// ── THE ANSWER'S SHAPE, EXACTLY (piece 5c, 2026-11-11) ─────────────────────────────────────────
// What the website sends (website master eb1bbe9: server/src/accounts/accountChanges.js
// accountChangesSince, server/src/games/embeddedRoutes.js), and nothing else is accepted:
//   {"changes":[{"id":42,"kind":"locked"},{"id":17,"kind":"deleted"}],"next":"118"}
// — `changes` at most 500 (no hasMore: a page of 500 means "ask again with next"), `kind` one of
// deleted | locked | unlocked | rights, `id` a JSON NUMBER, `next` a digit string that stays the
// same while nothing is new. The first request asks since=0. The member is keyed by String(id),
// the same string the sign-in route records from X-Acting-User-Id ("42"). Anything else is an
// ERROR — the poller backs off and the cursor stays where it was — never a silently skipped event.
// (Until piece 5c the reader guessed field names; it agreed with the stand-in and not the website.)
// ============================================================

import { readFileSync } from 'node:fs';

export const FEED_PATH = '/api/games/race/account-changes';
export const PAGE_MAX = 500;
export const MIN_GAP_MS = 1000; // 60 requests a minute
export const BACKOFF_MAX_MS = 10 * 60 * 1000;
export const INTERVAL_DEFAULT_MS = 60_000;
export const INTERVAL_MIN_MS = 15_000;
export const INTERVAL_MAX_MS = 120_000;
const FETCH_TIMEOUT_MS = 10_000;

const EVENT_TYPES = new Set(['locked', 'unlocked', 'rights', 'deleted']);

/**
 * The feed's settings, judged at start (website mode only). Throws, naming the setting — never the
 * token — when one is missing or wrong.
 * @returns {{ url: string, token: string, intervalMs: number }}
 */
export function loadFeedConfig(
  env = process.env,
  { readFile = (p) => readFileSync(p, 'utf8') } = {}
) {
  const rawUrl = String(env.RA_WEBSITE_FEED_URL ?? '').trim();
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    throw new Error(
      "RA_MODE=website needs RA_WEBSITE_FEED_URL: the website's address for the account-changes feed, " +
        'e.g. http://site:3800 (the feed path is added).'
    );
  }
  const tokenFile = String(env.RA_WEBSITE_SYNC_TOKEN_FILE ?? '').trim();
  if (!tokenFile) {
    throw new Error(
      'RA_MODE=website needs RA_WEBSITE_SYNC_TOKEN_FILE: a root-only file holding the sync token.'
    );
  }
  let token;
  try {
    token = readFile(tokenFile).trim();
  } catch (err) {
    throw new Error(
      `RA_WEBSITE_SYNC_TOKEN_FILE ${tokenFile} cannot be read (${err.code ?? 'error'}).`,
      {
        cause: err,
      }
    );
  }
  if (!token) throw new Error(`RA_WEBSITE_SYNC_TOKEN_FILE ${tokenFile} is empty.`);

  const rawInterval = env.RA_WEBSITE_FEED_INTERVAL_MS;
  const intervalMs =
    rawInterval === undefined || String(rawInterval).trim() === ''
      ? INTERVAL_DEFAULT_MS
      : Number(rawInterval);
  if (
    !Number.isInteger(intervalMs) ||
    intervalMs < INTERVAL_MIN_MS ||
    intervalMs > INTERVAL_MAX_MS
  ) {
    throw new Error(
      `RA_WEBSITE_FEED_INTERVAL_MS is ${JSON.stringify(rawInterval)}; it must be a whole number of ` +
        `milliseconds from ${INTERVAL_MIN_MS} to ${INTERVAL_MAX_MS}.`
    );
  }
  return { url: url.origin + url.pathname.replace(/\/+$/, ''), token, intervalMs };
}

/** The website's digit cursor (embeddedRoutes.js accepts only this as ). */
const CURSOR = /^\d{1,15}$/;

/** One answer, exactly as the website sends it (see the header). Throws on anything else. */
export function readFeedPage(body) {
  const list = body?.changes;
  if (!Array.isArray(list)) throw new Error('the feed answered without a "changes" list');
  if (list.length > PAGE_MAX) {
    throw new Error(`the feed answered ${list.length} changes (at most ${PAGE_MAX})`);
  }
  if (typeof body.next !== 'string' || !CURSOR.test(body.next)) {
    throw new Error('the feed answered without a digit cursor "next"');
  }
  const events = list.map((c, i) => {
    if (!EVENT_TYPES.has(c?.kind)) {
      throw new Error(`change ${i}: unknown kind ${JSON.stringify(c?.kind)}`);
    }
    // A JSON number, as the website's account ids are; mapped to the sign-in route's String(id).
    if (!Number.isSafeInteger(c.id) || c.id < 1)
      throw new Error(`change ${i}: the id is not a number`);
    return { type: c.kind, userId: String(c.id) };
  });
  return { events, cursor: body.next, hasMore: list.length === PAGE_MAX };
}

/**
 * Apply one page: every event, then the cursor, in one transaction.
 * @param {{ identities: object, registrations: object }} stores
 */
export function applyFeedPage({ identities, registrations }, page) {
  // FIRST the deleted members' entries in open registrations — they are written through the
  // registration store's own connection, so they cannot join the transaction below. Doing them
  // before it is what keeps the page safe: a crash after this and before the cursor is saved
  // replays the page, and removing what is already gone removes nothing.
  for (const { type, userId } of page.events) {
    if (type === 'deleted') registrations.removeOpenWebsiteEntries(userId);
  }
  // THEN every identity change and the cursor that follows them, as one transaction.
  identities.transaction(() => {
    for (const { type, userId } of page.events) {
      if (type === 'locked') {
        identities.setLocked(userId, true);
        identities.bumpEpoch(userId);
      } else if (type === 'unlocked') {
        identities.setLocked(userId, false);
      } else if (type === 'rights') {
        identities.bumpEpoch(userId);
      } else if (type === 'deleted') {
        identities.markDeleted(userId);
      }
    }
    identities.setFeedCursor(page.cursor);
  });
}

/**
 * The poller. `start()` begins; `stop()` ends it. Everything that touches the world is injected, so
 * the tests drive it with a fake feed and a fake clock.
 *
 * @param {{ config: object, identities: object, registrations: object,
 *           fetchImpl?: typeof fetch, setTimer?: Function, clearTimer?: Function,
 *           now?: () => number, log?: (line: string) => void }} deps
 */
export function createFeedPoller({
  config,
  identities,
  registrations,
  fetchImpl = fetch,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  now = () => Date.now(),
  log = (line) => console.warn(line),
}) {
  let timer = null;
  let failures = 0;
  let lastRequestAt = -Infinity;
  let stopped = true;

  async function pollOnce() {
    const since = identities.getFeedCursor();
    // First contact: since=0 (the website reads an absent cursor the same way).
    const url = `${config.url}${FEED_PATH}?since=${encodeURIComponent(since ?? '0')}`;
    lastRequestAt = now();
    const res = await fetchImpl(url, {
      headers: { 'X-Games-Sync-Token': config.token, accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`the feed answered ${res.status}`);
    const page = readFeedPage(await res.json());
    applyFeedPage({ identities, registrations }, page);
    return page;
  }

  /** The wait before the next request, from what the last one did. */
  function nextDelay(page) {
    if (page?.hasMore) return Math.max(0, lastRequestAt + MIN_GAP_MS - now());
    if (failures > 0) return Math.min(config.intervalMs * 2 ** failures, BACKOFF_MAX_MS);
    return config.intervalMs;
  }

  async function tick() {
    timer = null;
    let page = null;
    try {
      page = await pollOnce();
      failures = 0;
    } catch (err) {
      failures += 1;
      // The token is never in the message: it travels in a header, and errors name the status.
      log(`[website-feed] ${err.message}; trying again later (failure ${failures} in a row)`);
    }
    if (!stopped) schedule(nextDelay(page));
  }

  function schedule(ms) {
    timer = setTimer(tick, ms);
    timer?.unref?.();
  }

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      schedule(0);
    },
    stop() {
      stopped = true;
      if (timer) clearTimer(timer);
      timer = null;
    },
    /** For tests: one request and its effect, without the timer. */
    pollOnce,
    nextDelay,
    get failures() {
      return failures;
    },
  };
}
