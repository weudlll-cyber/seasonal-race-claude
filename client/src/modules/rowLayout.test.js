// ============================================================
// File:        rowLayout.test.js
// Path:        client/src/modules/rowLayout.test.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Unit tests for D7c row-start layout logic.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  computeRowLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
  computeMaxRacersDefault,
} from './rowLayout.js';

// ── computeRowLayout ───────────────────────────────────────────────────────

describe('computeRowLayout', () => {
  it('8 racers, 8 per row → 1 row', () => {
    const { racersPerRow, totalRows, assignments } = computeRowLayout(8, 640, 80);
    expect(racersPerRow).toBe(8);
    expect(totalRows).toBe(1);
    expect(assignments).toHaveLength(8);
    expect(assignments.every((a) => a.rowIndex === 0)).toBe(true);
  });

  it('20 racers, 8 per row → 3 rows with 8/8/4 distribution', () => {
    const { racersPerRow, totalRows, assignments } = computeRowLayout(20, 640, 80);
    expect(racersPerRow).toBe(8);
    expect(totalRows).toBe(3);
    expect(assignments).toHaveLength(20);
    const row0 = assignments.filter((a) => a.rowIndex === 0);
    const row1 = assignments.filter((a) => a.rowIndex === 1);
    const row2 = assignments.filter((a) => a.rowIndex === 2);
    expect(row0).toHaveLength(8);
    expect(row1).toHaveLength(8);
    expect(row2).toHaveLength(4);
  });

  it('1 racer → 1 row, 1 racer in row', () => {
    const { racersPerRow, totalRows, assignments } = computeRowLayout(1, 640, 80);
    expect(racersPerRow).toBe(8);
    expect(totalRows).toBe(1);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].rowIndex).toBe(0);
    expect(assignments[0].indexInRow).toBe(0);
  });

  it('each racerIndex appears exactly once', () => {
    const { assignments } = computeRowLayout(20, 640, 80);
    const seen = new Set(assignments.map((a) => a.racerIndex));
    expect(seen.size).toBe(20);
    for (let i = 0; i < 20; i++) expect(seen.has(i)).toBe(true);
  });

  it('pixelsPerRacer wider than track → racersPerRow = 1', () => {
    const { racersPerRow } = computeRowLayout(5, 50, 100);
    expect(racersPerRow).toBe(1);
  });

  it('indexInRow values within each row form a consecutive 0..n-1 range', () => {
    const { assignments } = computeRowLayout(20, 640, 80);
    const rowMap = new Map();
    for (const a of assignments) {
      if (!rowMap.has(a.rowIndex)) rowMap.set(a.rowIndex, []);
      rowMap.get(a.rowIndex).push(a.indexInRow);
    }
    for (const [, indices] of rowMap) {
      indices.sort((a, b) => a - b);
      for (let i = 0; i < indices.length; i++) expect(indices[i]).toBe(i);
    }
  });
});

// ── computeRowPhysicalY ────────────────────────────────────────────────────

describe('computeRowPhysicalY', () => {
  it('single racer in row → physicalY = 0', () => {
    expect(computeRowPhysicalY(0, 1, 0.7)).toBe(0);
  });

  it('two racers in row → symmetric at ±spreadRange', () => {
    expect(computeRowPhysicalY(0, 2, 0.7)).toBeCloseTo(-0.7, 5);
    expect(computeRowPhysicalY(1, 2, 0.7)).toBeCloseTo(0.7, 5);
  });

  it('full row of 8 spans [-spreadRange, +spreadRange]', () => {
    const range = 0.7;
    const ys = Array.from({ length: 8 }, (_, i) => computeRowPhysicalY(i, 8, range));
    expect(ys[0]).toBeCloseTo(-range, 5);
    expect(ys[7]).toBeCloseTo(range, 5);
    // uniform spacing
    const step = ys[1] - ys[0];
    for (let i = 1; i < 8; i++) expect(ys[i] - ys[i - 1]).toBeCloseTo(step, 5);
  });

  it('partial last row of 4 (from 20 racers, 8 per row) spans full [-range, +range]', () => {
    const range = 0.7;
    const ys = Array.from({ length: 4 }, (_, i) => computeRowPhysicalY(i, 4, range));
    expect(ys[0]).toBeCloseTo(-range, 5);
    expect(ys[3]).toBeCloseTo(range, 5);
  });

  it('all values within [-spreadRange, +spreadRange]', () => {
    const range = 0.7;
    for (let n = 1; n <= 10; n++) {
      for (let i = 0; i < n; i++) {
        const y = computeRowPhysicalY(i, n, range);
        expect(y).toBeGreaterThanOrEqual(-range - 1e-9);
        expect(y).toBeLessThanOrEqual(range + 1e-9);
      }
    }
  });
});

// ── computeSpeedBonus ─────────────────────────────────────────────────────

describe('computeSpeedBonus', () => {
  it('row 0 always returns 0 regardless of factor', () => {
    expect(computeSpeedBonus(0, 100, 5000, 1.0)).toBe(0);
    expect(computeSpeedBonus(0, 100, 5000, 0)).toBe(0);
  });

  it('row 1 with factor 1.0 = exact distance compensation', () => {
    const rowGapPx = 100;
    const pathLengthPx = 5000;
    // bonus = rowGapPx / pathLengthPx = 100/5000 = 0.02
    expect(computeSpeedBonus(1, rowGapPx, pathLengthPx, 1.0)).toBeCloseTo(0.02, 6);
  });

  it('row 2 = 2× row 1 bonus', () => {
    const rowGapPx = 100;
    const pathLengthPx = 5000;
    const b1 = computeSpeedBonus(1, rowGapPx, pathLengthPx, 1.0);
    const b2 = computeSpeedBonus(2, rowGapPx, pathLengthPx, 1.0);
    expect(b2).toBeCloseTo(2 * b1, 6);
  });

  it('factor 0 → no compensation for any row', () => {
    expect(computeSpeedBonus(1, 100, 5000, 0)).toBe(0);
    expect(computeSpeedBonus(3, 100, 5000, 0)).toBe(0);
  });

  it('factor 0.5 → half compensation', () => {
    const full = computeSpeedBonus(2, 100, 5000, 1.0);
    const half = computeSpeedBonus(2, 100, 5000, 0.5);
    expect(half).toBeCloseTo(full / 2, 6);
  });

  it('pathLengthPx = 0 → returns 0 (no division by zero)', () => {
    expect(computeSpeedBonus(1, 100, 0, 1.0)).toBe(0);
  });
});

// ── computeMaxRacersDefault ────────────────────────────────────────────────

describe('computeMaxRacersDefault', () => {
  it('standard oval (pathLengthPx=5000, width=640) uses full budget', () => {
    // perRow = floor(640/80) = 8
    // budget = 5000 * 0.3 = 1500
    // maxRows = floor(1500/80) = 18
    // maxRacers = 18 * 8 = 144
    const result = computeMaxRacersDefault(5000, 640, 80, 0.3);
    expect(result).toBe(144);
  });

  it('very short track caps to at least 1 row', () => {
    // budget = 200 * 0.3 = 60, floor(60/80) = 0 → clamped to 1
    const result = computeMaxRacersDefault(200, 640, 80, 0.3);
    expect(result).toBeGreaterThanOrEqual(8); // at least 1 row
  });

  it('wider track with same pixelsPerRacer → more racers per row', () => {
    const narrow = computeMaxRacersDefault(5000, 640, 80, 0.3);
    const wide = computeMaxRacersDefault(5000, 1280, 80, 0.3);
    expect(wide).toBeGreaterThan(narrow);
  });

  it('larger maxCapacityFactor → more rows → more racers', () => {
    const small = computeMaxRacersDefault(5000, 640, 80, 0.1);
    const large = computeMaxRacersDefault(5000, 640, 80, 0.5);
    expect(large).toBeGreaterThan(small);
  });
});
