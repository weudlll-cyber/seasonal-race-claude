// ============================================================
// File:        sweepOrphanTmp.js
// Path:        server/utils/sweepOrphanTmp.js
// Project:     RaceArena — POLISH-2026-09-24B piece 3(c)
// Description: Remove `.tmp` files left behind by an interrupted atomic write, at boot.
//
// ── WHERE THE ORPHANS COME FROM ────────────────────────────────────────────────────────────────
// `atomicWriteJson` writes `<file>.tmp` and then renames it over the target. It already cleans the
// tmp up on the ONE failure it anticipates — a transient `EPERM` from `renameSync`, which is what
// OneDrive does on Windows. What it cannot clean up is the process DYING between the write and the
// rename: a crash, a Ctrl+C, a machine losing power. The tmp survives, and nothing ever removes it.
//
// ── ★ WHY THEY ARE WORTH REMOVING AT ALL, since they are inert ─────────────────────────────────
// They are inert — no reader looks for `.tmp` — but they are not harmless. They accumulate, they
// double the apparent size of a data directory, and every one of them goes into a BACKUP
// (`scripts/backup.mjs` copies the data root whole), so an orphan from a crash in March is still
// being archived in September. Clearing them at boot is the cheapest possible moment: the process
// has just started, nothing is mid-write, and any tmp present is by definition from a previous life.
//
// ── ★★ WHAT IT WILL NOT DO, AND THIS IS THE WHOLE SAFETY ARGUMENT ──────────────────────────────
//   1. It removes ONLY `*.tmp`. Never a `.json`, never a directory, never anything else.
//   2. It runs ONLY at boot, before anything is served, so it cannot race a live write. A sweep
//      running alongside a writing server could delete a tmp that was about to be renamed — which
//      would turn a crash-safety measure into a cause of data loss.
//   3. It is NON-FATAL in every direction. A missing directory, an unreadable one, an EPERM on a
//      OneDrive placeholder (this project has had exactly that: UNKNOWN(-4094)) — each is counted
//      and skipped. A tidy-up that can stop the server from starting is a worse bug than the litter
//      it removes.
// ============================================================

import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** How deep to look. The data root nests one level (`tracks/`, `brands/`, …); nothing goes deeper. */
const MAX_DEPTH = 2;

/**
 * Remove `*.tmp` files under `root`. Returns a summary; never throws.
 *
 * @param {string} root the resolved data root
 * @param {(msg: string) => void} [log] where to report; defaults to silence
 */
export function sweepOrphanTmp(root, log = () => {}) {
  const removed = [];
  const skipped = [];

  const walk = (dir, depth) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      skipped.push({ path: dir, reason: err.code ?? 'unreadable' });
      return;
    }
    for (const e of entries) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        if (depth < MAX_DEPTH) walk(abs, depth + 1);
        continue;
      }
      if (!e.isFile() || !e.name.endsWith('.tmp')) continue;
      let bytes = 0;
      try {
        bytes = statSync(abs).size;
      } catch {
        /* the size is for the log only; not knowing it is not a reason to keep the file */
      }
      try {
        rmSync(abs, { force: true });
        removed.push({ path: abs, bytes });
      } catch (err) {
        // An OneDrive placeholder can refuse with EPERM or UNKNOWN(-4094). Counted, not fatal.
        skipped.push({ path: abs, reason: err.code ?? 'unremovable' });
      }
    }
  };

  walk(root, 1);

  if (removed.length) {
    const total = removed.reduce((s, r) => s + r.bytes, 0);
    log(
      `swept ${removed.length} orphaned .tmp file(s) (${total} bytes) left by an interrupted write`
    );
  }
  if (skipped.length) {
    log(
      `could not remove ${skipped.length} .tmp entr(y/ies): ` +
        skipped.map((x) => `${x.path} (${x.reason})`).join(', ')
    );
  }
  return { removed, skipped };
}
