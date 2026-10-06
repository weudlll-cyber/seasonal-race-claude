// ============================================================
// File:        racesClientIdScope.test.js
// Path:        server/src/routes/racesClientIdScope.test.js
// Project:     RaceArena — SERVER-DEFECTS-1
// Description: A race's client id belongs to its TEAM. A clientRaceId stored by team A is not
//              recognised for team B — B's race is stored as usual — and is still recognised for A.
//              And a database built before the fix (the id unique across every team) is rebuilt by
//              `migrateClientIdPerTeam`, keeping every row and its immutability.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import os from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createRaceStore } from '../races/raceStore.js';
import { createRacesRouter } from './races.js';
import {
  migrateClientIdPerTeam,
  hasClientIdPerTeam,
} from '../races/migrateClientIdPerTeam.js';

/** A race body as the client sends it (no team — the server reads that from the session). */
function raceBody(clientRaceId) {
  return {
    clientRaceId,
    finishedAt: '2026-10-06T10:00:00.000Z',
    identifierVersion: 1,
    buildId: 'abc1234',
    geometryId: 'garden-path',
    racerTypeId: 'beetle',
    racePlanSeed: 1,
    raceActionStage: 'quiet',
    racePlanEnabled: true,
    targetDurationSec: 60,
    names: ['Ada', 'Bob'],
    worldSchemaVersion: 2,
    worldConfigs: {},
    racerTypeOverrides: {},
    effectiveRacerTypes: {},
    elapsedSec: 60,
    results: [
      { name: 'Ada', finishTimeMs: 60_000 },
      { name: 'Bob', finishTimeMs: 60_100 },
    ],
    winners: ['Ada'],
    raceSource: 'race',
  };
}

const paths = [];
function tempDb() {
  const p = join(os.tmpdir(), `racearena-test-clientid-${randomUUID()}.sqlite`);
  paths.push(p);
  return p;
}
afterEach(() => {
  for (const p of paths.splice(0))
    for (const suffix of ['', '-wal', '-shm']) if (existsSync(p + suffix)) unlinkSync(p + suffix);
});

describe('POST /api/races — the retry check stays within the team', () => {
  let store;
  beforeEach(() => {
    store = createRaceStore(tempDb());
  });
  afterEach(() => store.close());

  const appAs = (team) => {
    const a = express();
    a.use(express.json());
    a.use('/api/races', (req, _res, next) => {
      req.authUser = { username: 'u', role: 'operator', team };
      next();
    });
    a.use('/api/races', createRacesRouter({ store }));
    return a;
  };

  it("team A's client id is not recognised for team B, and is still recognised for team A", async () => {
    const id = randomUUID();
    const a1 = await request(appAs('Team A')).post('/api/races').send(raceBody(id));
    expect(a1.status).toBe(201);

    // Team B sends the same client id: not recognised — B's race is stored as usual.
    const b1 = await request(appAs('Team B')).post('/api/races').send(raceBody(id));
    expect(b1.status).toBe(201);
    expect(b1.body.alreadyStored).not.toBe(true);
    expect(b1.body.id).not.toBe(a1.body.id);
    expect(b1.body.shortKey).not.toBe(a1.body.shortKey);

    // Each team's retry is recognised as ITS OWN race.
    const a2 = await request(appAs('Team A')).post('/api/races').send(raceBody(id));
    expect([a2.status, a2.body.alreadyStored, a2.body.id]).toEqual([200, true, a1.body.id]);
    const b2 = await request(appAs('Team B')).post('/api/races').send(raceBody(id));
    expect([b2.status, b2.body.alreadyStored, b2.body.id]).toEqual([200, true, b1.body.id]);
  });

  it('the store looks the id up within the team it is asked for', async () => {
    const id = randomUUID();
    await request(appAs('Team A')).post('/api/races').send(raceBody(id));
    expect(store.getRaceByClientId(id, 'Team A')?.clientRaceId).toBe(id);
    expect(store.getRaceByClientId(id, 'team a')?.clientRaceId).toBe(id); // the normalised key
    expect(store.getRaceByClientId(id, 'Team B')).toBeNull();
    expect(store.getRaceByClientId(id, undefined)).toBeNull();
  });
});

describe('migrateClientIdPerTeam — a database from before the fix', () => {
  /** A races database with the OLD table-wide constraint, holding one race of team A. */
  function oldDatabase() {
    const path = tempDb();
    const fresh = createRaceStore(tempDb());
    const rows = fresh._db
      .prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY rowid")
      .all();
    fresh.close();
    const old = new Database(path);
    for (const { name, sql } of rows) {
      old.exec(
        name === 'races'
          ? sql
              .replace(/(client_race_id\s+TEXT NOT NULL),/, '$1 UNIQUE,')
              .replace(/,\s*(--[^\n]*\n\s*)*UNIQUE \(team_normalized, client_race_id\)\s*\)\s*$/, '\n)')
          : sql
      );
    }
    old.close();
    return path;
  }

  it('the old table refuses a second team with the same id; the rebuilt one stores it', () => {
    const path = oldDatabase();
    const id = randomUUID();
    let store = createRaceStore(path);
    expect(hasClientIdPerTeam(store._db)).toBe(false);
    const a = store.storeRace({ ...raceBody(id), team: 'Team A' });
    expect(() => store.storeRace({ ...raceBody(id), team: 'Team B' })).toThrow(/UNIQUE/);
    store.close();

    expect(migrateClientIdPerTeam({ dbPath: path })).toEqual({ total: 1, changed: 1, skipped: 0 });

    store = createRaceStore(path);
    expect(hasClientIdPerTeam(store._db)).toBe(true);
    expect(store.getRaceByClientId(id, 'Team A')?.id).toBe(a.id); // the row is kept
    const b = store.storeRace({ ...raceBody(id), team: 'Team B' });
    expect(b.id).not.toBe(a.id);
    // the immutability trigger came along
    expect(() => store._db.prepare("UPDATE races SET team = 'X'").run()).toThrow(/immutable/);
    store.close();

    // and a second run is a reported no-op
    expect(migrateClientIdPerTeam({ dbPath: path })).toEqual({ total: 1, changed: 0, skipped: 1 });
  });
});
