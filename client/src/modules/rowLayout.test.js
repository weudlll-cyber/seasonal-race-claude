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
  computeEvenRowLayout,
  computeRacerLayout,
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
    expect(computeRowPhysicalY(0, 1, 0.7)).toBe(0); // intentional test value, not current default (0.95 since D7c-Phase4)
  });

  it('two racers in row → symmetric at ±spreadRange', () => {
    expect(computeRowPhysicalY(0, 2, 0.7)).toBeCloseTo(-0.7, 5); // intentional test value, not current default (0.95 since D7c-Phase4)
    expect(computeRowPhysicalY(1, 2, 0.7)).toBeCloseTo(0.7, 5);
  });

  it('full row of 8 spans [-spreadRange, +spreadRange]', () => {
    const range = 0.7; // intentional test value, not current default (0.95 since D7c-Phase4)
    const ys = Array.from({ length: 8 }, (_, i) => computeRowPhysicalY(i, 8, range));
    expect(ys[0]).toBeCloseTo(-range, 5);
    expect(ys[7]).toBeCloseTo(range, 5);
    // uniform spacing
    const step = ys[1] - ys[0];
    for (let i = 1; i < 8; i++) expect(ys[i] - ys[i - 1]).toBeCloseTo(step, 5);
  });

  it('partial last row of 4 (from 20 racers, 8 per row) spans full [-range, +range]', () => {
    const range = 0.7; // intentional test value, not current default (0.95 since D7c-Phase4)
    const ys = Array.from({ length: 4 }, (_, i) => computeRowPhysicalY(i, 4, range));
    expect(ys[0]).toBeCloseTo(-range, 5);
    expect(ys[3]).toBeCloseTo(range, 5);
  });

  it('all values within [-spreadRange, +spreadRange]', () => {
    const range = 0.7; // intentional test value, not current default (0.95 since D7c-Phase4)
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
// All tests supply finishT, isOpen, totalRows (new required params from Phase 1B fix).
// Closed-track tests use finishT=1.0 so the formula equals the legacy value N×tOffset,
// making these both backwards-compat regressions and correctness checks.

describe('computeSpeedBonus — closed track (finishT = 1.0)', () => {
  it('row 0 always returns 0 regardless of factor', () => {
    expect(computeSpeedBonus(0, 100, 5000, 1.0, 1.0, false, 1)).toBe(0);
    expect(computeSpeedBonus(0, 100, 5000, 0, 1.0, false, 1)).toBe(0);
  });

  it('row 1 with factor 1.0 and finishT=1.0: bonus = rowGapPx / pathLengthPx', () => {
    const rowGapPx = 100;
    const pathLengthPx = 5000;
    // finishT=1.0 → row0Distance=1.0 → bonus = 100/5000 = 0.02
    expect(computeSpeedBonus(1, rowGapPx, pathLengthPx, 1.0, 1.0, false, 1)).toBeCloseTo(0.02, 6);
  });

  it('row 2 = 2× row 1 bonus', () => {
    const rowGapPx = 100;
    const pathLengthPx = 5000;
    const b1 = computeSpeedBonus(1, rowGapPx, pathLengthPx, 1.0, 1.0, false, 1);
    const b2 = computeSpeedBonus(2, rowGapPx, pathLengthPx, 1.0, 1.0, false, 1);
    expect(b2).toBeCloseTo(2 * b1, 6);
  });

  it('factor 0 → no compensation for any row', () => {
    expect(computeSpeedBonus(1, 100, 5000, 0, 1.0, false, 1)).toBe(0);
    expect(computeSpeedBonus(3, 100, 5000, 0, 1.0, false, 1)).toBe(0);
  });

  it('factor 0.5 → half compensation', () => {
    const full = computeSpeedBonus(2, 100, 5000, 1.0, 1.0, false, 1);
    const half = computeSpeedBonus(2, 100, 5000, 0.5, 1.0, false, 1);
    expect(half).toBeCloseTo(full / 2, 6);
  });

  it('pathLengthPx = 0 → returns 0 (no division by zero)', () => {
    expect(computeSpeedBonus(1, 100, 0, 1.0, 1.0, false, 1)).toBe(0);
  });
});

// ── computeSpeedBonus — finite checks (HIGH auflage) ──────────────────────

describe('computeSpeedBonus — finite checks', () => {
  it('NaN in rowGapPx → returns 0', () => {
    expect(computeSpeedBonus(1, NaN, 5000, 1.0, 1.0, false, 1)).toBe(0);
  });
  it('Infinity in pathLengthPx → returns 0', () => {
    expect(computeSpeedBonus(1, 100, Infinity, 1.0, 1.0, false, 1)).toBe(0);
  });
  it('NaN in finishT → returns 0', () => {
    expect(computeSpeedBonus(1, 100, 5000, 1.0, NaN, false, 1)).toBe(0);
  });
  it('Infinity in speedBonusFactor → returns 0', () => {
    expect(computeSpeedBonus(1, 100, 5000, Infinity, 1.0, false, 1)).toBe(0);
  });
  it('NaN in totalRows → returns 0', () => {
    expect(computeSpeedBonus(1, 100, 5000, 1.0, 1.0, false, NaN)).toBe(0);
  });
});

// ── computeSpeedBonus — open track formula (HIGH auflage) ─────────────────

describe('computeSpeedBonus — open track formula', () => {
  it('standard open track: bonus = N × tOffset / row0Distance (Weltall numbers)', () => {
    // Weltall: pathLen=15986, rowGap=75 (50px×1.5), finishT=0.95, totalRows=2
    const rowGapPx = 75,
      pathLengthPx = 15986,
      finishT = 0.95,
      totalRows = 2;
    const tOffset = rowGapPx / pathLengthPx;
    const row0Distance = finishT - totalRows * tOffset;
    const bonus1 = computeSpeedBonus(1, rowGapPx, pathLengthPx, 1.0, finishT, true, totalRows);
    expect(bonus1).toBeCloseTo(tOffset / row0Distance, 8);
    expect(bonus1).toBeGreaterThan(tOffset); // exceeds old-formula value since row0Distance < 1
  });

  it('open track: row0Distance < EPSILON → returns 0 (epsilon guard)', () => {
    // tOffset = 10/100 = 0.1; totalRows=3 → assemblyArea = 0.3
    // finishT barely above 0.3 → row0Distance ≈ 1e-10 < EPSILON (1e-9)
    const finishT = 0.3 + 1e-10;
    expect(computeSpeedBonus(1, 10, 100, 1.0, finishT, true, 3)).toBe(0);
  });

  it('open vs closed: same geometry yields different bonus values when finishT < 1', () => {
    const rowGapPx = 60,
      pathLengthPx = 6000,
      finishT = 0.95,
      totalRows = 3;
    const tOffset = rowGapPx / pathLengthPx;
    const bonusClosed = computeSpeedBonus(
      1,
      rowGapPx,
      pathLengthPx,
      1.0,
      finishT,
      false,
      totalRows
    );
    const bonusOpen = computeSpeedBonus(1, rowGapPx, pathLengthPx, 1.0, finishT, true, totalRows);
    // closed: row0Distance = finishT = 0.95
    expect(bonusClosed).toBeCloseTo(tOffset / finishT, 8);
    // open: row0Distance = finishT - totalRows*tOffset < finishT → larger bonus
    const row0Dist = finishT - totalRows * tOffset;
    expect(bonusOpen).toBeCloseTo(tOffset / row0Dist, 8);
    expect(bonusOpen).toBeGreaterThan(bonusClosed);
  });
});

// ── computeSpeedBonus — correctness properties (MEDIUM auflagen) ──────────

describe('computeSpeedBonus — correctness properties', () => {
  it('monotonie: higher rowIndex → weakly larger bonus (closed, multiple finishT)', () => {
    for (const finishT of [0.5, 1.0, 2.0, 5.0]) {
      let prev = 0;
      for (let N = 0; N <= 5; N++) {
        const bonus = computeSpeedBonus(N, 100, 5000, 1.0, finishT, false, 1);
        expect(bonus).toBeGreaterThanOrEqual(prev);
        prev = bonus;
      }
    }
  });

  it('skalierungs-invarianz closed: bonus = N × tOffset / finishT for finishT = 1, 2, 5, 10', () => {
    const rowGapPx = 100,
      pathLengthPx = 5000,
      N = 2;
    const tOffset = rowGapPx / pathLengthPx;
    for (const finishT of [1, 2, 5, 10]) {
      const bonus = computeSpeedBonus(N, rowGapPx, pathLengthPx, 1.0, finishT, false, 1);
      expect(bonus).toBeCloseTo((N * tOffset) / finishT, 8);
    }
  });

  it('finishT=1.0 closed: new formula equals legacy formula N×tOffset (backward compat)', () => {
    const rowGapPx = 100,
      pathLengthPx = 5000,
      N = 2;
    const legacy = (N * rowGapPx) / pathLengthPx;
    expect(computeSpeedBonus(N, rowGapPx, pathLengthPx, 1.0, 1.0, false, 1)).toBeCloseTo(legacy, 8);
  });

  it('finishT=2.0 closed: new formula gives half of legacy', () => {
    const rowGapPx = 100,
      pathLengthPx = 5000,
      N = 2;
    const legacy = (N * rowGapPx) / pathLengthPx;
    expect(computeSpeedBonus(N, rowGapPx, pathLengthPx, 1.0, 2.0, false, 1)).toBeCloseTo(
      legacy / 2,
      8
    );
  });

  it('finishT=5.0 closed: new formula gives one-fifth of legacy', () => {
    const rowGapPx = 100,
      pathLengthPx = 5000,
      N = 2;
    const legacy = (N * rowGapPx) / pathLengthPx;
    expect(computeSpeedBonus(N, rowGapPx, pathLengthPx, 1.0, 5.0, false, 1)).toBeCloseTo(
      legacy / 5,
      8
    );
  });

  it('finishT=10.0 closed: new formula gives one-tenth of legacy', () => {
    const rowGapPx = 100,
      pathLengthPx = 5000,
      N = 2;
    const legacy = (N * rowGapPx) / pathLengthPx;
    expect(computeSpeedBonus(N, rowGapPx, pathLengthPx, 1.0, 10.0, false, 1)).toBeCloseTo(
      legacy / 10,
      8
    );
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

// ── computeEvenRowLayout ───────────────────────────────────────────────────

describe('computeEvenRowLayout', () => {
  it('70 racers, 3 rows → 24+23+23 distribution', () => {
    const { racersPerRow, totalRows, assignments } = computeEvenRowLayout(70, 3);
    expect(totalRows).toBe(3);
    expect(racersPerRow).toBe(24); // ceil(70/3)
    const sizes = [0, 1, 2].map((r) => assignments.filter((a) => a.rowIndex === r).length);
    expect(sizes[0]).toBe(24);
    expect(sizes[1]).toBe(23);
    expect(sizes[2]).toBe(23);
    expect(assignments).toHaveLength(70);
  });

  it('40 racers, 2 rows → 20+20', () => {
    const { racersPerRow, totalRows, assignments } = computeEvenRowLayout(40, 2);
    expect(totalRows).toBe(2);
    expect(racersPerRow).toBe(20);
    const sizes = [0, 1].map((r) => assignments.filter((a) => a.rowIndex === r).length);
    expect(sizes[0]).toBe(20);
    expect(sizes[1]).toBe(20);
  });

  it('100 racers, 4 rows → 25+25+25+25', () => {
    const { totalRows, assignments } = computeEvenRowLayout(100, 4);
    expect(totalRows).toBe(4);
    const sizes = [0, 1, 2, 3].map((r) => assignments.filter((a) => a.rowIndex === r).length);
    expect(sizes).toEqual([25, 25, 25, 25]);
  });

  it('each racerIndex appears exactly once', () => {
    const { assignments } = computeEvenRowLayout(70, 3);
    const seen = new Set(assignments.map((a) => a.racerIndex));
    expect(seen.size).toBe(70);
    for (let i = 0; i < 70; i++) expect(seen.has(i)).toBe(true);
  });

  it('indexInRow values within each row form consecutive 0..n-1 range', () => {
    const { assignments } = computeEvenRowLayout(70, 3);
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

  it('1 row → all racers in row 0', () => {
    const { totalRows, assignments } = computeEvenRowLayout(10, 1);
    expect(totalRows).toBe(1);
    expect(assignments.every((a) => a.rowIndex === 0)).toBe(true);
  });

  it('rowCount = 0 is clamped to 1', () => {
    const { totalRows } = computeEvenRowLayout(5, 0);
    expect(totalRows).toBe(1);
  });

  it('total racer count preserved', () => {
    for (const [n, r] of [
      [9, 1],
      [21, 1],
      [50, 2],
      [70, 3],
      [100, 4],
    ]) {
      const { assignments } = computeEvenRowLayout(n, r);
      expect(assignments).toHaveLength(n);
    }
  });
});

// ── computeRacerLayout ─────────────────────────────────────────────────────

describe('computeRacerLayout', () => {
  const cfg = { minScale: 0.65, maxScale: 2.5 };

  it('Space Sprint (effectiveWidth≈426.55, dragon displaySize=50): 70 racers → 3 rows, rpr=24', () => {
    // minSprite=32.5, maxRPRatMin=floor(853.1/32.5)=26, minRows=ceil(70/26)=3
    // rpr=ceil(70/3)=24, targetSprite=853.1/24≈35.5
    const { rowCount, racersPerRow, spriteSize, layout } = computeRacerLayout(426.55, 70, 50, cfg);
    expect(rowCount).toBe(3);
    expect(racersPerRow).toBe(24);
    expect(spriteSize).toBeCloseTo((2 * 426.55) / 24, 2);
    expect(spriteSize).toBeLessThanOrEqual(50 * 2.5);
    expect(layout).toEqual([24, 23, 23]);
  });

  it('40 racers → 2 rows, layout [20, 20]', () => {
    // minRows=ceil(40/26)=2, rpr=ceil(40/2)=20, sprite=853.1/20≈42.66
    const { rowCount, racersPerRow, layout } = computeRacerLayout(426.55, 40, 50, cfg);
    expect(rowCount).toBe(2);
    expect(racersPerRow).toBe(20);
    expect(layout).toEqual([20, 20]);
  });

  it('100 racers → 4 rows, layout [25,25,25,25]', () => {
    const { rowCount, layout } = computeRacerLayout(426.55, 100, 50, cfg);
    expect(rowCount).toBe(4);
    expect(layout).toEqual([25, 25, 25, 25]);
  });

  it('few racers (≤ maxRPRatMin) → 1 row, spriteSize capped at maxScale', () => {
    // 9 racers, minRPRatMin=26 → 1 row; targetSprite=853.1/9≈94.8 < maxSprite=125
    const { rowCount, spriteSize } = computeRacerLayout(426.55, 9, 50, cfg);
    expect(rowCount).toBe(1);
    expect(spriteSize).toBeCloseTo((2 * 426.55) / 9, 1);
    expect(spriteSize).toBeLessThanOrEqual(50 * 2.5);
  });

  it('spriteSize never exceeds displaySize × maxScale', () => {
    const { spriteSize } = computeRacerLayout(10000, 1, 50, cfg);
    expect(spriteSize).toBeLessThanOrEqual(50 * 2.5 + 0.001);
  });

  it('spriteSize is always at least as large as displaySize × minScale', () => {
    // The back-computed sprite from an even layout is always ≥ minSprite
    // (we used minSprite to compute minRows → target sprite fills more space)
    const { spriteSize } = computeRacerLayout(426.55, 70, 50, cfg);
    expect(spriteSize).toBeGreaterThanOrEqual(50 * 0.65 - 0.001);
  });

  it('layout sums to nRacers', () => {
    for (const n of [9, 21, 40, 50, 70, 100]) {
      const { layout } = computeRacerLayout(426.55, n, 50, cfg);
      expect(layout.reduce((s, v) => s + v, 0)).toBe(n);
    }
  });

  it('nRacers=0 → returns rowCount=1 without throwing', () => {
    const { rowCount } = computeRacerLayout(426.55, 0, 50, cfg);
    expect(rowCount).toBe(1);
  });

  it('wider track → larger spriteSize (more room per row)', () => {
    const narrow = computeRacerLayout(200, 40, 50, cfg);
    const wide = computeRacerLayout(500, 40, 50, cfg);
    expect(wide.spriteSize).toBeGreaterThan(narrow.spriteSize);
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
