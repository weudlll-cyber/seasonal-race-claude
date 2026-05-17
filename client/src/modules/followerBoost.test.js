// ============================================================
// File:        followerBoost.test.js
// Path:        client/src/modules/followerBoost.test.js
// Project:     RaceArena
// Description: Unit tests for computeFollowerBoostMult (Phase 2C).
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeFollowerBoostMult } from './raceBehaviorConfig.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';

const BASE = {
  followerBoostMult: 1.15,
  followerBoostDurationMs: 3000,
};

// ── Closed-track guard ────────────────────────────────────────────────────────

describe('computeFollowerBoostMult — closed track (isOpen=false)', () => {
  it('returns 1.0 for Row-1 at t=0 on closed track', () => {
    expect(computeFollowerBoostMult(BASE, false, 1, 0)).toBe(1.0);
  });

  it('returns 1.0 for Row-2 mid-boost on closed track', () => {
    expect(computeFollowerBoostMult(BASE, false, 2, 1500)).toBe(1.0);
  });

  it('returns 1.0 regardless of followerBoostMult value on closed track', () => {
    expect(computeFollowerBoostMult({ ...BASE, followerBoostMult: 1.3 }, false, 1, 0)).toBe(1.0);
  });

  it('returns 1.0 for Row-0 on closed track', () => {
    expect(computeFollowerBoostMult(BASE, false, 0, 0)).toBe(1.0);
  });
});

// ── Row-0 guard ───────────────────────────────────────────────────────────────

describe('computeFollowerBoostMult — Row-0 is never boosted', () => {
  it('returns 1.0 for Row-0 at t=0 on open track', () => {
    expect(computeFollowerBoostMult(BASE, true, 0, 0)).toBe(1.0);
  });

  it('returns 1.0 for Row-0 mid-boost window on open track', () => {
    expect(computeFollowerBoostMult(BASE, true, 0, 1500)).toBe(1.0);
  });

  it('returns 1.0 for Row-0 after boost window', () => {
    expect(computeFollowerBoostMult(BASE, true, 0, 5000)).toBe(1.0);
  });
});

// ── followerBoostDurationMs = 0 guard ────────────────────────────────────────

describe('computeFollowerBoostMult — followerBoostDurationMs=0 (disabled)', () => {
  const noBoost = { ...BASE, followerBoostDurationMs: 0 };

  it('returns 1.0 for Row-1 at t=0 when duration=0', () => {
    expect(computeFollowerBoostMult(noBoost, true, 1, 0)).toBe(1.0);
  });

  it('returns 1.0 for Row-2 at any time when duration=0', () => {
    expect(computeFollowerBoostMult(noBoost, true, 2, 1000)).toBe(1.0);
  });
});

// ── followerBoostMult = 1.0 guard ────────────────────────────────────────────

describe('computeFollowerBoostMult — followerBoostMult=1.0 (disabled)', () => {
  const noBoost = { ...BASE, followerBoostMult: 1.0 };

  it('returns 1.0 at t=0 when mult=1.0', () => {
    expect(computeFollowerBoostMult(noBoost, true, 1, 0)).toBe(1.0);
  });

  it('returns 1.0 at any time when mult=1.0', () => {
    expect(computeFollowerBoostMult(noBoost, true, 1, 1500)).toBe(1.0);
  });
});

// ── Active ramp: Row-1+ on open track ────────────────────────────────────────

describe('computeFollowerBoostMult — open track, active ramp (mult=1.15, duration=3000)', () => {
  it('returns followerBoostMult (1.15) at raceElapsedMs=0', () => {
    expect(computeFollowerBoostMult(BASE, true, 1, 0)).toBeCloseTo(1.15, 10);
  });

  it('returns 1.0 at raceElapsedMs=followerBoostDurationMs', () => {
    expect(computeFollowerBoostMult(BASE, true, 1, 3000)).toBeCloseTo(1.0, 10);
  });

  it('returns 1.0 after the boost window has passed', () => {
    expect(computeFollowerBoostMult(BASE, true, 1, 9999)).toBe(1.0);
  });

  it('returns a value strictly between 1.0 and 1.15 during ramp', () => {
    const v = computeFollowerBoostMult(BASE, true, 1, 1500);
    expect(v).toBeGreaterThan(1.0);
    expect(v).toBeLessThan(1.15);
  });

  it('is monotonically non-increasing over the boost window (boost decays)', () => {
    const times = [0, 300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000];
    const values = times.map((t) => computeFollowerBoostMult(BASE, true, 1, t));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
  });

  it('easeInOutCubic shape: value at midpoint ≈ 1.15 + 0.5*(1-1.15) = 1.075', () => {
    // easeInOutCubic(0.5) = 0.5, so mult + 0.5*(1-mult) = 1.15 - 0.5*0.15 = 1.075
    expect(computeFollowerBoostMult(BASE, true, 1, 1500)).toBeCloseTo(1.075, 5);
  });

  it('applies equally to Row-1, Row-2, Row-5 (uniform across all follower rows)', () => {
    const v1 = computeFollowerBoostMult(BASE, true, 1, 500);
    const v2 = computeFollowerBoostMult(BASE, true, 2, 500);
    const v5 = computeFollowerBoostMult(BASE, true, 5, 500);
    expect(v1).toBe(v2);
    expect(v2).toBe(v5);
  });
});

// ── Varying followerBoostMult ─────────────────────────────────────────────────

describe('computeFollowerBoostMult — varying followerBoostMult values', () => {
  it('aggressive boost (1.30): t=0 → 1.30, t=duration → 1.0', () => {
    const cfg = { ...BASE, followerBoostMult: 1.3 };
    expect(computeFollowerBoostMult(cfg, true, 1, 0)).toBeCloseTo(1.3, 10);
    expect(computeFollowerBoostMult(cfg, true, 1, 3000)).toBeCloseTo(1.0, 10);
  });

  it('minimal boost (1.01): t=0 → 1.01, t=duration → 1.0', () => {
    const cfg = { ...BASE, followerBoostMult: 1.01 };
    expect(computeFollowerBoostMult(cfg, true, 1, 0)).toBeCloseTo(1.01, 10);
    expect(computeFollowerBoostMult(cfg, true, 1, 3000)).toBeCloseTo(1.0, 10);
  });
});

// ── Schema validation ─────────────────────────────────────────────────────────

describe('loadRaceBehaviorConfig — followerBoostMult/followerBoostDurationMs validation', () => {
  it('DEFAULT_RACE_BEHAVIOR_CONFIG contains followerBoostMult', () => {
    expect(typeof DEFAULT_RACE_BEHAVIOR_CONFIG.followerBoostMult).toBe('number');
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.followerBoostMult).toBeGreaterThanOrEqual(1.0);
  });

  it('DEFAULT_RACE_BEHAVIOR_CONFIG contains followerBoostDurationMs', () => {
    expect(typeof DEFAULT_RACE_BEHAVIOR_CONFIG.followerBoostDurationMs).toBe('number');
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.followerBoostDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('DEFAULT_RACE_BEHAVIOR_CONFIG.followerBoostMult is 1.15', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.followerBoostMult).toBe(1.15);
  });
});
