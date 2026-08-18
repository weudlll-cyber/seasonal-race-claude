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
import { mkdtempSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Point all runtime consumers to a fresh temp dir — server/data is never touched in tests.
process.env.RA_DATA_DIR ??= mkdtempSync(join(os.tmpdir(), 'ra-test-data-'));

// ── ONE USERS STORE PER TEST FILE, NOT PER PROCESS (TEST-ACCOUNTS-1) ─────────────────────────
//
// A setup file runs ONCE PER TEST FILE, so a fresh name here is a fresh store per file. It used
// to be `racearena-test-users-${process.pid}.json` — one path for every file a worker ran — and
// the isolation was then provided by DELETING that file before each one. Two things were wrong
// with that. The delete is invisible: nothing about `RA_USERS_DB` said the store was expected to
// be empty, so tests were written that read the WHOLE store and asserted on it ("there is exactly
// one admin"), which is only ever true by the grace of a line in another file. And it depends on
// files not overlapping — one shared path plus real file parallelism is a race, and the suite was
// kept serial (`--no-file-parallelism`) partly to avoid it.
//
// A unique path per file needs no delete and cannot race: two files never name the same store, so
// "the users this file created" and "every user in the store" are the same set by construction,
// and the global assertions become the file's own business. Nothing is cleaned up here — these
// live in the OS temp directory, they are a few hundred bytes, and a cleanup step that ran at the
// wrong moment is precisely the failure this replaces.
process.env.RA_USERS_DB = join(os.tmpdir(), `racearena-test-users-${randomUUID()}.json`);

// Known token (handy for authz tests; harmless here).
process.env.RA_BOOTSTRAP_TOKEN ??= 'test-bootstrap-token';
