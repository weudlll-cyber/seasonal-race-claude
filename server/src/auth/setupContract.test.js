// ============================================================
// File:        setupContract.test.js
// Path:        server/src/auth/setupContract.test.js
// Project:     RaceArena — SETUP-TOKEN-CHANNEL-1
//
// THE SEAM TEST. It drives the REAL client function `authApi.setup` against the REAL server handler
// and asserts WHICH CHANNEL the bootstrap token travelled on.
//
// ── WHAT BREAKS IF THIS FILE IS DELETED ──────────────────────────────────────────────────────────
// Exactly the defect it was written for comes back, and every other suite stays green while it does.
// On 2026-08-18 the client sent the bootstrap token as a body field and the server read it from the
// `x-bootstrap-token` header and nowhere else. First-admin setup could not succeed on any fresh
// installation, and:
//   • `authRouter.test.js` PASSED — it has a test asserting that a body-only token is rejected, so
//     it was enforcing the very mismatch;
//   • `authApi.test.js` PASSED — it stubs `fetch` and asserts the parsed response, which cannot see
//     which channel anything travelled on;
//   • the e2e suite PASSED — it creates its account by POSTing to the endpoint directly with the
//     header, never through the client function.
// Three green suites over a feature that could not work. Nothing in this repository looked at the
// seam, because every test looked at one side of it.
//
// ── WHY THE FETCH BRIDGE IS NOT A MOCK ───────────────────────────────────────────────────────────
// `API_BASE_URL` is a module const, so pointing the client at an ephemeral port is not possible
// without rewriting the client. Instead `fetch` is replaced by a TRANSPORT BRIDGE that hands the
// request the client actually built — method, headers and body, unaltered — to supertest against a
// real express app. Nothing about the decision under test is simulated: the client composes the
// request, the server's own handler judges it.
//
// A bridge can be wrong in the same direction as the code, so it is checked in BOTH directions in
// the same file: the correct call must SUCCEED (201), and a hand-built body-only call must be
// REFUSED (403). If the bridge were quietly adding the header, the second assertion would fail.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createUsersStore } from './usersStore.js';
import { createAuthRouter } from './authRouter.js';

// The REAL client function, imported across the tree on purpose — a copy of it here would be a
// fourth thing that can drift from the client, which is the whole disease.
import { setup } from '../../../client/src/services/authApi.js';

const TOKEN = 'TEST-TOKEN';

describe('POST /api/auth/setup — the client/server contract', () => {
  let usersPath, markerPath, app, seen;

  beforeEach(() => {
    usersPath = join(os.tmpdir(), `setup-contract-users-${randomUUID()}.json`);
    markerPath = join(os.tmpdir(), `setup-contract-marker-${randomUUID()}.json`);
    app = express();
    app.use(express.json());
    app.use(
      '/api/auth',
      createAuthRouter({
        store: createUsersStore(usersPath),
        setupMarkerPath: markerPath,
        getBootstrapToken: () => TOKEN,
      })
    );

    // The bridge. `seen` records what the CLIENT built, so a test can assert the channel directly
    // as well as through the server's verdict.
    seen = [];
    vi.stubGlobal('fetch', async (url, options = {}) => {
      const { method = 'GET', headers = {}, body } = options;
      seen.push({ url: String(url), method, headers, body });
      const path = new URL(String(url)).pathname;
      let req = request(app)[String(method).toLowerCase()](path);
      for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
      const res = await (body === undefined ? req.send() : req.send(body));
      return {
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        json: async () => res.body,
      };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('the client sends the bootstrap token in the x-bootstrap-token HEADER', async () => {
    await setup('admin', 'pw123456', TOKEN);
    expect(seen).toHaveLength(1);
    expect(seen[0].headers['x-bootstrap-token']).toBe(TOKEN);
  });

  it('the client does NOT put the token in the body — the server would ignore it there', async () => {
    await setup('admin', 'pw123456', TOKEN);
    expect(JSON.parse(seen[0].body)).toEqual({ username: 'admin', password: 'pw123456' });
  });

  it('END TO END: the real client call against the real handler CREATES the first admin', async () => {
    const out = await setup('admin', 'pw123456', TOKEN);
    expect(out).toEqual({ username: 'admin', role: 'admin' });
    expect(existsSync(markerPath)).toBe(true);
  });

  it('a WRONG token is refused, so the success above is the token and not the bridge', async () => {
    await expect(setup('admin', 'pw123456', 'NOT-THE-TOKEN')).rejects.toMatchObject({
      status: 403,
    });
    expect(existsSync(markerPath)).toBe(false);
  });

  // THE BRIDGE'S OWN CONTROL. Hand-built, bypassing the client: the token in the body and no header
  // is exactly what shipped until 2026-08-18. It must be REFUSED — if the bridge were adding the
  // header of its own accord, this would pass and every assertion above would be worthless.
  it('CONTROL: a body-only token is refused — the shipped-until-2026-08-18 request', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({ username: 'admin', password: 'pw123456', token: TOKEN });
    expect(res.status).toBe(403);
    expect(existsSync(markerPath)).toBe(false);
  });
});
