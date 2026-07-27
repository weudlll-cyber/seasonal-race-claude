// ============================================================
// scriptCompiler.test.js — the finale script compiler's binding contract (ACTION-BUILD-4/5).
// Guards: determinism, row-blindness, endpoint invariant, per-racer exposure cap, reachability, slider
// monotonicity, variety, AND (ACTION-BUILD-5) LOCAL-CLEARANCE admission of the lateral families + accordion
// beats — refused where local space is scarce, admitted where it exists, never reading topology.
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
const BASE = { seed: 7, postChaos, finalRanks: draw, anchorProgress: 0.15, actionLevel: 'mid' };

// Local-clearance profiles (width @ arc + car footprint → lanes). NARROW ≈ 4 lanes, WIDE ≈ 10 lanes.
const WIDE = { widthAt: () => 300, carWidth: 28.5 };
const NARROW = { widthAt: () => 115, carWidth: 28.5 };

const BAND_EDGES = [5, 15, 25, 40];
const bandOf = (r) => {
  for (let i = 0; i < BAND_EDGES.length; i++) if (r <= BAND_EDGES[i]) return i;
  return BAND_EDGES.length;
};

describe('compileRaceScripts — contract', () => {
  it('is deterministic (same args → identical scripts + stats)', () => {
    const a = compileRaceScripts({ ...BASE, clearance: WIDE });
    const b = compileRaceScripts({ ...BASE, clearance: WIDE });
    expect(JSON.stringify([...a.scripts])).toBe(JSON.stringify([...b.scripts]));
    expect(JSON.stringify(a.stats)).toBe(JSON.stringify(b.stats));
  });

  it('is row-blind (adding startRowIndex to the field changes nothing)', () => {
    const withRows = postChaos.map((p) => ({ ...p, startRowIndex: p.index % 5 }));
    const a = compileRaceScripts({ ...BASE, clearance: WIDE });
    const b = compileRaceScripts({ ...BASE, clearance: WIDE, postChaos: withRows });
    expect(JSON.stringify([...a.scripts])).toBe(JSON.stringify([...b.scripts]));
  });

  it('ENDPOINT INVARIANT: every authored script ends EXACTLY at the drawn place', () => {
    const { scripts } = compileRaceScripts({ ...BASE, clearance: WIDE });
    expect(scripts.size).toBeGreaterThan(0);
    for (const [idx, sc] of scripts) {
      const last = sc.waypoints[sc.waypoints.length - 1];
      expect(last.progress).toBe(1.0);
      expect(last.rank).toBe(draw.get(idx));
    }
  });

  it('waypoint progress is strictly increasing and starts at the anchor', () => {
    const { scripts } = compileRaceScripts({ ...BASE, clearance: WIDE });
    for (const sc of scripts.values()) {
      expect(sc.waypoints[0].progress).toBe(BASE.anchorProgress);
      for (let i = 1; i < sc.waypoints.length; i++) {
        expect(sc.waypoints[i].progress).toBeGreaterThan(sc.waypoints[i - 1].progress);
      }
    }
  });

  it('EXPOSURE CAP: each racer belongs to at most one script (Map size == reported exposure)', () => {
    const { scripts, stats } = compileRaceScripts({ ...BASE, clearance: WIDE });
    expect(scripts.size).toBe(stats.exposure);
  });

  it("BAND-LOCAL / REACHABILITY: every authored hold stays within the racer's drawn band ±1", () => {
    const { scripts } = compileRaceScripts({ ...BASE, clearance: WIDE });
    for (const [idx, sc] of scripts) {
      const db = bandOf(draw.get(idx));
      for (let i = 1; i < sc.waypoints.length; i++) {
        expect(Math.abs(bandOf(sc.waypoints[i].rank) - db)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('SLIDER MONOTONICITY: higher actionLevel never draws fewer scripts (pooled over seeds)', () => {
    const total = (lvl) => {
      let s = 0;
      for (let seed = 1; seed <= 40; seed++)
        s += compileRaceScripts({ ...BASE, seed, actionLevel: lvl, clearance: WIDE }).stats
          .scriptCount;
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
      sigs.add(compileRaceScripts({ ...BASE, seed, clearance: WIDE }).stats.signature);
    expect(sigs.size).toBeGreaterThan(M * 0.6);
  });
});

describe("compileRaceScripts — LOCAL-CLEARANCE admission (the owner's situational rule)", () => {
  it('WIDE space admits lateral scripts (fight-for-lead present); NARROW space refuses them', () => {
    let wideAdmit = 0,
      narrowRefuse = 0,
      wideFFL = 0,
      narrowFFL = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const w = compileRaceScripts({ ...BASE, seed, clearance: WIDE }).stats;
      const n = compileRaceScripts({ ...BASE, seed, clearance: NARROW }).stats;
      wideAdmit += w.lateralAdmit;
      narrowRefuse += n.lateralRefuse;
      wideFFL += w.counts.fightForLead;
      narrowFFL += n.counts.fightForLead;
    }
    expect(wideAdmit).toBeGreaterThan(0); // room exists → lateral fires
    expect(narrowRefuse).toBeGreaterThan(0); // no room → lateral refused
    expect(wideFFL).toBeGreaterThan(narrowFFL); // fight-for-lead lives where the front has lanes
  });

  it('longitudinal scripts are ungated by clearance (present even in the narrowest space)', () => {
    const n = compileRaceScripts({ ...BASE, clearance: NARROW }).stats;
    expect(n.counts.comebacker + n.counts.fallbacker + n.counts.paceConvergence).toBeGreaterThan(0);
  });

  it('clearance=null → lateral is ungated (attribution arm authors it regardless of space)', () => {
    const s = compileRaceScripts({ ...BASE, clearance: null }).stats;
    expect(s.lateralRefuse).toBe(0);
    expect(s.counts.fightForLead).toBe(1);
  });

  it('FRONT CONVERGENCE (ARM C): a clearance-refused front lateral becomes a front-band catch-up', () => {
    let converted = 0;
    for (let seed = 1; seed <= 30; seed++) {
      converted += compileRaceScripts({ ...BASE, seed, clearance: NARROW, frontConvergence: true })
        .stats.frontConverted;
    }
    expect(converted).toBeGreaterThan(0); // the longitudinal story owns the moment compression cannot have
  });

  it('CLEARANCE-GRADED BUDGET (ACTION-BUILD-6): narrow → near-zero budget, wide → full, identical → identical', () => {
    // Narrow (≈4 lanes < LANE_FLOOR) → budgetScale 0 → the substrate; wide (≈10 lanes ≥ LANE_FULL) → full.
    let narrowScripts = 0,
      wideScripts = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const n = compileRaceScripts({
        ...BASE,
        seed,
        clearance: NARROW,
        frontConvergence: true,
        budgetGrade: true,
      });
      const w = compileRaceScripts({
        ...BASE,
        seed,
        clearance: WIDE,
        frontConvergence: true,
        budgetGrade: true,
      });
      narrowScripts += n.stats.scriptCount;
      wideScripts += w.stats.scriptCount;
      expect(n.stats.budgetScale).toBe(0); // handed back to the substrate
      expect(w.stats.budgetScale).toBe(1); // full budget
    }
    expect(narrowScripts).toBe(0); // near-zero: no scripts survive on the narrowest geometry
    expect(wideScripts).toBeGreaterThan(0); // full budget keeps the scripts where there is room
    // Locally-identical profiles → identical budgets (no topology channel).
    const a = compileRaceScripts({ ...BASE, clearance: NARROW, budgetGrade: true }).stats
      .budgetScale;
    const b = compileRaceScripts({
      ...BASE,
      clearance: { widthAt: () => 115, carWidth: 28.5 },
      budgetGrade: true,
    }).stats.budgetScale;
    expect(a).toBe(b);
  });

  it('ACCORDION beats are clearance-admitted: fewer admitted in narrow space than wide', () => {
    const acc = { density: 6, pulseLen: 0.06 };
    let wideBeats = 0,
      narrowBeats = 0;
    for (let seed = 1; seed <= 30; seed++) {
      wideBeats += compileRaceScripts({ ...BASE, seed, clearance: WIDE, accordion: acc })
        .accordAdmittedBeats.length;
      narrowBeats += compileRaceScripts({ ...BASE, seed, clearance: NARROW, accordion: acc })
        .accordAdmittedBeats.length;
    }
    expect(wideBeats).toBeGreaterThan(narrowBeats);
  });
});

describe('compileRaceScripts — integration through generateChainCurves', () => {
  const GEN = { seed: 7, postChaos, finalRanks: draw, anchorProgress: 0.15, K: 4, mExtra: 2 };
  const COMP = { actionLevel: 'mid', clearance: WIDE };

  it('ENDPOINT INVARIANT survives the curve engine: every racer still ends at its drawn place', () => {
    const { curves } = generateChainCurves({
      ...GEN,
      proximity: { strength: 0.5, resolve: 0.85 },
      compiler: COMP,
    });
    expect(curves.length).toBe(N);
    for (const c of curves) expect(sampleHeroCurve(c.curve, 1.0)).toBe(draw.get(c.index));
  });

  it('is deterministic + row-blind through the generator', () => {
    const cfg = { proximity: { strength: 0.5, resolve: 0.85 }, compiler: COMP };
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

  it('the compiler + accordion schedule report through the generator', () => {
    const { scriptStats, accordSchedule } = generateChainCurves({
      ...GEN,
      compiler: { actionLevel: 'high', clearance: WIDE, accordion: { density: 6, pulseLen: 0.06 } },
    });
    expect(scriptStats.scriptCount).toBeGreaterThan(0);
    expect(accordSchedule.beats.length).toBe(6);
  });
});
