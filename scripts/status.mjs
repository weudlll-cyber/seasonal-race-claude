// ============================================================
// File:        status.mjs
// Path:        scripts/status.mjs
// Project:     RaceArena — RELEASE-BASICS-1 (b)
// Created:     2026-10-01
// Description: ONE command an operator runs, or schedules, to ask "is this install healthy?".
//              Four checks, one line each, and an exit code a scheduler can alert on:
//
//                1. the API answers on its health route        GET <url>/api/health → 200, status ok
//                2. free disk space at the data directory      at least --min-free-mb
//                3. the data directory is writable             a probe file is created and removed
//                4. the newest backup is recent enough         at most --max-backup-age-hours old
//
//              Exit 0 = every check passed · 1 = at least one FAILED · 2 = the command was misused.
//
// ── ★ WHAT IS REUSED RATHER THAN REBUILT ───────────────────────────────────────────────────────
//   · `server/src/dataPaths.js` `resolveDataRoot()` — THE data-root resolver, as `backup.mjs` uses
//     it, so status checks the directory the server writes and not a second guess at it.
//   · `scripts/backup.mjs` `archiveTakenAt()` — the archive NAME is the backup's timestamp, and the
//     format lives in that file only. Ages come from the name, not from mtimes, because copying an
//     archive to another disk resets its mtime and would make a stale backup look fresh.
//   · `RA_BACKUP_DIR` — the same setting `npm run backup` writes into, so one value schedules both.
//   · `GET /api/health` — the existing public route (`server/src/auth/guards.js:14`); nothing new
//     is added to the server for this.
//
// ── WHY THE WRITABLE CHECK WRITES ──────────────────────────────────────────────────────────────
// Permissions, a read-only remount and a full quota all fail the same way: only at write time.
// `accessSync(W_OK)` answers from mode bits and is wrong on the cases that matter (ACLs, a
// read-only filesystem on some platforms). So a uniquely named probe file is written and removed
// immediately. Its name ends in neither `.tmp` nor a store's name, so nothing in the server reads
// it, and `sweepOrphanTmp` at boot is not involved.
//
// ── WHY NO BACKUP DIRECTORY IS A FAILURE, NOT A SKIP ───────────────────────────────────────────
// A status run with no backup directory configured cannot say the install is backed up. A green
// line there would be the silent pass this command exists to prevent, so it FAILS and says how to
// configure it.
//
// ── USAGE ──────────────────────────────────────────────────────────────────────────────────────
//   npm run status                                   # all defaults, backups from $RA_BACKUP_DIR
//   npm run status -- --url http://127.0.0.1:4000 --backups /var/backups/racearena
//                     --min-free-mb 1024 --max-backup-age-hours 26
// Defaults: --url from RA_BIND_ADDRESS/PORT (127.0.0.1 when listening on every interface),
//           --min-free-mb 1024, --max-backup-age-hours 26 (a daily backup plus two hours' slack).
// ============================================================

import { statfsSync, readdirSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const { archiveTakenAt } = await import(pathToFileURL(join(HERE, 'backup.mjs')).href);

export const DEFAULTS = { minFreeMb: 1024, maxBackupAgeHours: 26, healthTimeoutMs: 5000 };

/** The URL the API should answer on, from the same settings the server reads. A wildcard or unset
 *  bind address means "every interface", and loopback is one of them. */
export function defaultUrl(env = process.env) {
  const port = env.PORT || 4000;
  const addr = (env.RA_BIND_ADDRESS || '').trim();
  const host = !addr || addr === '0.0.0.0' || addr === '::' ? '127.0.0.1' : addr.includes(':') ? `[${addr}]` : addr;
  return `http://${host}:${port}`;
}

const ok = (name, detail) => ({ name, ok: true, detail });
const fail = (name, detail) => ({ name, ok: false, detail });

export async function checkHealth(url, timeoutMs = DEFAULTS.healthTimeoutMs) {
  const target = `${url.replace(/\/+$/, '')}/api/health`;
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.status !== 200) return fail('api', `${target} answered HTTP ${res.status}`);
    const body = await res.json().catch(() => null);
    if (body?.status !== 'ok') return fail('api', `${target} answered 200 without status "ok"`);
    return ok('api', `${target} answered ok`);
  } catch (e) {
    return fail('api', `${target} did not answer: ${e.cause?.code ?? e.name ?? e.message}`);
  }
}

export function checkDisk(dataRoot, minFreeMb = DEFAULTS.minFreeMb) {
  try {
    const s = statfsSync(dataRoot);
    const freeMb = Math.floor((Number(s.bavail) * Number(s.bsize)) / (1024 * 1024));
    return freeMb >= minFreeMb
      ? ok('disk', `${freeMb} MB free at ${dataRoot} (minimum ${minFreeMb})`)
      : fail('disk', `only ${freeMb} MB free at ${dataRoot} (minimum ${minFreeMb})`);
  } catch (e) {
    return fail('disk', `cannot read free space at ${dataRoot}: ${e.code ?? e.message}`);
  }
}

export function checkWritable(dataRoot) {
  if (!existsSync(dataRoot) || !statSync(dataRoot).isDirectory())
    return fail('writable', `data directory does not exist: ${dataRoot}`);
  const probe = join(dataRoot, `.ra-status-probe-${process.pid}-${Date.now()}`);
  try {
    writeFileSync(probe, 'probe');
    return ok('writable', `${dataRoot} is writable`);
  } catch (e) {
    return fail('writable', `cannot write into ${dataRoot}: ${e.code ?? e.message}`);
  } finally {
    rmSync(probe, { force: true });
  }
}

export function checkBackup(backupsDir, maxAgeHours = DEFAULTS.maxBackupAgeHours, now = new Date()) {
  if (!backupsDir)
    return fail('backup', 'no backup directory given — pass --backups <dir> or set RA_BACKUP_DIR');
  let names;
  try {
    names = readdirSync(backupsDir);
  } catch (e) {
    return fail('backup', `cannot read backup directory ${backupsDir}: ${e.code ?? e.message}`);
  }
  const taken = names.map(archiveTakenAt).filter(Boolean).sort((a, b) => b - a);
  if (!taken.length) return fail('backup', `no racearena-backup-*.tar in ${backupsDir}`);
  const ageHours = (now - taken[0]) / 3_600_000;
  const shown = `${ageHours.toFixed(1)} h old (${taken[0].toISOString()})`;
  return ageHours <= maxAgeHours
    ? ok('backup', `newest backup is ${shown}, maximum ${maxAgeHours} h`)
    : fail('backup', `newest backup is ${shown}, older than the maximum ${maxAgeHours} h`);
}

/** All four checks. Exported so the tests drive it without a process. */
export async function runStatus({ url, dataRoot, backupsDir, minFreeMb, maxBackupAgeHours, now }) {
  return [
    await checkHealth(url),
    checkDisk(dataRoot, minFreeMb),
    checkWritable(dataRoot),
    checkBackup(backupsDir, maxBackupAgeHours, now),
  ];
}

// ── CLI ────────────────────────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(HERE, 'status.mjs');
if (isMain) {
  const arg = (k) => {
    const i = process.argv.indexOf(`--${k}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const num = (k, d) => {
    const v = arg(k);
    if (v === undefined) return d;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) {
      console.error(`--${k} must be a non-negative number, got ${JSON.stringify(v)}`);
      process.exit(2);
    }
    return n;
  };
  const { resolveDataRoot } = await import(pathToFileURL(join(ROOT, 'server/src/dataPaths.js')).href);
  const checks = await runStatus({
    url: arg('url') ?? defaultUrl(),
    dataRoot: resolveDataRoot(),
    backupsDir: arg('backups') ?? process.env.RA_BACKUP_DIR,
    minFreeMb: num('min-free-mb', DEFAULTS.minFreeMb),
    maxBackupAgeHours: num('max-backup-age-hours', DEFAULTS.maxBackupAgeHours),
    now: new Date(),
  });
  for (const c of checks) console.log(`${c.ok ? 'OK  ' : 'FAIL'}  ${c.name.padEnd(8)} ${c.detail}`);
  const failed = checks.filter((c) => !c.ok).length;
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
  // ★ exitCode, NEVER process.exit() here. The literal install run (RELEASE-BASICS-1) printed "all
  // checks passed" and then died in libuv — `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`,
  // src\win\async.c — exiting 127: a forced exit while the health check's fetch socket was still
  // closing. A scheduler reads 127 as a failure. Setting the code and letting the event loop drain
  // ends the process cleanly once that socket closes.
  process.exitCode = failed ? 1 : 0;
}
