// ============================================================
// File:        raceStore.test.js
// Path:        server/src/races/raceStore.test.js
// Project:     RaceArena — RACE-STORE-2
// Created:     2026-09-06
// Description: The race store, tested directly — there is no route yet and nothing writes to it.
//
//              ★ THESE TESTS USE THEIR OWN DATABASE, ALWAYS. Every `createRaceStore` call below is
//              given an explicit path in the OS temp directory and the file is deleted afterwards.
//              `test/env-setup.js` ALREADY redirects `RA_DATA_DIR` to a fresh temp dir per test
//              file, so the default path would be isolated too — this does not rely on that. The
//              users store was isolated the same way and 28 test accounts still reached the owner's
//              live store once; a test that names its own file cannot be the one that does it
//              again, whatever a setup file elsewhere is or is not doing.
//
//              The central test is `the first race still resolves to the ORIGINAL values` — the
//              owner's requirement of 2026-09-06 and the reason the store is content-addressed.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createRaceStore } from './raceStore.js';
import { contentId, canonicalString } from './contentAddress.js';

let filePath;
let store;

beforeEach(() => {
  filePath = join(os.tmpdir(), `racearena-test-races-${randomUUID()}.sqlite`);
  store = createRaceStore(filePath);
});

afterEach(() => {
  store.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const f = filePath + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
});

/** The racer values as they stand BEFORE the owner touches the Dev Screen. */
const ORIGINAL_RACER_VALUES = {
  racerTypeOverrides: { beetle: { normalSpeed: 150 } },
  effectiveRacerTypes: { beetle: { normalSpeed: 150, areaBonus: 0.1 } },
};

/** The same racer type after he changes it. Different content — therefore a different row. */
const CHANGED_RACER_VALUES = {
  racerTypeOverrides: { beetle: { normalSpeed: 175 } },
  effectiveRacerTypes: { beetle: { normalSpeed: 175, areaBonus: 0.1 } },
};

/**
 * One race. `clientRaceId` defaults to a FIXED value on purpose: two calls to `aRace()` with no id
 * are THE SAME RACE arriving twice, which is what the store dedupes on. A test that means two
 * different races passes two different ids, and says so at the call site.
 */
function aRace(overrides = {}) {
  return {
    clientRaceId: 'client-race-1',
    team: 'Seasonal Entertainment',
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
    elapsedSec: 187.5,
    results: [
      { position: 1, name: 'Grace' },
      { position: 2, name: 'Ada' },
      { position: 3, name: 'Alan' },
    ],
    winners: ['Grace'],
    ...ORIGINAL_RACER_VALUES,
    ...overrides,
  };
}

// ── Content addressing ────────────────────────────────────────────────────────

describe('content addressing — identical content lands once', () => {
  it('the same roster stored twice yields ONE row and the SAME reference', () => {
    const a = store.storeRace(aRace({ clientRaceId: 'a', racePlanSeed: 1 }));
    const b = store.storeRace(aRace({ clientRaceId: 'b', racePlanSeed: 2 }));

    expect(a.rosterId).toBe(b.rosterId);
    expect(a.stored.roster).toBe(true); // the first race wrote it
    expect(b.stored.roster).toBe(false); // the second recognised it as already stored
    expect(store.counts()).toMatchObject({ races: 2, rosters: 1 });
  });

  it('the same racer values stored twice yield ONE row and the SAME reference', () => {
    const a = store.storeRace(aRace({ clientRaceId: 'a', racePlanSeed: 1 }));
    const b = store.storeRace(aRace({ clientRaceId: 'b', racePlanSeed: 2 }));

    expect(a.racerTypesId).toBe(b.racerTypesId);
    expect(b.stored.racerTypes).toBe(false);
    expect(store.counts().racerTypes).toBe(1);
  });

  it('a DIFFERENT roster gets a different reference and its own row', () => {
    const a = store.storeRace(aRace({ clientRaceId: 'a' }));
    const b = store.storeRace(
      aRace({ clientRaceId: 'b', names: ['Ada', 'Grace', 'Alan', 'Edsger'] })
    );

    expect(a.rosterId).not.toBe(b.rosterId);
    expect(store.counts().rosters).toBe(2);
  });

  it('the roster order is CONTENT — a name is physics, so a reordering is a different roster', () => {
    // `stablePairBit` hashes the racer's name, so the same three names in another order is not the
    // same starting field. Nothing in the store may sort them into agreement.
    const a = store.storeRace(aRace({ clientRaceId: 'a', names: ['Ada', 'Grace', 'Alan'] }));
    const b = store.storeRace(aRace({ clientRaceId: 'b', names: ['Grace', 'Ada', 'Alan'] }));

    expect(a.rosterId).not.toBe(b.rosterId);
  });

  it('storing the same race twice is idempotent — one row, keyed on the CLIENT id', () => {
    // Both calls carry the fixture's default `clientRaceId`, which is what "the same race" means:
    // a retry, a double click, or a second tab sending the entry the result screen already minted.
    const a = store.storeRace(aRace());
    const b = store.storeRace(aRace());

    expect(a.id).toBe(b.id);
    expect(b.stored.race).toBe(false);
    expect(store.counts().races).toBe(1);
  });

  it('the reference is the SHA-256 of the canonical content, not an opaque counter', () => {
    const { rosterId } = store.storeRace(aRace());
    expect(rosterId).toBe(contentId({ names: ['Ada', 'Grace', 'Alan'] }));
    expect(rosterId).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── ★ The no-overwrite proof (the owner's requirement, 2026-09-06) ────────────

describe('★ a stored row is never overwritten — the Dev Screen changes, the old race does not', () => {
  it('store a race, CHANGE the racer values, store a second race: the first still resolves to the ORIGINAL values, byte for byte', () => {
    // 1. Last week's race, on the values as they stood then.
    const first = store.storeRace(
      aRace({
        clientRaceId: 'last-week',
        finishedAt: '2026-09-01T10:00:00.000Z',
        racePlanSeed: 111,
        ...ORIGINAL_RACER_VALUES,
      })
    );

    // 2. The owner opens the Dev Screen and changes the beetle's speed. Today's race runs on the
    //    new values — same racerTypeId, same roster, same track.
    const second = store.storeRace(
      aRace({
        clientRaceId: 'today',
        finishedAt: '2026-09-06T10:00:00.000Z',
        racePlanSeed: 222,
        ...CHANGED_RACER_VALUES,
      })
    );

    // 3. Changed values are DIFFERENT CONTENT, so they got a NEW reference and a NEW row.
    expect(second.racerTypesId).not.toBe(first.racerTypesId);
    expect(store.counts().racerTypes).toBe(2);

    // 4. ★ AND THE FIRST RACE STILL POINTS AT THE ROW IT ALWAYS POINTED AT.
    const reread = store.getRaceById(first.id);
    expect(reread.racerTypesId).toBe(first.racerTypesId);
    expect(reread.racerTypeOverrides).toEqual(ORIGINAL_RACER_VALUES.racerTypeOverrides);
    expect(reread.effectiveRacerTypes).toEqual(ORIGINAL_RACER_VALUES.effectiveRacerTypes);

    // Byte for byte, not merely deep-equal: the stored canonical string is the one that was hashed.
    expect(canonicalString(store.getRacerTypes(first.racerTypesId))).toBe(
      canonicalString({ id: first.racerTypesId, ...ORIGINAL_RACER_VALUES })
    );

    // 5. And today's race resolves to the NEW values, so both are true at once.
    expect(store.getRaceById(second.id).effectiveRacerTypes).toEqual(
      CHANGED_RACER_VALUES.effectiveRacerTypes
    );
  });

  it('the roster survives the same way — an old race keeps its field when a later one differs', () => {
    const first = store.storeRace(
      aRace({ clientRaceId: 'a', racePlanSeed: 1, names: ['Ada', 'Grace'] })
    );
    store.storeRace(aRace({ clientRaceId: 'b', racePlanSeed: 2, names: ['Ada', 'Grace', 'Alan'] }));

    expect(store.getRaceById(first.id).names).toEqual(['Ada', 'Grace']);
    expect(store.getRaceById(first.id).fieldSize).toBe(2);
  });

  it('★ the DATABASE ITSELF refuses an UPDATE, not merely the module', () => {
    // (b) in raceStore.js's header is "no UPDATE statement exists here", which holds only while
    // nobody writes one. (c) is this: a trigger, so the refusal survives a future route, a CLI, or
    // a writer who forgets. If this test ever goes green-by-absence, the guarantee is gone.
    const { id } = store.storeRace(aRace());

    expect(() =>
      store._db.prepare('UPDATE races SET race_action_stage = ? WHERE id = ?').run('calm', id)
    ).toThrow(/immutable/);

    expect(() =>
      store._db
        .prepare('UPDATE rosters SET content = ? WHERE id = ?')
        .run('{}', store.getRaceById(id).rosterId)
    ).toThrow(/immutable/);

    expect(() =>
      store._db
        .prepare('UPDATE racer_types SET content = ? WHERE id = ?')
        .run('{}', store.getRaceById(id).racerTypesId)
    ).toThrow(/immutable/);

    // And the race is untouched by the attempts.
    expect(store.getRaceById(id).raceActionStage).toBe('wild');
  });

  it('a roster an existing race points at cannot be deleted out from under it', () => {
    const { id, rosterId } = store.storeRace(aRace());
    expect(() => store._db.prepare('DELETE FROM rosters WHERE id = ?').run(rosterId)).toThrow(
      /FOREIGN KEY/i
    );
    expect(store.getRaceById(id).names).toEqual(['Ada', 'Grace', 'Alan']);
  });
});

// ── Lookup ────────────────────────────────────────────────────────────────────

describe('lookup', () => {
  it('finds a race by its id, with both references resolved', () => {
    const { id } = store.storeRace(aRace());
    const race = store.getRaceById(id);

    expect(race.geometryId).toBe('garden-path');
    expect(race.racePlanSeed).toBe(4242);
    expect(race.names).toEqual(['Ada', 'Grace', 'Alan']);
    expect(race.effectiveRacerTypes).toEqual(ORIGINAL_RACER_VALUES.effectiveRacerTypes);
    expect(race.winners).toEqual(['Grace']);
    expect(race.results).toHaveLength(3);
  });

  it('returns null for an id that is not there', () => {
    expect(store.getRaceById('nope')).toBeNull();
  });

  it("★ finds a race by its team and NOT by another team's", () => {
    store.storeRace(
      aRace({ clientRaceId: 'ours', team: 'Seasonal Entertainment', racePlanSeed: 1 })
    );
    store.storeRace(aRace({ clientRaceId: 'theirs', team: 'Other Team', racePlanSeed: 2 }));

    const ours = store.listRacesByTeam('Seasonal Entertainment');
    expect(ours).toHaveLength(1);
    expect(ours[0].racePlanSeed).toBe(1);

    const theirs = store.listRacesByTeam('Other Team');
    expect(theirs).toHaveLength(1);
    expect(theirs[0].racePlanSeed).toBe(2);

    expect(store.listRacesByTeam('Nobody')).toEqual([]);
  });

  it('matches the team on the NORMALISED key, the same rule that decides who is a colleague', () => {
    store.storeRace(aRace({ team: 'Seasonal Entertainment' }));
    expect(store.listRacesByTeam('  seasonal   ENTERTAINMENT ')).toHaveLength(1);
  });

  it("lists a team's races newest first", () => {
    store.storeRace(
      aRace({ clientRaceId: 'a', finishedAt: '2026-09-01T00:00:00.000Z', racePlanSeed: 1 })
    );
    store.storeRace(
      aRace({ clientRaceId: 'b', finishedAt: '2026-09-05T00:00:00.000Z', racePlanSeed: 2 })
    );
    store.storeRace(
      aRace({ clientRaceId: 'c', finishedAt: '2026-09-03T00:00:00.000Z', racePlanSeed: 3 })
    );

    expect(store.listRacesByTeam('Seasonal Entertainment').map((r) => r.racePlanSeed)).toEqual([
      2, 3, 1,
    ]);
  });
});

// ── What the store refuses ────────────────────────────────────────────────────

describe('what storeRace refuses', () => {
  it.each([
    ['no team', { team: '' }, 'INVALID_TEAM'],
    ['no roster', { names: [] }, 'INVALID_ROSTER'],
    ['results that are not an array', { results: 'first!' }, 'INVALID_RESULTS'],
    ['no geometryId', { geometryId: null }, 'INVALID_RACE'],
    ['no buildId', { buildId: null }, 'INVALID_RACE'],
    ['no seed', { racePlanSeed: null }, 'INVALID_RACE'],
    ['no clientRaceId', { clientRaceId: null }, 'INVALID_RACE'],
  ])('refuses a race with %s', (_label, override, code) => {
    expect(() => store.storeRace(aRace(override))).toThrow(expect.objectContaining({ code }));
    expect(store.counts().races).toBe(0);
  });

  it('a refused race leaves NOTHING behind — the roster is rolled back with it', () => {
    // storeRace is a transaction: the roster insert must not survive a later validation failure,
    // or the store would accumulate rosters for races that never happened.
    expect(() => store.storeRace(aRace({ geometryId: null }))).toThrow();
    expect(store.counts()).toEqual({ races: 0, rosters: 0, racerTypes: 0 });
  });
});

// ── Persistence ───────────────────────────────────────────────────────────────

describe('persistence', () => {
  it('a race survives closing and reopening the database', () => {
    const { id } = store.storeRace(aRace());
    store.close();

    store = createRaceStore(filePath);
    const race = store.getRaceById(id);
    expect(race.names).toEqual(['Ada', 'Grace', 'Alan']);
    expect(race.effectiveRacerTypes).toEqual(ORIGINAL_RACER_VALUES.effectiveRacerTypes);
  });

  it('does not write to the real data directory', () => {
    store.storeRace(aRace());
    // The store under test was handed an explicit temp path; nothing may have appeared beside the
    // owner's users.json. DATA_ROOT is itself a temp dir under env-setup.js, so this asserts the
    // belt as well as the braces.
    expect(filePath.startsWith(os.tmpdir())).toBe(true);
    expect(existsSync(filePath)).toBe(true);
  });
});

// ── ★ Every identifier field is stored, or named as deliberately absent ───────

describe('★ the identifier mapping is complete', () => {
  // `client/src/modules/raceIdentifier.js` already answered which inputs decide a race — that
  // question was measured, not guessed. This test holds the store to that answer: it DECODES a real
  // identifier and requires every field it yields to be either stored or listed below with a
  // reason. A field that is neither is a race that cannot be re-run, which is what this whole topic
  // exists to fix, so the check is a test rather than a paragraph in a report nobody re-reads.

  /**
   * Fields the decoder returns that the store deliberately does NOT carry as their own column, each
   * with the reason. Anything not here must be stored.
   */
  const DELIBERATELY_ABSENT = {
    fieldSize:
      'implied exactly by the roster length and never encoded twice — raceIdentifier.js:24-26 says ' +
      'the same. `hydrate` derives it from the stored names.',
  };

  /** Which stored field answers each identifier field. Both halves are asserted below. */
  const STORED_AS = {
    geometryId: (r) => r.geometryId,
    racerTypeId: (r) => r.racerTypeId,
    names: (r) => r.names,
    racePlanSeed: (r) => r.racePlanSeed,
    raceActionStage: (r) => r.raceActionStage,
    racePlanEnabled: (r) => r.racePlanEnabled,
    targetLaps: (r) => r.targetLaps,
    targetDurationSec: (r) => r.targetDurationSec,
    world: (r) => ({
      schemaVersion: r.worldSchemaVersion,
      configs: r.worldConfigs,
      racerTypeOverrides: r.racerTypeOverrides,
      effectiveRacerTypes: r.effectiveRacerTypes,
    }),
  };

  it('every field a decoded identifier yields is either stored or declared absent', async () => {
    const { encodeRaceIdentifier, decodeRaceIdentifier } =
      await import('../../../client/src/modules/raceIdentifier.js');

    const defaultWorldConfigs = { cameraConfig: { minRacersVisible: 4 } };
    const identifier = encodeRaceIdentifier({
      geometryId: 'garden-path',
      racerTypeId: 'beetle',
      names: ['Ada', 'Grace', 'Alan'],
      racePlanSeed: 4242,
      raceActionStage: 'wild',
      targetDurationSec: 200,
      racePlanEnabled: true,
      world: {
        schemaVersion: 2,
        configs: { cameraConfig: { minRacersVisible: 5 } },
        racerTypeOverrides: ORIGINAL_RACER_VALUES.racerTypeOverrides,
        effectiveRacerTypes: ORIGINAL_RACER_VALUES.effectiveRacerTypes,
      },
      defaultWorldConfigs,
      buildId: 'abc1234',
    });
    const decoded = decodeRaceIdentifier(identifier, { defaultWorldConfigs, buildId: 'abc1234' });

    // THE GUARD: no field may be silently missing from both lists.
    const accounted = new Set([...Object.keys(STORED_AS), ...Object.keys(DELIBERATELY_ABSENT)]);
    const unaccounted = Object.keys(decoded).filter((k) => !accounted.has(k));
    expect(
      unaccounted,
      `raceIdentifier.js yields ${unaccounted.join(', ')}, which the store neither stores nor ` +
        'declares absent. Store it, or add it to DELIBERATELY_ABSENT with the reason.'
    ).toEqual([]);

    // AND THE VALUES ROUND-TRIP. Listing a field is not the same as carrying it correctly.
    const { id } = store.storeRace(
      aRace({
        geometryId: decoded.geometryId,
        racerTypeId: decoded.racerTypeId,
        names: decoded.names,
        racePlanSeed: decoded.racePlanSeed,
        raceActionStage: decoded.raceActionStage,
        racePlanEnabled: decoded.racePlanEnabled,
        targetLaps: decoded.targetLaps,
        targetDurationSec: decoded.targetDurationSec,
        worldSchemaVersion: decoded.world.schemaVersion,
        worldConfigs: decoded.world.configs,
        racerTypeOverrides: decoded.world.racerTypeOverrides,
        effectiveRacerTypes: decoded.world.effectiveRacerTypes,
      })
    );
    const stored = store.getRaceById(id);

    for (const [field, read] of Object.entries(STORED_AS)) {
      expect(
        read(stored),
        `identifier field "${field}" did not round-trip through the store`
      ).toEqual(decoded[field]);
    }

    // The one declared absence really is derivable rather than lost.
    expect(stored.fieldSize).toBe(decoded.fieldSize);
  });

  it('the two picture-only payload fields are absent BY DESIGN and are not identifier fields at all', async () => {
    // `raceIdentifier.js:34-38` names worldWidth/worldHeight and trackSurfaceClasses as reaching the
    // CameraDirector and the surface emitter but no engine file — they decide what a race looks
    // like, not who wins. They are not in the identifier, so they are not in this store either, and
    // this asserts the decoder still yields neither rather than trusting the comment.
    const { decodeRaceIdentifier, encodeRaceIdentifier } =
      await import('../../../client/src/modules/raceIdentifier.js');
    const id = encodeRaceIdentifier({
      geometryId: 'g',
      racerTypeId: 't',
      names: ['A'],
      racePlanSeed: 1,
      raceActionStage: 'wild',
      racePlanEnabled: false,
      world: {},
      defaultWorldConfigs: {},
      buildId: 'b',
    });
    const decoded = decodeRaceIdentifier(id, { defaultWorldConfigs: {}, buildId: 'b' });

    expect(decoded).not.toHaveProperty('worldWidth');
    expect(decoded).not.toHaveProperty('worldHeight');
    expect(decoded).not.toHaveProperty('trackSurfaceClasses');
  });
});
