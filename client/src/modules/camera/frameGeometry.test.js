// ============================================================
// frameGeometry.test.js — CAMERA-PICTURE-FIXES-1, commit 1
//
// The pre-registered acceptance: `leaderForwardFrac` 0.66 must displace the subject 16.0pp from
// centre ON EVERY HEADING. The bug it replaces was exact on both axes and 1.436x over at the
// owner's 74 deg heading, so THE DIAGONAL CASES ARE THE TEST — an axis-only suite passes against
// the bug, which is precisely why it shipped and why his eye found it before any test did.
//
// Same shape as the bsX/bsY defect: right on the axes, wrong between them.
// ============================================================

import { describe, it, expect } from 'vitest';
import { frameExtentAlong } from './frameGeometry.js';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../cameraConfig.js';

const W = 1280;
const H = 720;
const FRAC = 0.66;

/** The blend that was there before — kept so these tests can be shown to fail against it. */
const oldBlend = (dx, dy, w, h) => {
  const l = Math.hypot(dx, dy);
  return (Math.abs(dx) / l) * w + (Math.abs(dy) / l) * h;
};

const HEADINGS = [
  ['horizontal →', 1, 0, 1280],
  ['horizontal ←', -1, 0, 1280],
  ['vertical ↓', 0, 1, 720],
  ['vertical ↑', 0, -1, 720],
  ['45°', Math.SQRT1_2, Math.SQRT1_2, 1018.23],
  ['−45°', Math.SQRT1_2, -Math.SQRT1_2, 1018.23],
  ['30°', Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), 1440],
  ['60°', Math.cos(Math.PI / 3), Math.sin(Math.PI / 3), 831.38],
  ["owner's 74°", 0.3197, 0.9475, 759.9],
];

describe('frameExtentAlong — the frame chord, not a blend of its sides', () => {
  it.each(HEADINGS)('%s → %s px', (_label, dx, dy, expected) => {
    expect(frameExtentAlong(dx, dy, W, H)).toBeCloseTo(expected, 1);
  });

  it('is unchanged on the axes — the cases the old blend already got right', () => {
    expect(frameExtentAlong(1, 0, W, H)).toBeCloseTo(oldBlend(1, 0, W, H), 9);
    expect(frameExtentAlong(0, 1, W, H)).toBeCloseTo(oldBlend(0, 1, W, H), 9);
  });

  it('DIVERGES from the old blend between the axes — the bug, quantified', () => {
    const at = (dx, dy) => oldBlend(dx, dy, W, H) / frameExtentAlong(dx, dy, W, H);
    expect(at(Math.SQRT1_2, Math.SQRT1_2)).toBeCloseTo(1.389, 2); // 45°
    expect(at(0.3197, 0.9475)).toBeCloseTo(1.436, 2); // the owner's heading
    // and the blend is never SMALLER — it only ever over-states the frame
    for (const [, dx, dy] of HEADINGS) expect(at(dx, dy)).toBeGreaterThanOrEqual(1 - 1e-9);
  });

  it('is symmetric in every quadrant — direction sign cannot change an extent', () => {
    for (const [, dx, dy] of HEADINGS) {
      const base = frameExtentAlong(dx, dy, W, H);
      expect(frameExtentAlong(-dx, dy, W, H)).toBeCloseTo(base, 9);
      expect(frameExtentAlong(dx, -dy, W, H)).toBeCloseTo(base, 9);
      expect(frameExtentAlong(-dx, -dy, W, H)).toBeCloseTo(base, 9);
    }
  });

  it('is scale-free in the direction vector — only the heading matters', () => {
    expect(frameExtentAlong(3, 9, W, H)).toBeCloseTo(frameExtentAlong(1, 3, W, H), 9);
    expect(frameExtentAlong(0.001, 0.003, W, H)).toBeCloseTo(frameExtentAlong(1, 3, W, H), 6);
  });

  it('never exceeds the frame diagonal, and never falls below the shorter side', () => {
    const diag = Math.hypot(W, H);
    for (let deg = 0; deg < 360; deg += 3) {
      const r = (deg * Math.PI) / 180;
      const e = frameExtentAlong(Math.cos(r), Math.sin(r), W, H);
      expect(e).toBeGreaterThanOrEqual(Math.min(W, H) - 1e-9);
      expect(e).toBeLessThanOrEqual(diag + 1e-9);
    }
    // The old blend respects the same upper bound — it peaks AT the diagonal (its maximum is
    // exactly hypot(W,H), reached on the corner heading) — which is part of why it looked
    // plausible. It agrees with the chord on the axes AND on the corner heading, and over-states
    // it strictly between: 1414 where the chord is 1018 at 45°.
    const cornerX = W / diag;
    const cornerY = H / diag;
    expect(oldBlend(cornerX, cornerY, W, H)).toBeCloseTo(diag, 6);
    expect(frameExtentAlong(cornerX, cornerY, W, H)).toBeCloseTo(diag, 6);
    expect(oldBlend(Math.SQRT1_2, Math.SQRT1_2, W, H)).toBeGreaterThan(
      frameExtentAlong(Math.SQRT1_2, Math.SQRT1_2, W, H)
    );
  });

  it('degenerate inputs return 0 rather than NaN or Infinity', () => {
    for (const args of [
      [0, 0, W, H],
      [1, 0, 0, H],
      [1, 0, W, 0],
      [NaN, 1, W, H],
    ]) {
      expect(frameExtentAlong(...args)).toBe(0);
    }
  });
});

describe('THE PRE-REGISTERED ACCEPTANCE: frac 0.66 displaces 16.0pp on every heading', () => {
  it.each(HEADINGS)('%s', (_label, dx, dy) => {
    const extent = frameExtentAlong(dx, dy, W, H);
    const displacement = (FRAC - 0.5) * extent;
    expect((100 * displacement) / extent).toBeCloseTo(16.0, 9);
  });

  it('holds at every heading in a full sweep, not just the sampled ones', () => {
    for (let deg = 0; deg < 360; deg += 1) {
      const r = (deg * Math.PI) / 180;
      const extent = frameExtentAlong(Math.cos(r), Math.sin(r), W, H);
      expect((100 * ((FRAC - 0.5) * extent)) / extent).toBeCloseTo(16.0, 9);
    }
  });

  it('FAILURE PROOF: the old blend gave 23.0pp at the owner’s heading, not 16.0', () => {
    // Measured from his marker: heading 74°, ezx 4.791667, ezy 4.044944, frac 0.66 → the subject
    // sat at 84.5% down the frame instead of the ~77% the setting asks for.
    const [dx, dy] = [0.3197, 0.9475];
    const trueExtent = frameExtentAlong(dx, dy, W, H);
    const oldDisplacement = (FRAC - 0.5) * oldBlend(dx, dy, W, H);
    expect((100 * oldDisplacement) / trueExtent).toBeCloseTo(23.0, 1);
  });
});

describe('the fix reaches the director — same setting, every heading, one displacement', () => {
  // A straight diagonal track: the heading is constant and known, so the bias is checkable
  // end-to-end through _applyLeaderForwardBias rather than only in the helper.
  const straightShape = (dirX, dirY) => ({
    isOpen: true,
    getPosition: (t) => ({ x: 3000 + dirX * t * 4000, y: 2000 + dirY * t * 4000, angle: 0 }),
    getTotalLength: () => 4000,
    getActualTrackWidth: () => 200,
  });

  it.each([
    ['horizontal', 1, 0],
    ['vertical', 0, 1],
    ['45° diagonal', Math.SQRT1_2, Math.SQRT1_2],
    ['74° diagonal', 0.2739, 0.9618],
  ])('%s: the subject lands at frac along the frame chord', (_l, dirX, dirY) => {
    const cd = new CameraDirector(
      6144,
      4096,
      true,
      { ...DEFAULT_CAMERA_CONFIG, leaderForwardFrac: FRAC },
      28.5,
      straightShape(dirX, dirY),
      200
    );
    const pos = { x: 3000 + dirX * 2000, y: 2000 + dirY * 2000 };
    const effX = cd._proj.effX(cd._leaderZoom);
    const effY = cd._proj.effY(cd._leaderZoom);
    const biased = cd._applyLeaderForwardBias(pos, 0.5, effX, effY, W, H);

    // The centre moved BACKWARD along the heading, so the subject sits forward on screen.
    const shiftScreenX = (pos.x - biased.x) * effX;
    const shiftScreenY = (pos.y - biased.y) * effY;
    const shift = Math.hypot(shiftScreenX, shiftScreenY);
    const extent = frameExtentAlong(dirX * effX, dirY * effY, W, H);
    expect((100 * shift) / extent).toBeCloseTo(16.0, 6);
  });

  it('a null leaderForwardFrac leaves the target untouched, on every heading', () => {
    const cd = new CameraDirector(
      6144,
      4096,
      true,
      { ...DEFAULT_CAMERA_CONFIG, leaderForwardFrac: 0.5 }, // out of the valid (0.5, 0.8] range → null
      28.5,
      straightShape(Math.SQRT1_2, Math.SQRT1_2),
      200
    );
    const pos = { x: 4000, y: 3000 };
    expect(cd._applyLeaderForwardBias(pos, 0.5, 1, 1, W, H)).toBe(pos);
  });
});
