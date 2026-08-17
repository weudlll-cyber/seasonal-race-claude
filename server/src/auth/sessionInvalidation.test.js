// ============================================================
// File:        sessionInvalidation.test.js
// Path:        server/src/auth/sessionInvalidation.test.js
// Project:     RaceArena
// Created:     2026-08-19
// Description: A password change ends the sessions it should end — and only those.
//              SESSION-INVALIDATE-1, the owner's contract of 2026-08-19:
//                · an admin setting ANOTHER user's password ends every session of THAT user;
//                · a user changing their OWN password ends every OTHER session of that user,
//                  and the session making the request stays valid;
//                · an unrelated user is never affected.
//
//              THE MECHANISM, so a later reader does not go looking for a delete: sessions are
//              not enumerated or removed. `usersStore.updateUser` bumps the record's
//              `sessionEpoch` in the same serialised write that stores the new hash, and
//              `requireAuth` (guards.js) rejects any session whose stored epoch differs. These
//              tests therefore assert the OBSERVABLE contract — the next request's status —
//              rather than the epoch number, so the mechanism can be replaced without
//              re-blessing them.
//
//              WHAT BREAKS IF EACH TEST IS DELETED is written above each one.
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { adminAgent } from '../../test/authAgent.js';
import defaultStore from './usersStore.js';

const app = createApp();
let adminApi;

beforeAll(async () => {
  adminApi = await adminAgent(app);
});

let seq = 0;
const uniq = (tag) => `sesinv-${tag}-${Date.now()}-${seq++}`;

// Creates a user and returns { user, agent } with the agent logged in.
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

describe('an admin sets ANOTHER user password', () => {
  // DELETE THIS and nothing proves the security property this whole feature exists for: a
  // password changed because it was compromised would stop ending the holder's session, and the
  // suite would stay green while a stolen cookie kept working for up to 30 days.
  it("ends that user's session on the VERY NEXT request", async () => {
    const victim = await makeLoggedInUser();
    expect((await victim.agent.get('/api/auth/me')).status).toBe(200);

    const put = await adminApi.put(`/api/users/${victim.user.id}`).send({ password: 'Reset-Pass-2!' });
    expect(put.status).toBe(200);

    // The very next request — not after an expiry, not after a sweep.
    expect((await victim.agent.get('/api/auth/me')).status).toBe(401);
  });

  // DELETE THIS and the invalidation could become permanent-but-not-immediate (e.g. moved to the
  // 15-minute expiry sweep) without any test noticing.
  it('stays rejected on every following request', async () => {
    const victim = await makeLoggedInUser();
    await adminApi.put(`/api/users/${victim.user.id}`).send({ password: 'Reset-Pass-3!' });

    expect((await victim.agent.get('/api/auth/me')).status).toBe(401);
    expect((await victim.agent.get('/api/auth/me')).status).toBe(401);
    expect((await victim.agent.get('/api/users')).status).toBe(401);
  });

  // DELETE THIS and an over-broad invalidation — one that ends every session on the server, which
  // is the easiest way to implement this wrongly — would pass every other test in this file.
  it("leaves the acting admin's own session working", async () => {
    const victim = await makeLoggedInUser();
    await adminApi.put(`/api/users/${victim.user.id}`).send({ password: 'Reset-Pass-4!' });

    expect((await adminApi.get('/api/auth/me')).status).toBe(200);
  });

  // DELETE THIS and the same over-broad failure would go unnoticed for users who took no part in
  // the exchange at all — the bystander case, which no other test here covers.
  it('leaves an unrelated user untouched', async () => {
    const bystander = await makeLoggedInUser();
    const victim = await makeLoggedInUser();

    await adminApi.put(`/api/users/${victim.user.id}`).send({ password: 'Reset-Pass-5!' });

    expect((await bystander.agent.get('/api/auth/me')).status).toBe(200);
  });
});

describe('a user changes their OWN password', () => {
  // DELETE THIS and the self-lockout this block was written to fix comes straight back: an admin
  // who rotates their own password is logged out mid-task and nothing turns red. This is the
  // test the fix is FOR — see the sabotage note in reports/evolution/SESSION-INVALIDATE-1.md.
  it('keeps the session that made the request valid', async () => {
    const self = await makeLoggedInUser({ role: 'admin' });

    const put = await self.agent.put(`/api/users/${self.user.id}`).send({ password: 'Own-Pass-2!' });
    expect(put.status).toBe(200);

    expect((await self.agent.get('/api/auth/me')).status).toBe(200);
  });

  // DELETE THIS and the fix above could be "widened" into never invalidating anything on a
  // self-change, which is the whole point: the other sessions are exactly the ones a compromised
  // password is about.
  it('still ends every OTHER session of that same user', async () => {
    const self = await makeLoggedInUser({ role: 'admin' });
    const otherSession = await loginAgain(self.username, self.password);
    expect((await otherSession.get('/api/auth/me')).status).toBe(200);

    await self.agent.put(`/api/users/${self.user.id}`).send({ password: 'Own-Pass-3!' });

    expect((await otherSession.get('/api/auth/me')).status).toBe(401);
    expect((await self.agent.get('/api/auth/me')).status).toBe(200);
  });

  // DELETE THIS and the bystander case is unprotected on the self-change path specifically — the
  // path that writes to a session, and so the one most able to disturb someone else's.
  it('leaves an unrelated user untouched', async () => {
    const bystander = await makeLoggedInUser();
    const self = await makeLoggedInUser({ role: 'admin' });

    await self.agent.put(`/api/users/${self.user.id}`).send({ password: 'Own-Pass-4!' });

    expect((await bystander.agent.get('/api/auth/me')).status).toBe(200);
  });

  // DELETE THIS and the re-stamp could start firing on updates that changed no password at all,
  // quietly re-validating a session that some other change had invalidated.
  it('a role-only update does not touch sessions', async () => {
    const target = await makeLoggedInUser({ role: 'operator' });
    expect((await target.agent.get('/api/auth/me')).status).toBe(200);

    const put = await adminApi.put(`/api/users/${target.user.id}`).send({ role: 'admin' });
    expect(put.status).toBe(200);

    // No password changed ⇒ no epoch bump ⇒ the session survives.
    expect((await target.agent.get('/api/auth/me')).status).toBe(200);
  });
});
