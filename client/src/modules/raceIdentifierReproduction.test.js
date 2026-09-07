// ============================================================
// File:        raceIdentifierReproduction.test.js
// Path:        client/src/modules/raceIdentifierReproduction.test.js
// Project:     RaceArena — RACE-IDENTIFIER-1
//
// THE PROOF: a race started from an identifier IS the race the identifier came from.
//
// ── WHICH INSTRUMENTS, AND WHAT EACH ONE COVERS ─────────────────────────────────────────────────
//
// Nothing here is judged by eye, and no new measure is invented for the occasion. Two existing
// instruments are used, and neither is trusted past what it says about itself:
//
//   1. `raceHash(identity, cameraConfig)` — `scripts/lib/raceDriver.mjs:161`. This project's own
//      answer to "did these two numbers come from the same race?". Its header states what it covers:
//      every field of the identity INCLUDING THE ROSTER'S ACTUAL NAMES — because `stablePairBit`
//      hashes `r.name`, so two fields of forty different names are two different races — and the
//      camera config, canonicalised so key order cannot change the answer.
//      ★ It states what it does NOT cover, and those gaps are covered here rather than ignored:
//        - THE TRACK. Asserted separately below.
//        - THE TREE. It answers "same race?", never "same build?" — which is precisely why the
//          identifier carries a build stamp and refuses a foreign one.
//        - WHETHER THE CONFIG WAS APPLIED. It hashes what it is handed, so instrument 2 is needed.
//
//   2. `hashWorld(world)` — `client/src/modules/raceConfigWorld.js:80`. The shared browser↔sim
//      authority on config identity: the same function behind the in-race config badge and
//      `worldHashShort`. It settles input 9, the config world, which is the half a seed never
//      carried and the reason the same seed on two machines is two races.
//
// Together they cover all nine inputs. Where one is blind the other or an explicit assertion answers,
// and every blind spot above is named rather than left to be discovered.
// ============================================================

import { describe, expect, it } from 'vitest';
import { raceHash } from '../../../scripts/lib/raceDriver.mjs';
import { hashWorld } from './raceConfigWorld.js';
import { decodeRaceIdentifier, encodeRaceIdentifier } from './raceIdentifier.js';
import { DEFAULT_CONFIG_WORLD, DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';
import { defaultEffectiveRacerTypes } from './exportRaceConfig.js';

const BUILD = 'abc12345';

// ── IDENTIFIER-DIFF-1: THE RACER-TYPE BASE, AND WHY IT HAD TO BE ADDED HERE ─────────────────────
//
// The identifier now carries the racer types as a DIFF against the shipped values, so both ends
// need that base. Before this piece these fixtures passed none — and everything still went green,
// because with no base the diff is taken against `{}` and comes out as the FULL object again. That
// is the round-trip passing for the wrong reason: the new path was never exercised.
//
// So the real base is used here. `defaultEffectiveRacerTypes()` reads `CONFIG_SNAPSHOT`, the copy
// the registry freezes before any stored override, so it is the same on any machine.
const DEFAULT_TYPES = defaultEffectiveRacerTypes();
const OPTS = {
  defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
  defaultEffectiveRacerTypes: DEFAULT_TYPES,
  buildId: BUILD,
};

/** A race whose host has drifted off the shipped defaults — the case a seed cannot reproduce. */
function originalRace() {
  const configs = structuredClone(DEFAULT_CONFIG_WORLD);
  configs.raceDynamicsConfig.racePlanPulkStart = 0.42;
  return {
    geometryId: 'dirt-oval',
    racerTypeId: 'horse',
    names: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Echo', 'Foxtrot'],
    racePlanSeed: 5601,
    raceActionStage: 'quiet',
    targetLaps: 2,
    racePlanEnabled: true,
    world: {
      schemaVersion: 3,
      configs,
      racerTypeOverrides: {},
      effectiveRacerTypes: { horse: { speedMultiplier: 1 } },
    },
  };
}

/**
 * A race on an UNTOUCHED machine: its racer types are exactly the shipped ones, so the diff the
 * identifier carries for them is empty and every value has to come back from the decoder's own
 * defaults. This is the race IDENTIFIER-DIFF-1 exists for, and the one that goes red if a value the
 * identifier now OMITS stops matching the base it is read against.
 */
function shippedTypesRace() {
  return {
    ...originalRace(),
    world: { ...originalRace().world, effectiveRacerTypes: structuredClone(DEFAULT_TYPES) },
  };
}

/** The identity shape `raceHash` hashes, built from a set of race inputs the same way both times. */
const identityOf = (r) => ({
  racers: r.names.length,
  raceSeed: r.racePlanSeed,
  racerType: r.racerTypeId,
  roster: r.names,
  laps: r.targetLaps,
  requestedSeconds: r.targetDurationSec,
  racePlanEnabled: r.racePlanEnabled,
  raceActionStage: r.raceActionStage,
});

const encode = (r) =>
  encodeRaceIdentifier({
    ...r,
    defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
    defaultEffectiveRacerTypes: DEFAULT_TYPES,
    buildId: BUILD,
  });

describe('RACE-IDENTIFIER-1 — a reproduced race is the same race', () => {
  // ★ THE PROOF. What breaks if deleted: the feature's only promise.
  it('raceHash agrees: the identity that comes back is the identity that went in', () => {
    const original = originalRace();
    const reproduced = decodeRaceIdentifier(encode(original), OPTS);

    const before = raceHash(identityOf(original), original.world.configs.cameraConfig);
    const after = raceHash(identityOf(reproduced), reproduced.world.configs.cameraConfig);

    expect(after).toBe(before);
  });

  // What breaks if deleted: the config half — the one a seed never carried — could be silently lost,
  // and every reproduced race would run on the RECEIVING machine's settings.
  it('hashWorld agrees: the config world that comes back is the one that went in', () => {
    const original = originalRace();
    const reproduced = decodeRaceIdentifier(encode(original), OPTS);

    expect(hashWorld(reproduced.world).full).toBe(hashWorld(original.world).full);
    // And it is genuinely the drifted config, not the shipped default that happens to round-trip.
    expect(hashWorld(reproduced.world).full).not.toBe(
      hashWorld({ ...original.world, configs: DEFAULT_CONFIG_WORLD }).full
    );
  });

  // `raceHash` says outright that it does not cover the track, so covering it is not optional.
  it('and the track comes back too, which raceHash says it does not check', () => {
    const original = originalRace();
    const reproduced = decodeRaceIdentifier(encode(original), OPTS);
    expect(reproduced.geometryId).toBe(original.geometryId);
  });
});

describe('RACE-IDENTIFIER-1 — the check goes red when an input is corrupted', () => {
  // ★ THE SABOTAGE THE BRIEF ASKS FOR, kept as a permanent test rather than run once by hand: if
  // corrupting an encoded input did NOT move the proof above, the proof would be worthless.
  it('a changed SEED moves raceHash', () => {
    const original = originalRace();
    const corrupted = decodeRaceIdentifier(encode({ ...original, racePlanSeed: 5602 }), OPTS);

    expect(raceHash(identityOf(corrupted), corrupted.world.configs.cameraConfig)).not.toBe(
      raceHash(identityOf(original), original.world.configs.cameraConfig)
    );
  });

  // A name is physics. If this did not move, the roster would not really be part of the identity.
  it('a changed NAME moves raceHash, because a name is an engine input', () => {
    const original = originalRace();
    const names = [...original.names];
    names[2] = 'Gamma2';
    const corrupted = decodeRaceIdentifier(encode({ ...original, names }), OPTS);

    expect(raceHash(identityOf(corrupted), corrupted.world.configs.cameraConfig)).not.toBe(
      raceHash(identityOf(original), original.world.configs.cameraConfig)
    );
  });

  // Reordering the same names is a different race for the same reason.
  it('a REORDERED roster moves raceHash', () => {
    const original = originalRace();
    const names = [...original.names];
    [names[0], names[1]] = [names[1], names[0]];
    const corrupted = decodeRaceIdentifier(encode({ ...original, names }), OPTS);

    expect(raceHash(identityOf(corrupted), corrupted.world.configs.cameraConfig)).not.toBe(
      raceHash(identityOf(original), original.world.configs.cameraConfig)
    );
  });

  // The config half has to be sensitive too, or a drifted host would reproduce as the default.
  it('a changed CONFIG moves hashWorld', () => {
    const original = originalRace();
    const drifted = structuredClone(original.world);
    drifted.configs.raceDynamicsConfig.racePlanPulkStart = 0.43;
    const corrupted = decodeRaceIdentifier(encode({ ...original, world: drifted }), OPTS);

    expect(hashWorld(corrupted.world).full).not.toBe(hashWorld(original.world).full);
  });
});

// ── IDENTIFIER-DIFF-1 ───────────────────────────────────────────────────────────────────────────
describe('IDENTIFIER-DIFF-1 — the shortened form means the same race', () => {
  // ★ THE SABOTAGE CATCHER. The identifier now OMITS every racer-type value that equals the shipped
  // one, so those values come back from the decoder's base instead of from the string. Corrupt one
  // of those omitted defaults and the world that comes back is not the world that went in — this is
  // the test that says so.
  it('★ a race on shipped racer types round-trips to the SAME world', () => {
    const original = shippedTypesRace();
    const back = decodeRaceIdentifier(encode(original), OPTS);

    expect(hashWorld(back.world).full).toBe(hashWorld(original.world).full);
    expect(back.world.effectiveRacerTypes).toEqual(original.world.effectiveRacerTypes);
  });

  it('a racer-type value that DIFFERS from shipped still travels', () => {
    const original = shippedTypesRace();
    const drifted = structuredClone(original.world);
    drifted.effectiveRacerTypes.horse.speedMultiplier = 1.37;
    const back = decodeRaceIdentifier(encode({ ...original, world: drifted }), OPTS);

    expect(back.world.effectiveRacerTypes.horse.speedMultiplier).toBe(1.37);
    expect(hashWorld(back.world).full).toBe(hashWorld(drifted).full);
  });

  // ★ THE SABOTAGE CATCHER, and it has to be a LITERAL. The obvious test — round-trip and compare —
  // cannot catch a moved default at all: encoder and decoder read the SAME base inside one build, so
  // a changed shipped value shifts both sides equally and the comparison still passes. That is not a
  // weakness in the test, it is the mechanism, and it is the cost this piece states openly: a diff
  // means whatever the defaults of the build DECODING it say it means.
  //
  // So this pins the value that is no longer in the string to the number it is supposed to be. Change
  // a shipped racer-type default and this goes red, which is the only place that movement is visible.
  it('★ an OMITTED default comes back as the value it is supposed to be', () => {
    const back = decodeRaceIdentifier(encode(shippedTypesRace()), OPTS);
    // horse.speedMultiplier is not written into the identifier any more — it is restored from the
    // decoder's own shipped values. HorseRacerType.js says 1.0.
    expect(back.world.effectiveRacerTypes.horse.speedMultiplier).toBe(1.0);
  });

  // ★ THE COST, MADE VISIBLE RATHER THAN ARGUED. Decode the same string against a base in which one
  // omitted value has moved, and the race that comes back is a different race. This is what happens
  // to an identifier written before a shipped racer-type default changes.
  it('★ decoded against MOVED defaults, the same string is a different race', () => {
    const original = shippedTypesRace();
    const str = encode(original);
    const movedBase = structuredClone(DEFAULT_TYPES);
    movedBase.horse.speedMultiplier = 1.23;
    const back = decodeRaceIdentifier(str, { ...OPTS, defaultEffectiveRacerTypes: movedBase });

    expect(back.world.effectiveRacerTypes.horse.speedMultiplier).toBe(1.23);
    expect(hashWorld(back.world).full).not.toBe(hashWorld(original.world).full);
  });

  it('the shortened form is SHORTER, and by the whole racer-type block', () => {
    const original = shippedTypesRace();
    const short = encode(original);
    // The old form, reproduced: the full set under `e` and no `ed`.
    const long = encodeRaceIdentifier({
      ...original,
      defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
      defaultEffectiveRacerTypes: {},
      buildId: BUILD,
    });
    expect(short.length).toBeLessThan(long.length);
  });

  // ★ OLD IDENTIFIERS MUST STILL WORK, or this piece does not ship. An identifier written before
  // this change carries `e` in full and no `ed`; the decoder tells the two apart by which key is
  // present, so a string the owner copied out last week still decodes to the race it always did.
  it('★ an identifier in the OLD form still decodes, to the same racer types', () => {
    const original = shippedTypesRace();
    const oldForm = encodeRaceIdentifier({
      ...original,
      defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
      defaultEffectiveRacerTypes: {},
      buildId: BUILD,
    });
    const back = decodeRaceIdentifier(oldForm, OPTS);

    expect(back.world.effectiveRacerTypes).toEqual(original.world.effectiveRacerTypes);
    expect(hashWorld(back.world).full).toBe(hashWorld(original.world).full);
    expect(raceHash(identityOf(back), back.world.configs.cameraConfig)).toBe(
      raceHash(identityOf(original), original.world.configs.cameraConfig)
    );
  });
});
