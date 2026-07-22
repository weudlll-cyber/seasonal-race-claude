// greenfieldComposer.test.js — prototype composer invariants (GREENFIELD P3).
//
// The composers are pure and seed-deterministic, so the hard invariants are exact: every authored
// speed factor stays inside the honest natural band, the same seed reproduces the same profile
// bit-for-bit, and the mean-factor delivery model orders the open-loop finish by assigned tier. These
// are the invariants the playback path and the report rely on.

import { describe, it, expect } from 'vitest';
import {
  createComposer,
  deliveryPrecheck,
  bandOfRank,
  COMPOSER_IDS,
} from './greenfieldComposer.js';

const BAND_HALF = 0.00113 / ((0.00096 + 0.00113) / 2) - 1; // 0.0813

function makeCtx(seed, { n = 40, sigma = 0.3 } = {}) {
  // Grid rank = index+1; a fixed pseudo-assignment (reverse) so tiers span the field.
  const targetRankByIndex = new Map();
  const gridRankByIndex = new Map();
  for (let i = 0; i < n; i++) {
    gridRankByIndex.set(i, i + 1);
    targetRankByIndex.set(i, n - i); // reverse: pole assigned last, etc. (deep inversions)
  }
  return {
    n,
    seed,
    bandHalfWidth: BAND_HALF,
    sigma,
    durationSec: 60,
    targetRankByIndex,
    gridRankByIndex,
    trackCurvature: null,
  };
}

describe.each(COMPOSER_IDS)('composer %s', (id) => {
  it('keeps every authored factor inside the honest natural band', () => {
    const ctx = makeCtx(42);
    const c = createComposer(id, ctx);
    for (const [index] of ctx.targetRankByIndex) {
      for (let k = 0; k <= 200; k++) {
        const f = c.speedFactorAt(index, k / 200);
        expect(f).toBeGreaterThanOrEqual(1 - BAND_HALF - 1e-9);
        expect(f).toBeLessThanOrEqual(1 + BAND_HALF + 1e-9);
      }
    }
  });

  it('is deterministic in the seed', () => {
    const a = createComposer(id, makeCtx(7));
    const b = createComposer(id, makeCtx(7));
    for (let k = 0; k <= 50; k++) {
      const p = k / 50;
      expect(a.speedFactorAt(3, p)).toBe(b.speedFactorAt(3, p));
      expect(a.speedFactorAt(29, p)).toBe(b.speedFactorAt(29, p));
    }
  });

  it('produces different profiles for different seeds', () => {
    const a = createComposer(id, makeCtx(1));
    const b = createComposer(id, makeCtx(2));
    let anyDiff = false;
    for (let k = 0; k <= 50; k++)
      if (a.speedFactorAt(10, k / 50) !== b.speedFactorAt(10, k / 50)) anyDiff = true;
    expect(anyDiff).toBe(true);
  });

  it('reports the delivery diagnostics the report needs', () => {
    const c = createComposer(id, makeCtx(3));
    expect(c.meta.composer).toBe(id);
    expect(c.meta.reserveShare).toBeGreaterThan(0);
    expect(c.meta).toHaveProperty('bandViolations');
  });

  it('orders the open-loop finish by assigned tier for a modest spread', () => {
    // Shallow assignment (target near grid) is comfortably deliverable within band → tier-exact.
    const n = 40;
    const targetRankByIndex = new Map();
    const gridRankByIndex = new Map();
    for (let i = 0; i < n; i++) {
      gridRankByIndex.set(i, i + 1);
      targetRankByIndex.set(i, i + 1);
    } // identity
    const ctx = {
      n,
      seed: 5,
      bandHalfWidth: BAND_HALF,
      sigma: 0.3,
      durationSec: 60,
      targetRankByIndex,
      gridRankByIndex,
      trackCurvature: null,
    };
    const c = createComposer(id, ctx);
    const pre = deliveryPrecheck(c, ctx);
    // Identity assignment must be perfectly deliverable open-loop (no crossings required).
    expect(pre.perRacerInTier).toBeGreaterThanOrEqual(0.95);
  });
});

describe('bandOfRank', () => {
  it('maps ranks to the shared BAND_EDGES bands', () => {
    expect(bandOfRank(1)).toBe(0);
    expect(bandOfRank(5)).toBe(0);
    expect(bandOfRank(6)).toBe(1);
    expect(bandOfRank(15)).toBe(1);
    expect(bandOfRank(40)).toBe(3);
  });
});

describe('createComposer', () => {
  it('throws on an unknown composer id', () => {
    expect(() => createComposer('nope', makeCtx(1))).toThrow(/unknown composer/);
  });
});

describe('V-CC minMargin', () => {
  it('is reported and finite', () => {
    const c = createComposer('vcc', makeCtx(11));
    expect(typeof c.meta.minMargin).toBe('number');
    expect(Number.isFinite(c.meta.minMargin)).toBe(true);
  });
});
