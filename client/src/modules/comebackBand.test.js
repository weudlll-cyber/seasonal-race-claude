// ============================================================
// File:        comebackBand.test.js
// Path:        client/src/modules/comebackBand.test.js
// Project:     RaceArena — COMEBACK-BAND-1
//
// WHAT THIS PINS: which racers the plan may call a `comebacker`. The shipped rule used to be "his
// post-chaos rank exceeds the front cluster", and the front cluster is capped at rank 5 — so a
// racer going 6th to 3rd was cast, announced to the camera, and shown. The owner watched five races,
// saw four such shots, and said those are not comebacks.
//
// ★ THE SABOTAGE THIS FILE EXISTS TO CATCH is the old band coming back: restore `p.rank > cr` as the
// whole test at `heroCurveGenerator.js`'s B1-pool site and the first test below goes red, because a
// racer at post-chaos rank 6 of 40 is exactly what the old rule cast and the new one refuses.
//
// WHAT IT DELIBERATELY DOES NOT PIN: that the comebacker ARRIVES in the top 5. He does not, reliably
// — measured on the built rule AND on the tree before it, so that is a pre-existing limit of the
// curve machinery rather than a property this rule can assert. COMEBACK-BAND-1 reports it with
// numbers; a test asserting it would be red on both trees and would say nothing about this change.
// ============================================================

import { describe, it, expect } from 'vitest';
import { generateHeroCurves, comebackerMinRank } from './heroCurveGenerator.js';

const FINISH_T = 2;
const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** The same deterministic field the generator's own suite builds, bunched so deep climbs are feasible. */
function buildField({ n = 40, seed = 1, overrides = {} } = {}) {
  const r = mulberry32(seed);
  const finalPool = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = finalPool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [finalPool[i], finalPool[j]] = [finalPool[j], finalPool[i]];
  }
  const finalRanks = new Map();
  const postChaos = [];
  for (let rank = 1; rank <= n; rank++) {
    const index = rank - 1;
    const frac = (n - rank) / (n - 1);
    postChaos.push({ index, rank, t: 1.0 + frac * 0.04, speed: 1, vel: 0 });
    finalRanks.set(index, finalPool[index]);
  }
  for (const [idxStr, fr] of Object.entries(overrides)) finalRanks.set(Number(idxStr), fr);
  return { n, finishT: FINISH_T, finalRanks, postChaos };
}
const indexAtRank = (postChaos, rank) => postChaos.find((p) => p.rank === rank).index;

/** Roles the generator emitted, by racer index. */
function rolesOf({ n, seed = 9, overrides = {} }) {
  const field = buildField({ n, seed: 3, overrides });
  const { curves } = generateHeroCurves({
    seed,
    postChaos: field.postChaos,
    finalRanks: field.finalRanks,
    intensity: 0.9,
    finishT: field.finishT,
  });
  return { field, curves, roleOf: new Map(curves.map((c) => [c.index, c.role])) };
}

describe('COMEBACK-BAND-1 — comebackerMinRank is the band, and it scales with the field', () => {
  it('below the minimum field size there is no band at all — nobody is cast', () => {
    expect(comebackerMinRank(10)).toBeNull();
    expect(comebackerMinRank(19)).toBeNull();
  });

  it('from 20 to 59 racers the band is half the field', () => {
    expect(comebackerMinRank(20)).toBe(10);
    expect(comebackerMinRank(30)).toBe(15);
    expect(comebackerMinRank(40)).toBe(20);
  });

  it('from 60 racers the band moves up to the third band, and no further', () => {
    expect(comebackerMinRank(60)).toBe(24);
    expect(comebackerMinRank(100)).toBe(40);
  });

  it('the band never lands inside the top 5, which is what it must climb TO', () => {
    for (const n of [20, 30, 40, 60, 100]) expect(comebackerMinRank(n)).toBeGreaterThan(5);
  });
});

describe('COMEBACK-BAND-1 — who the plan may call a comebacker', () => {
  // ★ THE SABOTAGE CATCHER. Restore `p.rank > cr` as the whole test and this goes red: rank 6 of 40
  // is precisely the racer the old rule cast and the owner rejected.
  it('a racer just behind the front group is NEVER cast as a comebacker', () => {
    const shallowIdx = indexAtRank(buildField({ n: 40, seed: 3 }).postChaos, 6);
    const { roleOf } = rolesOf({ n: 40, overrides: { [shallowIdx]: 3 } });
    expect(roleOf.get(shallowIdx)).not.toBe('comebacker');
  });

  it('...and neither is anyone else above the band, across the whole cast', () => {
    const { field, curves } = rolesOf({ n: 40, overrides: {} });
    const rankOf = new Map(field.postChaos.map((p) => [p.index, p.rank]));
    const min = comebackerMinRank(40);
    for (const c of curves) {
      if (c.role !== 'comebacker') continue;
      expect(rankOf.get(c.index)).toBeGreaterThanOrEqual(min);
    }
  });

  it('a racer AT the band is admitted, so the rule is not vacuous', () => {
    const deepIdx = indexAtRank(buildField({ n: 40, seed: 3 }).postChaos, comebackerMinRank(40));
    const { roleOf } = rolesOf({ n: 40, overrides: { [deepIdx]: 3 } });
    expect(roleOf.get(deepIdx)).toBe('comebacker');
  });

  it('in a field too small to climb, no comebacker is cast at all — the answer, not a gap', () => {
    const { curves } = rolesOf({ n: 10, overrides: {} });
    expect(curves.filter((c) => c.role === 'comebacker')).toEqual([]);
  });

  it('the other roles are untouched — sovereign-lead is still cast from the front', () => {
    const { field, curves } = rolesOf({ n: 40, overrides: {} });
    const rankOf = new Map(field.postChaos.map((p) => [p.index, p.rank]));
    const sovereigns = curves.filter((c) => c.role === 'sovereign-lead');
    expect(sovereigns.length).toBeGreaterThan(0);
    // A sovereign-lead is a FRONT racer; the band rule must not have pushed anyone deep into it.
    for (const s of sovereigns) expect(rankOf.get(s.index)).toBeLessThan(comebackerMinRank(40));
  });
});
