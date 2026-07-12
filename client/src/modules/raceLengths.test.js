// ============================================================
// raceLengths.test.js — the racer-LENGTH unit is ONE source, and bit-identical to the inline
// formulas it replaced (GovernorDiagHUD.jsx:62/75, raceGovernor.js:214, sim-fairness.mjs:947).
// If any of these fail, the HUD number the owner reads has silently moved.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  arcT,
  lenScaleFrom,
  arcLengths,
  meanDrawnBodyLen,
  signedArcT,
  signedArcLengths,
} from './raceLengths.js';
import { arcT as arcTFromGovernor } from './raceGovernor.js';

describe('arcT — track-arc distance (moved from raceGovernor, re-exported)', () => {
  it('closed: within-lap min-arc; open: raw |a-b|', () => {
    expect(arcT(0.9, 0.1, false)).toBeCloseTo(0.2, 9);
    expect(arcT(0.9, 0.1, true)).toBeCloseTo(0.8, 9);
  });
  it('closed is lap-count independent (the lap seam)', () => {
    expect(arcT(3.6, 0.5, false)).toBeCloseTo(arcT(0.6, 0.5, false), 9);
    expect(arcT(2.05, 0.95, false)).toBeCloseTo(0.1, 9); // across the 0/1 seam
  });
  it('raceGovernor re-exports the SAME function (single source)', () => {
    expect(arcTFromGovernor).toBe(arcT);
  });
});

describe('signedArcT / signedArcLengths — lap-aware SIGNED distance (lead-rotation)', () => {
  it('signed, never wrapped: a lapped backmarker reads ~1 lap behind, not close', () => {
    // arcT would wrap this to ~0.1 (looks close); signedArcT keeps the true cumulative gap.
    expect(arcT(2.6, 1.5, false)).toBeCloseTo(0.1, 9); // wrapped (WRONG for reachability)
    expect(signedArcT(2.6, 1.5)).toBeCloseTo(1.1, 9); // true: 1.1 laps behind
  });
  it('sign encodes direction: positive = behind, negative = ahead', () => {
    expect(signedArcT(2.6, 2.4)).toBeCloseTo(0.2, 9); // behind by 0.2
    expect(signedArcT(2.4, 2.6)).toBeCloseTo(-0.2, 9); // ahead by 0.2
    expect(signedArcT(1.0, 1.0)).toBe(0);
  });
  it('signedArcLengths = signedArcT × lenScale', () => {
    expect(signedArcLengths(2.6, 1.5, 3000, 30)).toBeCloseTo(1.1 * 100, 6); // 110 lengths behind
    expect(signedArcLengths(2.4, 2.6, 3000, 30)).toBeCloseTo(-0.2 * 100, 6); // 20 lengths ahead
  });
});

describe('lenScaleFrom — arc-fraction → racer-lengths', () => {
  it('= pathLengthPx / meanBodyLen', () => {
    expect(lenScaleFrom(3000, 30)).toBeCloseTo(100, 9);
  });
  it('= 0 for degenerate meanBodyLen (guard parity)', () => {
    expect(lenScaleFrom(3000, 0)).toBe(0);
    expect(lenScaleFrom(3000, -5)).toBe(0);
  });
});

describe('meanDrawnBodyLen — the length-unit denominator', () => {
  it('mean over racers with a positive drawnBodyLengthPx', () => {
    expect(meanDrawnBodyLen([{ drawnBodyLengthPx: 20 }, { drawnBodyLengthPx: 40 }])).toBeCloseTo(
      30,
      9
    );
  });
  it('ignores non-positive bodies; 0 when the field is empty/degenerate', () => {
    expect(
      meanDrawnBodyLen([
        { drawnBodyLengthPx: 30 },
        { drawnBodyLengthPx: 0 },
        { drawnBodyLengthPx: -1 },
      ])
    ).toBeCloseTo(30, 9);
    expect(meanDrawnBodyLen([])).toBe(0);
    expect(meanDrawnBodyLen([{ drawnBodyLengthPx: 0 }])).toBe(0);
  });
});

describe('arcLengths is BIT-IDENTICAL to the old inline HUD/governor formula', () => {
  // The exact expression the HUD (arcT(a,b,isOpen) * lenScale, lenScale = pathLengthPx/meanBodyLen)
  // and raceGovernor used inline. Sweep open + closed + the lap seam and several geometries.
  const OLD = (a, b, isOpen, pathLengthPx, meanBodyLen) =>
    arcT(a, b, isOpen) * (meanBodyLen > 0 ? pathLengthPx / meanBodyLen : 0);
  const cases = [
    [0.9, 0.1, false, 3245, 28.5],
    [0.9, 0.1, true, 3245, 28.5],
    [3.6, 0.5, false, 3245, 28.5], // lap seam, multi-lap t
    [2.05, 0.95, false, 5000, 40], // across 0/1 seam
    [0.5, 0.5, false, 3245, 28.5], // zero gap
    [0.2, 0.8, true, 1200, 15],
    [0.1, 0.1, false, 3245, 0], // degenerate meanBodyLen → 0
  ];
  it.each(cases)(
    'arcLengths(%f,%f,%s,%f,%f) === old inline',
    (a, b, isOpen, pathLengthPx, meanBodyLen) => {
      expect(arcLengths(a, b, isOpen, pathLengthPx, meanBodyLen)).toBe(
        OLD(a, b, isOpen, pathLengthPx, meanBodyLen)
      );
    }
  );
});
