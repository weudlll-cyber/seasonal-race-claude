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
import { createSessionMiddleware } from './session.js';
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

  it('POST /touch issues a cookie with correct flags (HttpOnly, SameSite=Lax, no Secure)', async () => {
    const res = await agent.post('/touch');
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/ra\.sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/(?<![A-Za-z])Secure(?![A-Za-z])/i);
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
