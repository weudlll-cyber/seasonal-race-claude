// ============================================================
// File:        session.test.js
// Path:        server/src/auth/session.test.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Session middleware tests — lifecycle, cookie flags, SQLite persistence, secret policy
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { createSessionMiddleware, resolveCookieSecure, resolveCookieName } from './session.js';
import { createApp } from '../app.js';

function makeTempDb() {
  return join(os.tmpdir(), `sess-test-${randomUUID()}.sqlite`);
}

// ── Session lifecycle tests ───────────────────────────────────────────────────

describe('session middleware — lifecycle', () => {
  let tempDb;
  let mw;
  let agent;

  beforeEach(() => {
    tempDb = makeTempDb();
    mw = createSessionMiddleware({ dbPath: tempDb, secret: 'test-secret', isProduction: false, enableSweep: false });
    const app = express();
    app.use(express.json());
    app.use(mw);
    app.post('/touch',  (req, res) => { req.session.userId = 'u1'; res.json({ sid: req.sessionID }); });
    app.post('/login',  (req, res) => { req.session.regenerate(e => { if (e) return res.status(500).end(); req.session.userId = 'u1'; res.json({ sid: req.sessionID }); }); });
    app.get('/me',      (req, res) => res.json({ userId: req.session.userId ?? null }));
    app.post('/logout', (req, res) => { req.session.destroy(() => { res.clearCookie('ra.sid'); res.json({ ok: true }); }); });
    agent = request.agent(app);
  });

  afterEach(() => {
    if (mw._db) { try { mw._db.close(); } catch {} }
    for (const suffix of ['', '-wal', '-shm']) {
      const p = tempDb + suffix;
      if (existsSync(p)) try { unlinkSync(p); } catch {}
    }
  });

  it('issues no Set-Cookie on unauthenticated GET /me (saveUninitialized:false)', async () => {
    const res = await agent.get('/me');
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(res.body.userId).toBeNull();
  });

  it('POST /touch issues a cookie with correct flags (HttpOnly, SameSite=Lax, no Secure, Expires≈30d)', async () => {
    const res = await agent.post('/touch');
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/ra\.sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/(?<![A-Za-z])Secure(?![A-Za-z])/i);
    // express-session serialises maxAge as an Expires date; verify it's ~30 days out
    const expiresMatch = cookie.match(/Expires=([^;]+)/i);
    expect(expiresMatch).not.toBeNull();
    const expiresMs = new Date(expiresMatch[1]).getTime();
    const diffDays = (expiresMs - Date.now()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });

  it('POST /login regenerates session ID (anti session-fixation)', async () => {
    const touchRes = await agent.post('/touch');
    const oldSid = touchRes.body.sid;
    const loginRes = await agent.post('/login');
    expect(loginRes.body.sid).toBeTruthy();
    expect(loginRes.body.sid).not.toBe(oldSid);
  });

  it('GET /me returns userId after login (session carries the user)', async () => {
    await agent.post('/login');
    const res = await agent.get('/me');
    expect(res.body.userId).toBe('u1');
  });

  it('GET /me returns null after logout (destroy invalidated the session)', async () => {
    await agent.post('/login');
    await agent.post('/logout');
    const res = await agent.get('/me');
    expect(res.body.userId).toBeNull();
  });

  it('persists session row to SQLite — proves SQLite store, not MemoryStore', async () => {
    await agent.post('/touch');
    // Close the store handle before opening read-only
    mw._db.close();
    mw._db = null;
    const db = new Database(tempDb, { readonly: true });
    try {
      // PRÜFEN: table name is 'sessions' (confirmed from library source)
      const row = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
      expect(row.count).toBeGreaterThanOrEqual(1);
    } finally {
      db.close();
    }
  });
});

// ── Secret policy tests ───────────────────────────────────────────────────────

describe('session middleware — secret policy', () => {
  it('throws SESSION_SECRET_MISSING in production with no secret env', () => {
    const saved = process.env.RA_SESSION_SECRET;
    delete process.env.RA_SESSION_SECRET;
    try {
      expect(() => createSessionMiddleware({ isProduction: true }))
        .toThrow(expect.objectContaining({ code: 'SESSION_SECRET_MISSING' }));
    } finally {
      if (saved !== undefined) process.env.RA_SESSION_SECRET = saved;
    }
  });

  it('does not throw in dev mode with no secret env', () => {
    const saved = process.env.RA_SESSION_SECRET;
    delete process.env.RA_SESSION_SECRET;
    try {
      expect(() => createSessionMiddleware({ isProduction: false })).not.toThrow();
    } finally {
      if (saved !== undefined) process.env.RA_SESSION_SECRET = saved;
    }
  });
});

// ── Unit: resolveCookieSecure ─────────────────────────────────────────────────

describe('resolveCookieSecure', () => {
  afterEach(() => { delete process.env.RA_COOKIE_SECURE; });

  it('RA_COOKIE_SECURE=true → true, overrides isProduction:false', () => {
    process.env.RA_COOKIE_SECURE = 'true';
    expect(resolveCookieSecure(false)).toBe(true);
  });

  it('RA_COOKIE_SECURE=false → false, overrides isProduction:true', () => {
    process.env.RA_COOKIE_SECURE = 'false';
    expect(resolveCookieSecure(true)).toBe(false);
  });

  it('RA_COOKIE_SECURE=auto → "auto"', () => {
    process.env.RA_COOKIE_SECURE = 'auto';
    expect(resolveCookieSecure(false)).toBe('auto');
  });

  it('RA_COOKIE_SECURE unset, isProduction:false → false', () => {
    expect(resolveCookieSecure(false)).toBe(false);
  });

  it('RA_COOKIE_SECURE unset, isProduction:true → true', () => {
    expect(resolveCookieSecure(true)).toBe(true);
  });
});

// ── Unit: resolveCookieName ───────────────────────────────────────────────────

describe('resolveCookieName', () => {
  afterEach(() => {
    delete process.env.RA_COOKIE_NAME_MODE;
  });

  it('auto + true → __Host-ra.sid', () => {
    expect(resolveCookieName(true)).toBe('__Host-ra.sid');
  });

  it('auto + "auto" → ra.sid (not the literal true)', () => {
    expect(resolveCookieName('auto')).toBe('ra.sid');
  });

  it('auto + false → ra.sid', () => {
    expect(resolveCookieName(false)).toBe('ra.sid');
  });

  it('host + true → __Host-ra.sid', () => {
    process.env.RA_COOKIE_NAME_MODE = 'host';
    expect(resolveCookieName(true)).toBe('__Host-ra.sid');
  });

  it('host + false → throws COOKIE_NAME_MODE_INVALID', () => {
    process.env.RA_COOKIE_NAME_MODE = 'host';
    expect(() => resolveCookieName(false))
      .toThrow(expect.objectContaining({ code: 'COOKIE_NAME_MODE_INVALID' }));
  });

  it('host + "auto" → throws COOKIE_NAME_MODE_INVALID', () => {
    process.env.RA_COOKIE_NAME_MODE = 'host';
    expect(() => resolveCookieName('auto'))
      .toThrow(expect.objectContaining({ code: 'COOKIE_NAME_MODE_INVALID' }));
  });

  it('legacy → ra.sid regardless of secureResolved', () => {
    process.env.RA_COOKIE_NAME_MODE = 'legacy';
    expect(resolveCookieName(true)).toBe('ra.sid');
    expect(resolveCookieName(false)).toBe('ra.sid');
  });
});

// ── Integration: maxAge in Set-Cookie header + rolling disabled ───────────────

describe('session middleware — maxAge and rolling', () => {
  let mw;
  let agent;

  beforeEach(() => {
    mw = createSessionMiddleware({ secret: 'test-secret', isProduction: false, enableSweep: false });
    const app = express();
    app.use(express.json());
    app.use(mw);
    app.post('/touch', (req, res) => { req.session.userId = 'u1'; res.json({}); });
    app.get('/me',    (req, res) => res.json({ userId: req.session.userId ?? null }));
    agent = request.agent(app);
  });

  afterEach(() => {
    if (mw._db) { try { mw._db.close(); } catch {} }
  });

  it('Set-Cookie Expires is ~30 days in the future (maxAge:2592000000 applied)', async () => {
    const res = await agent.post('/touch');
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    // express-session serialises cookie.maxAge as an Expires date in the Set-Cookie header
    const expiresMatch = cookie.match(/Expires=([^;]+)/i);
    expect(expiresMatch).not.toBeNull();
    const diffDays = (new Date(expiresMatch[1]).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });

  it('rolling is false — authenticated GET does not issue a new Set-Cookie', async () => {
    await agent.post('/touch');
    const res = await agent.get('/me');
    // rolling:true would emit Set-Cookie on every request; rolling:false must not
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

// ── No-regression: createApp() still works and does not set cookies on normal requests ─────────

describe('createApp no-regression', () => {
  it('GET /api/health returns 200 and issues no Set-Cookie', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});
