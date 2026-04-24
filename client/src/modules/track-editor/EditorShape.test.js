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
