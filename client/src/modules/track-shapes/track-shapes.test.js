import { describe, it, expect } from 'vitest';
import {
  getShape,
  SHAPE_IDS,
  SvgPathShape,
  OvalShape,
  SCurveShape,
  SpiralShape,
  ZigzagShape,
  RectangleShape,
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

// ── SvgPathShape unit tests ───────────────────────────────────────────────────

describe('SvgPathShape', () => {
  const openShape = new SCurveShape(CW, CH); // open path: M 30,300 … 970,300
  const closedShape = new OvalShape(CW, CH); // closed loop

  it('getTotalLength returns a positive finite number', () => {
    expect(openShape.getTotalLength()).toBeGreaterThan(100);
    expect(isFinite(openShape.getTotalLength())).toBe(true);
  });

  it('open: getPosition(0) band-centre is near path start', () => {
    // Average lane 0 and last lane to recover the centre-path position
    const p0 = openShape.getPosition(0, 0, 6);
    const p5 = openShape.getPosition(0, 5, 6);
    const cx = (p0.x + p5.x) / 2;
    const cy = (p0.y + p5.y) / 2;
    // s-curve start: grid (30, 300) → canvas (~38, 360)
    expect(cx).toBeGreaterThan(0);
    expect(cx).toBeLessThan(CW * 0.2);
    expect(cy).toBeGreaterThan(CH * 0.3);
    expect(cy).toBeLessThan(CH * 0.7);
  });

  it('open: getPosition(1) band-centre is near path end', () => {
    const p0 = openShape.getPosition(1, 0, 6);
    const p5 = openShape.getPosition(1, 5, 6);
    const cx = (p0.x + p5.x) / 2;
    // s-curve end: grid (970, 300) → canvas (~1242, 360)
    expect(cx).toBeGreaterThan(CW * 0.8);
  });

  it('closed: getPosition(0) ≈ getPosition(1)', () => {
    for (let lane = 0; lane < 6; lane++) {
      const p0 = closedShape.getPosition(0, lane, 6);
      const p1 = closedShape.getPosition(1, lane, 6);
      const dist = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
      expect(dist).toBeLessThan(1);
    }
  });

  it('lane offsets are symmetric around the centre path', () => {
    const inner = openShape.getPosition(0.4, 0, 6);
    const outer = openShape.getPosition(0.4, 5, 6);
    const cx = (inner.x + outer.x) / 2;
    const cy = (inner.y + outer.y) / 2;
    const dInner = Math.sqrt((inner.x - cx) ** 2 + (inner.y - cy) ** 2);
    const dOuter = Math.sqrt((outer.x - cx) ** 2 + (outer.y - cy) ** 2);
    expect(Math.abs(dInner - dOuter)).toBeLessThan(0.1);
    expect(dInner).toBeGreaterThan(20); // non-degenerate spread
  });

  it('getTangentAngle returns angle in [-PI, PI]', () => {
    for (let i = 0; i <= 10; i++) {
      const a = openShape.getTangentAngle(i / 10);
      expect(a).toBeGreaterThanOrEqual(-Math.PI);
      expect(a).toBeLessThanOrEqual(Math.PI);
    }
  });
});

// ── Shape factory tests ────────────────────────────────────────────────────────

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

  it('all named shape classes extend SvgPathShape', () => {
    for (const [, Cls] of ALL_SHAPES) {
      expect(new Cls(CW, CH)).toBeInstanceOf(SvgPathShape);
    }
  });
});

// ── Per-shape tests ────────────────────────────────────────────────────────────

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
        const dx = outer[i].x - inner[i].x;
        const dy = outer[i].y - inner[i].y;
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
