// ============================================================
// File:        statsHelpers.test.js
// Path:        client/src/modules/statsHelpers.test.js
// Project:     RaceArena
// Created:     2026-06-10
// Description: Contract tests for statsHelpers.js — avg, median, p95, stddev.
//              These helpers were extracted from duplicate implementations in
//              headlessRaceSimulator.js and DiagnoseVerteilung.jsx. Tests cover
//              the sorting contract (internal sort), the p95 index formula, and
//              the bounds-clamping guard.
// ============================================================

import { describe, it, expect } from 'vitest';
import { avg, median, p95, stddev } from './statsHelpers.js';

describe('avg', () => {
  it('returns arithmetic mean of a multi-element array', () => {
    expect(avg([1, 2, 3])).toBe(2);
  });

  it('returns the single value for a one-element array', () => {
    expect(avg([7])).toBe(7);
  });
});

describe('median', () => {
  it('returns the middle element for an odd-length array', () => {
    // Input is intentionally unsorted — median must sort internally.
    expect(median([3, 1, 2])).toBe(2);
  });

  it('returns the average of the two middle elements for an even-length array', () => {
    // Sorted: [1,2,3,4] → (2+3)/2 = 2.5
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('returns the single element for a one-element array', () => {
    expect(median([9])).toBe(9);
  });
});

describe('p95', () => {
  it('returns the 95th-percentile value using Math.ceil formula (N=20)', () => {
    // idx = Math.ceil(20 × 0.95) − 1 = 18 → sorted[18] = 19
    const arr = Array.from({ length: 20 }, (_, i) => i + 1); // [1..20]
    expect(p95(arr)).toBe(19);
  });

  it('sorts internally — unsorted input produces the same result', () => {
    // 10 elements: idx = Math.ceil(10 × 0.95) − 1 = 9 → max = 10
    const arr = [10, 1, 9, 2, 8, 3, 7, 4, 6, 5];
    expect(p95(arr)).toBe(10);
  });

  it('returns the single element for a one-element array (bounds-clamping path)', () => {
    // idx = Math.ceil(1 × 0.95) − 1 = 0; clamped to max(0, min(0, 0)) = 0 → s[0] = 5
    expect(p95([5])).toBe(5);
  });
});

describe('stddev', () => {
  it('returns correct population standard deviation', () => {
    // arr=[2,4,4,4,5,5,7,9], mean=5: variance=4, stddev=2
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9], 5)).toBeCloseTo(2, 5);
  });

  it('returns 0 for a constant array', () => {
    expect(stddev([3, 3, 3], 3)).toBe(0);
  });
});
