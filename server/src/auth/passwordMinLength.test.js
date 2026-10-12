// ============================================================
// File:        passwordMinLength.test.js
// Path:        server/src/auth/passwordMinLength.test.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A5M-15)
// Description: The new-password rule (`PASSWORD_MIN_LENGTH`, usersStore.js) on all four routes that
//              set a password — first-admin setup, an admin creating a user, an admin resetting
//              one, a user changing their own — and the half that must NOT happen: a shorter
//              password stored before the rule still signs in.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { existsSync, rmSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import defaultStore, {
  createUsersStore,
  assertNewPassword,
  PASSWORD_MIN_LENGTH,
} from './usersStore.js';
import { createAuthRouter } from './authRouter.js';
import { adminAgent, operatorAgent } from '../../test/authAgent.js';

// bcrypt at cost 12, several hashes per test — the same budget changePassword.test.js states.
vi.setConfig({ testTimeout: 30_000 });

const SHORT = 'nine-char'; // 9 characters
const LONG_ENOUGH = 'ten-chars!'; // 10 characters
const REFUSAL = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;

describe('assertNewPassword — the rule itself', () => {
  it('is ten characters, decided 2026-10-12', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
  });
  it('refuses nine characters with the plain-English message, accepts ten', () => {
    expect(() => assertNewPassword(SHORT)).toThrow(REFUSAL);
    expect(() => assertNewPassword(SHORT)).toThrow(
      expect.objectContaining({ code: 'INVALID_PASSWORD' })
    );
    expect(() => assertNewPassword(LONG_ENOUGH)).not.toThrow();
  });
  it('still refuses a blank password as empty, whatever its length', () => {
    expect(() => assertNewPassword(' '.repeat(12))).toThrow('Password must not be empty');
  });
  it('counts characters, not UTF-16 units — ten emoji are ten characters', () => {
    expect(() => assertNewPassword('😀'.repeat(10))).not.toThrow();
    expect(() => assertNewPassword('😀'.repeat(9))).toThrow(REFUSAL);
  });
});

describe('the admin routes — POST /api/users and PUT /api/users/:id', () => {
  const app = createApp();

  it('creating a user with a short password → 400 naming the rule, and no user is created', async () => {
    const admin = await adminAgent(app);
    const username = `pwrule-${randomUUID().slice(0, 8)}`;
    const res = await admin
      .post('/api/users')
      .send({ username, password: 'abc', role: 'operator', team: admin.raUser.team });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(REFUSAL);
    expect(defaultStore.findAuthRecordByUsername(username)).toBeNull();
  });

  it('an admin reset to a short password → 400, and the old password still works', async () => {
    const admin = await adminAgent(app);
    const op = await operatorAgent(app);
    const res = await admin.put(`/api/users/${op.raUser.id}`).send({ password: SHORT });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(REFUSAL);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: op.raUser.username, password: op.raUser.password });
    expect(login.status).toBe(200);
  });

  it('changing your own password to a short one → 400 naming the rule', async () => {
    const op = await operatorAgent(app);
    const res = await op
      .post('/api/auth/change-password')
      .send({ currentPassword: op.raUser.password, newPassword: SHORT });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(REFUSAL);
  });

  it('ten characters is accepted on the same route', async () => {
    const op = await operatorAgent(app);
    const res = await op
      .post('/api/auth/change-password')
      .send({ currentPassword: op.raUser.password, newPassword: LONG_ENOUGH });
    expect(res.status).toBe(200);
  });
});

describe('first-admin setup and sign-in, on a store of its own', () => {
  let dir, usersPath, markerPath, app;

  beforeEach(() => {
    dir = mkdtempSync(join(os.tmpdir(), 'pwrule-'));
    usersPath = join(dir, 'users.json');
    markerPath = join(dir, 'setup-complete.json');
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
    app.use(
      '/api/auth',
      createAuthRouter({
        store: createUsersStore(usersPath),
        setupMarkerPath: markerPath,
        getBootstrapToken: () => 'TEST-TOKEN',
      })
    );
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('setup with a short password → 400 naming the rule; no admin, no marker', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .set('x-bootstrap-token', 'TEST-TOKEN')
      .send({ username: 'admin', password: SHORT });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(REFUSAL);
    expect(existsSync(markerPath)).toBe(false);
    expect(createUsersStore(usersPath).countUsers()).toBe(0);
  });

  it('a password stored BEFORE the rule still signs in — the rule is never applied at sign-in', async () => {
    writeFileSync(
      usersPath,
      JSON.stringify([
        {
          id: randomUUID(),
          username: 'veteran',
          usernameNormalized: 'veteran',
          passwordHash: await bcrypt.hash('old', 12),
          role: 'admin',
          team: 'Seasonal Entertainment',
          teamNormalized: 'seasonal entertainment',
          sessionEpoch: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          createdBy: 'setup',
        },
      ])
    );
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'veteran', password: 'old' });
    expect(res.status).toBe(200);
  });
});
