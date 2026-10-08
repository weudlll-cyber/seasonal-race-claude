// ============================================================
// File:        trackBackupRetention.js
// Path:        server/utils/trackBackupRetention.js
// Project:     RaceArena — TRACK-BACKUP-RETENTION-1 (2026-10-08)
// Description: Keep the newest N backups of ONE track and remove that track's older ones.
//
// ── THE DECISION, 2026-10-08 ────────────────────────────────────────────────────────────────────
// Track backups are kept, the newest 20 per track; older ones go automatically. Until then every
// track create, edit and background change wrote a full copy into `tracks-backups/` and none was
// ever removed (SOAK-1, reports/release/SOAK-1.md).
//
// ── HOW A BACKUP IS NAMED, AND WHY THE NAME IS THE CLOCK ───────────────────────────────────────
// `routes/tracks.js` `writeTrackBackup` writes `<dir>/YYYY-MM-DD/HH-MM-SS-mmm-<trackId>.json`. The
// backup's own timestamp is that day folder plus that time prefix, so the order comes from the NAME
// and never from the file's mtime: a restored or copied backup gets a new mtime and would otherwise
// look newer than it is. The same rule `scripts/status.mjs` applies to backup archives.
//
// ── ★ WHAT IT WILL NOT DO ─────────────────────────────────────────────────────────────────────────
//   1. It looks only at files named for THIS track; another track's backups are never read for
//      deletion. A track id is matched exactly, so `oval` never matches `oval-2`.
//   2. It never removes the backup that was just written (`keepPath`), whatever the count says.
//   3. It touches nothing outside `<dir>`: the live track file lives in `tracks/`, not here.
//   4. It is NON-FATAL, like the backup write it follows: an unreadable folder or a file that cannot
//      be removed is counted and skipped. Retention must never make a track save fail.
// It runs after each backup of that track, so backups already over the limit are pruned the next
// time the track is saved. There is no start-up sweep.
// ============================================================

import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/** How many backups of one track are kept (the decision of 2026-10-08). */
export const TRACK_BACKUPS_KEPT = 20;

const DAY_DIR = /^\d{4}-\d{2}-\d{2}$/;
const BACKUP_FILE = /^(\d{2}-\d{2}-\d{2}-\d{3})-(.+)\.json$/;

/**
 * Remove the backups of `trackId` beyond the newest `keep`. Never throws.
 *
 * @param {{ dir: string, trackId: string, keep?: number, keepPath?: string }} args
 *   `dir` the backup root (`<data>/tracks-backups`); `keepPath` the backup just written.
 * @returns {{ found: number, removed: string[], skipped: { path: string, reason: string }[] }}
 */
export function pruneTrackBackups({ dir, trackId, keep = TRACK_BACKUPS_KEPT, keepPath = null }) {
  const out = { found: 0, removed: [], skipped: [] };
  let days;
  try {
    days = readdirSync(dir).filter((d) => DAY_DIR.test(d));
  } catch (err) {
    out.skipped.push({ path: dir, reason: err.code ?? 'unreadable' });
    return out;
  }
  const mine = [];
  for (const day of days) {
    let names;
    try {
      names = readdirSync(join(dir, day));
    } catch (err) {
      out.skipped.push({ path: join(dir, day), reason: err.code ?? 'unreadable' });
      continue;
    }
    for (const name of names) {
      const m = BACKUP_FILE.exec(name);
      if (!m || m[2] !== trackId) continue;
      // The stamp sorts as text: YYYY-MM-DD then HH-MM-SS-mmm, both fixed-width.
      mine.push({ stamp: `${day}T${m[1]}`, path: join(dir, day, name) });
    }
  }
  out.found = mine.length;
  mine.sort((a, b) => (a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : 0)); // newest first
  for (const b of mine.slice(keep)) {
    if (keepPath && b.path === keepPath) continue;
    try {
      rmSync(b.path);
      out.removed.push(b.path);
    } catch (err) {
      out.skipped.push({ path: b.path, reason: err.code ?? 'unremovable' });
    }
  }
  return out;
}
