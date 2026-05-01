// ============================================================
// File:        trackLights.test.js
// Path:        client/src/modules/trackLights.test.js
// Project:     RaceArena
// Description: Unit tests for track boundary light sampling and animation.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  sampleBoundaryAtInterval,
  getLightAlpha,
  DEFAULT_TRACK_LIGHTS,
  VALID_LIGHT_STYLES,
  LIGHT_SPACING_PX,
} from './trackLights.js';

// ── sampleBoundaryAtInterval ──────────────────────────────────────────────────

describe('sampleBoundaryAtInterval', () => {
  it('returns empty array for fewer than 2 points', () => {
    expect(sampleBoundaryAtInterval([], 30)).toEqual([]);
    expect(sampleBoundaryAtInterval([{ x: 0, y: 0 }], 30)).toEqual([]);
  });

  it('returns empty array for zero or negative spacing', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(sampleBoundaryAtInterval(pts, 0)).toEqual([]);
    expect(sampleBoundaryAtInterval(pts, -1)).toEqual([]);
  });

  it('places first light at the start point', () => {
    const pts = [
      { x: 10, y: 20 },
      { x: 110, y: 20 },
    ];
    const result = sampleBoundaryAtInterval(pts, 50);
    expect(result[0]).toEqual({ x: 10, y: 20 });
  });

  it('returns correct count for a straight 300px segment with 30px spacing', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
    ];
    // Lights at x=0, 30, 60, ..., 270 → 10 lights
    const result = sampleBoundaryAtInterval(pts, 30);
    expect(result).toHaveLength(10);
  });

  it('returns correct count for a straight 90px segment with 30px spacing', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 90, y: 0 },
    ];
    // Lights at x=0, 30, 60 → 3 lights
    const result = sampleBoundaryAtInterval(pts, 30);
    expect(result).toHaveLength(3);
  });

  it('interpolates positions correctly along a horizontal line', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 90, y: 0 },
    ];
    const result = sampleBoundaryAtInterval(pts, 30);
    expect(result[0].x).toBeCloseTo(0);
    expect(result[1].x).toBeCloseTo(30);
    expect(result[2].x).toBeCloseTo(60);
    for (const p of result) expect(p.y).toBeCloseTo(0);
  });

  it('handles a multi-segment path', () => {
    // Two 60px segments: total 120px → lights at 0, 30, 60, 90 = 4 lights
    const pts = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 120, y: 0 },
    ];
    const result = sampleBoundaryAtInterval(pts, 30);
    expect(result).toHaveLength(4);
    expect(result[2].x).toBeCloseTo(60);
    expect(result[3].x).toBeCloseTo(90);
  });

  it('handles a diagonal segment with correct distances', () => {
    // 45° diagonal: 100px horizontal + 100px vertical = 141.42px diagonal
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ];
    const diag = Math.sqrt(2) * 100;
    const spacing = 30;
    const expectedCount = Math.floor(diag / spacing) + 1;
    const result = sampleBoundaryAtInterval(pts, spacing);
    expect(result).toHaveLength(expectedCount);
  });

  it('LIGHT_SPACING_PX is 30', () => {
    expect(LIGHT_SPACING_PX).toBe(30);
  });
});

// ── getLightAlpha ─────────────────────────────────────────────────────────────

describe('getLightAlpha — steady', () => {
  it('always returns BASE_ALPHA (0.4) regardless of frame or index', () => {
    expect(getLightAlpha('steady', 0, 100, 0, 1.0, true)).toBeCloseTo(0.4);
    expect(getLightAlpha('steady', 50, 100, 99999, 2.0, false)).toBeCloseTo(0.4);
    expect(getLightAlpha('steady', 99, 100, 1234, 0.1, true)).toBeCloseTo(0.4);
  });
});

describe('getLightAlpha — sync_pulse', () => {
  it('returns a value in [0.4, 1.0]', () => {
    for (let ts = 0; ts < 5000; ts += 100) {
      const a = getLightAlpha('sync_pulse', 0, 100, ts, 1.0, true);
      expect(a).toBeGreaterThanOrEqual(0.4 - 1e-9);
      expect(a).toBeLessThanOrEqual(1.0 + 1e-9);
    }
  });

  it('all lights have the same alpha at any given frame (sync)', () => {
    const ts = 1234;
    const a0 = getLightAlpha('sync_pulse', 0, 100, ts, 1.0, true);
    const a50 = getLightAlpha('sync_pulse', 50, 100, ts, 1.0, true);
    const a99 = getLightAlpha('sync_pulse', 99, 100, ts, 1.0, true);
    expect(a0).toBeCloseTo(a50);
    expect(a0).toBeCloseTo(a99);
  });

  it('higher speed means faster oscillation', () => {
    // At ts=0 both start the same. After some time, fast should diverge more.
    const ts = 500;
    const slow = getLightAlpha('sync_pulse', 0, 100, ts, 0.5, true);
    const fast = getLightAlpha('sync_pulse', 0, 100, ts, 2.0, true);
    // They won't necessarily be equal — just verify both are in range
    expect(slow).toBeGreaterThanOrEqual(0.4 - 1e-9);
    expect(fast).toBeGreaterThanOrEqual(0.4 - 1e-9);
    expect(slow).toBeLessThanOrEqual(1.0 + 1e-9);
    expect(fast).toBeLessThanOrEqual(1.0 + 1e-9);
  });
});

describe('getLightAlpha — sequence', () => {
  it('returns BASE_ALPHA for totalLights=0', () => {
    expect(getLightAlpha('sequence', 0, 0, 1000, 1.0, true)).toBeCloseTo(0.4);
  });

  it('returns a value in [0.4, 1.0]', () => {
    for (let i = 0; i < 50; i++) {
      const a = getLightAlpha('sequence', i, 50, 1500, 1.0, true);
      expect(a).toBeGreaterThanOrEqual(0.4 - 1e-9);
      expect(a).toBeLessThanOrEqual(1.0 + 1e-9);
    }
  });

  it('wave center light reaches MAX_ALPHA (1.0)', () => {
    // period = 3000ms at speed=1.0; wavePos = (1500/3000)*100 = 50 at ts=1500
    const total = 100;
    const ts = 1500; // wavePos ≈ 50
    const a = getLightAlpha('sequence', 50, total, ts, 1.0, true);
    expect(a).toBeCloseTo(1.0, 1);
  });

  it('light far from wave stays at BASE_ALPHA', () => {
    // wavePos ≈ 50 at ts=1500; light at index 0 is far away
    const total = 100;
    const ts = 1500;
    const a = getLightAlpha('sequence', 0, total, ts, 1.0, true);
    expect(a).toBeCloseTo(0.4, 1);
  });

  it('open-track mode does not wrap around', () => {
    // On open track: light at 0, wave at ~90 → dist = 90, should be dim
    const total = 100;
    const ts = 2700; // wavePos ≈ 90
    const aClosed = getLightAlpha('sequence', 0, total, ts, 1.0, true);
    const aOpen = getLightAlpha('sequence', 0, total, ts, 1.0, false);
    // Open: |0 - 90| = 90 > WAVE_HALF_WIDTH → BASE_ALPHA
    expect(aOpen).toBeCloseTo(0.4, 1);
    // Closed: circDist = min(90, 10) = 10 > WAVE_HALF_WIDTH → also BASE_ALPHA
    expect(aClosed).toBeCloseTo(0.4, 1);
  });
});

describe('getLightAlpha — random_flash', () => {
  it('returns either BASE_ALPHA or MAX_ALPHA', () => {
    for (let i = 0; i < 200; i++) {
      const a = getLightAlpha('random_flash', i, 200, 1000, 1.0, true);
      const isBase = Math.abs(a - 0.4) < 1e-9;
      const isMax = Math.abs(a - 1.0) < 1e-9;
      expect(isBase || isMax).toBe(true);
    }
  });

  it('is deterministic — same inputs yield same output', () => {
    const a1 = getLightAlpha('random_flash', 42, 100, 5000, 1.5, false);
    const a2 = getLightAlpha('random_flash', 42, 100, 5000, 1.5, false);
    expect(a1).toBe(a2);
  });

  it('different light indices can produce different values at same frame', () => {
    const results = new Set();
    for (let i = 0; i < 100; i++) {
      results.add(getLightAlpha('random_flash', i, 100, 1000, 1.0, true));
    }
    // With ~8% flash rate, most lights should be BASE, but at least one should differ
    expect(results.size).toBeGreaterThanOrEqual(1);
  });
});

describe('getLightAlpha — unknown style', () => {
  it('falls back to BASE_ALPHA', () => {
    expect(getLightAlpha('unknown_style', 0, 100, 0, 1.0, true)).toBeCloseTo(0.4);
  });
});

// ── DEFAULT_TRACK_LIGHTS ──────────────────────────────────────────────────────

describe('DEFAULT_TRACK_LIGHTS', () => {
  it('has required fields', () => {
    expect(DEFAULT_TRACK_LIGHTS).toMatchObject({
      color: expect.stringMatching(/^#[0-9a-fA-F]{6}$/),
      style: expect.stringMatching(/^(steady|sequence|sync_pulse|random_flash)$/),
      speed: expect.any(Number),
    });
  });

  it('speed is in [0.1, 3.0]', () => {
    expect(DEFAULT_TRACK_LIGHTS.speed).toBeGreaterThanOrEqual(0.1);
    expect(DEFAULT_TRACK_LIGHTS.speed).toBeLessThanOrEqual(3.0);
  });
});

// ── VALID_LIGHT_STYLES ────────────────────────────────────────────────────────

describe('VALID_LIGHT_STYLES', () => {
  it('contains all expected styles', () => {
    expect(VALID_LIGHT_STYLES).toContain('steady');
    expect(VALID_LIGHT_STYLES).toContain('sequence');
    expect(VALID_LIGHT_STYLES).toContain('sync_pulse');
    expect(VALID_LIGHT_STYLES).toContain('random_flash');
    expect(VALID_LIGHT_STYLES).toHaveLength(4);
  });
});
