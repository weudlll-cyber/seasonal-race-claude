import { describe, it, expect } from 'vitest';
import {
  lerp,
  lerpAngle,
  easeInOutCubic,
  shortestArcDeltaT,
  signedArcDeltaT,
} from './mathUtils.js';

describe('lerp', () => {
  it('returns start value at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns end value at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('works with negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
});

describe('lerpAngle', () => {
  it('interpolates normally when angles are close', () => {
    expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4);
  });

  it('returns start at t=0', () => {
    expect(lerpAngle(1, 2, 0)).toBeCloseTo(1);
  });

  it('returns end at t=1', () => {
    expect(lerpAngle(1, 2, 1)).toBeCloseTo(2);
  });

  it('wraps correctly at track seam: lerpAngle(-π, π, 0.5) returns ±π, not 0', () => {
    const result = lerpAngle(-Math.PI, Math.PI, 0.5);
    expect(Math.abs(result)).toBeCloseTo(Math.PI);
  });
});

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

describe('shortestArcDeltaT (lap-normalized)', () => {
  it('same-lap close: |0.10 − 0.12| = 0.02', () => {
    expect(shortestArcDeltaT(0.1, 0.12)).toBeCloseTo(0.02, 10);
  });

  it('seam wrap: 0.95 vs 0.05 → 0.10 (shorter arc, not 0.90)', () => {
    expect(shortestArcDeltaT(0.95, 0.05)).toBeCloseTo(0.1, 10);
  });

  it('negative start-t (closed back row): −0.05 → 0.95, so −0.05 vs 0.95 = 0', () => {
    expect(shortestArcDeltaT(-0.05, 0.95)).toBeCloseTo(0, 10);
  });

  it('t > 1 (lap 2): 1.3 normalizes to 0.3, so 1.3 vs 0.3 = 0', () => {
    expect(shortestArcDeltaT(1.3, 0.3)).toBeCloseTo(0, 10);
  });

  it('THE BUG: leader >1 lap ahead (t=1.8) vs backmarker (t=0.5) is 0.3 apart, NOT ~0', () => {
    // Raw wrap would give |1.8−0.5|=1.3 → 1−1.3 = −0.3 (negative → false "adjacent").
    expect(shortestArcDeltaT(1.8, 0.5)).toBeCloseTo(0.3, 10);
  });

  it('t=0 vs t=1.0: both map to 0 → dT 0 (co-located at start/finish line)', () => {
    expect(shortestArcDeltaT(0, 1.0)).toBeCloseTo(0, 10);
  });

  it('result is always in [0, 0.5]', () => {
    for (let i = 0; i < 50; i++) {
      const d = shortestArcDeltaT(i * 0.137, -i * 0.091 + 1.7);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(0.5 + 1e-9);
    }
  });
});

describe('signedArcDeltaT (lap-normalized, positive = b ahead of a)', () => {
  it('b just ahead of a same lap: a=0.10 b=0.13 → +0.03', () => {
    expect(signedArcDeltaT(0.1, 0.13)).toBeCloseTo(0.03, 10);
  });

  it('b just behind a: a=0.13 b=0.10 → −0.03', () => {
    expect(signedArcDeltaT(0.13, 0.1)).toBeCloseTo(-0.03, 10);
  });

  it('seam: a=0.95 b=0.05 → +0.10 (b ahead across the seam)', () => {
    expect(signedArcDeltaT(0.95, 0.05)).toBeCloseTo(0.1, 10);
  });

  it('lap-normalized: a=1.8 (→0.8) vs b=0.5 → b is 0.3 behind a → −0.3', () => {
    expect(signedArcDeltaT(1.8, 0.5)).toBeCloseTo(-0.3, 10);
  });

  it('>1.5 raw apart needs normalization: a=2.8 (→0.8) vs b=0.5 → −0.3 (raw wrap gives −1.3)', () => {
    expect(signedArcDeltaT(2.8, 0.5)).toBeCloseTo(-0.3, 10);
  });
});
