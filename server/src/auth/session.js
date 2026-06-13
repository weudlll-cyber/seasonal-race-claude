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
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');

// PRÜFEN note: sqliteStoreFactory({ Store }) — the factory destructures session.Store from the
// express-session function object, which is standard connect-store adapter convention.
const SqliteStore = sqliteStoreFactory(session);

export function createSessionMiddleware(opts = {}) {
  const isProduction = opts.isProduction ?? (process.env.NODE_ENV === 'production');
  const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

  // dbPath: explicit opt > test in-memory default > env override > file default
  const dbPath = opts.dbPath
    ?? (isTest ? ':memory:' : (process.env.RA_SESSION_DB ?? join(dataDir, 'sessions.sqlite')));

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

  const mw = session({
    name: 'ra.sid',
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' },
  });
  mw._db = db;  // exposed for test teardown (store.client alias)
  return mw;
}
