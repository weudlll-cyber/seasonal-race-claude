// ============================================================
// File:        changePasswordContract.test.js
// Path:        server/src/auth/changePasswordContract.test.js
// Project:     RaceArena — SELF-PASSWORD-1
//
// THE SEAM TEST. It drives the REAL client function `authApi.changePassword` against the REAL
// server handler, over a real logged-in session.
//
// ── WHAT BREAKS IF THIS FILE IS DELETED ──────────────────────────────────────────────────────────
// The client and the server could disagree about this route exactly as they disagreed about the
// setup token for months, and every other suite would stay green. A client test that stubs `fetch`
// and asserts the parsed response cannot see what was actually sent; a server test that hand-builds
// the request cannot see what the client actually builds. That gap is what hid SETUP-TOKEN-CHANNEL-1,
// and this route has the same shape — a body whose contents decide who is affected.
//
// It also pins the security property at the seam: THE CLIENT SENDS NO USER IDENTIFIER AT ALL. If a
// future edit adds one "for convenience", this file fails, because the request body is asserted
// exactly rather than loosely.
//
// ── WHY THE FETCH BRIDGE IS NOT A MOCK ───────────────────────────────────────────────────────────
// Same bridge as setupContract.test.js: `API_BASE_URL` is a module const, so `fetch` is replaced by
// a TRANSPORT that hands the request the client actually built — method, headers, body — to
// supertest against the real app. Here it rides a supertest AGENT, so the real session cookie from
// a real login travels with it, exactly as a browser's would.
//
// The bridge is controlled in both directions: the correct call must SUCCEED, and a hand-built call
// naming another user in the body must leave that user untouched.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import defaultStore from './usersStore.js';

// The REAL client function, imported across the tree on purpose.
import { changePassword } from '../../../client/src/services/authApi.js';

// bcrypt at cost 12 is deliberately slow, and each test here performs several logins plus a
// password change — four to eight hashes apiece. Alone that is ~2 s per test; under the full
// suite's contention it crosses vitest's 5 s default and times out. This file therefore states
// its own WALL-CLOCK budget. It weakens no assertion: nothing here retries, tolerates a failure,
// or skips a case — the tests are identical, they are merely allowed to take the time bcrypt costs.
vi.setConfig({ testTimeout: 30_000 });

const app = createApp();

let seq = 0;
const uniq = (tag) => `cpcontract-${tag}-${Date.now()}-${seq++}`;

async function canLogIn(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.status === 200;
}

describe('POST /api/auth/change-password — the client/server contract', () => {
  let seen, actor, actorAgent;

  beforeEach(async () => {
    const username = uniq('actor');
    const password = 'Contract-Pass-1!';
    actor = { username, password };
    actor.record = await defaultStore.createUser({
      username,
      password,
      role: 'operator',
      createdBy: 'setup',
    });

    actorAgent = request.agent(app);
    const li = await actorAgent.post('/api/auth/login').send({ username, password });
    if (li.status !== 200) throw new Error(`login failed (${li.status})`);

    seen = [];
    vi.stubGlobal('fetch', async (url, options = {}) => {
      const { method = 'GET', headers = {}, body } = options;
      seen.push({ url: String(url), method, headers, body });
      const path = new URL(String(url)).pathname;
      // The AGENT, not a bare request — the real session cookie rides along.
      let req = actorAgent[String(method).toLowerCase()](path);
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
  });

  it('the client sends ONLY the two passwords — no user identifier of any kind', async () => {
    await changePassword(actor.password, 'Contract-New-2!');
    expect(seen).toHaveLength(1);
    // Exact equality on purpose: an added id/username field must fail this, not slip through.
    expect(JSON.parse(seen[0].body)).toEqual({
      currentPassword: actor.password,
      newPassword: 'Contract-New-2!',
    });
  });

  it('END TO END: the real client call against the real handler changes the password', async () => {
    const out = await changePassword(actor.password, 'Contract-New-3!');
    expect(out).toEqual({ ok: true });

    expect(await canLogIn(actor.username, 'Contract-New-3!')).toBe(true);
    expect(await canLogIn(actor.username, actor.password)).toBe(false);
  });

  it('a WRONG current password is refused, so the success above is the password and not the bridge', async () => {
    await expect(changePassword('not-the-password', 'Contract-New-4!')).rejects.toMatchObject({
      status: 401,
    });
    expect(await canLogIn(actor.username, actor.password)).toBe(true);
    expect(await canLogIn(actor.username, 'Contract-New-4!')).toBe(false);
  });

  it('the requesting session still works after the real client call', async () => {
    await changePassword(actor.password, 'Contract-New-5!');
    expect((await actorAgent.get('/api/auth/me')).status).toBe(200);
  });

  // THE BRIDGE'S OWN CONTROL. Hand-built, bypassing the client: a body that names somebody else.
  // The victim must be untouched — if the server were reading a target from the body, this would
  // change the victim's password and every assertion above would be about the wrong thing.
  it('CONTROL: a hand-built body naming another user leaves that user untouched', async () => {
    const victimName = uniq('victim');
    const victimPass = 'Victim-Pass-1!';
    const victim = await defaultStore.createUser({
      username: victimName,
      password: victimPass,
      role: 'operator',
      createdBy: 'setup',
    });

    const res = await actorAgent.post('/api/auth/change-password').send({
      userId: victim.id,
      username: victimName,
      currentPassword: actor.password,
      newPassword: 'Should-Hit-Actor-6!',
    });
    expect(res.status).toBe(200);

    expect(await canLogIn(victimName, victimPass)).toBe(true);
    expect(await canLogIn(victimName, 'Should-Hit-Actor-6!')).toBe(false);
    expect(await canLogIn(actor.username, 'Should-Hit-Actor-6!')).toBe(true);
  });
});
