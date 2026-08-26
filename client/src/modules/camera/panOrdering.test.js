// ============================================================
// panOrdering.test.js — RUNIN-ORDER-FIX-1 / RUNIN-PIVOT-SCOPE-1
//
// REPLACES panStaleZoom.test.js, which pinned a correction that no longer exists. That file tested
// `_restatePanTargetAtDrawnZoom` — a re-statement applied AFTER the aim had been resolved at the
// wrong scale. The repair removed the wrong scale instead, so there is nothing left to re-state and
// its six tests had no subject. What they were really protecting is the property below, and it is
// pinned here against the ordering rather than against the patch.
//
// THE PROPERTY. An aim is stored as a screen offset — `world x scale` — so it is only meaningful
// beside the scale it was taken at. `update()` settles this frame's zoom on every path, and only
// then resolves the aim. So for any frame the renderer draws, the scale the aim was stated at is the
// scale it is drawn with.
//
// EVERY TEST CARRIES ITS SABOTAGE, and the sabotage here is the OLD ORDER: resolve the aim, then
// move the zoom. That is precisely what the file used to do every frame.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../cameraConfig.js';

const WORLD = 4000;
const CANVAS_W = 1280;
const CANVAS_H = 720;
const FINISH_T = 1;
const RS = { finishT: FINISH_T, finishedCount: 0, raceElapsed: 60000 };

const mkShape = () => ({
  isOpen: true,
  getPosition: (t) => ({ x: Math.max(0, Math.min(1, t)) * WORLD, y: 360 }),
  getActualTrackWidth: () => 300,
});

/** Spread moves the zoom: the framing rule widens to hold the group. */
const mkRacers = (p, spread = 0.01) => [
  { index: 0, t: p * FINISH_T, x: p * WORLD, y: 360 },
  { index: 1, t: p * FINISH_T - spread, x: (p - spread) * WORLD, y: 360 },
];

const mkDirector = () =>
  new CameraDirector(
    WORLD,
    CANVAS_H,
    true,
    { ...DEFAULT_CAMERA_CONFIG, contenderZoom: false },
    36,
    mkShape(),
    300
  );

const warm = (cd, p = 0.5, frames = 180) => {
  let ts = 1000;
  for (let w = 0; w < frames; w++) {
    cd.update(mkRacers(p), ts, RS, CANVAS_W, CANVAS_H);
    ts += 1000 / 60;
  }
  return ts;
};

/**
 * `targetOffsetX = -camX x eff`, so dividing the aim by the scale the frame is DRAWN with must give
 * back the `-camX` the resolver decided. Any mismatch between the two scales shows up here,
 * multiplied by the subject's distance from the world origin.
 */
const aimWorldError = (cd) =>
  Math.abs(cd.targetOffsetX / cd._proj.effX(cd.zoom) - -cd._lastResolvedPanTarget.camX);

describe('RUNIN-ORDER-FIX-1 — the aim is resolved at the scale the frame is drawn with', () => {
  // ── 1. THE PROPERTY, ON A FRAME WHOSE ZOOM MOVED ────────────────────────────────────────────
  //
  // The spec's named test: prove the aim is expressed at the drawn scale on a frame where the two
  // would otherwise differ. IF THE ORDER IS REVERSED: the aim names the world position it had at
  // the previous frame's scale, and the error is `camX x d eff`.
  it('a frame whose zoom moved states its aim at the drawn scale', () => {
    const cd = mkDirector();
    const ts = warm(cd);
    cd.state = CAM_STATE.LEADER_ZOOM;

    const zoomBefore = cd.zoom;
    cd.update(mkRacers(0.5, 0.16), ts, RS, CANVAS_W, CANVAS_H);

    expect(Math.abs(cd.zoom - zoomBefore)).toBeGreaterThan(1e-9); // the zoom DID move, or nothing is proved
    expect(-cd._lastResolvedPanTarget.camX).not.toBe(0); // the subject is off the origin, or the bug cannot show
    expect(aimWorldError(cd)).toBeLessThan(1e-6);

    // ── SABOTAGE — THE OLD ORDER, REPRODUCED. Resolve the aim, then move the zoom underneath it.
    const before = cd.targetOffsetX;
    cd.zoom *= 1.5;
    expect(cd.targetOffsetX).toBe(before); // nothing re-stated it — that is the point
    expect(aimWorldError(cd)).toBeGreaterThan(1); // world px of aim error from one zoom step
  });

  // ── 2. EVERY FRAME OF A MOVING SHOT, NOT ONE CHOSEN FRAME ───────────────────────────────────
  it('holds on every frame of a continuously widening shot', () => {
    const cd = mkDirector();
    let ts = warm(cd);
    cd.state = CAM_STATE.LEADER_ZOOM;
    let moved = 0;
    let worst = 0;
    for (let f = 0; f < 90; f++) {
      const before = cd.zoom;
      cd.update(mkRacers(0.5 + f * 0.002, 0.01 + f * 0.0015), ts, RS, CANVAS_W, CANVAS_H);
      ts += 1000 / 60;
      if (Math.abs(cd.zoom - before) > 1e-9 && cd._lastResolvedPanTarget) {
        moved++;
        worst = Math.max(worst, aimWorldError(cd));
      }
    }
    expect(moved).toBeGreaterThan(30); // the shot really was moving, or the test is inert
    expect(worst).toBeLessThan(1e-6);
  });

  // ── 3. THE ZOOM IS SETTLED BEFORE THE AIM IS RESOLVED, AND THAT ORDER IS THE MECHANISM ──────
  //
  // IF DELETED: someone re-orders `update()` and the aim goes back to being resolved against the
  // previous frame's zoom, with nothing to catch it but a picture the owner has to notice.
  it('_resolvePanTarget reads the zoom update() has already settled', () => {
    const cd = mkDirector();
    const ts = warm(cd);
    cd.state = CAM_STATE.LEADER_ZOOM;

    const seen = [];
    const spy = vi.spyOn(cd, '_resolvePanTarget').mockImplementation(function () {
      seen.push(this.zoom);
      return CameraDirector.prototype._resolvePanTarget.call(this);
    });
    cd.update(mkRacers(0.5, 0.16), ts, RS, CANVAS_W, CANVAS_H);
    spy.mockRestore();

    expect(seen).toHaveLength(1);
    // The zoom the resolver saw is the zoom the frame ends on — not the one it started with.
    expect(seen[0]).toBeCloseTo(cd.zoom, 12);
  });

  // ── 4. THE PIVOT STAYS, AND ITS SCOPE IS THE FOLLOW PATH ────────────────────────────────────
  //
  // RUNIN-ORDER-FIX-1 measured what deleting it costs — the worst sideways jump went from 59 px to
  // 360 px — because it does a different job from the ordering: it carries the smoother's
  // screen-space lag through a zoom change. RUNIN-PIVOT-SCOPE-1 measured what WIDENING it costs:
  // applied to entry frames as well, it cut the level set on 48 frames. Both bounds matter, so both
  // are pinned: it must fire on a follow frame whose zoom moved, and it is the anchor it pivots on.
  it('the follow path still pivots about the anchor when the zoom moves', () => {
    const cd = mkDirector();
    let ts = warm(cd);
    cd.state = CAM_STATE.LEADER_ZOOM;
    let fired = 0;
    for (let f = 0; f < 40; f++) {
      cd.update(mkRacers(0.5 + f * 0.002, 0.01 + f * 0.002), ts, RS, CANVAS_W, CANVAS_H);
      ts += 1000 / 60;
      if (cd._lastPivotAnchorX !== null) fired++;
    }
    expect(fired).toBeGreaterThan(20); // it is live on the path that carries the crossing

    // ── SABOTAGE: a frame with no zoom change must record no pivot, or "fires" means nothing.
    const settled = mkDirector();
    warm(settled, 0.5, 400);
    const z = settled.zoom;
    settled.update(mkRacers(0.5), settled._lastTs + 1000 / 60, RS, CANVAS_W, CANVAS_H);
    if (Math.abs(settled.zoom - z) < 1e-12) expect(settled._lastPivotAnchorX).toBe(null);
  });
});
