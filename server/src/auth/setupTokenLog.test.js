// ============================================================
// File:        setupTokenLog.test.js
// Path:        server/src/auth/setupTokenLog.test.js
// Project:     RaceArena — SETUP-TOKEN-LOG-1
//
// POST /api/auth/setup answers `403 setup not available` for two different reasons: no bootstrap
// token is configured, and the supplied token does not match. THE RESPONSE IS THE SAME ON PURPOSE
// and these tests assert that it stays the same — a caller must not be able to tell the two apart,
// or the endpoint hands an attacker the answer to "is this server even set up".
//
// The SERVER LOG is the other side of that, and it is the operator's side. Before this block only
// the first case wrote a line, so a mistyped token produced silence in the log AND the same 403 on
// the wire: identical from both ends, and the person who could legitimately tell them apart could
// not. That is the hole this file guards.
//
// WHAT BREAKS IF EACH TEST IS DELETED is written above each one.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createUsersStore } from './usersStore.js';
import { createAuthRouter } from './authRouter.js';

const TOKEN = 'THE-CONFIGURED-TOKEN';
const WRONG = 'NOT-THE-CONFIGURED-TOKEN';

describe('POST /api/auth/setup — the log says which 403 it was, the response never does', () => {
  let usersPath, markerPath, warn;

  // Its own store and its own marker on a random path, so this file depends on no other file's
  // state and no other file's order (TEST-ACCOUNTS-1).
  const appWith = (getBootstrapToken) => {
    const app = express();
    app.use(express.json());
    app.use(
      '/api/auth',
      createAuthRouter({
        store: createUsersStore(usersPath),
        setupMarkerPath: markerPath,
        getBootstrapToken,
      })
    );
    return app;
  };

  beforeEach(() => {
    usersPath = join(os.tmpdir(), `setup-log-users-${randomUUID()}.json`);
    markerPath = join(os.tmpdir(), `setup-log-marker-${randomUUID()}.json`);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const p of [usersPath, markerPath]) {
      if (existsSync(p)) {
        try {
          unlinkSync(p);
        } catch {
          /* temp file already gone */
        }
      }
    }
  });

  // DELETE THIS and the block's whole point is gone: a mistyped bootstrap token goes back to
  // producing an identical 403 and NO log line, so the operator holding the wrong token and the
  // operator who never set the variable read exactly the same thing — nothing.
  it('a MISMATCHED token writes a warning that names the mismatch', async () => {
    const res = await request(appWith(() => TOKEN))
      .post('/api/auth/setup')
      .set('x-bootstrap-token', WRONG)
      .send({ username: 'admin', password: 'pw123456' });

    expect(res.status).toBe(403);
    const lines = warn.mock.calls.map((c) => c.join(' '));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/bootstrap token mismatch/i);
  });

  // DELETE THIS and the new line could start firing on the SUCCESS path — every correct setup on
  // every server would write "bootstrap token mismatch" into the log, which is worse than the
  // silence it replaces: a log that cries wolf is a log nobody reads the day it is right.
  it('the CORRECT token writes no bootstrap-token line at all', async () => {
    const res = await request(appWith(() => TOKEN))
      .post('/api/auth/setup')
      .set('x-bootstrap-token', TOKEN)
      .send({ username: 'admin', password: 'pw123456' });

    expect(res.status).toBe(201);
    // NOT `expect(warn).not.toHaveBeenCalled()`, and the reason is named rather than worked around:
    // this fixture mounts the router on a bare express app with no session middleware, so the
    // handler's auto-login step warns once about `regenerate`. That is a property of the FIXTURE,
    // not of the route, and asserting on it would make this test about the harness. The claim here
    // is the one that matters and it is exact: nothing in the log mentions the bootstrap token.
    const lines = warn.mock.calls.map((c) => c.join(' '));
    expect(lines.filter((l) => /bootstrap|token|mismatch/i.test(l))).toEqual([]);
  });

  // DELETE THIS and the two cases could drift into two different responses — which is the leak the
  // sameness exists to prevent, and it would happen the first time someone "helpfully" made the
  // error message more specific.
  it('BOTH 403s are byte-identical on the wire — status and body', async () => {
    const mismatch = await request(appWith(() => TOKEN))
      .post('/api/auth/setup')
      .set('x-bootstrap-token', WRONG)
      .send({ username: 'admin', password: 'pw123456' });

    const notConfigured = await request(appWith(() => null))
      .post('/api/auth/setup')
      .set('x-bootstrap-token', WRONG)
      .send({ username: 'admin', password: 'pw123456' });

    expect(mismatch.status).toBe(403);
    expect(notConfigured.status).toBe(mismatch.status);
    expect(notConfigured.body).toEqual(mismatch.body);
    expect(mismatch.body).toEqual({ error: 'setup not available' });
  });

  // DELETE THIS and a later "make the log more useful" edit puts the token in it. A log file is the
  // one place a secret ends up somewhere nobody is guarding, and a LENGTH alone narrows it — so the
  // assertion covers the supplied token, the configured one, and any substring of either.
  it('NO token value reaches the log — not the supplied one, not the configured one', async () => {
    await request(appWith(() => TOKEN))
      .post('/api/auth/setup')
      .set('x-bootstrap-token', WRONG)
      .send({ username: 'admin', password: 'pw123456' });

    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain(WRONG);
    // Not a prefix either: four characters of a secret is four characters an attacker has.
    expect(logged).not.toContain(TOKEN.slice(0, 4));
    expect(logged).not.toContain(String(TOKEN.length));
  });

  // DELETE THIS and the unconfigured case could lose ITS line while the new one keeps working —
  // the same hole this block closed, reopened at the other branch.
  it('the UNCONFIGURED case still writes its own, different warning', async () => {
    await request(appWith(() => null))
      .post('/api/auth/setup')
      .set('x-bootstrap-token', WRONG)
      .send({ username: 'admin', password: 'pw123456' });

    const lines = warn.mock.calls.map((c) => c.join(' '));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/RA_BOOTSTRAP_TOKEN not set/);
    expect(lines[0]).not.toMatch(/mismatch/i);
  });
});
