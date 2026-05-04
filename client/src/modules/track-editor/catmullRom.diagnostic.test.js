// ============================================================
// Diagnostic: T-uniform vs arc-length step-distance variation
// Run with: npx vitest run catmullRom.diagnostic
//
// Phase 1 of PR-A2.5 — confirms the hypothesis that T-uniform
// sampling produces significant pixel-distance variation between
// consecutive samples. Hypothesis: max/min ratio > 1.3× per track.
//
// If every track reports max/min < 1.3×, the hypothesis is
// WIDERLEGT (refuted) and Phase 2 spline rewrite is cancelled.
// ============================================================

import { describe, it, expect } from 'vitest';
import { catmullRomSpline } from './catmullRom.js';

// Representative synthetic tracks — modelled on typical 1280×720 canvas layouts.
// Designs chosen to reflect how users draw tracks in the editor:
//   • ovals with corner-clustered or spread control points
//   • open sprints with long straights and tight turns
const TRACKS = [
  {
    name: 'Oval — 4 pts symmetric (N/E/S/W)',
    closed: true,
    points: [
      { x: 640, y: 155 },
      { x: 1030, y: 360 },
      { x: 640, y: 565 },
      { x: 250, y: 360 },
    ],
  },
  {
    name: 'Oval — 6 pts (4 clustered on one half, 2 on other)',
    closed: true,
    points: [
      { x: 640, y: 155 },
      { x: 900, y: 200 },
      { x: 1060, y: 360 },
      { x: 900, y: 520 },
      { x: 640, y: 565 },
      { x: 250, y: 360 }, // only one pt on this wide side
    ],
  },
  {
    name: 'Oval — 8 pts (3 clustered on tight end)',
    closed: true,
    points: [
      { x: 640, y: 155 },
      { x: 850, y: 175 },
      { x: 1000, y: 260 },
      { x: 1060, y: 360 },
      { x: 1000, y: 460 },
      { x: 640, y: 565 },
      { x: 280, y: 460 },
      { x: 240, y: 360 },
    ],
  },
  {
    name: 'Open sprint — gentle S-curve (5 pts)',
    closed: false,
    points: [
      { x: 100, y: 360 },
      { x: 350, y: 200 },
      { x: 640, y: 360 },
      { x: 930, y: 520 },
      { x: 1180, y: 360 },
    ],
  },
  {
    name: 'Open sprint — tight hairpin (clustered at turn)',
    closed: false,
    points: [
      { x: 100, y: 400 },
      { x: 780, y: 400 }, // long straight (~680 px chord)
      { x: 1060, y: 310 }, // start of hairpin
      { x: 1110, y: 200 }, // apex
      { x: 970, y: 140 }, // exit
    ],
  },
  {
    name: 'Open sprint — long straight + sharp late corner (4 pts)',
    closed: false,
    points: [
      { x: 100, y: 420 },
      { x: 730, y: 420 }, // end of long straight (630 px)
      { x: 1060, y: 320 }, // start of corner (350 px from previous)
      { x: 1020, y: 120 }, // apex (220 px from previous)
    ],
  },
];

function stepStats(splinePoints) {
  const steps = [];
  for (let i = 1; i < splinePoints.length; i++) {
    const dx = splinePoints[i].x - splinePoints[i - 1].x;
    const dy = splinePoints[i].y - splinePoints[i - 1].y;
    steps.push(Math.sqrt(dx * dx + dy * dy));
  }
  const min = Math.min(...steps);
  const max = Math.max(...steps);
  const mean = steps.reduce((s, d) => s + d, 0) / steps.length;
  return { min, max, mean, ratio: max / min, steps };
}

// ── Diagnostic output ─────────────────────────────────────────────────────────

describe('Phase 1 Diagnostic — T-uniform step-distance variation', () => {
  const SAMPLES = 200;
  const results = [];

  for (const track of TRACKS) {
    it(`measures step variation: ${track.name}`, () => {
      const pts = catmullRomSpline(track.points, {
        closed: track.closed,
        samples: SAMPLES,
        parameterization: 'parameter', // T-uniform (current behaviour before fix)
      });
      const { min, max, mean, ratio } = stepStats(pts);
      results.push({ name: track.name, min, max, mean, ratio });

      // Confirm hypothesis: at least some variation exists.
      // Failure (<1.05×) would indicate near-perfect T-uniform tracks and
      // require re-diagnosis.
      expect(ratio).toBeGreaterThan(1.0);

      // Print raw numbers for the report table (vitest -reporter=verbose shows this).
      console.log(
        `[DIAG] ${track.name}\n` +
          `  T-uniform  min=${min.toFixed(2)} max=${max.toFixed(2)} ` +
          `mean=${mean.toFixed(2)} ratio=${ratio.toFixed(2)}×`
      );
    });
  }

  // Hypothesis confirmation: at least one track must exceed the 1.3× threshold
  // for the Phase 2 rewrite to be justified.
  it('HYPOTHESIS: at least one track has max/min > 1.3×', () => {
    const anySignificant = TRACKS.some((track) => {
      const pts = catmullRomSpline(track.points, {
        closed: track.closed,
        samples: SAMPLES,
        parameterization: 'parameter',
      });
      const { ratio } = stepStats(pts);
      return ratio > 1.3;
    });
    expect(anySignificant).toBe(true);
  });
});

// ── Arc-length fix comparison ─────────────────────────────────────────────────

describe('Phase 1 Diagnostic — arc-length step-distance (after fix)', () => {
  const SAMPLES = 200;

  for (const track of TRACKS) {
    it(`arc-length max/min < 1.10×: ${track.name}`, () => {
      const pts = catmullRomSpline(track.points, {
        closed: track.closed,
        samples: SAMPLES,
        parameterization: 'arclength',
      });
      const { min, max, mean, ratio } = stepStats(pts);

      console.log(
        `[DIAG] ${track.name}\n` +
          `  arc-length min=${min.toFixed(2)} max=${max.toFixed(2)} ` +
          `mean=${mean.toFixed(2)} ratio=${ratio.toFixed(2)}×`
      );

      // Arc-length uniform sampling must keep variation below 10%.
      expect(ratio).toBeLessThan(1.1);
    });
  }
});
