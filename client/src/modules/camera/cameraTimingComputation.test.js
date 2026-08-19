import { describe, it, expect } from 'vitest';
import { computeTimingFromConfig } from './cameraTimingComputation.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';
import { CAM_STATE } from './CameraDirector.js';

// Minimal profiles object used across tests.
function minimalProfiles() {
  return {
    OVERVIEW: {
      trackingTC: 1.5,
      minStateHold: 5000,
      maxStateDuration: 8000,
      entryTC: 1.5,
      leadInDuration: 0,
      leadOutDuration: 0,
    },
    LEADER_ZOOM: {
      trackingTC: 0.3,
      minStateHold: 5000,
      maxStateDuration: 8000,
      entryTC: 0.3,
      leadInDuration: 0,
      leadOutDuration: 0,
    },
    BATTLE_ZOOM: {
      trackingTC: 0.3,
      minStateHold: 5000,
      maxStateDuration: 6000,
      entryTC: 0.3,
      leadInDuration: 0,
      leadOutDuration: 0,
    },
    COMEBACK_ZOOM: {
      trackingTC: 0.3,
      minStateHold: 5000,
      maxStateDuration: 8000,
      entryTC: 0.3,
      leadInDuration: 0,
      leadOutDuration: 0,
    },
    LEAD_CHANGE: {
      trackingTC: 0.3,
      minStateHold: 5000,
      maxStateDuration: 8000,
      entryTC: 0.3,
      leadInDuration: 0,
      leadOutDuration: 0,
    },
  };
}

describe('computeTimingFromConfig — null config (all defaults)', () => {
  const t = computeTimingFromConfig(null);

  it('uses fallback battlePulkThresholdT', () => expect(t.battlePulkThresholdT).toBe(0.05));
  it('uses fallback battleIsolationThresholdT', () => expect(t.battleIsolationThresholdT).toBe(0));
  it('uses fallback battleMinDurationMs', () => expect(t.battleMinDurationMs).toBe(3000));
  // ENDGAME-FALLBACK-1: this pinned the literal 0.85 that lived beside the key. The second copy is
  // gone — the fallback READS `defaults.js` now — so what is pinned is the RULE, and it cannot go
  // stale when the default moves. IF DELETED: nothing states that a null config still resolves this
  // key at all, which is the property that kept the old literal unreachable and therefore invisible
  // while it drifted two ships out of date.
  it('reads the DEFAULT endgameThreshold, it does not copy it', () =>
    expect(t.endgameThreshold).toBe(DEFAULT_CAMERA_CONFIG.endgameThreshold));
  it('uses fallback battleCooldownMs', () => expect(t.battleCooldownMs).toBe(8000));
  // FALLBACK-MIRRORS-1: pinned the literal 8000 that lived beside the key against a shipped 4000.
  // The copy is gone — this branch reads `defaults.js` now — so the RULE is what is pinned and it
  // cannot go stale when the default moves. IF DELETED: nothing states that the LEGACY path (a
  // config with no `cameraStateProfiles`) resolves this key at all, and that path is the only one
  // where the top-level `maxStateDuration` key is read — the shipped config takes the profiles
  // branch, where a per-state profile decides instead.
  it('reads the DEFAULT maxStateDuration on the legacy path, it does not copy it', () =>
    expect(t.maxStateDuration).toBe(DEFAULT_CAMERA_CONFIG.maxStateDuration));
  it('uses fallback battleMaxDurationMs', () => expect(t.battleMaxDurationMs).toBe(6000));
  it('uses fallback minStateHoldMs', () => expect(t.minStateHoldMs).toBe(5000));
  it('uses fallback overviewCooldownMs', () => expect(t.overviewCooldownMs).toBe(15000));
  it('showDiagnostics defaults false', () => expect(t.showDiagnostics).toBe(false));
  it('diagEnabled defaults false', () => expect(t.diagEnabled).toBe(false));
  it('uses fallback tcOverview = 1.5', () => expect(t.tcByState.OVERVIEW).toBe(1.5));
  it('uses fallback tcLeader = 0.3', () => expect(t.tcByState.LEADER_ZOOM).toBe(0.3));
  it('uses fallback overviewStartDelay = 15', () => expect(t.overviewStartDelay).toBe(15));
  it('uses fallback overviewTargetCount = 2', () => expect(t.overviewTargetCount).toBe(2));
  // RUNIN-OWNS-1: the run-in adds no camera state, so it must add no per-state timing either. A
  // RUN_IN key appearing in any of these maps means the state shape has crept back in.
  it('the run-in adds no state to any per-state timing map', () => {
    for (const m of [
      'tcByState',
      'lfByState',
      'lfEntryByState',
      'minStateHoldByState',
      'maxStateDurationByState',
      'leadAheadEnabledByState',
      'leadOutEnabledByState',
      'maxEntryDurationByState',
      'phasedByState',
    ]) {
      expect(Object.keys(t[m]), m).not.toContain('RUN_IN');
    }
  });
  it('runInShot resolves, and defaults to the shipped value', () => {
    expect(t.runInShot).toBe(DEFAULT_CAMERA_CONFIG.runInShot);
    expect(computeTimingFromConfig({ runInShot: false }).runInShot).toBe(false);
  });
  it('lfOverview matches tcToLerpFactor(1.5)', () => {
    const expected = 1 - Math.pow(0.1, 1 / (1.5 * 60));
    expect(t.lfByState.OVERVIEW).toBeCloseTo(expected, 10);
  });
  it('phasedByState has leadInDuration 0 for all states (legacy)', () => {
    for (const v of Object.values(t.phasedByState)) {
      expect(v.leadInDuration).toBe(0);
      expect(v.leadOutDuration).toBe(0);
    }
  });
  it('leadAheadEnabledByState defaults true for all states', () => {
    for (const v of Object.values(t.leadAheadEnabledByState)) expect(v).toBe(true);
  });
});

describe('computeTimingFromConfig — explicit global tunables', () => {
  it('reads battlePulkThresholdT from config', () => {
    expect(computeTimingFromConfig({ battlePulkThresholdT: 0.08 }).battlePulkThresholdT).toBe(0.08);
  });
  it('reads battleIsolationThresholdT from config', () => {
    expect(
      computeTimingFromConfig({ battleIsolationThresholdT: 0.09 }).battleIsolationThresholdT
    ).toBe(0.09);
  });
  it('reads endgameThreshold from config', () => {
    expect(computeTimingFromConfig({ endgameThreshold: 0.9 }).endgameThreshold).toBe(0.9);
  });
  it('clamps battleMaxGroupSize to [3, 6]', () => {
    expect(computeTimingFromConfig({ battleMaxGroupSize: 1 }).battleMaxGroupSize).toBe(3);
    expect(computeTimingFromConfig({ battleMaxGroupSize: 99 }).battleMaxGroupSize).toBe(6);
    expect(computeTimingFromConfig({ battleMaxGroupSize: 4 }).battleMaxGroupSize).toBe(4);
  });
});

describe('computeTimingFromConfig — cameraStateProfiles path', () => {
  const cfg = { cameraStateProfiles: minimalProfiles() };
  const t = computeTimingFromConfig(cfg);

  it('reads tcOverview from profiles', () => expect(t.tcByState.OVERVIEW).toBe(1.5));
  it('reads tcLeader from profiles', () => expect(t.tcByState.LEADER_ZOOM).toBe(0.3));
  it('reads tcBattle from profiles', () => expect(t.tcByState.BATTLE_ZOOM).toBe(0.3));
  it('BATTLE_ZOOM maxStateDuration from profile', () => {
    expect(t.maxStateDurationByState['BATTLE_ZOOM']).toBe(6000);
  });
  it('OVERVIEW maxStateDuration from profile', () => {
    expect(t.maxStateDurationByState['OVERVIEW']).toBe(8000);
  });
  it('phasedByState leadInDuration from profile', () => {
    expect(t.phasedByState['OVERVIEW'].leadInDuration).toBe(0);
  });
  it('lfByState matches computed lf for tcLeader', () => {
    const expected = 1 - Math.pow(0.1, 1 / (0.3 * 60));
    expect(t.lfByState['LEADER_ZOOM']).toBeCloseTo(expected, 10);
  });
  it('profiles with leadInDuration > 0 are reflected in phasedByState', () => {
    const profiles = minimalProfiles();
    profiles.LEADER_ZOOM.leadInDuration = 1.2;
    const t2 = computeTimingFromConfig({ cameraStateProfiles: profiles });
    expect(t2.phasedByState['LEADER_ZOOM'].leadInDuration).toBe(1.2);
  });
  it('leadAheadEnabled false from profile', () => {
    const profiles = minimalProfiles();
    profiles.LEADER_ZOOM.leadAheadEnabled = false;
    const t2 = computeTimingFromConfig({ cameraStateProfiles: profiles });
    expect(t2.leadAheadEnabledByState['LEADER_ZOOM']).toBe(false);
  });
});

describe('computeTimingFromConfig — legacy flat-field path', () => {
  it('scalar cameraTransitionSeconds applies to tcOverview only', () => {
    const t = computeTimingFromConfig({ cameraTransitionSeconds: 2.0 });
    expect(t.tcByState.OVERVIEW).toBe(2.0);
    expect(t.tcByState.LEADER_ZOOM).toBe(0.3);
  });
  it('object cameraTransitionSeconds reads per-state', () => {
    const t = computeTimingFromConfig({
      cameraTransitionSeconds: { overview: 1.0, leader: 0.5, battle: 0.4, comeback: 0.6 },
    });
    expect(t.tcByState.OVERVIEW).toBe(1.0);
    expect(t.tcByState.LEADER_ZOOM).toBe(0.5);
    expect(t.tcByState.BATTLE_ZOOM).toBe(0.4);
    expect(t.tcByState.COMEBACK_ZOOM).toBe(0.6);
  });
  it('minStateHoldByState all equal minStateHoldMs in legacy path', () => {
    const t = computeTimingFromConfig({ minStateHoldMs: 3000 });
    for (const v of Object.values(t.minStateHoldByState)) expect(v).toBe(3000);
  });
  it('entryTC equals trackingTC in legacy path (no distinction)', () => {
    // CAMERA-HYGIENE-2: asserted on the lerp-factor maps, which the director actually reads.
    // It used to compare `tcEntryOverview` against `tcOverview` — two returned scalars that no
    // production code consumed, so the assertion held whatever the maps said.
    const t = computeTimingFromConfig({ cameraTransitionSeconds: 0.8 });
    expect(t.lfEntryByState.OVERVIEW).toBe(t.lfByState.OVERVIEW);
    expect(t.lfEntryByState.LEADER_ZOOM).toBe(t.lfByState.LEADER_ZOOM);
  });
});

describe('computeTimingFromConfig — COMEBACK minStateHold override', () => {
  it('comebackMinDuration overrides COMEBACK_ZOOM minStateHold', () => {
    const t = computeTimingFromConfig({ comebackMinDuration: 5 });
    expect(t.minStateHoldByState['COMEBACK_ZOOM']).toBe(5000);
  });
  it('missing comebackMinDuration keeps default COMEBACK_ZOOM minStateHold', () => {
    const t = computeTimingFromConfig(null);
    expect(t.minStateHoldByState['COMEBACK_ZOOM']).toBe(5000); // MIN_STATE_HOLD_MS default
  });
  it('comebackMinDuration of 0 still overrides (null guard is null-check, not falsy)', () => {
    const t = computeTimingFromConfig({ comebackMinDuration: 0 });
    expect(t.minStateHoldByState['COMEBACK_ZOOM']).toBe(0);
  });
});

describe('computeTimingFromConfig — LEAD_CHANGE minStateHold override', () => {
  it('leadChangeMinDuration overrides LEAD_CHANGE minStateHold', () => {
    const t = computeTimingFromConfig({ leadChangeMinDuration: 2 });
    expect(t.minStateHoldByState['LEAD_CHANGE']).toBe(2000);
  });
  it('missing leadChangeMinDuration keeps default', () => {
    const t = computeTimingFromConfig(null);
    expect(t.minStateHoldByState['LEAD_CHANGE']).toBe(5000);
  });
});

describe('computeTimingFromConfig — candidate weights', () => {
  it('reads battleWeight', () => {
    expect(computeTimingFromConfig({ battleWeight: 1.0 }).battleWeight).toBe(1.0);
  });
  it('defaults all weights correctly', () => {
    const t = computeTimingFromConfig(null);
    expect(t.battleWeight).toBe(0.8);
    expect(t.leadChangeWeight).toBe(0.7);
    expect(t.comebackWeight).toBe(0.6);
    expect(t.overviewWeight).toBe(0.3);
  });
});

describe('computeTimingFromConfig — finish sequence', () => {
  it('reads finishPauseMs', () => {
    expect(computeTimingFromConfig({ finishPauseMs: 3000 }).finishPauseMs).toBe(3000);
  });
  it('reads finishOverviewLookbackPx', () => {
    expect(
      computeTimingFromConfig({ finishOverviewLookbackPx: 500 }).finishOverviewLookbackPx
    ).toBe(500);
  });
});

// ── PHOTO-FINISH-STATE-1: the mirror, and why this is the CLASS and not the instance ────────────
//
// `ALL_STATES` in cameraTimingComputation.js says it mirrors `CAM_STATE` in CameraDirector.js. It
// cannot IMPORT it — the director imports this module, so the arrow runs one way and a second one
// would be a cycle. For as long as PHOTO_FINISH existed, the mirror was short by it, and nothing
// noticed: every read of a per-state map is written `map[state] ?? fallback`, so a missing key does
// not throw, it silently substitutes another state's number.
//
// THE TWO TESTS THIS REPLACED WROTE THE KEY LIST OUT BY HAND, once per map. That is the same defect
// one level up: one of them listed five states and the other six, they disagreed with each other,
// and the five-state one was GREEN — it was pinning the bug. So neither the state list nor the set
// of maps is written here. Both are discovered: the states from `CAM_STATE`, the maps from every
// returned key whose name ends in `ByState`.
//
// IF THIS TEST IS DELETED: a seventh camera state can be added to the director, wired into its
// state machine and given a profile in defaults.js, and every per-state timing map will quietly
// hand it another state's numbers. Nothing else in the tree compares the two lists — that is the
// hole PHOTO_FINISH sat in.
describe('computeTimingFromConfig — every per-state map mirrors CAM_STATE', () => {
  const EXPECTED = Object.values(CAM_STATE).sort();
  const perStateMaps = (t) =>
    Object.entries(t).filter(([k, v]) => k.endsWith('ByState') && v && typeof v === 'object');

  it('CAM_STATE is the six states this module knows about', () => {
    // Guards the guard: if the director gains a state, EXPECTED grows and the assertions below
    // start failing — which is the whole point. This line only fails if CAM_STATE stops being a
    // flat string map, in which case the discovery above needs rewriting rather than extending.
    expect(EXPECTED.length).toBeGreaterThanOrEqual(6);
    expect(EXPECTED.every((s) => typeof s === 'string')).toBe(true);
  });

  for (const [label, config] of [
    ['null config (fallbacks only)', null],
    ['profiles path (shipped defaults)', DEFAULT_CAMERA_CONFIG],
    ['legacy flat path (no cameraStateProfiles)', { cameraTransitionSeconds: 0.9 }],
  ]) {
    it(`${label}: every ByState map carries exactly CAM_STATE's keys`, () => {
      const t = computeTimingFromConfig(config);
      const maps = perStateMaps(t);
      // A run that found no maps would pass every assertion below and prove nothing.
      expect(maps.length).toBeGreaterThanOrEqual(9);
      for (const [name, map] of maps) {
        expect([name, Object.keys(map).sort()]).toEqual([name, EXPECTED]);
      }
    });
  }

  it('PHOTO_FINISH reads its OWN profile, not BATTLE_ZOOM\u2019s', () => {
    // The state that was missing, pinned at the three values it was silently borrowing. Each of
    // these is a Dev Screen control on the PHOTO_FINISH row that moved nothing before.
    const t = computeTimingFromConfig(DEFAULT_CAMERA_CONFIG);
    const p = DEFAULT_CAMERA_CONFIG.cameraStateProfiles.PHOTO_FINISH;
    expect(t.minStateHoldByState.PHOTO_FINISH).toBe(p.minStateHold);
    expect(t.maxStateDurationByState.PHOTO_FINISH).toBe(p.maxStateDuration);
    expect(t.maxEntryDurationByState.PHOTO_FINISH).toBe(p.maxEntryDurationMs);
    expect(t.leadAheadEnabledByState.PHOTO_FINISH).toBe(p.leadAheadEnabled);
    expect(t.leadOutEnabledByState.PHOTO_FINISH).toBe(p.leadOutEnabled);
    expect(t.tcByState.PHOTO_FINISH).toBe(p.trackingTC);
  });

  it('a PHOTO_FINISH profile the config omits falls back to BATTLE_ZOOM\u2019s timing', () => {
    // The borrowing this state has always done is now the FALLBACK rather than the behaviour, and
    // it still has to work: a stored config written before the profile existed must not produce an
    // undefined time constant.
    const profiles = structuredClone(DEFAULT_CAMERA_CONFIG.cameraStateProfiles);
    delete profiles.PHOTO_FINISH;
    const t = computeTimingFromConfig({ cameraStateProfiles: profiles });
    expect(t.tcByState.PHOTO_FINISH).toBe(t.tcByState.BATTLE_ZOOM);
    expect(t.lfByState.PHOTO_FINISH).toBe(t.lfByState.BATTLE_ZOOM);
    expect(Number.isFinite(t.minStateHoldByState.PHOTO_FINISH)).toBe(true);
    expect(Number.isFinite(t.maxStateDurationByState.PHOTO_FINISH)).toBe(true);
  });
});
