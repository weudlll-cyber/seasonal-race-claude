// ============================================================
// File:        heroCurveGenerator.test.js
// Description: Unit tests for the pure v4 hero-curve generator — DENSITY feasibility (incl. the
//              explicit "20→3 cross-band comeback generatable when bunched, refused when spread"),
//              positive-budget, endpoint-fairness invariant, faller hold+drop feasibility + ~1/3
//              cadence, separation, intensity monotonicity + per-race clamp, camera-plan shape, each
//              named owner situation, and the deterministic full-output fingerprint.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  GENERATOR_CONFIG,
  bandOfRank,
  bandBounds,
  bandMultiset,
  racerFeasibility,
  sameBandSwap,
  intensityToDrama,
  clampIntensityToBudget,
  feasibleTiming,
  soloWaypoints,
  relationalWaypoints,
  checkFeasible,
  checkPositiveBudget,
  checkSeparation,
  checkFieldContinuity,
  resolveForBand,
  shouldCastFaller,
  generateHeroCurves,
} from './heroCurveGenerator.js';
import { makeHeroCurve, anchorHeroCurve, sampleHeroCurve } from './heroChoreography.js';
import { mulberry32 } from './racePlanner.js';

const FINISH_T = 2; // closed-track lap bucket
// Build a deterministic n-racer field. density: 'bunched' packs all t into a tiny range (a racer can
// pass many → deep comebacks feasible); 'spread' distributes t over the whole track (passes few).
// rank r ↔ t (rank 1 = highest t). finalRanks is a seeded permutation; optional overrides pin a
// specific racer's final rank (e.g. put final-rank 3 on the post-chaos-rank-20 racer).
function buildField({ n = 40, density = 'bunched', seed = 1, overrides = {} } = {}) {
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
    const frac = (n - rank) / (n - 1); // rank 1 → 1 (front), rank n → 0 (back)
    const t = density === 'bunched' ? 1.0 + frac * 0.04 : 0.2 + frac * 1.6;
    postChaos.push({ index, rank, t, speed: 1, vel: 0 });
    finalRanks.set(index, finalPool[index]);
  }
  for (const [idxStr, fr] of Object.entries(overrides)) finalRanks.set(Number(idxStr), fr);
  return { n, finishT: FINISH_T, finalRanks, postChaos };
}
const indexAtRank = (postChaos, rank) => postChaos.find((p) => p.rank === rank).index;

describe('band helpers', () => {
  it('bandOfRank maps to fairness bands [5,15,25,40]; bandBounds inverts', () => {
    expect([1, 5, 6, 16, 41].map(bandOfRank)).toEqual([0, 0, 1, 2, 4]);
    expect(bandBounds(0)).toEqual([1, 5]);
    expect(bandBounds(2)).toEqual([16, 25]);
  });
});

describe('DENSITY feasibility — the core correction (20→3 depends on bunching)', () => {
  it('BUNCHED field: a post-chaos rank-20 racer CAN reach rank 3 (deep cross-band comeback feasible)', () => {
    const { postChaos, finishT } = buildField({ density: 'bunched' });
    const racer = postChaos.find((p) => p.rank === 20);
    const f = racerFeasibility(racer, postChaos, finishT);
    expect(f.bestRank).toBeLessThanOrEqual(3); // rank 3 is within reach
    expect(f.worstRank).toBeGreaterThan(20);
  });
  it('SPREAD field: the SAME rank-20 racer canNOT reach rank 3 (refused)', () => {
    const { postChaos, finishT } = buildField({ density: 'spread' });
    const racer = postChaos.find((p) => p.rank === 20);
    const f = racerFeasibility(racer, postChaos, finishT);
    expect(f.bestRank).toBeGreaterThan(3); // rank 3 is NOT reachable → a 20→3 curve is refused
  });
});

describe('generateHeroCurves — cross-band comeback generatable / refused', () => {
  it('BUNCHED: a deep-post-chaos B1 racer is emitted as a feasible CROSS-BAND comeback curve', () => {
    // put final rank 3 on the racer sitting at post-chaos rank 20 (deep) → a 20→3 comebacker.
    const base = buildField({ density: 'bunched', seed: 3 });
    const deepIdx = indexAtRank(base.postChaos, 20);
    const field = buildField({ density: 'bunched', seed: 3, overrides: { [deepIdx]: 3 } });
    const { curves } = generateHeroCurves({
      seed: 9,
      postChaos: field.postChaos,
      finalRanks: field.finalRanks,
      intensity: 0.9,
      finishT: field.finishT,
    });
    const comeback = curves.find((c) => c.index === deepIdx);
    expect(comeback).toBeTruthy();
    // spans multiple bands: starts deep (band ≥2), ends B1
    const startRank = comeback.curve.points[0].rank;
    const endRank = comeback.curve.points[comeback.curve.points.length - 1].rank;
    expect(bandOfRank(startRank)).toBeGreaterThanOrEqual(2);
    expect(bandOfRank(endRank)).toBe(0);
  });
  it('SPREAD: the same deep→B1 comeback is REFUSED (no curve emitted for that racer)', () => {
    const base = buildField({ density: 'spread', seed: 3 });
    const deepIdx = indexAtRank(base.postChaos, 20);
    const field = buildField({ density: 'spread', seed: 3, overrides: { [deepIdx]: 3 } });
    const { curves } = generateHeroCurves({
      seed: 9,
      postChaos: field.postChaos,
      finalRanks: field.finalRanks,
      intensity: 0.9,
      finishT: field.finishT,
    });
    expect(curves.find((c) => c.index === deepIdx)).toBeFalsy();
  });
});

describe('endpoint-fairness invariant (A2/A4)', () => {
  const { finalRanks } = buildField({ seed: 5 });
  it('same-band swap preserves the final-band multiset + valid permutation; winner stays B1', () => {
    const a = [...finalRanks.entries()].find(([, r]) => r === 2)[0];
    const b = [...finalRanks.entries()].find(([, r]) => r === 4)[0];
    const before = bandMultiset(finalRanks);
    const next = sameBandSwap(finalRanks, a, b);
    expect(bandMultiset(next)).toEqual(before);
    expect([...next.values()].sort((x, y) => x - y)).toEqual(
      Array.from({ length: 40 }, (_, i) => i + 1)
    );
    expect([...next.values()].includes(1)).toBe(true);
  });
  it('cross-band swap is refused', () => {
    const a = [...finalRanks.entries()].find(([, r]) => r === 3)[0];
    const b = [...finalRanks.entries()].find(([, r]) => r === 20)[0];
    expect(() => sameBandSwap(finalRanks, a, b)).toThrow();
  });
  it('generateHeroCurves does not mutate finalRanks', () => {
    const { postChaos, finalRanks: fr, finishT } = buildField({ seed: 6 });
    const snap = new Map(fr);
    generateHeroCurves({ seed: 2, postChaos, finalRanks: fr, intensity: 0.6, finishT });
    expect([...fr.entries()]).toEqual([...snap.entries()]);
  });
});

describe('positive handoff budget + feasibility checks', () => {
  it('checkFeasible refuses a slope above the density rank-rate, accepts one below', () => {
    const steep = anchorHeroCurve(
      makeHeroCurve([
        { progress: 0.25, rank: 1 },
        { progress: 0.3, rank: 40 },
      ]),
      0.25,
      1,
      0
    );
    const gentle = anchorHeroCurve(
      makeHeroCurve([
        { progress: 0.25, rank: 8 },
        { progress: 1.0, rank: 3 },
      ]),
      0.25,
      8,
      0
    );
    expect(checkFeasible(steep, 20)).toBe(false);
    expect(checkFeasible(gentle, 20)).toBe(true);
  });
  it('checkPositiveBudget rejects a line-only rescue, accepts resolving by the checkpoint', () => {
    const rescue = anchorHeroCurve(
      makeHeroCurve([
        { progress: 0.25, rank: 12 },
        { progress: 0.99, rank: 12 },
        { progress: 1.0, rank: 3 },
      ]),
      0.25,
      12,
      0
    );
    const early = anchorHeroCurve(
      makeHeroCurve([
        { progress: 0.25, rank: 12 },
        { progress: 0.85, rank: 3 },
        { progress: 1.0, rank: 3 },
      ]),
      0.25,
      12,
      0
    );
    expect(checkPositiveBudget(rescue, 20)).toBe(false);
    expect(checkPositiveBudget(early, 20)).toBe(true);
  });
  it('feasibleTiming returns null when the moves cannot fit before the budget checkpoint', () => {
    expect(feasibleTiming(1, 40, 1, 2, intensityToDrama(0.5))).toBeNull(); // rate 2 too slow for 39-rank moves
    expect(feasibleTiming(8, 8, 3, 30, intensityToDrama(0.5))).not.toBeNull();
  });
});

describe('separation', () => {
  it('allows transient crossings but forbids sustained coincidence', () => {
    const c1 = anchorHeroCurve(
      makeHeroCurve([
        { progress: 0.25, rank: 5 },
        { progress: 1.0, rank: 5 },
      ]),
      0.25,
      5,
      0
    );
    const c2 = anchorHeroCurve(
      makeHeroCurve([
        { progress: 0.25, rank: 5 },
        { progress: 1.0, rank: 5 },
      ]),
      0.25,
      5,
      0
    );
    const c3 = anchorHeroCurve(
      makeHeroCurve([
        { progress: 0.25, rank: 12 },
        { progress: 1.0, rank: 12 },
      ]),
      0.25,
      12,
      0
    );
    expect(checkSeparation([c1, c2])).toBe(false);
    expect(checkSeparation([c1, c3])).toBe(true);
  });
});

describe('named owner situations as archetype parameterizations', () => {
  const anchor = (wp, rank) => anchorHeroCurve(makeHeroCurve(wp), 0.25, rank, 0);
  it('comebacker / sovereign-lead / faller are SOLO parameterizations (feasible at a bunched-field rate)', () => {
    // Spans sized so the min-jerk PEAK slope stays under the checked rate (a bunched field's density rate).
    expect(
      checkFeasible(
        anchor(
          soloWaypoints({ peakRank: 12, peakProgress: 0.35, finalRank: 2, resolveProgress: 0.9 }),
          12
        ),
        50
      )
    ).toBe(true); // comeback
    expect(
      checkFeasible(
        anchor(
          soloWaypoints({ peakRank: 1, peakProgress: 0.5, finalRank: 1, resolveProgress: 0.9 }),
          1
        ),
        50
      )
    ).toBe(true); // sovereign
    expect(
      checkFeasible(
        anchor(
          soloWaypoints({ peakRank: 2, peakProgress: 0.3, finalRank: 18, resolveProgress: 0.9 }),
          2
        ),
        50
      )
    ).toBe(true); // faller
  });
  it('photo-finish + battle-collapse are RELATIONAL, two separated curves', () => {
    const photo = relationalWaypoints({
      mode: 'photo',
      convergeProgress: 0.8,
      frontRank: 2,
      finalA: 3,
      finalB: 5,
    });
    expect(checkSeparation([anchor(photo.a, 2), anchor(photo.b, 4)])).toBe(true);
    const battle = relationalWaypoints({
      mode: 'battle-collapse',
      convergeProgress: 0.6,
      frontRank: 2,
      finalA: 2,
      finalB: 20,
    });
    expect(checkSeparation([anchor(battle.a, 2), anchor(battle.b, 4)])).toBe(true);
  });
});

describe('faller (A7): feasibility + ~1/3 cadence', () => {
  it('shouldCastFaller fires on ~1/3 of seeds (statistical)', () => {
    let fired = 0;
    const N = 600;
    for (let s = 1; s <= N; s++) if (shouldCastFaller(s)) fired++;
    expect(fired / N).toBeGreaterThan(0.22);
    expect(fired / N).toBeLessThan(0.45);
  });
  it('a cast faller has a deep final band AND both hold(front) + drop are feasible', () => {
    // bunched field so a front racer can feasibly drop deep; force a faller seed.
    const base = buildField({ density: 'bunched', seed: 8 });
    const frontIdx = indexAtRank(base.postChaos, 2);
    const field = buildField({ density: 'bunched', seed: 8, overrides: { [frontIdx]: 14 } }); // front→B2, a drop feasible within B2's (earlier) staggered resolve
    // find a seed where the faller cadence fires
    let g = null;
    for (let s = 1; s <= 50; s++) {
      if (!shouldCastFaller(s)) continue;
      g = generateHeroCurves({
        seed: s,
        postChaos: field.postChaos,
        finalRanks: field.finalRanks,
        intensity: 1.0,
        finishT: field.finishT,
      });
      if (g.heroCast.some((h) => h.role === 'faller')) break;
    }
    const faller = g.heroCast.find((h) => h.role === 'faller');
    expect(faller).toBeTruthy();
    expect(bandOfRank(faller.finalRank)).toBeGreaterThanOrEqual(GENERATOR_CONFIG.fallerDeepBandMin);
  });
});

describe('intensity monotonicity + per-race clamp', () => {
  it('drama rises monotonically with intensity', () => {
    const lo = intensityToDrama(0.1);
    const hi = intensityToDrama(0.9);
    expect(hi.resolveProgress).toBeGreaterThan(lo.resolveProgress);
    expect(hi.peakDepthFrac).toBeGreaterThan(lo.peakDepthFrac);
    expect(hi.nHeroes).toBeGreaterThanOrEqual(lo.nHeroes);
  });
  it('per-race clamp: realized ≤ requested; a winner stuck deep in a SPREAD field clamps down', () => {
    const { postChaos, finalRanks, finishT } = buildField({ density: 'spread', seed: 2 });
    // winner (final 1) forced onto the deep post-chaos rank-25 racer → deep peak infeasible
    const deepIdx = indexAtRank(postChaos, 25);
    finalRanks.set([...finalRanks.entries()].find(([, r]) => r === 1)[0], 7); // free up rank 1
    finalRanks.set(deepIdx, 1);
    const realized = clampIntensityToBudget(1.0, postChaos, finalRanks, finishT);
    expect(realized).toBeLessThanOrEqual(1.0);
  });
});

describe('camera plan (A8)', () => {
  it('emits a b1Indices Set (backward-compatible) + per-hero role & beats', () => {
    const { postChaos, finalRanks, finishT } = buildField({ seed: 4 });
    const { cameraPlan } = generateHeroCurves({
      seed: 3,
      postChaos,
      finalRanks,
      intensity: 0.8,
      finishT,
    });
    expect(cameraPlan.b1Indices instanceof Set).toBe(true);
    expect([...cameraPlan.b1Indices].every((i) => finalRanks.get(i) <= 5)).toBe(true);
    for (const h of cameraPlan.heroes) {
      expect(typeof h.role).toBe('string');
      expect(Array.isArray(h.beats)).toBe(true);
      expect(h.beats[0].event).toBe('anchor');
    }
  });
});

describe('orchestrator — determinism, cast size, all-emitted-feasible', () => {
  const { postChaos, finalRanks, finishT } = buildField({ density: 'bunched', seed: 7 });
  // Relocate the winner (final rank 1) onto a moderate post-chaos rank (8) via a valid permutation
  // swap, so its comeback-to-P1 is within the positive-budget window (a rank->1 climb from >~20 is
  // physically infeasible even when bunched). Keeps finalRanks a permutation.
  {
    const wIdx = indexAtRank(postChaos, 8);
    const oldWinner = [...finalRanks.entries()].find(([, r]) => r === 1)[0];
    const wOld = finalRanks.get(wIdx);
    finalRanks.set(oldWinner, wOld);
    finalRanks.set(wIdx, 1);
  }
  it('DETERMINISTIC: identical input → identical output', () => {
    const stable = (o) => JSON.stringify(o, (k, v) => (v instanceof Set ? [...v] : v));
    const a = generateHeroCurves({ seed: 123, postChaos, finalRanks, intensity: 0.7, finishT });
    const b = generateHeroCurves({ seed: 123, postChaos, finalRanks, intensity: 0.7, finishT });
    expect(stable(a)).toBe(stable(b));
  });
  it('casts within [minHeroes,maxHeroes] incl. the winner; every emitted curve feasible + positive-budget', () => {
    for (const seed of [1, 2, 7, 42, 99]) {
      const g = generateHeroCurves({ seed, postChaos, finalRanks, intensity: 0.8, finishT });
      expect(g.heroCast.length).toBeLessThanOrEqual(GENERATOR_CONFIG.maxHeroes);
      const winnerIdx = [...finalRanks.entries()].find(([, r]) => r === 1)[0];
      expect(g.heroCast.some((h) => h.index === winnerIdx)).toBe(true);
      for (const { curve } of g.curves) {
        const st = postChaos.find((p) => p.index === g.curves.find((c) => c.curve === curve).index);
        const f = racerFeasibility(st, postChaos, finishT);
        expect(checkFeasible(curve, f.maxRankRate)).toBe(true);
        expect(checkPositiveBudget(curve, f.maxRankRate)).toBe(true);
      }
    }
  });
  it('emitted hero curves are mutually separated', () => {
    const { curves } = generateHeroCurves({
      seed: 8,
      postChaos,
      finalRanks,
      intensity: 0.9,
      finishT,
    });
    expect(checkSeparation(curves.map((c) => c.curve))).toBe(true);
  });
});

describe('Step 4 — late release + staggered per-band resolve + hole guard', () => {
  it('resolveForBand staggers: B1 held to release (latest), deeper bands resolve earlier', () => {
    const r = [0, 1, 2, 3, 4].map((b) => resolveForBand(b));
    expect(r[0]).toBe(GENERATOR_CONFIG.releaseProgress); // B1 = release (latest)
    // Strictly monotone decreasing from B1 down to B5: the deeper the band, the earlier it resolves.
    for (let i = 1; i < r.length; i++) expect(r[i]).toBeLessThan(r[i - 1]);
  });

  it('per-band resolve is DevScreen-injectable via config (release + bandResolve override)', () => {
    const cfg = {
      ...GENERATOR_CONFIG,
      releaseProgress: 0.9,
      bandResolve: [0.9, 0.7, 0.6, 0.55, 0.5],
    };
    expect(resolveForBand(0, cfg)).toBe(0.9);
    expect(resolveForBand(2, cfg)).toBe(0.6);
  });

  it('B1 heroes still CONTEST at the release point — their curve is inside B1 at releaseProgress, not parked at rank 1', () => {
    const {
      postChaos: pc,
      finalRanks: fr,
      finishT: ft,
    } = buildField({ density: 'bunched', seed: 21 });
    const { curves } = generateHeroCurves({
      seed: 21,
      postChaos: pc,
      finalRanks: fr,
      intensity: 1.0,
      finishT: ft,
    });
    const b1 = curves.filter((c) => fr.get(c.index) <= 5);
    expect(b1.length).toBeGreaterThan(0);
    for (const c of b1) {
      const atRelease = sampleHeroCurve(c.curve, GENERATOR_CONFIG.releaseProgress);
      expect(bandOfRank(Math.round(atRelease))).toBe(0); // resolved INTO B1 by the release …
      expect(atRelease).toBeGreaterThan(1.4); // … but held in the tight front CLUSTER, not alone at rank 1
    }
  });

  it('small-gap winner: the assigned winner (final 1) is cast into the front CLUSTER (rank ≥2), leaving rank 1 to the natural run-out', () => {
    const {
      postChaos: pc,
      finalRanks: fr,
      finishT: ft,
    } = buildField({ density: 'bunched', seed: 33 });
    // Put the winner on a mid post-chaos rank so it is a comeback (its cluster endpoint is the point).
    const wIdx = indexAtRank(pc, 10);
    const oldW = [...fr.entries()].find(([, r]) => r === 1)[0];
    fr.set(oldW, fr.get(wIdx));
    fr.set(wIdx, 1);
    const g = generateHeroCurves({
      seed: 33,
      postChaos: pc,
      finalRanks: fr,
      intensity: 1.0,
      finishT: ft,
    });
    const winner = g.heroCast.find((h) => h.index === wIdx);
    expect(winner.finalRank).toBeGreaterThanOrEqual(2); // clustered, never steered to a lone rank-1 cruise
    expect(bandOfRank(winner.finalRank)).toBe(0); // still fair — inside B1
  });

  it('hole guard PASSES a normal (sparse-hero) field — the projected pack fills between heroes', () => {
    const {
      postChaos: pc,
      finalRanks: fr,
      finishT: ft,
    } = buildField({ density: 'bunched', seed: 21 });
    const { curves } = generateHeroCurves({
      seed: 21,
      postChaos: pc,
      finalRanks: fr,
      intensity: 1.0,
      finishT: ft,
    });
    expect(curves.length).toBeGreaterThan(0); // regression: the old front/back-anchor guard rejected ALL
    const ok = checkFieldContinuity(
      curves.map((c) => c.curve),
      curves.map((c) => c.index),
      pc,
      fr
    );
    expect(ok).toBe(true);
  });

  it('hole guard is threshold-driven and CAN fire: the field a normal config accepts, a strict maxHoleFrac rejects', () => {
    const {
      postChaos: pc,
      finalRanks: fr,
      finishT: ft,
    } = buildField({ density: 'bunched', seed: 21 });
    const { curves } = generateHeroCurves({
      seed: 21,
      postChaos: pc,
      finalRanks: fr,
      intensity: 1.0,
      finishT: ft,
    });
    const cv = curves.map((c) => c.curve);
    const ci = curves.map((c) => c.index);
    expect(checkFieldContinuity(cv, ci, pc, fr)).toBe(true); // default 0.55 → dense field passes
    // A pathologically strict threshold (< the ~1-rank spacing of a full 40-racer field) must reject,
    // proving the guard actually evaluates the gap and is not a no-op.
    expect(checkFieldContinuity(cv, ci, pc, fr, { ...GENERATOR_CONFIG, maxHoleFrac: 0.01 })).toBe(
      false
    );
  });
});
