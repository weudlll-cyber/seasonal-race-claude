// ============================================================
// File:        headlessRaceSimulator.test.js
// Path:        client/src/modules/headlessRaceSimulator.test.js
// Project:     RaceArena
// Created:     2026-06-10
// Description: Contract tests for headlessRaceSimulator.js.
//              TC-06/K1 — spriteLengthInT geometry guards. Protects the G1-a parity
//              work (computeBodyNarrowRef path, bypass conditions, spriteSize fallback)
//              against accidental reversion. spriteLengthInT is seed-independent:
//              the geometry is computed before the first rng() call.
//              TC-06/K2 — countNeighbors unit tests. Pure-fixture tests on threshold
//              boundary (strict <), wrap-around correction, and self-exclusion.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  simulateRace,
  countNeighbors,
  secondsToFrames,
  DIRT_OVAL_PATH_LENGTH_PX,
} from './headlessRaceSimulator.js';
import { deriveRaceDuration, normalSpeedFrom } from './durationModel.js';
import {
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
  DEFAULT_RACE_DYNAMICS_CONFIG,
} from './storage/defaults.js';

// Minimal race config — only the fields simulateRace needs.
// seed=42 avoids the seed===1 [SimGeom] checkpoint log.
const BASE_CONFIG = {
  nRacers: 40,
  seed: 42,
  baseSpeedConfig: DEFAULT_BASE_SPEED_CONFIG,
  behaviorConfig: DEFAULT_RACE_BEHAVIOR_CONFIG,
  rowConfig: DEFAULT_ROW_LAYOUT_CONFIG,
  dynamicsConfig: DEFAULT_RACE_DYNAMICS_CONFIG,
};

const AUTO_SCALE_ON = { enabled: true, minScale: 0.65, maxScale: 2.5 };
const AUTO_SCALE_OFF = { enabled: false, minScale: 0.65, maxScale: 2.5 };

// Horse body-fill values (from HorseRacerType.config, verified in G1-a).
const HORSE_TYPE = {
  displaySize: 47,
  bodyFillX: 0.353,
  bodyFillY: 0.8,
  hasDisplaySizeOverride: false,
};

// ── TC-06/K1: spriteLengthInT geometry guards ─────────────────────────────────
//
// spriteLengthInT = (drawnBodyLengthPx ?? SPRITE_SIZE) / DIRT_OVAL_PATH_LENGTH_PX
//
// It is the neighbor-counting window: a racer at |Δt| < spriteLengthInT is
// counted as a neighbor. An incorrect threshold (e.g. the pre-G1-a 40px fallback
// instead of the real 28.6px body length) inflates neighbor counts by 3×–4×,
// making the distribution tool's output misleading.
//
// Expected values are derived from the geometry formula, not read from actual
// output (no frozen-is-state pattern). Derivation in TC-06 discovery report:
//
//   effectiveWidth = 93 × 0.95 = 88.35 px
//   W_REF = min(285, 88.35) = 88.35 px
//
//   Horse auto-scale path (computeBodyNarrowRef at N=40):
//     narrowDS = 47 × 0.353 = 16.591  →  minBodyNarrow = 10.784
//     maxRPRatMin = floor(176.7 / 10.784) = 16  →  rowCount = ceil(40/16) = 3
//     racersPerRow = ceil(40/3) = 14
//     bodyNarrow = 176.7 / 14 = 12.621
//     drawnBodyLengthPx = 12.621 × (0.8/0.353) = 28.60
//     spriteLengthInT = 28.60 / 3245 ≈ 0.00881
//
//   Bypass path (override=true OR enabled=false):
//     effectiveBodyNarrow = displaySize = 47
//     drawnBodyLengthPx = 47 × (0.8/0.353) = 106.52
//     spriteLengthInT = 106.52 / 3245 ≈ 0.03282
//
//   No racerTypeConfig (spriteSize fallback):
//     spriteLengthInT = 40 / 3245 ≈ 0.01233
//
//   Rocket auto-scale path (N=40):
//     narrowDS = 47 × 0.278 = 13.066  →  minBodyNarrow = 8.493
//     maxRPRatMin = floor(176.7 / 8.493) = 20  →  rowCount = ceil(40/20) = 2
//     racersPerRow = ceil(40/2) = 20
//     bodyNarrow = 176.7 / 20 = 8.835
//     drawnBodyLengthPx = 8.835 × (0.801/0.278) = 25.46
//     spriteLengthInT = 25.46 / 3245 ≈ 0.00784

describe('simulateRace — spriteLengthInT geometry guards (TC-06/K1)', () => {
  // ── K1-1: Auto-scale path (horse, no override) ──────────────────────────────

  it('auto-scale active, no override (horse): spriteLengthInT uses real body length ≈ 0.00881', () => {
    // Guard: if computeBodyNarrowRef is bypassed or G1-a geometry reverts, the
    // threshold falls back to the 40px spriteSize fallback (≈ 0.01233), inflating
    // neighbor counts by ~1.4×. Reversion to pre-G1-a bypass gives ≈ 0.03282 (3.7×).
    const { spriteLengthInT } = simulateRace({
      ...BASE_CONFIG,
      racerTypeConfig: HORSE_TYPE,
      autoScaleConfig: AUTO_SCALE_ON,
    });
    expect(spriteLengthInT).toBeCloseTo(0.00881, 3);
  });

  // ── K1-2: Override-bypass path ───────────────────────────────────────────────

  it('hasDisplaySizeOverride=true: spriteLengthInT uses displaySize directly ≈ 0.03282', () => {
    // Guard: when a user has set a displaySize override, the bypass must fire.
    // If the bypass is skipped, auto-scale would shrink the threshold to ≈ 0.00881,
    // under-counting neighbors for that user's configuration.
    const { spriteLengthInT } = simulateRace({
      ...BASE_CONFIG,
      racerTypeConfig: { ...HORSE_TYPE, hasDisplaySizeOverride: true },
      autoScaleConfig: AUTO_SCALE_ON,
    });
    expect(spriteLengthInT).toBeCloseTo(0.03282, 3);
  });

  // ── K1-3: Auto-scale disabled ────────────────────────────────────────────────

  it('autoScaleConfig.enabled=false: bypass fires, spriteLengthInT uses displaySize ≈ 0.03282', () => {
    // Guard: same bypass value as the override case — different trigger condition.
    // If the enabled=false branch is ignored, the result falls to ≈ 0.00881.
    const { spriteLengthInT } = simulateRace({
      ...BASE_CONFIG,
      racerTypeConfig: HORSE_TYPE,
      autoScaleConfig: AUTO_SCALE_OFF,
    });
    expect(spriteLengthInT).toBeCloseTo(0.03282, 3);
  });

  // ── K1-4: No racerTypeConfig (spriteSize fallback) ───────────────────────────

  it('no racerTypeConfig: spriteLengthInT falls back to SPRITE_SIZE/pathLength ≈ 0.01233', () => {
    // Guard: the fallback path (legacy callers without a racer type) must survive.
    // If drawnBodyLengthPx is incorrectly set to a defined value here,
    // the fallback threshold changes and the tool breaks for callers without a type.
    const { spriteLengthInT } = simulateRace({
      ...BASE_CONFIG,
      racerTypeConfig: undefined,
      autoScaleConfig: AUTO_SCALE_ON,
    });
    expect(spriteLengthInT).toBeCloseTo(0.01233, 3);
  });

  // ── K1-5: Different type (Rocket) — type selector has real effect ────────────

  it('rocket type (bodyFillX=0.278, bodyFillY=0.801): spriteLengthInT differs from horse ≈ 0.00784', () => {
    // Guard: the type selector in DiagnoseVerteilung must produce different thresholds
    // per type, not a fixed horse value. Rocket's narrow bodyFill packs more racers per
    // row (20 vs 14 for horse), yielding a smaller bodyNarrow and thus a smaller threshold.
    // If type-specific bodyFill is ignored, the result collapses to the horse value ≈ 0.00881.
    const { spriteLengthInT } = simulateRace({
      ...BASE_CONFIG,
      racerTypeConfig: {
        displaySize: 47,
        bodyFillX: 0.278,
        bodyFillY: 0.801,
        hasDisplaySizeOverride: false,
      },
      autoScaleConfig: AUTO_SCALE_ON,
    });
    expect(spriteLengthInT).toBeCloseTo(0.00784, 3);
  });
});

// ── TC-06/K2: countNeighbors — counting contract ──────────────────────────────
//
// Pure-fixture tests: no simulation, no seed dependency. Each test provides
// a known racerTs array and threshold, and asserts the exact neighbor counts.
//
// Invariants under test:
//   a) Strict-<: a racer at exactly |Δt| = threshold is NOT counted (< not <=)
//   b) Wrap-around: |Δt| = 0.6 on a closed track uses the shorter arc (1-0.6=0.4)
//   c) Self-exclusion: a racer never counts itself

describe('countNeighbors — counting contract (TC-06/K2)', () => {
  // ── K2-a: Strict less-than at the boundary ───────────────────────────────────

  it('racer exactly at threshold distance is NOT counted (strict <, not <=)', () => {
    // |0.0 - 0.01| = 0.01; 0.01 < 0.01 is false → neither racer counts the other.
    // If the check were <= instead of <, both would return count=1.
    const counts = countNeighbors([0.0, 0.01], 0.01);
    expect(counts).toEqual([0, 0]);
  });

  it('racer just inside threshold IS counted', () => {
    // |0.0 - 0.009| = 0.009; 0.009 < 0.01 is true → both see each other.
    const counts = countNeighbors([0.0, 0.009], 0.01);
    expect(counts).toEqual([1, 1]);
  });

  // ── K2-b: Wrap-around (shortest-arc) correction ──────────────────────────────

  it('wrap-around: |Δt|=0.6 uses shortest arc 0.4, counted when threshold=0.45', () => {
    // Without wrap: dT=0.6, 0.6 < 0.45 is false → would not count.
    // With wrap: dT > 0.5 → dT = 1-0.6 = 0.4; 0.4 < 0.45 is true → both count.
    // This verifies that lead/last-place racers are correctly recognised as neighbors.
    const counts = countNeighbors([0.0, 0.6], 0.45);
    expect(counts).toEqual([1, 1]);
  });

  it('wrap-around: |Δt|=0.6 is NOT counted when threshold=0.35 (even shortest arc too large)', () => {
    // Shortest arc = 0.4, threshold = 0.35 → 0.4 < 0.35 is false → not counted.
    const counts = countNeighbors([0.0, 0.6], 0.35);
    expect(counts).toEqual([0, 0]);
  });

  // ── K2-c: Self-exclusion ─────────────────────────────────────────────────────

  it('single racer returns count 0 — never counts itself', () => {
    // With a threshold wider than any possible distance, a lone racer must still
    // return 0 (self-exclusion).
    const counts = countNeighbors([0.5], 1.0);
    expect(counts).toEqual([0]);
  });

  it('multi-racer array: each racer is excluded from its own count', () => {
    // Three racers all at the same t-value. |Δt|=0 < any positive threshold → each
    // sees the other two, but NOT itself. Without self-exclusion, count would be 3.
    const counts = countNeighbors([0.5, 0.5, 0.5], 0.01);
    expect(counts).toEqual([2, 2, 2]);
  });
});

// ── TC-06/K3: secondsToFrames + framesPerRace propagation ────────────────────
//
// Verifies the seconds→frames conversion helper and that simulateRace honours
// the framesPerRace parameter (more frames → racers advance further).
//
// secondsToFrames formula: Math.round(seconds * 1000 / DT), DT=16ms.
//   4s  → 4000/16 = 250
//   60s → 60000/16 = 3750

describe('secondsToFrames + framesPerRace propagation (TC-06/K3)', () => {
  // ── K3-a: Conversion formula ─────────────────────────────────────────────────

  it('secondsToFrames(4) === 250 (default slider value)', () => {
    expect(secondsToFrames(4)).toBe(250);
  });

  it('secondsToFrames(60) === 3750 (slider maximum)', () => {
    expect(secondsToFrames(60)).toBe(3750);
  });

  // ── K3-b: framesPerRace propagates to sim run length ─────────────────────────

  it('framesPerRace=secondsToFrames(4) vs framesPerRace=secondsToFrames(8): racers advance further with more frames', () => {
    // Same seed, same config — only framesPerRace differs.
    // If framesPerRace is ignored and the constant FRAMES_PER_RACE is used instead,
    // both runs would return identical racerTs (both equal to the 250-frame result).
    const cfg = {
      ...BASE_CONFIG,
      racerTypeConfig: HORSE_TYPE,
      autoScaleConfig: AUTO_SCALE_ON,
    };
    const short = simulateRace({ ...cfg, framesPerRace: secondsToFrames(4) });
    const longer = simulateRace({ ...cfg, framesPerRace: secondsToFrames(8) });
    const meanT = (ts) => ts.reduce((s, t) => s + t, 0) / ts.length;
    expect(meanT(longer.racerTs)).toBeGreaterThan(meanT(short.racerTs));
  });

  it('framesPerRace=secondsToFrames(4) produces same racerTs as default (behaviour-neutral at 4s)', () => {
    // With the slider at 4s, output must be IDENTICAL to omitting framesPerRace.
    const cfg = {
      ...BASE_CONFIG,
      racerTypeConfig: HORSE_TYPE,
      autoScaleConfig: AUTO_SCALE_ON,
    };
    const withDefault = simulateRace({ ...cfg });
    const withExplicit = simulateRace({ ...cfg, framesPerRace: secondsToFrames(4) });
    expect(withExplicit.racerTs).toEqual(withDefault.racerTs);
    expect(withExplicit.neighborCounts).toEqual(withDefault.neighborCounts);
  });
});

// ── TC-07/K1: game-speed calibration ─────────────────────────────────────────
//
// race_baseSpeed must equal the canonical model's raceBaseSpeed for 2 laps on dirt-oval:
// a mean racer travels exactly the one normal track speed. (Before the speed/duration ship
// this pinned the ems × closedSsf calibration; that derivation no longer exists.)
//
// Proof: single racer at row 0 (tStart=0, speedBonusMult=1, no neighbours → no avoidance).
// After 1 frame: t = race_baseSpeed × spreadFactor.
// Dividing by the expected game speed yields the implied spreadFactor:
//   Game speed → impliedSF ∈ [0.9187, 1.0813]  (valid spreadFactor range)
//   Old speed  → impliedSF ≈ 0.001133/0.000570 ≈ 1.99  (clearly outside)

describe('simulateRace — game-speed calibration (TC-07/K1)', () => {
  it('race_baseSpeed matches the canonical model for 2 laps on dirt-oval', () => {
    // The canonical model IS the calibration now: a mean racer travels the one normal
    // track speed, so race_baseSpeed = deriveRaceDuration(...).raceBaseSpeed exactly.
    const expectedSpeed = deriveRaceDuration({
      isOpen: false,
      pathLengthPx: DIRT_OVAL_PATH_LENGTH_PX,
      laps: 2,
      normalSpeedPxPerSec: normalSpeedFrom(DEFAULT_BASE_SPEED_CONFIG),
      speedMultiplier: 1.0,
      runoutZone: DEFAULT_RACE_BEHAVIOR_CONFIG.runoutZone,
    }).raceBaseSpeed;

    const { racerTs } = simulateRace({
      nRacers: 1,
      seed: 42,
      baseSpeedConfig: DEFAULT_BASE_SPEED_CONFIG,
      behaviorConfig: DEFAULT_RACE_BEHAVIOR_CONFIG,
      rowConfig: DEFAULT_ROW_LAYOUT_CONFIG,
      dynamicsConfig: DEFAULT_RACE_DYNAMICS_CONFIG,
      framesPerRace: 1,
    });
    // t = race_baseSpeed × spreadFactor; impliedSF = t / expectedSpeed
    const impliedSF = racerTs[0] / expectedSpeed;
    // Game speed: impliedSF ∈ [0.9187, 1.0813] — valid spreadFactor range
    expect(impliedSF).toBeGreaterThan(0.85);
    expect(impliedSF).toBeLessThan(1.15);
  });
});
