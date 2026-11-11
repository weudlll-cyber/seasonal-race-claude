// ============================================================
// File:        websiteMode.integration.test.js
// Path:        server/src/website/websiteMode.integration.test.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3a
// Created:     2026-11-11
// Description: The real app in website mode under /games/race, through HTTP (supertest connects
//              from 127.0.0.1, which is what makes "the trusted peer" testable both ways):
//                · headers from a non-trusted peer, with a wrong secret, or on any other route are
//                  ignored;
//                · admin / host / member / guest each get what the mapping says, and nothing else;
//                · a host whose hosting right is revoked loses the director role on the next request;
//                · locked members are refused; returnTo cannot leave the base path;
//                · the race's own account doors answer 404;
//                · and standalone mode is untouched by any of it.
//              The proxy secret is generated per run, written to a temporary file and never printed.
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomBytes, randomUUID } from 'node:crypto';

const BASE = '/games/race';
const SECRET = randomBytes(24).toString('base64url');
let dir;
let secretFile;

beforeAll(() => {
  dir = mkdtempSync(join(os.tmpdir(), 'ra-website-'));
  secretFile = join(dir, 'proxy-secret');
  writeFileSync(secretFile, SECRET, { mode: 0o600 });
});
afterAll(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

/** A fresh app (and fresh module state) for one environment. */
async function loadApp(env) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { createApp } = await import('../app.js');
  const { getDefaultIdentityStore } = await import('./identityStore.js');
  const { default: users } = await import('../auth/usersStore.js');
  return { app: createApp(), identities: getDefaultIdentityStore(), users };
}

const websiteEnv = (trusted) => ({
  RA_MODE: 'website',
  RA_BASE_PATH: BASE,
  RA_WEBSITE_PROXY_SECRET_FILE: secretFile,
  RA_WEBSITE_TRUSTED_PROXIES: trusted,
});

/** The headers the website proxy sets for one fake member. */
function as(kind, id = `u-${randomUUID().slice(0, 8)}`) {
  const h = { 'X-Ra-Proxy-Secret': SECRET };
  if (kind === 'guest') return { ...h, 'X-Acting-Guest': 'true' };
  return {
    ...h,
    'X-Acting-User-Id': id,
    'X-Acting-User': `Fake ${kind}`,
    'X-Acting-User-Roles': kind === 'admin' ? 'member,admin' : 'member',
    'X-Acting-User-Email-Verified': 'true',
    'X-Acting-User-Can-Host': kind === 'host' ? 'true' : 'false',
  };
}

async function signIn(app, kind, id, query = '') {
  const agent = request.agent(app);
  const res = await agent.get(`${BASE}/auth/website${query}`).set(as(kind, id));
  return { agent, res };
}

describe('website mode, trusted peer (127.0.0.1)', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await loadApp(websiteEnv('127.0.0.1/32, ::1'));
  });

  it('★ a wrong secret is refused with no detail, and no session is made', async () => {
    const res = await request(ctx.app)
      .get(`${BASE}/auth/website`)
      .set({ ...as('admin'), 'X-Ra-Proxy-Secret': 'not-the-secret' });
    expect(res.status).toBe(403);
    expect(res.text).toBe('Forbidden');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('★ identity headers on any other route are ignored', async () => {
    const res = await request(ctx.app).get(`${BASE}/api/auth/me`).set(as('admin'));
    expect(res.status).toBe(401);
  });

  it('admin → a race admin, by an ordinary user record keyed website:<id>', async () => {
    const id = `adm-${randomUUID().slice(0, 8)}`;
    const { agent, res } = await signIn(ctx.app, 'admin', id);
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe(`${BASE}/`);
    const me = await agent.get(`${BASE}/api/auth/me`);
    expect(me.status).toBe(200);
    expect(me.body.role).toBe('admin');
    const record = ctx.users.readUsers().find((u) => u.websiteUserId === id);
    expect(record.username).toBe(`website:${id}`);
    expect(record.passwordHash).toBeNull();
    expect(record.team).toBe('Seasonal Entertainment');
    expect(record.displayName).toBe('Fake admin');
  });

  it('host → a race operator (a director): the registrations API answers', async () => {
    const { agent } = await signIn(ctx.app, 'host');
    const me = await agent.get(`${BASE}/api/auth/me`);
    expect(me.body.role).toBe('operator');
    expect((await agent.get(`${BASE}/api/registrations`)).status).toBe(200);
    // ...and an operator is still not an admin
    expect((await agent.get(`${BASE}/api/admin/status`)).status).toBe(403);
  });

  it('member → a player identity only: NO user record, no director API', async () => {
    const id = `mem-${randomUUID().slice(0, 8)}`;
    const { agent, res } = await signIn(ctx.app, 'member', id);
    expect(res.status).toBe(303);
    expect(ctx.users.readUsers().some((u) => u.websiteUserId === id)).toBe(false);
    expect(ctx.identities.get(id).mappedRole).toBe('player');
    expect((await agent.get(`${BASE}/api/auth/me`)).status).toBe(401);
    expect((await agent.get(`${BASE}/api/registrations`)).status).toBe(401);
  });

  it('guest → no identity at all; a signed-in browser is signed out by it', async () => {
    const { agent } = await signIn(ctx.app, 'host');
    expect((await agent.get(`${BASE}/api/auth/me`)).status).toBe(200);
    const res = await agent.get(`${BASE}/auth/website`).set(as('guest'));
    expect(res.status).toBe(303);
    expect((await agent.get(`${BASE}/api/auth/me`)).status).toBe(401);
  });

  it('★ a revoked host loses the director role on the next request', async () => {
    const id = `host-${randomUUID().slice(0, 8)}`;
    const { agent: laptop } = await signIn(ctx.app, 'host', id);
    expect((await laptop.get(`${BASE}/api/registrations`)).status).toBe(200);
    // The website takes the hosting right away; the member signs in again (another device).
    await signIn(ctx.app, 'member', id);
    // The laptop's director session ends on its very next request.
    expect((await laptop.get(`${BASE}/api/registrations`)).status).toBe(401);
  });

  it('a locked member is refused', async () => {
    const id = `lock-${randomUUID().slice(0, 8)}`;
    ctx.identities.setLocked(id, true);
    const { res } = await signIn(ctx.app, 'host', id);
    expect(res.status).toBe(403);
    expect(ctx.users.readUsers().some((u) => u.websiteUserId === id)).toBe(false);
  });

  it('returnTo stays under the base path; anything else goes to the base path', async () => {
    const ok = await signIn(
      ctx.app,
      'member',
      undefined,
      `?returnTo=${encodeURIComponent(`${BASE}/join/abc`)}`
    );
    expect(ok.res.headers.location).toBe(`${BASE}/join/abc`);
    const evil = await signIn(
      ctx.app,
      'member',
      undefined,
      '?returnTo=https%3A%2F%2Fevil.example%2F'
    );
    expect(evil.res.headers.location).toBe(`${BASE}/`);
  });

  it('★ the race’s own account doors answer 404 in website mode', async () => {
    const api = request(ctx.app);
    expect(
      (await api.post(`${BASE}/api/auth/login`).send({ username: 'a', password: 'b' })).status
    ).toBe(404);
    expect((await api.get(`${BASE}/api/auth/setup-needed`)).status).toBe(404);
    expect((await api.post(`${BASE}/api/auth/setup`).send({})).status).toBe(404);
    const { agent } = await signIn(ctx.app, 'admin');
    expect((await agent.get(`${BASE}/api/users`)).status).toBe(404);
    expect((await agent.post(`${BASE}/api/auth/change-password`).send({})).status).toBe(404);
  });
});

describe('website mode, peer NOT in the trusted network', () => {
  it('★ the right secret from the wrong peer is refused', async () => {
    const ctx = await loadApp(websiteEnv('10.0.0.0/8'));
    const res = await request(ctx.app).get(`${BASE}/auth/website`).set(as('admin'));
    expect(res.status).toBe(403);
    expect(res.text).toBe('Forbidden');
  });
});

describe('★ standalone mode is untouched', () => {
  it('no /auth/website route; identity headers change nothing; local sign-in and setup-needed answer', async () => {
    const ctx = await loadApp({});
    // Not a route: with a client build present it is a deep link into the app (the shell, 200), as
    // it always was; without one, a 404. Either way no sign-in happens — no redirect, no cookie.
    const res = await request(ctx.app).get('/auth/website').set(as('admin'));
    expect([200, 404]).toContain(res.status);
    expect(res.headers.location).toBeUndefined();
    expect(res.headers['set-cookie']).toBeUndefined();
    expect((await request(ctx.app).get('/api/auth/setup-needed')).status).toBe(200);
    const username = `ra-sa-${randomUUID().slice(0, 8)}`;
    const { FOUNDING_TEAM } = await import('../auth/teams.js');
    await ctx.users.createUser({
      username,
      password: 'testpass123',
      role: 'operator',
      team: FOUNDING_TEAM,
      allowNewTeam: true,
      createdBy: 'setup',
    });
    const login = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username, password: 'testpass123' });
    expect(login.status).toBe(200);
  });
});
