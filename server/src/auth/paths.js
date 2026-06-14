// ============================================================
// File:        paths.js
// Path:        server/src/auth/paths.js
// Project:     RaceArena
// Description: Canonical filesystem paths shared across the auth layer.
//              Centralises the setup-marker path so neither authRouter.js
//              nor the recovery CLI need to recompute or duplicate it.
// ============================================================

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolves to server/data/setup-complete.json — identical to the value
// previously computed inline in authRouter.js (same __dirname, same join).
export const SETUP_MARKER_PATH = join(__dirname, '../../data/setup-complete.json');
