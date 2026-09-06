// ============================================================
// File:        users.integration.test.js
// Path:        server/src/auth/users.integration.test.js
// Project:     RaceArena
// Created:     2026-06-14
// Description: Integration tests for /api/users (Phase C step 3a) — GET (list) and POST
//              (create). Gating verified against real app: anonymous→401, operator→403,
//              admin→allowed. Store isolation via RA_USERS_DB (test/env-setup.js).
// ============================================================

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
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

  it('admin → no entry in the list has a sessionEpoch field', async () => {
    const res = await adminApi.get('/api/users');
    for (const u of res.body) {
      expect(u).not.toHaveProperty('sessionEpoch');
    }
  });

  // TEST-ACCOUNTS-1: the agent's OWN account, asked of the agent rather than named by a literal.
  // The literal was `testadmin`, one row eight files shared — see server/test/authAgent.js.
  it('admin → list contains the admin this file logged in as', async () => {
    const res = await adminApi.get('/api/users');
    expect(res.body.some((u) => u.username === adminApi.raUser.username)).toBe(true);
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

  it('admin with valid body → 201 with no passwordHash and no sessionEpoch', async () => {
    const res = await adminApi.post('/api/users').send(NEW_USER);
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('sessionEpoch');
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
    const res = await adminApi.post('/api/users').send({
      username: `userstest-bad-${Date.now()}`,
      password: 'pw-valid-123',
      role: 'superuser',
    });
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

  it('POST response body never contains passwordHash or sessionEpoch (incl. error responses)', async () => {
    const res = await adminApi.post('/api/users').send(NEW_USER); // duplicate → 409
    expect(res.status).toBe(409);
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('sessionEpoch');
  });
});

// ── DELETE /api/users/:id (C3b) ───────────────────────────────────────────────

describe('DELETE /api/users/:id', () => {
  let targetId;

  beforeAll(async () => {
    const res = await adminApi
      .post('/api/users')
      .send({ username: `del-target-${Date.now()}`, password: 'del-pass-123', role: 'operator' });
    targetId = res.body.id;
  });

  it('anonymous → 401', async () => {
    const res = await request(app).delete(`/api/users/${targetId}`);
    expect(res.status).toBe(401);
  });

  it('operator → 403', async () => {
    const res = await operatorApi.delete(`/api/users/${targetId}`);
    expect(res.status).toBe(403);
  });

  it('admin → 200 with safe user (no passwordHash, no sessionEpoch)', async () => {
    const res = await adminApi.delete(`/api/users/${targetId}`);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('sessionEpoch');
    expect(res.body.id).toBe(targetId);
  });

  it('deleted user is gone — subsequent DELETE returns 404', async () => {
    const res = await adminApi.delete(`/api/users/${targetId}`);
    expect(res.status).toBe(404);
  });

  it('unknown id → 404', async () => {
    const res = await adminApi.delete('/api/users/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  // TEST-ACCOUNTS-1: "the last admin" is a statement about the WHOLE store, and it is this file's
  // to make only because the store is this file's — one users DB per test file (test/env-setup.js).
  // Before that it was a claim about what the other seven files sharing `testadmin` had done.
  //
  // THE PRECONDITION IS ASSERTED, NOT ASSUMED, and that line is the point of it. It is also this
  // file's ONE remaining dependency on the harness, named here rather than left to be discovered:
  // `usersStore.js` reads RA_USERS_DB ONCE, at import, so the per-file store only reaches this test
  // while vitest gives each file its own module registry (`isolate`, on by default). Under
  // `--no-isolate` the first file to import the store fixes the path for the whole worker and these
  // two go red — on the assertion below, naming the cause ("expected 7 to be 1"), where before the
  // fix they went red on the symptom ("expected 200 to be 409") together with seven others.
  it('admin DELETE last admin → 409', async () => {
    const listRes = await adminApi.get('/api/users');
    expect(listRes.body.filter((u) => u.role === 'admin')).toHaveLength(1);
    const res = await adminApi.delete(`/api/users/${adminApi.raUser.id}`);
    expect(res.status).toBe(409);
  });
});

// ── PUT /api/users/:id (C3b) ──────────────────────────────────────────────────

describe('PUT /api/users/:id', () => {
  let targetId;

  beforeAll(async () => {
    const res = await adminApi
      .post('/api/users')
      .send({ username: `put-target-${Date.now()}`, password: 'put-pass-123', role: 'operator' });
    targetId = res.body.id;
  });

  it('anonymous → 401', async () => {
    const res = await request(app).put(`/api/users/${targetId}`).send({ role: 'admin' });
    expect(res.status).toBe(401);
  });

  it('operator → 403', async () => {
    const res = await operatorApi.put(`/api/users/${targetId}`).send({ role: 'admin' });
    expect(res.status).toBe(403);
  });

  // TEST-ACCOUNTS-1: the sole-admin precondition is ASSERTED rather than assumed. It used to be a
  // comment ("testadmin is sole admin"), and it was false whenever sessionInvalidation.test.js had
  // run first in the same worker — that file creates three admins and promotes a fourth.
  it('admin demote last admin → 409 (this file has one admin; no state change)', async () => {
    const listRes = await adminApi.get('/api/users');
    expect(listRes.body.filter((u) => u.role === 'admin')).toHaveLength(1);
    const res = await adminApi.put(`/api/users/${adminApi.raUser.id}`).send({ role: 'operator' });
    expect(res.status).toBe(409);
  });

  it('admin role change → 200 with updated role (no passwordHash, no sessionEpoch)', async () => {
    // Promote put-target to admin; now this file's admin + put-target = 2 admins
    const res = await adminApi.put(`/api/users/${targetId}`).send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('sessionEpoch');
  });

  it('admin invalid role → 400', async () => {
    const res = await adminApi.put(`/api/users/${targetId}`).send({ role: 'superuser' });
    expect(res.status).toBe(400);
  });

  it('admin empty body (no role, no password) → 400', async () => {
    const res = await adminApi.put(`/api/users/${targetId}`).send({});
    expect(res.status).toBe(400);
  });

  it('unknown id → 404', async () => {
    const res = await adminApi
      .put('/api/users/00000000-0000-0000-0000-000000000000')
      .send({ role: 'operator' });
    expect(res.status).toBe(404);
  });
});

// ── Session invalidation on password reset (Inv. 4) ──────────────────────────

describe('C3b — Session invalidation on password reset (Inv. 4)', () => {
  let victimId;
  let victimAgent;
  const victimCreds = {
    username: `victim-${Date.now()}`,
    password: 'victim-pass-123',
    role: 'operator',
  };

  beforeAll(async () => {
    // Create and log in as victim — victimAgent holds a session with old epoch
    const createRes = await adminApi.post('/api/users').send(victimCreds);
    victimId = createRes.body.id;
    victimAgent = request.agent(app);
    await victimAgent.post('/api/auth/login').send(victimCreds);
  });

  it('victim session is valid before password reset', async () => {
    const res = await victimAgent.get('/api/auth/me');
    expect(res.status).toBe(200);
  });

  it('admin resets victim password → 200 with no passwordHash', async () => {
    const res = await adminApi
      .put(`/api/users/${victimId}`)
      .send({ password: 'new-victim-pass-456!' });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('old victim session → 401 after password reset (Inv. 4)', async () => {
    const res = await victimAgent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('collateral: operator session unaffected by victim password reset', async () => {
    const res = await operatorApi.get('/api/auth/me');
    expect(res.status).toBe(200);
  });

  it('collateral: admin session unaffected by victim password reset', async () => {
    const res = await adminApi.get('/api/auth/me');
    expect(res.status).toBe(200);
  });
});
