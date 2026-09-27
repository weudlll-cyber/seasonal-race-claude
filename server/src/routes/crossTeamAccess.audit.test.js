// ============================================================
// crossTeamAccess.audit.test.js — DELIVERY-CLEAN-1 §2.4
//
// ★★ THE QUESTION, ASKED BY DOING RATHER THAN BY READING: for every data route the server exposes,
// can a member of team A read or write team B's data?
//
// §1.4 counted 58 routes over 9 mounts and found that `races.js` is the ONLY route module that
// mentions `team` at all — the other six data modules contain zero occurrences. That is a source
// reading. This file turns it into a TEST, because "the file does not mention team" and "team B can
// read team A's data" are different claims and only the second one matters to an operator.
//
// ── WHAT IS REUSED ────────────────────────────────────────────────────────────────────────────
// `appWithUser` is the shape `races.test.js` already uses: an express app that stamps `req.authUser`
// and mounts the router under test with an injected store. Copied rather than imported because that
// helper is a file-local function in a test file, and exporting it would change a test to serve an
// audit. The duplication is deliberate and is named here so it is not read as an oversight.
//
// ★ THIS FILE ASSERTS WHAT IS TRUE TODAY, INCLUDING WHERE THAT IS "NO SCOPING". It is an audit
//   probe, not a wish: a route with no team scoping is asserted to have none, so that the day
//   somebody adds scoping this file goes red and has to be re-read. It is named `.audit.test.js`
//   so it is findable as a record of a 2026-09-26 state rather than as a requirement.
//
// ════════════════════════════════════════════════════════════════════════════════════════════
// ★★★ READ THIS BEFORE YOU BUILD TENANCY. THIS FILE IS SUPPOSED TO GO RED THAT DAY.
// ════════════════════════════════════════════════════════════════════════════════════════════
// Added 2026-09-27, DELIVERY-CLEAN-2 arc 1 piece 1.3, on the owner's instruction that this warning
// travel WITH the test rather than only in a report nobody opens mid-task.
//
// The owner decided on 2026-09-27: **BUILD THE TENANCY BOUNDARY BEFORE A SECOND ORGANISER IS
// INVITED** (`docs/BACKLOG.md` PART ONE, *Phases 5–7*, the TENANCY row). The boundary itself was
// settled 2026-09-25 — PER TEAM: brands, player groups, team-created tracks; SHARED: the shipped
// tracks and the racer types.
//
// When that work lands, the assertions in this file that pin **the absence of scoping** on
// `tracks`, `surface-classes`, `player-groups`, `brands`, `racers` and `seed-notices` **will fail,
// and failing is the CORRECT outcome.** They are not a specification and they are not a safety net
// for those six routes — they are a dated photograph of a state the owner has decided to end.
//
// ★ WHAT TO DO WHEN THEY GO RED — in the SAME COMMIT that builds the boundary:
//   1. Do NOT "fix" the product to keep them green. A green assertion here after tenancy exists
//      would mean the boundary was not built.
//   2. Rewrite each absence assertion into the presence assertion it becomes: team B must NOT be
//      able to read team A's brands / player groups / team-created tracks, and MUST still see the
//      shipped tracks and racer types, which stay common.
//   3. Leave the `races` assertions alone — races were already scoped before this file existed and
//      those are real boundary tests, not photographs.
//
// ★ THE FAILURE MODE THIS HEADER EXISTS TO PREVENT: somebody builds tenancy, sees this file go
// red, reads a green-to-red audit test as a regression they caused, and weakens the new boundary
// until the old assertions pass again. That would use an audit probe to undo the very work it was
// written to make visible.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { existsSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createRaceStore } from '../races/raceStore.js';
import { createRacesRouter } from './races.js';

const TEAM_A = 'Alpha Racing';
const TEAM_B = 'Beta Racing';

let store, filePath, scratchDir;

beforeEach(() => {
  filePath = join(os.tmpdir(), `racearena-audit-${randomUUID()}.sqlite`);
  scratchDir = mkdtempSync(join(os.tmpdir(), 'racearena-audit-'));
  store = createRaceStore(filePath);
});

afterEach(() => {
  // Every scratch record this audit created is deleted, as the brief requires.
  store.close();
  for (const suffix of ['', '-wal', '-shm']) {
    if (existsSync(filePath + suffix)) unlinkSync(filePath + suffix);
  }
  rmSync(scratchDir, { recursive: true, force: true });
});

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

const userA = { id: 'ua', username: 'ada', role: 'operator', team: TEAM_A };
const userB = { id: 'ub', username: 'bob', role: 'operator', team: TEAM_B };

function aRace(overrides = {}) {
  return {
    clientRaceId: 'audit-race-1',
    finishedAt: '2026-09-26T10:00:00.000Z',
    identifierVersion: 1,
    buildId: 'audit123',
    geometryId: 'garden-path',
    racerTypeId: 'beetle',
    racePlanSeed: 4242,
    raceActionStage: 'wild',
    racePlanEnabled: true,
    targetDurationSec: 200,
    names: ['Ada', 'Grace'],
    worldSchemaVersion: 2,
    worldConfigs: {},
    elapsedSec: 100,
    results: [{ position: 1, name: 'Grace' }],
    winners: ['Grace'],
    raceSource: 'race',
    ...overrides,
  };
}

describe('DELIVERY-CLEAN-1 §2.4 — can team B reach team A’s races?', () => {
  it('★ B cannot LIST A’s races', async () => {
    await request(appWithUser(userA)).post('/api/races').send(aRace());

    const asA = await request(appWithUser(userA)).get('/api/races');
    const asB = await request(appWithUser(userB)).get('/api/races');

    expect(asA.body.races.length, 'A cannot see his own race — the probe is broken').toBe(1);
    expect(asB.body.races.length, "B CAN LIST A's races").toBe(0);
  });

  it('★ B cannot READ A’s race by its short key — and is told 404, not 403', async () => {
    const stored = await request(appWithUser(userA)).post('/api/races').send(aRace());
    const key = stored.body.shortKey;
    expect(key, 'no short key came back — the probe is broken').toBeTruthy();

    const asA = await request(appWithUser(userA)).get(`/api/races/${key}`);
    const asB = await request(appWithUser(userB)).get(`/api/races/${key}`);

    expect(asA.status).toBe(200);
    // 404 and not 403 is deliberate: "forbidden" would confirm the race exists to somebody holding
    // a key they were not given. The route's own comment says so.
    expect(asB.status, "B CAN READ A's race by key").toBe(404);
  });

  it('★ B cannot file a race INTO A’s team by putting the team in the body', async () => {
    await request(appWithUser(userB))
      .post('/api/races')
      .send(aRace({ team: TEAM_A }));

    const asA = await request(appWithUser(userA)).get('/api/races');
    expect(asA.body.races.length, "B filed a race into A's history").toBe(0);
  });

  it('a user with NO team sees an empty page rather than everybody’s races', async () => {
    await request(appWithUser(userA)).post('/api/races').send(aRace());

    const asNobody = await request(
      appWithUser({ id: 'un', username: 'nemo', role: 'operator', team: null })
    ).get('/api/races');

    expect(asNobody.body.races).toEqual([]);
  });
});

describe('DELIVERY-CLEAN-1 §2.4 — the SIX modules with no team scoping, recorded as fact', () => {
  // These routes carry no team concept at all, which §1.4 established by counting occurrences of
  // `team` in each route module: tracks 0, surfaceClasses 0, playerGroups 0, brands 0, racers 0,
  // seedNotices 0, races 20. There is nothing to test per route here — the absence IS the state —
  // so what is pinned is the COUNT, against the same files, so that a later change to any of them
  // reaches this audit.
  it('★ six of seven data route modules contain no occurrence of `team` (2026-09-26)', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join: j } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    const counts = {};
    for (const f of [
      'tracks',
      'surfaceClasses',
      'playerGroups',
      'brands',
      'racers',
      'seedNotices',
      'races',
    ]) {
      const src = readFileSync(j(here, `${f}.js`), 'utf8');
      counts[f] = (src.match(/\bteam\b/g) ?? []).length;
    }
    const unscoped = Object.entries(counts)
      .filter(([, n]) => n === 0)
      .map(([f]) => f);
    expect(unscoped.sort()).toEqual(
      ['brands', 'playerGroups', 'racers', 'seedNotices', 'surfaceClasses', 'tracks'].sort()
    );
    expect(counts.races).toBeGreaterThan(0);
  });
});
