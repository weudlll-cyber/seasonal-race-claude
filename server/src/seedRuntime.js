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

import { readdirSync, existsSync, mkdirSync, copyFileSync, renameSync } from 'node:fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DATA_ROOT } from './dataPaths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SEEDS_ROOT = resolve(__dirname, '../seeds');

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
    const dest = join(destDir, file);
    if (existsSync(dest)) continue;
    const tmp = dest + '.tmp';
    copyFileSync(join(srcDir, file), tmp);
    renameSync(tmp, dest);
  }
}
