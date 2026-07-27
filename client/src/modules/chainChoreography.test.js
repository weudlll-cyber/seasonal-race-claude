// ============================================================
// chainChoreography.test.js — unit assertions carried over from the standalone sim
// (scripts/exp/chain-sim.mjs). Guards the L181-safety + determinism of the full-field author.
// ============================================================
import { describe, it, expect } from 'vitest';
import { sampleHeroCurve, anchorHeroCurve } from './heroChoreography.js';
import { generateChainCurves, chainCheckpointCount } from './chainChoreography.js';

const N = 24;
// A live post-chaos field: rank 1..N (order differs from the draw so reordering is required).
const postChaos = Array.from({ length: N }, (_, i) => ({ index: i, rank: i + 1, vel: 0 }));
// A fixed fair draw (a permutation of 1..N), keyed by racer index. Deliberately NOT the identity.
const draw = new Map(postChaos.map((p, i) => [p.index, ((i * 7 + 3) % N) + 1]));
const ARGS = { seed: 42, postChaos, finalRanks: draw, anchorProgress: 0.25, K: 3, mExtra: 2 };

describe('chainCheckpointCount', () => {
  it('clamps K to [3,8] and duration-scales', () => {
    expect(chainCheckpointCount(30, 20)).toBe(3); // round(1.5)=2 → clamp up to 3
    expect(chainCheckpointCount(60, 20)).toBe(3);
    expect(chainCheckpointCount(120, 20)).toBe(6);
    expect(chainCheckpointCount(300, 20)).toBe(8); // round(15) → clamp down to 8
  });
});

describe('generateChainCurves', () => {
  it('is deterministic (same seed → identical curves)', () => {
    const a = generateChainCurves(ARGS);
    const b = generateChainCurves(ARGS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('emits a curve for EVERY racer (full field), not a hero subset', () => {
    const { curves } = generateChainCurves(ARGS);
    expect(curves.length).toBe(N);
    expect(new Set(curves.map((c) => c.index)).size).toBe(N);
  });

  it('ENDPOINT INVARIANT (L181): every curve ends EXACTLY at its drawn place', () => {
    const { curves } = generateChainCurves(ARGS);
    for (const c of curves) {
      expect(sampleHeroCurve(c.curve, 1.0)).toBe(draw.get(c.index));
      expect(c.finalRank).toBe(draw.get(c.index));
    }
  });

  it('L181: endpoints depend ONLY on the fixed draw, never on the live order', () => {
    // Same draw + seed, but a DIFFERENT (reversed) live post-chaos order → identical endpoints.
    const reversed = postChaos.map((p, i) => ({ index: p.index, rank: N - i, vel: 0 }));
    const base = generateChainCurves(ARGS);
    const alt = generateChainCurves({ ...ARGS, postChaos: reversed });
    for (const c of base.curves) {
      const a = alt.curves.find((x) => x.index === c.index);
      expect(sampleHeroCurve(a.curve, 1.0)).toBe(sampleHeroCurve(c.curve, 1.0));
    }
  });

  it('L181: the author never reads start row (no startRowIndex in its contract)', () => {
    // postChaos carries only {index, rank, vel}; adding a startRowIndex must not change any output.
    const withRows = postChaos.map((p) => ({ ...p, startRowIndex: p.index % 4 }));
    const a = generateChainCurves(ARGS);
    const b = generateChainCurves({ ...ARGS, postChaos: withRows });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('target ranks stay within [1,N] at every sampled progress (no out-of-field target)', () => {
    const { curves } = generateChainCurves(ARGS);
    for (const c of curves) {
      for (let p = 0.25; p <= 1.0001; p += 0.05) {
        const r = sampleHeroCurve(c.curve, Math.min(1, p));
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(N);
      }
    }
  });

  it('checkpoints strictly increase and end at the finish (1.0)', () => {
    const { checkpoints } = generateChainCurves(ARGS);
    expect(checkpoints.length).toBe(3);
    for (let i = 1; i < checkpoints.length; i++) {
      expect(checkpoints[i]).toBeGreaterThan(checkpoints[i - 1]);
    }
    expect(checkpoints[checkpoints.length - 1]).toBeCloseTo(1.0, 10);
  });

  it('mExtra=0 still lands the exact draw (pure monotone ease, no excursion)', () => {
    const { curves } = generateChainCurves({ ...ARGS, mExtra: 0 });
    for (const c of curves) expect(sampleHeroCurve(c.curve, 1.0)).toBe(draw.get(c.index));
  });

  // DRAMA formations: intermediate targets diverge from the draw, converge only at the finish.
  const DRAMA = { frac: 1.0, resolve: 0.8, stagger: 0, holdDepth: 12 };

  it('DRAMA: endpoint invariant still holds (every curve ends at the drawn place)', () => {
    const { curves } = generateChainCurves({ ...ARGS, drama: DRAMA });
    for (const c of curves) expect(sampleHeroCurve(c.curve, 1.0)).toBe(draw.get(c.index));
  });

  it('DRAMA: false leaders (drawn OUTSIDE B1) are held IN B1 mid-race, then reeled back', () => {
    const { curves } = generateChainCurves({ ...ARGS, drama: DRAMA });
    const fl = curves.filter((c) => c.role === 'falseLeader');
    expect(fl.length).toBeGreaterThan(0);
    for (const c of fl) {
      expect(draw.get(c.index)).toBeGreaterThan(5); // drawn outside B1
      expect(sampleHeroCurve(c.curve, 0.5)).toBeLessThanOrEqual(5.5); // held in the front mid-race
      expect(sampleHeroCurve(c.curve, 1.0)).toBe(draw.get(c.index)); // but ends at its drawn place
    }
  });

  it('DRAMA: late arrivals (drawn INTO B1) are held back mid-race, then climb in', () => {
    const { curves } = generateChainCurves({ ...ARGS, drama: DRAMA });
    const la = curves.filter((c) => c.role === 'lateArrival');
    expect(la.length).toBeGreaterThan(0);
    for (const c of la) {
      expect(draw.get(c.index)).toBeLessThanOrEqual(5); // drawn into B1
      expect(sampleHeroCurve(c.curve, 0.5)).toBeGreaterThan(5.5); // held outside the front mid-race
      expect(sampleHeroCurve(c.curve, 1.0)).toBe(draw.get(c.index)); // climbs to its drawn place by the end
    }
  });

  it('DRAMA: deterministic + row-blind (adding startRowIndex changes nothing)', () => {
    const a = generateChainCurves({ ...ARGS, drama: DRAMA });
    const withRows = postChaos.map((p) => ({ ...p, startRowIndex: p.index % 4 }));
    const b = generateChainCurves({ ...ARGS, postChaos: withRows, drama: DRAMA });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  // SMOOTHNESS RULE (owner, binding): the chain never steps the target. Speed changes route through the
  // shipped eased _setTarget/trajectoryMult slew (unchanged — asserted byte-identical by the fingerprint);
  // the chain's own contribution — the target rank — is a min-jerk curve, jerk-matched at every re-anchor,
  // so the target evolves with a bounded slope (no discontinuity) even across a GPS-reroute seam.
  it('SMOOTHNESS: the sampled target rank has bounded slope everywhere, incl. across a re-anchor seam', () => {
    const { curves } = generateChainCurves(ARGS);
    const c = curves.find((x) => x.index === 0).curve;
    // Re-anchor mid-race to the racer's ACTUAL rank (a GPS reroute), then sweep across the seam.
    const seam = 0.55;
    const re = anchorHeroCurve(c, seam, 12, 0); // actual rank 12 at the seam
    // Measure the PER-TICK target-rank change (the smoothness unit that matters): one physics tick is
    // FIXED_DT=16ms; a 60s race advances leader-progress ~16/60000 = 2.67e-4 per tick.
    const progPerTick = 16 / 60000;
    let maxPerTick = 0;
    for (let p = 0.25; p < 1 - progPerTick; p += progPerTick) {
      const d = Math.abs(sampleHeroCurve(re, p + progPerTick) - sampleHeroCurve(re, p));
      if (d > maxPerTick) maxPerTick = d;
    }
    // A true STEP would move the target by O(N) ranks in one tick; a min-jerk curve moves <1 rank/tick.
    // (Empirically ~0.02–0.07 rank/tick even across the re-anchor seam.) This proves no discontinuity.
    expect(maxPerTick).toBeLessThan(1.0);
    // Value at the seam equals the anchor exactly (C0 continuity by construction).
    expect(sampleHeroCurve(re, seam)).toBeCloseTo(12, 6);
  });
});
