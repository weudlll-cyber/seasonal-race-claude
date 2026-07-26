// ============================================================
// chainChoreography.test.js — unit assertions carried over from the standalone sim
// (scripts/exp/chain-sim.mjs). Guards the L181-safety + determinism of the full-field author.
// ============================================================
import { describe, it, expect } from 'vitest';
import { sampleHeroCurve } from './heroChoreography.js';
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
});
