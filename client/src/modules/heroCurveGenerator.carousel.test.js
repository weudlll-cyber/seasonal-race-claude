// ============================================================
// heroCurveGenerator.carousel.test.js — B1 LEAD CAROUSEL (C1) unit tests.
//
// The carousel's fairness argument is STRUCTURAL: because the rotation is a cyclic permutation over
// slots 1..K with every waypoint inside B1, it can only ever reorder B1 occupants among B1 ranks.
// These tests pin that property directly rather than trusting a downstream band-reach measurement,
// and they pin the two hard invariants (>=3 participants, >=1 full rotation) that make
// distinctLeaders >= 3 structural instead of lucky.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  GENERATOR_CONFIG,
  carouselSlotOf,
  carouselClimbSpan,
  carouselSchedule,
  carouselWaypoints,
  carouselRoleAt,
  castCarousel,
  generateHeroCurves,
} from './heroCurveGenerator.js';
import { BAND_EDGES } from './racePlanner.js';

const cfg = (over = {}) => ({ ...GENERATOR_CONFIG, anchorProgress: 0.25, ...over });

// ── carouselSlotOf: the permutation ──────────────────────────────────────────
describe('carouselSlotOf', () => {
  it('is a permutation of 1..K in every segment', () => {
    for (const K of [3, 4, 5]) {
      for (let s = 0; s < 2 * K; s++) {
        const slots = Array.from({ length: K }, (_, p) => carouselSlotOf(p, s, K));
        expect([...slots].sort((a, b) => a - b)).toEqual(
          Array.from({ length: K }, (_, i) => i + 1)
        );
      }
    }
  });

  it('rotates slot 1 through every participant — distinctLeaders >= K is structural', () => {
    const K = 3;
    const leaders = [];
    for (let s = 0; s < K; s++) {
      leaders.push([0, 1, 2].find((p) => carouselSlotOf(p, s, K) === 1));
    }
    expect(new Set(leaders).size).toBe(K);
  });

  it('the outgoing leader goes to the BACK, a swing of exactly K-1 (= the amplitude)', () => {
    const K = 3;
    expect(carouselSlotOf(0, 0, K)).toBe(1); // leads segment 0
    expect(carouselSlotOf(0, 1, K)).toBe(K); // dropped to the back in segment 1
    expect(carouselSlotOf(1, 1, K)).toBe(1); // took over
    expect(carouselSlotOf(2, 1, K)).toBe(2); // moved up one
  });
});

// ── feasibility-derived climb span ───────────────────────────────────────────
describe('carouselClimbSpan', () => {
  it('scales with amplitude and the min-jerk peak factor, inversely with the rank rate', () => {
    const c = cfg();
    expect(carouselClimbSpan(2, 34, c)).toBeCloseTo((c.minJerkPeakFactor * 2) / 34, 9);
    expect(carouselClimbSpan(4, 34, c)).toBeCloseTo(2 * carouselClimbSpan(2, 34, c), 9);
    expect(carouselClimbSpan(2, 68, c)).toBeCloseTo(carouselClimbSpan(2, 34, c) / 2, 9);
  });
  it('a non-positive rank rate is infinitely slow, never a free pass', () => {
    expect(carouselClimbSpan(2, 0, cfg())).toBe(Infinity);
    expect(carouselClimbSpan(2, -1, cfg())).toBe(Infinity);
  });
});

// ── schedule ─────────────────────────────────────────────────────────────────
describe('carouselSchedule', () => {
  const base = { windowStart: 0.6, windowEnd: 0.9, K: 3, climbSpan: 0.02, dwellSpan: 0.01 };

  it('refuses a window that cannot hold one FULL rotation', () => {
    expect(carouselSchedule({ ...base, windowEnd: 0.66 })).toBeNull(); // fits < K segments
    expect(carouselSchedule({ ...base, climbSpan: 0.2 })).toBeNull();
  });

  it('emits at least K segments and covers the window exactly', () => {
    const { segments } = carouselSchedule(base);
    expect(segments.length).toBeGreaterThanOrEqual(base.K);
    expect(segments[0].start).toBeCloseTo(base.windowStart, 9);
    expect(segments[segments.length - 1].end).toBeCloseTo(base.windowEnd, 9);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start).toBeCloseTo(segments[i - 1].end, 9); // contiguous, no holes
    }
  });

  it('the leader rotates strictly — no racer leads twice in a row', () => {
    const { segments } = carouselSchedule(base);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].leader).not.toBe(segments[i - 1].leader);
    }
  });

  it('JITTER NEVER SHARPENS A CLIMB below the feasible span (one-sided by necessity)', () => {
    for (const seed of [1, 7, 12345, 99999]) {
      const { segments } = carouselSchedule({ ...base, jitterPct: 0.9, seed });
      for (const s of segments) {
        expect(s.climbEnd - s.start).toBeGreaterThanOrEqual(base.climbSpan - 1e-12);
        expect(s.climbEnd).toBeLessThanOrEqual(s.end + 1e-12); // dwell never negative
      }
    }
  });

  it('jitter is deterministic per seed and actually varies between seeds (when slack exists)', () => {
    // A window with slack above the minimum segment length — jitter spends slack, so it needs some.
    const slack = { ...base, windowEnd: 0.95, jitterPct: 0.5 };
    const a = carouselSchedule({ ...slack, seed: 42 });
    const b = carouselSchedule({ ...slack, seed: 42 });
    const c = carouselSchedule({ ...slack, seed: 43 });
    expect(a.segments).toEqual(b.segments); // same seed → identical
    expect(a.segments).not.toEqual(c.segments); // different seed → different
  });

  it('with ZERO slack the jitter is inert — feasibility wins over variety', () => {
    // span/S lands exactly on climbSpan + dwellSpan, so there is nothing to spend. The climb must
    // stay at its feasible minimum, so every seed produces the same schedule. Documented rather than
    // worked around: a sharper climb would be infeasible, and a longer one would eat the dwell.
    const tight = { ...base, jitterPct: 0.9 }; // 0.30 span / 0.03 segLen = exactly 10 segments
    expect(carouselSchedule({ ...tight, seed: 1 }).segments).toEqual(
      carouselSchedule({ ...tight, seed: 2 }).segments
    );
  });

  it('zero jitter gives every segment the minimum feasible climb', () => {
    const { segments } = carouselSchedule({ ...base, jitterPct: 0, seed: 5 });
    for (const s of segments) expect(s.climbEnd - s.start).toBeCloseTo(base.climbSpan, 9);
  });
});

// ── waypoints ────────────────────────────────────────────────────────────────
describe('carouselWaypoints', () => {
  const { segments } = carouselSchedule({
    windowStart: 0.6,
    windowEnd: 0.9,
    K: 3,
    climbSpan: 0.02,
    dwellSpan: 0.01,
  });

  it('every authored rank stays inside B1 — band-reach invariant BY CONSTRUCTION', () => {
    for (let p = 0; p < 3; p++) {
      for (const w of carouselWaypoints(p, segments, 3, cfg())) {
        expect(w.rank).toBeGreaterThanOrEqual(1);
        expect(w.rank).toBeLessThanOrEqual(BAND_EDGES[0]);
      }
    }
  });

  it('emits a DWELL PLATEAU per rotating segment (same rank at climbEnd and end)', () => {
    const wp = carouselWaypoints(0, segments, 3, cfg());
    // skip the anchor placeholder + the lead-in point, then read plateau pairs
    const tail = wp.slice(2);
    for (let i = 0; i + 1 < tail.length; i += 2) {
      expect(tail[i].rank).toBe(tail[i + 1].rank);
      expect(tail[i + 1].progress).toBeGreaterThan(tail[i].progress);
    }
  });

  it('progress is strictly non-decreasing', () => {
    const wp = carouselWaypoints(1, segments, 3, cfg());
    for (let i = 1; i < wp.length; i++) {
      expect(wp[i].progress).toBeGreaterThanOrEqual(wp[i - 1].progress);
    }
  });
});

// ── casting ──────────────────────────────────────────────────────────────────
describe('castCarousel', () => {
  // A dense, front-loaded field: B1 finishers sit near the front post-chaos so the lead-in is easy.
  function fixture({ n = 40, b1AtFront = true } = {}) {
    const postChaos = Array.from({ length: n }, (_, i) => ({
      index: i,
      rank: i + 1,
      t: 1 - i * 0.001,
      vel: 0,
    }));
    const finalRanks = new Map();
    postChaos.forEach((p, i) => finalRanks.set(p.index, b1AtFront ? i + 1 : n - i));
    return { postChaos, finalRanks };
  }
  const rng = () => 0.5;
  const FIN_T = 1;

  it('does not cast when fewer than carouselMinParticipants are feasible — clean fallthrough', () => {
    const { postChaos, finalRanks } = fixture();
    // A punishing window: no swing can fit.
    const r = castCarousel(
      rng,
      postChaos,
      finalRanks,
      FIN_T,
      1,
      cfg({
        carouselEnabled: true,
        contestWindowStart: 0.96,
        releaseProgress: 0.97,
        carouselFinalMarginProgress: 0.0,
      })
    );
    expect(r.members).toHaveLength(0);
    expect(r.reason).toBeTruthy();
  });

  it('records WHY each candidate was rejected — a zero cast rate is never silent', () => {
    const { postChaos, finalRanks } = fixture();
    const r = castCarousel(
      rng,
      postChaos,
      finalRanks,
      FIN_T,
      1,
      cfg({
        carouselEnabled: true,
        contestWindowStart: 0.955,
        releaseProgress: 0.97,
        carouselFinalMarginProgress: 0.0,
      })
    );
    expect(r.rejected.length).toBeGreaterThan(0);
    for (const x of r.rejected) expect(typeof x.reason).toBe('string');
  });

  it('an amplitude below the participant minimum refuses outright', () => {
    const { postChaos, finalRanks } = fixture();
    const r = castCarousel(
      rng,
      postChaos,
      finalRanks,
      FIN_T,
      1,
      cfg({ carouselEnabled: true, carouselAmplitudeRanks: 1, carouselMinParticipants: 3 })
    );
    expect(r.reason).toBe('amplitude-below-min-participants');
  });

  it('when it casts: K >= 3, one full rotation, and the LAST handover clears the release margin', () => {
    const { postChaos, finalRanks } = fixture();
    const c = cfg({
      carouselEnabled: true,
      contestWindowStart: 0.55,
      releaseProgress: 0.97,
      carouselFinalMarginProgress: 0.07,
      carouselDwellProgress: 0.01,
    });
    const r = castCarousel(rng, postChaos, finalRanks, FIN_T, 1, c);
    expect(r.reason).toBeNull();
    expect(r.members.length).toBeGreaterThanOrEqual(3);
    expect(r.segments.length).toBeGreaterThanOrEqual(r.K);
    const lastEnd = r.segments[r.segments.length - 1].end;
    expect(lastEnd).toBeLessThanOrEqual(c.releaseProgress - c.carouselFinalMarginProgress + 1e-9);
  });

  it('participant count never exceeds amplitude + 1 (the proportional-servo regime)', () => {
    const { postChaos, finalRanks } = fixture();
    const c = cfg({
      carouselEnabled: true,
      contestWindowStart: 0.55,
      carouselAmplitudeRanks: 2,
      carouselDwellProgress: 0.01,
    });
    const r = castCarousel(rng, postChaos, finalRanks, FIN_T, 1, c);
    if (r.members.length) expect(r.members.length).toBeLessThanOrEqual(3);
  });

  it('only B1 finishers are ever cast', () => {
    const { postChaos, finalRanks } = fixture();
    const r = castCarousel(
      rng,
      postChaos,
      finalRanks,
      FIN_T,
      1,
      cfg({ carouselEnabled: true, contestWindowStart: 0.55, carouselDwellProgress: 0.01 })
    );
    for (const m of r.members) {
      expect(finalRanks.get(m.index)).toBeLessThanOrEqual(BAND_EDGES[0]);
    }
  });
});

// ── role lookup ──────────────────────────────────────────────────────────────
describe('carouselRoleAt', () => {
  const plan = {
    K: 3,
    order: [10, 11, 12],
    indices: [10, 11, 12],
    segments: [
      { start: 0.6, climbEnd: 0.64, end: 0.7, leader: 0 },
      { start: 0.7, climbEnd: 0.74, end: 0.8, leader: 1 },
      { start: 0.8, climbEnd: 0.84, end: 0.9, leader: 2 },
    ],
  };
  it('names the incoming attacker and outgoing yielder during a climb', () => {
    expect(carouselRoleAt(plan, 0.72)).toEqual({ attacker: 11, yielder: 10 });
    expect(carouselRoleAt(plan, 0.82)).toEqual({ attacker: 12, yielder: 11 });
  });
  it('is silent during a dwell, in the establishing segment, and outside the schedule', () => {
    expect(carouselRoleAt(plan, 0.76)).toEqual({ attacker: null, yielder: null }); // dwell
    expect(carouselRoleAt(plan, 0.62)).toEqual({ attacker: null, yielder: null }); // establishing
    expect(carouselRoleAt(plan, 0.95)).toEqual({ attacker: null, yielder: null }); // past the end
    expect(carouselRoleAt(null, 0.72)).toEqual({ attacker: null, yielder: null });
  });
});

// ── OFF path ─────────────────────────────────────────────────────────────────
describe('generateHeroCurves — carousel OFF', () => {
  function fixture(n = 40) {
    const postChaos = Array.from({ length: n }, (_, i) => ({
      index: i,
      rank: i + 1,
      t: 1 - i * 0.001,
      vel: 0,
    }));
    const finalRanks = new Map(postChaos.map((p, i) => [p.index, i + 1]));
    return { postChaos, finalRanks };
  }

  it('produces byte-identical output to a run without the carousel keys at all', () => {
    const { postChaos, finalRanks } = fixture();
    const args = { seed: 7, postChaos, finalRanks, intensity: 0.6, finishT: 1 };
    const withKeys = generateHeroCurves({ ...args, config: cfg({ carouselEnabled: false }) });
    const withoutKeys = generateHeroCurves({ ...args, config: cfg() });
    expect(JSON.stringify(withKeys.curves)).toBe(JSON.stringify(withoutKeys.curves));
    expect(withKeys.carouselPlan).toBeNull();
    expect(withKeys.carouselDiag).toBeNull();
  });
});
