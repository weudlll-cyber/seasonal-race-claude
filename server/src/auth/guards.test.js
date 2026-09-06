// ============================================================
// File:        guards.test.js
// Path:        server/src/auth/guards.test.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Unit + bare-harness behavioural tests for requireAuth / requireAdmin
// ============================================================

import { describe, it, expect } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { isPublicPath, requiredRole, createRequireAuth, createRequireAdmin } from './guards.js';

// ── Part A — matcher unit tests ───────────────────────────────────────────────

describe('isPublicPath', () => {
  it('GET /api/health → true', () => expect(isPublicPath('GET', '/api/health')).toBe(true));
  it('GET /api/health/ (trailing slash) → true', () =>
    expect(isPublicPath('GET', '/api/health/')).toBe(true));
  it('POST /api/health → false', () => expect(isPublicPath('POST', '/api/health')).toBe(false));
  it('GET /api/healthx → false', () => expect(isPublicPath('GET', '/api/healthx')).toBe(false));
  it('GET /api/auth/setup-needed → true', () =>
    expect(isPublicPath('GET', '/api/auth/setup-needed')).toBe(true));
  it('POST /api/auth/login → true', () =>
    expect(isPublicPath('POST', '/api/auth/login')).toBe(true));
  it('GET /api/auth/login → false', () =>
    expect(isPublicPath('GET', '/api/auth/login')).toBe(false));
  it('GET /api/tracks → false', () => expect(isPublicPath('GET', '/api/tracks')).toBe(false));
});

describe('requiredRole', () => {
  it('POST /api/surface-classes → admin', () =>
    expect(requiredRole('POST', '/api/surface-classes')).toBe('admin'));
  it('PUT /api/surface-classes/abc → admin', () =>
    expect(requiredRole('PUT', '/api/surface-classes/abc')).toBe('admin'));
  it('DELETE /api/surface-classes/abc/ → admin (trailing slash normalised)', () =>
    expect(requiredRole('DELETE', '/api/surface-classes/abc/')).toBe('admin'));
  it('post (lowercase) /api/surface-classes → admin (method normalisation)', () =>
    expect(requiredRole('post', '/api/surface-classes')).toBe('admin'));
  it('GET /api/surface-classes → null (read is operator+)', () =>
    expect(requiredRole('GET', '/api/surface-classes')).toBeNull());
  it('GET /api/surface-classes/abc → null', () =>
    expect(requiredRole('GET', '/api/surface-classes/abc')).toBeNull());
  it('POST /api/tracks → null (operator+ route)', () =>
    expect(requiredRole('POST', '/api/tracks')).toBeNull());
});

describe('requiredRole — /api/users policy (C3a)', () => {
  it('GET /api/users → admin', () => expect(requiredRole('GET', '/api/users')).toBe('admin'));
  it('POST /api/users → admin', () => expect(requiredRole('POST', '/api/users')).toBe('admin'));
  it('DELETE /api/users/abc → admin (future sub-routes pre-gated)', () =>
    expect(requiredRole('DELETE', '/api/users/abc')).toBe('admin'));
  it('GET /api/users/ (trailing slash normalised) → admin', () =>
    expect(requiredRole('GET', '/api/users/')).toBe('admin'));
});

// ── HEAD-gate fix — HEAD must inherit the GET role policy ─────────────────────
// HONESTY PROOF: without the fix requiredRole('HEAD', ...) returns null (no match);
// with the fix it returns 'admin', and operator HEAD → 403 in integration.

describe('requiredRole — HEAD inherits GET role policy (HEAD-gate fix)', () => {
  it('HEAD /api/tracks/foo/export-seed → admin (same as GET)', () =>
    expect(requiredRole('HEAD', '/api/tracks/foo/export-seed')).toBe('admin'));
  it('HEAD /api/brands/foo/export-seed → admin', () =>
    expect(requiredRole('HEAD', '/api/brands/foo/export-seed')).toBe('admin'));
  it('HEAD /api/player-groups/foo/export-seed → admin', () =>
    expect(requiredRole('HEAD', '/api/player-groups/foo/export-seed')).toBe('admin'));
  it('HEAD /api/users → admin (all-methods entry, HEAD inherits GET)', () =>
    expect(requiredRole('HEAD', '/api/users')).toBe('admin'));
  it('HEAD /api/surface-classes → null (GET is operator+; HEAD inherits that, NOT admin)', () =>
    expect(requiredRole('HEAD', '/api/surface-classes')).toBeNull());
  it('HEAD /api/surface-classes/abc → null', () =>
    expect(requiredRole('HEAD', '/api/surface-classes/abc')).toBeNull());
});

// ── Part B — behavioural guard tests (bare harness, MemoryStore) ─────────────

const fakeStore = {
  findAuthRecordById: (id) =>
    ({
      op1: { id: 'op1', username: 'op', role: 'operator' },
      ad1: { id: 'ad1', username: 'ad', role: 'admin' },
    })[id] ?? null,
};

const customPublicPaths = [{ method: 'GET', path: '/api/_public' }];
const customPolicy = [{ methods: ['GET'], test: (p) => p === '/api/_admin', role: 'admin' }];

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ name: 'ra.sid', secret: 'test', resave: false, saveUninitialized: false }));

  // Seed route — outside /api so it is never guarded.
  app.post('/_seed', (req, res) => {
    req.session.userId = req.body.userId;
    res.json({ ok: true });
  });

  app.use(createRequireAuth({ publicPaths: customPublicPaths, store: fakeStore }));
  app.use(createRequireAdmin({ routePolicy: customPolicy }));

  app.get('/api/_public', (_req, res) => res.json({ ok: true }));
  app.get('/api/_op', (req, res) => res.json({ user: req.authUser }));
  app.get('/api/_admin', (_req, res) => res.json({ ok: true }));

  return app;
}

describe('requireAuth behavioural', () => {
  it('anonymous GET /api/_op → 401', async () => {
    const res = await request(makeApp()).get('/api/_op');
    expect(res.status).toBe(401);
  });

  it('anonymous GET /api/_public → 200 (allow-listed)', async () => {
    const res = await request(makeApp()).get('/api/_public');
    expect(res.status).toBe(200);
  });

  it('seeded op1 GET /api/_op → 200, authUser.role === operator (no hash)', async () => {
    const agent = request.agent(makeApp());
    await agent.post('/_seed').send({ userId: 'op1' });
    const res = await agent.get('/api/_op');
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('operator');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('seeded op1 GET /api/_admin → 403 (operator cannot reach admin route)', async () => {
    const agent = request.agent(makeApp());
    await agent.post('/_seed').send({ userId: 'op1' });
    const res = await agent.get('/api/_admin');
    expect(res.status).toBe(403);
  });

  it('seeded ad1 GET /api/_admin → 200', async () => {
    const agent = request.agent(makeApp());
    await agent.post('/_seed').send({ userId: 'ad1' });
    const res = await agent.get('/api/_admin');
    expect(res.status).toBe(200);
  });

  it('seeded ghost (unknown) GET /api/_op → 401, session destroyed (fail-closed)', async () => {
    const agent = request.agent(makeApp());
    await agent.post('/_seed').send({ userId: 'ghost' });
    const res1 = await agent.get('/api/_op');
    expect(res1.status).toBe(401);
    // Session was destroyed — second request must also be 401 (no lingering session).
    const res2 = await agent.get('/api/_op');
    expect(res2.status).toBe(401);
  });
});
