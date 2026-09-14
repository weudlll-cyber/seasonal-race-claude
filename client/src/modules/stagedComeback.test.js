// ============================================================
// File:        stagedComeback.test.js
// Path:        client/src/modules/stagedComeback.test.js
// Project:     RaceArena — COMEBACK-STAGED-1
//
// WHAT THIS PINS: the director's staging rule, the SHAPE the comebacker is built from, and the wall
// that refused the shape he was built from before.
//
// ── HISTORY, BECAUSE IT IS WHY THE FILE LOOKS LIKE THIS ─────────────────────────────────────────
//
// COMEBACK-STAGED-1 (2026-09-11) built a staged comebacker as a ROUND TRIP — one curve carrying him
// DOWN to a staging rank and back UP to the top 5 — and it never fired: 0 of 180 races.
// COMEBACK-CONSTANT-DEFICIT-1 (2026-09-12) was briefed to fix that by waiving the min-jerk premium
// on the descent, MEASURED it, and found the premium was not the wall: no value of it, down to and
// including 1.0, cast him. Those measurements are still pinned below because they are the reason
// the shape changed, and a later reader who re-proposes the premium should find them first.
//
// DIRECTION-AUTHORITY-1 (2026-09-12) changed the SHAPE instead. The comebacker is now a HOLD-AND-
// RELEASE: ONE authored leg down to the staging rank, ending at `holdReleaseProgress`, after which
// the curve is over and he climbs back to his drawn place by racing. The round trip needed about
// 1.66x the runway that exists; the descent alone needs about half of its window.
//
// ★ SO THE TWO SABOTAGES THE EARLIER BRIEF ASKED FOR ARE NOW POSSIBLE AND ARE HERE — there IS a
// release to break. The note that used to stand in this header, saying they could not be written
// because no release existed, is retired with the shape it described.
//
// WHAT IT DELIBERATELY DOES NOT PIN: what the held comebacker ACHIEVES — places gained, top-5 rate,
// the pace he runs. Those are race outcomes over ten tracks and four field sizes; they live in the
// DIRECTION-AUTHORITY-1 report, measured, not in a unit test that could only restate one fixture.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  stagedComebackRank,
  feasibleTiming,
  heldTiming,
  holdWaypoints,
  racerFeasibility,
  intensityToDrama,
  generateHeroCurves,
  resolveForBand,
  checkFeasible,
  soloWaypoints,
  GENERATOR_CONFIG,
} from './heroCurveGenerator.js';
import { BAND_EDGES } from './racePlanner.js';
import {
  quinticHermite,
  computeTangents,
  makeHeroCurve,
  anchorHeroCurve,
} from './heroChoreography.js';

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

  it("at 40 racers it lands inside the owner's stated range of 13 to 20", () => {
    // ★ HIS RESTATEMENT, 2026-09-12: the staging rank sits around the end of the first third to the
    // start of the second of the field. At 40 racers he named 13-20 explicitly, so that range IS
    // the requirement and this is the test of it.
    expect(stagedComebackRank(40)).toBeGreaterThanOrEqual(13);
    expect(stagedComebackRank(40)).toBeLessThanOrEqual(20);
  });

  it('it SCALES with the field rather than stepping', () => {
    const ranks = [20, 40, 60, 100, 200].map(stagedComebackRank);
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]).toBeGreaterThan(ranks[i - 1]);
    for (const n of [40, 60, 100, 200]) {
      expect(stagedComebackRank(n) / n).toBeGreaterThan(0.3);
      expect(stagedComebackRank(n) / n).toBeLessThan(0.5);
    }
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
    // 24 is 0.60 of this field — the depth this test is NAMED for, written out rather than read
    // from `stagedComebackRank`, which now returns the shallower depth the owner restated.
    expect(2).toBeGreaterThanOrEqual(feas.bestRank);
    expect(feasibleTiming(front.rank, 24, 2, feas.rankRates, drama, GENERATOR_CONFIG)).toBeNull();
  });

  it('★ the deepest staging that IS feasible sits around 0.3 of the field — too shallow to be a comeback', () => {
    const field = buildField({ n: 40 });
    const front = field.postChaos.find((p) => p.rank === 1);
    const feas = racerFeasibility(front, field.postChaos, field.finishT, GENERATOR_CONFIG);
    let deepest = null;
    for (let s = 2; s <= 40; s++) {
      if (feasibleTiming(front.rank, s, 2, feas.rankRates, drama, GENERATOR_CONFIG)) deepest = s;
    }
    expect(deepest).not.toBeNull();
    // Comfortably shallower than the staging the grid asks for, and inside the depth HOLD-GRID-1
    // measured as producing NO climb at all.
    expect(deepest).toBeLessThan(24); // shallower than the 0.60 depth the round trip was asked for
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
    expect(feasibleTiming(20, 20, 2, feasDeep.rankRates, drama, GENERATOR_CONFIG)).not.toBeNull();

    // ROUND TRIP — staged from the front DOWN to rank 20 and back to 2: refused.
    expect(feasibleTiming(1, 20, 2, feasFront.rankRates, drama, GENERATOR_CONFIG)).toBeNull();
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

// ── ★ COMEBACK-CONSTANT-DEFICIT-1 — THE PREMIUM IS NOT THE WALL ─────────────────────────────────
//
// ★ HOW A HOLD IS TOLD FROM AN EXCURSION, and it is checkable rather than asserted. A leg's premium
// is its PEAK slope divided by its AVERAGE slope, and for the quintic Hermite this file's curves are
// built from, that ratio is a pure function of the leg's two END TANGENTS measured in units of the
// leg's own average slope m. `computeTangents` fixes those tangents from the waypoint list alone:
// the last point settles to 0, and an interior point takes the Catmull-Rom central difference. So
// for a three-point hero curve anchor → peak → final the sign test decides it:
//   · the two legs point in OPPOSITE directions (a genuine EXCURSION — the comebacker's staged round
//     trip, the attacker's climb-and-fall): the central difference is tiny against either leg's own
//     average, both legs are rest-bounded, and the realized premium is ~1.875;
//   · the two legs point the SAME way (a SUSTAINED move through a waypoint): the central difference
//     IS about the legs' average slope, the curve passes through at speed, and the premium falls
//     toward 1.0 — at exactly constant rate it is 1.0, because peak equals average.
// Both halves are measured below rather than described.
const premiumOf = (k0, k1) => {
  // max |d/dτ| of a unit leg (rise 1 over span 1, so its average slope is exactly 1).
  let peak = 0;
  for (let i = 0; i <= 4000; i++) {
    const t = i / 4000;
    const d =
      (quinticHermite(0, k0, 1, k1, t + 1e-6) - quinticHermite(0, k0, 1, k1, t - 1e-6)) / 2e-6;
    if (Math.abs(d) > peak) peak = Math.abs(d);
  }
  return peak;
};

describe('COMEBACK-CONSTANT-DEFICIT-1 — what the min-jerk premium actually is', () => {
  it('a REST-TO-REST leg peaks at 1.875x its average — the excursion the config names', () => {
    expect(premiumOf(0, 0)).toBeCloseTo(1.875, 3);
  });

  it('★ a CONSTANT-RATE leg has NO peak above its average — the premium there is exactly 1', () => {
    expect(premiumOf(1, 1)).toBeCloseTo(1.0, 6);
  });

  it('a leg that joins the next at speed costs ~1.51, between the two', () => {
    expect(premiumOf(0, 1)).toBeCloseTo(1.512, 2);
    expect(premiumOf(1, 0)).toBeCloseTo(1.512, 2);
  });

  it('★ the shipped 1.7 UNDER-prices the rest-to-rest leg its own comment describes', () => {
    // Not a safety hole: `checkFeasible` re-measures the realized curve against maxRankRate, and
    // `feasibleTiming` usually stretches the spans past their minimum. But the constant is not the
    // conservative over-charge the repair brief assumed it was — it is 9% below the true figure.
    expect(GENERATOR_CONFIG.minJerkPeakFactor).toBeLessThan(premiumOf(0, 0));
  });

  it('★ the sign test tells them apart: a turning point rests, a same-way peak passes through', () => {
    const tangentRatio = (pts) => {
      const tan = computeTangents(pts);
      const m1 = (pts[1].rank - pts[0].rank) / (pts[1].progress - pts[0].progress);
      return tan[1] / m1;
    };
    // EXCURSION — down to 18 then up to 3: the interior tangent is ~0 against the leg's own slope,
    // so both legs really are rest-bounded and really do owe the full premium.
    const excursion = tangentRatio([
      { progress: 0.15, rank: 5 },
      { progress: 0.42, rank: 18 },
      { progress: 0.7, rank: 3 },
    ]);
    expect(Math.abs(excursion)).toBeLessThan(0.2);
    // SUSTAINED — 3 → 12 → 20, all one way: the interior tangent IS the leg's slope, so the curve
    // sweeps through and the premium is near 1.
    const sustained = tangentRatio([
      { progress: 0.15, rank: 3 },
      { progress: 0.42, rank: 12 },
      { progress: 0.7, rank: 20 },
    ]);
    expect(sustained).toBeGreaterThan(0.8);
    expect(sustained).toBeLessThan(1.2);
  });
});

describe('COMEBACK-CONSTANT-DEFICIT-1 — ★ THE COUNTERFACTUAL: waiving it does not open the wall', () => {
  const drama = intensityToDrama(0.5, GENERATOR_CONFIG);
  // DEPTH 24 — 0.60 of the field — is pinned here DELIBERATELY. It is the depth the round trip was
  // measured against, and NOT the shallower depth that ships today. The finding is about the SHAPE:
  // an authored round trip to a depth worth climbing from cannot be bought with the premium at any
  // price, which is why the shipped comebacker is a HOLD-AND-RELEASE and not a round trip.
  const stagedTiming = (premium, depth = 24) => {
    const field = buildField({ n: 40 });
    const front = field.postChaos.find((p) => p.rank === 1);
    const feas = racerFeasibility(front, field.postChaos, field.finishT, GENERATOR_CONFIG);
    const config = { ...GENERATOR_CONFIG, minJerkPeakFactor: premium };
    return {
      config,
      feas,
      front,
      depth,
      timing: feasibleTiming(front.rank, depth, 2, feas.rankRates, drama, config),
    };
  };

  it('★ at premium 1.0 — no premium at all — the staged round trip is STILL refused', () => {
    // This is the whole finding. The brief's repair was to stop charging the premium for the
    // sustained leg; removing it from BOTH legs is strictly more generous than that, and the gate
    // still says no. The round trip does not overrun its runway by a premium — it overruns it by
    // the better part of a race.
    for (const premium of [1.7, 1.5, 1.3, 1.0]) {
      expect(stagedTiming(premium).timing).toBeNull();
    }
  });

  it('★ and where a smaller premium DOES pass the runway test, checkFeasible refuses the curve', () => {
    // Below 1.0 the allocation buys time it has no physical right to: the realized curve is then
    // steeper than the racer's own density rank-rate, and the exact downstream check catches it.
    // So the premium cannot be lowered into a cast — it only moves the refusal one gate later.
    const { config, feas, front, timing, depth } = stagedTiming(0.5);
    expect(timing).not.toBeNull();
    const curve = anchorHeroCurve(
      makeHeroCurve(soloWaypoints({ peakRank: depth, finalRank: 2, ...timing }, config)),
      config.anchorProgress,
      front.rank,
      0
    );
    expect(checkFeasible(curve, feas.rankRates)).toBe(false);
  });
});

// ── ★ DIRECTION-AUTHORITY-1 — THE SHIPPED SHAPE: HOLD, THEN RELEASE ─────────────────────────────
//
// ★ THE PROPERTY A READER CAN CHECK. A held hero has ONE authored leg — down to the staging rank,
// arriving at `holdReleaseProgress` — and the curve ENDS there. Everything downstream reads that
// ending rather than a role name: the curve carries `releaseAt`, the positive-budget check is
// skipped for it because it is not trying to deliver anyone into a band, and the planner hands the
// racer back to his drawn rank from that progress on.
describe('DIRECTION-AUTHORITY-1 — the held comebacker', () => {
  const ratesOf = (field, rank) =>
    racerFeasibility(
      field.postChaos.find((p) => p.rank === rank),
      field.postChaos,
      field.finishT,
      GENERATOR_CONFIG
    ).rankRates;

  it('the descent ALONE fits its window, where the round trip did not', () => {
    const field = buildField({ n: 40 });
    const rates = ratesOf(field, 5);
    expect(heldTiming(5, stagedComebackRank(40), rates, GENERATOR_CONFIG)).not.toBeNull();
  });

  it('★ the release leaves the last 30% of the race for the climb', () => {
    // The owner named 0.70. It is pinned as a NUMBER rather than against itself, because a test
    // that compared the config to the config would pass at any value and this is exactly the thing
    // a later change is most likely to move by accident. The 30% is the load-bearing half:
    // PACE-DEFICIT-1 measured a racer released at 0.70 regaining 18 to 64 places in that window, so
    // shortening it takes the climb away and the hold stops being a comeback.
    expect(GENERATOR_CONFIG.holdReleaseProgress).toBeCloseTo(0.7, 10);
    expect(1 - GENERATOR_CONFIG.holdReleaseProgress).toBeGreaterThanOrEqual(0.3);
    // and it must leave the hold a real window too, or there is nothing to hold him through
    expect(GENERATOR_CONFIG.holdReleaseProgress - GENERATOR_CONFIG.anchorProgress).toBeGreaterThan(
      0.4
    );
  });

  it('★ it ends AT the release, which is what makes the climb a raced one', () => {
    const field = buildField({ n: 40 });
    const t = heldTiming(5, stagedComebackRank(40), ratesOf(field, 5), GENERATOR_CONFIG);
    expect(t.releaseProgress).toBe(GENERATOR_CONFIG.holdReleaseProgress);
    const wp = holdWaypoints(t, GENERATOR_CONFIG);
    expect(wp).toHaveLength(2); // ONE leg. A second waypoint would be an authored climb.
    expect(wp[wp.length - 1].progress).toBe(GENERATOR_CONFIG.holdReleaseProgress);
    expect(wp[wp.length - 1].rank).toBe(stagedComebackRank(40));
  });

  it('a hold that is not a descent is refused — the shape is checked, not the caller', () => {
    const field = buildField({ n: 40 });
    const rates = ratesOf(field, 20);
    expect(heldTiming(20, 8, rates, GENERATOR_CONFIG)).toBeNull(); // 20 -> 8 is a CLIMB
    expect(heldTiming(20, 20, rates, GENERATOR_CONFIG)).toBeNull(); // and this holds nothing
  });

  it('★ a descent too deep for its window is still refused — no limit was relaxed', () => {
    const field = buildField({ n: 40 });
    // A rate low enough that even one leg cannot fit: the gate still says no, so the shape change
    // did not turn the feasibility test off.
    expect(heldTiming(1, 40, { climb: 2, drop: 2 }, GENERATOR_CONFIG)).toBeNull();
  });

  it('the emitted curve carries its release, and ONLY held curves do', () => {
    const field = buildField({ n: 40 });
    const { curves } = generateHeroCurves({
      seed: 7,
      postChaos: field.postChaos,
      finalRanks: field.finalRanks,
      intensity: 0.5,
      finishT: field.finishT,
    });
    const held = curves.filter((c) => c.releaseAt != null);
    expect(held.length).toBeGreaterThan(0);
    for (const c of held) {
      expect(c.role).toBe('comebacker');
      expect(c.releaseAt).toBe(GENERATOR_CONFIG.holdReleaseProgress);
      const pts = c.curve.points;
      expect(pts[pts.length - 1].progress).toBe(GENERATOR_CONFIG.holdReleaseProgress);
      // and he really is DEEP when released — that is the whole point of holding him
      expect(pts[pts.length - 1].rank).toBeGreaterThan(BAND_EDGES[0]);
    }
    // every other cast hero still resolves on its own curve
    for (const c of curves.filter((x) => x.releaseAt == null)) {
      expect(c.curve.points[c.curve.points.length - 1].progress).toBeGreaterThan(
        GENERATOR_CONFIG.holdReleaseProgress
      );
    }
  });

  it('the other roles keep their casting', () => {
    const field = buildField({ n: 40 });
    const { curves } = generateHeroCurves({
      seed: 7,
      postChaos: field.postChaos,
      finalRanks: field.finalRanks,
      intensity: 0.5,
      finishT: field.finishT,
    });
    expect(curves.filter((c) => c.role === 'attacker-b2').length).toBeGreaterThan(0);
    expect(curves.length).toBeGreaterThan(2);
  });
});
