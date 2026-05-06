import { describe, it, expect } from 'vitest';
import { getPanTarget } from './panTarget.js';

const STATES = ['OVERVIEW', 'LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'];

// Racers sorted desc by t (leader first)
const four = [
  { t: 0.9, x: 900, y: 400 }, // leader
  { t: 0.7, x: 700, y: 350 }, // 2nd
  { t: 0.5, x: 500, y: 300 }, // 3rd
  { t: 0.1, x: 100, y: 200 }, // last
];

describe('getPanTarget', () => {
  it('returns {x:0,y:0} for empty racers', () => {
    for (const s of STATES) {
      expect(getPanTarget(s, [])).toEqual({ x: 0, y: 0 });
      expect(getPanTarget(s, null)).toEqual({ x: 0, y: 0 });
    }
  });

  describe('LEADER_ZOOM', () => {
    it('returns leader position (racers[0])', () => {
      expect(getPanTarget('LEADER_ZOOM', four)).toEqual({ x: 900, y: 400 });
    });

    it('single racer → that racer', () => {
      expect(getPanTarget('LEADER_ZOOM', [{ x: 300, y: 150 }])).toEqual({ x: 300, y: 150 });
    });
  });

  describe('BATTLE_ZOOM', () => {
    it('midpoint of top-2 racers', () => {
      const result = getPanTarget('BATTLE_ZOOM', four);
      expect(result.x).toBeCloseTo((900 + 700) / 2);
      expect(result.y).toBeCloseTo((400 + 350) / 2);
    });

    it('single racer → that racer (fallback)', () => {
      const r = { x: 640, y: 360 };
      expect(getPanTarget('BATTLE_ZOOM', [r])).toEqual({ x: 640, y: 360 });
    });

    it('two racers → exact midpoint', () => {
      const racers = [
        { x: 200, y: 100 },
        { x: 600, y: 300 },
      ];
      expect(getPanTarget('BATTLE_ZOOM', racers)).toEqual({ x: 400, y: 200 });
    });
  });

  describe('COMEBACK_ZOOM', () => {
    it('returns 3rd-place racer (index 2)', () => {
      expect(getPanTarget('COMEBACK_ZOOM', four)).toEqual({ x: 500, y: 300 });
    });

    it('2-racer group → last racer (index 1)', () => {
      const two = [
        { x: 800, y: 400 },
        { x: 400, y: 200 },
      ];
      expect(getPanTarget('COMEBACK_ZOOM', two)).toEqual({ x: 400, y: 200 });
    });

    it('1-racer group → that racer', () => {
      const one = [{ x: 600, y: 300 }];
      expect(getPanTarget('COMEBACK_ZOOM', one)).toEqual({ x: 600, y: 300 });
    });

    it('does NOT target last-place (index 3) — targets 3rd-place', () => {
      const result = getPanTarget('COMEBACK_ZOOM', four);
      expect(result.x).not.toBe(100); // last-place
      expect(result.x).toBe(500); // 3rd-place
    });
  });

  describe('OVERVIEW', () => {
    it('centroid of all passed racers', () => {
      const result = getPanTarget('OVERVIEW', four);
      const expectedX = (900 + 700 + 500 + 100) / 4; // 550
      const expectedY = (400 + 350 + 300 + 200) / 4; // 312.5
      expect(result.x).toBeCloseTo(expectedX);
      expect(result.y).toBeCloseTo(expectedY);
    });

    it('single racer → that racer', () => {
      expect(getPanTarget('OVERVIEW', [{ x: 640, y: 360 }])).toEqual({ x: 640, y: 360 });
    });

    it('centroid shifts when passing top-3 vs all-4', () => {
      const top3 = four.slice(0, 3);
      const allCentroid = getPanTarget('OVERVIEW', four);
      const top3Centroid = getPanTarget('OVERVIEW', top3);
      // top-3 avg x = (900+700+500)/3 = 700, all avg x = 550
      expect(top3Centroid.x).toBeGreaterThan(allCentroid.x);
    });
  });

  it('unknown state falls through to OVERVIEW centroid', () => {
    const result = getPanTarget('UNKNOWN_STATE', four);
    expect(result.x).toBeCloseTo((900 + 700 + 500 + 100) / 4);
  });
});
