// ============================================================
// File:        heroStrictness.test.js
// Path:        client/src/modules/heroStrictness.test.js
// Project:     RaceArena — HERO-STRICTNESS-1
//
// WHAT THIS PINS: that ONE key moves ONE population, and that three neighbouring mechanisms are
// byte-identical at every value of it.
//
// The key is `choreoHeroStrictness`, the `strictness` of the blend at racePlanner.js:1434 —
// `error = strictness*rankError + (1-strictness)*bandError` — for CAST racers only. Its DEFAULT
// IS 1.0, the literal it replaced, so a default install races exactly as before.
//
// ★ WHY A KEY AT ALL, recorded here because a later reader will ask. Both ENDS of this range are
// known and nothing between them has ever been measured for the cast:
//   1.0  the racer lying second is braked on 86.5% of growing frames (BREAKAWAY-LEVER-1).
//   0.0  shipped once and REMOVED 2026-09-13 (`17193be6`) — unsteered, a cast racer opened 3.3x the
//        pre-shape gap at twenty racers (ARRIVAL-STEERED-AGAIN-1); BAND-SLACK-1 (2026-09-22) records
//        0.0 as refuted from three further directions.
//
// ★★ THE FIXTURE IS `arrivalShape.test.js`'s, REUSED RATHER THAN REBUILT — the plan is built and
// then its casting fields are injected (`_choreoGenerated`, `_heroCurves`, `_attackerParams`,
// `_racerTargetRank`). Rebuilding a second way of casting heroes is how two test files drift into
// testing different engines. The noise is pinned to ZERO so the assertions read the BLEND and not
// the servo's `(rng()-0.5)*2*_stochasticNoise` term; every claim below is about arithmetic.
//
// ★ THE HAZARD THIS FIXTURE IS BUILT AGAINST. A hero placed at his exact drawn place has
// rankError 0 AND bandError 0, so every strictness gives the same answer and the test would pass
// under any sabotage. Every case therefore places the hero INSIDE his band but AWAY from his exact
// place — the one configuration where the two halves of the blend disagree.
// ============================================================

import { describe, it, expect } from 'vitest';
import { createRacePlan, createTrajectoryController } from './racePlanner.js';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './storage/defaults.js';

const FINISH_T = 2.0;
const TARGET_DUR_MS = 60_000;
const N = 40;
const PROGRESS = 0.8; // inside the outcome phase, past the held release, before the B1 release
const HERO = 0;
const DRAWN = 3; // his drawn place — inside the B1 band (ranks 1..5)
const PLACED_RANK = 5; // inside the band, two ranks off the exact place → the halves disagree
// ★★ THE PACK WITNESS, AND IT IS CHOSEN, NOT PICKED. The first version of the pack test used an
// arbitrary index and PASSED UNDER ITS OWN SABOTAGE: that racer's error was large enough to clamp
// against `maxMult` at every strictness, so two different blends produced one identical command and
// the test proved nothing. A failed sabotage is not a finding (the project's own rule). Racer 9 is
// drawn 2nd, so standing 4th he is INSIDE his band (bandError 0) and TWO ranks off his exact place
// — a small error that does not clamp, and the one shape where the two halves of the blend give
// different answers.
const PACK_IDX = 9;
const PACK_RANK = 4;

function makeRacers(count = N) {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    startRowIndex: Math.floor(i / 10),
    t: 0,
    finished: false,
    avoidanceActive: false,
    trajectoryMult: 1.0,
    trajectoryMultTarget: 1.0,
    trajectoryMultPrev: 1.0,
    trajectoryMultTransStart: 0,
    baseSpeed: 0.001,
    isHeroChoreographed: false,
  }));
}

/**
 * A controller with `heroIdx` cast, drawn at `DRAWN`, and the field laid out so he stands at
 * `placedRank`. `attacker` gives him B2-attacker params, which is the population the key must NOT
 * reach. `strictness` omitted ⇒ the key is absent from the config entirely, which is the case that
 * proves the DEFAULT is the old literal.
 */
function build({ strictness, attacker = false, heroIdx = HERO, placedRank = PLACED_RANK } = {}) {
  const racers = makeRacers();
  const plan = createRacePlan(
    racers,
    FINISH_T,
    TARGET_DUR_MS,
    {
      // ★ zero noise: these assertions are about the blend, not about the servo's jitter.
      stochasticNoise: 0,
      ...(strictness === undefined ? {} : { choreoHeroStrictness: strictness }),
    },
    42
  );
  plan._choreoGenerated = true; // the casting already happened — do not regenerate
  // A FLAT curve at his drawn place: a hero's target comes from `sampleHeroCurve` (racePlanner.js
  // :1352), not from `_racerTargetRank`, so the curve is what pins DRAWN here. Flat means the
  // target is the same at every progress and the test cannot drift with the sampling.
  plan._heroCurves = new Map([
    [
      heroIdx,
      {
        points: [
          { progress: 0, rank: DRAWN },
          { progress: 1, rank: DRAWN },
        ],
      },
    ],
  ]);
  plan._racerTargetRank.set(heroIdx, DRAWN);
  plan._attackerParams = attacker ? new Map([[heroIdx, { peakRank: 2, finalRank: 4 }]]) : new Map();
  racers[heroIdx].isHeroChoreographed = true;
  // t descending = rank ascending. The hero goes in the `placedRank` slot and PACK_IDX in the
  // PACK_RANK slot; everyone else fills the gaps in index order. Explicit slots rather than two
  // successive splices, because the second splice would shift the first one's rank.
  const order = new Array(N).fill(null);
  order[placedRank - 1] = heroIdx;
  order[PACK_RANK - 1] = PACK_IDX;
  let next = 0;
  for (let slot = 0; slot < N; slot++) {
    if (order[slot] != null) continue;
    while (next === heroIdx || next === PACK_IDX) next++;
    order[slot] = next++;
  }
  order.forEach((idx, rankIdx) => {
    racers[idx].t = FINISH_T * PROGRESS - rankIdx * 0.001;
  });
  return { plan, ctrl: createTrajectoryController(plan), racers };
}

/** The multiplier the servo COMMANDS for `idx` this frame (pre-ease). */
function commandedFor(idx, opts) {
  const { ctrl, racers } = build(opts);
  ctrl.update(racers, 40_000, PROGRESS);
  return racers[idx].trajectoryMultTarget;
}

describe('HERO-STRICTNESS-1 — the key moves the cast, and only the cast', () => {
  it('★ THE DEFAULT IS THE OLD LITERAL: omitting the key and setting it to 1.0 are the same race', () => {
    // If this ever fails, a default install has changed and the fingerprints are owed a re-mint.
    // It is written against the ABSENT key rather than against a hardcoded number so it still means
    // something if the default is ever deliberately moved.
    expect(commandedFor(HERO, { strictness: undefined })).toBe(
      commandedFor(HERO, { strictness: 1.0 })
    );
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.choreoHeroStrictness).toBe(1.0);
  });

  it('★★ THE BLEND READS THE KEY: a cast racer inside his band is steered LESS as it falls', () => {
    // He stands 5th and was drawn 3rd, so rankError = +2 and bandError = 0 (5 is inside 1..5).
    // error = strictness*2, so the distance from 1.0 must fall strictly with strictness.
    // ★ SABOTAGE 1 (use the literal 1.0 and ignore the key) makes all four equal → RED here.
    const d = (s) => Math.abs(commandedFor(HERO, { strictness: s }) - 1.0);
    const [d100, d70, d50, d00] = [d(1.0), d(0.7), d(0.5), d(0.0)];
    expect(d100).toBeGreaterThan(d70);
    expect(d70).toBeGreaterThan(d50);
    expect(d50).toBeGreaterThan(d00);
  });

  it('★ AT ZERO a cast racer inside his band is not steered at all — error = bandError = 0', () => {
    // This is the refuted anchor, pinned so the curve has a known end: with the noise at zero the
    // command is exactly 1.0, which is what "not steered" means in this engine.
    expect(commandedFor(HERO, { strictness: 0.0 })).toBe(1.0);
  });

  it('★ and OUTSIDE the band, zero still steers — it is band steering, not release', () => {
    // Placed 9th against a band of 1..5: bandError = +4, so even at strictness 0 there is a force.
    // Without this, "strictness 0" could be read as "the racer is switched off", which it is not.
    const outside = commandedFor(HERO, { strictness: 0.0, placedRank: 9 });
    expect(outside).not.toBe(1.0);
  });

  it('THE PACK IS UNTOUCHED: a non-cast racer is byte-identical at every value of the key', () => {
    // ★ SABOTAGE 2 (apply the key to the pack as well) turns this RED. The pack has its own key,
    // `choreoPackBandStrictness` (0.5), and Lesson 178 measured freeing the PACK as a FAIRNESS loss
    // where freeing the CAST was an ACTION loss — two populations, two mechanisms, two keys.
    const at = (s) => commandedFor(PACK_IDX, { strictness: s });
    // First: the witness must actually be steered, or "unchanged" is vacuous. He is drawn 2nd and
    // stands 4th, so the pack's own 0.5 blend gives him a real, unclamped command.
    expect(at(1.0)).not.toBe(1.0);
    expect(at(0.0)).toBe(at(1.0));
    expect(at(0.5)).toBe(at(1.0));
  });

  it('★★ THE B2 ATTACKER IS UNTOUCHED — its orchestrated climb keeps the shipped literal', () => {
    // The attacker's not-yet-freed phase tracks its authored curve at strictness 1.0. That is the
    // mechanism Lesson 178 measured at +21% top-5 action — the AUTHORING success — and the key is
    // pinned out of it at racePlanner.js so the sweep moves one thing, not two.
    const at = (s) => commandedFor(HERO, { strictness: s, attacker: true });
    expect(at(0.0)).toBe(at(1.0));
    expect(at(0.5)).toBe(at(1.0));
  });

  it('★ THE B2 ATTACKER IS ALSO UNTOUCHED WHERE IT WOULD HURT MOST — outside its band', () => {
    // Outside the band the cast key would produce a visibly different command (the case two tests
    // up), so if the attacker pin ever came off, this is where it would show.
    const at = (s) => commandedFor(HERO, { strictness: s, attacker: true, placedRank: 9 });
    expect(at(0.0)).toBe(at(1.0));
  });

  it('the key can never raise a command above the engine ceiling, at any value', () => {
    // The arrival ceiling and `maxMult` are functions of rankError and the params, not of
    // strictness, so the key cannot reach them. Asserted as a property rather than by reading the
    // ceiling back, so it holds if the ceiling is ever re-derived.
    const { maxMult, minMult } = DEFAULT_RACE_DYNAMICS_CONFIG.trajectoryController ?? {};
    for (const s of [0.0, 0.3, 0.5, 0.7, 1.0]) {
      const cmd = commandedFor(HERO, { strictness: s, placedRank: 9 });
      expect(Number.isFinite(cmd)).toBe(true);
      if (maxMult != null) expect(cmd).toBeLessThanOrEqual(maxMult);
      if (minMult != null) expect(cmd).toBeGreaterThanOrEqual(minMult);
    }
  });
});
