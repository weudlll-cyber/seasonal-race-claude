// ============================================================
// File:        backupArchive.mjs
// Path:        shared/backupArchive.mjs
// Project:     RaceArena — AUDIT-1 D2 (moved here from scripts/backup.mjs)
// Description: The backup archive's NAME and its CHECKSUM FILE — the format a backup is written in
//              and read back by. One fact, one file: `scripts/backup.mjs` writes with these,
//              `shared/statusChecks.mjs` (and through it `npm run status` and the admin status box
//              on the Dev Screen) reads with these.
//
// ── WHY IT LIVES IN `shared/` NOW ──────────────────────────────────────────────────────────────
// It lived in `scripts/backup.mjs`, beside the writer. The server's admin status route needs to
// read backup ages and checksums too, and `scripts/backup.mjs` is not in the server image (the
// root `.dockerignore` keeps `scripts/` out on purpose: it is tooling, and it carries the archive
// WRITER). Copying the two readers into the server would have been a second home for the format,
// so the format moved here and `scripts/backup.mjs` re-exports it unchanged; every existing import
// of these names from `backup.mjs` still works. Node builtins only, so the image needs nothing else.
// ============================================================

import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';

/** UTC stamp with no characters a filesystem dislikes: 20260924T143001Z. */
export function stampUtc(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** The archive name. Two backups in the same second on the same root would still collide, so the
 *  seconds-resolution stamp is the naming rule and the tests pin it. */
export function archiveName(d = new Date()) {
  return `racearena-backup-${stampUtc(d)}.tar`;
}

/** The reverse of `archiveName`: the UTC instant a backup was taken, read from its NAME, or `null`
 *  for a file that is not one of ours. Lives beside `archiveName` so the format is one fact in one
 *  file; status reads backup ages through this rather than through file mtimes, which a copy to
 *  another disk resets. (RELEASE-BASICS-1) */
export function archiveTakenAt(name) {
  const m = /^racearena-backup-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\.tar$/.exec(name);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

// ── the integrity checksum (TIDY-C-1) ──────────────────────────────────────────────────────────
// Every archive gets a `<archive>.sha256` beside it in the standard `sha256sum` format
// ("<hex>  <filename>"), so `sha256sum -c` checks it on any Linux host with no tool of ours, and
// `npm run status` checks it through `verifyChecksum` below. Lives here, beside `archiveName`, so the
// archive and its checksum are one format in one file. Not to be confused with the tar HEADER
// checksum in `scripts/backup.mjs` `tarHeader`, which is part of the tar format and says nothing
// about the whole archive.

/** The checksum file that belongs to an archive path (or name). */
export function checksumPath(archive) {
  return `${archive}.sha256`;
}

/** The `sha256sum` line for an archive's bytes: lowercase hex, TWO spaces, the bare file name. */
export function checksumLine(bytes, archiveFileName) {
  return `${createHash('sha256').update(bytes).digest('hex')}  ${archiveFileName}
`;
}

/**
 * Does the archive still match its checksum file? `{ ok, detail }`, never a throw, so a caller can
 * report it as one line. A missing or malformed checksum file is NOT a pass: an archive that cannot
 * be checked cannot be trusted to restore.
 */
export function verifyChecksum(archive) {
  const sumFile = checksumPath(archive);
  if (!existsSync(sumFile)) return { ok: false, detail: `no checksum file ${basename(sumFile)}` };
  const m = /^([0-9a-f]{64}) [ *](.+)$/m.exec(readFileSync(sumFile, 'utf8'));
  if (!m) return { ok: false, detail: `checksum file ${basename(sumFile)} is not in sha256sum format` };
  if (m[2].trim() !== basename(archive))
    return { ok: false, detail: `checksum file ${basename(sumFile)} names ${m[2].trim()}, not ${basename(archive)}` };
  const actual = createHash('sha256').update(readFileSync(archive)).digest('hex');
  return actual === m[1]
    ? { ok: true, detail: 'checksum matches' }
    : { ok: false, detail: `checksum MISMATCH for ${basename(archive)} — the archive changed after it was written` };
}
