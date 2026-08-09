// ============================================================
// File:        configDiffStores.test.js
// Project:     RaceArena — CONFIG-DIFF-2
//
// THE ACCEPTANCE, and it is deliberately NOT the world fingerprint. The fingerprint harnesses build
// their config from `DEFAULT_CONFIG_WORLD` directly and never read localStorage, so they cannot see
// this class of change at all — a green fingerprint here proves nothing about storage. What can:
//
//   1. resolve a REALISTIC stored config — the whole-object blob the old writers produced — through
//      the loaders BEFORE and AFTER, and assert the resulting WORLD BLOB hashes identically. That
//      blob and its hash already exist (`buildWorldConfig` / `hashWorld`), so this compares the
//      thing the sim actually consumes rather than a comparison invented for the test.
//   2. the HUD config badge's `raceCount` — the number of race-relevant deviations from the shipped
//      defaults. It reads 0 on the owner's machine and must still read 0.
//
// BEFORE is reconstructed here rather than checked out: the six old loaders were
// `{...DEFAULT, ...stored}` spread merges, which is one line to reproduce exactly.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { buildWorldConfig, configFingerprintBadge } from './exportRaceConfig.js';
import { hashWorld } from './raceConfigWorld.js';
import { resolveFromDefaults } from './storage/configDiff.js';
import { KEYS, storageGet, storageSet } from './storage/storage.js';
import {
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_FRAME_TIMING_CONFIG,
  DEFAULT_CAMERA_CONFIG,
} from './storage/defaults.js';
import { DEFAULT_AUTO_SCALE_CONFIG, loadAutoScaleConfig } from './autoSpriteScale.js';
import { loadRaceDynamicsConfig } from './raceDynamicsConfig.js';
import { loadRaceBehaviorConfig } from './raceBehaviorConfig.js';
import { loadRowLayoutConfig } from './rowLayoutConfig.js';
import { loadBaseSpeedConfig, saveBaseSpeedConfig } from './baseSpeedConfig.js';
import { loadFrameTimingConfig } from './frameTimingConfig.js';

/** The seven stores, each with its key, defaults and loader. */
const STORES = [
  [KEYS.RACE_DYNAMICS_CONFIG, DEFAULT_RACE_DYNAMICS_CONFIG, loadRaceDynamicsConfig, 'raceDynamics'],
  [KEYS.RACE_BEHAVIOR_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG, loadRaceBehaviorConfig, 'raceBehavior'],
  [KEYS.ROW_LAYOUT_CONFIG, DEFAULT_ROW_LAYOUT_CONFIG, loadRowLayoutConfig, 'rowLayout'],
  [KEYS.BASE_SPEED_CONFIG, DEFAULT_BASE_SPEED_CONFIG, loadBaseSpeedConfig, 'baseSpeed'],
  [KEYS.FRAME_TIMING_CONFIG, DEFAULT_FRAME_TIMING_CONFIG, loadFrameTimingConfig, 'frameTiming'],
  [KEYS.AUTO_SCALE_CONFIG, DEFAULT_AUTO_SCALE_CONFIG, loadAutoScaleConfig, 'autoScale'],
];

/** What the OLD writers put in his browser: the whole resolved object, every key frozen. */
function seedWholeObjectConfigs(tweaks = {}) {
  for (const [key, defaults] of STORES) {
    storageSet(key, { ...defaults, ...(tweaks[key] ?? {}) });
  }
  storageSet(KEYS.CAMERA_CONFIG, {
    ...DEFAULT_CAMERA_CONFIG,
    ...(tweaks[KEYS.CAMERA_CONFIG] ?? {}),
  });
}

/** The OLD resolve: a spread merge, which is what all six did before this block. */
const oldResolve = (stored, defaults) =>
  !stored || typeof stored !== 'object' ? { ...defaults } : { ...defaults, ...stored };

beforeEach(() => localStorage.clear());

describe('CONFIG-DIFF-2 — the world the sim consumes is unchanged', () => {
  it('ACCEPTANCE: a realistic stored config yields the SAME world hash before and after', () => {
    // His real deviations, on the two stores that scope browser<->sim parity plus a camera one.
    const tweaks = {
      [KEYS.RACE_DYNAMICS_CONFIG]: { reRollIntervalDivisor: 9 },
      [KEYS.RACE_BEHAVIOR_CONFIG]: { softSteeringStrength: 0.04 },
      [KEYS.CAMERA_CONFIG]: { minDrawnFrameFrac: 0.04 },
    };
    seedWholeObjectConfigs(tweaks);

    // BEFORE: what the OLD loaders would have produced from exactly this storage. Computed from the
    // storage snapshot taken now, because `buildWorldConfig` prunes storage on its way through.
    const beforeConfigs = {};
    for (const [key, defaults, , name] of STORES) {
      beforeConfigs[`${name}Config`] = oldResolve(storageGet(key), defaults);
    }
    // The camera's OLD load side already walked the default keys, so it is spelled out here rather
    // than borrowed from the module under test — an expectation must not be built from the code it
    // is judging.
    const storedCam = storageGet(KEYS.CAMERA_CONFIG) ?? {};
    beforeConfigs.cameraConfig = Object.fromEntries(
      Object.keys(DEFAULT_CAMERA_CONFIG).map((k) => [
        k,
        Object.prototype.hasOwnProperty.call(storedCam, k)
          ? storedCam[k]
          : DEFAULT_CAMERA_CONFIG[k],
      ])
    );

    // AFTER: the new loaders, reading the same storage.
    const world = buildWorldConfig();

    // Key by key first, so a failure names the store rather than just "the hash moved".
    for (const name of Object.keys(beforeConfigs)) {
      expect(world.configs[name], `${name} resolves identically`).toEqual(beforeConfigs[name]);
    }
    // Then the blob the sim actually consumes, hashed by the shipped hasher — the acceptance itself.
    expect(hashWorld({ ...world, configs: beforeConfigs }).short).toBe(hashWorld(world).short);

    // And the deviations are still THERE: an all-defaults world would pass the hash check vacuously.
    expect(world.configs.raceDynamicsConfig.reRollIntervalDivisor).toBe(9);
    expect(world.configs.raceBehaviorConfig.softSteeringStrength).toBe(0.04);
    expect(world.configs.cameraConfig.minDrawnFrameFrac).toBe(0.04);
  });

  it('ACCEPTANCE: the badge still reads 0 race deviations on an all-defaults config', () => {
    // His machine reads `0 race` today. A whole-object stored config that equals the defaults must
    // still read 0 after the prune — the prune empties storage and changes nothing resolved.
    seedWholeObjectConfigs();
    const badge = configFingerprintBadge();
    expect(badge.raceCount).toBe(0);
    expect(badge.raceKeys).toEqual([]);
  });

  it('…and a REAL race deviation is still counted, so the 0 is not vacuous', () => {
    seedWholeObjectConfigs({ [KEYS.RACE_DYNAMICS_CONFIG]: { reRollIntervalDivisor: 9 } });
    expect(configFingerprintBadge().raceCount).toBeGreaterThan(0);
  });

  it('the world hash is unchanged by the prune itself', () => {
    seedWholeObjectConfigs({ [KEYS.RACE_BEHAVIOR_CONFIG]: { softSteeringStrength: 0.04 } });
    const first = hashWorld(buildWorldConfig()).short; // prunes on the way through
    const second = hashWorld(buildWorldConfig()).short; // storage is now pruned
    expect(second).toBe(first);
  });
});

describe('CONFIG-DIFF-2 — the rule itself, with the prune out of the way', () => {
  // WHY THESE EXIST. Sabotaging `resolveFromDefaults` back to a spread merge left the whole
  // store-level suite green, because every loader PRUNES before it resolves — so a retired key is
  // already gone from storage by the time the resolver sees it, and the resolver's own protection is
  // never exercised. The two mechanisms are independent and the second must be tested unpruned.
  it('a retired stored key is ignored even when the prune has not run', () => {
    expect(resolveFromDefaults({ aRetiredKnob: 123 }, { keptKnob: 7 })).toEqual({ keptKnob: 7 });
  });

  it('a NEW default key is present even when storage predates it', () => {
    expect(resolveFromDefaults({ old: 1 }, { old: 2, brandNew: 9 })).toEqual({
      old: 1,
      brandNew: 9,
    });
  });

  it('a nested block resolves field by field, not whole', () => {
    const defaults = { block: { a: 1, b: 2 } };
    expect(resolveFromDefaults({ block: { a: 5 } }, defaults)).toEqual({ block: { a: 5, b: 2 } });
  });
});

describe('CONFIG-DIFF-2 — the six stores, in consequence form', () => {
  // COVERAGE CANNOT SILENTLY SHRINK. The key picker below skips a store it cannot perturb, and a
  // broken rule can make every store unperturbable — which once turned a 48-test suite into an
  // 18-test one that still called itself green in five of its six stores. This asserts the count.
  it('every store contributed a perturbable key', () => {
    const missing = STORES.filter(([key, defaults, load]) => {
      localStorage.clear();
      const k = Object.keys(defaults).find((c) => {
        if (typeof defaults[c] !== 'number') return false;
        const probe = defaults[c] === 0 ? 1 : defaults[c] * 0.5;
        localStorage.clear();
        storageSet(key, { ...defaults, [c]: probe });
        return load()[c] === probe;
      });
      localStorage.clear();
      return !k;
    }).map(([, , , n]) => n);
    expect(missing, 'stores with no perturbable key — coverage would vanish').toEqual([]);
  });

  for (const [key, defaults, load, name] of STORES) {
    // PICK A KEY THE STORE'S OWN GUARDS ACCEPT A NUDGE ON, by trying it rather than by guessing from
    // the name. The first version guessed, chose `startSpreadRange` and nudged it to 1.95 — which the
    // loader correctly rejects, because that key is bounded at 1. The guard was right and the test
    // was wrong; picking by round-trip makes that class of mistake impossible.
    const numericKey = Object.keys(defaults).find((k) => {
      if (typeof defaults[k] !== 'number') return false;
      const probe = defaults[k] === 0 ? 1 : defaults[k] * 0.5;
      localStorage.clear();
      storageSet(key, { ...defaults, [k]: probe });
      const ok = load()[k] === probe;
      localStorage.clear();
      return ok;
    });
    if (!numericKey) continue;
    const nudged = defaults[numericKey] === 0 ? 1 : defaults[numericKey] * 0.5;

    describe(name, () => {
      it('a config written the OLD way still yields the same resolved values', () => {
        storageSet(key, { ...defaults, [numericKey]: nudged });
        expect(load()[numericKey]).toBe(nudged);
      });

      it('THE POINT: an untouched key follows a CHANGED default across the upgrade', () => {
        const untouched = Object.keys(defaults).find((k) => k !== numericKey);
        storageSet(key, { ...defaults, [numericKey]: nudged });
        load(); // prunes: the untouched key is dropped, the deviation kept
        const stored = storageGet(key);
        expect(Object.prototype.hasOwnProperty.call(stored, untouched)).toBe(false);
        expect(stored[numericKey]).toBe(nudged);
      });

      it('a NEW key arrives at its default', () => {
        storageSet(key, { [numericKey]: nudged });
        // Every default key is present in the resolved config, whatever storage holds.
        const resolved = load();
        for (const k of Object.keys(defaults)) {
          expect(Object.prototype.hasOwnProperty.call(resolved, k), `${k} present`).toBe(true);
        }
      });

      it('a RETIRED stored key disappears from the resolved config', () => {
        storageSet(key, { [numericKey]: nudged, aRetiredKnob: 123 });
        expect(load().aRetiredKnob).toBeUndefined();
      });

      it('the prune drops a coincidental match and keeps a genuine deviation', () => {
        storageSet(key, { ...defaults, [numericKey]: nudged });
        load();
        expect(storageGet(key)).toEqual({ [numericKey]: nudged });
      });
    });
  }

  it('a value equal to the default is NOT written', () => {
    saveBaseSpeedConfig({ ...DEFAULT_BASE_SPEED_CONFIG });
    expect(storageGet(KEYS.BASE_SPEED_CONFIG)).toEqual({});
    saveBaseSpeedConfig({ ...DEFAULT_BASE_SPEED_CONFIG, normalSpeedPxPerSec: 151 });
    expect(storageGet(KEYS.BASE_SPEED_CONFIG)).toEqual({ normalSpeedPxPerSec: 151 });
  });

  it('the loaders VALIDATION GUARDS still reject an out-of-band config', () => {
    // The guards predate this block and must survive it: an invalid stored value falls back to the
    // whole default set rather than being half-honoured.
    storageSet(KEYS.ROW_LAYOUT_CONFIG, { rowGapMultiplier: -1 });
    expect(loadRowLayoutConfig()).toEqual(DEFAULT_ROW_LAYOUT_CONFIG);
    storageSet(KEYS.BASE_SPEED_CONFIG, { min: 0 });
    expect(loadBaseSpeedConfig()).toEqual(DEFAULT_BASE_SPEED_CONFIG);
  });

  it('the retired speedBrakeTThreshold key is ignored structurally, not by a migration', () => {
    // CONFIG-DIFF-2 deleted the hand-written migration for this rename. The resolver subsumes it.
    storageSet(KEYS.RACE_BEHAVIOR_CONFIG, { speedBrakeTThreshold: 0.02 });
    const cfg = loadRaceBehaviorConfig();
    expect(cfg.speedBrakeTThreshold).toBeUndefined();
    expect(cfg.speedBrakeTMultiplier).toBe(DEFAULT_RACE_BEHAVIOR_CONFIG.speedBrakeTMultiplier);
  });
});
