// ============================================================
// File:        deletedPlayer.integration.test.js
// Path:        server/src/website/deletedPlayer.integration.test.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 6 (OWNER-3)
// Created:     2026-11-11
// Description: "Deleted player" in past races through a SERVER-SIDE SIDE TABLE — the owner's
//              decision of 2026-11-11 — on the real app, in website mode under /games/race and then
//              in standalone (a second module instance over the same data folder):
//                · the stored race — its row, its roster and its content id — is the same bytes
//                  with and without the website racers beside it;
//                · a racer is masked only after a 'deleted' feed event for their member;
//                · two members with the same display name: only the deleted one is masked;
//                · a stored race of a deleted member still verifies identically (the replay);
//                · standalone stores no mapping and has no /deleted-racers.
//              The race for the verify test is made by the engine itself (scripts/lib/raceDriver.mjs,
//              as racesVerify.test.js does), so "identical" is a real replay, not a stub.
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomBytes, randomUUID } from 'node:crypto';
import { DATA_ROOT } from '../dataPaths.js';
import { createRaceStore } from '../races/raceStore.js';
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  DEFAULT_CONFIG_WORLD,
} from '../../../scripts/lib/raceDriver.mjs';

const BASE = '/games/race';
const SECRET = randomBytes(24).toString('base64url');
let dir, app, identities, registrations, applyFeedPage;

beforeAll(async () => {
  dir = mkdtempSync(join(os.tmpdir(), 'ra-deleted-player-'));
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
  ({ getDefaultIdentityStore: identities } = await import('./identityStore.js'));
  ({ getDefaultRegistrationStore: registrations } = await import('../routes/registrations.js'));
  ({ applyFeedPage } = await import('./accountFeed.js'));
  app = createApp();
});
afterAll(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

/** An agent signed in through the website: a member, a host (operator) or an admin. */
async function as(kind, id = `${kind}-${randomUUID().slice(0, 8)}`, name = `Fake ${kind}`) {
  const agent = request.agent(app);
  const res = await agent.get(`${BASE}/auth/website`).set({
    'X-Ra-Proxy-Secret': SECRET,
    'X-Acting-User-Id': id,
    'X-Acting-User': name,
    'X-Acting-User-Roles': kind === 'admin' ? 'admin' : 'member',
    'X-Acting-User-Can-Host': kind === 'host' ? 'true' : 'false',
  });
  expect(res.status).toBe(303);
  return agent;
}

/** One race body as the client sends it (raceHistory.toServerPayload), roster `names`. */
function aRace(names, overrides = {}) {
  return {
    clientRaceId: `race-${randomUUID()}`,
    finishedAt: '2026-11-11T18:00:00.000Z',
    identifierVersion: 1,
    buildId: 'abc1234',
    geometryId: 'dirt-oval',
    racerTypeId: 'horse',
    racePlanSeed: 4242,
    raceActionStage: 'wild',
    racePlanEnabled: true,
    targetLaps: 2,
    names,
    worldSchemaVersion: 2,
    worldConfigs: {},
    elapsedSec: 61,
    results: names.map((name, i) => ({ name, index: i })),
    winners: names.slice(0, 3),
    raceSource: 'race',
    ...overrides,
  };
}

/** The 'deleted' feed event for one member, applied as the poller applies a page (piece 3b). */
function feedDeletes(userId) {
  applyFeedPage(
    { identities: identities(), registrations: registrations() },
    { events: [{ type: 'deleted', userId }], cursor: `c-${randomUUID()}` }
  );
}

const deletedOf = async (agent, ...clientRaceIds) =>
  (await agent.get(`${BASE}/api/races/deleted-racers?clientRaceIds=${clientRaceIds.join(',')}`))
    .body.deleted;

/** The stored race's own bytes: its row without the random short key, and its roster. */
function storedBytes(dbPath, id) {
  const db = new Database(dbPath, { readonly: true });
  try {
    const { short_key: _key, ...row } = db.prepare('SELECT * FROM races WHERE id = ?').get(id);
    const roster = db.prepare('SELECT content FROM rosters WHERE id = ?').get(row.roster_id);
    return JSON.stringify({ row, roster });
  } finally {
    db.close();
  }
}

describe('website mode: "Deleted player" through the side table', () => {
  it('★ the stored race — row, roster, id — is the same bytes with and without the mapping', async () => {
    const mia = `mia-${randomUUID().slice(0, 6)}`;
    await as('member', mia, 'Mia Member');
    const host = await as('host');
    const body = aRace(['Mia Member', 'Hugo Host', 'Ada']);
    const res = await host
      .post(`${BASE}/api/races`)
      .send({ ...body, websiteRacers: [{ index: 0, websiteUserId: mia }] });
    expect(res.status).toBe(201);

    // The same race stored with NO mapping, in a fresh store, with the team the session stamps.
    const plainPath = join(dir, 'plain-races.sqlite');
    const plain = createRaceStore(plainPath);
    const plainId = plain.storeRace({ ...body, team: 'Seasonal Entertainment' }).id;
    plain.close();

    expect(res.body.id).toBe(plainId);
    expect(storedBytes(join(DATA_ROOT, 'races.sqlite'), res.body.id)).toBe(
      storedBytes(plainPath, plainId)
    );
    // ...and what the race GET answers carries no trace of it.
    const got = await host.get(`${BASE}/api/races/${res.body.shortKey}`);
    expect(JSON.stringify(got.body)).not.toContain(mia);
  });

  it('★ masking appears only after a deleted feed event, and a resend writes nothing twice', async () => {
    const mia = `mia-${randomUUID().slice(0, 6)}`;
    await as('member', mia, 'Mia Member');
    const host = await as('host');
    const body = {
      ...aRace(['Hugo Host', 'Mia Member']),
      websiteRacers: [{ index: 1, websiteUserId: mia }],
    };
    expect((await host.post(`${BASE}/api/races`).send(body)).status).toBe(201);
    expect((await host.post(`${BASE}/api/races`).send(body)).status).toBe(200);
    expect(await deletedOf(host, body.clientRaceId)).toEqual({});
    feedDeletes(mia);
    expect(await deletedOf(host, body.clientRaceId)).toEqual({ [body.clientRaceId]: [1] });
  });

  it('★ two members with the same display name: only the deleted one is masked', async () => {
    // One name twice in ONE race is refused (shared/playerNames.mjs), so they meet in two races.
    const samA = `sam-a-${randomUUID().slice(0, 6)}`;
    const samB = `sam-b-${randomUUID().slice(0, 6)}`;
    await as('member', samA, 'Sam Same');
    await as('member', samB, 'Sam Same');
    const host = await as('host');
    const first = {
      ...aRace(['Sam Same', 'Ada']),
      websiteRacers: [{ index: 0, websiteUserId: samA }],
    };
    const second = {
      ...aRace(['Bo', 'Sam Same']),
      websiteRacers: [{ index: 1, websiteUserId: samB }],
    };
    await host.post(`${BASE}/api/races`).send(first);
    await host.post(`${BASE}/api/races`).send(second);
    feedDeletes(samA);
    expect(await deletedOf(host, first.clientRaceId, second.clientRaceId)).toEqual({
      [first.clientRaceId]: [0],
    });
  });

  it('an unknown member, an index outside the roster and another team are not masked', async () => {
    const mia = `mia-${randomUUID().slice(0, 6)}`;
    await as('member', mia, 'Mia Member');
    const host = await as('host');
    const body = {
      ...aRace(['Mia Member', 'Ada']),
      websiteRacers: [
        { index: 0, websiteUserId: mia },
        { index: 1, websiteUserId: 'never-signed-in' },
        { index: 7, websiteUserId: mia },
      ],
    };
    await host.post(`${BASE}/api/races`).send(body);
    feedDeletes(mia);
    feedDeletes('never-signed-in');
    expect(await deletedOf(host, body.clientRaceId)).toEqual({ [body.clientRaceId]: [0] });
    // Team scope: every website member is in the website's one team, so another team is asked of
    // the store directly — it finds no website racer of this race.
    const store = createRaceStore(join(DATA_ROOT, 'races.sqlite'));
    try {
      expect(store.websiteRacersOf('Seasonal Entertainment', [body.clientRaceId])).toHaveLength(1);
      expect(store.websiteRacersOf('Another Team', [body.clientRaceId])).toEqual([]);
    } finally {
      store.close();
    }
  });

  it('★ a stored race of a deleted member still verifies identically (the replay)', async () => {
    const [geo] = loadTracks({ only: 'dirt-oval' });
    const names = ['Mia Member', 'Hugo Host', 'Ada', 'Bo', 'Cy', 'Di'];
    const identity = resolveIdentity({ racers: names.length, raceSeed: 11, roster: names });
    const race = buildRace(geo, identity, DEFAULT_CONFIG_WORLD.cameraConfig, DEFAULT_CONFIG_WORLD);
    runRace(race, identity, DEFAULT_CONFIG_WORLD.cameraConfig, () => true);
    const results = race.st.racers
      .filter((r) => r.finishRank != null)
      .sort((a, b) => a.finishRank - b.finishRank)
      .map((r) => ({ name: r.name, finishTimeMs: r.finishTimeMs, index: r.index }));

    const mia = `mia-${randomUUID().slice(0, 6)}`;
    await as('member', mia, 'Mia Member');
    const admin = await as('admin');
    const body = {
      ...aRace(names, {
        geometryId: geo.geometryId,
        racerTypeId: identity.racerType,
        racePlanSeed: 11,
        targetLaps: geo.defaultLaps,
        worldConfigs: DEFAULT_CONFIG_WORLD,
        results,
        winners: results.slice(0, 3).map((r) => r.name),
      }),
      websiteRacers: [{ index: 0, websiteUserId: mia }],
    };
    const stored = await admin.post(`${BASE}/api/races`).send(body);
    expect(stored.status).toBe(201);
    feedDeletes(mia);
    expect(await deletedOf(admin, body.clientRaceId)).toEqual({ [body.clientRaceId]: [0] });

    const verified = await admin.post(`${BASE}/api/races/${stored.body.shortKey}/verify`);
    expect(verified.body.error ?? null).toBeNull();
    expect(verified.status).toBe(200);
    expect(verified.body.identical).toBe(true);
    expect(verified.body.positions).toEqual({ match: names.length, of: names.length });
  }, 120_000);
});

describe('standalone: no mapping is stored, and there is no /deleted-racers', () => {
  let plainApp;
  beforeAll(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const { createApp } = await import('../app.js');
    plainApp = createApp();
  });

  it('★ a race sent WITH websiteRacers stores the race and no mapping row', async () => {
    // An id the identity store knows (signed in above, same data folder), so only the mode decides.
    const known = identities().deletedIds()[0];
    expect(known).toBeTruthy();
    const { default: users } = await import('../auth/usersStore.js');
    const username = `director-${randomUUID().slice(0, 6)}`;
    const password = randomBytes(12).toString('base64url');
    await users.createUser({
      team: 'Team Plain',
      allowNewTeam: true,
      username,
      password,
      role: 'operator',
      createdBy: 'setup',
    });
    const agent = request.agent(plainApp);
    expect((await agent.post('/api/auth/login').send({ username, password })).status).toBe(200);
    const body = { ...aRace(['Ada', 'Bo']), websiteRacers: [{ index: 0, websiteUserId: known }] };
    const res = await agent.post('/api/races').send(body);
    expect(res.status).toBe(201);

    const db = new Database(join(DATA_ROOT, 'races.sqlite'), { readonly: true });
    try {
      const rows = db
        .prepare('SELECT COUNT(*) AS n FROM race_website_racers WHERE race_id = ?')
        .get(res.body.id).n;
      expect(rows).toBe(0);
    } finally {
      db.close();
    }
    expect(
      (await agent.get(`/api/races/deleted-racers?clientRaceIds=${body.clientRaceId}`)).status
    ).toBe(404);
  });
});
