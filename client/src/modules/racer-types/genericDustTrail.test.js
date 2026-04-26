// ============================================================
// File:        genericDustTrail.test.js
// Path:        client/src/modules/racer-types/genericDustTrail.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for makeGenericDustTrail factory.
// ============================================================

import { describe, it, expect } from 'vitest';
import { makeGenericDustTrail } from './genericDustTrail.js';

describe('makeGenericDustTrail', () => {
  it('returns a function', () => {
    expect(typeof makeGenericDustTrail()).toBe('function');
  });

  it('returned function returns an array', () => {
    const factory = makeGenericDustTrail({ spawnProbability: 1 });
    const result = factory(0, 0, 1, 0, 0, null);
    expect(Array.isArray(result)).toBe(true);
  });

  it('spawnProbability=1 always spawns a particle', () => {
    const factory = makeGenericDustTrail({ spawnProbability: 1 });
    for (let i = 0; i < 20; i++) {
      expect(factory(0, 0, 1, 0, i, null).length).toBe(1);
    }
  });

  it('spawnProbability=0 never spawns', () => {
    const factory = makeGenericDustTrail({ spawnProbability: 0 });
    for (let i = 0; i < 20; i++) {
      expect(factory(0, 0, 1, 0, i, null).length).toBe(0);
    }
  });

  it('particle has correct color', () => {
    const factory = makeGenericDustTrail({ color: '#ff0000', spawnProbability: 1 });
    const [p] = factory(0, 0, 1, 0, 0, null);
    expect(p.color).toBe('#ff0000');
  });

  it('particle has correct ttl and maxTtl', () => {
    const factory = makeGenericDustTrail({ ttl: 42, spawnProbability: 1 });
    const [p] = factory(0, 0, 1, 0, 0, null);
    expect(p.ttl).toBe(42);
    expect(p.maxTtl).toBe(42);
  });

  it('particle radius is within [minRadius, maxRadius]', () => {
    const factory = makeGenericDustTrail({ minRadius: 5, maxRadius: 10, spawnProbability: 1 });
    for (let i = 0; i < 30; i++) {
      const [p] = factory(0, 0, 1, 0, i, null);
      expect(p.r).toBeGreaterThanOrEqual(5);
      expect(p.r).toBeLessThanOrEqual(10);
    }
  });

  it('particle alpha equals alphaCoeff', () => {
    const factory = makeGenericDustTrail({ alphaCoeff: 0.7, spawnProbability: 1 });
    const [p] = factory(0, 0, 1, 0, 0, null);
    expect(p.alpha).toBe(0.7);
    expect(p.alphaCoeff).toBe(0.7);
  });

  it('uses default values when called with no options', () => {
    const factory = makeGenericDustTrail();
    expect(typeof factory).toBe('function');
    // With spawnProbability default 0.3, run many times to eventually get a particle
    let got = false;
    for (let i = 0; i < 200; i++) {
      const result = factory(0, 0, 1, 0, i, null);
      if (result.length > 0) {
        got = true;
        break;
      }
    }
    expect(got).toBe(true);
  });
});
