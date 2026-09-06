// ============================================================
// File:        dataPaths.js
// Path:        server/src/dataPaths.js
// Project:     RaceArena
// Description: Single source of truth for the server runtime data root.
//              Set RA_DATA_DIR to redirect all runtime storage without
//              touching any consumer. Default resolves to server/data
//              relative to this file's location — never process.cwd().
// ============================================================

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function resolveDataRoot(env = process.env) {
  if (env.RA_DATA_DIR) return resolve(env.RA_DATA_DIR);
  return resolve(__dirname, '../data');
}

export const DATA_ROOT = resolveDataRoot();
