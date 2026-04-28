// ============================================================
// File:        rowLayout.test.js
// Path:        client/src/modules/rowLayout.test.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Unit tests for D7c row-start layout logic.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  computeRacersPerRow,
  computeRowLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
  computeMaxRacersDefault,
} from './rowLayout.js';

// ── computeRacersPerRow ────────────────────────────────────────────────────

describe('computeRacersPerRow', () => {
  it('standard 1280px world, 140 world-px track → 8 per row', () => {
    // bsX = 1280/1280 = 1.0; 2*140*1.0/32 = 8.75 → 8
    expect(computeRacersPerRow(140, 1.0, 32)).toBe(8);
  });

  it('large 6000px world, ~1500 world-px track → 20 per row', () => {
    // bsX = 1280/6000; 2*1500*(1280/6000)/32 = 2*1500*0.21333/32 = 640/32 = 20
    const bsX = 1280 / 6000;
    expect(computeRacersPerRow(1500, bsX, 32)).toBe(20);
  });

  it('very narrow track width → at least 1', () => {
    expect(computeRacersPerRow(10, 1.0, 32)).toBe(1);
  });

  it('large world with wide track fits all 20 racers in 1 row', () => {
    // Regression for D7c bug: Weltall-Strecke with 6000px world and wide track
    // should not collapse all racers into 1-per-row
    const bsX = 1280 / 6000;
    const racersPerRow = computeRacersPerRow(1500, bsX, 32);
    expect(racersPerRow).toBeGreaterThan(10);
  });

  it('larger minTargetScreenPx → fewer per row', () => {
    const narrow = computeRacersPerRow(1000, 1.0, 64);
    const wide = computeRacersPerRow(1000, 1.0, 32);
    expect(wide).toBeGreaterThan(narrow);
  });
});

// ── computeRowLayout ───────────────────────────────────────────────────────

describe('computeRowLayout', () => {
  it('8 racers, 8 per row → 1 row', () => {
    const { racersPerRow, totalRows, assignments } = computeRowLayout(8, 8);
    expect(racersPerRow).toBe(8);
    expect(totalRows).toBe(1);
    expect(assignments).toHaveLength(8);
    expect(assignments.every((a) => a.rowIndex === 0)).toBe(true);
  });

  it('20 racers, 8 per row → 3 rows with 8/8/4 distribution', () => {
    const { racersPerRow, totalRows, assignments } = computeRowLayout(20, 8);
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
    const { racersPerRow, totalRows, assignments } = computeRowLayout(1, 8);
    expect(racersPerRow).toBe(8);
    expect(totalRows).toBe(1);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].rowIndex).toBe(0);
    expect(assignments[0].indexInRow).toBe(0);
  });

  it('each racerIndex appears exactly once', () => {
    const { assignments } = computeRowLayout(20, 8);
    const seen = new Set(assignments.map((a) => a.racerIndex));
    expect(seen.size).toBe(20);
    for (let i = 0; i < 20; i++) expect(seen.has(i)).toBe(true);
  });

  it('racersPerRow = 1 → every racer in its own row', () => {
    const { racersPerRow, totalRows } = computeRowLayout(5, 1);
    expect(racersPerRow).toBe(1);
    expect(totalRows).toBe(5);
  });

  it('large geometric width → all 20 fit in 1 row (D7c regression)', () => {
    // Simulate Weltall-Strecke: geometric width gives racersPerRow=20
    const bsX = 1280 / 6000;
    const perRow = computeRacersPerRow(1500, bsX, 32); // 20
    const { totalRows } = computeRowLayout(20, perRow);
    // All 20 fit in 1 row — NOT 20 rows as with the old metadata bug
    expect(totalRows).toBe(1);
  });

  it('indexInRow values within each row form a consecutive 0..n-1 range', () => {
    const { assignments } = computeRowLayout(20, 8);
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
  it('standard oval: 8 per row, rowGapPx=80 → uses full budget', () => {
    // budget = 5000 * 0.3 = 1500; maxRows = floor(1500/80) = 18; total = 18*8 = 144
    const result = computeMaxRacersDefault(5000, 8, 80, 0.3);
    expect(result).toBe(144);
  });

  it('very short track caps to at least 1 row', () => {
    const result = computeMaxRacersDefault(200, 8, 80, 0.3);
    expect(result).toBeGreaterThanOrEqual(8); // at least 1 row × 8 per row
  });

  it('more racersPerRow → more total capacity', () => {
    const narrow = computeMaxRacersDefault(5000, 8, 80, 0.3);
    const wide = computeMaxRacersDefault(5000, 16, 80, 0.3);
    expect(wide).toBeGreaterThan(narrow);
  });

  it('larger maxCapacityFactor → more rows → more racers', () => {
    const small = computeMaxRacersDefault(5000, 8, 80, 0.1);
    const large = computeMaxRacersDefault(5000, 8, 80, 0.5);
    expect(large).toBeGreaterThan(small);
  });

  it('smaller rowGapPx → more rows fit in budget → more racers', () => {
    const tight = computeMaxRacersDefault(5000, 8, 40, 0.3);
    const loose = computeMaxRacersDefault(5000, 8, 80, 0.3);
    expect(tight).toBeGreaterThan(loose);
  });
});
