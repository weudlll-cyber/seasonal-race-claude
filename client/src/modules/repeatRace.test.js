// ============================================================
// File:        repeatRace.test.js
// Path:        client/src/modules/repeatRace.test.js
// Project:     RaceArena — RACE-HISTORY-4
// Description: Running a stored race again.
//
//              ★ THE ASSERTION THAT MATTERS: the identifier a repeat hands over describes the
//              STORED race, not this machine. A repeat that read the current settings would be the
//              defect the whole store exists to prevent, and it would look identical from outside.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { identifierForStoredInputs, armRepeat, takeArmedRepeat } from './repeatRace.js';
import { decodeRaceIdentifier } from './raceIdentifier.js';
import { DEFAULT_CONFIG_WORLD } from './storage/defaults.js';
import { storageGet, KEYS } from './storage/storage';

/** A race as the store keeps it — the local entry's `inputs` and the server's hydrated race agree. */
function storedInputs(overrides = {}) {
  return {
    identifierVersion: 1,
    buildId: 'build-when-it-ran',
    geometryId: 'garden-path',
    racerTypeId: 'beetle',
    names: ['Ada', 'Grace', 'Alan'],
    racePlanSeed: 4242,
    raceActionStage: 'wild',
    targetDurationSec: 200,
    racePlanEnabled: true,
    worldSchemaVersion: 2,
    worldConfigs: { cameraConfig: { minRacersVisible: 5 } },
    racerTypeOverrides: { beetle: { normalSpeed: 150 } },
    effectiveRacerTypes: { beetle: { normalSpeed: 150 } },
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('identifierForStoredInputs', () => {
  it("★ round-trips the STORED values, not this machine's", () => {
    const inputs = storedInputs();
    const decoded = decodeRaceIdentifier(identifierForStoredInputs(inputs), {
      defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
      buildId: inputs.buildId,
    });

    expect(decoded.geometryId).toBe('garden-path');
    expect(decoded.names).toEqual(['Ada', 'Grace', 'Alan']);
    expect(decoded.racePlanSeed).toBe(4242);
    expect(decoded.raceActionStage).toBe('wild');
    expect(decoded.targetDurationSec).toBe(200);
    expect(decoded.world.configs).toEqual({ cameraConfig: { minRacersVisible: 5 } });
    expect(decoded.world.effectiveRacerTypes).toEqual({ beetle: { normalSpeed: 150 } });
  });

  it('★ the SAME stored race yields the SAME identifier however the machine is set', () => {
    // This is the assertion the piece exists for. The stored inputs are the only source, so a
    // settings change on this device cannot move the result — there is nothing here that reads one.
    const inputs = storedInputs();
    const before = identifierForStoredInputs(inputs);

    localStorage.setItem('racearena:cameraConfig', JSON.stringify({ minRacersVisible: 99 }));
    localStorage.setItem(
      'racearena:racerTypeOverrides',
      JSON.stringify({ beetle: { normalSpeed: 999 } })
    );

    expect(identifierForStoredInputs(inputs)).toBe(before);
  });

  it('stamps the identifier with the build the RACE ran under, not the running one', () => {
    const id = identifierForStoredInputs(storedInputs({ buildId: 'an-older-build' }));
    // Decoding against the running build would refuse; against the recorded one it reads.
    expect(() =>
      decodeRaceIdentifier(id, {
        defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
        buildId: 'a-different-build',
      })
    ).toThrow(/different build/i);
    expect(
      decodeRaceIdentifier(id, {
        defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
        buildId: 'an-older-build',
      })
    ).toBeTruthy();
  });

  it("carries a closed track's laps rather than a duration", () => {
    const id = identifierForStoredInputs(storedInputs({ targetDurationSec: null, targetLaps: 3 }));
    const decoded = decodeRaceIdentifier(id, {
      defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
      buildId: 'build-when-it-ran',
    });
    expect(decoded.targetLaps).toBe(3);
    expect(decoded.targetDurationSec).toBeUndefined();
  });
});

describe('armRepeat / takeArmedRepeat', () => {
  it("puts the identifier in the SEED FIELD's own store, so the field shows what will run", () => {
    const { identifier } = armRepeat(storedInputs());
    // KEYS.RACE_SEED is exactly what SetupScreen reads its field from — not a second channel.
    expect(storageGet(KEYS.RACE_SEED, null)).toBe(identifier);
  });

  it('carries the build the race was recorded under', () => {
    armRepeat(storedInputs({ buildId: 'an-older-build' }));
    expect(takeArmedRepeat().buildId).toBe('an-older-build');
  });

  it('★ is ONE-SHOT — returning to the setup screen does not run the race again unasked', () => {
    armRepeat(storedInputs());
    expect(takeArmedRepeat()).toBeTruthy();
    expect(takeArmedRepeat()).toBeNull();
  });

  it('returns null when nothing is armed', () => {
    expect(takeArmedRepeat()).toBeNull();
  });

  it('a damaged note is null rather than a crash on the setup screen', () => {
    sessionStorage.setItem('racearena:repeatRace', 'not json');
    expect(takeArmedRepeat()).toBeNull();
  });

  it('throws rather than arming a race whose inputs cannot be encoded', () => {
    // The caller shows the failure; nothing is armed, so the setup screen is not sent a race it
    // cannot start.
    const circular = storedInputs();
    circular.worldConfigs = {};
    circular.worldConfigs.self = circular.worldConfigs;
    expect(() => armRepeat(circular)).toThrow();
    expect(sessionStorage.getItem('racearena:repeatRace')).toBeNull();
  });
});
