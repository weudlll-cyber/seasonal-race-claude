// ============================================================
// File:        removeStoredAsset.js
// Path:        server/utils/removeStoredAsset.js
// Project:     RaceArena — AUDIT-1 A5M-09 (2026-10-09)
// Description: The ONE way a route deletes an uploaded image named by a stored record.
//
// ── WHY ONE HELPER ──────────────────────────────────────────────────────────────────────────────
// DELETE-TRACK-SAFETY-1 closed this for track backgrounds (`removeBackgroundFile` in tracks.js):
// a stored filename is checked with `isSafeAssetFilename` BEFORE it is unlinked, because the read
// paths already refused an unsafe value while the delete paths acted on it. AUDIT-1 found the same
// asymmetry six more times — brand logos (delete brand, replace logo, delete logo), racer sprites
// (delete racer, replace sprite) and the replaced track background. Each was a hand-written
// `join` + `unlinkSync`; one helper means the check cannot be forgotten at a seventh.
//
// NOT REACHABLE THROUGH THE API — every writer of these fields derives `<id>.<ext>` itself — but
// reachable through a hand-edited, restored or seeded record, which this project documents. On an
// unsafe value the file is LEFT ALONE and the operator is told: a stray image is the lesser harm.
// ============================================================

import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { isSafeAssetFilename } from './isSafeAssetFilename.js';

/**
 * Delete `dir/name` if `name` is a plain filename this server could have written.
 *
 * @param {string} dir      the asset directory (e.g. the logos folder).
 * @param {unknown} name    the filename as stored on the record; empty means "nothing to delete".
 * @param {string} tag      the log prefix, e.g. 'brands'.
 * @param {string} what     what is being deleted, for the log line, e.g. 'logo for "acme"'.
 * @returns {boolean}       false when an unsafe name was refused, true otherwise.
 */
export function removeStoredAsset(dir, name, tag, what) {
  if (!name) return true;
  if (!isSafeAssetFilename(name)) {
    console.warn(
      `[${tag}] refusing to delete ${what}: stored filename ${JSON.stringify(name)} ` +
        'is not a plain filename this server could have written. The file was left in place.'
    );
    return false;
  }
  const path = join(dir, name);
  if (existsSync(path)) unlinkSync(path);
  return true;
}
