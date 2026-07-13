import { describe, it, expect } from 'vitest';
import { computeRowEnvMult, advanceRacerT } from './raceStep.js';

// ─────────────────────────────────────────────────────────────────────────────
// These tests pin the shared t-update to the EXACT expression the browser ran
// inline before extraction (RaceScreen/index.jsx, pre pre/shared-t-update):
//
//   let rowEnvMult = 1.0;
//   if (phaseSplitBonusEnabled && r.rawRowBonus > 0) {
//     const s = raceProgress < PHASE_CHAOS_END ? rowBonusEarly
//             : raceProgress < PHASE_PULK_END  ? rowBonusPulk
//             :                                  rowBonusPost;
//     rowEnvMult = (1 + r.rawRowBonus * s) / (1 + r.rawRowBonus);
//   }
//   r.t = Math.min(
//     r.t + r.baseSpeed * boost * brake * rowEnvMult * r.trajectoryMult
//         * r.areaBonusMult * (r.governorMult ?? 1.0),
//     st.finishT + 0.001);
//
// The reference implementation below is that literal expression. Every case
// asserts the module reproduces it to the bit (toBe / Object.is).
// ─────────────────────────────────────────────────────────────────────────────

/** The historical inline browser expression, verbatim. dt is fixed at 1.0. */
function browserReference(racer, phase, boost, brake, raceProgress, finishT) {
  let rowEnvMult = 1.0;
  if (phase.enabled && racer.rawRowBonus > 0) {
    const s =
      raceProgress < phase.chaosEndFrac
        ? phase.early
        : raceProgress < phase.pulkEndFrac
          ? phase.pulk
          : phase.post;
    rowEnvMult = (1 + racer.rawRowBonus * s) / (1 + racer.rawRowBonus);
  }
  const advanced =
    racer.t +
    racer.baseSpeed *
      boost *
      brake *
      rowEnvMult *
      racer.trajectoryMult *
      racer.areaBonusMult *
      (racer.governorMult ?? 1.0);
  return Math.min(advanced, finishT + 0.001);
}

// Shipped phase-split config (defaults.js): EARLY + POST full, PULK off.
const SHIPPED = { enabled: true, chaosEndFrac: 0.25, pulkEndFrac: 0.5, early: 1, pulk: 0, post: 1 };
// The choreo case: zero-width PULK window (pulkStart == pulkEnd). Only EARLY/POST reachable.
const ZERO_PULK = {
  enabled: true,
  chaosEndFrac: 0.25,
  pulkEndFrac: 0.25,
  early: 1,
  pulk: 0,
  post: 1,
};
// A configuration whose per-phase strengths actually differ, so PULK is observable.
const SPLIT = { enabled: true, chaosEndFrac: 0.25, pulkEndFrac: 0.5, early: 1, pulk: 0, post: 0.5 };
const DISABLED = { ...SHIPPED, enabled: false };

function racer(over = {}) {
  return {
    t: 0.4,
    baseSpeed: 0.0012,
    trajectoryMult: 1.03,
    areaBonusMult: 1.15,
    governorMult: 0.98,
    rawRowBonus: 0.08,
    ...over,
  };
}

describe('computeRowEnvMult', () => {
  it('is 1.0 when phase-split disabled', () => {
    expect(computeRowEnvMult(0.08, 0.1, DISABLED)).toBe(1.0);
  });

  it('is 1.0 when rawRowBonus is 0 (front rows carry no bonus)', () => {
    expect(computeRowEnvMult(0, 0.3, SHIPPED)).toBe(1.0);
  });

  it('EARLY window selects `early`', () => {
    // progress < chaosEnd → early = 1 → envelope collapses to 1.0
    expect(computeRowEnvMult(0.08, 0.1, SPLIT)).toBe((1 + 0.08 * 1) / (1 + 0.08));
  });

  it('PULK window selects `pulk`', () => {
    // chaosEnd <= progress < pulkEnd → pulk = 0 → 1/(1+bonus)
    expect(computeRowEnvMult(0.08, 0.35, SPLIT)).toBe(1 / (1 + 0.08));
  });

  it('POST window selects `post`', () => {
    // progress >= pulkEnd → post = 0.5
    expect(computeRowEnvMult(0.08, 0.9, SPLIT)).toBe((1 + 0.08 * 0.5) / (1 + 0.08));
  });

  it('zero-width PULK is unreachable → shipped strengths give exactly 1.0', () => {
    // At the boundary and beyond only POST is hit; before it only EARLY. Both = 1.
    expect(computeRowEnvMult(0.08, 0.1, ZERO_PULK)).toBe(1.0);
    expect(computeRowEnvMult(0.08, 0.25, ZERO_PULK)).toBe(1.0);
    expect(computeRowEnvMult(0.08, 0.8, ZERO_PULK)).toBe(1.0);
  });
});

describe('advanceRacerT reproduces the browser expression bit-for-bit', () => {
  const progresses = [0.0, 0.1, 0.24999, 0.25, 0.4, 0.49999, 0.5, 0.75, 1.0];
  const phases = [SHIPPED, ZERO_PULK, SPLIT, DISABLED];
  const bonuses = [0, 0.08, 0.2];

  for (const phase of phases) {
    for (const rawRowBonus of bonuses) {
      for (const p of progresses) {
        it(`phase=${JSON.stringify(phase)} bonus=${rawRowBonus} progress=${p}`, () => {
          const r = racer({ rawRowBonus });
          const finishT = 100;
          const got = advanceRacerT(r, {
            boost: 1.04,
            brake: 0.945,
            raceProgress: p,
            finishT,
            phase,
          });
          const want = browserReference(r, phase, 1.04, 0.945, p, finishT);
          expect(Object.is(got, want)).toBe(true);
        });
      }
    }
  }

  it('boost=1 brake=1 (no avoidance) matches reference', () => {
    const r = racer();
    const got = advanceRacerT(r, {
      boost: 1,
      brake: 1,
      raceProgress: 0.3,
      finishT: 100,
      phase: SHIPPED,
    });
    const want = browserReference(r, SHIPPED, 1, 1, 0.3, 100);
    expect(Object.is(got, want)).toBe(true);
  });

  it('missing governorMult defaults to 1.0 (both sides)', () => {
    const r = racer({ governorMult: undefined });
    const got = advanceRacerT(r, {
      boost: 1.02,
      brake: 1,
      raceProgress: 0.3,
      finishT: 100,
      phase: SHIPPED,
    });
    const want = browserReference(r, SHIPPED, 1.02, 1, 0.3, 100);
    expect(Object.is(got, want)).toBe(true);
  });

  it('explicit dt = 1.0 is IEEE-754 identity (bit-identical to no-dt browser)', () => {
    const r = racer();
    const withDt = advanceRacerT(r, {
      boost: 1.02,
      brake: 1,
      raceProgress: 0.3,
      finishT: 100,
      phase: SHIPPED,
      dt: 1.0,
    });
    const noDt = advanceRacerT(r, {
      boost: 1.02,
      brake: 1,
      raceProgress: 0.3,
      finishT: 100,
      phase: SHIPPED,
    });
    const want = browserReference(r, SHIPPED, 1.02, 1, 0.3, 100);
    expect(Object.is(withDt, noDt)).toBe(true);
    expect(Object.is(withDt, want)).toBe(true);
  });

  it('dt = DT/16 = 16/16 = 1.0 exactly (sim path)', () => {
    expect(16 / 16).toBe(1.0);
    const r = racer();
    const simDt = advanceRacerT(r, {
      boost: 1.02,
      brake: 1,
      raceProgress: 0.3,
      finishT: 100,
      phase: SHIPPED,
      dt: 16 / 16,
    });
    const want = browserReference(r, SHIPPED, 1.02, 1, 0.3, 100);
    expect(Object.is(simDt, want)).toBe(true);
  });

  describe('finish clamp', () => {
    it('clamps a racer that would overshoot the finish line', () => {
      const r = racer({
        t: 99.9,
        baseSpeed: 5,
        trajectoryMult: 1,
        areaBonusMult: 1,
        governorMult: 1,
        rawRowBonus: 0,
      });
      // 99.9 + 5 = 104.9, clamped to 100.001
      const got = advanceRacerT(r, {
        boost: 1,
        brake: 1,
        raceProgress: 0.99,
        finishT: 100,
        phase: SHIPPED,
      });
      expect(got).toBe(100.001);
    });

    it('exactly at the clamp boundary finishT + 0.001 stays put', () => {
      const r = racer({
        t: 100.001,
        baseSpeed: 0,
        trajectoryMult: 1,
        areaBonusMult: 1,
        governorMult: 1,
        rawRowBonus: 0,
      });
      const got = advanceRacerT(r, {
        boost: 1,
        brake: 1,
        raceProgress: 1.0,
        finishT: 100,
        phase: SHIPPED,
      });
      expect(got).toBe(100.001);
    });

    it('just below the boundary is NOT clamped', () => {
      const r = racer({
        t: 99.9995,
        baseSpeed: 0,
        trajectoryMult: 1,
        areaBonusMult: 1,
        governorMult: 1,
        rawRowBonus: 0,
      });
      const got = advanceRacerT(r, {
        boost: 1,
        brake: 1,
        raceProgress: 1.0,
        finishT: 100,
        phase: SHIPPED,
      });
      expect(got).toBe(99.9995);
    });
  });
});
