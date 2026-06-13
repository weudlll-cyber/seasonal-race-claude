// ============================================================
// File:        authRouter.test.js
// Path:        server/src/auth/authRouter.test.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Integration tests for /api/auth routes — setup, login, logout, me
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import session from 'express-session';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createUsersStore } from './usersStore.js';
import { createAuthRouter } from './authRouter.js';

// Uses express-session's default in-memory store — no better-sqlite3 dependency in this file.
function makeSession() {
  return session({
    name: 'ra.sid',
    secret: 'test',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false, path: '/' },
  });
}

function makePaths() {
  return {
    usersPath: join(os.tmpdir(), `auth-test-users-${randomUUID()}.json`),
    markerPath: join(os.tmpdir(), `auth-test-marker-${randomUUID()}.json`),
  };
}

describe('authRouter', () => {
  let usersPath, markerPath, store, app, agent;

  beforeEach(() => {
    ({ usersPath, markerPath } = makePaths());
    store = createUsersStore(usersPath);
    app = express();
    app.use(express.json());
    app.use(makeSession());
    app.use('/api/auth', createAuthRouter({ store, setupMarkerPath: markerPath, getBootstrapToken: () => 'TEST-TOKEN' }));
    agent = request.agent(app);
  });

  afterEach(() => {
    for (const p of [usersPath, markerPath]) {
      if (existsSync(p)) try { unlinkSync(p); } catch {}
    }
  });

  // ── GET /setup-needed ─────────────────────────────────────────────────────

  it('setup-needed: true on fresh state (no users, no marker)', async () => {
    const res = await agent.get('/api/auth/setup-needed');
    expect(res.status).toBe(200);
    expect(res.body.setupNeeded).toBe(true);
  });

  it('setup-needed: false after successful setup', async () => {
    await agent.post('/api/auth/setup')
      .set('x-bootstrap-token', 'TEST-TOKEN')
      .send({ username: 'admin', password: 'pw123' });
    const res = await agent.get('/api/auth/setup-needed');
    expect(res.body.setupNeeded).toBe(false);
  });

  // ── POST /setup ───────────────────────────────────────────────────────────

  it('setup: missing token → 403', async () => {
    const res = await agent.post('/api/auth/setup').send({ username: 'admin', password: 'pw123' });
    expect(res.status).toBe(403);
  });

  it('setup: wrong token → 403', async () => {
    const res = await agent.post('/api/auth/setup')
      .set('x-bootstrap-token', 'WRONG')
      .send({ username: 'admin', password: 'pw123' });
    expect(res.status).toBe(403);
  });

  it('setup: correct token → 201 { username, role:admin }, user persisted, marker created', async () => {
    const res = await agent.post('/api/auth/setup')
      .set('x-bootstrap-token', 'TEST-TOKEN')
      .send({ username: 'admin', password: 'pw123' });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('admin');
    expect(res.body.role).toBe('admin');
    expect(store.countUsers()).toBe(1);
    expect(existsSync(markerPath)).toBe(true);
  });

  it('setup: empty username → 400, no user created, marker rolled back', async () => {
    const res = await agent.post('/api/auth/setup')
      .set('x-bootstrap-token', 'TEST-TOKEN')
      .send({ username: '', password: 'pw123' });
    expect(res.status).toBe(400);
    expect(store.countUsers()).toBe(0);
    expect(existsSync(markerPath)).toBe(false);
  });

  it('setup: empty password → 400, no user created, marker rolled back', async () => {
    const res = await agent.post('/api/auth/setup')
      .set('x-bootstrap-token', 'TEST-TOKEN')
      .send({ username: 'admin', password: '' });
    expect(res.status).toBe(400);
    expect(store.countUsers()).toBe(0);
    expect(existsSync(markerPath)).toBe(false);
  });

  it('setup: 5 concurrent requests → exactly one 201, four 409s, countUsers === 1', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post('/api/auth/setup')
          .set('x-bootstrap-token', 'TEST-TOKEN')
          .send({ username: 'admin', password: 'pw123' })
      )
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201).length).toBe(1);
    expect(statuses.filter((s) => s === 409).length).toBe(4);
    expect(store.countUsers()).toBe(1);
  });

  it('setup: self-disabling — second call with correct token → 409', async () => {
    await agent.post('/api/auth/setup')
      .set('x-bootstrap-token', 'TEST-TOKEN')
      .send({ username: 'admin', password: 'pw123' });
    const res = await agent.post('/api/auth/setup')
      .set('x-bootstrap-token', 'TEST-TOKEN')
      .send({ username: 'admin2', password: 'pw123' });
    expect(res.status).toBe(409);
    expect(store.countUsers()).toBe(1);
  });

  it('setup: restore-safety — users exist but no marker → 409, still one user', async () => {
    await store.createUser({ username: 'existing', password: 'pw', role: 'admin' });
    const res = await agent.post('/api/auth/setup')
      .set('x-bootstrap-token', 'TEST-TOKEN')
      .send({ username: 'admin', password: 'pw123' });
    expect(res.status).toBe(409);
    expect(store.countUsers()).toBe(1);
  });

  // ── POST /login ───────────────────────────────────────────────────────────

  it('login: unknown user → 401', async () => {
    const res = await agent.post('/api/auth/login').send({ username: 'nobody', password: 'pw' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid credentials');
  });

  it('login: correct user, wrong password → 401', async () => {
    await store.createUser({ username: 'alice', password: 'correct', role: 'operator' });
    const res = await agent.post('/api/auth/login').send({ username: 'alice', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid credentials');
  });

  it('login: correct credentials → 200 { username, role } + ra.sid cookie', async () => {
    await store.createUser({ username: 'alice', password: 'correct', role: 'operator' });
    const res = await agent.post('/api/auth/login').send({ username: 'alice', password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
    expect(res.body.role).toBe('operator');
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/ra\.sid=/);
  });

  // ── GET /me ───────────────────────────────────────────────────────────────

  it('me: without session → 401', async () => {
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('me: after login → { username, role }', async () => {
    await store.createUser({ username: 'alice', password: 'pw', role: 'operator' });
    await agent.post('/api/auth/login').send({ username: 'alice', password: 'pw' });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: 'alice', role: 'operator' });
  });

  // ── POST /logout ──────────────────────────────────────────────────────────

  it('logout: without session → 401', async () => {
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  it('logout: after login → { ok:true }, then /me → 401', async () => {
    await store.createUser({ username: 'alice', password: 'pw', role: 'operator' });
    await agent.post('/api/auth/login').send({ username: 'alice', password: 'pw' });
    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.ok).toBe(true);
    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });

  // ── No-leak ───────────────────────────────────────────────────────────────

  it('no-leak: setup/login/me success bodies contain ONLY { username, role }', async () => {
    const setupRes = await agent.post('/api/auth/setup')
      .set('x-bootstrap-token', 'TEST-TOKEN')
      .send({ username: 'admin', password: 'pw123' });
    expect(setupRes.status).toBe(201);
    expect(Object.keys(setupRes.body).sort()).toEqual(['role', 'username']);

    // Agent is auto-logged-in after setup; check /me
    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(Object.keys(meRes.body).sort()).toEqual(['role', 'username']);

    // Logout then login to test /login response shape
    await agent.post('/api/auth/logout');
    const loginRes = await agent.post('/api/auth/login').send({ username: 'admin', password: 'pw123' });
    expect(loginRes.status).toBe(200);
    expect(Object.keys(loginRes.body).sort()).toEqual(['role', 'username']);
  });
});
