// ============================================================
// File:        stagedComeback.test.js
// Path:        client/src/modules/stagedComeback.test.js
// Project:     RaceArena — COMEBACK-STAGED-1
//
// WHAT THIS PINS: the director's staging rule, and — more importantly — THE WALL THAT REFUSES IT.
// The owner asked for a comebacker who is CHOSEN first and then PUT where he should start from. The
// rule that decides where is here; the reason it currently never happens is here too, because a
// build whose mechanism never engages must not be left looking as though it does.
//
// ★ WHY THE BRIEF'S TWO SABOTAGES ARE NOT IN THIS FILE. They were "stage him and never release" and
// "release him at the wrong progress". Both presuppose a release, and MEASURED there is none: the
// staged curve is refused by `feasibleTiming` for every candidate at every field size. Writing a
// test that asserted a release would be asserting a thing that does not occur — the false-green
// shape this chain has produced four times. What is sabotaged instead is the fall-back, which IS
// live and whose failure is a silent regression.
//
// WHAT IT DELIBERATELY DOES NOT PIN: that a staged comebacker reaches the top 5. He is never staged,
// so there is nothing to assert. The numbers are in COMEBACK-STAGED-1.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  stagedComebackRank,
  feasibleTiming,
  racerFeasibility,
  intensityToDrama,
  generateHeroCurves,
  resolveForBand,
  GENERATOR_CONFIG,
} from './heroCurveGenerator.js';

const FINISH_T = 2;
const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A bunched field — the density in which deep climbs are MOST feasible, so the wall below is not
 *  an artefact of a hostile fixture. */
function buildField({ n = 40, seed = 1 } = {}) {
  const r = mulberry32(seed);
  const pool = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const finalRanks = new Map();
  const postChaos = [];
  for (let rank = 1; rank <= n; rank++) {
    const index = rank - 1;
    const frac = (n - rank) / (n - 1);
    postChaos.push({ index, rank, t: 1.0 + frac * 0.04, speed: 1, vel: 0 });
    finalRanks.set(index, pool[index]);
  }
  return { n, finishT: FINISH_T, finalRanks, postChaos };
}

describe('COMEBACK-STAGED-1 — where the director would stage him', () => {
  it('below the minimum field size nobody is staged — there is nothing to climb', () => {
    expect(stagedComebackRank(10)).toBeNull();
    expect(stagedComebackRank(19)).toBeNull();
  });

  it('from 20 to 99 racers the staging rank is 0.60 of the field', () => {
    expect(stagedComebackRank(20)).toBe(12);
    expect(stagedComebackRank(40)).toBe(24);
    expect(stagedComebackRank(60)).toBe(36);
  });

  it('from 100 racers it moves shallower, which is the only step the grid supports', () => {
    expect(stagedComebackRank(100)).toBe(50);
  });

  it('the staging rank is always outside the top 5 it must climb to', () => {
    for (const n of [20, 30, 40, 60, 100]) expect(stagedComebackRank(n)).toBeGreaterThan(5);
  });
});

describe('COMEBACK-STAGED-1 — ★ THE WALL: the staged curve is refused, and this pins why', () => {
  // `feasibleTiming` charges the DOWN leg (anchor → staging rank) against the SAME `maxRankRate` as
  // the UP leg (staging rank → top 5). A staged comeback is a round trip, so it costs about twice a
  // one-way climb — and a one-way deep climb already very nearly fills the budget.
  const drama = intensityToDrama(0.5, GENERATOR_CONFIG);

  it('a front racer staged at 0.60 of the field cannot get back by the B1 checkpoint', () => {
    const field = buildField({ n: 40 });
    const front = field.postChaos.find((p) => p.rank === 1);
    const feas = racerFeasibility(front, field.postChaos, field.finishT, GENERATOR_CONFIG);
    // The endpoint is reachable — it is the TIMING that refuses, and the two are different answers.
    expect(2).toBeGreaterThanOrEqual(feas.bestRank);
    expect(
      feasibleTiming(
        front.rank,
        stagedComebackRank(40),
        2,
        feas.maxRankRate,
        drama,
        GENERATOR_CONFIG
      )
    ).toBeNull();
  });

  it('★ the deepest staging that IS feasible sits around 0.3 of the field — too shallow to be a comeback', () => {
    const field = buildField({ n: 40 });
    const front = field.postChaos.find((p) => p.rank === 1);
    const feas = racerFeasibility(front, field.postChaos, field.finishT, GENERATOR_CONFIG);
    let deepest = null;
    for (let s = 2; s <= 40; s++) {
      if (feasibleTiming(front.rank, s, 2, feas.maxRankRate, drama, GENERATOR_CONFIG)) deepest = s;
    }
    expect(deepest).not.toBeNull();
    // Comfortably shallower than the staging the grid asks for, and inside the depth HOLD-GRID-1
    // measured as producing NO climb at all.
    expect(deepest).toBeLessThan(stagedComebackRank(40));
    expect(deepest / 40).toBeLessThan(0.4);
  });

  // ★ THE ASYMMETRY, ISOLATED — and it is the whole reason the owner's design is refused. The SAME
  // depth is affordable one way and unaffordable as a round trip, because `feasibleTiming` charges
  // the DOWN leg at the same `maxRankRate` as the UP leg. A racer already at rank 20 can climb to
  // the top 5; a racer at the front cannot be sent to rank 20 and brought back, though the climb he
  // would then make is identical.
  it('★ the SAME depth is feasible ONE WAY and refused as a ROUND TRIP', () => {
    const field = buildField({ n: 40 });
    const deep = field.postChaos.find((p) => p.rank === 20);
    const front = field.postChaos.find((p) => p.rank === 1);
    const feasDeep = racerFeasibility(deep, field.postChaos, field.finishT, GENERATOR_CONFIG);
    const feasFront = racerFeasibility(front, field.postChaos, field.finishT, GENERATOR_CONFIG);

    // ONE WAY — already at rank 20, climbing to 2: affordable.
    expect(feasibleTiming(20, 20, 2, feasDeep.maxRankRate, drama, GENERATOR_CONFIG)).not.toBeNull();

    // ROUND TRIP — staged from the front DOWN to rank 20 and back to 2: refused.
    expect(feasibleTiming(1, 20, 2, feasFront.maxRankRate, drama, GENERATOR_CONFIG)).toBeNull();
  });

  it('the budget the round trip is measured against is the B1 resolve checkpoint', () => {
    expect(resolveForBand(0, GENERATOR_CONFIG)).toBeGreaterThan(0.9);
  });
});

describe('COMEBACK-STAGED-1 — ★ THE FALL-BACK, which is what keeps the tree safe', () => {
  // ★ THE SABOTAGE THIS CATCHES: drop the fall-back in `heroCurveGenerator.js` — let a refused
  // staging `continue` instead of trying today's casting for that racer — and this goes red. That
  // is not cosmetic: `addSolo` refuses WITHOUT marking the racer used, so every pool member would be
  // consumed by a failed staging and NO hero would be cast from the B1 pool at all.
  // ★ THE FIRST VERSION OF THIS TEST WAS A FALSE GREEN AND THE SABOTAGE CAUGHT IT. It asserted
  // `heroCast.length > 1`, which the WINNER and the three B2 attackers satisfy on their own — both
  // are cast OUTSIDE the B1-pool loop, so the assertion passed with the fall-back removed and the
  // pool casting nobody. The discriminating quantity is the number of STANDARD (non-attacker)
  // heroes: 3 on the correct tree, 1 with the fall-back gone.
  it('a race whose staging is refused still casts its B1-POOL heroes, exactly as before', () => {
    const field = buildField({ n: 40, seed: 3 });
    const { heroCast } = generateHeroCurves({
      seed: 9,
      postChaos: field.postChaos,
      finalRanks: field.finalRanks,
      intensity: 0.9,
      finishT: field.finishT,
    });
    const standard = heroCast.filter((h) => h.role !== 'attacker-b2');
    // More than the winner alone — i.e. the pool loop actually contributed.
    expect(standard.length).toBeGreaterThan(1);
  });

  it('...and no comebacker is emitted from a staging that was refused', () => {
    const field = buildField({ n: 40, seed: 3 });
    const { curves } = generateHeroCurves({
      seed: 9,
      postChaos: field.postChaos,
      finalRanks: field.finalRanks,
      intensity: 0.9,
      finishT: field.finishT,
    });
    const staged = stagedComebackRank(40);
    // Any comebacker present came through today's path (already deep), never through the staging.
    const rankOf = new Map(field.postChaos.map((p) => [p.index, p.rank]));
    for (const c of curves.filter((x) => x.role === 'comebacker')) {
      expect(rankOf.get(c.index)).not.toBe(staged);
    }
  });
});
