// ============================================================
// File:        env-setup.js
// Path:        server/test/env-setup.js
// Project:     RaceArena
// Description: Vitest global setup — isolates all server data from real server/data.
//              RA_DATA_DIR must be set BEFORE any module that imports dataPaths.js
//              (which fixes DATA_ROOT at import time). This file imports only node
//              built-ins, so no route/auth module is triggered here.
// ============================================================

import os from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync, mkdtempSync } from 'node:fs';

// Point all runtime consumers to a fresh temp dir — server/data is never touched in tests.
process.env.RA_DATA_DIR ??= mkdtempSync(join(os.tmpdir(), 'ra-test-data-'));

// Force a pid-unique temp path — never honour an ambient RA_USERS_DB that could point at real data.
const testUsersDb = join(os.tmpdir(), `racearena-test-users-${process.pid}.json`);
process.env.RA_USERS_DB = testUsersDb;
try { if (existsSync(testUsersDb)) unlinkSync(testUsersDb); } catch {}

// Known token (handy for authz tests; harmless here).
process.env.RA_BOOTSTRAP_TOKEN ??= 'test-bootstrap-token';
