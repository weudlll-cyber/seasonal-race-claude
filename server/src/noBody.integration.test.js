// ============================================================
// File:        noBody.integration.test.js
// Path:        server/src/noBody.integration.test.js
// Project:     RaceArena — A7-03 piece 4, Express 5 (2026-10-19)
// Description: A request that carries NO body is answered exactly as one carrying an empty JSON
//              object `{}` — by every route that reads a body, and never with a 5xx. Against the
//              real app, as an admin, so the guards let it through to the route.
//
// Express 5 leaves `req.body` undefined when no parser read a body (Express 4 gave `{}`). Six
// routes then read a field of `undefined` and answered 500; `app.js` restores the `{}` they were
// written to. Every test here sends a request with no body and no Content-Type at all, which is
// the case no other test sends (they all post a body), and compares it with the same request
// carrying `{}`: Express 4's answer to both. Most routes refuse it with their own 400 naming what is
// missing; `PUT /api/settings/legal-pages` answers 200, because leaving a text out keeps it
// (settings/legalPages.js) — a change of nothing, by its own contract.
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from './app.js';
import { adminAgent } from '../test/authAgent.js';

const app = createApp();
let admin;

beforeAll(async () => {
  admin = await adminAgent(app);
});

/** Every route that reads a JSON body, by method and a path that reaches its handler. */
const ROUTES = [
  ['post', '/api/auth/login'],
  ['post', '/api/auth/change-password'],
  ['post', '/api/users'],
  ['put', '/api/users/nobody'],
  ['post', '/api/tracks'],
  ['put', '/api/tracks/nobody'],
  ['post', '/api/player-groups'],
  ['put', '/api/player-groups/nobody'],
  ['post', '/api/brands'],
  ['put', '/api/brands/nobody'],
  ['post', '/api/racers'],
  ['put', '/api/racers/nobody'],
  ['post', '/api/surface-classes'],
  ['put', '/api/surface-classes/nobody'],
  ['post', '/api/races'],
  ['put', '/api/races/evaluation/points-rule'],
  ['put', '/api/settings/legal-pages'],
];

describe('no body at all: answered as `{}`, never a 5xx', () => {
  for (const [method, path] of ROUTES) {
    it(`${method.toUpperCase()} ${path}`, async () => {
      const none = await admin[method](path);
      const empty = await admin[method](path).send({});
      expect(none.status).toBeLessThan(500);
      expect(none.status).toBe(empty.status);
      expect(none.body).toEqual(empty.body);
    });
  }
});
