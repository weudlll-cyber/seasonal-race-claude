// ============================================================
// File:        aspectCap.test.js
// Path:        client/src/modules/racer-types/aspectCap.test.js
// Project:     RaceArena — ASPECT-CAP-1 (LEVER A)
//
// WHAT THIS PROTECTS. The cap is meant to touch exactly two racer types and leave eighteen alone.
// That is a claim about all twenty, so it is asserted against all twenty rather than spot-checked on
// the two — the brief asked for it proved, and "we only changed the rocket" is precisely the kind of
// sentence that is true when written and false a year later when a sprite is retuned.
//
// AND THE ONE THAT MATTERS MOST: **OFF must mean OFF.** The shipped default leaves the sleeping
// threshold in place, and `guardedBodyFillNarrow` must then return its input UNCHANGED for every
// type — not approximately, identically. If that ever stops holding, the four fingerprints move
// without anyone asking for it.
// ============================================================
import { describe, it, expect, afterEach } from 'vitest';
import { RACER_TYPE_IDS, getRacerTypeById } from './index.js';
import {
  BODY_LONG_AXIS_MAX_RATIO,
  guardedBodyFillNarrow,
  setBodyLongAxisMaxRatio,
  resetBodyLongAxisMaxRatio,
  getBodyLongAxisMaxRatio,
} from './SpriteRacerType.js';

/** Every type's (narrow, long, aspect), read from the registry rather than from a table. */
const TYPES = RACER_TYPE_IDS.map((id) => {
  const c = getRacerTypeById(id).config;
  const narrow = Math.min(c.bodyFillX, c.bodyFillY);
  const long = Math.max(c.bodyFillX, c.bodyFillY);
  return { id, narrow, long, aspect: long / narrow };
});

const CAP = 2.5;

afterEach(() => resetBodyLongAxisMaxRatio());

describe('ASPECT-CAP-1 — the cap is OFF by default and inert when off', () => {
  it('the shipped threshold is the sleeping 5.0', () => {
    expect(getBodyLongAxisMaxRatio()).toBe(BODY_LONG_AXIS_MAX_RATIO);
    expect(BODY_LONG_AXIS_MAX_RATIO).toBe(5.0);
  });

  it('returns the narrow fill UNCHANGED for every one of the 20 types when off', () => {
    for (const t of TYPES) {
      expect(guardedBodyFillNarrow(t.narrow, t.long)).toBe(t.narrow);
    }
  });

  it('null, zero and nonsense all restore the sleeping threshold — OFF means OFF', () => {
    for (const bad of [null, undefined, 0, -1, NaN, 'x']) {
      setBodyLongAxisMaxRatio(bad);
      expect(getBodyLongAxisMaxRatio()).toBe(BODY_LONG_AXIS_MAX_RATIO);
      for (const t of TYPES) expect(guardedBodyFillNarrow(t.narrow, t.long)).toBe(t.narrow);
    }
  });
});

describe('ASPECT-CAP-1 — at 2.5 it touches exactly rocket and giraffe', () => {
  it('exactly two types exceed 2.5, and they are the two named', () => {
    const over = TYPES.filter((t) => t.aspect > CAP)
      .map((t) => t.id)
      .sort();
    expect(over).toEqual(['giraffe', 'rocket']);
  });

  it('the other eighteen are bit-identical with the cap ON', () => {
    setBodyLongAxisMaxRatio(CAP);
    for (const t of TYPES) {
      if (t.aspect > CAP) continue;
      expect(guardedBodyFillNarrow(t.narrow, t.long)).toBe(t.narrow);
    }
  });

  it('the two that are capped land at exactly the cap, and no further', () => {
    setBodyLongAxisMaxRatio(CAP);
    for (const t of TYPES.filter((x) => x.aspect > CAP)) {
      const guarded = guardedBodyFillNarrow(t.narrow, t.long);
      expect(guarded).toBeGreaterThan(t.narrow); // the denominator grew, so the body shrank
      // The whole point of the cap: the resulting aspect is the cap itself.
      expect(t.long / guarded).toBeCloseTo(CAP, 10);
    }
  });

  it('the rocket is the case the lever was built for', () => {
    const rocket = TYPES.find((t) => t.id === 'rocket');
    expect(rocket.aspect).toBeCloseTo(2.8813, 3);
    setBodyLongAxisMaxRatio(CAP);
    // 2.5 / 2.881 = 0.8677 — the drawn body, both axes, at 86.8% of its uncapped size.
    expect(rocket.narrow / guardedBodyFillNarrow(rocket.narrow, rocket.long)).toBeCloseTo(
      CAP / rocket.aspect,
      10
    );
  });
});

describe('ASPECT-CAP-1 — degenerate input is passed through, never turned into NaN', () => {
  it('zero or negative fills return the input rather than dividing by it', () => {
    setBodyLongAxisMaxRatio(CAP);
    expect(guardedBodyFillNarrow(0, 0.8)).toBe(0);
    expect(guardedBodyFillNarrow(0.3, 0)).toBe(0.3);
    expect(guardedBodyFillNarrow(-0.2, 0.8)).toBe(-0.2);
  });
});
