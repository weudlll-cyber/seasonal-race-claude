// ============================================================
// File:        heroChoreography.test.js
// Path:        client/src/modules/heroChoreography.test.js
// Project:     RaceArena
// Description: Unit tests for the pure v4 hero position-curve helper — quintic-Hermite min-jerk
//              segment, Catmull-Rom tangents, waypoint validation, the jerk-matched handoff anchor
//              (value + first-derivative continuity), and sampling (passes through control points,
//              holds outside the range).
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  quinticHermite,
  computeTangents,
  validateWaypoints,
  makeHeroCurve,
  anchorHeroCurve,
  sampleHeroCurve,
} from './heroChoreography.js';

// numeric derivative helpers. One-sided variants stay strictly inside [0,1] so they are not
// corrupted by quinticHermite's endpoint clamp when probing t=0 / t=1.
const deriv = (f, x, h = 1e-4) => (f(x + h) - f(x - h)) / (2 * h);
const fwdDeriv = (f, x, h = 1e-5) => (f(x + h) - f(x)) / h;
const bwdDeriv = (f, x, h = 1e-5) => (f(x) - f(x - h)) / h;
const fwd2 = (f, x, h = 1e-3) => (f(x + 2 * h) - 2 * f(x + h) + f(x)) / (h * h);
const bwd2 = (f, x, h = 1e-3) => (f(x) - 2 * f(x - h) + f(x - 2 * h)) / (h * h);

describe('quinticHermite — min-jerk segment', () => {
  it('matches value at both endpoints', () => {
    expect(quinticHermite(3, 2, 9, -1, 0)).toBeCloseTo(3, 9);
    expect(quinticHermite(3, 2, 9, -1, 1)).toBeCloseTo(9, 9);
  });
  it('matches first derivative at both endpoints', () => {
    const f = (t) => quinticHermite(3, 2, 9, -1, t);
    expect(fwdDeriv(f, 0)).toBeCloseTo(2, 3);
    expect(bwdDeriv(f, 1)).toBeCloseTo(-1, 3);
  });
  it('has ZERO acceleration at both endpoints (the min-jerk boundary)', () => {
    const f = (t) => quinticHermite(3, 2, 9, -1, t);
    // A nonzero endpoint accel would make the 2nd-difference estimate plateau at that value; a0=0
    // makes it decay toward 0 with h. Verify decay (≥5× smaller when h shrinks 10×) → 0.
    for (const [est2, est3] of [
      [fwd2(f, 0, 1e-2), fwd2(f, 0, 1e-3)],
      [bwd2(f, 1, 1e-2), bwd2(f, 1, 1e-3)],
    ]) {
      expect(Math.abs(est3)).toBeLessThan(Math.abs(est2) * 0.2);
      expect(Math.abs(est3)).toBeLessThan(0.5);
    }
  });
  it('clamps tau outside [0,1] to the endpoints', () => {
    expect(quinticHermite(3, 2, 9, -1, -0.5)).toBeCloseTo(3, 9);
    expect(quinticHermite(3, 2, 9, -1, 1.5)).toBeCloseTo(9, 9);
  });
});

describe('validateWaypoints', () => {
  it('accepts a well-formed ordered list', () => {
    expect(() =>
      validateWaypoints([
        { progress: 0.25, rank: 8 },
        { progress: 1, rank: 1 },
      ])
    ).not.toThrow();
  });
  it('rejects <2 points, out-of-range progress, rank<1, non-increasing progress', () => {
    expect(() => validateWaypoints([{ progress: 0.5, rank: 3 }])).toThrow();
    expect(() =>
      validateWaypoints([
        { progress: -0.1, rank: 3 },
        { progress: 1, rank: 1 },
      ])
    ).toThrow();
    expect(() =>
      validateWaypoints([
        { progress: 0.2, rank: 0 },
        { progress: 1, rank: 1 },
      ])
    ).toThrow();
    expect(() =>
      validateWaypoints([
        { progress: 0.5, rank: 3 },
        { progress: 0.5, rank: 1 },
      ])
    ).toThrow();
  });
});

describe('computeTangents', () => {
  it('first point uses explicit vel when present; last settles to 0', () => {
    const pts = [
      { progress: 0.25, rank: 8, vel: -3 },
      { progress: 0.6, rank: 5 },
      { progress: 1, rank: 1 },
    ];
    const tan = computeTangents(pts);
    expect(tan[0]).toBe(-3); // anchor velocity honored
    expect(tan[tan.length - 1]).toBe(0); // settle
  });
});

describe('sampleHeroCurve', () => {
  const curve = makeHeroCurve([
    { progress: 0.25, rank: 8 },
    { progress: 0.6, rank: 5 },
    { progress: 1.0, rank: 1 },
  ]);

  it('passes through every control point', () => {
    expect(sampleHeroCurve(curve, 0.25)).toBeCloseTo(8, 6);
    expect(sampleHeroCurve(curve, 0.6)).toBeCloseTo(5, 6);
    expect(sampleHeroCurve(curve, 1.0)).toBeCloseTo(1, 6);
  });
  it('holds the first rank before the curve starts and the last rank after it ends', () => {
    expect(sampleHeroCurve(curve, 0.1)).toBe(8);
    expect(sampleHeroCurve(curve, 1.2)).toBe(1);
  });
  it('is continuous across an interior control point (both one-sided limits reach the control value)', () => {
    const eps = 1e-4;
    expect(sampleHeroCurve(curve, 0.6 - eps)).toBeCloseTo(5, 2);
    expect(sampleHeroCurve(curve, 0.6 + eps)).toBeCloseTo(5, 2);
  });
});

describe('anchorHeroCurve — jerk-matched handoff', () => {
  const base = makeHeroCurve([
    { progress: 0.25, rank: 6 },
    { progress: 0.6, rank: 4 },
    { progress: 1.0, rank: 1 },
  ]);

  it('replaces the start with the actual (progress, rank) — VALUE continuity at the handoff', () => {
    const anchored = anchorHeroCurve(base, 0.25, 9, -4);
    expect(anchored.points[0]).toEqual({ progress: 0.25, rank: 9, vel: -4 });
    expect(sampleHeroCurve(anchored, 0.25)).toBeCloseTo(9, 6);
  });

  it('honors the anchor rank-velocity — FIRST-DERIVATIVE continuity at the handoff', () => {
    const anchored = anchorHeroCurve(base, 0.25, 9, -4);
    const f = (p) => sampleHeroCurve(anchored, p);
    // slope just inside the curve ≈ the anchored velocity (rank per progress)
    expect(deriv(f, 0.25 + 1e-3)).toBeCloseTo(-4, 1);
  });

  it('drops authored waypoints at/behind the anchor progress', () => {
    const anchored = anchorHeroCurve(base, 0.5, 7, -2);
    // 0.25 and (0.25<0.5) waypoints gone; only progress>0.5 survive + the anchor
    expect(anchored.points[0].progress).toBe(0.5);
    expect(anchored.points.every((p, i) => i === 0 || p.progress > 0.5)).toBe(true);
  });

  it('handles a degenerate tail (anchor past all waypoints) by holding the last rank', () => {
    const anchored = anchorHeroCurve(base, 0.99, 2, 0);
    expect(anchored.points.length).toBeGreaterThanOrEqual(2);
    expect(sampleHeroCurve(anchored, 1.0)).toBeCloseTo(
      anchored.points[anchored.points.length - 1].rank,
      6
    );
  });
});
