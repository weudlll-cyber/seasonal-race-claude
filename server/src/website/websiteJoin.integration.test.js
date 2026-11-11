// ============================================================
// File:        websiteJoin.integration.test.js
// Path:        server/src/website/websiteJoin.integration.test.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 4 (OWNER-1, OWNER-6)
// Created:     2026-11-11
// Description: Members join through the race's own join page — the real app in website mode under
//              /games/race, members signed in through <base>/auth/website (supertest connects from
//              127.0.0.1, the trusted network here):
//                · a member joins once, as their website name, and a second join is refused;
//                · a 'members' registration refuses a guest's typed name; 'anyone' accepts it;
//                · the director's view marks the entry as from the website, with the member's id;
//                · the director's create takes websiteAccess, defaulting to 'members'.
//              Standalone's join page is the existing join tests, run unchanged. Registrations are
//              made through the app's own store (the module instance the app uses).
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomBytes, randomUUID } from 'node:crypto';

const BASE = '/games/race';
const SECRET = randomBytes(24).toString('base64url');
const TEAM = 'Seasonal Entertainment';
let dir, app, registrations;

beforeAll(async () => {
  dir = mkdtempSync(join(os.tmpdir(), 'ra-website-join-'));
  const secretFile = join(dir, 'proxy-secret');
  const tokenFile = join(dir, 'sync-token');
  writeFileSync(secretFile, SECRET, { mode: 0o600 });
  writeFileSync(tokenFile, randomBytes(24).toString('base64url'), { mode: 0o600 });
  vi.resetModules();
  vi.stubEnv('RA_MODE', 'website');
  vi.stubEnv('RA_BASE_PATH', BASE);
  vi.stubEnv('RA_WEBSITE_PROXY_SECRET_FILE', secretFile);
  vi.stubEnv('RA_WEBSITE_TRUSTED_PROXIES', '127.0.0.1/32, ::1');
  vi.stubEnv('RA_WEBSITE_FEED_URL', 'http://127.0.0.1:9');
  vi.stubEnv('RA_WEBSITE_SYNC_TOKEN_FILE', tokenFile);
  const { createApp } = await import('../app.js');
  ({ getDefaultRegistrationStore: registrations } = await import('../routes/registrations.js'));
  app = createApp();
});
afterAll(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

function open(websiteAccess) {
  return registrations().create({
    team: TEAM,
    createdBy: 'website:host',
    trackId: 'dirt-oval',
    trackName: 'Dirt Oval',
    capacity: 5,
    eventName: null,
    closesAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    websiteAccess,
  });
}

/** An agent signed in through the website as one fake member (or a guest). */
async function as(kind, id = `${kind}-${randomUUID().slice(0, 8)}`, name = `Fake ${kind}`) {
  const agent = request.agent(app);
  const headers = { 'X-Ra-Proxy-Secret': SECRET };
  if (kind === 'guest') headers['X-Acting-Guest'] = 'true';
  else {
    Object.assign(headers, {
      'X-Acting-User-Id': id,
      'X-Acting-User': name,
      'X-Acting-User-Roles': 'member',
      'X-Acting-User-Can-Host': kind === 'host' ? 'true' : 'false',
    });
  }
  const res = await agent.get(`${BASE}/auth/website`).set(headers);
  expect(res.status).toBe(303);
  return agent;
}

describe('website mode: members join through the join page', () => {
  it('★ a member joins once, as their website name — a second join is refused', async () => {
    const reg = open('members');
    const mia = await as('member', `mia-${randomUUID().slice(0, 6)}`, 'Mia Member');
    const view = await mia.get(`${BASE}/api/join/${reg.code}`);
    expect(view.body.member).toEqual({ displayName: 'Mia Member' });
    expect(view.body.you).toBeNull();
    const first = await mia.post(`${BASE}/api/join/${reg.code}`).send({});
    expect(first.status).toBe(201);
    expect(first.body.you.name).toBe('Mia Member');
    const second = await mia.post(`${BASE}/api/join/${reg.code}`).send({});
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('ALREADY_REGISTERED');
    // ...and the page knows her by her account afterwards, not by a device cookie
    expect((await mia.get(`${BASE}/api/join/${reg.code}`)).body.you.name).toBe('Mia Member');
  });

  it('★ one entry per ACCOUNT: the same member from a second browser is refused too', async () => {
    const reg = open('members');
    const id = `ada-${randomUUID().slice(0, 6)}`;
    expect(
      (await (await as('member', id, 'Ada')).post(`${BASE}/api/join/${reg.code}`).send({})).status
    ).toBe(201);
    const other = await as('member', id, 'Ada');
    expect((await other.post(`${BASE}/api/join/${reg.code}`).send({})).status).toBe(409);
  });

  it('★ members only: a guest is shown the registration but their typed name is refused', async () => {
    const reg = open('members');
    const guest = await as('guest');
    const view = await guest.get(`${BASE}/api/join/${reg.code}`);
    expect(view.status).toBe(200);
    expect(view.body.websiteAccess).toBe('members');
    expect(view.body.member).toBeNull();
    const res = await guest.post(`${BASE}/api/join/${reg.code}`).send({ name: 'Walk-in' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MEMBERS_ONLY');
    expect(registrations().get(reg.id, TEAM).entries).toEqual([]);
  });

  it("★ 'anyone': a guest's typed name is accepted, as today", async () => {
    const reg = open('anyone');
    const guest = await as('guest');
    const res = await guest.post(`${BASE}/api/join/${reg.code}`).send({ name: 'Walk-in' });
    expect(res.status).toBe(201);
    expect(registrations().get(reg.id, TEAM).entries[0]).toMatchObject({
      name: 'Walk-in',
      source: 'public',
    });
  });

  it('the director sees the member entry as from the website, with the member id', async () => {
    const reg = open('members');
    const id = `bo-${randomUUID().slice(0, 6)}`;
    await (await as('member', id, 'Bo')).post(`${BASE}/api/join/${reg.code}`).send({});
    expect(registrations().get(reg.id, TEAM).entries[0]).toMatchObject({
      name: 'Bo',
      source: 'website',
      externalId: id,
    });
  });

  it("capacity, the deadline and the duplicate-name rule are the store's, unchanged", async () => {
    const reg = registrations().create({
      team: TEAM,
      createdBy: 'website:host',
      trackId: 'dirt-oval',
      trackName: 'Dirt Oval',
      capacity: 1,
      eventName: null,
      closesAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      websiteAccess: 'members',
    });
    expect(
      (await (await as('member', undefined, 'First')).post(`${BASE}/api/join/${reg.code}`).send({}))
        .status
    ).toBe(201);
    const full = await (await as('member', undefined, 'Second'))
      .post(`${BASE}/api/join/${reg.code}`)
      .send({});
    expect(full.status).toBe(409);
    expect(full.body.code).toBe('FULL');
  });

  it("the director's create takes websiteAccess, 'members' by default", async () => {
    const host = await as('host');
    // The track list comes from the install's data; take the first track it has.
    const tracks = await host.get(`${BASE}/api/tracks`);
    const trackId = tracks.body[0]?.id;
    expect(trackId).toBeTruthy();
    const closesAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const plain = await host
      .post(`${BASE}/api/registrations`)
      .send({ trackId, capacity: 4, closesAt });
    expect(plain.status).toBe(201);
    expect(plain.body.websiteAccess).toBe('members');
    const anyone = await host
      .post(`${BASE}/api/registrations`)
      .send({ trackId, capacity: 4, closesAt, websiteAccess: 'anyone' });
    expect(anyone.body.websiteAccess).toBe('anyone');
    const bad = await host
      .post(`${BASE}/api/registrations`)
      .send({ trackId, capacity: 4, closesAt, websiteAccess: 'everyone' });
    expect(bad.status).toBe(400);
  });
});
