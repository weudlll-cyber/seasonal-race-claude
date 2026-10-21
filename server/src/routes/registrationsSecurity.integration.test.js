// ============================================================
// File:        registrationsSecurity.integration.test.js
// Path:        server/src/routes/registrationsSecurity.integration.test.js
// Project:     RaceArena — REGISTRATION-1
// Created:     2026-10-21
// Description: The registration routes behind the REAL guard stack (createApp): a director route
//              without a session is refused 401 in every letter case, and a signed-in operator can
//              open one on an installed track — the store and the track records being the server's
//              own (RA_DATA_DIR, test/env-setup.js).
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { operatorAgent } from '../../test/authAgent.js';

const app = createApp();
const inMinutes = (m) => new Date(Date.now() + m * 60 * 1000).toISOString();

describe('the director routes need a session', () => {
  it('401 for every director route without one, in any letter case', async () => {
    const id = '00000000-0000-0000-0000-000000000000';
    const attempts = [
      ['get', '/api/registrations'],
      ['post', '/api/registrations'],
      ['get', `/api/registrations/${id}`],
      ['head', `/api/registrations/${id}`],
      ['post', `/api/registrations/${id}/close`],
      ['post', `/api/registrations/${id}/extend`],
      ['delete', `/api/registrations/${id}/entries/x`],
      ['delete', `/api/registrations/${id}`],
      ['get', '/API/Registrations'],
      ['post', '/api/REGISTRATIONS/'],
    ];
    for (const [method, path] of attempts) {
      const res = await request(app)[method](path);
      expect(res.status, `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });
});

describe('a signed-in operator', () => {
  // Signed in once, in the hook: a bcrypt sign-in inside the test body can outlast the 5 s test
  // timeout under the parallel suite.
  let agent;
  beforeAll(async () => {
    agent = await operatorAgent(app);
  });

  it('opens a registration on an installed track and reads it back', async () => {
    const res = await agent
      .post('/api/registrations')
      .send({ trackId: 'dirt-oval', capacity: 8, closesAt: inMinutes(5) });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ trackName: 'Dirt Oval', capacity: 8, state: 'open' });
    const back = await agent.get(`/api/registrations/${res.body.id}`);
    expect(back.status).toBe(200);
    expect((await agent.delete(`/api/registrations/${res.body.id}`)).status).toBe(204);
  });
});
