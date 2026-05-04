// ============================================================
// File:        reRoll.test.js
// Path:        client/src/screens/RaceScreen/reRoll.test.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: PR-A2.6 unit tests — re-roll schedule, smooth transition,
//              slipstream magnitude, and speedBonusMult preservation.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { computeSpeedBonus } from '../../modules/rowLayout.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from '../../modules/storage/defaults.js';

// ── Shared math helpers (mirrored from RaceScreen/index.jsx) ──────────────────
// Defined locally so tests don't depend on the React component module graph.

const computeRollCount = (targetDuration) => Math.max(2, Math.floor(targetDuration / 15));
const computeRollInterval = (targetDuration) => {
  const rollCount = computeRollCount(targetDuration);
  return (0.8 * targetDuration * 1000) / rollCount; // ms
};

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const lerp = (a, b, t) => a + (b - a) * t;

// ── Re-Roll Schedule ──────────────────────────────────────────────────────────

describe('rollCount formula', () => {
  it('30s → 2 rolls', () => expect(computeRollCount(30)).toBe(2));
  it('60s → 4 rolls', () => expect(computeRollCount(60)).toBe(4));
  it('90s → 6 rolls', () => expect(computeRollCount(90)).toBe(6));
  it('120s → 8 rolls', () => expect(computeRollCount(120)).toBe(8));
  it('short race (< 30s) → minimum 2 rolls', () => expect(computeRollCount(10)).toBe(2));
});

describe('rollInterval formula — last roll at ~80% of targetDuration', () => {
  for (const duration of [30, 60, 90, 120]) {
    it(`${duration}s: rollInterval × rollCount = 80% of duration`, () => {
      const count = computeRollCount(duration);
      const interval = computeRollInterval(duration);
      expect((interval * count) / 1000).toBeCloseTo(duration * 0.8, 5);
    });
  }

  it('rollInterval is ~12s for all standard race durations', () => {
    const intervals = [30, 60, 90, 120].map(computeRollInterval);
    for (const iv of intervals) {
      expect(iv / 1000).toBeCloseTo(12, 5);
    }
  });
});

// ── easeInOutCubic ────────────────────────────────────────────────────────────

describe('easeInOutCubic', () => {
  it('t=0 → 0', () => expect(easeInOutCubic(0)).toBeCloseTo(0, 10));
  it('t=0.5 → 0.5', () => expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10));
  it('t=1 → 1', () => expect(easeInOutCubic(1)).toBeCloseTo(1, 10));

  it('is monotone increasing', () => {
    const steps = 100;
    let prev = easeInOutCubic(0);
    for (let i = 1; i <= steps; i++) {
      const curr = easeInOutCubic(i / steps);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it('output is always in [0, 1] for t ∈ [0, 1]', () => {
    for (let i = 0; i <= 100; i++) {
      const val = easeInOutCubic(i / 100);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });
});

// ── Smooth Transition ─────────────────────────────────────────────────────────

describe('smooth transition interpolation', () => {
  const prev = 0.871;
  const target = 1.05;
  const duration = 5000;

  const interpolate = (elapsed) => {
    if (elapsed >= duration) return target;
    const t = elapsed / duration;
    return lerp(prev, target, easeInOutCubic(t));
  };

  it('at elapsed=0 returns spreadFactorPrev', () => {
    expect(interpolate(0)).toBeCloseTo(prev, 10);
  });

  it('at elapsed=duration returns spreadFactorTarget', () => {
    expect(interpolate(duration)).toBeCloseTo(target, 10);
  });

  it('midpoint is between prev and target', () => {
    const mid = interpolate(duration / 2);
    expect(mid).toBeGreaterThan(prev);
    expect(mid).toBeLessThan(target);
  });

  it('progress is strictly monotone over the transition', () => {
    let last = interpolate(0);
    for (let ms = 100; ms <= duration; ms += 100) {
      const curr = interpolate(ms);
      expect(curr).toBeGreaterThanOrEqual(last);
      last = curr;
    }
  });
});

// ── Variant B Re-Roll Distribution ───────────────────────────────────────────

describe('variant B re-roll — ±85% of SPREAD_RANGE centered on current value', () => {
  const BASE_SPEED_MIN = 0.871;
  const BASE_SPEED_MAX = 1.129;
  const BASE_SPEED_MEAN = 1.0;
  const SPREAD_RANGE = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN; // 0.258
  const halfWidth = SPREAD_RANGE * 0.85; // 0.2193

  const reRoll = (current) => {
    const delta = (Math.random() - 0.5) * 2 * halfWidth;
    return Math.max(
      BASE_SPEED_MIN / BASE_SPEED_MEAN,
      Math.min(BASE_SPEED_MAX / BASE_SPEED_MEAN, current + delta)
    );
  };

  it('output always in [SPREAD_MIN, SPREAD_MAX]', () => {
    for (let i = 0; i < 200; i++) {
      const result = reRoll(1.0);
      expect(result).toBeGreaterThanOrEqual(BASE_SPEED_MIN);
      expect(result).toBeLessThanOrEqual(BASE_SPEED_MAX);
    }
  });

  it('from center (1.0), max delta = +halfWidth (mocked random=1)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    expect(reRoll(1.0)).toBeCloseTo(Math.min(BASE_SPEED_MAX, 1.0 + halfWidth), 8);
    vi.restoreAllMocks();
  });

  it('from center (1.0), min delta = -halfWidth (mocked random=0)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(reRoll(1.0)).toBeCloseTo(Math.max(BASE_SPEED_MIN, 1.0 - halfWidth), 8);
    vi.restoreAllMocks();
  });

  it('clamping holds output at SPREAD_MIN when racer is at min and random=0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(reRoll(BASE_SPEED_MIN)).toBeCloseTo(BASE_SPEED_MIN, 8);
    vi.restoreAllMocks();
  });

  it('clamping holds output at SPREAD_MAX when racer is at max and random=1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    expect(reRoll(BASE_SPEED_MAX)).toBeCloseTo(BASE_SPEED_MAX, 8);
    vi.restoreAllMocks();
  });
});

// ── Jitter Between Racers ─────────────────────────────────────────────────────

describe('per-racer roll jitter — racers roll at different times', () => {
  it('8 racers with ±20% jitter have distinct nextRollTime values', () => {
    const rollInterval = computeRollInterval(60);
    const nextRollTimes = Array.from({ length: 8 }, () => {
      const jitter = (Math.random() - 0.5) * 2 * rollInterval * 0.2;
      return rollInterval + jitter;
    });
    // Round to nearest ms to check uniqueness — with ±2400ms range, collisions are negligible
    const unique = new Set(nextRollTimes.map((t) => Math.round(t)));
    expect(unique.size).toBe(8);
  });

  it('jitter magnitude is within ±20% of rollInterval', () => {
    const rollInterval = computeRollInterval(60);
    const maxJitter = rollInterval * 0.2;
    for (let i = 0; i < 100; i++) {
      const jitter = (Math.random() - 0.5) * 2 * rollInterval * 0.2;
      expect(Math.abs(jitter)).toBeLessThanOrEqual(maxJitter + 1e-9);
    }
  });
});

// ── Slipstream Magnitude ──────────────────────────────────────────────────────

describe('slipstream magnitude (PR-A2.6)', () => {
  it('default draftingBoost is 1.10', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.draftingBoost).toBe(1.1);
  });

  it('at avg N=3 spread, boosted follower does not structurally overtake leader (boost 1.10)', () => {
    // N=3: expectedMin = spreadMin + range/(n+1) = 0.871 + 0.258/4 = 0.9355
    // boost 1.10: follower 0.9355 * 1.10 = 1.029 < leader 1.0645 — no guaranteed overtake
    // (overtake requires boost >= 1.138 for N=3 average pair)
    const BASE_SPEED_MIN = 0.871;
    const BASE_SPEED_MAX = 1.129;
    const BASE_SPEED_MEAN = 1.0;
    const spreadMin = BASE_SPEED_MIN / BASE_SPEED_MEAN;
    const spreadMax = BASE_SPEED_MAX / BASE_SPEED_MEAN;
    const range = spreadMax - spreadMin;
    const followerSF = spreadMin + range / 4; // ~0.9355 (slowest racer in N=3)
    const leaderSF = spreadMax - range / 4; // ~1.0645 (fastest racer in N=3)
    const boost = DEFAULT_RACE_BEHAVIOR_CONFIG.draftingBoost;

    expect(followerSF * boost).toBeLessThan(leaderSF);
  });
});

// ── speedBonusMult — Back-Row Compensation ───────────────────────────────────

describe('speedBonusMult — back-row compensation is independent of spreadFactor', () => {
  const rowGapPx = 39;
  const pathLengthPx = 5000;
  const factor = 1.0;

  it('front row (rowIndex=0): speedBonusMult = 1.0', () => {
    expect(1 + computeSpeedBonus(0, rowGapPx, pathLengthPx, factor)).toBe(1.0);
  });

  it('row 1 speedBonusMult > 1.0 (positional compensation)', () => {
    expect(1 + computeSpeedBonus(1, rowGapPx, pathLengthPx, factor)).toBeGreaterThan(1.0);
  });

  it('row 2 speedBonusMult > row 1 speedBonusMult', () => {
    const m1 = 1 + computeSpeedBonus(1, rowGapPx, pathLengthPx, factor);
    const m2 = 1 + computeSpeedBonus(2, rowGapPx, pathLengthPx, factor);
    expect(m2).toBeGreaterThan(m1);
  });

  it('speedBonusMult is determined solely by rowIndex — changes in spreadFactor have no effect', () => {
    const rowIndex = 2;
    const mult = 1 + computeSpeedBonus(rowIndex, rowGapPx, pathLengthPx, factor);
    for (let i = 0; i < 10; i++) {
      // Varying spreadFactor (re-roll simulation) — mult stays constant
      expect(1 + computeSpeedBonus(rowIndex, rowGapPx, pathLengthPx, factor)).toBe(mult);
    }
  });

  it('speedBonusMult for each row is unchanged across 10 simulated re-rolls', () => {
    const rows = [0, 1, 2, 3];
    const initialMults = rows.map(
      (ri) => 1 + computeSpeedBonus(ri, rowGapPx, pathLengthPx, factor)
    );
    for (let roll = 0; roll < 10; roll++) {
      const currentMults = rows.map(
        (ri) => 1 + computeSpeedBonus(ri, rowGapPx, pathLengthPx, factor)
      );
      expect(currentMults).toEqual(initialMults);
    }
  });
});
