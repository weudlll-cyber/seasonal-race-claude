import { describe, it, expect } from 'vitest';
import { listEffects, getEffect, getDefaultConfig } from './index.js';

describe('track-effects registry', () => {
  it('auto-discovery finds the stars effect', () => {
    const list = listEffects();
    expect(list.some((e) => e.id === 'stars')).toBe(true);
  });

  it('listEffects() entries do not expose create or render internals', () => {
    for (const entry of listEffects()) {
      expect(entry).not.toHaveProperty('create');
      expect(entry).not.toHaveProperty('render');
    }
  });

  it('listEffects() entries have the expected public fields', () => {
    for (const entry of listEffects()) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('description');
      expect(Array.isArray(entry.configSchema)).toBe(true);
      expect(typeof entry.defaultConfig).toBe('object');
    }
  });

  it('getEffect("stars") returns a manifest with create as a function', () => {
    const effect = getEffect('stars');
    expect(effect).toBeDefined();
    expect(typeof effect.create).toBe('function');
  });

  it('getEffect("nonexistent") returns undefined', () => {
    expect(getEffect('nonexistent')).toBeUndefined();
  });

  it('getDefaultConfig("stars") returns the stars defaultConfig object', () => {
    const config = getDefaultConfig('stars');
    expect(config).not.toBeNull();
    expect(typeof config.count).toBe('number');
    expect(typeof config.color).toBe('string');
    expect(typeof config.opacity).toBe('number');
  });

  it('getDefaultConfig("nonexistent") returns null', () => {
    expect(getDefaultConfig('nonexistent')).toBeNull();
  });

  it('registry contains exactly 7 effects (stars + 6 F7 additions) — regression guard against test-file discovery', () => {
    // If *.test.js files are matched by the glob, any test file without a default export
    // would crash the app. This assertion catches that regression immediately.
    expect(listEffects()).toHaveLength(7);
  });

  it('listEffects() is sorted alphabetically by id', () => {
    const ids = listEffects().map((e) => e.id);
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });

  it('auto-discovery finds all six F7 effects', () => {
    const ids = listEffects().map((e) => e.id);
    for (const id of ['bubbles', 'dust', 'fireflies', 'mud', 'rain', 'wave']) {
      expect(ids).toContain(id);
    }
  });
});
