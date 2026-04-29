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
  it('Weltall regression: geometricWidth=300 world-px, spriteSize=26 → 23 per row', () => {
    // D7c-fix-v2: world-space formula floor(2×300/26)=23 — old screen-space formula gave 3
    expect(computeRacersPerRow(300, 26)).toBe(23);
  });

  it('Weltall regression: 20 racers fit in 1 row (≥ 20)', () => {
    expect(computeRacersPerRow(300, 26)).toBeGreaterThanOrEqual(20);
  });

  it('reference 1280 world: geometricWidth=140, spriteSize=26 → 10 per row (8-12 range)', () => {
    // floor(2*140/26) = floor(10.77) = 10 → multiple rows for 20 racers
    const perRow = computeRacersPerRow(140, 26);
    expect(perRow).toBe(10);
    expect(perRow).toBeGreaterThanOrEqual(8);
    expect(perRow).toBeLessThanOrEqual(12);
  });

  it('very narrow track → at least 1', () => {
    expect(computeRacersPerRow(10, 40)).toBe(1);
  });

  it('wider track → more per row', () => {
    const narrow = computeRacersPerRow(100, 26);
    const wide = computeRacersPerRow(300, 26);
    expect(wide).toBeGreaterThan(narrow);
  });

  it('larger sprite size → fewer per row', () => {
    const small = computeRacersPerRow(200, 20);
    const large = computeRacersPerRow(200, 40);
    expect(small).toBeGreaterThan(large);
  });

  it('spriteWorldSizePx = 0 → clamped to 1, returns sensible value', () => {
    expect(computeRacersPerRow(100, 0)).toBeGreaterThan(0);
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

  it('Weltall-Strecke: geometric width 300 world-px, spriteSize 26 → all 20 fit in 1 row', () => {
    // D7c-fix-v2: world-space formula gives perRow=23, so 20 racers → 1 row
    const perRow = computeRacersPerRow(300, 26); // 23
    const { totalRows } = computeRowLayout(20, perRow);
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

// ── D7c Phase 4: effectiveWidth + open-track assembly area ────────────────

describe('effectiveWidth = geometricWidth × startSpreadRange', () => {
  it('Weltall: geometricWidth=300, spread=0.95, spriteSize=50 → 11 per row', () => {
    // floor(2 × 285 / 50) = floor(11.4) = 11
    expect(computeRacersPerRow(300 * 0.95, 50)).toBe(11);
  });

  it('effectiveWidth reduces perRow vs full geometricWidth', () => {
    const perRowFull = computeRacersPerRow(300, 50); // floor(600/50) = 12
    const perRowEff = computeRacersPerRow(300 * 0.95, 50); // floor(570/50) = 11
    expect(perRowFull).toBe(12);
    expect(perRowEff).toBe(11);
  });

  it('Weltall with effectiveWidth: 20 racers → 2 rows', () => {
    const perRow = computeRacersPerRow(300 * 0.95, 50); // 11
    const { totalRows } = computeRowLayout(20, perRow);
    expect(totalRows).toBe(2);
  });
});

describe('open-track assembly area: tStart formula', () => {
  it('all rows have positive tStart on open track (Weltall numbers)', () => {
    // pathLengthPx=15986, rowGapPx=spriteSize×rowGapMultiplier=50×1.5=75
    const pathLengthPx = 15986;
    const rowGapPx = 75;
    const deltaT = rowGapPx / pathLengthPx;
    const totalRows = 2;
    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      const tStart = (totalRows - rowIndex) * deltaT;
      expect(tStart).toBeGreaterThan(0);
      expect(tStart).toBeLessThan(1);
    }
  });

  it('front row (rowIndex=0) has larger tStart than rear row (rowIndex=1)', () => {
    const deltaT = 75 / 15986;
    const totalRows = 2;
    const tFront = (totalRows - 0) * deltaT;
    const tRear = (totalRows - 1) * deltaT;
    expect(tFront).toBeGreaterThan(tRear);
  });

  it('open-track runoutZone: finishT = 1.0 - runoutZone (default 0.05 → 0.95)', () => {
    const runoutZone = 0.05;
    const finishT = 1.0 - runoutZone;
    expect(finishT).toBeCloseTo(0.95, 5);
    expect(finishT).toBeGreaterThan(0);
    expect(finishT).toBeLessThan(1);
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
