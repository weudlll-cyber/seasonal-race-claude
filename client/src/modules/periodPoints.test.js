// PERIOD-EVALUATION-1: the points rule — off by default, a typed ladder, and the arithmetic.
import { describe, it, expect } from 'vitest';
import { parsePointsLadder, pointsFor, pointsActive } from './periodPoints.js';

// The rule SHIPS OFF on the server (`DEFAULT_POINTS_RULE`, server/src/races/pointsRule.js, tested
// in server/src/races/periodEvaluation.test.js); this file tests the arithmetic only.
describe('the period evaluation points rule', () => {
  it('the server default — off, no ladder — is not active', () => {
    expect(pointsActive({ pointsEnabled: false, pointsPerPlace: [] })).toBe(false);
    expect(pointsActive(null)).toBe(false);
  });

  it('is active only when switched on AND carrying a ladder', () => {
    expect(pointsActive({ pointsEnabled: true, pointsPerPlace: [] })).toBe(false);
    expect(pointsActive({ pointsEnabled: false, pointsPerPlace: [3, 1] })).toBe(false);
    expect(pointsActive({ pointsEnabled: true, pointsPerPlace: [3, 1] })).toBe(true);
  });

  it('reads a typed ladder and drops what is not a number, instead of reading it as 0', () => {
    expect(parsePointsLadder('10, 8 6;5')).toEqual([10, 8, 6, 5]);
    expect(parsePointsLadder('3, x, 1')).toEqual([3, 1]);
    expect(parsePointsLadder('')).toEqual([]);
  });

  it('scores each place by the ladder, and a place beyond it as 0', () => {
    const row = { places: { 1: 2, 2: 1, 5: 3 } };
    expect(pointsFor(row, [3, 2, 1])).toBe(2 * 3 + 1 * 2);
  });
});
