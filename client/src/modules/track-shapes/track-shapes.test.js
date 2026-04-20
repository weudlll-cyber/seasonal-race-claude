// ============================================================
// File:        track-shapes.test.js
// Path:        client/src/modules/track-shapes/track-shapes.test.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Tests for all track shape modules — verifies path math,
//              lane separation, open vs closed course property, and edge points.
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

    it('closed loops: t=0 and t=1 are the same; open courses: t=0 and t=1 are far apart', () => {
      for (let lane = 0; lane < N_LANES; lane++) {
        const p0 = shape.getPosition(0, lane, N_LANES);
        const p1 = shape.getPosition(1, lane, N_LANES);
        const dist = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
        if (shape.isOpen) {
          // Open course: start (t=0) and finish (t=1) must be well separated
          expect(dist).toBeGreaterThan(50);
        } else {
          // Closed loop: t=1 wraps back to t=0 within tolerance
          expect(dist).toBeLessThan(10);
        }
      }
    });

    it('positions stay within canvas bounds (with margin)', () => {
      const MARGIN = 50;
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
    it('returns outer and inner arrays', () => {
      const { outer, inner } = shape.getEdgePoints(N_LANES, 60);
      expect(Array.isArray(outer)).toBe(true);
      expect(Array.isArray(inner)).toBe(true);
      expect(outer.length).toBe(61); // nSamples + 1
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
