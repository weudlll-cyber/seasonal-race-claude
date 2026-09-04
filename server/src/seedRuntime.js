// ============================================================
// File:        seedRuntime.js
// Path:        server/src/seedRuntime.js
// Project:     RaceArena
// Description: Boot-time snapshot seeding — copies committed seed files from
//              server/seeds/<type>/ into DATA_ROOT/<type>/ on first boot.
//              Each file is copied only when the destination does not yet exist
//              (idempotent, partial-seed-safe). Binary-safe: copyFileSync + renameSync.
//              Imports only node fs/path/url + DATA_ROOT — no route/auth imports.
// ============================================================

import {
  readdirSync,
  readFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  renameSync,
  statSync,
} from 'node:fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DATA_ROOT } from './dataPaths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS_ROOT = resolve(__dirname, '../seeds');

/**
 * Copy all files from server/seeds/<type>/ into DATA_ROOT/<type>/ when missing.
 * Existing destination files are never overwritten.
 * @param {string} type - subdirectory name (e.g. 'tracks', 'backgrounds')
 * @param {string} [dataRoot] - override for DATA_ROOT (used in tests only)
 */
export function seedTypeFromSnapshot(type, dataRoot = DATA_ROOT) {
  const srcDir = join(SEEDS_ROOT, type);
  const destDir = join(dataRoot, type);
  mkdirSync(destDir, { recursive: true });
  if (!existsSync(srcDir)) return;
  for (const file of readdirSync(srcDir)) {
    if (file.endsWith('.tmp')) continue;
    const src = join(srcDir, file);
    if (!statSync(src).isFile()) continue;
    const dest = join(destDir, file);
    if (existsSync(dest)) continue;
    const tmp = dest + '.tmp';
    copyFileSync(src, tmp);
    renameSync(tmp, dest);
  }
}

/**
 * The committed seed RECORDS for one type, parsed, sorted by file name.
 *
 * WHY THIS EXISTS (TRACK-SEEDS-ONE-HOME-1). `server/src/routes/tracks.js` carried a literal copy of
 * all ten tracks — name, icon, description, colour, defaultRacerTypeId, defaultLaps, difficulty,
 * surfaceClasses and trackLights — restating what these files already say. Of 140 comparable values
 * 32 disagreed, and SEVEN of those were in the two fields a live startup migration reads. The
 * copy is gone; this is what replaced it.
 *
 * IT READS THE COMMITTED SEEDS, NOT `DATA_ROOT`. The runtime directory is a DELIVERY of these files
 * that an operator may then edit through the API — so it answers "what does this installation have",
 * which is a different question from "what does this repository ship". The startup migrations that
 * consume this need the second one: they exist to repair a stored record, and repairing it from
 * itself would repair nothing.
 *
 * @param {string} type - subdirectory name under server/seeds/ (e.g. 'tracks')
 * @returns {object[]} parsed records; [] when the directory does not exist
 */
export function readSeedType(type) {
  const srcDir = join(SEEDS_ROOT, type);
  if (!existsSync(srcDir)) return [];
  return readdirSync(srcDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(srcDir, f), 'utf8')));
}
