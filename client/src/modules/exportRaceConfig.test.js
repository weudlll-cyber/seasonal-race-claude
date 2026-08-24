import { describe, it, expect, vi, beforeEach } from 'vitest';

// storageGet returns null everywhere → every loader yields shipped defaults (a defaults world).
vi.mock('./storage/storage.js', () => ({
  KEYS: {
    RACER_TYPE_OVERRIDES: 'racearena:racerTypeOverrides',
    RACE_DEFAULTS: 'racearena:raceDefaults',
  },
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
  it('has the schema version, the 7 race-path configs, and no overrides', () => {
    const w = buildWorldConfig();
    expect(w.schemaVersion).toBe(WORLD_SCHEMA_VERSION);
    for (const k of [
      'raceDynamicsConfig',
      'raceBehaviorConfig',
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
  configs: { autoScaleConfig: { enabled: true } },
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
  it('a defaults world → no ABORT reason', () => {
    expect(worldStatus(base()).unsimulatable).toEqual([]);
  });
});

// ── RACE-ACTION-CONTROL-1 ──────────────────────────────────────────────────────────────────────
//
// WHAT THIS IS FOR: this module's promise — stated at the top of exportRaceConfig.js and in the
// DevScreen panel the owner reads — is that the blob is "the config the game actually reads when a
// race starts". Since the race path applies the Race Action stage on top of the stored dynamics
// config, an export that skipped the stage would describe a race nobody ran the moment the host
// left quiet: the silent browser↔sim divergence raceConfigWorld.js exists to prevent.
//
// Sabotages in reports/evolution/RACE-ACTION-CONTROL-1.md:
//   1. the export follows the stage — sabotage: build the world from the raw loader again
//   2. quiet changes nothing        — sabotage: give quiet literal values of its own
describe('buildWorldConfig — the Race Action stage reaches the exported world', () => {
  const stageStore = (stage) => (key) =>
    key === 'racearena:raceDefaults' ? { raceActionStage: stage } : null;

  // PROPERTY 2, and the one the four fingerprints then prove end-to-end: at the shipped default the
  // export is byte-identical, hash included, to what it was before this control existed.
  it('quiet leaves the world — and its hash — exactly as the defaults world', () => {
    const noStage = buildWorldConfig();
    storageGet.mockImplementation(stageStore('quiet'));
    expect(buildWorldConfig()).toEqual(noStage);
    expect(worldHashShort()).toBe(worldHashShort(noStage));
  });

  // PROPERTY 1 — the two loud stages must actually show up in the blob a sim would be pointed at.
  it.each(['medium', 'wild'])('%s is written into the exported dynamics config', (stage) => {
    const quiet = buildWorldConfig({ raceActionStage: 'quiet' }).configs.raceDynamicsConfig;
    const loud = buildWorldConfig({ raceActionStage: stage }).configs.raceDynamicsConfig;
    expect(loud.pulkChallengerBoost).toBeGreaterThan(quiet.pulkChallengerBoost);
    // Only the stage's own two keys may differ — the export must not smuggle anything else in.
    // Compared by VALUE: a fresh buildWorldConfig() hands back fresh nested objects, so an identity
    // compare would flag every object-valued key as "moved" and the assertion would mean nothing.
    const moved = Object.keys(loud).filter(
      (k) => JSON.stringify(loud[k]) !== JSON.stringify(quiet[k])
    );
    expect(moved.every((k) => k === 'pulkChallengerBoost' || k === 'pulkLeaderBrake')).toBe(true);
  });

  it('a loud stage moves the world hash, so a sim run cannot silently be compared to the wrong world', () => {
    expect(worldHashShort(buildWorldConfig({ raceActionStage: 'wild' }))).not.toBe(
      worldHashShort(buildWorldConfig({ raceActionStage: 'quiet' }))
    );
  });

  // The explicit argument is what the RACE path passes (the stage the race was STARTED with); the
  // stored setting is what the DevScreen export falls back to. The race must win.
  it('an explicit stage beats the stored setting', () => {
    storageGet.mockImplementation(stageStore('wild'));
    expect(buildWorldConfig({ raceActionStage: 'quiet' })).toEqual(
      buildWorldConfig({ raceActionStage: 'quiet' })
    );
    const explicitQuiet = buildWorldConfig({ raceActionStage: 'quiet' }).configs.raceDynamicsConfig;
    const storedWild = buildWorldConfig().configs.raceDynamicsConfig;
    expect(storedWild.pulkChallengerBoost).toBeGreaterThan(explicitQuiet.pulkChallengerBoost);
  });

  it('a stored raceDefaults blob from before the key existed exports the quiet world', () => {
    const noStage = buildWorldConfig();
    storageGet.mockImplementation((key) =>
      key === 'racearena:raceDefaults' ? { duration: 60, winners: 3 } : null
    );
    expect(buildWorldConfig()).toEqual(noStage);
  });
});
