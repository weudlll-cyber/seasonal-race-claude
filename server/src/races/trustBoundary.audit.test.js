// ============================================================
// File:        server/src/races/trustBoundary.audit.test.js
// Project:     RaceArena — DELIVERY-CLEAN-2 arc 1, piece 1.2
// Created:     2026-09-27
//
// ★★ WHAT THIS OWNS: writing down, as a test, WHERE THE TRUST BOUNDARY IS — so that nobody ever
// mistakes the ABSENCE of an outcome check for the PRESENCE of one.
//
// The server accepts a structurally valid race result WITHOUT verifying that any simulation
// produced it. That is deliberate, and the owner's rule is in the source it governs:
// `client/src/modules/raceHistory.js:9-14`, 2026-09-06 —
//     "The race is written LOCALLY FIRST, always. The server is a second store, never a gatekeeper."
// `raceStore.js` enforces that line exactly: every guard it has is STRUCTURAL — required fields
// (`:235`), a non-empty roster, `results` an array, `winners` an array (`:264-274`). None of them
// asks whether the finishing order is one the engine could have produced.
//
// ★ WHY A TEST AND NOT A COMMENT. A comment saying "there is no check here" is invisible the moment
// somebody skims for one. These tests FAIL if an outcome check is ever added silently — which is
// the right alarm either way: if the check was intended, the test is updated deliberately and the
// boundary moves on the record; if it was not intended, a regression is caught.
//
// ★★ THIS IS NOT AN ARGUMENT THAT THE BOUNDARY IS RIGHT. It pins today's shape. The owner decided
// on 2026-09-27 how the risk is answered, and it is NOT by recomputing on submission:
//   VERIFY ON DEMAND — a disputed race is re-raced from its own stored record and compared,
//   invoked when somebody disputes a result. See `docs/BACKLOG.md` PART ONE, DELIVERY-CLEAN-1,
//   the B1 row, and `reports/audit/DELIVERY-CLEAN-1.md` §3.6 for the replay that proves the
//   mechanism works (W57FQA: 40 of 40 positions and 40 of 40 finish times, to the millisecond).
//   ★ Fabrication is therefore not PREVENTED; it is made PROVABLE. Those are different claims and
//   the difference is the whole point of this file.
//
// ★ WHAT A REPLAY CANNOT DO, stated so the row above is not over-read: re-racing settles
// "did the engine do this", never "did this happen". A fabricated record replays faithfully.
// ============================================================
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createRaceStore } from './raceStore.js';

const HERE = dirname(fileURLToPath(import.meta.url));

let filePath;
let store;

beforeEach(() => {
  filePath = join(os.tmpdir(), `racearena-trust-boundary-${randomUUID()}.sqlite`);
  store = createRaceStore(filePath);
});

afterEach(() => {
  store.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const f = filePath + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
});

/** A structurally complete race, shaped like `raceStore.test.js`'s fixture. */
function aRace(overrides = {}) {
  return {
    clientRaceId: 'trust-boundary-1',
    team: 'Seasonal Entertainment',
    finishedAt: '2026-09-27T10:00:00.000Z',
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
    elapsedSec: 187.5,
    results: [
      { position: 1, name: 'Grace' },
      { position: 2, name: 'Ada' },
      { position: 3, name: 'Alan' },
    ],
    winners: ['Grace'],
    ...overrides,
  };
}

describe('the trust boundary — the server stores, it does not adjudicate', () => {
  it('★ accepts a result no simulation could have produced, and that is BY DESIGN', () => {
    // Every field is well-formed; the OUTCOME is nonsense. The declared winner finishes last,
    // and the race claims to have taken a quarter of a second with three racers on a 200 s track.
    const fabricated = aRace({
      elapsedSec: 0.25,
      results: [
        { position: 1, name: 'Alan' },
        { position: 2, name: 'Ada' },
        { position: 3, name: 'Grace' },
      ],
      winners: ['Grace'], // contradicts position 1 above
    });

    const out = store.storeRace(fabricated);

    // `stored` reports which ROWS were newly written (raceStore.js:253-256), not a boolean.
    expect(out.stored.race).toBe(true);
    expect(out.id).toBeTruthy();

    // And it reads back exactly as filed — the store did not correct it either.
    const back = store.getRaceById(out.id);
    expect(back.winners).toEqual(['Grace']);
    expect(back.results[0].name).toBe('Alan');
    expect(back.elapsedSec).toBe(0.25);
  });

  it('rejects a STRUCTURAL fault, which is the only kind it judges', () => {
    expect(() => store.storeRace(aRace({ results: 'not-an-array' }))).toThrow(/results/i);
    expect(() => store.storeRace(aRace({ names: [] }))).toThrow(/roster|names/i);
    expect(() => store.storeRace(aRace({ winners: undefined }))).toThrow();
  });

  it('★ the server carries no race engine at all — the absence is structural, not an oversight', () => {
    // If the server ever imported the engine, recomputing on submission would become a one-line
    // change somebody could make without noticing they had moved the boundary.
    const ENGINE = [
      'raceCore',
      'racePlanner',
      'raceStep',
      'raceBehavior',
      'raceGovernor',
      'stepRacePhysics',
    ];
    const root = join(HERE, '..');
    const files = walk(root).filter((f) => f.endsWith('.js') && !f.includes('.test.'));
    const offenders = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const name of ENGINE) {
        if (new RegExp(`\\b${name}\\b`).test(src)) offenders.push(`${f} -> ${name}`);
      }
    }
    expect(
      offenders,
      'server/src now references the race engine. If outcome verification was intended, ' +
        'move the boundary deliberately and update this test; if not, this is a regression.'
    ).toEqual([]);
  });
});

/** Every file under a directory, recursively. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
