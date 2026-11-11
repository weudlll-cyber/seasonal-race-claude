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
// ── THE ANSWER'S SHAPE, READ TOLERANTLY (on the sheet) ─────────────────────────────────────────
// The summary names the events and the limits but not the field names, so the reader accepts the
// obvious spellings: `events` (or `changes`) — each `{ type | event, userId | user_id | id }` —
// and the next cursor in `nextCursor` (or `cursor`), with `hasMore` (or a full page of 500) for
// "ask again now". An answer without a cursor is an error: applying it without being able to
// remember it would repeat it forever.
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

/** One answer, read tolerantly (see the header). Throws on an answer it cannot use. */
export function readFeedPage(body) {
  const list = Array.isArray(body?.events)
    ? body.events
    : Array.isArray(body?.changes)
      ? body.changes
      : null;
  if (!list) throw new Error('the feed answered without an events list');
  const cursor = body.nextCursor ?? body.cursor;
  if (cursor === undefined || cursor === null || String(cursor) === '') {
    throw new Error('the feed answered without a cursor');
  }
  const events = [];
  for (const e of list) {
    const type = String(e?.type ?? e?.event ?? '').toLowerCase();
    const userId = e?.userId ?? e?.user_id ?? e?.id;
    // An event this race does not know, or one naming nobody, is skipped — never a reason to stop
    // following the feed (the website may add kinds a later race understands).
    if (EVENT_TYPES.has(type) && typeof userId === 'string' && userId)
      events.push({ type, userId });
  }
  const hasMore = body.hasMore === true || (body.hasMore === undefined && list.length >= PAGE_MAX);
  return { events, cursor: String(cursor), hasMore };
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
    const url = `${config.url}${FEED_PATH}${since === null ? '' : `?since=${encodeURIComponent(since)}`}`;
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
