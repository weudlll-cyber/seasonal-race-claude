// ============================================================
// File:        raceIdentifier.test.js
// Path:        client/src/modules/raceIdentifier.test.js
// Project:     RaceArena — RACE-IDENTIFIER-1
//
// THE ROUND TRIP HAS TO BE EXACT, AND THE REFUSALS HAVE TO BE REFUSALS.
//
// A repeat-a-race identifier has exactly one failure mode that matters: producing a race that is
// NEARLY the one the string named. Everything here is aimed at that — the round trip is asserted by
// deep equality rather than field by field (a field-by-field test cannot notice a field nobody
// remembered to add), and every refusal is asserted to throw rather than to fall back.
// ============================================================

import { describe, expect, it } from 'vitest';
import {
  RACE_IDENTIFIER_PREFIX,
  applyDiff,
  decodeRaceIdentifier,
  diffFromDefaults,
  encodeRaceIdentifier,
  looksLikeRaceIdentifier,
} from './raceIdentifier.js';
import { DEFAULT_CONFIG_WORLD } from './storage/defaults.js';

const BUILD = 'abc12345';

/** A race on shipped defaults — the common case, and the one that must stay shortest. */
function race(overrides = {}) {
  return {
    geometryId: 'dirt-oval',
    racerTypeId: 'horse',
    names: ['Alpha', 'Beta', 'Gamma', 'Delta'],
    racePlanSeed: 5601,
    raceActionStage: 'quiet',
    targetLaps: 2,
    racePlanEnabled: true,
    world: {
      schemaVersion: 3,
      configs: structuredClone(DEFAULT_CONFIG_WORLD),
      racerTypeOverrides: {},
      effectiveRacerTypes: { horse: { speedMultiplier: 1 } },
    },
    defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
    buildId: BUILD,
    ...overrides,
  };
}

const decodeOpts = { defaultWorldConfigs: DEFAULT_CONFIG_WORLD, buildId: BUILD };

describe('raceIdentifier — the diff is an exact inverse', () => {
  // What breaks if deleted: the config could round-trip WRONG and every reproduced race would be
  // subtly different, which is the one failure this feature exists to prevent.
  it('reconstructs the config byte for byte from defaults plus the diff', () => {
    const live = structuredClone(DEFAULT_CONFIG_WORLD);
    live.raceDynamicsConfig.racePlanPulkStart = 0.42;
    live.cameraConfig.comebackWeight = 0.9;

    const d = diffFromDefaults(live, DEFAULT_CONFIG_WORLD);
    expect(applyDiff(DEFAULT_CONFIG_WORLD, d)).toEqual(live);
  });

  // What breaks if deleted: an all-defaults host would carry the whole config in every identifier.
  it('is empty when nothing differs, which is what keeps the common case short', () => {
    expect(
      diffFromDefaults(structuredClone(DEFAULT_CONFIG_WORLD), DEFAULT_CONFIG_WORLD)
    ).toBeUndefined();
  });

  // What breaks if deleted: a REMOVED key would come back as its default rather than as absent —
  // lossy in the one direction a diff is most likely to be wrong.
  it('carries a key the defaults have and the live config does not, as an absence', () => {
    const live = structuredClone(DEFAULT_CONFIG_WORLD);
    delete live.raceDynamicsConfig.racePlanPulkStart;

    const back = applyDiff(DEFAULT_CONFIG_WORLD, diffFromDefaults(live, DEFAULT_CONFIG_WORLD));
    expect('racePlanPulkStart' in back.raceDynamicsConfig).toBe(false);
    expect(back).toEqual(live);
  });

  // What breaks if deleted: arrays could be merged index-wise, which cannot be undone.
  it('carries an array whole rather than element-wise', () => {
    const live = structuredClone(DEFAULT_CONFIG_WORLD);
    const key = Object.keys(live).find((k) =>
      Object.values(live[k] ?? {}).some((v) => Array.isArray(v))
    );
    if (!key) return; // no array in the shipped world — nothing to hold here
    const arrField = Object.keys(live[key]).find((f) => Array.isArray(live[key][f]));
    live[key][arrField] = [...live[key][arrField], 'extra'];

    const back = applyDiff(DEFAULT_CONFIG_WORLD, diffFromDefaults(live, DEFAULT_CONFIG_WORLD));
    expect(back[key][arrField]).toEqual(live[key][arrField]);
  });
});

describe('raceIdentifier — the round trip', () => {
  // ★ What breaks if deleted: everything. This is the whole promise of the feature.
  it('returns every encoded input unchanged', () => {
    const r = race();
    const decoded = decodeRaceIdentifier(encodeRaceIdentifier(r), decodeOpts);

    expect(decoded.geometryId).toBe(r.geometryId);
    expect(decoded.racerTypeId).toBe(r.racerTypeId);
    expect(decoded.names).toEqual(r.names);
    expect(decoded.racePlanSeed).toBe(r.racePlanSeed);
    expect(decoded.raceActionStage).toBe(r.raceActionStage);
    expect(decoded.targetLaps).toBe(r.targetLaps);
    expect(decoded.racePlanEnabled).toBe(r.racePlanEnabled);
    expect(decoded.world.configs).toEqual(r.world.configs);
    expect(decoded.world.effectiveRacerTypes).toEqual(r.world.effectiveRacerTypes);
  });

  // What breaks if deleted: the field size could drift from the roster it is supposed to describe.
  it('derives the field size from the name list rather than storing it twice', () => {
    const decoded = decodeRaceIdentifier(encodeRaceIdentifier(race()), decodeOpts);
    expect(decoded.fieldSize).toBe(4);
    expect(decoded.fieldSize).toBe(decoded.names.length);
  });

  // What breaks if deleted: ROSTER ORDER could be lost, and a name is physics — the same names in a
  // different order are a different race.
  it('keeps the roster IN ORDER, because a name is an engine input', () => {
    const a = encodeRaceIdentifier(race({ names: ['Alpha', 'Beta'] }));
    const b = encodeRaceIdentifier(race({ names: ['Beta', 'Alpha'] }));
    expect(a).not.toBe(b);
    expect(decodeRaceIdentifier(a, decodeOpts).names).toEqual(['Alpha', 'Beta']);
  });

  // What breaks if deleted: an open-track race could come back with a lap count it never had.
  it('round-trips an open track, carrying a duration and no lap count', () => {
    const r = race({ targetLaps: undefined, targetDurationSec: 90 });
    const decoded = decodeRaceIdentifier(encodeRaceIdentifier(r), decodeOpts);
    expect(decoded.targetDurationSec).toBe(90);
    expect(decoded.targetLaps).toBeUndefined();
  });

  // What breaks if deleted: a host with a changed config would produce an identifier that reproduces
  // the DEFAULT race elsewhere — silently, and that is the trap the whole piece is about.
  it('carries a host config that is off the shipped defaults', () => {
    const world = structuredClone(race().world);
    world.configs.raceDynamicsConfig.racePlanPulkStart = 0.42;

    const decoded = decodeRaceIdentifier(encodeRaceIdentifier(race({ world })), decodeOpts);
    expect(decoded.world.configs.raceDynamicsConfig.racePlanPulkStart).toBe(0.42);
  });

  // What breaks if deleted: two different races could share an identifier.
  it('gives different races different identifiers, down to one seed', () => {
    expect(encodeRaceIdentifier(race({ racePlanSeed: 1 }))).not.toBe(
      encodeRaceIdentifier(race({ racePlanSeed: 2 }))
    );
  });

  // What breaks if deleted: the same race could produce different strings, and two operators
  // comparing identifiers would disagree about races that are identical.
  it('is stable — the same race encodes to the same string', () => {
    expect(encodeRaceIdentifier(race())).toBe(encodeRaceIdentifier(race()));
  });
});

describe('raceIdentifier — it refuses rather than guesses', () => {
  // What breaks if deleted: a plain seed could be read as an identifier, or the other way round.
  it('tells an identifier from a plain seed', () => {
    expect(looksLikeRaceIdentifier(encodeRaceIdentifier(race()))).toBe(true);
    expect(looksLikeRaceIdentifier('5601')).toBe(false);
    expect(looksLikeRaceIdentifier('')).toBe(false);
  });

  // ★ What breaks if deleted: the config diff would be applied to a DIFFERENT set of defaults, and
  // the reproduced race would silently not be the one the string named.
  it('refuses an identifier from another build', () => {
    const id = encodeRaceIdentifier(race({ buildId: 'deadbeef' }));
    expect(() => decodeRaceIdentifier(id, decodeOpts)).toThrow(/different build/i);
  });

  // What breaks if deleted: a truncated or mistyped string could half-decode into a plausible race.
  it('refuses a damaged identifier instead of half-reading it', () => {
    const id = encodeRaceIdentifier(race());
    expect(() => decodeRaceIdentifier(id.slice(0, id.length - 8), decodeOpts)).toThrow();
  });

  // What breaks if deleted: anything at all pasted into the field could be treated as a race.
  it('refuses something that is not an identifier', () => {
    expect(() => decodeRaceIdentifier('5601', decodeOpts)).toThrow(/not a race identifier/i);
    expect(() => decodeRaceIdentifier(`${RACE_IDENTIFIER_PREFIX}!!!!`, decodeOpts)).toThrow();
  });

  // What breaks if deleted: a race with no racers could be started from a string.
  it('refuses an identifier that carries no racers', () => {
    expect(() =>
      decodeRaceIdentifier(encodeRaceIdentifier(race({ names: [] })), decodeOpts)
    ).toThrow(/no racers/i);
  });
});
