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
import { join } from 'path';
import { DATA_ROOT } from '../dataPaths.js';

// PRÜFEN note: sqliteStoreFactory({ Store }) — the factory destructures session.Store from the
// express-session function object, which is standard connect-store adapter convention.
const SqliteStore = sqliteStoreFactory(session);

// RA_COOKIE_SECURE overrides the environment-derived default so operators can set secure:true
// on non-production HTTPS or keep it false on production HTTP (e.g. behind a terminating proxy
// that doesn't set NODE_ENV=production). 'auto' delegates to express-session's trust-proxy logic.
export function resolveCookieSecure(isProduction) {
  const v = process.env.RA_COOKIE_SECURE;
  if (v === 'true')  return true;
  if (v === 'false') return false;
  if (v === 'auto')  return 'auto';
  return isProduction;
}

// RA_COOKIE_NAME_MODE controls the session cookie name:
//   auto (default): __Host-ra.sid when Secure is guaranteed (literal true), else ra.sid
//   host:           always __Host-ra.sid; throws if Secure is not guaranteed
//   legacy:         always ra.sid (transition escape hatch)
export function resolveCookieName(secureResolved) {
  const mode = process.env.RA_COOKIE_NAME_MODE ?? 'auto';
  if (mode === 'legacy') return 'ra.sid';
  if (mode === 'host') {
    if (secureResolved !== true) {
      const e = new Error('RA_COOKIE_NAME_MODE=host requires guaranteed Secure (RA_COOKIE_SECURE=true)');
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

export function createSessionMiddleware(opts = {}) {
  const isProduction = opts.isProduction ?? (process.env.NODE_ENV === 'production');
  const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

  // dbPath: explicit opt > test in-memory default > env override > file default
  const dbPath = opts.dbPath
    ?? (isTest ? ':memory:' : (process.env.RA_SESSION_DB ?? join(DATA_ROOT, 'sessions.sqlite')));

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
    console.warn('[auth] Using ephemeral dev session secret — sessions will not survive restart. Set RA_SESSION_SECRET to silence this.');
  }

  const enableSweep = opts.enableSweep ?? !isTest;

  const db = new Database(dbPath);
  // PRÜFEN note: the library's `(options.expired.clear) || true` has a boolean short-circuit bug
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
    cookie: { httpOnly: true, sameSite: 'lax', secure: cookieSecure, path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 },
  });
  mw._db = db;  // exposed for test teardown (store.client alias)
  return mw;
}
