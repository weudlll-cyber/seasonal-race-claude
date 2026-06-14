// ============================================================
// File:        users.integration.test.js
// Path:        server/src/auth/users.integration.test.js
// Project:     RaceArena
// Created:     2026-06-14
// Description: Integration tests for /api/users (Phase C step 3a) — GET (list) and POST
//              (create). Gating verified against real app: anonymous→401, operator→403,
//              admin→allowed. Store isolation via RA_USERS_DB (test/env-setup.js).
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { adminAgent, operatorAgent } from '../../test/authAgent.js';

const app = createApp();

let adminApi;
let operatorApi;

// Unique per test-run so repeated runs don't collide within the shared temp store.
const NEW_USER = {
  username: `userstest-${Date.now()}`,
  password: 'Alice-Pass-123!',
  role: 'operator',
};

beforeAll(async () => {
  adminApi = await adminAgent(app);
  operatorApi = await operatorAgent(app);
});

// ── GET /api/users ────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  it('anonymous → 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('operator → 403', async () => {
    const res = await operatorApi.get('/api/users');
    expect(res.status).toBe(403);
  });

  it('admin → 200 with an array', async () => {
    const res = await adminApi.get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('admin → no entry in the list has a passwordHash field', async () => {
    const res = await adminApi.get('/api/users');
    for (const u of res.body) {
      expect(u).not.toHaveProperty('passwordHash');
    }
  });

  it('admin → list contains testadmin (seeded by beforeAll)', async () => {
    const res = await adminApi.get('/api/users');
    expect(res.body.some((u) => u.username === 'testadmin')).toBe(true);
  });
});

// ── POST /api/users ───────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  it('anonymous → 401', async () => {
    const res = await request(app).post('/api/users').send(NEW_USER);
    expect(res.status).toBe(401);
  });

  it('operator → 403', async () => {
    const res = await operatorApi.post('/api/users').send(NEW_USER);
    expect(res.status).toBe(403);
  });

  it('admin with valid body → 201 with no passwordHash', async () => {
    const res = await adminApi.post('/api/users').send(NEW_USER);
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body.username).toBe(NEW_USER.username);
    expect(res.body.role).toBe('operator');
  });

  it('new user is visible in GET /api/users after creation', async () => {
    const res = await adminApi.get('/api/users');
    expect(res.body.some((u) => u.username === NEW_USER.username)).toBe(true);
  });

  it('admin duplicate username → 409', async () => {
    const res = await adminApi.post('/api/users').send(NEW_USER);
    expect(res.status).toBe(409);
  });

  it('admin invalid role → 400', async () => {
    const res = await adminApi
      .post('/api/users')
      .send({ username: `userstest-bad-${Date.now()}`, password: 'pw-valid-123', role: 'superuser' });
    expect(res.status).toBe(400);
  });

  it('admin empty password → 400', async () => {
    const res = await adminApi
      .post('/api/users')
      .send({ username: `userstest-nopw-${Date.now()}`, password: '', role: 'operator' });
    expect(res.status).toBe(400);
  });

  it('admin missing username → 400', async () => {
    const res = await adminApi
      .post('/api/users')
      .send({ password: 'pw-valid-123', role: 'operator' });
    expect(res.status).toBe(400);
  });

  it('POST response body never contains passwordHash (incl. error responses)', async () => {
    const res = await adminApi.post('/api/users').send(NEW_USER);  // duplicate → 409
    expect(res.body).not.toHaveProperty('passwordHash');
  });
});
