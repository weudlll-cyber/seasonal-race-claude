// ============================================================
// File:        periodEvaluation.test.js
// Path:        server/src/races/periodEvaluation.test.js
// Project:     RaceArena — PERIOD-EVALUATION-1 (2026-10-04)
// Description: The period evaluation: its counting rule, the store's period window, and the route.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'node:os';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { evaluatePeriod } from './periodEvaluation.js';
import { createRaceStore } from './raceStore.js';
import { createRacesRouter } from '../routes/races.js';

const real = (...names) => ({ raceSource: 'race', results: names.map((name) => ({ name })) });

describe('evaluatePeriod — the counting rule', () => {
  it('counts NAMES: the same name in two races is one row with two results', () => {
    const { rows, counted } = evaluatePeriod([real('Ada', 'Bob', 'Cy'), real('Bob', 'Ada', 'Cy')]);
    expect(counted).toBe(2);
    expect(rows).toHaveLength(3);
    const ada = rows.find((r) => r.name === 'Ada');
    expect(ada).toMatchObject({ races: 2, wins: 1, podiums: 2, places: { 1: 1, 2: 1 } });
  });

  it('QUICK TESTS DO NOT COUNT — and they are counted as excluded', () => {
    const quick = { raceSource: 'quick-test', results: [{ name: 'Ada' }] };
    const { rows, counted, quickTestsExcluded } = evaluatePeriod([quick, real('Bob')]);
    expect(counted).toBe(1);
    expect(quickTestsExcluded).toBe(1);
    expect(rows.map((r) => r.name)).toEqual(['Bob']);
  });

  it('★ ABSENT IS NOT REAL: a race with no source marker is left out, like a Quick Test', () => {
    const legacy = { raceSource: null, results: [{ name: 'Ada' }] };
    const { rows, quickTestsExcluded } = evaluatePeriod([legacy]);
    expect(rows).toEqual([]);
    expect(quickTestsExcluded).toBe(1);
  });

  it('orders by wins, then podiums, then races, then name', () => {
    const { rows } = evaluatePeriod([
      real('Cy', 'Ada', 'Bob', 'Dee'),
      real('Cy', 'Bob', 'Ada', 'Dee'),
      real('Ada', 'Dee', 'Bob'),
    ]);
    expect(rows.map((r) => r.name)).toEqual(['Cy', 'Ada', 'Bob', 'Dee']);
  });
});

// ── the store and the route, over a real temp store ─────────────────────────────────────────
let filePath;
let store;
beforeEach(() => {
  filePath = join(os.tmpdir(), `racearena-test-period-${randomUUID()}.sqlite`);
  store = createRaceStore(filePath);
});
afterEach(() => {
  store.close();
  for (const suffix of ['', '-wal', '-shm'])
    if (existsSync(filePath + suffix)) unlinkSync(filePath + suffix);
});

function stored(finishedAt, raceSource, names, team = 'Team A') {
  return store.storeRace({
    clientRaceId: randomUUID(),
    team,
    finishedAt,
    identifierVersion: 1,
    buildId: 'abc1234',
    geometryId: 'garden-path',
    racerTypeId: 'beetle',
    racePlanSeed: 1,
    raceActionStage: 'quiet',
    racePlanEnabled: true,
    targetDurationSec: 60,
    names,
    worldSchemaVersion: 2,
    worldConfigs: {},
    racerTypeOverrides: {},
    effectiveRacerTypes: {},
    elapsedSec: 60,
    results: names.map((name) => ({ name })),
    winners: [names[0]],
    raceSource,
  });
}

function appAs(team) {
  const a = express();
  a.use('/api/races', (req, _res, next) => {
    req.authUser = { username: 'u', role: 'operator', team };
    next();
  });
  a.use('/api/races', createRacesRouter({ store }));
  return a;
}

describe('the store: listRacesInPeriod is a half-open window over one team', () => {
  it('includes `from`, excludes `to`, and leaves other teams out', () => {
    stored('2026-10-01T00:00:00.000Z', 'race', ['Ada']); // exactly at from → in
    stored('2026-10-01T12:00:00.000Z', 'race', ['Bob']); // inside → in
    stored('2026-10-02T00:00:00.000Z', 'race', ['Cy']); // exactly at to → out
    stored('2026-10-01T12:00:00.000Z', 'race', ['Dee'], 'Team B'); // other team → out
    const races = store.listRacesInPeriod(
      'Team A',
      '2026-10-01T00:00:00.000Z',
      '2026-10-02T00:00:00.000Z'
    );
    expect(races.map((r) => r.names[0])).toEqual(['Ada', 'Bob']);
  });
});

describe('GET /api/races/evaluation', () => {
  it("returns the team's evaluation for the period, Quick Tests excluded", async () => {
    stored('2026-10-01T10:00:00.000Z', 'race', ['Ada', 'Bob']);
    stored('2026-10-01T11:00:00.000Z', 'quick-test', ['Bob', 'Ada']);
    const res = await request(appAs('Team A')).get(
      '/api/races/evaluation?from=2026-10-01T00:00:00.000Z&to=2026-10-02T00:00:00.000Z'
    );
    expect(res.status).toBe(200);
    expect(res.body.counted).toBe(1);
    expect(res.body.quickTestsExcluded).toBe(1);
    expect(res.body.rows.map((r) => [r.name, r.wins])).toEqual([
      ['Ada', 1],
      ['Bob', 0],
    ]);
  });

  it('refuses a period with no bounds, or with "from" not before "to"', async () => {
    const app = appAs('Team A');
    expect((await request(app).get('/api/races/evaluation')).status).toBe(400);
    expect(
      (await request(app).get('/api/races/evaluation?from=2026-10-02&to=2026-10-01')).status
    ).toBe(400);
  });

  it('is not mistaken for a short key — "evaluation" is a route, not a race', async () => {
    const res = await request(appAs('Team A')).get(
      '/api/races/evaluation?from=2026-01-01&to=2027-01-01'
    );
    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([]);
  });
});
