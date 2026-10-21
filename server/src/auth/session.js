// ============================================================
// File:        session.js
// Path:        server/src/auth/session.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Express session middleware factory — SQLite-backed persistent store
// ============================================================

import session from 'express-session';
import Database from 'better-sqlite3';
import sqliteStoreFactory from 'better-sqlite3-session-store';
import { randomUUID } from 'node:crypto';
import { existsSync, renameSync } from 'node:fs';
import { join } from 'path';
import { DATA_ROOT } from '../dataPaths.js';
// Imported as well as re-exported below: a bare `export {} from` does not bind the name locally,
// and `getActiveCookieName` and `createSessionMiddleware` below call it.
import { resolveCookieSecure } from './cookiePolicy.js';

// Checked: sqliteStoreFactory({ Store }) — the factory destructures session.Store from the
// express-session function object, which is standard connect-store adapter convention.
const SqliteStore = sqliteStoreFactory(session);

// ★ THE RULE MOVED, THE BEHAVIOUR DID NOT (DELIVERY-CLEAN-3 piece 1, 2026-09-27). It now lives in
// `cookiePolicy.js` and is re-exported here, so `authRouter.js:19` and `session.test.js:17` import
// it from the same place as before. It had to move because `startupReadiness.js` needs the same
// rule and must not import this file — this one pulls in `better-sqlite3`, and that file promises
// it can be judged without an environment. The alternative was a second copy of the rule.
export { resolveCookieSecure } from './cookiePolicy.js';

// RA_COOKIE_NAME_MODE controls the session cookie name:
//   auto (default): __Host-ra.sid when Secure is guaranteed (literal true), else ra.sid
//   host:           always __Host-ra.sid; throws if Secure is not guaranteed
//   legacy:         always ra.sid (transition escape hatch)
export function resolveCookieName(secureResolved) {
  const mode = process.env.RA_COOKIE_NAME_MODE ?? 'auto';
  if (mode === 'legacy') return 'ra.sid';
  if (mode === 'host') {
    if (secureResolved !== true) {
      const e = new Error(
        'RA_COOKIE_NAME_MODE=host requires guaranteed Secure (RA_COOKIE_SECURE=true)'
      );
      e.code = 'COOKIE_NAME_MODE_INVALID';
      throw e;
    }
    return '__Host-ra.sid';
  }
  // auto: __Host- only when Secure is guaranteed (literal true, NOT 'auto'/false)
  return secureResolved === true ? '__Host-ra.sid' : 'ra.sid';
}

// Convenience: resolved cookie name for the current process environment (used by logout).
export function getActiveCookieName() {
  const secure = resolveCookieSecure(process.env.NODE_ENV === 'production');
  return resolveCookieName(secure);
}

/** The SQLite error codes that mean "this file is damaged", as opposed to locked or unreachable. */
const DAMAGED_CODES = new Set(['SQLITE_NOTADB', 'SQLITE_CORRUPT']);

/**
 * Open the session database; a DAMAGED one is moved aside and a fresh one started.
 *
 * AUDIT-1 A10-07, the owner's decision of 2026-10-12. A damaged `sessions.sqlite` used to stop the
 * server at start (`SqliteError: file is not a database`, exit 1). Sessions are disposable — the
 * cost of a fresh file is that everyone signs in again — so the file is RENAMED, never deleted
 * (`<name>.damaged-<UTC time>`, with any `-wal`/`-shm`/`-journal` still beside it), one line says so, and
 * the server starts. Only damage does this: any other error (a lock, a permission) still stops the
 * start, because moving a healthy file aside would sign everyone out for nothing.
 *
 * @param {string} dbPath  a file path, or ':memory:'
 * @param {{ log?: (line: string) => void, now?: () => Date }} [opts]
 * @returns {import('better-sqlite3').Database}
 */
export function openSessionDatabase(dbPath, { log = console.warn, now = () => new Date() } = {}) {
  let db;
  try {
    db = new Database(dbPath);
    // Reading the schema is the first read of the file's pages, so it is where damage shows.
    db.prepare('SELECT count(*) FROM sqlite_master').get();
    return db;
  } catch (err) {
    db?.close();
    if (!DAMAGED_CODES.has(err.code) || dbPath === ':memory:') throw err;
    const aside = `${dbPath}.damaged-${now().toISOString().replace(/[:.]/g, '-')}`;
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      if (existsSync(dbPath + suffix)) renameSync(dbPath + suffix, aside + suffix);
    }
    log(
      `[auth] The session database was damaged (${err.code}) and has been moved aside to ${aside}; ` +
        'a fresh one is in use, so everyone has to sign in again. Nothing else is affected.'
    );
    return new Database(dbPath);
  }
}

export function createSessionMiddleware(opts = {}) {
  const isProduction = opts.isProduction ?? process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

  // dbPath: explicit opt > test in-memory default > env override > file default
  const dbPath =
    opts.dbPath ??
    (isTest ? ':memory:' : (process.env.RA_SESSION_DB ?? join(DATA_ROOT, 'sessions.sqlite')));

  // Secret resolution
  let secret = opts.secret ?? process.env.RA_SESSION_SECRET;
  if (!secret) {
    if (isProduction) {
      const err = new Error('RA_SESSION_SECRET is required in production');
      err.code = 'SESSION_SECRET_MISSING';
      throw err;
    }
    secret = randomUUID();
    // Warn once per process start; createSessionMiddleware is called once at module scope in app.js.
    console.warn(
      '[auth] Using ephemeral dev session secret — sessions will not survive restart. Set RA_SESSION_SECRET to silence this.'
    );
  }

  const enableSweep = opts.enableSweep ?? !isTest;

  const db = openSessionDatabase(dbPath);
  // Checked: the library's `(options.expired.clear) || true` has a boolean short-circuit bug
  // that always evaluates to true, so { clear: false } does NOT disable the sweep timer. The
  // 15-minute interval is benign in tests because `vitest run` exits via process.exit() after the
  // suite — the timer never fires within the test window. Documented here; no workaround needed.
  const store = new SqliteStore({
    client: db,
    expired: enableSweep ? { clear: true, intervalMs: 900000 } : { clear: false },
  });

  // Single resolution — reuse same value for both name and cookie.secure (no drift).
  const cookieSecure = resolveCookieSecure(isProduction);

  const mw = session({
    name: resolveCookieName(cookieSecure),
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  });
  mw._db = db; // exposed for test teardown (store.client alias)
  return mw;
}
