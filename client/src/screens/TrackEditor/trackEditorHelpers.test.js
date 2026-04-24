import { describe, it, expect } from 'vitest';
import { findPointAtPosition, findSegmentNearPoint } from './trackEditorHelpers.js';

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

describe('findSegmentNearPoint', () => {
  it('returns the correct insertAtIndex for a click on a segment', () => {
    // Collinear points along x-axis; click at (50, 3) is near segment 0→1
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
    ];
    const result = findSegmentNearPoint(points, 50, 3, 8, false);
    expect(result).not.toBeNull();
    expect(result.insertAtIndex).toBe(1);
  });

  it('returns the closer segment when multiple candidates are within range', () => {
    // L-shape: (0,0)→(100,0)→(100,100). Click at (95,50) is 5px from segment 1→2 (x=100 rail)
    // and 50px from segment 0→1 (y=0 rail), so segment 1→2 wins → insertAtIndex 2
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const result = findSegmentNearPoint(points, 95, 50, 8, false);
    expect(result).not.toBeNull();
    expect(result.insertAtIndex).toBe(2);
  });

  it('returns null when click is far from all segments', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(findSegmentNearPoint(points, 50, 50, 8, false)).toBeNull();
  });

  it('returns correct insertAtIndex for the wrap-around segment on a closed track', () => {
    // Triangle: (0,0)→(100,0)→(50,100). Wrap segment (50,100)→(0,0) has midpoint (25,50).
    // Click exactly at (25,50) → distance 0 → bestIndex=2 → insertAtIndex=3 (=n)
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 100 },
    ];
    const result = findSegmentNearPoint(points, 25, 50, 8, true);
    expect(result).not.toBeNull();
    expect(result.insertAtIndex).toBe(3);
  });

  it('returns null for an empty list', () => {
    expect(findSegmentNearPoint([], 50, 50, 8, false)).toBeNull();
  });

  it('returns null for a single-point list', () => {
    expect(findSegmentNearPoint([{ x: 50, y: 50 }], 50, 50, 8, false)).toBeNull();
  });

  it('does not return the wrap-around segment for an open track', () => {
    // Open track; click at (25,50) is near where last→first would be, but that segment
    // does not exist in open mode — should return null (all other segments are far away)
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 100 },
    ];
    const result = findSegmentNearPoint(points, 25, 50, 8, false);
    expect(result).toBeNull();
  });
});
