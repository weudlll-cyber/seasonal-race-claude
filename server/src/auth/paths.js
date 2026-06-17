// ============================================================
// File:        paths.js
// Path:        server/src/auth/paths.js
// Project:     RaceArena
// Description: Canonical filesystem paths shared across the auth layer.
//              Centralises the setup-marker path so neither authRouter.js
//              nor the recovery CLI need to recompute or duplicate it.
// ============================================================

import { join } from 'path';
import { DATA_ROOT } from '../dataPaths.js';

export const SETUP_MARKER_PATH = join(DATA_ROOT, 'setup-complete.json');
