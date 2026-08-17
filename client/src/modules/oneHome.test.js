// ============================================================
// File:        oneHome.test.js
// Path:        client/src/modules/oneHome.test.js
// Project:     RaceArena — ONE-HOME-1
//
// THE OWNER'S RULING, 2026-08-19, asserted rather than merely written down:
//
//   No key is ever missing. Every loader walks the full key set of its defaults, so the running
//   game cannot lack one. The fallbacks exist so a function can be called WITHOUT a config object
//   at all — and the only callers that do that are tests and harnesses. THE RULE IS THEREFORE:
//   no second definition of a value. A caller that passes no config reads the ONE HOME.
//
// ── WHAT BREAKS IF THIS FILE IS DELETED ──────────────────────────────────────────────────────────
// The ruling goes back to being a sentence in a report. `check-fallback-agreement` catches a
// LITERAL that disagrees with its default — but it is blind to two shapes that this file is not:
//
//   1. AN OBJECT-LITERAL COPY. Its NULLISH pattern matches scalars and SCREAMING_CASE names only,
//      so `b2AttackProgress: { start: 0.4, end: 0.7 }` was invisible to it for as long as it
//      existed. A hand search found FOUR copies where an earlier report said two.
//   2. A COPY THAT CURRENTLY AGREES. The guard reports a DISAGREEMENT; a second definition holding
//      the right value today passes it and drifts tomorrow. That is the whole of L207.
//
// SO THE FILE ASSERTS TWO DIFFERENT KINDS OF THING, and the split is the point — found by sabotage
// rather than by design. Restoring `b2AttackProgress: { start: 0.4, end: 0.7 }` failed NONE of the
// value tests below, because that literal EQUALS the shipped block today. **A copy that agrees is
// invisible at runtime, by definition.** The rule is a property of the SOURCE, not of a value, so
// one test reads the source and the rest read the values a bare caller receives.
// ============================================================

import { describe, it, expect } from 'vitest';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './storage/defaults.js';
import { GENERATOR_CONFIG } from './heroCurveGenerator.js';
import { createRacePlan } from './racePlanner.js';
// Vite's `?raw` import — the source itself, which is what a 'no second definition' rule is about.
import heroCurveGeneratorSource from './heroCurveGenerator.js?raw';

const RACERS = Array.from({ length: 12 }, (_, i) => ({ index: i, startRowIndex: i % 3 }));

describe('ONE-HOME — the hero generator carries no second definition', () => {
  // GENERATOR_CONFIG is the module's own default set, spread by racePlanner and overridden per race.
  // Its B2-attacker fields used to be hand-written numbers, defended by a comment calling them "the
  // direct/test-call fallback, not the shipped default" — a second definition with a rationale.
  it('every B2-attacker field IS the shipped value, not a copy of it', () => {
    expect(GENERATOR_CONFIG.b2AttackHeroes).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackHeroes);
    expect(GENERATOR_CONFIG.b2AttackFinalRank).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackFinalRank);
    expect(GENERATOR_CONFIG.b2AttackPeakRank).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackPeakRank);
  });

  // The object-literal case, and the one the guard cannot see at all.
  it('b2AttackProgress is the shipped block, not a re-typed one', () => {
    expect(GENERATOR_CONFIG.b2AttackProgress).toEqual(
      DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackProgress
    );
  });

  // It must be a SEPARATE object, or a caller mutating the generator's config would reach into the
  // one home itself. That is why the source spreads the home rather than aliasing it.
  it('and it is a SEPARATE object, so nothing can mutate the home through it', () => {
    expect(GENERATOR_CONFIG.b2AttackProgress).not.toBe(
      DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackProgress
    );
  });

  // THE SOURCE ASSERTION, and the only one that catches a re-typed copy which happens to agree.
  // Proved by sabotage: restoring `b2AttackProgress: { start: 0.4, end: 0.7 }` passes every value
  // test in this file — an equal value is an equal value — and fails only this one.
  it('SOURCE: no B2-attacker field is written as a literal beside the home', () => {
    const src = heroCurveGeneratorSource;
    const block = src.slice(
      src.indexOf('b2AttackHeroes:'),
      src.indexOf('b2AttackResolveProgress:')
    );
    expect(block).not.toMatch(/b2AttackProgress:\s*\{\s*start:\s*[0-9]/);
    expect(block).not.toMatch(/b2Attack(Heroes|FinalRank|PeakRank):\s*-?[0-9]/);
    expect(block).toMatch(/b2AttackProgress:\s*\{\s*\.\.\.DEFAULT_RACE_DYNAMICS_CONFIG/);
  });
});

describe('ONE-HOME — a plan built with NO config gets the shipped game', () => {
  // `createRacePlan(racers, finishT, targetDurationMs, config = {}, seed)` — the `config = {}`
  // default parameter is the bare-caller path the ruling is about. Before ONE-HOME-1 this returned
  // b2AttackHeroes 0 (feature off) and b2AttackFinalRank 10 (a superseded number).
  const plan = createRacePlan(RACERS, 3, 60000, {}, 42);

  it('casts the shipped number of attackers, not zero', () => {
    expect(plan._b2AttackHeroes).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackHeroes);
  });

  it('uses the shipped final rank, not the superseded one', () => {
    expect(plan._b2AttackFinalRank).toBe(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackFinalRank);
  });

  it('uses the shipped attack window', () => {
    expect(plan._b2AttackProgress).toEqual(DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackProgress);
  });

  // The NaN half of the ruling. Deleting a `?? 0` outright would have left `undefined` flowing into
  // arithmetic; reading the home is what avoids both that and the stale number.
  it('no numeric field of a bare plan is undefined or NaN', () => {
    for (const key of ['_b2AttackHeroes', '_b2AttackFinalRank', '_b2AttackPeakRank']) {
      expect(Number.isFinite(plan[key])).toBe(true);
    }
  });
});
