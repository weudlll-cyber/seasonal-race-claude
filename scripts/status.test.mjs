// ============================================================
// File:        status.test.mjs
// Path:        scripts/status.test.mjs
// Project:     RaceArena — RELEASE-BASICS-1 (b)
// Description: Each of the four checks passes on a healthy fixture and FAILS on its own fault, and
//              the command's exit code follows, because the exit code is what a scheduler reads.
//
// Every test runs against a scratch data directory, a scratch backup directory and a throwaway
// HTTP server on a random loopback port. Nothing here touches a real data root or a real server.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { exec } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const { runStatus, checkHealth, checkDisk, checkWritable, checkBackup, defaultUrl } = await import(
  pathToFileURL(join(HERE, 'status.mjs')).href
);
const { archiveName, checksumPath, checksumLine } = await import(pathToFileURL(join(HERE, 'backup.mjs')).href);

const NOW = new Date('2026-10-01T12:00:00Z');
const hoursAgo = (h, from = NOW) => new Date(from.getTime() - h * 3_600_000);

function fixture({ backupAgeHours = 1, from = NOW } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ra-status-test-'));
  const data = join(dir, 'data');
  const backups = join(dir, 'backups');
  mkdirSync(data);
  mkdirSync(backups);
  let archive = null;
  if (backupAgeHours !== null) {
    archive = join(backups, archiveName(hoursAgo(backupAgeHours, from)));
    writeFileSync(archive, '');
    // TIDY-C-1: an intact archive has its checksum file, written by the same helper `backup.mjs` uses.
    writeFileSync(checksumPath(archive), checksumLine(Buffer.alloc(0), basename(archive)));
  }
  return { dir, data, backups, archive, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** A stand-in API: answers /api/health the way the real route does, or with `status`. */
function fakeApi(status = 200, body = { status: 'ok' }) {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      res.writeHead(req.url === '/api/health' ? status : 404, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    });
    srv.listen(0, '127.0.0.1', () =>
      resolve({ url: `http://127.0.0.1:${srv.address().port}`, close: () => new Promise((r) => srv.close(r)) })
    );
  });
}

test('HEALTHY: all four checks pass', async () => {
  const f = fixture();
  const api = await fakeApi();
  try {
    const checks = await runStatus({ url: api.url, dataRoot: f.data, backupsDir: f.backups, minFreeMb: 1, maxBackupAgeHours: 26, now: NOW });
    assert.deepEqual(checks.map((c) => [c.name, c.ok]), [['api', true], ['disk', true], ['writable', true], ['backup', true]]);
    assert.deepEqual(readdirSync(f.data), [], 'the writable probe must leave nothing behind');
  } finally {
    await api.close();
    f.cleanup();
  }
});

test('api FAILS when nothing answers, and when the route answers wrongly', async () => {
  const api = await fakeApi();
  const url = api.url;
  await api.close();
  assert.equal((await checkHealth(url, 2000)).ok, false, 'a closed port must fail');
  const bad = await fakeApi(503);
  const wrong = await fakeApi(200, { status: 'degraded' });
  try {
    assert.equal((await checkHealth(bad.url)).ok, false, 'HTTP 503 must fail');
    assert.equal((await checkHealth(wrong.url)).ok, false, '200 without status ok must fail');
  } finally {
    await bad.close();
    await wrong.close();
  }
});

test('disk FAILS below the minimum', () => {
  const f = fixture();
  try {
    assert.equal(checkDisk(f.data, 1).ok, true);
    assert.equal(checkDisk(f.data, Number.MAX_SAFE_INTEGER).ok, false);
  } finally {
    f.cleanup();
  }
});

test('writable FAILS when the data directory is missing', () => {
  const f = fixture();
  try {
    assert.equal(checkWritable(join(f.dir, 'nope')).ok, false);
  } finally {
    f.cleanup();
  }
});

test('backup FAILS when too old, when none exists, and when no directory is configured', () => {
  const old = fixture({ backupAgeHours: 30 });
  const none = fixture({ backupAgeHours: null });
  try {
    assert.equal(checkBackup(old.backups, 26, NOW).ok, false, '30 h old against a 26 h maximum');
    assert.equal(checkBackup(old.backups, 48, NOW).ok, true, 'the maximum is the argument, not a constant');
    assert.equal(checkBackup(none.backups, 26, NOW).ok, false, 'an empty directory');
    assert.equal(checkBackup(undefined, 26, NOW).ok, false, 'not configured is not a pass');
  } finally {
    old.cleanup();
    none.cleanup();
  }
});

test('backup FAILS when the newest archive has no checksum file, or no longer matches it (TIDY-C-1)', () => {
  const f = fixture();
  try {
    assert.equal(checkBackup(f.backups, 26, NOW).ok, true, 'intact: recent and matching');
    writeFileSync(f.archive, 'changed after it was written');
    const changed = checkBackup(f.backups, 26, NOW);
    assert.equal(changed.ok, false, 'a changed archive must fail');
    assert.match(changed.detail, /MISMATCH/);
    rmSync(checksumPath(f.archive));
    const missing = checkBackup(f.backups, 26, NOW);
    assert.equal(missing.ok, false, 'a missing checksum file must fail');
    assert.match(missing.detail, /no checksum file/);
  } finally {
    f.cleanup();
  }
});

test('the newest backup is judged by its NAME, not by the file’s modification time', () => {
  const f = fixture({ backupAgeHours: 40 }); // written just now, so its mtime is fresh
  try {
    assert.equal(checkBackup(f.backups, 26, NOW).ok, false);
  } finally {
    f.cleanup();
  }
});

test('defaultUrl follows RA_BIND_ADDRESS and PORT', () => {
  assert.equal(defaultUrl({}), 'http://127.0.0.1:4000');
  assert.equal(defaultUrl({ PORT: '4100', RA_BIND_ADDRESS: '0.0.0.0' }), 'http://127.0.0.1:4100');
  assert.equal(defaultUrl({ RA_BIND_ADDRESS: '10.0.0.5' }), 'http://10.0.0.5:4000');
  assert.equal(defaultUrl({ RA_BIND_ADDRESS: '::1' }), 'http://[::1]:4000');
});

// ── the exit code, through the command itself — this is what the scheduler sees ────────────────
// ASYNC on purpose: the stand-in API lives in this process, and a synchronous spawn would block
// the event loop it needs to answer on.
const npmStatus = (env, args = '') =>
  new Promise((resolve) => {
    exec(`npm run --silent status -- ${args}`, { cwd: join(HERE, '..'), env: { ...process.env, ...env } }, (err, stdout, stderr) =>
      resolve({ status: err ? err.code : 0, stdout, stderr })
    );
  });

test('`npm run status` exits 0 when healthy and 1 when a check fails', async () => {
  const f = fixture({ from: new Date() }); // the command judges against the real clock
  const api = await fakeApi();
  try {
    const env = { RA_DATA_DIR: f.data, RA_BACKUP_DIR: f.backups };
    const good = await npmStatus(env, `--url ${api.url} --min-free-mb 1`);
    assert.equal(good.status, 0, good.stdout + good.stderr);
    assert.match(good.stdout, /all checks passed/);
    const bad = await npmStatus(env, `--url ${api.url} --min-free-mb 1 --max-backup-age-hours 0`);
    assert.equal(bad.status, 1, bad.stdout + bad.stderr);
    assert.match(bad.stdout, /FAIL\s+backup/);
  } finally {
    await api.close();
    f.cleanup();
  }
});

test('`npm run status` exits 2 on a malformed number', async () => {
  const r = await npmStatus({}, '--min-free-mb lots');
  assert.equal(r.status, 2, r.stdout + r.stderr);
});
