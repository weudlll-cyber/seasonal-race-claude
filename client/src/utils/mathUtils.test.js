import { describe, it, expect } from 'vitest';
import { lerp, lerpAngle } from './mathUtils.js';

describe('lerp', () => {
  it('returns start value at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns end value at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('works with negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
});

describe('lerpAngle', () => {
  it('interpolates normally when angles are close', () => {
    expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4);
  });

  it('returns start at t=0', () => {
    expect(lerpAngle(1, 2, 0)).toBeCloseTo(1);
  });

  it('returns end at t=1', () => {
    expect(lerpAngle(1, 2, 1)).toBeCloseTo(2);
  });

  it('wraps correctly at track seam: lerpAngle(-π, π, 0.5) returns ±π, not 0', () => {
    const result = lerpAngle(-Math.PI, Math.PI, 0.5);
    expect(Math.abs(result)).toBeCloseTo(Math.PI);
  });
});
