// ============================================================
// File:        trailStyles.test.js
// Path:        client/src/modules/racer-types/trailStyles.test.js
// Project:     RaceArena
// Created:     2026-05-27
// Description: Unit tests for the trail style registry.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTrailFactory, listTrailStyles, TRAIL_STYLE_IDS } from './trailStyles.js';

describe('listTrailStyles / TRAIL_STYLE_IDS', () => {
  it('returns an array with at least 5 entries', () => {
    expect(listTrailStyles().length).toBeGreaterThanOrEqual(5);
  });

  it('includes "none" and "dust"', () => {
    const ids = listTrailStyles();
    expect(ids).toContain('none');
    expect(ids).toContain('dust');
  });

  it('TRAIL_STYLE_IDS matches listTrailStyles()', () => {
    expect(TRAIL_STYLE_IDS).toEqual(listTrailStyles());
  });
});

describe('getTrailFactory', () => {
  it('returns a function for each registered style', () => {
    for (const id of listTrailStyles()) {
      expect(typeof getTrailFactory(id)).toBe('function');
    }
  });

  it('"none" factory always returns an empty array', () => {
    const factory = getTrailFactory('none');
    for (let i = 0; i < 10; i++) {
      expect(factory(0, 0, 1, 0, i, null)).toEqual([]);
    }
  });

  it('"dust" factory returns an array', () => {
    const factory = getTrailFactory('dust');
    expect(Array.isArray(factory(0, 0, 1, 0, 0, null))).toBe(true);
  });

  it('falls back to "dust" for unknown style name', () => {
    const dustFactory = getTrailFactory('dust');
    const unknownFactory = getTrailFactory('does-not-exist');
    // Both should be functions and return arrays
    expect(typeof unknownFactory).toBe('function');
    expect(Array.isArray(unknownFactory(0, 0, 1, 0, 0, null))).toBe(true);
    // Same reference as dust factory (registry returns the same object)
    expect(unknownFactory).toBe(dustFactory);
  });

  it('"sparkle" factory returns particles with yellow color', () => {
    const factory = getTrailFactory('sparkle');
    let got = false;
    for (let i = 0; i < 200 && !got; i++) {
      const particles = factory(0, 0, 1, 0, i, null);
      if (particles.length > 0) {
        expect(particles[0].color).toBe('#fffb66');
        got = true;
      }
    }
    expect(got).toBe(true);
  });
});
