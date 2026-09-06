// ============================================================
// File:        setupStateDisagreement.test.js
// Path:        server/src/auth/setupStateDisagreement.test.js
// Project:     RaceArena — SETUP-STATE-PIN-1
//
// WHAT HAPPENS WHEN THE MARKER AND THE USERS STORE DISAGREE. Setup has TWO sources of truth about
// whether it has already happened — the marker file, and whether any user exists — and the two
// endpoints do not consult them the same way:
//
//   GET  /setup-needed  answers yes only when the marker is ABSENT **and** there are NO users.
//   POST /setup         refuses on the MARKER ALONE, before it has looked at anything else.
//
// In the two states where those disagree, what the server does today is not written down anywhere.
// THIS FILE CHANGES NO BEHAVIOUR AND PROPOSES NONE. It pins what happens now, so that whichever
// way the owner decides, the change is visible as a diff in a test rather than as a surprise on a
// customer's machine.
//
//   STATE 1 — marker PRESENT, zero users.   A restored machine, a wiped users.json, a marker left
//                                           by a run that got that far and no further.
//   STATE 2 — marker ABSENT, users PRESENT. A restored users.json without the marker beside it.
//
// EVERY ASSERTION HERE IS A DESCRIPTION, NOT A REQUIREMENT. If one of them goes red, the right
// question is "was that intended?" and not "what broke?" — the header of each block says which
// answer today gives and what it costs.
//
// WHAT BREAKS IF EACH TEST IS DELETED is written above each one.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createUsersStore } from './usersStore.js';
import { createAuthRouter } from './authRouter.js';

const TOKEN = 'PIN-TOKEN';
const BODY = { username: 'newadmin', password: 'pw123456' };

describe('setup when the marker and the store disagree — TODAY’S behaviour, pinned', () => {
  let usersPath, markerPath, store, app;

  // Its own store and its own marker on random paths: this file depends on no other file's state
  // and no other file's order (TEST-ACCOUNTS-1).
  beforeEach(() => {
    usersPath = join(os.tmpdir(), `setup-pin-users-${randomUUID()}.json`);
    markerPath = join(os.tmpdir(), `setup-pin-marker-${randomUUID()}.json`);
    store = createUsersStore(usersPath);
    app = express();
    app.use(express.json());
    app.use(
      '/api/auth',
      createAuthRouter({ store, setupMarkerPath: markerPath, getBootstrapToken: () => TOKEN })
    );
    // The auto-login step warns on this bare app (no session middleware). Silenced so a real
    // failure in these tests is readable; nothing here asserts on the log.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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

  const postSetup = (token = TOKEN, body = BODY) =>
    request(app).post('/api/auth/setup').set('x-bootstrap-token', token).send(body);

  const getNeeded = () => request(app).get('/api/auth/setup-needed');

  // ── The control. Without it every assertion below could be describing a broken fixture. ────────
  describe('CONTROL — the two agree: no marker, no users', () => {
    // DELETE THIS and the two disagreement blocks lose their reference point: "setup is refused"
    // would no longer be distinguishable from "this fixture cannot do setup at all".
    it('setup is needed, and it works', async () => {
      expect((await getNeeded()).body).toEqual({ setupNeeded: true });
      const res = await postSetup();
      expect(res.status).toBe(201);
      expect(store.countUsers()).toBe(1);
      expect(existsSync(markerPath)).toBe(true);
    });
  });

  // ── STATE 1 ────────────────────────────────────────────────────────────────────────────────────
  //
  // TODAY: both endpoints say setup is over. `GET` says so because the marker is present; `POST`
  // says so at its FAST PRE-CHECK, before it has read the token or the body or counted a single
  // user. The cost is that the server is unreachable — there is nobody to log in as, and no way to
  // create the first admin through the API. The way out today is `scripts/recover-admin.mjs` or
  // deleting the marker by hand.
  describe('STATE 1 — the marker is PRESENT and there are ZERO users', () => {
    beforeEach(() => {
      writeFileSync(markerPath, JSON.stringify({ completedAt: '2026-01-01T00:00:00.000Z' }));
    });

    // DELETE THIS and the GET half of the disagreement is unpinned: `setup-needed` could start
    // answering `true` here — which would be a defensible decision and a silent one.
    it('GET /setup-needed answers false, on the marker alone', async () => {
      expect(store.countUsers()).toBe(0);
      expect((await getNeeded()).body).toEqual({ setupNeeded: false });
    });

    // DELETE THIS and the machine could quietly become recoverable — or quietly stop being — and
    // nothing would say which. THIS IS THE LOCK-OUT, stated as a test rather than as a worry.
    it('POST /setup refuses with 409, and creates nothing', async () => {
      const res = await postSetup();
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'setup already complete' });
      expect(store.countUsers()).toBe(0);
    });

    // DELETE THIS and the ORDER of the checks stops being pinned. It is the observable half of
    // "POST refuses on the marker alone": a WRONG token gets 409 here, not the 403 it gets
    // everywhere else, because the marker is consulted before the token is.
    it('the marker is checked BEFORE the token — a wrong token still gets 409, not 403', async () => {
      const res = await postSetup('NOT-THE-TOKEN');
      expect(res.status).toBe(409);
    });

    // DELETE THIS and the same is true of the body check — an empty body gets 409 here and 400
    // anywhere else, which is the same ordering fact seen from the other side.
    it('…and before the body — an empty body still gets 409, not 400', async () => {
      const res = await postSetup(TOKEN, {});
      expect(res.status).toBe(409);
    });
  });

  // ── STATE 2 ────────────────────────────────────────────────────────────────────────────────────
  //
  // TODAY: both endpoints also say setup is over, but by completely different routes. `GET` says so
  // because the user count is not zero. `POST` gets all the way past the token, the body and the
  // O_EXCL gate — CREATING the marker — before the post-gate count check refuses and DELETES the
  // marker again. So the refusal is correct and the state is left exactly as it was, which means
  // the next attempt repeats the whole dance.
  describe('STATE 2 — the marker is ABSENT and users are PRESENT', () => {
    beforeEach(async () => {
      await store.createUser({
        team: 'Seasonal Entertainment',
        allowNewTeam: true,
        username: 'existing',
        password: 'pw123456',
        role: 'admin',
      });
    });

    // DELETE THIS and `setup-needed` could start answering `true` on a machine that already has
    // users — which would send the client to the setup screen on a working install.
    it('GET /setup-needed answers false, on the user count alone', async () => {
      expect(existsSync(markerPath)).toBe(false);
      expect((await getNeeded()).body).toEqual({ setupNeeded: false });
    });

    // DELETE THIS and the paranoid post-gate check is unguarded: a restored users.json without its
    // marker would let anyone holding the bootstrap token mint a second admin. That is the whole
    // reason the check exists, and nothing else covers it.
    it('POST /setup refuses with 409 and mints NO second admin', async () => {
      const res = await postSetup();
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'setup already complete' });
      expect(store.countUsers()).toBe(1);
    });

    // DELETE THIS and the roll-back is unpinned. The refusal above happens INSIDE the O_EXCL gate,
    // so the marker has already been created by the time it fires; if the unlink were dropped, the
    // state would silently become STATE 1 — marker present, and now the machine is locked out by
    // the very request that refused to change it.
    it('the marker it created inside the gate is REMOVED again — the state is unchanged', async () => {
      await postSetup();
      expect(existsSync(markerPath)).toBe(false);
    });

    // DELETE THIS and the ordering fact for this state stops being pinned. Unlike STATE 1, here the
    // token IS checked first, so a wrong token gets the ordinary 403 — the two states answer the
    // same wrong request differently, and that is the disagreement made visible.
    it('the token IS checked first here — a wrong token gets 403, not 409', async () => {
      const res = await postSetup('NOT-THE-TOKEN');
      expect(res.status).toBe(403);
    });

    // DELETE THIS and the repeatability goes unrecorded. Because the refusal leaves the marker
    // absent, every later attempt costs another create-and-unlink rather than stopping at the fast
    // pre-check. It is not a defect today; it is the thing that would change if the owner decides
    // the refusal should WRITE the marker.
    it('a second attempt behaves identically — nothing was learned from the first', async () => {
      const first = await postSetup();
      const second = await postSetup();
      expect(second.status).toBe(first.status);
      expect(second.body).toEqual(first.body);
      expect(existsSync(markerPath)).toBe(false);
      expect(store.countUsers()).toBe(1);
    });
  });
});
