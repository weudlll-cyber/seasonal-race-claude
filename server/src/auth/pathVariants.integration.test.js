// ============================================================
// File:        pathVariants.integration.test.js
// Path:        server/src/auth/pathVariants.integration.test.js
// Project:     RaceArena — A7-03 piece 4, Express 5 (2026-10-19)
// Description: No SPELLING of a guarded path gets past the guards, against the real app.
//
// The guards judge a request by one normalised path (`normalizePath` in guards.js: lower case, one
// trailing slash dropped; `utils/apiPath.js`), while the ROUTER matches with its own rules —
// path-to-regexp 8 under Express 5, a rewrite of the matcher Express 4 used. Wherever the two
// disagree, a request the router serves is judged as some other path by the guards; that is the
// shape of the case bypass AUDIT-1 A5M-01 fixed (`caseBypass.integration.test.js`). This walks the
// other spellings a router and a guard could read differently — doubled and trailing slashes,
// percent-encoding, dot segments, matrix parameters, a query string — and requires each to be
// refused as its plain form is: never a 2xx for an anonymous caller, never a 2xx for an operator on
// an admin-only route. A 404 is a refusal too (the router did not serve it).
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { operatorAgent } from '../../test/authAgent.js';

const app = createApp();
let operatorApi;

beforeAll(async () => {
  operatorApi = await operatorAgent(app);
});

/** Spellings of one path a router and a guard could read differently. */
const spellings = (base) => {
  const [, root, rest] = /^(\/api)\/(.*)$/.exec(base);
  const [first, ...more] = rest.split('/');
  const tail = more.length ? `/${more.join('/')}` : '';
  return [
    `${base}/`,
    `${base}//`,
    `${root}//${rest}`,
    `${root}/./${rest}`,
    `${base}/.`,
    `${root}/%${first.charCodeAt(0).toString(16)}${first.slice(1)}${tail}`, // first letter encoded
    `${base}%2F`,
    `${base};x=1`,
    `${base}?x=1`,
    `${root.toUpperCase()}/${rest}/`,
  ];
};

describe('anonymous: no spelling of a signed-in route answers 2xx', () => {
  for (const base of ['/api/users', '/api/tracks', '/api/races', '/api/settings/test-aids']) {
    for (const path of spellings(base)) {
      it(`GET ${path} → refused`, async () => {
        const res = await request(app).get(path).set('Accept', 'application/json');
        expect([401, 404]).toContain(res.status);
      });
    }
  }

  it('POST to a spelling of /api/users creates nothing', async () => {
    for (const path of spellings('/api/users')) {
      const res = await request(app)
        .post(path)
        .send({ username: 'spelling-bypass', password: 'x'.repeat(16), role: 'admin' });
      expect([401, 403, 404], `POST ${path}`).toContain(res.status);
    }
  });
});

describe('operator: no spelling of an admin-only route answers 2xx', () => {
  for (const [method, base, body] of [
    ['get', '/api/users'],
    ['get', '/api/admin/status'],
    ['put', '/api/settings/test-aids', { enabled: true }],
  ]) {
    for (const path of spellings(base)) {
      it(`${method.toUpperCase()} ${path} → refused`, async () => {
        const call = operatorApi[method](path);
        const res = body ? await call.send(body) : await call;
        expect([403, 404]).toContain(res.status);
      });
    }
  }
});
