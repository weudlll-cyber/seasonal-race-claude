// ============================================================
// File:        track-shapes.test.js
// Path:        client/src/modules/track-shapes/track-shapes.test.js
// Project:     RaceArena
// Description: Tests for all track shape modules and PathInterpolator.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  getShape,
  SHAPE_IDS,
  OvalShape,
  SCurveShape,
  SpiralShape,
  ZigzagShape,
  RectangleShape,
  PathInterpolator,
} from './index.js';

const CW = 1280,
  CH = 720;
const ALL_SHAPES = [
  ['oval', OvalShape],
  ['s-curve', SCurveShape],
  ['spiral', SpiralShape],
  ['zigzag', ZigzagShape],
  ['rectangle', RectangleShape],
];

// ── PathInterpolator unit tests ────────────────────────────────────────────

describe('PathInterpolator', () => {
  const openPts = [
    { x: 0, y: 300 },
    { x: 500, y: 100 },
    { x: 1000, y: 300 },
  ];
  const closedPts = [
    { x: 200, y: 200 },
    { x: 800, y: 200 },
    { x: 800, y: 400 },
    { x: 200, y: 400 },
  ];

  it('open: getPoint(0) is near first control point', () => {
    const p = new PathInterpolator(openPts, { closed: false, cw: 1000, ch: 600 });
    const pt = p.getPoint(0);
    expect(Math.abs(pt.x - 0)).toBeLessThan(5);
    expect(Math.abs(pt.y - 300)).toBeLessThan(5);
  });

  it('open: getPoint(1) is near last control point', () => {
    const p = new PathInterpolator(openPts, { closed: false, cw: 1000, ch: 600 });
    const pt = p.getPoint(1);
    expect(Math.abs(pt.x - 1000)).toBeLessThan(5);
    expect(Math.abs(pt.y - 300)).toBeLessThan(5);
  });

  it('closed: getPoint(0) === getPoint(1)', () => {
    const p = new PathInterpolator(closedPts, { closed: true, cw: 1000, ch: 600 });
    const p0 = p.getPoint(0),
      p1 = p.getPoint(1);
    const dist = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
    expect(dist).toBeLessThan(5);
  });

  it('getTotalLength returns a positive finite number', () => {
    const p = new PathInterpolator(openPts, { closed: false, cw: 1000, ch: 600 });
    expect(p.getTotalLength()).toBeGreaterThan(100);
    expect(isFinite(p.getTotalLength())).toBe(true);
  });

  it('getTangentAngle returns angle in [-PI, PI]', () => {
    const p = new PathInterpolator(openPts, { closed: false, cw: 1000, ch: 600 });
    for (let i = 0; i <= 10; i++) {
      const a = p.getTangentAngle(i / 10);
      expect(a).toBeGreaterThanOrEqual(-Math.PI);
      expect(a).toBeLessThanOrEqual(Math.PI);
    }
  });

  it('arc-length spacing: intermediate t values spread across the path', () => {
    const p = new PathInterpolator(openPts, { closed: false, cw: 1000, ch: 600 });
    const p25 = p.getPoint(0.25);
    const p75 = p.getPoint(0.75);
    // Both should be distinct from endpoints and from each other
    expect(Math.abs(p25.x - p75.x) + Math.abs(p25.y - p75.y)).toBeGreaterThan(50);
  });
});

// ── Shape factory tests ────────────────────────────────────────────────────

describe('getShape factory', () => {
  it('returns an instance for every registered shapeId', () => {
    for (const id of SHAPE_IDS) {
      const s = getShape(id, CW, CH);
      expect(s).toBeTruthy();
      expect(typeof s.getPosition).toBe('function');
    }
  });

  it('falls back to OvalShape for unknown id', () => {
    const s = getShape('totally-unknown', CW, CH);
    expect(s).toBeInstanceOf(OvalShape);
  });

  it('SHAPE_IDS contains all 5 shapes', () => {
    expect(SHAPE_IDS).toHaveLength(5);
  });
});

// ── Per-shape tests ────────────────────────────────────────────────────────

describe.each(ALL_SHAPES)('%s shape', (id, Cls) => {
  const shape = new Cls(CW, CH);
  const N_LANES = 6;

  describe('getPosition', () => {
    it('returns {x, y, angle} with finite numbers', () => {
      const pos = shape.getPosition(0, 0, N_LANES);
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
      expect(typeof pos.angle).toBe('number');
      expect(isFinite(pos.x)).toBe(true);
      expect(isFinite(pos.y)).toBe(true);
      expect(isFinite(pos.angle)).toBe(true);
    });

    it('different laneIndex values produce different x/y', () => {
      const p0 = shape.getPosition(0.25, 0, N_LANES);
      const p5 = shape.getPosition(0.25, N_LANES - 1, N_LANES);
      const dist = Math.sqrt((p5.x - p0.x) ** 2 + (p5.y - p0.y) ** 2);
      expect(dist).toBeGreaterThan(5);
    });

    it('closed loops: t=0 ≈ t=1; open courses: t=0 and t=1 are far apart', () => {
      for (let lane = 0; lane < N_LANES; lane++) {
        const p0 = shape.getPosition(0, lane, N_LANES);
        const p1 = shape.getPosition(1, lane, N_LANES);
        const dist = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
        if (shape.isOpen) {
          expect(dist).toBeGreaterThan(50);
        } else {
          expect(dist).toBeLessThan(10);
        }
      }
    });

    it('positions stay within canvas bounds (with margin)', () => {
      const MARGIN = 80;
      for (let i = 0; i < 20; i++) {
        const t = i / 20;
        const pos = shape.getPosition(t, Math.floor(N_LANES / 2), N_LANES);
        expect(pos.x).toBeGreaterThan(-MARGIN);
        expect(pos.x).toBeLessThan(CW + MARGIN);
        expect(pos.y).toBeGreaterThan(-MARGIN);
        expect(pos.y).toBeLessThan(CH + MARGIN);
      }
    });

    it('angle is between -PI and PI', () => {
      for (let i = 0; i < 10; i++) {
        const { angle } = shape.getPosition(i / 10, 0, N_LANES);
        expect(angle).toBeGreaterThanOrEqual(-Math.PI);
        expect(angle).toBeLessThanOrEqual(Math.PI);
      }
    });
  });

  describe('getBandWidth', () => {
    it('returns a positive number', () => {
      expect(shape.getBandWidth(N_LANES)).toBeGreaterThan(0);
    });

    it('width grows with more lanes (within caps)', () => {
      expect(shape.getBandWidth(8)).toBeGreaterThanOrEqual(shape.getBandWidth(2));
    });
  });

  describe('getTotalLength', () => {
    it('returns a positive finite number', () => {
      const len = shape.getTotalLength();
      expect(len).toBeGreaterThan(100);
      expect(isFinite(len)).toBe(true);
    });
  });

  describe('getEdgePoints', () => {
    it('returns outer and inner arrays of nSamples+1 points', () => {
      const { outer, inner } = shape.getEdgePoints(N_LANES, 60);
      expect(Array.isArray(outer)).toBe(true);
      expect(Array.isArray(inner)).toBe(true);
      expect(outer.length).toBe(61);
    });

    it('each edge point has finite x and y', () => {
      const { outer, inner } = shape.getEdgePoints(N_LANES, 20);
      for (const p of [...outer, ...inner]) {
        expect(isFinite(p.x)).toBe(true);
        expect(isFinite(p.y)).toBe(true);
      }
    });

    it('outer and inner edges are meaningfully separated', () => {
      const { outer, inner } = shape.getEdgePoints(N_LANES, 40);
      let totalSep = 0;
      for (let i = 0; i < outer.length; i++) {
        const dx = outer[i].x - inner[i].x,
          dy = outer[i].y - inner[i].y;
        totalSep += Math.sqrt(dx * dx + dy * dy);
      }
      expect(totalSep / outer.length).toBeGreaterThan(10);
    });
  });

  describe('getCenterPoint', () => {
    it('returns {x, y} near the canvas centre', () => {
      const cp = shape.getCenterPoint();
      expect(cp.x).toBeGreaterThan(CW * 0.2);
      expect(cp.x).toBeLessThan(CW * 0.8);
      expect(cp.y).toBeGreaterThan(CH * 0.2);
      expect(cp.y).toBeLessThan(CH * 0.8);
    });
  });
});
