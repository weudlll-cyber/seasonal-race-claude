// ============================================================
// File:        caseBypass.integration.test.js
// Path:        server/src/auth/caseBypass.integration.test.js
// Project:     RaceArena — AUDIT-1 A5M-01 (2026-10-09)
// Description: A path's LETTER CASE never gets around the sign-in, admin or CSRF guards.
//
// Express routes paths ignoring case (`/API/users` reaches the users router); the guards compared
// them case-sensitively, so before the fix an anonymous `POST /API/users` created an admin. Every
// variant below must be refused exactly as its lower-case form is.
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { adminAgent, operatorAgent } from '../../test/authAgent.js';
import { isApiPath } from '../../utils/apiPath.js';

const app = createApp();
let adminApi;
let operatorApi;

beforeAll(async () => {
  // Sequential — the file-based store is not concurrent-safe (read-modify-write).
  adminApi = await adminAgent(app);
  operatorApi = await operatorAgent(app);
});

const NEW_ADMIN = {
  username: 'case-bypass-admin',
  password: 'x'.repeat(16),
  role: 'admin',
  team: 'Case',
  allowNewTeam: true,
};

describe('anonymous: no letter case reaches a guarded route', () => {
  const variants = [
    ['get', '/API/users'],
    ['get', '/Api/users'],
    ['get', '/api/Users'],
    ['get', '/API/tracks'],
    ['get', '/API/races'],
    ['get', '/API/settings/test-aids'],
  ];
  for (const [method, path] of variants) {
    it(`${method.toUpperCase()} ${path} → 401`, async () => {
      const res = await request(app)[method](path).set('Accept', 'application/json');
      expect(res.status).toBe(401);
    });
  }

  it('POST /API/users → 401, and no account is created', async () => {
    const res = await request(app).post('/API/users').send(NEW_ADMIN);
    expect(res.status).toBe(401);
    const users = await adminApi.get('/api/users');
    expect(users.body.map((u) => u.username)).not.toContain(NEW_ADMIN.username);
  });
});

describe('operator: no letter case reaches an admin-only route', () => {
  it('GET /api/USERS → 403', async () => {
    expect((await operatorApi.get('/api/USERS')).status).toBe(403);
  });
  it('POST /api/Users → 403', async () => {
    expect((await operatorApi.post('/api/Users').send(NEW_ADMIN)).status).toBe(403);
  });
  it('PUT /api/Settings/test-aids → 403', async () => {
    expect((await operatorApi.put('/api/Settings/test-aids').send({ enabled: true })).status).toBe(
      403
    );
  });
  it('the lower-case route still answers an operator as before (GET /api/tracks → 200)', async () => {
    expect((await operatorApi.get('/api/tracks')).status).toBe(200);
  });
});

describe('isApiPath', () => {
  it('is true for /api and anything under it, in any case', () => {
    for (const p of ['/api', '/api/', '/API', '/Api/users', '/aPi/races/X/verify'])
      expect(isApiPath(p)).toBe(true);
  });
  it('is false for the app and for look-alikes', () => {
    for (const p of ['/', '/setup', '/apix', '/apiary/x', '/assets/api.js'])
      expect(isApiPath(p)).toBe(false);
  });
});
