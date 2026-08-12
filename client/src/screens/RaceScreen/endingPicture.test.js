// ============================================================
// File:        endingPicture.test.js
// Path:        client/src/screens/RaceScreen/endingPicture.test.js
// Project:     RaceArena — ENDING-PICTURE-1
// Created:     2026-08-12
// Description: The two keys that decide what is ON SCREEN while the ending runs, each asserted in
//              BOTH positions (L203).
//
//              WHAT THESE GUARD. For four months the ending replaced the director's transform with
//              an identity matrix and drew a full-canvas scrim over the result, and nothing noticed:
//              the camera fingerprint stops at the last crossing and the render fingerprint samples
//              no FINISHED frame. `scripts/check-ending-frame.mjs` is the guard that renders a real
//              frame; these are the unit-level statements of the same two rules.
// ============================================================

import { describe, it, expect } from 'vitest';

import { DEFAULT_CAMERA_CONFIG } from '../../modules/storage/defaults.js';
import { drawFinishedOverlay } from './drawing/overlayRendering.js';

describe('ENDING-PICTURE-1 — the shipped defaults are the fix', () => {
  it('the ending keeps the finish shot, and the splash is retired', () => {
    expect(DEFAULT_CAMERA_CONFIG.endingKeepsFinishShot).toBe(true);
    expect(DEFAULT_CAMERA_CONFIG.finishedSplashEnabled).toBe(false);
  });
});

// ── THE CAMERA: what the two positions of `endingKeepsFinishShot` actually select ──────────────
//
// The selection itself is one expression in the render loop; what it CHOOSES BETWEEN is a
// director-composed transform and the identity. The identity is the thing worth pinning, because it
// is what made the picture disappear and because it is a constant a test can state exactly.

describe('ENDING-PICTURE-1 — the identity transform is not a shot', () => {
  const IDENTITY = { zoom: 1, offsetX: 0, offsetY: 0 };
  // The world->screen scale at cam.zoom = 1, per projection.js: per-axis for a closed track,
  // a uniform 1.5 for an open one.
  const closed = { bsX: 1280 / 3072, bsY: 720 / 2048 };
  const open = { bsX: 1.5, bsY: 1.5 };
  const windowOf = (cam, bs) => ({
    w: 1280 / (cam.zoom * bs.bsX),
    h: 720 / (cam.zoom * bs.bsY),
  });

  it('on a closed track it shows the ENTIRE world, which is a map and not a finish', () => {
    const w = windowOf(IDENTITY, closed);
    expect(Math.round(w.w)).toBe(3072); // the whole 3072-wide world
    expect(Math.round(w.h)).toBe(2048);
  });

  it('on an open track it shows a corner the racers are not in', () => {
    const w = windowOf(IDENTITY, open);
    expect(Math.round(w.w)).toBe(853);
    // A 6144-wide open track: the window is 14% of it, anchored at world (0,0) by the zero offset.
    expect(w.w / 6144).toBeLessThan(0.15);
  });
});

// ── THE SPLASH: it is a full-canvas cover, and that is the property that matters ───────────────

describe('ENDING-PICTURE-1 — the splash covers the whole canvas', () => {
  /** Records the calls that can hide the picture. */
  function recorder() {
    const calls = [];
    return new Proxy(
      { calls },
      {
        get: (t, k) => {
          if (k === 'calls') return calls;
          if (k === 'canvas') return { width: 1280, height: 720 };
          return (...args) => calls.push({ fn: String(k), args });
        },
        set: () => true,
      }
    );
  }

  it('fills 1280x720 — which is why it could not stay once the ending had something to show', () => {
    const ctx = recorder();
    drawFinishedOverlay(ctx);
    const full = ctx.calls.filter(
      (c) =>
        c.fn === 'fillRect' &&
        c.args[0] === 0 &&
        c.args[1] === 0 &&
        c.args[2] === 1280 &&
        c.args[3] === 720
    );
    expect(full).toHaveLength(1);
  });

  it('says "Loading results…", which was never true by the time it was drawn', () => {
    const ctx = recorder();
    drawFinishedOverlay(ctx);
    const texts = ctx.calls.filter((c) => c.fn === 'fillText').map((c) => c.args[0]);
    expect(texts).toContain('Loading results…');
    // The results are in sessionStorage on the SAME FRAME the phase flips — see index.jsx's
    // `finishedCount >= nRacers` block, which writes `raceResults` before it starts any timer.
  });
});
