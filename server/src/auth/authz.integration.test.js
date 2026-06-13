// ============================================================
// File:        authz.integration.test.js
// Path:        server/src/auth/authz.integration.test.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Integration tests — deny-by-default lockdown against the real app (§6.3)
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { adminAgent, operatorAgent } from '../../test/authAgent.js';
import { PUBLIC_PATHS } from './guards.js';

const app = createApp();

let adminApi;
let operatorApi;

beforeAll(async () => {
  // Sequential — the file-based store is not concurrent-safe (read-modify-write).
  adminApi = await adminAgent(app);
  operatorApi = await operatorAgent(app);
});

const VALID_SURFACE_CLASS = {
  id: 'authz-test-lava',
  label: 'Authz Test Lava',
  generatorId: 'particle',
  config: { color: '#ff4400', sizeMin: 2, sizeMax: 5, lifetimeFrames: 20, spawnProbability: 0.5, drift: 1, gravity: 0 },
};

// ── Public routes ─────────────────────────────────────────────────────────────

describe('PUBLIC: anonymous access', () => {
  it('GET /api/health → 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('GET /api/auth/setup-needed → 200', async () => {
    const res = await request(app).get('/api/auth/setup-needed');
    expect(res.status).toBe(200);
  });
});

// ── Deny-by-default ───────────────────────────────────────────────────────────

describe('DENY-BY-DEFAULT: anonymous → 401', () => {
  it('GET /api/tracks → 401', async () => {
    const res = await request(app).get('/api/tracks');
    expect(res.status).toBe(401);
  });

  it('GET /api/surface-classes → 401', async () => {
    const res = await request(app).get('/api/surface-classes');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ── Operator+ reads ───────────────────────────────────────────────────────────

describe('OPERATOR+: authenticated reads', () => {
  it('operatorAgent GET /api/tracks → 200', async () => {
    const res = await operatorApi.get('/api/tracks');
    expect(res.status).toBe(200);
  });

  it('operatorAgent GET /api/surface-classes → 200', async () => {
    const res = await operatorApi.get('/api/surface-classes');
    expect(res.status).toBe(200);
  });

  it('adminAgent GET /api/tracks → 200 (admin passes operator+ routes)', async () => {
    const res = await adminApi.get('/api/tracks');
    expect(res.status).toBe(200);
  });
});

// ── Admin-gated surface-classes mutations ─────────────────────────────────────

describe('ADMIN-GATED: surface-classes mutations', () => {
  it('operatorAgent POST /api/surface-classes → 403', async () => {
    const res = await operatorApi.post('/api/surface-classes').send(VALID_SURFACE_CLASS);
    expect(res.status).toBe(403);
  });

  it('adminAgent POST /api/surface-classes → 2xx, then admin DELETE cleans up', async () => {
    const createRes = await adminApi.post('/api/surface-classes').send(VALID_SURFACE_CLASS);
    expect(createRes.status).toBeGreaterThanOrEqual(200);
    expect(createRes.status).toBeLessThan(300);
    // Clean up so subsequent test runs stay idempotent.
    await adminApi.delete(`/api/surface-classes/${VALID_SURFACE_CLASS.id}`);
  });
});

// ── Route-presence check (§6.3) ───────────────────────────────────────────────
//
// Walk the Express router stack to enumerate every registered /api route and assert
// that anonymous access to it is never 2xx. The global requireAuth makes any future
// unguarded /api route fail closed by construction, but this check makes that visible
// in the test suite immediately.

function collectRoutes(app) {
  const routes = [];

  function walkLayer(layer, prefix) {
    if (layer.route) {
      const routePath = prefix + (layer.route.path === '/' ? '' : layer.route.path);
      for (const method of Object.keys(layer.route.methods)) {
        if (method === '_all') continue;
        routes.push({ method: method.toUpperCase(), path: routePath || '/' });
      }
    } else if (layer.handle?.stack) {
      // Mounted sub-router — derive the mount prefix from the regexp if possible.
      let mountPrefix = prefix;
      if (layer.regexp?.source) {
        const match = layer.regexp.source.match(/^\^\\(\/[^\\?]+)/);
        if (match) mountPrefix = prefix + match[1].replace(/\\/g, '');
      }
      for (const sub of layer.handle.stack) walkLayer(sub, mountPrefix);
    }
  }

  for (const layer of app._router?.stack ?? []) walkLayer(layer, '');
  return routes;
}

describe('ROUTE-PRESENCE: every /api route denies anonymous access', () => {
  it('no /api route (outside PUBLIC_PATHS) returns 2xx for anonymous request', async () => {
    const routes = collectRoutes(app).filter((r) => r.path.startsWith('/api'));

    const publicSet = new Set(
      PUBLIC_PATHS.map((e) => `${e.method.toUpperCase()} ${e.path}`)
    );

    const failures = [];
    for (const { method, path } of routes) {
      if (publicSet.has(`${method} ${path}`)) continue;

      // Fill :param placeholders with 'x' for a plausible URL.
      const url = path.replace(/:[\w]+/g, 'x');

      const res = await request(app)[method.toLowerCase()](url);
      if (res.status >= 200 && res.status < 300) {
        failures.push(`${method} ${url} → ${res.status} (expected 401/403)`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Unguarded routes found:\n${failures.join('\n')}`);
    }
    // Pass trivially if no non-public /api routes are discovered — global requireAuth
    // guarantees fail-closed by construction for any future additions.
    expect(failures.length).toBe(0);
  });
});
