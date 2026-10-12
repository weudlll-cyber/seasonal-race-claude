// ============================================================
// File:        health.test.js
// Path:        server/src/health.test.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A10-05)
// Description: `GET /api/health` — the healthy answer exactly as before, and NOT OK (503) when the
//              account store cannot be read.
// ============================================================

import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { createApp } from './app.js';
import { createHealthHandler } from './health.js';
import { createUsersStore } from './auth/usersStore.js';

const dirs = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** An app with only the health route, over a users file this test controls. */
function healthAppWith(usersFileContent) {
  const dir = mkdtempSync(join(os.tmpdir(), 'ra-health-'));
  dirs.push(dir);
  const usersPath = join(dir, 'users.json');
  if (usersFileContent !== undefined) writeFileSync(usersPath, usersFileContent);
  const app = express();
  app.get('/api/health', createHealthHandler({ usersStore: createUsersStore(usersPath) }));
  return { app, dir };
}

describe('GET /api/health — healthy', () => {
  it('through the real app, unauthenticated: 200 and exactly { status, timestamp, build }', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(['status', 'timestamp', 'build']);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('a fresh install with no users.json yet is healthy', async () => {
    const { app } = healthAppWith(undefined);
    const res = await request(app).get('/api/health');
    expect([res.status, res.body.status]).toEqual([200, 'ok']);
  });

  it('a readable users.json is healthy', async () => {
    const { app } = healthAppWith('[]');
    const res = await request(app).get('/api/health');
    expect([res.status, res.body.status]).toEqual([200, 'ok']);
  });
});

describe('GET /api/health — the account store cannot be read (A10-05)', () => {
  it.each([
    ['not JSON', '{"broken'],
    ['JSON but not a list', '{"users": []}'],
  ])('users.json %s → 503, status "error", the problem named, no file path', async (_, content) => {
    const { app, dir } = healthAppWith(content);
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.build).toBeDefined();
    expect(res.body.problems).toEqual([
      {
        store: 'users',
        code: 'USERS_STORE_CORRUPT',
        message: 'the account store (users.json) cannot be read, so nobody can sign in',
      },
    ]);
    expect(JSON.stringify(res.body)).not.toContain(dir);
  });
});
