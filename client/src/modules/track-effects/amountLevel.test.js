// @vitest-environment node
// ============================================================
// File:        amountLevel.test.js
// Path:        client/src/modules/track-effects/amountLevel.test.js
// Project:     RaceArena — PARTICLES-VISIBILITY-8
// Description: The level ↔ native amount conversion, both ways: 0 is off, 100 is the effect's
//              maximum, linear in between, a non-zero native never shows level 0, and every level
//              writes a whole native amount inside 0–max for all seven effects.
// ============================================================
import { describe, it, expect } from 'vitest';
import { AMOUNT_KEY, LEVEL_MAX, levelFromNative, nativeFromLevel } from './amountLevel.js';
import bubbles from './effects/bubbles.js';
import dust from './effects/dust.js';
import fireflies from './effects/fireflies.js';
import mud from './effects/mud.js';
import rain from './effects/rain.js';
import stars from './effects/stars.js';
import wave from './effects/wave.js';

const EFFECTS = { bubbles, dust, fireflies, mud, rain, stars, wave };
const maxOf = (effect) => effect.configSchema.find((f) => f.key === AMOUNT_KEY).max;

describe('levelFromNative', () => {
  it('0 is level 0 and the maximum is level 100', () => {
    expect(levelFromNative(0, 4000)).toBe(0);
    expect(levelFromNative(4000, 4000)).toBe(LEVEL_MAX);
  });

  it('is linear and rounds to the nearest level', () => {
    expect(levelFromNative(2000, 4000)).toBe(50);
    expect(levelFromNative(180, 4000)).toBe(5); // 4.5 rounds up
    expect(levelFromNative(179, 4000)).toBe(4); // 4.475 rounds down
  });

  it('a non-zero amount that rounds to 0 shows 1, never 0', () => {
    expect(levelFromNative(1, 240000)).toBe(1);
    expect(levelFromNative(100, 240000)).toBe(1);
  });

  it('an amount above the maximum shows 100', () => {
    expect(levelFromNative(9000, 8000)).toBe(LEVEL_MAX);
  });

  it("the owner's stored tracks show the levels the report states", () => {
    expect(levelFromNative(200, maxOf(rain))).toBe(5); // Dirt Oval
    expect(levelFromNative(100, maxOf(bubbles))).toBe(1); // Seatrack — 0.04, shown as 1
    expect(levelFromNative(360, maxOf(stars))).toBe(5); // Space Sprint — 4.5
  });
});

describe('nativeFromLevel', () => {
  it('level 0 is 0 and level 100 is the maximum', () => {
    expect(nativeFromLevel(0, 4000)).toBe(0);
    expect(nativeFromLevel(LEVEL_MAX, 4000)).toBe(4000);
  });

  it('is level × max / 100, rounded to a whole amount', () => {
    expect(nativeFromLevel(5, 4000)).toBe(200);
    expect(nativeFromLevel(1, 250)).toBe(3); // 2.5
    expect(nativeFromLevel(50, 250)).toBe(125);
  });
});

describe.each(Object.entries(EFFECTS))('%s — every level', (name, effect) => {
  const max = maxOf(effect);

  it('writes a whole amount inside 0–max, rising with the level', () => {
    let prev = -1;
    for (let level = 0; level <= LEVEL_MAX; level++) {
      const native = nativeFromLevel(level, max);
      expect(Number.isInteger(native)).toBe(true);
      expect(native).toBeGreaterThanOrEqual(0);
      expect(native).toBeLessThanOrEqual(max);
      expect(native).toBeGreaterThan(prev);
      prev = native;
    }
  });

  it('reads back as the level it was written from', () => {
    for (let level = 0; level <= LEVEL_MAX; level++) {
      expect(levelFromNative(nativeFromLevel(level, max), max)).toBe(level);
    }
  });
});
