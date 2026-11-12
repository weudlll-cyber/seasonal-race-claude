// ============================================================
// File:        basePath.integration.test.js
// Path:        server/src/basePath.integration.test.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 2
// Created:     2026-11-11
// Description: The real app, through HTTP, at "/" and at "/games/race" (RA_BASE_PATH). What an
//              HTTP caller receives is the question, so nothing here reaches into a module:
//                · at "/": today's answers — the API, the shell with <base href="/"> and the old
//                  marker, the cookie at Path=/;
//                · under the base: the API, the shell (deep link too), the assets and sign-in all
//                  answer below it, the shell's <base href> and marker carry it, the cookie is
//                  scoped to it, the CSP hash still admits the marker, and everything OUTSIDE it
//                  is a 404.
//              Each mode imports app.js afresh with its own environment (`vi.resetModules`),
//              because the base path, the client build and the session middleware are read when
//              the module is loaded — exactly as in a real process.
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

const SHELL =
  '<!doctype html><html><head><base href="/" /><title>t</title></head><body>APP SHELL</body></html>';
let dist;

beforeAll(() => {
  dist = mkdtempSync(join(os.tmpdir(), 'ra-basepath-'));
  writeFileSync(join(dist, 'index.html'), SHELL);
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(dist, 'assets', 'app.js'), 'export const x = 1;\n');
});
afterAll(() => {
  rmSync(dist, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

/** A fresh app (and its own users store module) for one environment. */
async function loadApp(basePath) {
  vi.resetModules();
  vi.stubEnv('RA_CLIENT_DIST', dist);
  vi.stubEnv('RA_BASE_PATH', basePath);
  const { createApp } = await import('./app.js');
  const { default: store } = await import('./auth/usersStore.js');
  const { FOUNDING_TEAM } = await import('./auth/teams.js');
  return { app: createApp(), store, FOUNDING_TEAM };
}

/** Sign in as a fresh operator under `prefix`; returns the agent and the login response. */
async function signIn({ app, store, FOUNDING_TEAM }, prefix) {
  const username = `ra-bp-${randomUUID().slice(0, 12)}`;
  await store.createUser({
    username,
    password: 'testpass123',
    role: 'operator',
    team: FOUNDING_TEAM,
    allowNewTeam: true,
    createdBy: 'setup',
  });
  const agent = request.agent(app);
  const res = await agent
    .post(`${prefix}/api/auth/login`)
    .send({ username, password: 'testpass123' });
  return { agent, res };
}

describe('at "/" (RA_BASE_PATH unset) — today, unchanged', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await loadApp('');
  });

  it('the API and the shell answer at the root, with the old marker and <base href="/">', async () => {
    expect((await request(ctx.app).get('/api/health')).status).toBe(200);
    const shell = await request(ctx.app).get('/setup').set('Accept', 'text/html');
    expect(shell.status).toBe(200);
    expect(shell.text).toContain('<base href="/" />');
    expect(shell.text).toContain('{"apiBaseUrl":""}');
    expect(shell.text).not.toContain('basePath');
  });

  it('the session cookie is scoped to Path=/ under its old name', async () => {
    const { res } = await signIn(ctx, '');
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/(^|;)ra\.sid=/);
    expect(cookie).toMatch(/Path=\/(;|$)/);
  });
});

describe('under "/games/race" (RA_BASE_PATH=/games/race)', () => {
  const BASE = '/games/race';
  let ctx;
  beforeAll(async () => {
    ctx = await loadApp(BASE);
  });

  it('the API answers below the base path, and not at the root', async () => {
    expect((await request(ctx.app).get(`${BASE}/api/health`)).status).toBe(200);
    expect((await request(ctx.app).get('/api/health')).status).toBe(404);
  });

  it('★ everything outside the base path is a 404, not the app', async () => {
    for (const path of ['/', '/setup', '/games', '/games/racex/setup', '/assets/app.js']) {
      const res = await request(ctx.app).get(path).set('Accept', 'text/html');
      expect(res.status, path).toBe(404);
      expect(res.text, path).not.toContain('APP SHELL');
    }
  });

  it('the shell — at the base and at a deep link — carries the base in <base href> and the marker', async () => {
    for (const path of [`${BASE}/`, `${BASE}/setup`, `${BASE}/join/abc`]) {
      const res = await request(ctx.app).get(path).set('Accept', 'text/html');
      expect(res.status, path).toBe(200);
      expect(res.text).toContain('<base href="/games/race/" />');
      expect(res.text).toContain('{"apiBaseUrl":"/games/race","basePath":"/games/race"}');
    }
  });

  it('the CSP admits exactly the marker this page carries', async () => {
    const { runtimeConfigScriptHash } = await import('./runtimeConfig.js');
    const res = await request(ctx.app).get(`${BASE}/setup`).set('Accept', 'text/html');
    expect(res.headers['content-security-policy']).toContain(runtimeConfigScriptHash(null, BASE));
  });

  it('assets are served below the base path, and a missing one is a 404', async () => {
    const asset = await request(ctx.app).get(`${BASE}/assets/app.js`);
    expect(asset.status).toBe(200);
    expect(asset.text).toContain('export const x');
    expect((await request(ctx.app).get(`${BASE}/assets/gone.js`)).status).toBe(404);
  });

  it('sign-in works below the base path; the cookie is scoped to it; sign-out clears it there', async () => {
    const { agent, res } = await signIn(ctx, BASE);
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/Path=\/games\/race(;|$)/);
    expect((await agent.get(`${BASE}/api/auth/me`)).status).toBe(200);
    const out = await agent.post(`${BASE}/api/auth/logout`);
    expect(out.status).toBe(200);
    expect(out.headers['set-cookie'].join(';')).toMatch(/Path=\/games\/race(;|$)/);
    expect((await agent.get(`${BASE}/api/auth/me`)).status).toBe(401);
  });
});
