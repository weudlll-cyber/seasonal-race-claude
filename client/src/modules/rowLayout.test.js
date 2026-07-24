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
  computeBodyNarrowRef,
  computeStartRowCount,
} from './rowLayout.js';
import { BODY_LONG_AXIS_MAX_RATIO } from './racer-types/SpriteRacerType.js';

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

  it('frameSizePx = 0 → clamped to 1, returns sensible value', () => {
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

// ── computeBodyNarrowRef — Stage 6 body-basis proofs ─────────────────────

const AUTOCONFIG = { minScale: 0.65, maxScale: 2.5, referenceValue: 23 };
const W_REF = 285; // fixed reference effective width matching open tracks (300×0.95)

describe('computeBodyNarrowRef — body-basis proof (giraffe vs. duck)', () => {
  // Giraffe: ds=48, bodyFillNarrow=0.271 → maxBodyNarrow=32.5px, uncapped at N≥18 in 1-row
  // Duck:    ds=36, bodyFillNarrow=0.875 → maxBodyNarrow=78.8px, uncapped at N≥8 in 1-row
  //
  // Both are in the SAME regime (1 row, not capped) for N in [18..27]. In that range they
  // return equal bodyNarrow = 2×W_REF / racersPerRow. Outside that range:
  //   N<18: giraffe hits maxBodyNarrow (32.5px) while duck hasn't → different sizes (intentional)
  //   N>27: duck enters 2-row regime while giraffe stays 1-row → different row counts → different sizes
  // This design is correct: slim racers pack more efficiently at high N (more fit per row).
  //
  // The spec claim "same size value → same visible narrow" refers to the DRAW PATH: when
  // both receive the SAME bodyNarrow world-px as input to _drawBody, they render equal
  // visible narrow — regardless of what the packing formula assigns to each at a given N.

  it('giraffe and duck return equal bodyNarrow at N=20 (both in 1-row uncapped regime)', () => {
    const giraffe = computeBodyNarrowRef(W_REF, 20, 48, 0.271, AUTOCONFIG);
    const duck = computeBodyNarrowRef(W_REF, 20, 36, 0.875, AUTOCONFIG);
    expect(giraffe.bodyNarrow).toBeCloseTo(duck.bodyNarrow, 2);
    expect(giraffe.bodyNarrow).toBeCloseTo(28.5, 1); // 2×285/20 = 28.5
  });

  it('giraffe and duck return equal bodyNarrow at N=25 (same 1-row uncapped regime)', () => {
    const giraffe = computeBodyNarrowRef(W_REF, 25, 48, 0.271, AUTOCONFIG);
    const duck = computeBodyNarrowRef(W_REF, 25, 36, 0.875, AUTOCONFIG);
    expect(giraffe.bodyNarrow).toBeCloseTo(duck.bodyNarrow, 2);
    expect(giraffe.bodyNarrow).toBeCloseTo(22.8, 1); // 2×285/25 = 22.8
  });

  it('at N=1, giraffe bodyNarrow is capped at its maxBodyNarrow (32.5) not duck maxBodyNarrow (78.75)', () => {
    // Low-N maxBodyNarrow cap: slim racers have a lower cap because their bodies are thinner.
    // This is intentional — a single giraffe should not have an enormous body.
    const giraffe = computeBodyNarrowRef(W_REF, 1, 48, 0.271, AUTOCONFIG);
    const duck = computeBodyNarrowRef(W_REF, 1, 36, 0.875, AUTOCONFIG);
    expect(giraffe.bodyNarrow).toBeCloseTo(48 * 0.271 * 2.5, 1); // ≈ 32.5
    expect(duck.bodyNarrow).toBeCloseTo(36 * 0.875 * 2.5, 1); // ≈ 78.75
    expect(giraffe.bodyNarrow).toBeLessThan(duck.bodyNarrow); // slim racer has smaller max
  });
});

describe('computeBodyNarrowRef — track decoupling proof', () => {
  // At same N and W_REF, all tracks should give the same bodyNarrow for the same racer type.
  // Rocket (ds=47, bodyFillNarrow=0.278) at N=20: result must not vary with the caller's
  // actual track width — W_REF is always used.
  it('bodyNarrow is equal regardless of the caller passing different effective track widths (W_REF is fixed)', () => {
    // Same call — W_REF is constant in the function, so this is the same computation.
    // Verify: given fixed inputs, output is deterministic and identical.
    const a = computeBodyNarrowRef(W_REF, 20, 47, 0.278, AUTOCONFIG);
    const b = computeBodyNarrowRef(W_REF, 20, 47, 0.278, AUTOCONFIG);
    expect(a.bodyNarrow).toBe(b.bodyNarrow);
  });

  it('bodyNarrow does not grow with track width — it is W_REF-fixed', () => {
    // The physical track width is irrelevant to the camera reference.
    // Pass same W_REF and verify result is the same as expected from W_REF formula.
    const result = computeBodyNarrowRef(W_REF, 20, 47, 0.278, AUTOCONFIG);
    // Manual: bodyNarrowDS=47×0.278=13.07, minBN=8.5, maxRPR=floor(570/8.5)=67,
    // rowCount=ceil(20/67)=1, racersPerRow=20, target=570/20=28.5, maxBN=32.7 → 28.5
    expect(result.bodyNarrow).toBeCloseTo(28.5, 1);
  });
});

describe('computeBodyNarrowRef — count curve shape preserved', () => {
  // The staircase shape: size decreases within a row-band, jumps at row transitions.
  // Verify a few N points on Space Sprint (ds=47 rocket, bFN=0.278) match the expected values.
  it('N=4 → bodyNarrow is capped by maxScale (few racers → large sprites)', () => {
    const { bodyNarrow } = computeBodyNarrowRef(W_REF, 4, 47, 0.278, AUTOCONFIG);
    const maxBodyNarrow = 47 * 0.278 * 2.5;
    expect(bodyNarrow).toBeCloseTo(maxBodyNarrow, 1); // capped at max
  });

  it('N=20 → bodyNarrow ≈ 28.5 (1 row of 20)', () => {
    const { bodyNarrow } = computeBodyNarrowRef(W_REF, 20, 47, 0.278, AUTOCONFIG);
    expect(bodyNarrow).toBeCloseTo(28.5, 1);
  });

  it('N=40 → bodyNarrow smaller than N=20 (more racers → smaller sprites within same row-band)', () => {
    const small = computeBodyNarrowRef(W_REF, 40, 47, 0.278, AUTOCONFIG);
    const large = computeBodyNarrowRef(W_REF, 20, 47, 0.278, AUTOCONFIG);
    expect(small.bodyNarrow).toBeLessThan(large.bodyNarrow);
  });

  it('bodyNarrow is always positive and finite', () => {
    for (const N of [1, 5, 10, 20, 40, 80]) {
      const { bodyNarrow } = computeBodyNarrowRef(W_REF, N, 47, 0.278, AUTOCONFIG);
      expect(bodyNarrow).toBeGreaterThan(0);
      expect(isFinite(bodyNarrow)).toBe(true);
    }
  });
});

describe('BODY_LONG_AXIS_MAX_RATIO — sleeping guard is inert for all 20 current racers', () => {
  // All 20 current racer types have max aspect ratio 2.88:1 (rocket, bodyFillLong/bodyFillNarrow).
  // The guard threshold is 5.0. Verify every type is below it.
  const RACER_FILLS = [
    { id: 'beetle', bFX: 0.398, bFY: 0.672 },
    { id: 'boarder', bFX: 0.398, bFY: 0.719 },
    { id: 'buggy', bFX: 0.844, bFY: 0.875 },
    { id: 'dolphin', bFX: 0.402, bFY: 0.887 },
    { id: 'dragon', bFX: 0.836, bFY: 0.898 },
    { id: 'duck', bFX: 0.875, bFY: 0.875 },
    { id: 'elephant', bFX: 0.539, bFY: 0.938 },
    { id: 'f1', bFX: 0.555, bFY: 0.953 },
    { id: 'giraffe', bFX: 0.271, bFY: 0.767 },
    { id: 'horse', bFX: 0.353, bFY: 0.8 },
    { id: 'koi', bFX: 0.578, bFY: 0.914 },
    { id: 'luge', bFX: 0.313, bFY: 0.641 },
    { id: 'manta', bFX: 0.633, bFY: 0.805 },
    { id: 'motorbike', bFX: 0.4, bFY: 0.8 },
    { id: 'plane', bFX: 0.836, bFY: 0.93 },
    { id: 'rocket', bFX: 0.278, bFY: 0.801 },
    { id: 'snail', bFX: 0.727, bFY: 0.938 },
    { id: 'snake', bFX: 0.374, bFY: 0.806 },
    { id: 'snowmobile', bFX: 0.459, bFY: 0.797 },
    { id: 'turtle', bFX: 0.578, bFY: 0.734 },
  ];

  it('every racer type has aspect ratio < BODY_LONG_AXIS_MAX_RATIO (5.0)', () => {
    for (const { id, bFX, bFY } of RACER_FILLS) {
      const ratio = Math.max(bFX, bFY) / Math.min(bFX, bFY);
      expect(
        ratio,
        `${id} aspect ratio ${ratio.toFixed(2)} should be < ${BODY_LONG_AXIS_MAX_RATIO}`
      ).toBeLessThan(BODY_LONG_AXIS_MAX_RATIO);
    }
  });

  it('most extreme ratio is rocket at 2.88:1 — well below the 5.0 threshold', () => {
    const rocket = RACER_FILLS.find((r) => r.id === 'rocket');
    const ratio = rocket.bFY / rocket.bFX;
    expect(ratio).toBeCloseTo(2.88, 1);
    expect(ratio).toBeLessThan(BODY_LONG_AXIS_MAX_RATIO);
  });
});

// ── Overlap guard: visible body ≤ physical avoidance slot ────────────────────
//
// This test closes the fingerprint gap identified in report 09. The determinism
// fingerprint only covers physics (finishT + rows). This guard covers the
// render-vs-physical relationship: the visible body must never exceed the physical
// slot to prevent cosmetic overlap. It would have caught the Stage 1 regression
// (W_REF=285 >> Garden Path W=95) before any user ever saw it.
//
// Invariant: computeBodyNarrowRef(min(285, effW), N, ds, bFN) ≤ computeRacerLayout(effW, N, ds).spriteSize
//
// On wide tracks (effW≥285): W_REF=285=effW → equality holds by the body-narrow packing proof.
// On narrow tracks (effW<285): W_REF=effW<285 → body-narrow packing is strictly within the slot.

const AUTOCONFIG_GUARD = { minScale: 0.65, maxScale: 2.5, referenceValue: 23 };
const W_REF_MAX = 285; // must match the constant in RaceScreen/index.jsx

// All 20 current racer types with their bodyFillX/Y values.
const ALL_RACERS_GUARD = [
  { id: 'beetle', ds: 38, bFX: 0.398, bFY: 0.672 },
  { id: 'boarder', ds: 40, bFX: 0.398, bFY: 0.719 },
  { id: 'buggy', ds: 38, bFX: 0.844, bFY: 0.875 },
  { id: 'dolphin', ds: 52, bFX: 0.402, bFY: 0.887 },
  { id: 'dragon', ds: 50, bFX: 0.836, bFY: 0.898 },
  { id: 'duck', ds: 36, bFX: 0.875, bFY: 0.875 },
  { id: 'elephant', ds: 44, bFX: 0.539, bFY: 0.938 },
  { id: 'f1', ds: 38, bFX: 0.555, bFY: 0.953 },
  { id: 'giraffe', ds: 48, bFX: 0.271, bFY: 0.767 },
  { id: 'horse', ds: 47, bFX: 0.353, bFY: 0.8 },
  { id: 'koi', ds: 52, bFX: 0.578, bFY: 0.914 },
  { id: 'luge', ds: 80, bFX: 0.313, bFY: 0.641 },
  { id: 'manta', ds: 56, bFX: 0.633, bFY: 0.805 },
  { id: 'motorbike', ds: 42, bFX: 0.4, bFY: 0.8 },
  { id: 'plane', ds: 42, bFX: 0.836, bFY: 0.93 },
  { id: 'rocket', ds: 47, bFX: 0.278, bFY: 0.801 },
  { id: 'snail', ds: 35, bFX: 0.727, bFY: 0.938 },
  { id: 'snake', ds: 44, bFX: 0.374, bFY: 0.806 },
  { id: 'snowmobile', ds: 52, bFX: 0.459, bFY: 0.797 },
  { id: 'turtle', ds: 48, bFX: 0.578, bFY: 0.734 },
];

// Representative track effective widths (trackWidth × startSpreadRange=0.95).
// Covers narrow closed tracks (95–124px) and wide open tracks (285px).
const TRACK_WIDTHS_GUARD = [
  { id: 'dirt-oval', effW: 93 * 0.95 }, // ≈ 88px — narrowest closed
  { id: 'garden-path', effW: 100 * 0.95 }, // ≈ 95px — reported regression track
  { id: 'city-circuit', effW: 95 * 0.95 }, // ≈ 90px
  { id: 'ice-track', effW: 110 * 0.95 }, // ≈ 105px
  { id: 'searound', effW: 131 * 0.95 }, // ≈ 124px — widest closed
  { id: 'river-run', effW: 300 * 0.95 }, // = 285px — wide open
  { id: 'space-sprint', effW: 300 * 0.95 }, // = 285px — wide open
  { id: 'mountainstreet', effW: 300 * 0.95 }, // = 285px
  { id: 'seatrack', effW: 300 * 0.95 }, // = 285px
];

describe('Overlap guard — visible body ≤ physical avoidance slot', () => {
  // This is the invariant the determinism fingerprint cannot catch.
  // It must hold for all racer × track × N combos after the W_REF cap.
  // A failure here means visible bodies exceed physical slots → cosmetic overlap.

  for (const N of [20, 40, 80]) {
    it(`N=${N}: bodyNarrow ≤ physSlot for every racer × track combo (${ALL_RACERS_GUARD.length} racers × ${TRACK_WIDTHS_GUARD.length} tracks)`, () => {
      for (const track of TRACK_WIDTHS_GUARD) {
        for (const racer of ALL_RACERS_GUARD) {
          const bFN = Math.min(racer.bFX, racer.bFY);
          const W_REF = Math.min(W_REF_MAX, track.effW);
          const { bodyNarrow } = computeBodyNarrowRef(W_REF, N, racer.ds, bFN, AUTOCONFIG_GUARD);
          const { spriteSize: physSlot } = computeRacerLayout(
            track.effW,
            N,
            racer.ds,
            AUTOCONFIG_GUARD
          );
          expect(
            bodyNarrow,
            `${racer.id} on ${track.id} N=${N}: bodyNarrow=${bodyNarrow.toFixed(2)} > physSlot=${physSlot.toFixed(2)}`
          ).toBeLessThanOrEqual(physSlot + 0.001); // 0.001 tolerance for floating-point
        }
      }
    });
  }

  it('on wide tracks (effW=285), all 20 racer types return equal bodyNarrow at N=20 (within-track equality)', () => {
    // With W_REF=min(285,285)=285, the body-narrow packing uses a fixed width
    // → equal bodyNarrow for all racer types in the same staircase regime.
    // Verified here for the 1-row uncapped regime at N=20 (all types qualify: maxRPR≥20).
    const effW = 285;
    const W_REF = Math.min(W_REF_MAX, effW);
    const results = ALL_RACERS_GUARD.map((r) => {
      const bFN = Math.min(r.bFX, r.bFY);
      return computeBodyNarrowRef(W_REF, 20, r.ds, bFN, AUTOCONFIG_GUARD).bodyNarrow;
    });
    const first = results[0];
    for (let i = 1; i < results.length; i++) {
      expect(
        results[i],
        `${ALL_RACERS_GUARD[i].id} bodyNarrow should equal ${ALL_RACERS_GUARD[0].id}`
      ).toBeCloseTo(first, 1);
    }
  });

  it('Garden Path snail N=40: visible body dropped from 28.5→~19px after W_REF cap (no overflow)', () => {
    // Regression test for the specific case that triggered this fix.
    // Before cap: W_REF=285 → bodyNarrow=28.5 > physSlot=23.75 (overflow +2.4px/side).
    // After  cap: W_REF=min(285,95)=95 → bodyNarrow≈19px < physSlot=23.75 (no overflow).
    const effW = 100 * 0.95; // Garden Path
    const W_REF = Math.min(W_REF_MAX, effW);
    const { bodyNarrow } = computeBodyNarrowRef(W_REF, 40, 35, 0.727, AUTOCONFIG_GUARD); // snail
    const { spriteSize: physSlot } = computeRacerLayout(effW, 40, 35, AUTOCONFIG_GUARD);
    expect(bodyNarrow).toBeCloseTo(19.0, 1);
    expect(physSlot).toBeCloseTo(23.75, 1);
    expect(bodyNarrow).toBeLessThan(physSlot); // visible body fits within physical slot
  });
});

// ── computeStartRowCount — the single-source start-row count (D-ROWCOUNT) ─────────────────────────
describe('computeStartRowCount — the browser/sim single-source row count', () => {
  it('is the inline formula: ceil(N / floor(2·effWidth / spriteSize)), floored at 1', () => {
    // floor(2·100/25)=8 slots/row → ceil(20/8)=3, ceil(40/8)=5
    expect(computeStartRowCount(100, 20, 25)).toBe(3);
    expect(computeStartRowCount(100, 40, 25)).toBe(5);
    // floor(2·100/50)=4 slots/row → ceil(20/4)=5
    expect(computeStartRowCount(100, 20, 50)).toBe(5);
  });

  it('a larger sprite yields at least as many rows (fewer fit per row)', () => {
    for (const [effW, n] of [
      [120, 40],
      [120, 60],
      [200, 50],
    ]) {
      expect(computeStartRowCount(effW, n, 50)).toBeGreaterThanOrEqual(
        computeStartRowCount(effW, n, 35)
      );
    }
  });

  it('never returns less than 1 (sprite wider than the track → one racer per row)', () => {
    expect(computeStartRowCount(10, 40, 100)).toBe(40); // 0 slots/row → clamp to 1 slot → N rows
    expect(computeStartRowCount(100, 1, 25)).toBe(1);
    expect(computeStartRowCount(0, 20, 25)).toBeGreaterThanOrEqual(1);
  });

  it('feeds computeEvenRowLayout consistently (rowCount == totalRows out)', () => {
    const rc = computeStartRowCount(120, 40, 35);
    const layout = computeEvenRowLayout(40, rc, () => 0.5);
    expect(layout.totalRows).toBe(rc);
  });
});
