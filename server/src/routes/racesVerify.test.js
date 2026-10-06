// ============================================================
// File:        racesVerify.test.js
// Path:        server/src/routes/racesVerify.test.js
// Project:     RaceArena — VERIFY-ON-DEMAND-1 (2026-10-04)
// Description: POST /api/races/:shortKey/verify re-races a stored race from its own record.
//
// THE RECORD UNDER TEST IS MADE BY THE ENGINE ITSELF: a race is run headlessly through the same
// driver and written down the way a stored race carries it (seed, names, track, laps, world, finish
// order). Replaying that record must agree on every position and every millisecond — and a copy
// FALSIFIED in one name or one time must be reported as not matching, which is the property the
// route exists for. The store is a stand-in with the one method the route calls.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import request from 'supertest';
import { createRacesRouter } from './races.js';
import { createRaceStore } from '../races/raceStore.js';
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  DEFAULT_CONFIG_WORLD,
} from '../../../scripts/lib/raceDriver.mjs';
import { resolveNameSet, DEFAULT_NAME_SET } from '../../../client/src/modules/racerNames.js';

const TEAM = 'Team A';

/** A stored-race record produced by actually running the race. */
function recordedRace({ racers = 20, seed = 7, trackId = 'dirt-oval', shortKey = 'TEST01' } = {}) {
  const [geo] = loadTracks({ only: trackId });
  const names = resolveNameSet(DEFAULT_NAME_SET).slice(0, racers);
  const identity = resolveIdentity({ racers, raceSeed: seed, roster: names });
  const race = buildRace(geo, identity, DEFAULT_CONFIG_WORLD.cameraConfig, DEFAULT_CONFIG_WORLD);
  runRace(race, identity, DEFAULT_CONFIG_WORLD.cameraConfig, () => true);
  const results = race.st.racers
    .filter((r) => r.finishRank != null)
    .sort((a, b) => a.finishRank - b.finishRank)
    .map((r) => ({
      name: r.name,
      finishTimeMs: r.finishTimeMs,
      index: r.index,
    }));
  return {
    shortKey,
    team: TEAM,
    geometryId: geo.geometryId,
    targetLaps: geo.closed ? geo.defaultLaps : undefined, // the browser stores none for an open track
    worldConfigs: DEFAULT_CONFIG_WORLD,
    fieldSize: racers,
    racePlanSeed: seed,
    racerTypeId: identity.racerType,
    names,
    results,
  };
}

/** An app with /api/races over a store holding `records`, the user stamped as the guard would. */
function appWith(
  records,
  authUser = { username: 'admin', role: 'admin', team: TEAM },
  tracks = loadTracks()
) {
  const store = {
    getRaceByShortKey: (key, team) =>
      records.find((r) => r.shortKey === key && r.team === team) ?? null,
  };
  const a = express();
  a.use(express.json());
  a.use('/api/races', (req, _res, next) => {
    req.authUser = authUser;
    next();
  });
  a.use('/api/races', createRacesRouter({ store, tracks }));
  return a;
}

const REC = recordedRace();

describe('POST /api/races/:shortKey/verify — VERIFY-ON-DEMAND-1', () => {
  it('a record the engine produced agrees on every position and every millisecond', async () => {
    const res = await request(appWith([REC])).post('/api/races/TEST01/verify');
    expect(res.status).toBe(200);
    expect(res.body.identical).toBe(true);
    expect(res.body.positions).toEqual({ match: 20, of: 20 });
    expect(res.body.finishTimes).toEqual({ match: 20, of: 20 });
    expect(res.body.firstDiff).toBeNull();
    expect(res.body.ms).toBeGreaterThan(0);
  }, 120_000);

  it('a FALSIFIED order — the first two places swapped — is reported as not matching', async () => {
    const fake = structuredClone(REC);
    [fake.results[0], fake.results[1]] = [fake.results[1], fake.results[0]];
    const res = await request(appWith([fake])).post('/api/races/TEST01/verify');
    expect(res.status).toBe(200);
    expect(res.body.identical).toBe(false);
    expect(res.body.positions.match).toBe(18);
    expect(res.body.firstDiff).toMatch(/^position 1:/);
  }, 120_000);

  it('a FALSIFIED time — one millisecond off — is reported as not matching', async () => {
    const fake = structuredClone(REC);
    fake.results[5].finishTimeMs += 1;
    const res = await request(appWith([fake])).post('/api/races/TEST01/verify');
    expect(res.body.identical).toBe(false);
    expect(res.body.positions.match).toBe(20);
    expect(res.body.finishTimes.match).toBe(19);
    expect(res.body.firstDiff).toMatch(/^finishTimeMs at position 6/);
  }, 120_000);

  it('an OPEN-track race — stored with no lap count, as the browser stores it — is verified', async () => {
    const open = recordedRace({ trackId: 'river-run', shortKey: 'OPEN01' });
    expect(open.targetLaps).toBeUndefined();
    const res = await request(appWith([open])).post('/api/races/OPEN01/verify');
    expect(res.status).toBe(200);
    expect(res.body.identical).toBe(true);
  }, 120_000);

  it('a record that cannot be replayed honestly is REFUSED with 422, not filled in', async () => {
    const broken = { ...REC, worldConfigs: undefined };
    const res = await request(appWith([broken])).post('/api/races/TEST01/verify');
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/worldConfigs/);
  });

  it("the race is looked up among THE INSTALLATION'S tracks: one it does not hold is refused", async () => {
    const res = await request(appWith([REC], undefined, [])).post('/api/races/TEST01/verify');
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/geometryId/);
  });

  it("another team's key is NOT FOUND, exactly like GET", async () => {
    const res = await request(
      appWith([REC], { username: 'x', role: 'admin', team: 'Team B' })
    ).post('/api/races/TEST01/verify');
    expect(res.status).toBe(404);
  });
});

// ── THE IMAGE CARRIES THE WHOLE ENGINE (VERIFY-ON-DEMAND-1, 2026-10-04) ──────────────────────────
// `server/Dockerfile` copies the engine to the filesystem root by hand-written COPY lines, and the
// first build of them missed one file: the container answered 501 to every verify. This rebuilds
// exactly what those lines put in the image — nothing else of the repository reachable — and
// replays a race there, in a separate process so this suite's own module cache cannot supply a file.
describe('the race engine the Docker image carries', () => {
  it('is complete: a race replays from ONLY what server/Dockerfile copies to /scripts and /client', () => {
    const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
    const copies = readFileSync(join(repo, 'server', 'Dockerfile'), 'utf8')
      .split('\n')
      .map((l) => /^COPY\s+(\S+)\s+(\/(?:scripts|client)\/\S*)\s*$/.exec(l))
      .filter(Boolean);
    expect(copies.length).toBeGreaterThan(0);
    const root = mkdtempSync(join(tmpdir(), 'ra-image-engine-'));
    try {
      for (const [, src, dest] of copies) {
        cpSync(join(repo, src), join(root, dest), {
          recursive: true,
          filter: (f) => !/\.test\.jsx?$/.test(f),
        });
      }
      writeFileSync(join(root, 'record.json'), JSON.stringify(REC));
      writeFileSync(join(root, 'tracks.json'), JSON.stringify(loadTracks({ only: 'dirt-oval' })));
      const replayUrl = pathToFileURL(join(root, 'scripts', 'lib', 'storedRaceReplay.mjs')).href;
      const child = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import { readFileSync } from 'node:fs';
           const { replayStoredRace } = await import(${JSON.stringify(replayUrl)});
           const read = (f) => JSON.parse(readFileSync(${JSON.stringify(root)} + '/' + f, 'utf8'));
           const r = replayStoredRace(read('record.json'), { tracks: read('tracks.json') });
           console.log('FIRSTDIFF=' + JSON.stringify(r.firstDiff));`,
        ],
        { cwd: root, encoding: 'utf8' }
      );
      expect(child.stderr).toBe('');
      expect(child.stdout).toContain('FIRSTDIFF=null');
    } finally {
      rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  }, 120_000);
});

describe('POST /api/races/:shortKey/verify — an unexpected error is answered (SERVER-DEFECTS-1)', () => {
  it('a replay that throws answers 500, is logged, and the next request still succeeds', async () => {
    // The installation's tracks, unreadable for exactly one access — what a damaged track file does
    // to `readInstallTracks`. Not a refusal, so the route rethrows it; `asyncRoute` must answer it.
    let broken = true;
    const tracks = new Proxy(loadTracks(), {
      get(target, prop, receiver) {
        if (broken) {
          broken = false;
          throw new Error('a track file could not be read');
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = appWith([REC], undefined, tracks);

    const first = await request(app).post('/api/races/TEST01/verify');
    expect(first.status).toBe(500);
    expect(first.body).toEqual({ error: 'internal error' });
    expect(logged.mock.calls.flat().join(' ')).toMatch(/a track file could not be read/);
    logged.mockRestore();

    const second = await request(app).post('/api/races/TEST01/verify');
    expect(second.status).toBe(200);
    expect(second.body.identical).toBe(true);
  }, 120_000);
});

describe('an old race with a different winners count (REMOVE-WINNERS-SETTING-1)', () => {
  it('a race stored with FIVE winners still loads with its five and still verifies', async () => {
    // Before 2026-10-06 the number of winners was a setting; a race stored then may list any count.
    // The owner's decision of that day fixed the podium at three going forward — a stored race keeps
    // the winners it was stored with, and verifying it is unaffected.
    const dir = mkdtempSync(join(tmpdir(), 'ra-old-winners-'));
    const store = createRaceStore(join(dir, 'races.sqlite'));
    try {
      const winners = REC.results.slice(0, 5).map((r) => r.name);
      const { shortKey } = store.storeRace({
        ...REC,
        clientRaceId: 'old-race-five-winners',
        finishedAt: '2026-10-01T10:00:00.000Z',
        identifierVersion: 1,
        buildId: 'abc1234',
        raceActionStage: 'quiet',
        winners,
      });
      const a = express();
      a.use(express.json());
      a.use('/api/races', (req, _res, next) => {
        req.authUser = { username: 'admin', role: 'admin', team: TEAM };
        next();
      });
      a.use('/api/races', createRacesRouter({ store, tracks: loadTracks() }));

      const got = await request(a).get(`/api/races/${shortKey}`);
      expect(got.status).toBe(200);
      expect(got.body.winners).toEqual(winners);

      const verified = await request(a).post(`/api/races/${shortKey}/verify`);
      expect(verified.status).toBe(200);
      expect(verified.body.identical).toBe(true);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  }, 120_000);
});
