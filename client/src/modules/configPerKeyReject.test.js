// ============================================================
// File:        configPerKeyReject.test.js
// Project:     RaceArena — PER-KEY-REJECT-1 (the owner's order, 2026-09-04)
//
// THE ACCEPTANCE, store by store, in consequence form. `storage/configValidate.test.js` tests the
// rule engine against a made-up store; this file asks the real five whether an operator keeps their
// tunings.
//
// SABOTAGE IN BOTH DIRECTIONS, which is what the brief asked for and what makes the result readable:
//   · a config with ONE bad key keeps every other key and REPORTS the one
//   · a config with NO bad key is untouched and SILENT
// and — the assertion that makes the repair provable rather than merely present — that THE OLD
// BEHAVIOUR WOULD HAVE FAILED THE FIRST. `{ ...DEFAULTS }` is one line to reproduce exactly, which
// is precisely what the five loaders returned.
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KEYS, storageSet } from './storage/storage.js';
import { applyKeyRules } from './storage/configValidate.js';
import {
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_FRAME_TIMING_CONFIG,
} from './storage/defaults.js';
import { loadRaceDynamicsConfig, RACE_DYNAMICS_RULES } from './raceDynamicsConfig.js';
import { loadRaceBehaviorConfig, RACE_BEHAVIOR_RULES } from './raceBehaviorConfig.js';
import { loadRowLayoutConfig, ROW_LAYOUT_RULES } from './rowLayoutConfig.js';
import { loadBaseSpeedConfig, BASE_SPEED_RULES } from './baseSpeedConfig.js';
import { loadFrameTimingConfig, FRAME_TIMING_RULES } from './frameTimingConfig.js';

/**
 * The five stores that validate, each with the ONE bad key its sabotage uses and a handful of OTHER
 * settings an operator would plausibly have. Every `others` value is legal and differs from the
 * default, so it is exactly the tuning the old loader threw away.
 */
const STORES = [
  {
    name: 'raceDynamics',
    key: KEYS.RACE_DYNAMICS_CONFIG,
    defaults: DEFAULT_RACE_DYNAMICS_CONFIG,
    rules: RACE_DYNAMICS_RULES,
    load: loadRaceDynamicsConfig,
    // The exact value LOADER-TOLERANCE-1 was about, pushed out of range.
    bad: ['choreoOutcomeStart', 0.9],
    others: { pulkLeaderBrake: 0.15, pulkChallengerBoost: 0.12, choreoIntensity: 0.8 },
  },
  {
    name: 'raceBehavior',
    key: KEYS.RACE_BEHAVIOR_CONFIG,
    defaults: DEFAULT_RACE_BEHAVIOR_CONFIG,
    rules: RACE_BEHAVIOR_RULES,
    load: loadRaceBehaviorConfig,
    bad: ['draftingConeAngle', 200],
    others: { comfortThreshold: 0.55, runoutZone: 0.08, lateralForce: 0.02 },
  },
  {
    name: 'rowLayout',
    key: KEYS.ROW_LAYOUT_CONFIG,
    defaults: DEFAULT_ROW_LAYOUT_CONFIG,
    rules: ROW_LAYOUT_RULES,
    load: loadRowLayoutConfig,
    bad: ['rowGapMultiplier', -1],
    others: { maxCapacityFactor: 0.9 },
  },
  {
    name: 'baseSpeed',
    key: KEYS.BASE_SPEED_CONFIG,
    defaults: DEFAULT_BASE_SPEED_CONFIG,
    rules: BASE_SPEED_RULES,
    load: loadBaseSpeedConfig,
    bad: ['normalSpeedPxPerSec', -5],
    others: { min: 0.0009, max: 0.00121 },
  },
  {
    name: 'frameTiming',
    key: KEYS.FRAME_TIMING_CONFIG,
    defaults: DEFAULT_FRAME_TIMING_CONFIG,
    rules: FRAME_TIMING_RULES,
    load: loadFrameTimingConfig,
    bad: ['dtSmoothingAlpha', 2],
    others: { scoreboardIntervalMs: 750 },
  },
];

let warn;

beforeEach(() => {
  localStorage.clear();
  // The reporter de-duplicates per page for the life of the module, so each spec uses its own key
  // value where it needs a fresh line; the spy is only ever asked whether it fired AT ALL for the
  // silent case, which no earlier spec can satisfy on its behalf.
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe.each(STORES)('$name — a rejection costs one key, not the config', (store) => {
  const [badKey, badValue] = store.bad;

  it('its own shipped DEFAULTS satisfy every one of its rules', () => {
    const { rejected, storeDefects } = applyKeyRules(
      { ...store.defaults },
      store.defaults,
      store.rules
    );
    expect(rejected).toEqual([]);
    expect(storeDefects).toEqual([]);
  });

  it('this spec’s own OTHERS all differ from the defaults — else it proves nothing', () => {
    // Written after `runoutZone: 0.05` was picked as an "operator setting" and turned out to BE the
    // shipped default: the old-loader proof below then compared a value against itself and passed
    // for the wrong reason. A test that hardcodes what it tests is this project's named failure
    // mode; this is the cheapest guard against it.
    for (const [k, v] of Object.entries(store.others)) {
      expect(Object.prototype.hasOwnProperty.call(store.defaults, k), `${store.name}.${k}`).toBe(
        true
      );
      expect(v, `${store.name}.${k} equals its default`).not.toBe(store.defaults[k]);
    }
  });

  it('every rule names only keys that exist in the defaults', () => {
    // A rule naming a key the defaults do not have could never revert it, and would fail forever.
    for (const rule of store.rules) {
      for (const k of rule.keys) {
        expect(Object.prototype.hasOwnProperty.call(store.defaults, k), `${store.name}.${k}`).toBe(
          true
        );
      }
    }
  });

  it('SABOTAGE A — one bad key: the rest survives, and the operator is TOLD which key', () => {
    storageSet(store.key, { [badKey]: badValue, ...store.others });
    const loaded = store.load();

    expect(loaded[badKey]).toBe(store.defaults[badKey]);
    for (const [k, v] of Object.entries(store.others)) expect(loaded[k]).toBe(v);

    // Which key, what was stored, and what is being used instead — the three things the brief asked
    // the operator to be told. Asserted HERE rather than in a spec of its own because the reporter
    // de-duplicates per (store, key) for the life of the module: a second load of the same bad key
    // is deliberately silent, so only the first one has a line to inspect.
    const line = warn.mock.calls.map((c) => String(c[0])).find((m) => m.includes(badKey));
    expect(line, `no warning named ${badKey}`).toBeTruthy();
    expect(line).toContain('REJECTED');
    expect(line).toContain(JSON.stringify(badValue));
    expect(line).toContain(JSON.stringify(store.defaults[badKey]));
  });

  it('SABOTAGE A — and it says it ONCE, not on every race start', () => {
    // Runs after the spec above, so this key has already announced itself. These loaders run at
    // every race start; a line repeated a thousand times is a different kind of silence.
    storageSet(store.key, { [badKey]: badValue, ...store.others });
    store.load();
    store.load();
    expect(warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes(badKey))).toEqual([]);
  });

  it('★ SABOTAGE A — PROVES THE OLD BEHAVIOUR WOULD HAVE FAILED IT', () => {
    storageSet(store.key, { [badKey]: badValue, ...store.others });
    const loaded = store.load();
    const whatTheOldLoaderReturned = { ...store.defaults };

    // The bad key ends up at its default either way. Everything the operator set does not.
    expect(whatTheOldLoaderReturned[badKey]).toBe(loaded[badKey]);
    for (const [k, v] of Object.entries(store.others)) {
      expect(whatTheOldLoaderReturned[k], `${k} was NOT lost by the old loader`).not.toBe(v);
      expect(loaded[k]).toBe(v);
    }
    expect(whatTheOldLoaderReturned).not.toEqual(loaded);
  });

  it('SABOTAGE B — no bad key: untouched and SILENT', () => {
    storageSet(store.key, { ...store.others });
    const loaded = store.load();

    for (const [k, v] of Object.entries(store.others)) expect(loaded[k]).toBe(v);
    for (const k of Object.keys(store.defaults)) {
      if (k in store.others) continue;
      expect(loaded[k], `${k} drifted`).toEqual(store.defaults[k]);
    }
    expect(warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('REJECTED'))).toEqual(
      []
    );
  });

  it('SABOTAGE B — an empty store is untouched and SILENT', () => {
    const loaded = store.load();
    expect(loaded).toEqual(store.defaults);
    expect(warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('REJECTED'))).toEqual(
      []
    );
  });
});

describe('the two stores that validate NOTHING stay that way (the census, pinned)', () => {
  it('camera and autoScale declare no rules, deliberately', async () => {
    // Named rather than asserted by absence: if either grows a rule list, this test is the place
    // the decision gets re-argued, and the header of each store says why there is none today.
    const camera = await import('./cameraConfig.js');
    const autoScale = await import('./autoSpriteScale.js');
    expect(Object.keys(camera).filter((k) => k.endsWith('_RULES'))).toEqual([]);
    expect(Object.keys(autoScale).filter((k) => k.endsWith('_RULES'))).toEqual([]);
  });
});
