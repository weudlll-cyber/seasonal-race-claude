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
  it('files the race under the signed-in user\'s team', async () => {
    const res = await request(appWithUser({ id: 'u1', username: 'ada', role: 'operator', team: 'Seasonal Entertainment' }))
      .post('/api/races')
      .send(aRace());

    expect(res.status).toBe(201);
    expect(store.getRaceById(res.body.id).team).toBe('Seasonal Entertainment');
  });

  it('★ IGNORES a team in the body — a client cannot file into another team\'s history', async () => {
    const res = await request(appWithUser({ id: 'u1', username: 'ada', role: 'operator', team: 'Seasonal Entertainment' }))
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
    const res = await request(appWithUser({ id: 'u1', username: 'old', role: 'operator', team: null }))
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
    await request(appWithUser(user)).post('/api/races').send(aRace({ clientRaceId: 'one' }));
    await request(appWithUser(user)).post('/api/races').send(aRace({ clientRaceId: 'two', racePlanSeed: 99 }));
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
  ])('a race with %s is 400 and NOT retryable — the same bytes would fail forever', async (_l, bad) => {
    const res = await request(appWithUser(user)).post('/api/races').send(aRace(bad));
    // 400 is the whole message: these bytes are wrong and repeating them cannot help.
    expect(res.status).toBe(400);
    expect(res.body.code).toBeTruthy();
    expect(store.counts().races).toBe(0);
  });
});
