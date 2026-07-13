import { describe, it, expect } from 'vitest';
import {
  WORLD_SCHEMA_VERSION,
  canonicalJson,
  hashWorld,
  unsimulatableReasons,
  worldStamp,
  ASSUMED_DEFAULTS_STAMP,
} from './raceConfigWorld.js';

const baseWorld = {
  schemaVersion: WORLD_SCHEMA_VERSION,
  track: 'mountainstreet',
  racer: 'boarder',
  racerCount: 40,
  durationSec: 60,
  seed: 1,
  configs: {
    raceDynamicsConfig: { directorV4Intensity: 0.6 },
    raceBehaviorConfig: { startSpreadRange: 0.6 },
  },
  racerTypeOverrides: {},
};

describe('raceConfigWorld — hash determinism + sensitivity', () => {
  it('canonicalJson is key-order independent', () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
    expect(canonicalJson({ x: { p: 1, q: 2 } })).toBe(canonicalJson({ x: { q: 2, p: 1 } }));
  });

  it('same content → same hash (deterministic)', () => {
    expect(hashWorld(baseWorld).full).toBe(hashWorld(JSON.parse(JSON.stringify(baseWorld))).full);
  });

  it('a one-field change → the hash changes (sensitivity)', () => {
    const changed = JSON.parse(JSON.stringify(baseWorld));
    changed.configs.raceDynamicsConfig.directorV4Intensity = 0.61;
    expect(hashWorld(changed).short).not.toBe(hashWorld(baseWorld).short);
  });

  it('a racer-type displaySize override flips the hash, and flipping back restores it', () => {
    const w1 = JSON.parse(JSON.stringify(baseWorld));
    const h0 = hashWorld(w1).short;
    w1.racerTypeOverrides = { boarder: { displaySize: 999 } };
    const h1 = hashWorld(w1).short;
    expect(h1).not.toBe(h0);
    delete w1.racerTypeOverrides.boarder;
    expect(hashWorld(w1).short).toBe(h0);
  });
});

describe('raceConfigWorld — simulatability (fail-loud source)', () => {
  it('a default world is simulatable (no reasons)', () => {
    expect(unsimulatableReasons(baseWorld)).toEqual([]);
  });

  it('unsimulatableReasons has no registered reasons (race-zones removed) → always []', () => {
    // The only reason ever registered was RACE_ZONES_ENABLED, deleted with the feature. Kept as the
    // extension point for the next unsimulatable config; today it returns [] for any world.
    expect(unsimulatableReasons({ configs: { anything: { enabled: true } } })).toEqual([]);
  });
});

describe('raceConfigWorld — stamp', () => {
  it('no world → ASSUMED-DEFAULTS + provisional', () => {
    const s = worldStamp(null);
    expect(s.worldHash).toBe(ASSUMED_DEFAULTS_STAMP);
    expect(s.provisional).toBe(true);
  });
  it('a world → its short hash + not provisional', () => {
    const s = worldStamp(baseWorld);
    expect(s.worldHash).toBe(hashWorld(baseWorld).short);
    expect(s.provisional).toBe(false);
  });
});
