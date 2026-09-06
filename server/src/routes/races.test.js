// ============================================================
// File:        races.test.js
// Path:        server/src/routes/races.test.js
// Project:     RaceArena — RACE-SAVE-3
// Description: POST /api/races — the properties that matter, not CRUD coverage.
//
//              THREE THINGS ARE BEING PROVED HERE: the race is filed under the team from the
//              SESSION and the body cannot choose one; the same race arriving twice is stored once
//              and the second arrival is not an error; and a rejection says whether retrying could
//              ever help, because the client uses that to decide between keeping a race pending
//              forever and recording it as failed where a person can see it.
//
//              The store is a per-test SQLite file in the OS temp directory — the route's own
//              default store is never opened, so nothing here can write into the owner's data.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { operatorAgent } from '../../test/authAgent.js';
import { createApp } from '../app.js';
import { createRaceStore } from '../races/raceStore.js';
import { createRacesRouter } from './races.js';

const app = createApp();

// ── A second app whose /api/races is bound to a store we can read ────────────
//
// `createApp()` mounts the router with its default store, which would be a real file. Everything
// that needs to inspect what was stored mounts the SAME router factory over a temp store instead,
// behind the same guard stack, so the auth behaviour under test is the real one.
let filePath;
let store;

beforeEach(() => {
  filePath = join(os.tmpdir(), `racearena-test-races-route-${randomUUID()}.sqlite`);
  store = createRaceStore(filePath);
});

afterEach(() => {
  store.close();
  for (const suffix of ['', '-wal', '-shm']) {
    if (existsSync(filePath + suffix)) unlinkSync(filePath + suffix);
  }
});

/** An app whose only route is /api/races, with `authUser` stamped as the guard would stamp it. */
function appWithUser(authUser) {
  const a = express();
  a.use(express.json());
  a.use('/api/races', (req, _res, next) => {
    req.authUser = authUser;
    next();
  });
  a.use('/api/races', createRacesRouter({ store }));
  return a;
}

function aRace(overrides = {}) {
  return {
    clientRaceId: 'client-race-1',
    finishedAt: '2026-09-06T10:00:00.000Z',
    identifierVersion: 1,
    buildId: 'abc1234',
    geometryId: 'garden-path',
    racerTypeId: 'beetle',
    racePlanSeed: 4242,
    raceActionStage: 'wild',
    racePlanEnabled: true,
    targetDurationSec: 200,
    names: ['Ada', 'Grace', 'Alan'],
    worldSchemaVersion: 2,
    worldConfigs: { cameraConfig: { minRacersVisible: 5 } },
    racerTypeOverrides: {},
    effectiveRacerTypes: {},
    elapsedSec: 187.5,
    results: [{ position: 1, name: 'Grace' }],
    winners: ['Grace'],
    ...overrides,
  };
}

// ── Access ────────────────────────────────────────────────────────────────────

describe('POST /api/races — access', () => {
  it('requires auth — an anonymous caller cannot store a race', async () => {
    const res = await request(app).post('/api/races').send(aRace());
    expect(res.status).toBe(401);
  });

  it('an OPERATOR may store a race — every operator runs races and every one must be kept', async () => {
    const op = await operatorAgent(app);
    const res = await op.post('/api/races').send(aRace({ clientRaceId: randomUUID() }));
    expect(res.status).toBe(201);
  });
});

// ── ★ The team comes from the session ────────────────────────────────────────

describe('★ the team comes from the SESSION and the body cannot choose one', () => {
  it("files the race under the signed-in user's team", async () => {
    const res = await request(
      appWithUser({ id: 'u1', username: 'ada', role: 'operator', team: 'Seasonal Entertainment' })
    )
      .post('/api/races')
      .send(aRace());

    expect(res.status).toBe(201);
    expect(store.getRaceById(res.body.id).team).toBe('Seasonal Entertainment');
  });

  it("★ IGNORES a team in the body — a client cannot file into another team's history", async () => {
    const res = await request(
      appWithUser({ id: 'u1', username: 'ada', role: 'operator', team: 'Seasonal Entertainment' })
    )
      .post('/api/races')
      .send(aRace({ team: 'Some Other Team' }));

    expect(res.status).toBe(201);
    // The body said "Some Other Team" and the session said otherwise. The session wins, and the
    // race is not visible to the team the caller asked for.
    expect(store.getRaceById(res.body.id).team).toBe('Seasonal Entertainment');
    expect(store.listRacesByTeam('Some Other Team')).toEqual([]);
    expect(store.listRacesByTeam('Seasonal Entertainment')).toHaveLength(1);
  });

  it('a user with NO team is told to keep the race and retry, not that it failed', async () => {
    // A user who predates TEAMS-1's backfill. The race must not be lost over it.
    const res = await request(
      appWithUser({ id: 'u1', username: 'old', role: 'operator', team: null })
    )
      .post('/api/races')
      .send(aRace());

    // 503 is the whole message: the fault is on this side and a later attempt may work.
    expect(res.status).toBe(503);
    expect(store.counts().races).toBe(0);
  });
});

// ── ★ The same race arriving twice ───────────────────────────────────────────

describe('★ the same race arriving twice is stored once', () => {
  const user = { id: 'u1', username: 'ada', role: 'operator', team: 'Seasonal Entertainment' };

  it('the second arrival is accepted QUIETLY and yields the same race', async () => {
    const a = await request(appWithUser(user)).post('/api/races').send(aRace());
    const b = await request(appWithUser(user)).post('/api/races').send(aRace());

    expect(a.status).toBe(201);
    expect(b.status).toBe(200); // not an error — a retry that worked
    expect(b.body.alreadyStored).toBe(true);
    expect(b.body.id).toBe(a.body.id);
    expect(store.counts().races).toBe(1);
  });

  it('dedupes on the CLIENT id even when the resent payload differs', async () => {
    // A retry rebuilt from the same race can differ in a field that does not matter. It is still
    // the same race, because the id the result screen minted is the same.
    const a = await request(appWithUser(user)).post('/api/races').send(aRace());
    const b = await request(appWithUser(user))
      .post('/api/races')
      .send(aRace({ elapsedSec: 999, results: [{ position: 1, name: 'Grace', extra: true }] }));

    expect(b.body.id).toBe(a.body.id);
    expect(store.counts().races).toBe(1);
    // The FIRST stored version is authoritative and was not edited.
    expect(store.getRaceById(a.body.id).elapsedSec).toBe(187.5);
  });

  it('two DIFFERENT races both land', async () => {
    await request(appWithUser(user))
      .post('/api/races')
      .send(aRace({ clientRaceId: 'one' }));
    await request(appWithUser(user))
      .post('/api/races')
      .send(aRace({ clientRaceId: 'two', racePlanSeed: 99 }));
    expect(store.counts().races).toBe(2);
  });
});

// ── Rejection says whether retrying could help ───────────────────────────────

describe('a rejection says whether retrying could ever help', () => {
  const user = { id: 'u1', username: 'ada', role: 'operator', team: 'Seasonal Entertainment' };

  it.each([
    ['no roster', { names: [] }],
    ['no seed', { racePlanSeed: null }],
    ['results that are not an array', { results: 'first!' }],
  ])(
    'a race with %s is 400 and NOT retryable — the same bytes would fail forever',
    async (_l, bad) => {
      const res = await request(appWithUser(user)).post('/api/races').send(aRace(bad));
      // 400 is the whole message: these bytes are wrong and repeating them cannot help.
      expect(res.status).toBe(400);
      expect(res.body.code).toBeTruthy();
      expect(store.counts().races).toBe(0);
    }
  );
});

// ── ★ Reading a team's races ─────────────────────────────────────────────────

describe('GET /api/races — the team reads its own', () => {
  const ours = { id: 'u1', username: 'ada', role: 'operator', team: 'Seasonal Entertainment' };
  const theirs = { id: 'u2', username: 'bob', role: 'operator', team: 'Other Team' };

  async function store3(user) {
    for (const [i, when] of [
      ['a', '2026-09-01T00:00:00.000Z'],
      ['b', '2026-09-05T00:00:00.000Z'],
      ['c', '2026-09-03T00:00:00.000Z'],
    ]) {
      await request(appWithUser(user))
        .post('/api/races')
        .send(
          aRace({
            clientRaceId: `${user.team}-${i}`,
            finishedAt: when,
            racePlanSeed: 100 + i.charCodeAt(0),
          })
        );
    }
  }

  it('requires auth', async () => {
    expect((await request(app).get('/api/races')).status).toBe(401);
  });

  it("returns this team's races newest first, and NOT another team's", async () => {
    await store3(ours);
    await store3(theirs);

    const res = await request(appWithUser(ours)).get('/api/races');

    expect(res.status).toBe(200);
    expect(res.body.team).toBe('Seasonal Entertainment');
    expect(res.body.races).toHaveLength(3);
    expect(res.body.races.map((r) => r.finishedAt)).toEqual([
      '2026-09-05T00:00:00.000Z',
      '2026-09-03T00:00:00.000Z',
      '2026-09-01T00:00:00.000Z',
    ]);
    for (const r of res.body.races) expect(r.team).toBe('Seasonal Entertainment');
  });

  it('★ PAGINATES from the first version, even with three rows', async () => {
    await store3(ours);

    const first = await request(appWithUser(ours)).get('/api/races?limit=2');
    expect(first.body.races).toHaveLength(2);
    expect(first.body.hasMore).toBe(true);

    const second = await request(appWithUser(ours)).get('/api/races?limit=2&offset=2');
    expect(second.body.races).toHaveLength(1);
    expect(second.body.hasMore).toBe(false);

    // The two pages together are the whole list, with nothing repeated and nothing missed.
    const ids = [...first.body.races, ...second.body.races].map((r) => r.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('★ IGNORES a team in the QUERY — a caller cannot ask for another team list', async () => {
    // The write path has the same rule and its own test. This is the READ half, and it was added
    // because a sabotage that made the team come from the request reddened the write test and NOT
    // this one — the rule was real on one path and merely true-by-accident on the other.
    await store3(ours);
    await store3(theirs);

    const res = await request(appWithUser(ours)).get('/api/races?team=Other%20Team');

    expect(res.status).toBe(200);
    expect(res.body.team).toBe('Seasonal Entertainment');
    expect(res.body.races).toHaveLength(3);
    for (const r of res.body.races) expect(r.team).toBe('Seasonal Entertainment');
  });

  it('a user with no team gets an empty page, not an error', async () => {
    const res = await request(appWithUser({ ...ours, team: null })).get('/api/races');
    expect(res.status).toBe(200);
    expect(res.body.races).toEqual([]);
  });
});

// ── ★ The short key ──────────────────────────────────────────────────────────

describe('★ GET /api/races/:shortKey', () => {
  const ours = { id: 'u1', username: 'ada', role: 'operator', team: 'Seasonal Entertainment' };
  const theirs = { id: 'u2', username: 'bob', role: 'operator', team: 'Other Team' };

  it('a stored race HAS a short key, in the documented alphabet', async () => {
    const res = await request(appWithUser(ours)).post('/api/races').send(aRace());
    expect(res.body.shortKey).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  });

  it('two races get two DIFFERENT keys — a key is never derived from the race', async () => {
    const a = await request(appWithUser(ours))
      .post('/api/races')
      .send(aRace({ clientRaceId: 'one' }));
    const b = await request(appWithUser(ours))
      .post('/api/races')
      .send(aRace({ clientRaceId: 'two' }));
    expect(a.body.shortKey).not.toBe(b.body.shortKey);
  });

  it('a resend returns the SAME key — it is never reassigned', async () => {
    const a = await request(appWithUser(ours)).post('/api/races').send(aRace());
    const b = await request(appWithUser(ours)).post('/api/races').send(aRace());
    expect(b.body.shortKey).toBe(a.body.shortKey);
  });

  it('fetches the race the key names, with its inputs resolved', async () => {
    const stored = await request(appWithUser(ours)).post('/api/races').send(aRace());
    const res = await request(appWithUser(ours)).get(`/api/races/${stored.body.shortKey}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(stored.body.id);
    expect(res.body.geometryId).toBe('garden-path');
    expect(res.body.names).toEqual(['Ada', 'Grace', 'Alan']);
    expect(res.body.worldConfigs).toBeTruthy();
  });

  it('is case-insensitive and forgives the spaces a person writes a key with', async () => {
    const stored = await request(appWithUser(ours)).post('/api/races').send(aRace());
    const key = stored.body.shortKey;

    for (const typed of [key.toLowerCase(), ` ${key} `, `${key.slice(0, 3)}-${key.slice(3)}`]) {
      const res = await request(appWithUser(ours)).get(`/api/races/${encodeURIComponent(typed)}`);
      expect(res.status, `"${typed}" should find the race`).toBe(200);
    }
  });

  it("★ ANOTHER TEAM'S key is NOT FOUND — not forbidden, which would confirm it exists", async () => {
    const stored = await request(appWithUser(ours)).post('/api/races').send(aRace());
    const res = await request(appWithUser(theirs)).get(`/api/races/${stored.body.shortKey}`);

    expect(res.status).toBe(404);
    // The SAME answer an unissued key gets, so the two cannot be told apart.
    const unissued = await request(appWithUser(theirs)).get('/api/races/ZZZZZZ');
    expect(unissued.status).toBe(404);
    expect(res.body.error).toBe(unissued.body.error);
  });

  it('★ IGNORES a team in the QUERY when fetching by key', async () => {
    const stored = await request(appWithUser(ours)).post('/api/races').send(aRace());

    // Bob asks for Ada's race and names her team out loud. The session is what decides.
    const res = await request(appWithUser(theirs)).get(
      `/api/races/${stored.body.shortKey}?team=Seasonal%20Entertainment`
    );
    expect(res.status).toBe(404);
  });

  it('an unknown key is 404 with a message, and never falls through to anything else', async () => {
    const res = await request(appWithUser(ours)).get('/api/races/ZZZZZZ');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no race with that key/i);
  });

  it('a string that is not key-SHAPED is 404 too, never a lookup', async () => {
    // 0, O, 1, I and L are not in the alphabet, so a key containing one cannot name a race.
    for (const bad of ['O00000', 'IL1234', 'toolong123', 'AB']) {
      expect((await request(appWithUser(ours)).get(`/api/races/${bad}`)).status).toBe(404);
    }
  });
});
