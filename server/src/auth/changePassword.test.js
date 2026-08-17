// ============================================================
// File:        changePassword.test.js
// Path:        server/src/auth/changePassword.test.js
// Project:     RaceArena
// Created:     2026-08-19
// Description: POST /api/auth/change-password — SELF-PASSWORD-1, the owner's decision of
//              2026-08-19: an operator must be able to change his own password, so that an admin
//              does not have to know it.
//
//              THE CONTRACT UNDER TEST
//                · any logged-in role may change their OWN password;
//                · the current password is required, and a wrong one answers exactly what the
//                  login path answers;
//                · THE TARGET IS THE SESSION'S USER, never the request body;
//                · the requesting session survives; every OTHER session of that user does not;
//                · nobody else is affected.
//
//              These assert observable behaviour — status codes and whether a login succeeds —
//              never the epoch number, so the invalidation mechanism can change without
//              re-blessing them.
//
//              WHAT BREAKS IF EACH TEST IS DELETED is written above each one.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import defaultStore from './usersStore.js';

// bcrypt at cost 12 is deliberately slow, and each test here performs several logins plus a
// password change — four to eight hashes apiece. Alone that is ~2 s per test; under the full
// suite's contention it crosses vitest's 5 s default and times out. This file therefore states
// its own WALL-CLOCK budget. It weakens no assertion: nothing here retries, tolerates a failure,
// or skips a case — the tests are identical, they are merely allowed to take the time bcrypt costs.
vi.setConfig({ testTimeout: 30_000 });

const app = createApp();

// DELIBERATELY NO SHARED `testadmin` AGENT. Nine test files log in as that one account against one
// users store, and vitest runs files in parallel — so an assertion about its session is an
// assertion about what eight other files happened to be doing. Every user here is created by this
// file, for one test, and asserted only against users this file created.
let seq = 0;
const uniq = (tag) => `selfpw-${tag}-${Date.now()}-${seq++}`;

async function makeLoggedInUser({ role = 'operator', password = 'Start-Pass-1!' } = {}) {
  const username = uniq(role);
  const user = await defaultStore.createUser({ username, password, role, createdBy: 'setup' });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username, password });
  if (res.status !== 200) throw new Error(`login failed (${res.status})`);
  return { user, agent, username, password };
}

async function loginAgain(username, password) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username, password });
  if (res.status !== 200) throw new Error(`second login failed (${res.status})`);
  return agent;
}

// Does this username/password pair actually authenticate? The honest check that a password
// changed — or did not — without reading the store's internals.
async function canLogIn(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.status === 200;
}

describe('POST /api/auth/change-password — access', () => {
  // DELETE THIS and the route could become public, which on a password-change endpoint means
  // anyone who can reach the server can attempt one.
  it('anonymous → 401', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'x', newPassword: 'y' });
    expect(res.status).toBe(401);
  });

  // DELETE THIS and the whole reason the route exists goes untested: an operator could be locked
  // out of it by a future ROUTE_POLICY entry and only an admin would still be able to change a
  // password — exactly the state this block was written to end.
  it('an OPERATOR can change their own password', async () => {
    const u = await makeLoggedInUser({ role: 'operator' });

    const res = await u.agent
      .post('/api/auth/change-password')
      .send({ currentPassword: u.password, newPassword: 'Operator-New-2!' });

    expect(res.status).toBe(200);
    expect(await canLogIn(u.username, 'Operator-New-2!')).toBe(true);
  });

  // DELETE THIS and an admin-only regression on this route would be invisible from the operator
  // test alone, since an admin reaching it is the case a policy change would most likely keep.
  it('an ADMIN can change their own password too', async () => {
    const u = await makeLoggedInUser({ role: 'admin' });

    const res = await u.agent
      .post('/api/auth/change-password')
      .send({ currentPassword: u.password, newPassword: 'Admin-New-2!' });

    expect(res.status).toBe(200);
    expect(await canLogIn(u.username, 'Admin-New-2!')).toBe(true);
  });
});

describe('POST /api/auth/change-password — the current password is required', () => {
  // DELETE THIS and a stolen session becomes a permanent account takeover: whoever holds the
  // cookie could set a new password without ever knowing the old one.
  it('a WRONG current password is rejected and changes nothing', async () => {
    const u = await makeLoggedInUser();

    const res = await u.agent
      .post('/api/auth/change-password')
      .send({ currentPassword: 'not-the-password', newPassword: 'Should-Not-Apply-9!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid credentials');

    // Nothing changed: the old password still works and the new one never did.
    expect(await canLogIn(u.username, u.password)).toBe(true);
    expect(await canLogIn(u.username, 'Should-Not-Apply-9!')).toBe(false);
  });

  // DELETE THIS and a failed attempt could start ending sessions — turning a wrong guess into a
  // denial of service against the account it was aimed at.
  it('a WRONG current password affects no session', async () => {
    const u = await makeLoggedInUser();
    const second = await loginAgain(u.username, u.password);

    await u.agent
      .post('/api/auth/change-password')
      .send({ currentPassword: 'wrong', newPassword: 'Nope-1!' });

    expect((await u.agent.get('/api/auth/me')).status).toBe(200);
    expect((await second.get('/api/auth/me')).status).toBe(200);
  });

  // DELETE THIS and the endpoint could start reporting whether the current password was wrong
  // versus the new one invalid, which tells an attacker holding a session which half to work on.
  it('answers exactly what the login path answers', async () => {
    const u = await makeLoggedInUser();

    const change = await u.agent
      .post('/api/auth/change-password')
      .send({ currentPassword: 'wrong', newPassword: 'Whatever-1!' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: u.username, password: 'wrong' });

    expect(change.status).toBe(login.status);
    expect(change.body.error).toBe(login.body.error);
  });

  // DELETE THIS and an empty new password could be accepted, or rejected with a message this
  // route invented instead of the one the store already gives.
  it('an empty new password is rejected with the existing rule', async () => {
    const u = await makeLoggedInUser();

    const res = await u.agent
      .post('/api/auth/change-password')
      .send({ currentPassword: u.password, newPassword: '' });

    expect(res.status).toBe(400);
    expect(await canLogIn(u.username, u.password)).toBe(true);
  });
});

describe('POST /api/auth/change-password — the target is the SESSION, not the body', () => {
  // THE TEST THAT MATTERS MOST. DELETE THIS and the route could start reading a target from the
  // request body, which would turn a self-service endpoint every operator can reach into an
  // unguarded admin reset — the worst defect this feature could possibly have.
  it('a body naming ANOTHER user changes only the requester', async () => {
    const victim = await makeLoggedInUser({ role: 'operator' });
    const actor = await makeLoggedInUser({ role: 'operator' });

    const res = await actor.agent.post('/api/auth/change-password').send({
      // Every shape a careless implementation might read a target from:
      userId: victim.user.id,
      id: victim.user.id,
      username: victim.username,
      currentPassword: actor.password,
      newPassword: 'Actor-Changed-3!',
    });

    expect(res.status).toBe(200);

    // The victim is untouched: old password still works, the actor's new one is not theirs.
    expect(await canLogIn(victim.username, victim.password)).toBe(true);
    expect(await canLogIn(victim.username, 'Actor-Changed-3!')).toBe(false);
    // The requester is the one who changed.
    expect(await canLogIn(actor.username, 'Actor-Changed-3!')).toBe(true);
  });

  // DELETE THIS and the same body-target defect could still pass the test above by failing
  // "closed" on the victim while silently ending the victim's session.
  it("a body naming another user does not touch that user's session", async () => {
    const victim = await makeLoggedInUser();
    const actor = await makeLoggedInUser();

    await actor.agent.post('/api/auth/change-password').send({
      userId: victim.user.id,
      currentPassword: actor.password,
      newPassword: 'Actor-Changed-4!',
    });

    expect((await victim.agent.get('/api/auth/me')).status).toBe(200);
  });
});

describe('POST /api/auth/change-password — sessions', () => {
  // DELETE THIS and the change could start logging the changer out — the self-lockout
  // SESSION-INVALIDATE-1 removed, reintroduced through a second route.
  it('the requesting session still works afterwards', async () => {
    const u = await makeLoggedInUser();

    const res = await u.agent
      .post('/api/auth/change-password')
      .send({ currentPassword: u.password, newPassword: 'Keeps-Mine-5!' });
    expect(res.status).toBe(200);

    expect((await u.agent.get('/api/auth/me')).status).toBe(200);
  });

  // DELETE THIS and the security point of requiring the old password is lost: a password changed
  // because it leaked would leave the thief's session alive.
  it('every OTHER session of that user is rejected on its next request', async () => {
    const u = await makeLoggedInUser();
    const second = await loginAgain(u.username, u.password);
    expect((await second.get('/api/auth/me')).status).toBe(200);

    await u.agent
      .post('/api/auth/change-password')
      .send({ currentPassword: u.password, newPassword: 'Kills-Others-6!' });

    expect((await second.get('/api/auth/me')).status).toBe(401);
    expect((await u.agent.get('/api/auth/me')).status).toBe(200);
  });

  // DELETE THIS and an over-broad invalidation — the easiest way to get this wrong — would pass
  // every other test in this file.
  it('an unrelated user is untouched', async () => {
    const bystander = await makeLoggedInUser();
    const u = await makeLoggedInUser();

    await u.agent
      .post('/api/auth/change-password')
      .send({ currentPassword: u.password, newPassword: 'Bystander-Safe-7!' });

    expect((await bystander.agent.get('/api/auth/me')).status).toBe(200);
  });
});
