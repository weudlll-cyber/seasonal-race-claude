// ============================================================
// scriptCompiler.test.js — the finale script compiler's binding contract (ACTION-BUILD-4).
// Guards: determinism, row-blindness, endpoint invariant, per-racer exposure cap, reachability
// (admission accountant), geometry preference, slider monotonicity, and per-race variety.
// ============================================================
import { describe, it, expect } from 'vitest';
import { compileRaceScripts } from './scriptCompiler.js';
import { generateChainCurves } from './chainChoreography.js';
import { sampleHeroCurve } from './heroChoreography.js';

const N = 40;
// A live post-chaos field (rank 1..N) whose live order differs from the draw so reordering is required.
const postChaos = Array.from({ length: N }, (_, i) => ({ index: i, rank: i + 1, vel: 0 }));
// A fixed fair draw (a permutation of 1..N), keyed by racer index. Deliberately NOT the identity.
const draw = new Map(postChaos.map((p, i) => [p.index, ((i * 13 + 5) % N) + 1]));
const BASE = {
  seed: 7,
  postChaos,
  finalRanks: draw,
  anchorProgress: 0.15,
  actionLevel: 'mid',
  scarcity: 0.5,
};

const BAND_EDGES = [5, 15, 25, 40];
const bandOf = (r) => {
  for (let i = 0; i < BAND_EDGES.length; i++) if (r <= BAND_EDGES[i]) return i;
  return BAND_EDGES.length;
};

describe('compileRaceScripts — contract', () => {
  it('is deterministic (same seed/field/draw → identical scripts + stats)', () => {
    const a = compileRaceScripts(BASE);
    const b = compileRaceScripts(BASE);
    expect(JSON.stringify([...a.scripts])).toBe(JSON.stringify([...b.scripts]));
    expect(JSON.stringify(a.stats)).toBe(JSON.stringify(b.stats));
  });

  it('is row-blind (adding startRowIndex to the field changes nothing)', () => {
    const withRows = postChaos.map((p) => ({ ...p, startRowIndex: p.index % 5 }));
    const a = compileRaceScripts(BASE);
    const b = compileRaceScripts({ ...BASE, postChaos: withRows });
    expect(JSON.stringify([...a.scripts])).toBe(JSON.stringify([...b.scripts]));
  });

  it("ENDPOINT INVARIANT: every authored script ends EXACTLY at the racer's drawn place", () => {
    const { scripts } = compileRaceScripts(BASE);
    expect(scripts.size).toBeGreaterThan(0);
    for (const [idx, sc] of scripts) {
      const last = sc.waypoints[sc.waypoints.length - 1];
      expect(last.progress).toBe(1.0);
      expect(last.rank).toBe(draw.get(idx));
    }
  });

  it('waypoint progress is strictly increasing and starts at the anchor', () => {
    const { scripts } = compileRaceScripts(BASE);
    for (const sc of scripts.values()) {
      expect(sc.waypoints[0].progress).toBe(BASE.anchorProgress);
      for (let i = 1; i < sc.waypoints.length; i++) {
        expect(sc.waypoints[i].progress).toBeGreaterThan(sc.waypoints[i - 1].progress);
      }
    }
  });

  it('EXPOSURE CAP: each racer belongs to at most one script (no double-booking)', () => {
    const { scripts } = compileRaceScripts(BASE);
    // scripts is a Map keyed by index → a single script, so uniqueness is structural; assert the count
    // matches the reported exposure so a future pair-script cannot silently overwrite a slot.
    const { stats } = compileRaceScripts(BASE);
    expect(scripts.size).toBe(stats.exposure);
  });

  it("BAND-LOCAL / REACHABILITY: every intermediate hold stays inside the racer's drawn band ±1", () => {
    const { scripts } = compileRaceScripts(BASE);
    for (const [idx, sc] of scripts) {
      const db = bandOf(draw.get(idx));
      // Skip waypoints[0] — that is the racer's LIVE post-chaos rank (the given start), which the chain
      // legitimately sorts from and may be any band away. The AUTHORED holds (waypoints[1..]) are what
      // must stay band-local so the fan-back to the drawn place is always short and reachable.
      for (let i = 1; i < sc.waypoints.length; i++) {
        expect(Math.abs(bandOf(sc.waypoints[i].rank) - db)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('GEOMETRY PREFERENCE: scarce lanes favour longitudinal scripts; open lanes allow compression', () => {
    // Pool over many seeds so the seeded jitter averages out.
    let openComp = 0,
      openLong = 0,
      closedComp = 0,
      closedLong = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const open = compileRaceScripts({ ...BASE, seed, scarcity: 0.0 }).stats.counts;
      const closed = compileRaceScripts({ ...BASE, seed, scarcity: 1.0 }).stats.counts;
      openComp += open.fightForLead + open.duelPair + open.photoFan;
      openLong += open.comebacker + open.fallbacker + open.paceConvergence;
      closedComp += closed.fightForLead + closed.duelPair + closed.photoFan;
      closedLong += closed.comebacker + closed.fallbacker + closed.paceConvergence;
    }
    // Open tracks carry MORE compression/rotation than closed; closed carry MORE longitudinal than open.
    expect(openComp).toBeGreaterThan(closedComp);
    expect(closedLong).toBeGreaterThan(openLong);
  });

  it('SLIDER MONOTONICITY: higher actionLevel never draws fewer scripts (pooled over seeds)', () => {
    const total = (lvl) => {
      let s = 0;
      for (let seed = 1; seed <= 40; seed++)
        s += compileRaceScripts({ ...BASE, seed, actionLevel: lvl }).stats.scriptCount;
      return s;
    };
    const lo = total('low'),
      mid = total('mid'),
      hi = total('high');
    expect(mid).toBeGreaterThanOrEqual(lo);
    expect(hi).toBeGreaterThanOrEqual(mid);
  });

  it('VARIETY: different seeds mostly produce different timeline signatures', () => {
    const sigs = new Set();
    const M = 30;
    for (let seed = 1; seed <= M; seed++)
      sigs.add(compileRaceScripts({ ...BASE, seed }).stats.signature);
    // Not every race need be unique, but the pool must be varied (never the same twice as a rule).
    expect(sigs.size).toBeGreaterThan(M * 0.6);
  });
});

describe('compileRaceScripts — integration through generateChainCurves', () => {
  const GEN = { seed: 7, postChaos, finalRanks: draw, anchorProgress: 0.15, K: 4, mExtra: 2 };

  it('ENDPOINT INVARIANT survives the curve engine: every racer still ends at its drawn place', () => {
    const { curves } = generateChainCurves({
      ...GEN,
      proximity: { strength: 0.5, resolve: 0.85 },
      compiler: { actionLevel: 'mid', scarcity: 0.5 },
    });
    expect(curves.length).toBe(N);
    for (const c of curves) expect(sampleHeroCurve(c.curve, 1.0)).toBe(draw.get(c.index));
  });

  it('is deterministic + row-blind through the generator', () => {
    const cfg = {
      proximity: { strength: 0.5, resolve: 0.85 },
      compiler: { actionLevel: 'mid', scarcity: 0.5 },
    };
    const a = generateChainCurves({ ...GEN, ...cfg });
    const withRows = postChaos.map((p) => ({ ...p, startRowIndex: p.index % 4 }));
    const b = generateChainCurves({ ...GEN, ...cfg, postChaos: withRows });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('compiler=null → byte-identical to the plain substrate (no accidental coupling)', () => {
    const base = generateChainCurves({ ...GEN, proximity: { strength: 0.5, resolve: 0.85 } });
    const nullc = generateChainCurves({
      ...GEN,
      proximity: { strength: 0.5, resolve: 0.85 },
      compiler: null,
    });
    expect(JSON.stringify(base.curves)).toBe(JSON.stringify(nullc.curves));
    expect(base.scriptStats ?? null).toBe(null);
  });

  it('the compiler reports scripts through the generator (scriptStats populated)', () => {
    const { scriptStats } = generateChainCurves({
      ...GEN,
      compiler: { actionLevel: 'high', scarcity: 0.3 },
    });
    expect(scriptStats).toBeTruthy();
    expect(scriptStats.scriptCount).toBeGreaterThan(0);
  });
});
