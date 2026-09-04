// ============================================================
// configValidate.test.js — PER-KEY-REJECT-1, the mechanism on its own.
//
// The store-by-store consequences live in `configPerKeyReject.test.js`; this file tests the rule
// engine against a tiny made-up store, so a failure here points at the engine rather than at a
// store's rule list.
// ============================================================

import { describe, it, expect } from 'vitest';
import { applyKeyRules } from './configValidate.js';

const DEFAULTS = { a: 1, b: 2, min: 10, max: 20, flag: true };

const RULES = [
  { keys: ['a'], ok: (c) => c.a > 0, why: 'a must be above 0' },
  { keys: ['flag'], ok: (c) => typeof c.flag === 'boolean', why: 'flag must be true or false' },
  { keys: ['min', 'max'], ok: (c) => c.min < c.max, why: 'min must be below max' },
];

const resolve = (stored) => ({ ...DEFAULTS, ...stored });

describe('applyKeyRules — a rejection costs one key, never the config', () => {
  it('leaves a config with no bad key completely untouched, and says nothing', () => {
    const stored = { a: 5, b: 99, min: 1, max: 2, flag: false };
    const { config, rejected, storeDefects } = applyKeyRules(resolve(stored), DEFAULTS, RULES);
    expect(config).toEqual(stored);
    expect(rejected).toEqual([]);
    expect(storeDefects).toEqual([]);
  });

  it('rejects ONLY the failing key, and every other stored key survives', () => {
    // `b` and `flag` are the operator's own settings and have nothing to do with the bad `a`.
    const { config, rejected } = applyKeyRules(
      resolve({ a: -3, b: 99, flag: false }),
      DEFAULTS,
      RULES
    );
    expect(config.a).toBe(DEFAULTS.a);
    expect(config.b).toBe(99);
    expect(config.flag).toBe(false);
    expect(rejected).toEqual([{ key: 'a', stored: -3, using: 1, why: 'a must be above 0' }]);
  });

  it('★ PROVES THE OLD BEHAVIOUR WOULD HAVE FAILED THIS', () => {
    // What the five stores used to do on any failure: `return { ...DEFAULTS }`.
    const stored = { a: -3, b: 99, flag: false };
    const oldResult = { ...DEFAULTS };
    const { config } = applyKeyRules(resolve(stored), DEFAULTS, RULES);
    // The bad key lands in the same place either way — that is why the change is easy to miss.
    expect(oldResult.a).toBe(config.a);
    // Everything else does not. This is the whole repair, in one assertion.
    expect(oldResult.b).toBe(2);
    expect(config.b).toBe(99);
    expect(oldResult.flag).toBe(true);
    expect(config.flag).toBe(false);
    expect(oldResult).not.toEqual(config);
  });

  it('a rejected key falls back to its DEFAULT, never to the nearest legal value', () => {
    // The nearest legal `a` above 0 is not 1; a clamp would invent something. The default is what
    // the product ships and the only value a reader can predict.
    const { config } = applyKeyRules(resolve({ a: -0.0001 }), DEFAULTS, RULES);
    expect(config.a).toBe(DEFAULTS.a);
  });

  describe('cross-key rules', () => {
    it('reverts only the side the operator actually set', () => {
      // `max` is at its default, so it is not the operator's choice and is left alone.
      const { config, rejected } = applyKeyRules(resolve({ min: 99 }), DEFAULTS, RULES);
      expect(config.min).toBe(DEFAULTS.min);
      expect(config.max).toBe(DEFAULTS.max);
      expect(rejected.map((r) => r.key)).toEqual(['min']);
    });

    it('reverts BOTH sides when both were set, because nothing says which is the mistake', () => {
      const { config, rejected } = applyKeyRules(resolve({ min: 99, max: 50 }), DEFAULTS, RULES);
      expect(config.min).toBe(DEFAULTS.min);
      expect(config.max).toBe(DEFAULTS.max);
      expect(rejected.map((r) => r.key).sort()).toEqual(['max', 'min']);
    });

    it('re-runs the rules after a revert, so a fix that breaks another rule is caught', () => {
      // Reverting `min` to 10 satisfies min<max on its own; here `max` is also below it, so the
      // rule fails again on the second pass and takes `max` too.
      const { config } = applyKeyRules(resolve({ min: 5, max: 3 }), DEFAULTS, RULES);
      expect(config).toEqual(DEFAULTS);
    });
  });

  it('reports a rule its own DEFAULTS break as a store defect, and changes nothing', () => {
    const brokenRules = [{ keys: ['a'], ok: () => false, why: 'a is impossible' }];
    const { config, rejected, storeDefects } = applyKeyRules(
      resolve({ a: 5 }),
      DEFAULTS,
      brokenRules
    );
    // One revert happens (a was set), then the rule still fails with every key at its default.
    expect(config.a).toBe(DEFAULTS.a);
    expect(rejected.map((r) => r.key)).toEqual(['a']);
    expect(storeDefects).toEqual(['a is impossible']);
  });

  it('does not mutate the config handed to it', () => {
    const resolved = resolve({ a: -1 });
    applyKeyRules(resolved, DEFAULTS, RULES);
    expect(resolved.a).toBe(-1);
  });
});
