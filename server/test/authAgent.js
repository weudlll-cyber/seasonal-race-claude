// ============================================================
// File:        authAgent.js
// Path:        server/test/authAgent.js
// Project:     RaceArena
// Description: Logged-in supertest agent helper for route integration tests.
//
//              ── EVERY CALL MINTS ITS OWN USER (TEST-ACCOUNTS-1) ─────────────────────────────
//
//              This helper used to log in as ONE record — `testadmin` — for every file that
//              needed an admin. Eight test files did, against one users store, and the store is
//              not the only thing they shared: they shared a ROW. An assertion about that row was
//              therefore an assertion about what the other seven files happened to have done to
//              it, and the store's global properties ("there is exactly one admin") were nobody's
//              to state.
//
//              It had already produced two failures, and one instance was still live when this
//              was written: `sessionInvalidation.test.js` creates three admins and promotes a
//              fourth, while `users.integration.test.js` asserts that demoting its admin returns
//              409 BECAUSE it is the only one. Those two statements cannot both be true of one
//              store, and which of them held came down to file order.
//
//              So there is no shared record any more. Each call creates a user of its own with a
//              name no other call can produce, and hands back an agent logged in as that user.
//              `USERNAME_TAKEN` is no longer caught, deliberately: with unique names it would
//              mean the name generator had failed, and swallowing it would hide exactly that.
//
//              The user record is attached to the agent as `agent.raUser`, so a test that needs
//              to name its own account — to delete it, demote it, or find it in a list — asks the
//              agent rather than a literal. A literal is how the coupling above got written.
//
//              THE OTHER HALF OF THE FIX IS IN test/env-setup.js: the users store is now per test
//              FILE rather than per process, so "the users this file created" and "every user in
//              the store" are the same set. Neither half is sufficient alone — unique names in a
//              shared store still leave the admin COUNT global, and a per-file store still leaves
//              a fixed name to collide on if a file ever seeds twice.
// ============================================================

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import defaultStore from '../src/auth/usersStore.js';

/** A name no other call can produce, in any file, in any order, in any process. */
const uniqueName = (role) => `ra-${role}-${randomUUID().slice(0, 12)}`;

// Creates a user with the given role in the default store (the same instance the auth router
// uses, bound to RA_USERS_DB), then logs in and returns a cookie-carrying agent.
async function loginAgent(app, { role }) {
  const username = uniqueName(role);
  // A fixed password is fine and is NOT shared state: it is never a lookup key, and the record it
  // belongs to exists only for this call.
  const password = 'testpass123';
  const user = await defaultStore.createUser({ username, password, role, createdBy: 'setup' });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username, password });
  if (res.status !== 200) throw new Error(`loginAgent: login failed (${res.status})`);
  // The caller's own account, so a test never has to name it by a literal. `password` is here
  // because a session-invalidation test has to log the SAME user in a second time.
  agent.raUser = { ...user, password };
  return agent;
}

export const adminAgent = (app) => loginAgent(app, { role: 'admin' });

export const operatorAgent = (app) => loginAgent(app, { role: 'operator' });
