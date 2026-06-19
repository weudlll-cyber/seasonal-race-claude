// ============================================================
// File:        authAgent.js
// Path:        server/test/authAgent.js
// Project:     RaceArena
// Description: Logged-in supertest agent helper for route integration tests
// ============================================================

import request from 'supertest';
import defaultStore from '../src/auth/usersStore.js';

// Ensures a user with the given role exists in the default store (the same instance the auth
// router uses, bound to RA_USERS_DB), then logs in and returns a cookie-carrying agent.
async function loginAgent(app, { username, password, role }) {
  try {
    await defaultStore.createUser({ username, password, role, createdBy: 'setup' });
  } catch (e) {
    if (e.code !== 'USERNAME_TAKEN') throw e;  // already seeded by a prior file — fine
  }
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username, password });
  if (res.status !== 200) throw new Error(`loginAgent: login failed (${res.status})`);
  return agent;
}

export const adminAgent = (app) =>
  loginAgent(app, { username: 'testadmin', password: 'testpass123', role: 'admin' });

export const operatorAgent = (app) =>
  loginAgent(app, { username: 'testoperator', password: 'testpass123', role: 'operator' });
