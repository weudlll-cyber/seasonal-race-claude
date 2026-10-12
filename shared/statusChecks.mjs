// ============================================================
// File:        statusChecks.mjs
// Path:        shared/statusChecks.mjs
// Project:     RaceArena — AUDIT-1 D2 (extracted from scripts/status.mjs, RELEASE-BASICS-1 (b))
// Description: The install's health checks that need no network: free disk space at the data
//              directory, whether the data directory is writable, and how old (and how intact) the
//              newest backup is. Each returns ONE line, `{ name, ok, detail }`, and never throws.
//
// ── TWO CALLERS, ONE LOGIC ─────────────────────────────────────────────────────────────────────
//   · `scripts/status.mjs` — `npm run status`, the command an operator runs or schedules. It adds
//     the fourth check (the API answering on `/api/health`), which only makes sense from OUTSIDE
//     the server, and re-exports these three so its own tests and callers are unchanged.
//   · `server/src/routes/adminStatus.js` — the admin-only status box on the Dev Screen. The server
//     asking itself over HTTP would prove nothing, so it runs these three only.
// They lived in `scripts/status.mjs` until the status box needed them; `scripts/` is not in the
// server image, so they moved here rather than being written a second time. Node builtins and
// `./backupArchive.mjs` only — both are copied into the image (server/Dockerfile, root .dockerignore).
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
// line there would be the silent pass this check exists to prevent, so `checkBackup` FAILS and says
// how to configure it. (The status box asks `newestBackup` first and shows "not visible from the
// app" instead of running a check it knows cannot see the backups — see adminStatus.js.)
// ============================================================

import { statfsSync, readdirSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { archiveTakenAt, verifyChecksum } from './backupArchive.mjs';

export const DEFAULTS = { minFreeMb: 1024, maxBackupAgeHours: 26, healthTimeoutMs: 5000 };

export const ok = (name, detail) => ({ name, ok: true, detail });
export const fail = (name, detail) => ({ name, ok: false, detail });

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

/**
 * Every backup archive in a directory, newest first, as `{ name, at }`. THROWS when the directory
 * cannot be read — the two callers below each say that in their own words.
 * The NAME is kept beside its instant so the newest archive's checksum can be checked (TIDY-C-1).
 */
function listBackups(backupsDir) {
  return readdirSync(backupsDir)
    .map((name) => ({ name, at: archiveTakenAt(name) }))
    .filter((t) => t.at)
    .sort((a, b) => b.at - a.at);
}

/**
 * Can backups be seen from here at all, and when was the newest one taken? For the status box,
 * which must tell "no backup exists" apart from "this process cannot see where backups go".
 * @returns {{ visible: boolean, newest: string|null }} `newest` is an ISO instant, or null
 */
export function newestBackup(backupsDir) {
  if (!backupsDir) return { visible: false, newest: null };
  try {
    const taken = listBackups(backupsDir);
    return { visible: true, newest: taken.length ? taken[0].at.toISOString() : null };
  } catch {
    return { visible: false, newest: null };
  }
}

export function checkBackup(backupsDir, maxAgeHours = DEFAULTS.maxBackupAgeHours, now = new Date()) {
  if (!backupsDir)
    return fail('backup', 'no backup directory given — pass --backups <dir> or set RA_BACKUP_DIR');
  let taken;
  try {
    taken = listBackups(backupsDir);
  } catch (e) {
    return fail('backup', `cannot read backup directory ${backupsDir}: ${e.code ?? e.message}`);
  }
  if (!taken.length) return fail('backup', `no racearena-backup-*.tar in ${backupsDir}`);
  const newest = taken[0];
  const ageHours = (now - newest.at) / 3_600_000;
  const shown = `${ageHours.toFixed(1)} h old (${newest.at.toISOString()})`;
  if (ageHours > maxAgeHours)
    return fail('backup', `newest backup is ${shown}, older than the maximum ${maxAgeHours} h`);
  // TIDY-C-1: a recent archive that is missing its checksum, or no longer matches it, is not a backup
  // anyone can rely on, so it FAILS the same line rather than passing on age alone.
  const sum = verifyChecksum(join(backupsDir, newest.name));
  return sum.ok
    ? ok('backup', `newest backup is ${shown}, maximum ${maxAgeHours} h; ${sum.detail}`)
    : fail('backup', `newest backup is ${shown}, but ${sum.detail}`);
}
