// ============================================================
// File:        env-setup.js
// Path:        server/test/env-setup.js
// Project:     RaceArena
// Description: Vitest global setup — isolates auth state from real server data
// ============================================================

import os from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';

// Stable per-process temp users store so tests never touch the real server/data/users.json.
process.env.RA_USERS_DB ??= join(os.tmpdir(), 'racearena-test-users.json');

// Clean slate for this run (sequential test execution; each file re-seeds via adminAgent).
try { if (existsSync(process.env.RA_USERS_DB)) unlinkSync(process.env.RA_USERS_DB); } catch {}

// Known token (handy for later authz tests; harmless here).
process.env.RA_BOOTSTRAP_TOKEN ??= 'test-bootstrap-token';
