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
//                4. the newest backup is recent enough         at most --max-backup-age-hours old,
//                   and intact                                 its .sha256 present and matching (TIDY-C-1)
//
//              Exit 0 = every check passed · 1 = at least one FAILED · 2 = the command was misused.
//
// ── ★ WHAT IS REUSED RATHER THAN REBUILT ───────────────────────────────────────────────────────
//   · `server/src/dataPaths.js` `resolveDataRoot()` — THE data-root resolver, as `backup.mjs` uses
//     it, so status checks the directory the server writes and not a second guess at it.
//   · `shared/statusChecks.mjs` — checks 2, 3 and 4 (AUDIT-1 D2). They lived in this file until the
//     admin status box on the Dev Screen needed the same logic; the server image has no `scripts/`,
//     so they moved to `shared/` and BOTH callers import them. They are re-exported below, so this
//     file's exports and its output are unchanged. The reasons each check works the way it does
//     (why the writable check writes, why no backup directory FAILS) moved with them.
//   · `shared/backupArchive.mjs` (through statusChecks) — the archive NAME is the backup's
//     timestamp, and its checksum file's name and format live there; ages come from the name, not
//     from mtimes, because copying an archive to another disk resets its mtime. `scripts/backup.mjs`
//     writes with the same module.
//   · `RA_BACKUP_DIR` — the same setting `npm run backup` writes into, so one value schedules both.
//   · `GET /api/health` — the existing public route (`server/src/auth/guards.js:14`); nothing new
//     is added to the server for this.
//
// ── USAGE ──────────────────────────────────────────────────────────────────────────────────────
//   npm run status                                   # all defaults, backups from $RA_BACKUP_DIR
//   npm run status -- --url http://127.0.0.1:4000 --backups /var/backups/racearena
//                     --min-free-mb 1024 --max-backup-age-hours 26
// Defaults: --url from RA_BIND_ADDRESS/PORT (127.0.0.1 when listening on every interface),
//           --min-free-mb 1024, --max-backup-age-hours 26 (a daily backup plus two hours' slack).
// ============================================================

import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { DEFAULTS, ok, fail, checkDisk, checkWritable, checkBackup } from '../shared/statusChecks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

export { DEFAULTS, checkDisk, checkWritable, checkBackup };

/** The URL the API should answer on, from the same settings the server reads. A wildcard or unset
 *  bind address means "every interface", and loopback is one of them. */
export function defaultUrl(env = process.env) {
  const port = env.PORT || 4000;
  const addr = (env.RA_BIND_ADDRESS || '').trim();
  const host = !addr || addr === '0.0.0.0' || addr === '::' ? '127.0.0.1' : addr.includes(':') ? `[${addr}]` : addr;
  return `http://${host}:${port}`;
}

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
