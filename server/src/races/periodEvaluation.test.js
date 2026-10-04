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
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { evaluatePeriod } from './periodEvaluation.js';
import { createRaceStore } from './raceStore.js';
import { createRacesRouter } from '../routes/races.js';
import { createPointsRuleStore, DEFAULT_POINTS_RULE } from './pointsRule.js';

/** A real race; every name FINISHED, in the order given. */
const real = (...names) => ({
  raceSource: 'race',
  results: names.map((name, i) => ({ name, finishTimeMs: 60_000 + i * 100 })),
});
/** A result that did not cross the line, as the browser stores it. */
const dnf = (name) => ({ name, finishTimeMs: null });

describe('evaluatePeriod — the counting rule', () => {
  it('counts NAMES: the same name in two races is one row with two results', () => {
    const { rows, counted } = evaluatePeriod([real('Ada', 'Bob', 'Cy'), real('Bob', 'Ada', 'Cy')]);
    expect(counted).toBe(2);
    expect(rows).toHaveLength(3);
    const ada = rows.find((r) => r.name === 'Ada');
    expect(ada).toMatchObject({ races: 2, wins: 1, podiums: 2, places: { 1: 1, 2: 1 } });
  });

  it('★ names match IGNORING CASE AND SPACES, and the row shows the first spelling', () => {
    const { rows } = evaluatePeriod([
      real('  Ada   Lovelace ', 'Bob'),
      real('ada lovelace', 'BOB'),
      real('ADA LOVELACE'),
    ]);
    expect(rows.map((r) => [r.name, r.races, r.wins])).toEqual([
      ['Ada Lovelace', 3, 3],
      ['Bob', 2, 0],
    ]);
  });

  it('★ NO DNF: a racer who did not finish adds nothing, not even a race', () => {
    const race = { raceSource: 'race', results: [...real('Ada', 'Bob').results, dnf('Cy')] };
    const { rows } = evaluatePeriod([race, real('Cy')]);
    expect(rows.find((r) => r.name === 'Cy')).toMatchObject({
      races: 1,
      wins: 1,
      places: { 1: 1 },
    });
  });

  it('a name twice in one OLD race counts once, at its better place', () => {
    const { rows } = evaluatePeriod([real('Bob', 'Ada', 'ada')]);
    expect(rows.find((r) => r.name === 'Ada')).toMatchObject({ races: 1, places: { 2: 1 } });
  });

  it('QUICK TESTS DO NOT COUNT — and they are counted as excluded', () => {
    const quick = { ...real('Ada'), raceSource: 'quick-test' };
    const { rows, counted, quickTestsExcluded } = evaluatePeriod([quick, real('Bob')]);
    expect(counted).toBe(1);
    expect(quickTestsExcluded).toBe(1);
    expect(rows.map((r) => r.name)).toEqual(['Bob']);
  });

  it('★ ABSENT IS NOT REAL: a race with no source marker is left out, like a Quick Test', () => {
    const legacy = { ...real('Ada'), raceSource: null };
    const { rows, quickTestsExcluded } = evaluatePeriod([legacy]);
    expect(rows).toEqual([]);
    expect(quickTestsExcluded).toBe(1);
  });

  it('★ orders by wins, then 2nd places, then 3rd places, then races — not by podiums', () => {
    const { rows } = evaluatePeriod([
      real('Win', 'Sec', 'Thi'),
      real('Win', 'Xx', 'Thi'),
      real('Win', 'Yy', 'Zz', 'Thi'),
      real('Win', 'Zz', 'Yy'),
    ]);
    // Thi has two podiums (two 3rds), Sec one (a 2nd): a 2nd place outranks two 3rds.
    // Xx: one 2nd in one race. Yy and Zz: one 2nd and one 3rd each — the 3rd lifts them above Xx.
    expect(rows.map((r) => r.name)).toEqual(['Win', 'Yy', 'Zz', 'Sec', 'Xx', 'Thi']);
    expect(rows.find((r) => r.name === 'Thi').podiums).toBe(2);
  });

  it('races decide only after wins, 2nds and 3rds are level', () => {
    const { rows } = evaluatePeriod([
      real('Win', 'A'),
      real('Win', 'B'),
      real('Win', 'X', 'Y', 'B'),
    ]);
    // A, B and X: one 2nd each and no 3rd. B raced twice (a 4th counts as a race), A and X once,
    // so B leads them; A and X are level on everything and the name settles it.
    expect(rows.map((r) => r.name)).toEqual(['Win', 'B', 'A', 'X', 'Y']);
  });

  it('a podium is places 1 to 3', () => {
    const { rows } = evaluatePeriod([real('A', 'B', 'C', 'D')]);
    expect(rows.map((r) => r.podiums)).toEqual([1, 1, 1, 0]);
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
    results: names.map((name, i) => ({ name, finishTimeMs: 60_000 + i * 100 })),
    winners: [names[0]],
    raceSource,
  });
}

let rulePath;
let pointsRule;
beforeEach(() => {
  rulePath = join(os.tmpdir(), `racearena-test-points-${randomUUID()}.json`);
  pointsRule = createPointsRuleStore(rulePath);
});
afterEach(() => {
  if (existsSync(rulePath)) unlinkSync(rulePath);
});

function appAs(team) {
  const a = express();
  a.use(express.json());
  a.use('/api/races', (req, _res, next) => {
    req.authUser = { username: 'u', role: 'operator', team };
    next();
  });
  a.use('/api/races', createRacesRouter({ store, pointsRule }));
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

describe('the period may be at most 366 days (the owner, 2026-10-04)', () => {
  it('a whole leap year is allowed', async () => {
    const res = await request(appAs('Team A')).get(
      '/api/races/evaluation?from=2028-01-01&to=2029-01-01'
    );
    expect(res.status).toBe(200);
  });

  it('one day more is REFUSED, with a sentence saying so', async () => {
    const res = await request(appAs('Team A')).get(
      '/api/races/evaluation?from=2028-01-01&to=2029-01-02'
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('A period can be at most 366 days long. Choose a shorter period.');
  });
});

describe('the points rule is stored ON THE SERVER (the owner, 2026-10-04)', () => {
  it('starts OFF with no numbers', async () => {
    const res = await request(appAs('Team A')).get('/api/races/evaluation/points-rule');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(DEFAULT_POINTS_RULE);
  });

  it('a rule that is set is the rule every reader gets — from any team', async () => {
    const put = await request(appAs('Team A'))
      .put('/api/races/evaluation/points-rule')
      .send({ pointsEnabled: true, pointsPerPlace: [10, 6, 4] });
    expect(put.status).toBe(200);
    expect(existsSync(rulePath)).toBe(true);
    const got = await request(appAs('Team B')).get('/api/races/evaluation/points-rule');
    expect(got.body).toEqual({ pointsEnabled: true, pointsPerPlace: [10, 6, 4] });
  });

  it('a rule that does not check out is refused whole, and nothing is stored', async () => {
    for (const body of [
      { pointsEnabled: 'yes', pointsPerPlace: [] },
      { pointsEnabled: true, pointsPerPlace: [10, -1] },
      { pointsEnabled: true, pointsPerPlace: 'ten' },
    ]) {
      const res = await request(appAs('Team A'))
        .put('/api/races/evaluation/points-rule')
        .send(body);
      expect(res.status).toBe(400);
    }
    expect(existsSync(rulePath)).toBe(false);
  });

  it('an unreadable stored rule reads as the default, never as wrong points', () => {
    writeFileSync(rulePath, '{ not json');
    expect(pointsRule.get()).toEqual(DEFAULT_POINTS_RULE);
  });
});
