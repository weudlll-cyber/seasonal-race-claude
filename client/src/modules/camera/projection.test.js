// ============================================================
// File:        projection.test.js
// Path:        client/src/modules/camera/projection.test.js
// Project:     RaceArena
// Description: CAMERA-PROJECTION-1 — the three LOAD-BEARING invariants, each with a failure proof.
//              (Failure proofs only for these three; the owner's proportionality rule means the
//              rest of the suite does not get one each.)
//
//              1. THE PROJECTION IS THE ONLY PATH — no state may compute a screen position by hand.
//              2. PER-AXIS IS REAL — X and Y are different scales on a non-square closed world, and
//                 the projection cannot be asked for one without the other.
//              3. RESOLUTION CONSISTENCY — re-author the same content at k x resolution and the
//                 projection maps it to the same place on screen.
//
//              NOT tested here, and deliberately: "the same SLIDER shows the same fraction of the
//              world on a 3072 and a 6144 track", and "a larger slider value is a closer shot in
//              every state". Both are FALSE today — they are the slider-unit block's guarantee, not
//              this one's. Asserting them now would either fail or lock in a workaround.
//              See reports/evolution/CAMERA-PROJECTION-1.md.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  makeProjection,
  projectionForTrack,
  OPEN_TRACK_BASE_ZOOM,
  REFERENCE_CANVAS_W,
  REFERENCE_CANVAS_H,
  MAX_CAM_ZOOM,
} from './projection.js';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── 1. THE PROJECTION IS THE ONLY PATH ────────────────────────────────────────────────────────
// A structural test: the world→screen scales may be READ from the projection, never re-derived.
// Before CAMERA-PROJECTION-1 the director multiplied by `this._bsX` / `OPEN_TRACK_BASE_ZOOM` at 28
// sites; three separate bugs (CAMERA-FOCUS-5 and its two survivors) were one of those sites using
// the X scale on the Y axis. This test is what stops a fourth.
describe('CAMERA-PROJECTION-1 — the projection is the only world→screen path', () => {
  const SRC = readFileSync(join(HERE, 'CameraDirector.js'), 'utf8');
  // Strip comments so prose about the old code cannot fail the test.
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const CODE = stripComments(SRC);

  it('CameraDirector never does arithmetic with the raw axis scales', () => {
    // `this._bsX` / `this._bsY` may exist as fields (the dev HUD reads them) but must never be
    // multiplied or divided by inside the director — that is the projection's job.
    const arithmetic = /this\._bs[XY]\s*[*/]|[*/]\s*this\._bs[XY]/g;
    expect(CODE.match(arithmetic)).toBeNull();
  });

  it('CameraDirector never multiplies by OPEN_TRACK_BASE_ZOOM directly', () => {
    const arithmetic = /OPEN_TRACK_BASE_ZOOM\s*[*/]|[*/]\s*OPEN_TRACK_BASE_ZOOM/g;
    expect(CODE.match(arithmetic)).toBeNull();
  });

  it('FAILURE PROOF: the guard catches a hand-rolled projection', () => {
    // Exactly the shape of the CAMERA-FOCUS-5 defect: the X scale used on the Y axis.
    const reintroduced = 'const sy = anchor.y * this._bsX + this.offsetY;';
    const arithmetic = /this\._bs[XY]\s*[*/]|[*/]\s*this\._bs[XY]/g;
    expect(stripComments(reintroduced).match(arithmetic)).not.toBeNull();
  });
});

// ── 2. PER-AXIS IS REAL ───────────────────────────────────────────────────────────────────────
describe('CAMERA-PROJECTION-1 — the projection is per-axis', () => {
  // dirt-oval: 3072 x 2047 → bsX 0.4167, bsY 0.3517. An 18.5% mismatch, and the reason the
  // containment clamp fired on ~44% of frames before CAMERA-FOCUS-5.
  const closed = projectionForTrack(3072, 2047, false);
  const open = projectionForTrack(6144, 4096, true);

  it('a non-square CLOSED world has genuinely different X and Y scales', () => {
    expect(closed.axisX).toBeCloseTo(1280 / 3072, 12);
    expect(closed.axisY).toBeCloseTo(720 / 2047, 12);
    expect(closed.axisX / closed.axisY).toBeGreaterThan(1.18); // the 18.5% mismatch, measured
    expect(closed.isUniform).toBe(false);
  });

  it('an OPEN world maps uniformly — effY equals effX there, and that is a property not a guess', () => {
    expect(open.axisX).toBe(OPEN_TRACK_BASE_ZOOM);
    expect(open.axisY).toBe(OPEN_TRACK_BASE_ZOOM);
    expect(open.effY(3.3)).toBe(open.effX(3.3));
    expect(open.isUniform).toBe(true);
  });

  it('toScreen uses the Y scale on Y — the CAMERA-FOCUS-5 defect is unrepresentable', () => {
    const pt = { x: 1000, y: 800 };
    const s = closed.toScreen(pt, 2, 10, 20);
    expect(s.x).toBeCloseTo(1000 * 2 * closed.axisX + 10, 9);
    expect(s.y).toBeCloseTo(800 * 2 * closed.axisY + 20, 9);
  });

  it('FAILURE PROOF: mapping Y with the X scale gives a visibly different answer', () => {
    const pt = { x: 1000, y: 800 };
    const correct = closed.toScreen(pt, 2, 0, 0);
    const wrong = pt.y * 2 * closed.axisX; // the defect
    // 100+ px apart on a 720 px canvas — this is why the clamp shoved the leader to the edge.
    expect(Math.abs(wrong - correct.y)).toBeGreaterThan(100);
  });
});

// ── 3. RESOLUTION CONSISTENCY ─────────────────────────────────────────────────────────────────
// Re-author the SAME content at k x resolution: world and every world coordinate scale by k.
// The projection must put it in the same place on screen, at the same visible fraction.
describe('CAMERA-PROJECTION-1 — resolution consistency of the projection', () => {
  const KS = [0.5, 1, 2, 3];

  for (const isOpen of [false, true]) {
    it(`same content at k x resolution lands identically on screen (${isOpen ? 'open' : 'closed'})`, () => {
      const base = { worldW: 3072, worldH: 2047 };
      const pt = { x: 900, y: 700 };
      const ref = [];
      for (const k of KS) {
        const p = projectionForTrack(base.worldW * k, base.worldH * k, isOpen);
        // "the same shot" = the same fraction of the world visible. Ask the projection for the
        // cam.zoom that shows a fixed fraction, then project the scaled point.
        const camZoom = REFERENCE_CANVAS_W / (0.25 * base.worldW * k) / p.axisX;
        const s = p.toScreen({ x: pt.x * k, y: pt.y * k }, camZoom, 0, 0);
        ref.push({
          sx: s.x,
          sy: s.y,
          visFracW: p.visibleWorldW(camZoom) / (base.worldW * k),
          visFracH: p.visibleWorldH(camZoom) / (base.worldH * k),
        });
      }
      for (let i = 1; i < ref.length; i++) {
        expect(ref[i].sx).toBeCloseTo(ref[0].sx, 6);
        expect(ref[i].sy).toBeCloseTo(ref[0].sy, 6);
        expect(ref[i].visFracW).toBeCloseTo(ref[0].visFracW, 9);
        expect(ref[i].visFracH).toBeCloseTo(ref[0].visFracH, 9);
      }
      expect(ref[0].visFracW).toBeCloseTo(0.25, 9); // and it really is the fraction we asked for
    });
  }

  it('FAILURE PROOF: an ABSOLUTE scale (what four states still use) is NOT resolution-consistent', () => {
    // effZoom = spriteScale, i.e. a fixed number of screen px per world px — the rule
    // LEADER/BATTLE/COMEBACK/LEAD_CHANGE still run. Same setting, double the resolution, half the
    // track visible. This is the defect the slider-unit block exists to fix; asserting it here
    // documents that the projection alone does NOT fix it.
    const fracAt = (k) => {
      const p = projectionForTrack(3072 * k, 2047 * k, false);
      const camZoom = p.camZoomForEffX(3.0); // "slider 3.00"
      return p.visibleWorldW(camZoom) / (3072 * k);
    };
    expect(fracAt(2) / fracAt(1)).toBeCloseTo(0.5, 6);
  });
});

// ── supporting contract ───────────────────────────────────────────────────────────────────────
describe('CAMERA-PROJECTION-1 — projection contract', () => {
  it('camZoomForEffX inverts effX exactly', () => {
    const p = projectionForTrack(4096, 2728, true);
    expect(p.camZoomForEffX(p.effX(2.75))).toBeCloseTo(2.75, 12);
  });

  it('preserves the two historical minimum zooms (unifying them would change the picture)', () => {
    expect(projectionForTrack(3072, 2047, false).minCamZoom).toBe(1.0);
    expect(projectionForTrack(6144, 4096, true).minCamZoom).toBeCloseTo(1280 / 6144, 12);
  });

  it('clampCamZoom honours both ends and survives a corrupt value', () => {
    const p = projectionForTrack(3072, 2047, false);
    expect(p.clampCamZoom(0.2)).toBe(1.0);
    expect(p.clampCamZoom(999)).toBe(MAX_CAM_ZOOM);
    expect(p.clampCamZoom(Number.NaN)).toBe(1.0);
  });

  it('a degenerate world falls back to the reference canvas rather than producing Infinity', () => {
    const p = makeProjection({ worldW: 0, worldH: 0 });
    expect(Number.isFinite(p.axisX)).toBe(true);
    expect(p.axisX).toBe(REFERENCE_CANVAS_W / REFERENCE_CANVAS_W);
    expect(p.axisY).toBe(REFERENCE_CANVAS_H / REFERENCE_CANVAS_H);
  });

  it('is frozen — a state cannot mutate the shared mapping mid-race', () => {
    const p = projectionForTrack(3072, 2047, false);
    expect(Object.isFrozen(p)).toBe(true);
  });
});
