// ============================================================
// File:        env-setup.js
// Path:        server/test/env-setup.js
// Project:     RaceArena
// Description: Vitest global setup — isolates auth state from real server data
// ============================================================

import os from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';

// Force a pid-unique temp path — never honour an ambient RA_USERS_DB that could point at real data.
const testUsersDb = join(os.tmpdir(), `racearena-test-users-${process.pid}.json`);
process.env.RA_USERS_DB = testUsersDb;
try { if (existsSync(testUsersDb)) unlinkSync(testUsersDb); } catch {}

// Known token (handy for authz tests; harmless here).
process.env.RA_BOOTSTRAP_TOKEN ??= 'test-bootstrap-token';
