// ============================================================
// File:        settings.test.js
// Path:        server/src/routes/settings.test.js
// Project:     RaceArena — TEST-AIDS-1
// Description: The test-aids switch on the server: OFF when nothing was ever stored and when the
//              stored file is damaged, readable by any signed-in user, and only ever a boolean. That
//              setting it is ADMIN-ONLY is pinned in `auth/routePolicyDrift.test.js` with its sibling,
//              the points rule.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { createSettingsRouter } from './settings.js';
import { createTestAidsStore, DEFAULT_TEST_AIDS } from '../settings/testAids.js';

let filePath;
let testAids;
beforeEach(() => {
  filePath = join(os.tmpdir(), `racearena-test-aids-${randomUUID()}.json`);
  testAids = createTestAidsStore(filePath);
});
afterEach(() => {
  if (existsSync(filePath)) unlinkSync(filePath);
  vi.restoreAllMocks();
});

function appAs(role) {
  const a = express();
  a.use(express.json());
  a.use('/api/settings', (req, _res, next) => {
    req.authUser = { username: 'u', role, team: 'T' };
    next();
  });
  a.use('/api/settings', createSettingsRouter({ testAids }));
  return a;
}

describe('the test-aids switch ships OFF', () => {
  it('a fresh installation — no file at all — reads OFF', async () => {
    expect(existsSync(filePath)).toBe(false);
    const res = await request(appAs('operator')).get('/api/settings/test-aids');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: false });
    expect(DEFAULT_TEST_AIDS.enabled).toBe(false);
  });

  it('a damaged file reads OFF, and says so once in the log', async () => {
    writeFileSync(filePath, '{ "enabled": tru');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await request(appAs('operator')).get('/api/settings/test-aids');
    expect(res.body).toEqual({ enabled: false });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/is not a valid test-aids setting; the default is used/);
  });

  it('a file holding something other than a boolean reads OFF', async () => {
    writeFileSync(filePath, JSON.stringify({ enabled: 'yes' }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(testAids.get()).toEqual({ enabled: false });
  });
});

describe('setting and reading it', () => {
  it('a stored ON is what every signed-in user then reads', async () => {
    const put = await request(appAs('admin'))
      .put('/api/settings/test-aids')
      .send({ enabled: true });
    expect(put.status).toBe(200);
    expect(put.body).toEqual({ enabled: true });
    const got = await request(appAs('operator')).get('/api/settings/test-aids');
    expect(got.body).toEqual({ enabled: true });
  });

  it('anything but { enabled: <boolean> } is refused, and the stored value stays', async () => {
    testAids.set({ enabled: true });
    for (const body of [{}, { enabled: 1 }, { enabled: 'false' }, []]) {
      const res = await request(appAs('admin')).put('/api/settings/test-aids').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/test-aids switch/);
    }
    expect(testAids.get()).toEqual({ enabled: true });
  });
});
