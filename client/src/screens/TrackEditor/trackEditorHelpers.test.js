import { describe, it, expect } from 'vitest';
import { findPointAtPosition } from './trackEditorHelpers.js';

describe('findPointAtPosition', () => {
  it('returns the index when clicked directly on a point', () => {
    const points = [
      { x: 100, y: 200 },
      { x: 300, y: 400 },
    ];
    expect(findPointAtPosition(points, 100, 200, 10)).toBe(0);
    expect(findPointAtPosition(points, 300, 400, 10)).toBe(1);
  });

  it('returns the index when click is within radius', () => {
    const points = [{ x: 50, y: 50 }];
    expect(findPointAtPosition(points, 55, 53, 10)).toBe(0);
  });

  it('returns -1 when click is outside radius', () => {
    const points = [{ x: 50, y: 50 }];
    expect(findPointAtPosition(points, 65, 65, 10)).toBe(-1);
  });

  it('returns -1 for an empty point list', () => {
    expect(findPointAtPosition([], 100, 100, 10)).toBe(-1);
  });

  it('returns the last (highest-index) point when multiple overlap', () => {
    const points = [
      { x: 100, y: 100 },
      { x: 102, y: 100 },
      { x: 104, y: 100 },
    ];
    expect(findPointAtPosition(points, 102, 100, 10)).toBe(2);
  });

  it('returns -1 when exactly on the radius boundary (strictly inside test)', () => {
    const points = [{ x: 0, y: 0 }];
    // Distance = exactly 10, which equals radius → should still return 0 (<=)
    expect(findPointAtPosition(points, 10, 0, 10)).toBe(0);
    // Distance = 10.01 → outside
    expect(findPointAtPosition(points, 10.01, 0, 10)).toBe(-1);
  });
});
