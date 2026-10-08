// ============================================================
// File:        adminStatus.test.js
// Path:        server/src/routes/adminStatus.test.js
// Project:     RaceArena — AUDIT-1 D2 (the admin status box)
// Description: GET /api/admin/status. Against the REAL app: anonymous 401, operator 403, admin 200
//              (the global `fetch` is stubbed, so the default release check never reaches GitHub).
//              Against the router with injected dependencies: the build is /api/health's, the
//              backup line says "not visible" when no directory is configured or readable, the
//              status is the shared checks of `npm run status`, and `newer` is only stated when known.
// ============================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { createApp } from '../app.js';
import { adminAgent, operatorAgent } from '../../test/authAgent.js';
import { createAdminStatusRouter } from './adminStatus.js';
import { buildIdentity } from '../buildIdentity.js';
import * as shared from '../../../shared/statusChecks.mjs';
import { archiveName, checksumLine } from '../../../shared/backupArchive.mjs';

// ── The route is admin-only — the real app, the real guards ─────────────────────────────────────
describe('GET /api/admin/status — who may read it', () => {
  const app = createApp();
  let adminApi;
  let operatorApi;

  beforeAll(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 200, json: async () => [] }))
    );
    adminApi = await adminAgent(app);
    operatorApi = await operatorAgent(app);
  });
  afterAll(() => vi.unstubAllGlobals());

  it('anonymous → 401', async () => {
    expect((await request(app).get('/api/admin/status')).status).toBe(401);
  });

  it('operator → 403', async () => {
    expect((await operatorApi.get('/api/admin/status')).status).toBe(403);
  });

  it('admin → 200, with the four parts', async () => {
    const res = await adminApi.get('/api/admin/status');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['backup', 'build', 'release', 'status']);
  });
});

// ── What it answers — the router alone, everything injected ─────────────────────────────────────
let dataDir;
let backupsDir;
const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);
const releaseOk = (newest) => async () => ({ newest, checkedAt: 'T', state: 'ok' });

function appWith(deps) {
  const a = express();
  a.use('/api/admin', createAdminStatusRouter({ now: () => NOW, ...deps }));
  return a;
}
const get = async (deps) => (await request(appWith(deps)).get('/api/admin/status')).body;

beforeEach(() => {
  dataDir = mkdtempSync(join(os.tmpdir(), 'ra-admin-status-data-'));
  backupsDir = mkdtempSync(join(os.tmpdir(), 'ra-admin-status-bk-'));
  return () => {
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(backupsDir, { recursive: true, force: true });
  };
});

function writeBackup(at) {
  const name = archiveName(new Date(at));
  writeFileSync(join(backupsDir, name), 'archive');
  writeFileSync(join(backupsDir, `${name}.sha256`), checksumLine(Buffer.from('archive'), name));
  return name;
}

describe('GET /api/admin/status — what it answers', () => {
  it('the build is exactly what /api/health reports', async () => {
    const env = { RA_DATA_DIR: dataDir, RA_BUILD_COMMIT: 'abc1234', RA_BUILD_BRANCH: 'master' };
    const body = await get({ env, checkRelease: releaseOk(null) });
    expect(body.build).toEqual(buildIdentity(env));
  });

  it('backup is NOT VISIBLE when no directory is configured — and its check is not run', async () => {
    const body = await get({ env: { RA_DATA_DIR: dataDir }, checkRelease: releaseOk(null) });
    expect(body.backup).toEqual({ visible: false, newest: null });
    expect(body.status.checks.map((c) => c.name)).toEqual(['disk', 'writable']);
  });

  it('backup is NOT VISIBLE when the configured directory cannot be read', async () => {
    const env = { RA_DATA_DIR: dataDir, RA_BACKUP_DIR: join(backupsDir, 'missing') };
    const body = await get({ env, checkRelease: releaseOk(null) });
    expect(body.backup).toEqual({ visible: false, newest: null });
  });

  it('a visible directory gives the newest backup, and the backup check joins the status', async () => {
    writeBackup(NOW - 30 * 3_600_000);
    writeBackup(NOW - 2 * 3_600_000);
    const env = { RA_DATA_DIR: dataDir, RA_BACKUP_DIR: backupsDir };
    const body = await get({ env, checkRelease: releaseOk(null) });
    expect(body.backup).toEqual({
      visible: true,
      newest: new Date(NOW - 2 * 3_600_000).toISOString(),
    });
    expect(body.status.checks.map((c) => c.name)).toEqual(['disk', 'writable', 'backup']);
  });

  it('the status IS the shared checks npm run status runs, line for line', async () => {
    writeBackup(NOW - 3_600_000);
    const env = { RA_DATA_DIR: dataDir, RA_BACKUP_DIR: backupsDir };
    const body = await get({ env, checkRelease: releaseOk(null) });
    const backupLine = shared.checkBackup(
      backupsDir,
      shared.DEFAULTS.maxBackupAgeHours,
      new Date(NOW)
    );
    expect(body.status.checks[1]).toEqual(shared.checkWritable(dataDir));
    expect(body.status.checks[2]).toEqual(backupLine);
    expect(body.status.ok).toBe(body.status.checks.every((c) => c.ok));
  });

  it('a failing shared check makes the overall status not ok', async () => {
    const env = { RA_DATA_DIR: join(dataDir, 'gone'), RA_BACKUP_DIR: '' };
    const body = await get({ env, checkRelease: releaseOk(null) });
    expect(body.status.ok).toBe(false);
    expect(body.status.checks.find((c) => c.name === 'writable')).toMatchObject({ ok: false });
  });

  it('newer: true / false when this build is a release, null when it cannot compare', async () => {
    const asRelease = { RA_DATA_DIR: dataDir, RA_BUILD_COMMIT: 'abc', RA_BUILD_BRANCH: 'v1.2' };
    expect((await get({ env: asRelease, checkRelease: releaseOk('v1.10') })).release).toMatchObject(
      { newest: 'v1.10', current: 'v1.2', newer: true, state: 'ok' }
    );
    expect((await get({ env: asRelease, checkRelease: releaseOk('v1.2.0') })).release.newer).toBe(
      false
    );
    const onBranch = { RA_DATA_DIR: dataDir, RA_BUILD_COMMIT: 'abc', RA_BUILD_BRANCH: 'master' };
    expect((await get({ env: onBranch, checkRelease: releaseOk('v1.10') })).release).toMatchObject({
      newest: 'v1.10',
      current: null,
      newer: null,
    });
  });

  it('a release check that failed is unknown, and the route still answers 200', async () => {
    const checkRelease = async () => ({ newest: null, checkedAt: 'T', state: 'unknown' });
    const res = await request(appWith({ env: { RA_DATA_DIR: dataDir }, checkRelease })).get(
      '/api/admin/status'
    );
    expect(res.status).toBe(200);
    expect(res.body.release).toMatchObject({ state: 'unknown', newest: null, newer: null });
  });
});
