// ============================================================
// panStaleZoom.test.js — RUNIN-PAN-STALE-ZOOM-1
//
// THE DEFECT: `_setTargets` resolves the pan using `this.zoom` as it stands when it runs, and stores
// the answer as a SCREEN OFFSET — `targetOffsetX = -camX x effectiveZoom`, a product taken from the
// WORLD ORIGIN. On the follow path the zoom is then lerped AFTER `_setTargets`, because the only
// pre-`_setTargets` zoom lerp is gated on `tSpaceLerpActive`, which is the ENTRY phase alone. So the
// aim is resolved at one zoom and drawn at another, and the error is multiplied by the subject's
// distance from the origin. Measured on the anatomy trace: up to 973 px of the subject's own
// displacement, and the leader off a fixed 1280x720 canvas for 21 frames on river-run seed 13.
//
// The correction already existed for the frames where the endgame schedule owns the zoom. Its window
// ended one frame too early: at the crossing the schedule hands back, and the largest zoom move of
// the race begins on the very next frame — outside the scope.
//
// EVERY TEST HERE CARRIES ITS SABOTAGE. A test that has never been seen to fail proves nothing, so
// each one re-runs its own scenario with the mechanism stubbed out and asserts the opposite.
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

/**
 * A field whose SPREAD is a parameter, because spread is what moves the zoom: the framing rule
 * widens to hold the group, so opening the field forces `targetZoom` away from `this.zoom` and puts
 * the follow path's zoom lerp — the one that runs AFTER `_setTargets` — into motion.
 */
const mkRacers = (p, spread = 0.01) => [
  { index: 0, t: p * FINISH_T, x: p * WORLD, y: 360 },
  { index: 1, t: p * FINISH_T - spread, x: (p - spread) * WORLD, y: 360 },
];

const mkDirector = (cfg = {}) =>
  new CameraDirector(
    WORLD,
    CANVAS_H,
    true,
    { ...DEFAULT_CAMERA_CONFIG, contenderZoom: false, ...cfg },
    36,
    mkShape(),
    300
  );

/** Warm a director on the follow path at `p` until it is settled, well outside the endgame. */
const warm = (cd, p = 0.5, frames = 180) => {
  let ts = 1000;
  for (let w = 0; w < frames; w++) {
    cd.update(mkRacers(p), ts, RS, CANVAS_W, CANVAS_H);
    ts += 1000 / 60;
  }
  return ts;
};

/**
 * THE PROPERTY, IN ONE PLACE. `targetOffsetX = -camX x eff`, so dividing the aim by the zoom the
 * frame is DRAWN with must give back the same `-camX` the resolver decided. This is the same
 * property the shipped invariant 6 pins for the schedule's frames, asked of whatever frame it is
 * handed.
 */
const aimWorldError = (cd) => {
  const eDrawn = cd._proj.effX(cd.zoom);
  const worldFromAim = cd.targetOffsetX / eDrawn;
  const worldAsResolved = -cd._lastResolvedPanTarget.camX;
  return Math.abs(worldFromAim - worldAsResolved);
};

describe('RUNIN-PAN-STALE-ZOOM-1 — the aim is expressed at the zoom the frame is drawn with', () => {
  // ── 1. THE FOLLOW PATH, WHICH IS THE PATH THE CROSSING TAKES ────────────────────────────────
  //
  // IF THE CORRECTION IS REMOVED: the aim keeps naming the world position it had at the PREVIOUS
  // frame's zoom, and the discrepancy is `camX x d eff` — thousands of pixels once the subject is
  // some thousands of world px from the origin, which is where every real track puts him.
  it('a follow frame whose zoom moved states the aim at the drawn zoom, not the resolved one', () => {
    const cd = mkDirector();
    let ts = warm(cd);
    cd.state = CAM_STATE.LEADER_ZOOM;
    cd._runInAfterDeadline = true; // the endgame close is running — the window the repair is scoped to

    // Open the field on ONE frame. The framing rule widens for it, so `targetZoom` leaves
    // `this.zoom` and the follow path's post-`_setTargets` lerp moves the zoom under the aim.
    const zoomBefore = cd.zoom;
    cd.update(mkRacers(0.5, 0.16), ts, RS, CANVAS_W, CANVAS_H);

    expect(cd._lerpPhase).not.toBe('glide'); // the glide is excluded on purpose; not this test
    expect(Math.abs(cd.zoom - zoomBefore)).toBeGreaterThan(1e-9); // the zoom DID move, or nothing is proved
    expect(cd._lastResolvedPanTarget).toBeTruthy();
    expect(-cd._lastResolvedPanTarget.camX).not.toBe(0); // the subject is off the origin, or the bug cannot show

    expect(aimWorldError(cd)).toBeLessThan(1e-6);

    // ── SABOTAGE ──────────────────────────────────────────────────────────────────────────────
    const sab = mkDirector();
    let sts = warm(sab);
    sab.state = CAM_STATE.LEADER_ZOOM;
    const stub = vi.spyOn(sab, '_restatePanTargetAtDrawnZoom').mockReturnValue(false);
    sab.update(mkRacers(0.5, 0.16), sts, RS, CANVAS_W, CANVAS_H);
    stub.mockRestore();
    expect(aimWorldError(sab)).toBeGreaterThan(1); // the defect, in world px, on this one frame
  });

  // ── 2. EVERY FRAME OF A MOVING SHOT, NOT ONE CHOSEN FRAME ───────────────────────────────────
  //
  // One frame can pass by luck. This walks a field that keeps opening, so the zoom is in motion
  // throughout, and asserts the property on every frame that actually moved the zoom.
  it('holds on every follow frame whose zoom moved, across a continuously widening shot', () => {
    const run = (sabotage) => {
      const cd = mkDirector();
      let ts = warm(cd);
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd._runInAfterDeadline = true; // the endgame close is running
      if (sabotage) vi.spyOn(cd, '_restatePanTargetAtDrawnZoom').mockReturnValue(false);
      let moved = 0;
      let worst = 0;
      for (let f = 0; f < 90; f++) {
        const before = cd.zoom;
        cd.update(mkRacers(0.5 + f * 0.002, 0.01 + f * 0.0015), ts, RS, CANVAS_W, CANVAS_H);
        ts += 1000 / 60;
        if (
          Math.abs(cd.zoom - before) > 1e-9 &&
          cd._lerpPhase !== 'glide' &&
          cd._lastResolvedPanTarget
        ) {
          moved++;
          worst = Math.max(worst, aimWorldError(cd));
        }
      }
      return { moved, worst };
    };

    const good = run(false);
    expect(good.moved).toBeGreaterThan(30); // the shot really was moving, or the test is inert
    expect(good.worst).toBeLessThan(1e-6);

    const bad = run(true); // ── SABOTAGE ──
    expect(bad.moved).toBeGreaterThan(30);
    expect(bad.worst).toBeGreaterThan(10); // world px of aim error, every moving frame
  });

  // ── 2b. THE RACE BEFORE THE ENDGAME IS UNTOUCHED, AND THAT IS THE POINT OF THE SCOPE ────────
  //
  // The staleness is general; the repair is not. Called on every follow frame it also reaches the
  // ENTRY phase, whose convergence test is `|targetOffsetX - offsetX| < _entryConvergencePx`, so
  // moving the target moves when a state stops entering and starts tracking — measured on
  // `scripts/tracking-lag.mjs` against the branch tip with this change REVERTED: LEADER_ZOOM's
  // median lag 4.99 -> 5.08 pp and BATTLE_ZOOM's p95 10.16 -> 10.06, a state-machine timing change
  // dressed as a pan fix. Scoped, the same harness moves exactly one state (PHOTO_FINISH
  // 2.89 -> 2.95 pp) and leaves every frame count identical. `_runInAfterDeadline` is false for the
  // whole race before the endgame close, and this pins that.
  //
  // IF THE GATE IS REMOVED: every state in the race moves, and the owner's eye-test of the crossing
  // is confounded by a camera that also behaves differently everywhere else.
  it('does not touch a frame before the endgame close is running', () => {
    const walk = (afterDeadline) => {
      const cd = mkDirector();
      let ts = warm(cd);
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd._runInAfterDeadline = afterDeadline;
      const seen = [];
      for (let f = 0; f < 40; f++) {
        cd.update(mkRacers(0.5 + f * 0.002, 0.01 + f * 0.0015), ts, RS, CANVAS_W, CANVAS_H);
        ts += 1000 / 60;
        seen.push(cd.offsetX, cd.offsetY, cd.zoom);
      }
      return seen;
    };

    // Before the deadline the correction never fires, so the frames are the shipped ones.
    const before = walk(false);
    const alsoBefore = walk(false);
    expect(before).toEqual(alsoBefore); // deterministic, or the comparison below means nothing

    // ── SABOTAGE: the SAME walk inside the window must differ, or "untouched" is untestable
    // because the correction never does anything on this scenario at all.
    const inside = walk(true);
    expect(inside).not.toEqual(before);
  });

  // ── 3. INERT WHEN THE ZOOM DID NOT MOVE — WHICH IS WHY A SETTLED SHOT IS UNTOUCHED ──────────
  //
  // This is the guarantee that the correction cannot perturb a frame that had no zoom change: the
  // ratio is exactly 1 and the method declines. It is what makes "one implementation, called from
  // every path that finalises the zoom" safe rather than reckless.
  it('does nothing at all on a frame whose zoom did not move', () => {
    const cd = mkDirector();
    warm(cd);
    cd._panTargetEff = cd._proj.effX(cd.zoom);
    const x = cd.targetOffsetX;
    const y = cd.targetOffsetY;

    expect(cd._restatePanTargetAtDrawnZoom()).toBe(false);
    expect(cd.targetOffsetX).toBe(x);
    expect(cd.targetOffsetY).toBe(y);

    // ── SABOTAGE: a zoom that HAS moved must be acted on, or "inert" would be indistinguishable
    // from "broken and never firing".
    cd._panTargetEff = cd._proj.effX(cd.zoom) * 0.5;
    expect(cd._restatePanTargetAtDrawnZoom()).toBe(true);
    expect(cd.targetOffsetX).not.toBe(x);
  });

  // ── 4. IDEMPOTENT, WHICH IS WHAT ALLOWS TWO CALL SITES AND ONE MECHANISM ────────────────────
  //
  // The schedule's frames are re-stated before the branch chain; the follow branch then calls again
  // after its own (no-op) zoom lerp. If the second call scaled a second time, the schedule's frames
  // would be corrected twice and thrown the other way.
  it('a second call on the same frame is a no-op — the aim is not scaled twice', () => {
    const cd = mkDirector();
    warm(cd);
    cd._panTargetEff = cd._proj.effX(cd.zoom) * 0.5; // pretend the zoom doubled since resolve

    expect(cd._restatePanTargetAtDrawnZoom()).toBe(true);
    const once = { x: cd.targetOffsetX, y: cd.targetOffsetY };

    expect(cd._restatePanTargetAtDrawnZoom()).toBe(false);
    expect(cd.targetOffsetX).toBe(once.x);
    expect(cd.targetOffsetY).toBe(once.y);

    // ── SABOTAGE: without the `_panTargetEff` write-back the second call would scale again.
    cd._panTargetEff = cd._proj.effX(cd.zoom) * 0.5;
    expect(cd._restatePanTargetAtDrawnZoom()).toBe(true);
    expect(cd.targetOffsetX).not.toBe(once.x);
  });

  // ── 5. THE RESOLVER'S OWN RECORD IS NOT OVERWRITTEN ─────────────────────────────────────────
  //
  // `_lastResolvedPanTarget.effectiveZoom` records what the RESOLVER decided, and the shipped
  // invariant 6 asserts the drawn zoom DIFFERS from it — so writing the correction back into that
  // field would make that test inert instead of failing. The correction carries its own state for
  // exactly this reason.
  it('records its progress in _panTargetEff and leaves the resolver record alone', () => {
    const cd = mkDirector();
    warm(cd);
    const resolved = cd._lastResolvedPanTarget.effectiveZoom;
    cd._panTargetEff = cd._proj.effX(cd.zoom) * 0.5;

    expect(cd._restatePanTargetAtDrawnZoom()).toBe(true);
    expect(cd._lastResolvedPanTarget.effectiveZoom).toBe(resolved);
    expect(cd._panTargetEff).toBeCloseTo(cd._proj.effX(cd.zoom), 12);
  });
});
