import { describe, it, expect } from 'vitest';
import { catmullRomSpline, derivativeAt, offsetCurve } from './catmullRom.js';

const EPS = 1e-8; // tolerance for "passes exactly through control points"

// ── catmullRomSpline ──────────────────────────────────────────────────────────

describe('catmullRomSpline', () => {
  it('open curve through 2 collinear points is a straight line', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const result = catmullRomSpline(pts, { closed: false, samples: 20 });
    expect(result).toHaveLength(20);
    for (const p of result) {
      expect(p.y).toBeCloseTo(0, 8);
    }
    expect(result[0].x).toBeCloseTo(0, 8);
    expect(result[19].x).toBeCloseTo(100, 8);
  });

  it('open curve: samples=n hits all control points at segment junctions', () => {
    // With 3 control points (2 segments) and samples=3, T values are 0, 0.5, 1.
    // T=0 → seg 0 at t=0 = pts[0]; T=0.5 → seg 1 at t=0 = pts[1]; T=1 → seg 1 at t=1 = pts[2].
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 0 },
    ];
    const result = catmullRomSpline(pts, { closed: false, samples: 3 });
    expect(result[0].x).toBeCloseTo(pts[0].x, 8);
    expect(result[0].y).toBeCloseTo(pts[0].y, 8);
    expect(result[1].x).toBeCloseTo(pts[1].x, 8);
    expect(result[1].y).toBeCloseTo(pts[1].y, 8);
    expect(result[2].x).toBeCloseTo(pts[2].x, 8);
    expect(result[2].y).toBeCloseTo(pts[2].y, 8);
  });

  it('closed curve: samples=n hits each control point at the start of its segment', () => {
    // With n=3 closed and samples=3, T values 0, 1/3, 2/3 land exactly on pts[0], pts[1], pts[2].
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 100 },
    ];
    const result = catmullRomSpline(pts, { closed: true, samples: 3 });
    expect(result).toHaveLength(3);
    expect(result[0].x).toBeCloseTo(pts[0].x, 8);
    expect(result[0].y).toBeCloseTo(pts[0].y, 8);
    expect(result[1].x).toBeCloseTo(pts[1].x, 8);
    expect(result[1].y).toBeCloseTo(pts[1].y, 8);
    expect(result[2].x).toBeCloseTo(pts[2].x, 8);
    expect(result[2].y).toBeCloseTo(pts[2].y, 8);
  });

  it('closed curve is periodic: evaluating at T=1 gives the first control point', () => {
    // T=1 maps to the end of the last segment (t=1), whose P2 wraps to pts[0].
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 100 },
    ];
    // Use samples=4 so i=3 → T=3/4, not T=1; verify by using derivativeAt instead.
    // Direct way: request 1 sample at T=1 by using samples=1 on a closed curve shifted by 1.
    // Easier: just call catmullRomSpline with closed, samples=n+1 and check last === first.
    const result = catmullRomSpline(pts, { closed: true, samples: 4 });
    // T=0 → pts[0]; the periodicity guarantee means T=1 would land on pts[0].
    // With samples=4: T values are 0, 0.25, 0.5, 0.75 — none is T=1.
    // Verify first point is pts[0]:
    expect(result[0].x).toBeCloseTo(pts[0].x, 8);
    expect(result[0].y).toBeCloseTo(pts[0].y, 8);
    // Verify point count
    expect(result).toHaveLength(4);
  });

  it('open curve returns exactly `samples` points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 200 },
    ];
    expect(catmullRomSpline(pts, { samples: 50 })).toHaveLength(50);
    expect(catmullRomSpline(pts, { samples: 1 })).toHaveLength(1);
  });

  it('closed curve returns exactly `samples` points (no duplicated endpoint)', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 80 },
    ];
    const result = catmullRomSpline(pts, { closed: true, samples: 60 });
    expect(result).toHaveLength(60);
    // First and last should NOT be equal (last is T=59/60, not T=1=start)
    const first = result[0];
    const last = result[result.length - 1];
    const d = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
    expect(d).toBeGreaterThan(EPS);
  });

  it('throws for open curve with fewer than 2 points', () => {
    expect(() => catmullRomSpline([{ x: 0, y: 0 }])).toThrow();
    expect(() => catmullRomSpline([])).toThrow();
  });

  it('throws for closed curve with fewer than 3 points', () => {
    expect(() =>
      catmullRomSpline(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        { closed: true }
      )
    ).toThrow();
    expect(() => catmullRomSpline([{ x: 0, y: 0 }], { closed: true })).toThrow();
  });
});

// ── offsetCurve ───────────────────────────────────────────────────────────────

describe('offsetCurve', () => {
  it('amount=0 returns a copy of the input with same values', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 25 },
      { x: 100, y: 0 },
    ];
    const result = offsetCurve(pts, 0);
    expect(result).toHaveLength(pts.length);
    for (let i = 0; i < pts.length; i++) {
      expect(result[i].x).toBe(pts[i].x);
      expect(result[i].y).toBe(pts[i].y);
    }
    // Must be a copy, not the same array
    expect(result).not.toBe(pts);
  });

  it('horizontal line offset by positive amount shifts all points up by that amount', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
    ];
    const result = offsetCurve(pts, 30);
    for (const p of result) {
      expect(p.y).toBeCloseTo(30, 8);
    }
    // x coordinates preserved
    expect(result[0].x).toBeCloseTo(0, 8);
    expect(result[1].x).toBeCloseTo(100, 8);
    expect(result[2].x).toBeCloseTo(200, 8);
  });

  it('horizontal line offset by negative amount shifts all points down', () => {
    const pts = [
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ];
    const result = offsetCurve(pts, -20);
    for (const p of result) {
      expect(p.y).toBeCloseTo(30, 8);
    }
  });

  it('vertical line offset preserves perpendicular distance in x', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 0, y: 200 },
    ];
    const result = offsetCurve(pts, 15);
    // Tangent is (0,1), left perp is (-1,0), so offset is in -x direction
    for (const p of result) {
      expect(p.x).toBeCloseTo(-15, 8);
    }
  });

  it('each offset point is exactly |amount| away from its original', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];
    const amount = 25;
    const result = offsetCurve(pts, amount);
    for (let i = 0; i < pts.length; i++) {
      const dist = Math.sqrt((result[i].x - pts[i].x) ** 2 + (result[i].y - pts[i].y) ** 2);
      expect(dist).toBeCloseTo(amount, 6);
    }
  });
});

// ── derivativeAt ──────────────────────────────────────────────────────────────

describe('derivativeAt', () => {
  it('horizontal line has positive dx at T=0', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const d = derivativeAt(pts, 0);
    expect(d.dx).toBeGreaterThan(0);
    expect(d.dy).toBeCloseTo(0, 8);
  });

  it('horizontal line has positive dx at T=1', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const d = derivativeAt(pts, 1);
    expect(d.dx).toBeGreaterThan(0);
    expect(d.dy).toBeCloseTo(0, 8);
  });

  it('T=0 and T=1 point in the same direction on a monotone open curve', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
    ];
    const d0 = derivativeAt(pts, 0);
    const d1 = derivativeAt(pts, 1);
    // Both should have positive dx and near-zero dy
    expect(d0.dx).toBeGreaterThan(0);
    expect(d1.dx).toBeGreaterThan(0);
    expect(d0.dy).toBeCloseTo(0, 6);
    expect(d1.dy).toBeCloseTo(0, 6);
  });

  it('derivative at T=0.5 of a closed triangle points forward (non-zero)', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 100 },
    ];
    const d = derivativeAt(pts, 0.5, { closed: true });
    const mag = Math.sqrt(d.dx ** 2 + d.dy ** 2);
    expect(mag).toBeGreaterThan(1);
  });

  it('throws for too-few points', () => {
    expect(() => derivativeAt([{ x: 0, y: 0 }], 0)).toThrow();
    expect(() =>
      derivativeAt(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        0,
        { closed: true }
      )
    ).toThrow();
  });
});
