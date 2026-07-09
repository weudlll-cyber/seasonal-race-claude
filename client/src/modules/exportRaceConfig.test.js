import { describe, it, expect, vi, beforeEach } from 'vitest';

// storageGet returns null everywhere → every loader yields shipped defaults (a defaults world).
vi.mock('./storage/storage.js', () => ({
  KEYS: { RACER_TYPE_OVERRIDES: 'racearena:racerTypeOverrides' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

import { storageGet } from './storage/storage.js';
import {
  buildWorldConfig,
  worldHashShort,
  describeDeviations,
  worldStatus,
} from './exportRaceConfig.js';
import { hashWorld, WORLD_SCHEMA_VERSION, unsimulatableReasons } from './raceConfigWorld.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('buildWorldConfig — gathers a defaults world when storage is empty', () => {
  it('has the schema version, the 8 race-path configs, and no overrides', () => {
    const w = buildWorldConfig();
    expect(w.schemaVersion).toBe(WORLD_SCHEMA_VERSION);
    for (const k of [
      'raceDynamicsConfig',
      'raceBehaviorConfig',
      'raceZoneConfig',
      'rowLayoutConfig',
      'baseSpeedConfig',
      'autoScaleConfig',
      'frameTimingConfig',
      'cameraConfig',
    ]) {
      expect(w.configs[k]).toBeTruthy();
    }
    expect(w.racerTypeOverrides).toEqual({});
    expect(Object.keys(w.effectiveRacerTypes).length).toBeGreaterThan(10);
  });

  it('a defaults world is simulatable and stamps a stable short hash', () => {
    const w = buildWorldConfig();
    expect(unsimulatableReasons(w)).toEqual([]);
    expect(worldHashShort(w)).toBe(hashWorld(w).short); // export uses the SHARED hash, not a copy
  });
});

// The export logic (hash / deviations / simulatability) tested on explicit blobs — deterministic.
const base = () => ({
  schemaVersion: WORLD_SCHEMA_VERSION,
  configs: { raceZoneConfig: { enabled: false }, autoScaleConfig: { enabled: true } },
  racerTypeOverrides: {},
  effectiveRacerTypes: { boarder: { displaySize: 40 } },
});

describe('hash flips on a per-type override and restores', () => {
  it('flip a displaySize override → hash changes; flip back → returns to the previous value', () => {
    const w0 = base();
    const h0 = worldHashShort(w0);
    const w1 = { ...base(), racerTypeOverrides: { boarder: { displaySize: 999 } } };
    const h1 = worldHashShort(w1);
    expect(h1).not.toBe(h0);
    const w2 = base(); // flipped back
    expect(worldHashShort(w2)).toBe(h0);
  });
});

describe('describeDeviations names the owner-relevant traps', () => {
  it('all defaults → no deviations', () => {
    expect(describeDeviations(base())).toEqual([]);
  });
  it('brake zone ON is named', () => {
    const w = base();
    w.configs.raceZoneConfig.enabled = true;
    expect(describeDeviations(w)).toContain('brake zone ON');
  });
  it('auto-scale OFF is named', () => {
    const w = base();
    w.configs.autoScaleConfig.enabled = false;
    expect(describeDeviations(w)).toContain('auto-scale OFF');
  });
  it('racer overrides are counted (isActive-only overrides do not count)', () => {
    const w = base();
    w.racerTypeOverrides = { boarder: { displaySize: 99 }, horse: { isActive: false } };
    expect(describeDeviations(w)).toContain('1 racer override');
  });
});

describe('worldStatus surfaces the sim ABORT reason (same module as the sim)', () => {
  it('brake zone ON → unsimulatable RACE_ZONES_ENABLED + banner names it', () => {
    const w = base();
    w.configs.raceZoneConfig.enabled = true;
    const s = worldStatus(w);
    expect(s.unsimulatable[0].code).toBe('RACE_ZONES_ENABLED');
    expect(s.deviations).toContain('brake zone ON');
  });
  it('a defaults world → no ABORT reason', () => {
    expect(worldStatus(base()).unsimulatable).toEqual([]);
  });
});
