import { describe, it, expect } from 'vitest';
import { computeTimingFromConfig } from './cameraTimingComputation.js';

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

  it('uses fallback battlePulkThresholdPx', () => expect(t.battlePulkThresholdPx).toBe(200));
  it('uses fallback battlePulkThresholdT', () => expect(t.battlePulkThresholdT).toBe(0.12));
  it('uses fallback battleMinDurationMs', () => expect(t.battleMinDurationMs).toBe(3000));
  it('uses fallback endgameThreshold', () => expect(t.endgameThreshold).toBe(0.85));
  it('uses fallback battleCooldownMs', () => expect(t.battleCooldownMs).toBe(8000));
  it('uses fallback maxStateDuration', () => expect(t.maxStateDuration).toBe(8000));
  it('uses fallback battleMaxDurationMs', () => expect(t.battleMaxDurationMs).toBe(6000));
  it('uses fallback minStateHoldMs', () => expect(t.minStateHoldMs).toBe(5000));
  it('uses fallback overviewCooldownMs', () => expect(t.overviewCooldownMs).toBe(15000));
  it('showDiagnostics defaults false', () => expect(t.showDiagnostics).toBe(false));
  it('diagEnabled defaults false', () => expect(t.diagEnabled).toBe(false));
  it('uses fallback tcOverview = 1.5', () => expect(t.tcOverview).toBe(1.5));
  it('uses fallback tcLeader = 0.3', () => expect(t.tcLeader).toBe(0.3));
  it('uses fallback overviewStartDelay = 15', () => expect(t.overviewStartDelay).toBe(15));
  it('uses fallback overviewTargetCount = 2', () => expect(t.overviewTargetCount).toBe(2));
  it('all states present in minStateHoldByState', () => {
    expect(Object.keys(t.minStateHoldByState).sort()).toEqual([
      'BATTLE_ZOOM',
      'COMEBACK_ZOOM',
      'LEADER_ZOOM',
      'LEAD_CHANGE',
      'OVERVIEW',
    ]);
  });
  it('all states present in lfByState', () => {
    expect(Object.keys(t.lfByState).sort()).toEqual([
      'BATTLE_ZOOM',
      'COMEBACK_ZOOM',
      'LEADER_ZOOM',
      'LEAD_CHANGE',
      'OVERVIEW',
    ]);
  });
  it('lfOverview matches tcToLerpFactor(1.5)', () => {
    const expected = 1 - Math.pow(0.1, 1 / (1.5 * 60));
    expect(t.lfOverview).toBeCloseTo(expected, 10);
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
  it('reads battlePulkThresholdPx from config', () => {
    expect(computeTimingFromConfig({ battlePulkThresholdPx: 120 }).battlePulkThresholdPx).toBe(120);
  });
  it('reads battlePulkThresholdT from config', () => {
    expect(computeTimingFromConfig({ battlePulkThresholdT: 0.08 }).battlePulkThresholdT).toBe(0.08);
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

  it('reads tcOverview from profiles', () => expect(t.tcOverview).toBe(1.5));
  it('reads tcLeader from profiles', () => expect(t.tcLeader).toBe(0.3));
  it('reads tcBattle from profiles', () => expect(t.tcBattle).toBe(0.3));
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
    expect(t.tcOverview).toBe(2.0);
    expect(t.tcLeader).toBe(0.3);
  });
  it('object cameraTransitionSeconds reads per-state', () => {
    const t = computeTimingFromConfig({
      cameraTransitionSeconds: { overview: 1.0, leader: 0.5, battle: 0.4, comeback: 0.6 },
    });
    expect(t.tcOverview).toBe(1.0);
    expect(t.tcLeader).toBe(0.5);
    expect(t.tcBattle).toBe(0.4);
    expect(t.tcComeback).toBe(0.6);
  });
  it('minStateHoldByState all equal minStateHoldMs in legacy path', () => {
    const t = computeTimingFromConfig({ minStateHoldMs: 3000 });
    for (const v of Object.values(t.minStateHoldByState)) expect(v).toBe(3000);
  });
  it('entryTC equals trackingTC in legacy path (no distinction)', () => {
    const t = computeTimingFromConfig({ cameraTransitionSeconds: 0.8 });
    expect(t.tcEntryOverview).toBe(t.tcOverview);
    expect(t.tcEntryLeader).toBe(t.tcLeader);
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
