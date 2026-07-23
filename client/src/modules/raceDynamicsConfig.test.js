// ============================================================
// File:        raceDynamicsConfig.test.js
// Path:        client/src/modules/raceDynamicsConfig.test.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: PR-A3 tests — raceDynamicsConfig storage CRUD.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_RACE_DYNAMICS_CONFIG,
  loadRaceDynamicsConfig,
  saveRaceDynamicsConfig,
} from './raceDynamicsConfig.js';

vi.mock('./storage/storage.js', () => ({
  KEYS: { RACE_DYNAMICS_CONFIG: 'racearena:raceDynamicsConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

import { storageGet, storageSet } from './storage/storage.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('DEFAULT_RACE_DYNAMICS_CONFIG', () => {
  it('has expected default values', () => {
    expect(DEFAULT_RACE_DYNAMICS_CONFIG).toEqual({
      reRollVariationPercent: 75,
      reRollTransitionDuration: 3.0,
      reRollIntervalDivisor: 10,
      reRollLastPositionPercent: 95,
      trajectoryTransitionDuration: 1.0,
      racePlanBonusStrengthMultiplier: 2.0,
      racePlanBonusTransitionEnd: 0.75,
      racePlanBonusFadeDuration: 1500,
      racePlanCorridorStart: 0.55,
      racePlanCorridorEnd: 1.0,
      racePlanMinDurationSec: 30,
      pulkBiasGain: 2.0,
      pulkEnvelopeMaxEffect: 0.12,
      pulkEnvelopeMaxStepPerFrame: 0.01,
      // SHIPPED DEFAULT: the shared PULK-director contest strengths (rides the realism envelope).
      pulkLeaderBrake: 0.1,
      pulkChallengerBoost: 0.06,
      pulkCeilingCap: true,
      // DEFAULT-FLIP 2026-07-13: shipped world moved to the swept + eye-tested world (OutcomeStart 0.5,
      // boostHeadroom 0.10, dropDepth 8). STAGE-3 CLEANUP: the choreoEnabled + pulkLeadRotationEnabled
      // toggles were REMOVED — choreography + rotation are now unconditional. STAGE-4 CLEANUP: the classic
      // reactive director + its knobs were REMOVED — only the shared strengths survive. STAGE-5a RENAME:
      // directorV4* → choreo* (behavior-identical). STAGE-5b-i RE-HOME: the borrowed governorDirector*/
      // governor* strengths + envelope were re-homed to the pulk* namespace (same values, same ranges) —
      // snapshot re-baselined to the new key names; stored old keys carry over via RENAMED_KEY_MIGRATION.
      pulkBoostHeadroom: 0.1,
      choreoSuppressChaosBonusB1: false,
      choreoIntensity: 0.6,
      choreoPackBandStrictness: 0.5,
      choreoReleaseProgress: 0.97,
      choreoResolveB2: 0.8,
      choreoResolveB3: 0.7,
      choreoResolveB4: 0.65,
      choreoResolveB5: 0.6,
      choreoOutcomeStart: 0.6, // 0.6 shipped 2026-07-17 (SWEEP 2: later PULK end; valid range widened to [0.25,0.60])
      // Front act window + B1 lead carousel (C1). All OFF/neutral by default.
      contestWindowStart: 0.8, // initialised to the shipped choreoResolveB2 so baselines stay comparable
      carouselEnabled: false,
      carouselMinParticipants: 3,
      carouselAmplitudeRanks: 2,
      carouselJitterPct: 0.15,
      carouselRoleBiasStrength: 0, // 0 = role-biased dice OFF
      pulkFrontPool: 8,
      phaseSplitBonusEnabled: true,
      areaBonusEarly: 1.0,
      areaBonusPulk: 0,
      areaBonusPost: 1.0,
      rowBonusEarly: 1,
      rowBonusPulk: 0,
      rowBonusPost: 1,
      enableRowEnvSmooth: true,
      // Reopened PULK (feat/pulk-reopen).
      racePlanPulkStart: 0.25,
      // STAGE-1/2/3 CLEANUP 2026-07-13: removed the M1 front-contest flag, the M2 cohesion-spring keys,
      // the predecessor PULK race-director's two keys, and (S3 de-flag) the choreoEnabled +
      // pulkLeadRotationEnabled toggles — snapshot re-baselined to the surviving keys (intended).
      // PulkLeadRotation (unconditional).
      pulkLeadRotationAttackerSlots: 2,
      pulkLeadRotationDropDepthLengths: 8, // DEFAULT-FLIP 2026-07-13 (D8 = fairness-safe depth)
      pulkLeadRotationOutsiderMaxReachLengths: 15,
      pulkLeadRotationDeadlockTimeoutMs: 12000,
      pulkLeadRotationMinHoldMs: 750,
      // Pack-only strictness release (OUTCOME action lever; default OFF, sim-only experiment).
      packReleaseEnabled: false,
      packReSteerThreshold: 1.0,
      // B2-attacker "Attack & Fall" (band-arrival release). SHIPPED ON at count=3 (validated winner).
      b2AttackHeroes: 3,
      b2AttackPeakRank: 5,
      b2AttackFinalRank: 7,
      b2AttackProgress: { start: 0.4, end: 0.7 },
      b2AttackResolveProgress: 0.85,
      b2AttackBandArrival: true,
      universalBandArrival: false,
      // Gap-cap re-roll bias — OFF is byte-identical; RETUNED 2026-07-23 to symmetric/0.75/0.5.
      gapRerollEnabled: true, // SHIPPED ON 2026-07-22; retuned 2026-07-23 (symmetric, G=0.75, s=0.5)
      gapRerollThresholdLengths: 0.75,
      gapRerollStrength: 0.5,
      gapRerollMode: 'symmetric',
      gapRerollDevMarker: false,
    });
  });

  it('gap-reroll ships ON at the RETUNED gate winner; turning it OFF is byte-identical', () => {
    // Retuned 2026-07-23 (G 1.5→0.75, strength 1.0→0.5). The gate held fairness exactly neutral
    // (pooled band-reach 71.6% both arms, Holm 2/4 both) while halving correction hardness —
    // tiltSaturated 46.0%→18.7%. These two numbers are the shipped contract; pin them.
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollEnabled).toBe(true);
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollDevMarker).toBe(false);
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollThresholdLengths).toBe(0.75);
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollStrength).toBe(0.5);
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollMode).toBe('symmetric');
  });

  it('the retuned defaults are valid DevScreen slider positions (Reset All Defaults lands on them)', () => {
    // resetAll() spreads DEFAULT_RACE_DYNAMICS_CONFIG wholesale, so the sliders show whatever is here.
    // Guard the two control contracts: G input is min 0.5, max 4.0, step 0.25; strength is 0..1.5
    // step 0.25. A default off-step or out-of-range would render a value the control cannot re-enter.
    const G = DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollThresholdLengths;
    const S = DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollStrength;
    expect(G).toBeGreaterThanOrEqual(0.5);
    expect(G).toBeLessThanOrEqual(4.0);
    expect(Math.round((G - 0.5) / 0.25) * 0.25).toBeCloseTo(G - 0.5, 10);
    expect(S).toBeGreaterThanOrEqual(0);
    expect(S).toBeLessThanOrEqual(1.5);
    expect(Math.round(S / 0.25) * 0.25).toBeCloseTo(S, 10);
  });

  it('a persisted gap-reroll config round-trips through load/merge (plumbs to createRacePlan)', () => {
    // raceDynamicsConfig merges any key present in DEFAULT via spread — no whitelist. A stored enable +
    // custom G survives the load so index.jsx can thread it into createRacePlan.
    storageGet.mockReturnValue({ gapRerollEnabled: true, gapRerollThresholdLengths: 2.0 });
    const loaded = loadRaceDynamicsConfig();
    expect(loaded.gapRerollEnabled).toBe(true);
    expect(loaded.gapRerollThresholdLengths).toBe(2.0);
    expect(loaded.gapRerollMode).toBe('symmetric'); // unspecified → default
  });

  it('all numeric defaults are positive; PULK-phase bonuses default 0 (off during PULK)', () => {
    // The winning phase-split turns the area/row bonuses OFF during the PULK window (0 is valid).
    // carouselRoleBiasStrength is the role-biased dice OFF switch — 0 is its shipped, valid value.
    const offAtZero = new Set([
      'areaBonusPulk',
      'rowBonusPulk',
      'pulkBoostHeadroom',
      'carouselRoleBiasStrength',
    ]);
    for (const [key, val] of Object.entries(DEFAULT_RACE_DYNAMICS_CONFIG)) {
      if (typeof val !== 'number') continue;
      if (offAtZero.has(key)) expect(val).toBeGreaterThanOrEqual(0);
      else expect(val).toBeGreaterThan(0);
    }
  });
});

describe('loadRaceDynamicsConfig', () => {
  it('returns defaults when storage is empty', () => {
    storageGet.mockReturnValue(null);
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('merges stored values with defaults', () => {
    storageGet.mockReturnValue({ reRollVariationPercent: 50 });
    const cfg = loadRaceDynamicsConfig();
    expect(cfg.reRollVariationPercent).toBe(50);
    expect(cfg.reRollTransitionDuration).toBe(3.0);
  });

  it('returns defaults when stored value is not an object', () => {
    storageGet.mockReturnValue(42);
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when reRollVariationPercent is 0', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, reRollVariationPercent: 0 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when reRollTransitionDuration is negative', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      reRollTransitionDuration: -1,
    });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when trajectoryTransitionDuration is 0', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      trajectoryTransitionDuration: 0,
    });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when reRollLastPositionPercent > 100', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      reRollLastPositionPercent: 101,
    });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when pulkBoostHeadroom is negative', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      pulkBoostHeadroom: -0.05,
    });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('accepts a positive pulkBoostHeadroom', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      pulkBoostHeadroom: 0.05,
    });
    expect(loadRaceDynamicsConfig().pulkBoostHeadroom).toBe(0.05);
  });

  it('returns defaults when choreoIntensity is out of [0,1]', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, choreoIntensity: 1.5 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when choreoPackBandStrictness is out of [0,1]', () => {
    storageGet.mockReturnValue({
      ...DEFAULT_RACE_DYNAMICS_CONFIG,
      choreoPackBandStrictness: -0.2,
    });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when a choreo resolve/release progress is out of (0,1]', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, choreoReleaseProgress: 1.2 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, choreoResolveB3: 0 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('returns defaults when contestWindowStart sits outside the act it measures', () => {
    // Must be after OUTCOME begins and strictly before the release, else the window is empty or
    // spans a phase the carousel cannot act in.
    for (const bad of [0.5, 0.6, 0.97, 0.99]) {
      storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, contestWindowStart: bad });
      expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
    }
  });

  it('accepts a contestWindowStart inside the act', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, contestWindowStart: 0.7 });
    expect(loadRaceDynamicsConfig().contestWindowStart).toBe(0.7);
  });

  it('returns defaults on invalid carousel config', () => {
    const bad = [
      { carouselEnabled: 'yes' },
      { carouselMinParticipants: 2 }, // a 2-racer ping-pong can never pass the classifier
      { carouselAmplitudeRanks: 0 },
      { carouselJitterPct: -0.1 },
      { carouselJitterPct: 1.5 },
      { carouselRoleBiasStrength: -1 },
    ];
    for (const over of bad) {
      storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, ...over });
      expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
    }
  });

  it('returns defaults when choreoOutcomeStart is out of [0.25, 0.60]', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, choreoOutcomeStart: 0.2 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, choreoOutcomeStart: 0.7 });
    expect(loadRaceDynamicsConfig()).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG);
  });

  it('accepts a valid choreoOutcomeStart', () => {
    storageGet.mockReturnValue({ ...DEFAULT_RACE_DYNAMICS_CONFIG, choreoOutcomeStart: 0.35 });
    expect(loadRaceDynamicsConfig().choreoOutcomeStart).toBe(0.35);
  });

  it('does not mutate DEFAULT_RACE_DYNAMICS_CONFIG', () => {
    storageGet.mockReturnValue({ reRollVariationPercent: 100 });
    loadRaceDynamicsConfig();
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.reRollVariationPercent).toBe(75);
  });

  it('accepts valid custom values', () => {
    storageGet.mockReturnValue({
      reRollVariationPercent: 100,
      reRollTransitionDuration: 3.0,
      reRollIntervalDivisor: 10,
      reRollLastPositionPercent: 70,
    });
    const cfg = loadRaceDynamicsConfig();
    expect(cfg.reRollVariationPercent).toBe(100);
    expect(cfg.reRollIntervalDivisor).toBe(10);
    expect(cfg.reRollLastPositionPercent).toBe(70);
  });
});

describe('saveRaceDynamicsConfig', () => {
  it('writes config to storage', () => {
    const cfg = { ...DEFAULT_RACE_DYNAMICS_CONFIG, reRollVariationPercent: 50 };
    saveRaceDynamicsConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:raceDynamicsConfig', cfg);
  });
});

// ── Stored-key carry-over migration RETIRED (single-player, localStorage cleared between runs). The
// directorV4*→choreo* (Stage-5a) and governorDirector*/governor*→pulk* (Stage-5b-i) carry-over tests
// were removed with the RENAMED_KEY_MIGRATION shim. A stale blob with old keys now fails validation
// and falls back to defaults — covered by the general invalid-config → defaults behaviour above. ──
