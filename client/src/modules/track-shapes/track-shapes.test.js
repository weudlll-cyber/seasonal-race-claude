import { describe, it, expect } from 'vitest';
import {
  getShape,
  getTrackWidth,
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
const DEFAULT_WIDTH = 140;

// ── getTrackWidth ─────────────────────────────────────────────────────────────

describe('getTrackWidth', () => {
  it('returns 140 for 1 player', () => expect(getTrackWidth(1)).toBe(140));
  it('returns 140 for 8 players', () => expect(getTrackWidth(8)).toBe(140));
  it('returns 200 for 9 players', () => expect(getTrackWidth(9)).toBe(200));
  it('returns 200 for 20 players', () => expect(getTrackWidth(20)).toBe(200));
  it('returns 280 for 21 players', () => expect(getTrackWidth(21)).toBe(280));
  it('returns 280 for 50 players', () => expect(getTrackWidth(50)).toBe(280));
  it('returns 360 for 51 players', () => expect(getTrackWidth(51)).toBe(360));
  it('returns 360 for 100 players', () => expect(getTrackWidth(100)).toBe(360));
});

// ── SvgPathShape unit tests ───────────────────────────────────────────────────

describe('SvgPathShape', () => {
  const openShape = new SCurveShape(CW, CH);
  const closedShape = new OvalShape(CW, CH);

  it('getTotalLength returns a positive finite number', () => {
    expect(openShape.getTotalLength()).toBeGreaterThan(100);
    expect(isFinite(openShape.getTotalLength())).toBe(true);
  });

  it('open: getPosition(0, 0, width) is near path start', () => {
    const pos = openShape.getPosition(0, 0, DEFAULT_WIDTH);
    // s-curve start: grid (30, 300) → canvas near left side
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.x).toBeLessThan(CW * 0.2);
    expect(pos.y).toBeGreaterThan(CH * 0.3);
    expect(pos.y).toBeLessThan(CH * 0.7);
  });

  it('open: getPosition(1, 0, width) is near path end', () => {
    const pos = openShape.getPosition(1, 0, DEFAULT_WIDTH);
    // s-curve end: grid (970, 300) → canvas near right side
    expect(pos.x).toBeGreaterThan(CW * 0.8);
  });

  it('closed: getPosition(0) ≈ getPosition(1)', () => {
    const p0 = closedShape.getPosition(0, 0, DEFAULT_WIDTH);
    const p1 = closedShape.getPosition(1, 0, DEFAULT_WIDTH);
    const dist = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
    expect(dist).toBeLessThan(1);
  });

  it('positive and negative trackOffset produce symmetric positions', () => {
    const pos = openShape.getPosition(0.4, 0, DEFAULT_WIDTH);
    const posPlus = openShape.getPosition(0.4, 0.35, DEFAULT_WIDTH);
    const posMinus = openShape.getPosition(0.4, -0.35, DEFAULT_WIDTH);
    // The center (offset=0) should be midway between ±0.35
    const midX = (posPlus.x + posMinus.x) / 2;
    const midY = (posPlus.y + posMinus.y) / 2;
    expect(Math.abs(midX - pos.x)).toBeLessThan(0.5);
    expect(Math.abs(midY - pos.y)).toBeLessThan(0.5);
  });

  it('±1.0 offsets span the full track width', () => {
    const p1 = openShape.getPosition(0.3, 1.0, DEFAULT_WIDTH);
    const p2 = openShape.getPosition(0.3, -1.0, DEFAULT_WIDTH);
    const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    expect(dist).toBeGreaterThan(DEFAULT_WIDTH * 0.9);
    expect(dist).toBeLessThan(DEFAULT_WIDTH * 1.1);
  });

  it('trackOffset of 0.35 stays within track width', () => {
    for (let i = 0; i <= 10; i++) {
      const pos = openShape.getPosition(i / 10, 0.35, DEFAULT_WIDTH);
      const center = openShape.getPosition(i / 10, 0, DEFAULT_WIDTH);
      const dx = pos.x - center.x,
        dy = pos.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeLessThan(DEFAULT_WIDTH / 2 + 1);
    }
  });

  it('getTangentAngle returns angle in [-PI, PI]', () => {
    for (let i = 0; i <= 10; i++) {
      const a = openShape.getTangentAngle(i / 10);
      expect(a).toBeGreaterThanOrEqual(-Math.PI);
      expect(a).toBeLessThanOrEqual(Math.PI);
    }
  });
});

// ── trackOffset range test ────────────────────────────────────────────────────

describe('racer trackOffset', () => {
  it('(Math.random() - 0.5) * 0.7 stays within ±0.35', () => {
    // Run many samples to confirm the formula stays in range
    for (let i = 0; i < 1000; i++) {
      const offset = (Math.random() - 0.5) * 0.7;
      expect(offset).toBeGreaterThanOrEqual(-0.35);
      expect(offset).toBeLessThanOrEqual(0.35);
    }
  });
});

// ── Collision avoidance math test ─────────────────────────────────────────────

describe('collision avoidance', () => {
  it('nudge reduces distance between two overlapping racers', () => {
    const r1 = { x: 100, y: 100, angle: 0 };
    const r2 = { x: 110, y: 100, angle: 0 }; // 10px apart, within 25px threshold

    const dx = r2.x - r1.x,
      dy = r2.y - r1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nudge = (25 - dist) / 2;
    const perpX = -Math.sin(r1.angle); // perpendicular
    const perpY = Math.cos(r1.angle);

    r1.x += perpX * nudge * 0.5;
    r1.y += perpY * nudge * 0.5;
    r2.x -= perpX * nudge * 0.5;
    r2.y -= perpY * nudge * 0.5;

    const newDist = Math.sqrt((r2.x - r1.x) ** 2 + (r2.y - r1.y) ** 2);
    // After nudge the perpendicular separation increases, but if nudge direction is
    // perpendicular to the racer-to-racer vector, separation along that axis stays.
    // The key invariant: neither racer moved along the direct collision axis.
    // Both moved perpendicularly, so the original dx/dy should be unchanged.
    const newDx = r2.x - r1.x,
      newDy = r2.y - r1.y;
    // x-axis gap unchanged (perpX = 0 when angle = 0), y-axis increased
    expect(Math.abs(newDx - dx)).toBeLessThan(0.01);
    expect(newDist).toBeGreaterThan(dist);
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
  const TW = DEFAULT_WIDTH;

  describe('getPosition', () => {
    it('returns {x, y, angle} with finite numbers', () => {
      const pos = shape.getPosition(0, 0, TW);
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
      expect(typeof pos.angle).toBe('number');
      expect(isFinite(pos.x)).toBe(true);
      expect(isFinite(pos.y)).toBe(true);
      expect(isFinite(pos.angle)).toBe(true);
    });

    it('getPosition(0) and getPosition(1) return valid coordinates', () => {
      const p0 = shape.getPosition(0, 0, TW);
      const p1 = shape.getPosition(1, 0, TW);
      expect(isFinite(p0.x)).toBe(true);
      expect(isFinite(p0.y)).toBe(true);
      expect(isFinite(p1.x)).toBe(true);
      expect(isFinite(p1.y)).toBe(true);
      expect(p0.x).toBeGreaterThan(-100);
      expect(p0.x).toBeLessThan(CW + 100);
    });

    it('different offsets produce different x/y', () => {
      const p0 = shape.getPosition(0.25, -0.35, TW);
      const p1 = shape.getPosition(0.25, 0.35, TW);
      const dist = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
      expect(dist).toBeGreaterThan(5);
    });

    it('closed loops: t=0 ≈ t=1; open courses: t=0 and t=1 are far apart', () => {
      const p0 = shape.getPosition(0, 0, TW);
      const p1 = shape.getPosition(1, 0, TW);
      const dist = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
      if (shape.isOpen) {
        expect(dist).toBeGreaterThan(50);
      } else {
        expect(dist).toBeLessThan(10);
      }
    });

    it('positions stay within canvas bounds (with margin)', () => {
      const MARGIN = 80;
      for (let i = 0; i < 20; i++) {
        const t = i / 20;
        const pos = shape.getPosition(t, 0, TW);
        expect(pos.x).toBeGreaterThan(-MARGIN);
        expect(pos.x).toBeLessThan(CW + MARGIN);
        expect(pos.y).toBeGreaterThan(-MARGIN);
        expect(pos.y).toBeLessThan(CH + MARGIN);
      }
    });

    it('angle is between -PI and PI', () => {
      for (let i = 0; i < 10; i++) {
        const { angle } = shape.getPosition(i / 10, 0, TW);
        expect(angle).toBeGreaterThanOrEqual(-Math.PI);
        expect(angle).toBeLessThanOrEqual(Math.PI);
      }
    });
  });

  describe('getTotalLength', () => {
    it('returns a positive finite number', () => {
      const len = shape.getTotalLength();
      expect(len).toBeGreaterThan(100);
      expect(isFinite(len)).toBe(true);
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
