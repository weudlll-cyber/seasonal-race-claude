import { describe, it, expect } from 'vitest';
import { EditorShape } from './EditorShape.js';

// Straight open track: inner and outer run parallel horizontally
const STRAIGHT_OPEN = {
  closed: false,
  innerPoints: [
    { x: 0, y: 10 },
    { x: 500, y: 10 },
  ],
  outerPoints: [
    { x: 0, y: 50 },
    { x: 500, y: 50 },
  ],
};

// Closed triangular track
const TRIANGLE_CLOSED = {
  closed: true,
  innerPoints: [
    { x: 100, y: 100 },
    { x: 400, y: 100 },
    { x: 250, y: 350 },
  ],
  outerPoints: [
    { x: 50, y: 50 },
    { x: 450, y: 50 },
    { x: 250, y: 420 },
  ],
};

describe('EditorShape — open straight track', () => {
  const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });

  it('isOpen is true for open track', () => {
    expect(shape.isOpen).toBe(true);
  });

  it('getPosition(0, 0) is on the centre line at the start', () => {
    const pos = shape.getPosition(0, 0);
    expect(pos.x).toBeCloseTo(0, 0);
    expect(pos.y).toBeCloseTo(30, 1); // midpoint of y=10 and y=50
    expect(isFinite(pos.angle)).toBe(true);
  });

  it('getPosition(1, 0) is on the centre line at the end', () => {
    const pos = shape.getPosition(1, 0);
    expect(pos.x).toBeCloseTo(500, 0);
    expect(pos.y).toBeCloseTo(30, 1);
  });

  it('getPosition(0.5, -0.5) is on the inner edge', () => {
    const pos = shape.getPosition(0.5, -0.5);
    expect(pos.y).toBeCloseTo(10, 1);
  });

  it('getPosition(0.5, 0.5) is on the outer edge', () => {
    const pos = shape.getPosition(0.5, 0.5);
    expect(pos.y).toBeCloseTo(50, 1);
  });

  it('angle at t=0.5 is finite and points rightward', () => {
    const pos = shape.getPosition(0.5, 0);
    expect(isFinite(pos.angle)).toBe(true);
    // Horizontal track → angle ≈ 0
    expect(Math.abs(pos.angle)).toBeLessThan(0.3);
  });
});

describe('EditorShape — closed triangular track', () => {
  const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 120 });

  it('isOpen is false for closed track', () => {
    expect(shape.isOpen).toBe(false);
  });

  it('getPosition(0, 0) and getPosition(1, 0) are close (periodic)', () => {
    const p0 = shape.getPosition(0, 0);
    const p1 = shape.getPosition(1, 0);
    const dist = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
    expect(dist).toBeLessThan(10);
  });

  it('getTotalLength is positive and finite', () => {
    const len = shape.getTotalLength();
    expect(len).toBeGreaterThan(0);
    expect(isFinite(len)).toBe(true);
  });

  it('getCenterPoint x and y are finite', () => {
    const cp = shape.getCenterPoint();
    expect(isFinite(cp.x)).toBe(true);
    expect(isFinite(cp.y)).toBe(true);
  });

  it('all getPosition angles along the track are finite', () => {
    for (let i = 0; i < 10; i++) {
      const { angle } = shape.getPosition(i / 10, 0);
      expect(isFinite(angle)).toBe(true);
    }
  });
});

describe('EditorShape — getEdgePoints', () => {
  const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });

  it('returns outer and inner arrays with nSamples+1 entries', () => {
    const { outer, inner } = shape.getEdgePoints(30);
    expect(outer).toHaveLength(31);
    expect(inner).toHaveLength(31);
  });

  it('outer y is greater than inner y for a horizontal straight track (outer is at y=50, inner at y=10)', () => {
    const { outer, inner } = shape.getEdgePoints(10);
    for (let i = 0; i < outer.length; i++) {
      expect(outer[i].y).toBeGreaterThan(inner[i].y);
    }
  });
});

describe('EditorShape — getActualTrackWidth', () => {
  it('returns the median inner-to-outer distance rounded to the nearest integer', () => {
    // Straight open track with inner y=0, outer y=300 → width exactly 300.
    const shape = new EditorShape(STRAIGHT_OPEN, { samples: 500 });
    // STRAIGHT_OPEN: inner y=10, outer y=50 → width = 40
    expect(shape.getActualTrackWidth()).toBe(40);
  });

  it('rounds fractional catmullRom result to nearest integer (fp regression)', () => {
    // Simulate a track whose spline samples produce 299.9999999999994 at the median.
    // We build a track whose inner/outer points are exactly 300px apart, then verify
    // getActualTrackWidth() returns 300 (not 299 via floor artifact).
    const pts = (y) => Array.from({ length: 10 }, (_, i) => ({ x: i * 100, y }));
    const shape = new EditorShape(
      { closed: false, innerPoints: pts(0), outerPoints: pts(300) },
      { samples: 500 }
    );
    expect(shape.getActualTrackWidth()).toBe(300);
  });

  it('result is cached — second call returns the same value without recomputing', () => {
    const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });
    const first = shape.getActualTrackWidth();
    const second = shape.getActualTrackWidth();
    expect(second).toBe(first);
    expect(shape._cachedActualTrackWidth).toBeDefined();
  });
});

describe('EditorShape — getBoundingBox', () => {
  it('returns a box that contains all inner and outer points', () => {
    const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 120 });
    const bbox = shape.getBoundingBox();
    const allPts = [...TRIANGLE_CLOSED.innerPoints, ...TRIANGLE_CLOSED.outerPoints];
    for (const p of allPts) {
      expect(p.x).toBeGreaterThanOrEqual(bbox.minX);
      expect(p.x).toBeLessThanOrEqual(bbox.maxX);
      expect(p.y).toBeGreaterThanOrEqual(bbox.minY);
      expect(p.y).toBeLessThanOrEqual(bbox.maxY);
    }
  });

  it('is cached — second call returns the same object', () => {
    const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });
    const first = shape.getBoundingBox();
    const second = shape.getBoundingBox();
    expect(second).toBe(first);
  });

  it('minX < maxX and minY < maxY', () => {
    const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 120 });
    const { minX, maxX, minY, maxY } = shape.getBoundingBox();
    expect(maxX).toBeGreaterThan(minX);
    expect(maxY).toBeGreaterThan(minY);
  });
});

describe('EditorShape — offset clamping in getPosition', () => {
  const shape = new EditorShape(STRAIGHT_OPEN, { samples: 100 });

  it('offset 1.0 clamps to the outer edge (same as offset 0.5)', () => {
    const p1 = shape.getPosition(0.5, 1.0);
    const p05 = shape.getPosition(0.5, 0.5);
    expect(p1.x).toBeCloseTo(p05.x, 1);
    expect(p1.y).toBeCloseTo(p05.y, 1);
  });

  it('offset -1.0 clamps to the inner edge (same as offset -0.5)', () => {
    const pN1 = shape.getPosition(0.5, -1.0);
    const pN05 = shape.getPosition(0.5, -0.5);
    expect(pN1.x).toBeCloseTo(pN05.x, 1);
    expect(pN1.y).toBeCloseTo(pN05.y, 1);
  });
});

// ── _tangentAngle regression tests (PR-A2.5 arc-length fix) ──────────────────
//
// Before the fix, _tangentAngle called derivativeAt(controlPoints, t):
//   • derivativeAt treats t as a T-parameter, but racer-t is an arc-length fraction.
//   • derivativeAt clamps t to [0,1], so closed-track lap 2+ always returned
//     the constant end-tangent.
//
// L-shaped open track: horizontal leg (300px) then vertical leg (300px).
const L_OPEN = {
  closed: false,
  innerPoints: [
    { x: 0, y: 10 },
    { x: 300, y: 10 },
    { x: 300, y: 310 },
  ],
  outerPoints: [
    { x: 0, y: 50 },
    { x: 340, y: 50 },
    { x: 340, y: 310 },
  ],
};

// Asymmetric open track: horizontal (400px) >> vertical (100px).
// Arc-length midpoint is deep on the horizontal leg; T-parameter midpoint is at the corner.
const ASYMMETRIC_L_OPEN = {
  closed: false,
  innerPoints: [
    { x: 0, y: 10 },
    { x: 400, y: 10 },
    { x: 400, y: 110 },
  ],
  outerPoints: [
    { x: 0, y: 50 },
    { x: 440, y: 50 },
    { x: 440, y: 110 },
  ],
};

describe('EditorShape — _tangentAngle (arc-length regression)', () => {
  it('open L-track: angle before the turn (~0) differs from angle after (~π/2)', () => {
    const shape = new EditorShape(L_OPEN, { samples: 500 });
    const { angle: before } = shape.getPosition(0.2, 0); // on horizontal leg
    const { angle: after } = shape.getPosition(0.8, 0); // on vertical leg
    // Horizontal → ~0 rad; vertical → ~π/2 rad; difference ≥ 1 rad (>57°)
    const diff = Math.abs(after - before);
    expect(diff).toBeGreaterThan(1.0);
    expect(Math.abs(before)).toBeLessThan(0.4); // roughly rightward
    expect(Math.abs(after - Math.PI / 2)).toBeLessThan(0.4); // roughly downward
  });

  it('open L-track: endpoint (t=0) angle is finite and not NaN', () => {
    const shape = new EditorShape(L_OPEN, { samples: 500 });
    const { angle } = shape.getPosition(0, 0);
    expect(isFinite(angle)).toBe(true);
  });

  it('open L-track: endpoint (t=1) angle is finite and not NaN', () => {
    const shape = new EditorShape(L_OPEN, { samples: 500 });
    const { angle } = shape.getPosition(1, 0);
    expect(isFinite(angle)).toBe(true);
  });

  it('closed-track lap 2+: angle at t=2.5 equals angle at t=0.5 (multi-lap regression)', () => {
    // Before the fix, derivativeAt clamped t to [0,1] — so t=2.5 always
    // returned the angle at T=1.0 (constant end-tangent for all racers in lap 2+).
    const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 120 });
    const { angle: a05 } = shape.getPosition(0.5, 0);
    const { angle: a25 } = shape.getPosition(2.5, 0);
    expect(a25).toBeCloseTo(a05, 10);
  });

  it('closed-track: angle at t=0 equals angle at t=1 (periodic wrap)', () => {
    const shape = new EditorShape(TRIANGLE_CLOSED, { samples: 120 });
    const { angle: a0 } = shape.getPosition(0, 0);
    const { angle: a1 } = shape.getPosition(1, 0);
    expect(a1).toBeCloseTo(a0, 10);
  });

  it('asymmetric open track: arc-length t=0.7 is on the long horizontal leg (angle ≈ 0)', () => {
    // Horizontal ~400px, vertical ~100px — total ~500px.
    // Arc-length 0.7 = ~350px → still on horizontal leg → angle ≈ 0.
    // The old T-parameter approach: T=0.7 → 2nd segment (vertical) → angle ≈ π/2. This
    // test distinguishes the two approaches.
    const shape = new EditorShape(ASYMMETRIC_L_OPEN, { samples: 500 });
    const { angle } = shape.getPosition(0.7, 0);
    expect(Math.abs(angle)).toBeLessThan(0.4); // near 0 = rightward
  });
});
