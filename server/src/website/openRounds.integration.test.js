// ============================================================
// File:        openRounds.integration.test.js
// Path:        server/src/website/openRounds.integration.test.js
// Project:     RaceArena — WEBSITE-EXTRAS-1 piece 7a (OWNER-4)
// Created:     2026-11-12
// Description: GET <base>/api/public/open-rounds and "Show on the website", on the real app in
//              website mode under /games/race (members signed in through <base>/auth/website,
//              supertest connecting from 127.0.0.1, the trusted network here):
//                · no session needed; Cache-Control max-age=30; version 1;
//                · an unmarked, a closed-early and an expired registration do not appear;
//                · a marked open one appears with EXACTLY the website's eight fields, and no
//                  name, entry id, external id, team or internal id anywhere in the answer;
//                · the director's create stores it SHOWN unless unticked (the owner's decision of
//                  2026-11-13, the form's default too); the toggle works while
//                  open, is refused when closed, and another team's registration is not found;
//                · standalone: the endpoint and the toggle answer the API's own 404.
//              The website's contract: seasonal-entertainment docs/OPEN-ROUNDS.md (the morning
//              sheet has the lines).
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
const ENDPOINT = `${BASE}/api/public/open-rounds`;
// The contract's keys (docs/OPEN-ROUNDS.md:23-31), and nothing else.
const ROUND_KEYS = [
  'id',
  'title',
  'kind',
  'startsAt',
  'signupClosesAt',
  'players',
  'maxPlayers',
  'joinUrl',
].sort();
let dir, app, registrations, storeModule;

beforeAll(async () => {
  dir = mkdtempSync(join(os.tmpdir(), 'ra-open-rounds-'));
  const secretFile = join(dir, 'proxy-secret');
  const tokenFile = join(dir, 'sync-token');
  writeFileSync(secretFile, SECRET, { mode: 0o600 });
  writeFileSync(tokenFile, randomBytes(24).toString('base64url'), { mode: 0o600 });
  vi.resetModules();
  vi.stubEnv('RA_MODE', 'website');
  vi.stubEnv('RA_BASE_PATH', BASE);
  vi.stubEnv('RA_PUBLIC_ORIGIN', 'https://site.example');
  vi.stubEnv('RA_WEBSITE_PROXY_SECRET_FILE', secretFile);
  vi.stubEnv('RA_WEBSITE_TRUSTED_PROXIES', '127.0.0.1/32, ::1');
  vi.stubEnv('RA_WEBSITE_FEED_URL', 'http://127.0.0.1:9');
  vi.stubEnv('RA_WEBSITE_SYNC_TOKEN_FILE', tokenFile);
  const { createApp } = await import('../app.js');
  ({ getDefaultRegistrationStore: registrations } = await import('../routes/registrations.js'));
  storeModule = await import('../registrations/registrationStore.js');
  app = createApp();
});
afterAll(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

/** A registration opened in website mode, straight through the app's own store. */
function open({ show, team = TEAM, eventName = null, minutes = 10 } = {}) {
  return registrations().create({
    team,
    createdBy: 'website:host',
    trackId: 'dirt-oval',
    trackName: 'Dirt Oval',
    capacity: 5,
    eventName,
    closesAt: new Date(Date.now() + minutes * 60_000).toISOString(),
    websiteAccess: 'members',
    showOnWebsite: show,
  });
}

/** An agent signed in through the website as one fake member. */
async function as(kind, id = `${kind}-${randomUUID().slice(0, 8)}`, name = `Fake ${kind}`) {
  const agent = request.agent(app);
  const res = await agent.get(`${BASE}/auth/website`).set({
    'X-Ra-Proxy-Secret': SECRET,
    'X-Acting-User-Id': id,
    'X-Acting-User': name,
    'X-Acting-User-Roles': 'member',
    'X-Acting-User-Can-Host': kind === 'host' ? 'true' : 'false',
  });
  expect(res.status).toBe(303);
  return agent;
}

const roundsNow = async () => (await request(app).get(ENDPOINT)).body.rounds;
const codes = (rounds) => rounds.map((r) => r.id);

describe('website mode: GET <base>/api/public/open-rounds', () => {
  it('★ public, no session; Cache-Control max-age=30; version 1', async () => {
    const res = await request(app).get(ENDPOINT);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=30');
    expect(res.body.version).toBe(1);
    expect(Array.isArray(res.body.rounds)).toBe(true);
  });

  it("★ a marked open registration appears with exactly the website's fields", async () => {
    const reg = open({ show: true, eventName: 'Spring Cup' });
    // A member joins, so the answer has a name it must NOT carry.
    const mia = await as('member', `mia-${randomUUID().slice(0, 6)}`, 'Mia Secretname');
    expect((await mia.post(`${BASE}/api/join/${reg.code}`).send({})).status).toBe(201);

    const res = await request(app).get(ENDPOINT);
    expect(Object.keys(res.body).sort()).toEqual(['rounds', 'version']);
    const round = res.body.rounds.find((r) => r.id === reg.code);
    expect(round).toBeDefined();
    expect(Object.keys(round).sort()).toEqual(ROUND_KEYS);
    expect(round).toEqual({
      id: reg.code,
      title: 'Spring Cup — Dirt Oval',
      kind: 'Seasonal Race',
      startsAt: null,
      signupClosesAt: reg.closesAt,
      players: 1,
      maxPlayers: 5,
      joinUrl: `https://site.example${BASE}/join/${reg.code}`,
    });
    expect(round.signupClosesAt).toMatch(/Z$/);
    // No name, entry id, external id, team or internal id anywhere in the answer.
    const entry = registrations().get(reg.id, TEAM).entries[0];
    const text = JSON.stringify(res.body);
    for (const secret of ['Mia Secretname', entry.id, entry.externalId, reg.id, TEAM]) {
      expect(text).not.toContain(secret);
    }
  });

  it('★ an unmarked, a closed-early and an expired registration do not appear', async () => {
    const unmarked = open({ show: false });
    const closed = open({ show: true });
    registrations().close(closed.id, TEAM);
    // Expired: opened through a second handle on the same file whose clock runs two hours behind,
    // so its one-hour deadline is already past by the real clock.
    const behind = storeModule.createRegistrationStore(storeModule.REGISTRATIONS_DB_PATH, {
      now: () => Date.now() - 2 * 60 * 60_000,
    });
    const expired = behind.create({
      team: TEAM,
      createdBy: 'website:host',
      trackId: 'dirt-oval',
      trackName: 'Dirt Oval',
      capacity: 5,
      closesAt: new Date(Date.now() - 60 * 60_000).toISOString(),
      websiteAccess: 'members',
      showOnWebsite: true,
    });
    behind.closeDatabase();
    const listed = codes(await roundsNow());
    for (const reg of [unmarked, closed, expired]) expect(listed).not.toContain(reg.code);
  });

  it("a title is cut to the contract's 80 characters; the track alone without an event name", async () => {
    const long = open({ show: true, eventName: 'L'.repeat(100) });
    const plain = open({ show: true });
    const rounds = await roundsNow();
    expect(rounds.find((r) => r.id === long.code).title).toHaveLength(80);
    expect(rounds.find((r) => r.id === plain.code).title).toBe('Dirt Oval');
  });
});

describe('website mode: "Show on the website"', () => {
  async function trackIdFor(host) {
    const trackId = (await host.get(`${BASE}/api/tracks`)).body[0]?.id;
    expect(trackId).toBeTruthy();
    return trackId;
  }

  it("★ the director's create stores it SHOWN unless unticked", async () => {
    const host = await as('host');
    const trackId = await trackIdFor(host);
    const closesAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const plain = await host
      .post(`${BASE}/api/registrations`)
      .send({ trackId, capacity: 4, closesAt });
    expect(plain.status).toBe(201);
    expect(plain.body.showOnWebsite).toBe(true);
    const unticked = await host
      .post(`${BASE}/api/registrations`)
      .send({ trackId, capacity: 4, closesAt, showOnWebsite: false });
    expect(unticked.body.showOnWebsite).toBe(false);
    const listed = codes(await roundsNow());
    expect(listed).toContain(plain.body.code);
    expect(listed).not.toContain(unticked.body.code);
    const bad = await host
      .post(`${BASE}/api/registrations`)
      .send({ trackId, capacity: 4, closesAt, showOnWebsite: 'yes' });
    expect(bad.status).toBe(400);
  });

  it('★ toggling works while open, and the list follows', async () => {
    const host = await as('host');
    const reg = open({ show: false });
    const on = await host.post(`${BASE}/api/registrations/${reg.id}/website`).send({ show: true });
    expect(on.status).toBe(200);
    expect(on.body.showOnWebsite).toBe(true);
    expect(codes(await roundsNow())).toContain(reg.code);
    const off = await host
      .post(`${BASE}/api/registrations/${reg.id}/website`)
      .send({ show: false });
    expect(off.body.showOnWebsite).toBe(false);
    expect(codes(await roundsNow())).not.toContain(reg.code);
    expect(
      (await host.post(`${BASE}/api/registrations/${reg.id}/website`).send({ show: 1 })).status
    ).toBe(400);
  });

  it("★ team-scoped: another team's registration is not found, and nothing changes", async () => {
    const host = await as('host');
    const other = open({ show: false, team: 'Another Team' });
    const res = await host
      .post(`${BASE}/api/registrations/${other.id}/website`)
      .send({ show: true });
    expect(res.status).toBe(404);
    expect(registrations().get(other.id, 'Another Team').showOnWebsite).toBe(false);
  });

  it('a closed registration refuses the toggle (409)', async () => {
    const host = await as('host');
    const reg = open({ show: false });
    registrations().close(reg.id, TEAM);
    const res = await host.post(`${BASE}/api/registrations/${reg.id}/website`).send({ show: true });
    expect(res.status).toBe(409);
  });

  it('a member without "may host" cannot toggle (no director API)', async () => {
    const mia = await as('member');
    const reg = open({ show: false });
    const res = await mia.post(`${BASE}/api/registrations/${reg.id}/website`).send({ show: true });
    expect(res.status).toBe(401);
  });
});

describe('standalone: neither exists', () => {
  let standalone;
  beforeAll(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const { createApp } = await import('../app.js');
    standalone = createApp();
  });

  it("★ GET /api/public/open-rounds answers the API's own 404", async () => {
    const res = await request(standalone).get('/api/public/open-rounds');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no such API route/);
  });
});
