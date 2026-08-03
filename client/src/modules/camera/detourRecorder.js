// ============================================================
// File:        detourRecorder.js
// Path:        client/src/modules/camera/detourRecorder.js
// Project:     RaceArena — CAMERA-DETOUR-1 / CAMERA-HYGIENE-2
//
// WHAT THIS IS FOR: locating the frame on which the camera starts moving the WRONG WAY after a view
// change. It captures a window around every transition — the 3 frames before and the ~31 after —
// with enough per-frame signal to tell the four suspects apart, and prints each completed window as
// one console line so the owner can hand a live trace over verbatim.
//
// WHAT IT IS NOT FOR, and this is load-bearing: it is not part of the camera. It never writes a
// camera value. That is what lets `scripts/camera-fingerprint.mjs` produce the same hash with the
// log on and off, and it is why this file may be edited freely without a re-baseline — a recorder
// that could nudge the picture would be an instrument that changes what it measures.
//
// THE ONE RULE FOR ADDING A COLUMN: log what the frame ACTUALLY committed, never a recomputation
// from other inputs. The anchor's screen position below is projected with the very offset and zoom
// the renderer drew with. A log line that recomputes its own expectation always agrees with itself,
// proves nothing, and hid this camera defect for two days.
//
// WHY IT OWNS ITS BUFFERS. This used to be ten fields on CameraDirector and eight
// `if (this._detourEnabled)` guards through update(). The recorder now holds its own state and the
// director holds one nullable reference, so "is the log on?" is answered once, by whether the
// object exists, instead of at every call site.
// ============================================================

import { getPanTarget } from './panTarget.js';

const PRE_FRAMES = 3; // frames captured BEFORE the transition (rel -3..-1)
const POST_FRAMES = 31; // frames captured from the transition onward (rel 0..30)
const MAX_WINDOWS = 20; // completed windows retained for export; older ones drop off the front

const r3 = (v) => (v == null ? null : Math.round(v * 1000) / 1000);
const r6 = (v) => (v == null ? null : Math.round(v * 1e6) / 1e6);

export class DetourRecorder {
  constructor() {
    this._preBuf = []; // rolling last-PRE_FRAMES pre-transition snapshots
    this._window = null; // active capture window, or null between transitions
    this._log = []; // completed windows, for export/inspection
    this._prevState = null; // previous frame's state → the transition's from-state
    // Per-frame markers the director notes AT the moment it makes the choice, because they are not
    // recoverable afterwards: which branch wrote the offset, and where the glide was in its ease.
    this._branch = null;
    this._glideS = null;
    this._glideE = null;
    this._setTargetsZoom = null; // the zoom _setTargets used, vs. the zoom the renderer drew with
  }

  /** Candidate D: the zoom `_setTargets` computed its pan from, noted before it runs. */
  noteSetTargetsZoom(zoom) {
    this._setTargetsZoom = zoom;
  }

  /** Clear the per-frame branch markers before the update() branches pick one. */
  beginFrame() {
    this._branch = null;
    this._glideS = null;
    this._glideE = null;
  }

  /**
   * Which branch wrote offsetX/offsetY this frame: 'glide' | 'cut' | 'follow'.
   * The glide passes its linear progress `s` and eased factor `e`; the others pass neither.
   */
  noteBranch(branch, s = null, e = null) {
    this._branch = branch;
    this._glideS = s;
    this._glideE = e;
  }

  /** Completed per-transition windows captured while cameraDetourLog was on. */
  export() {
    return this._log;
  }

  _push(window) {
    this._log.push(window);
    if (this._log.length > MAX_WINDOWS) this._log.shift();
  }

  /**
   * Record one frame. Called at the very end of update(), after the renderer's values are final.
   *
   * @param {CameraDirector} dir  the live director — read only, never written
   * @param {boolean} tSpaceLerpActive  did the follow path read _camT this frame
   * @param {boolean} transitioned  did a transition fire this frame
   * @param {Array} racers  the frame's racer list
   */
  record(dir, tSpaceLerpActive, transitioned, racers) {
    if (transitioned) this._openWindow(dir);
    if (this._window && this._window.remaining > 0)
      this._captureInto(dir, tSpaceLerpActive, racers);

    // Advance the rolling pre-buffer and remember this frame's state for the next transition.
    this._preBuf.push({
      st: dir.state,
      ts: dir._lastTs,
      ox: dir.offsetX,
      oy: dir.offsetY,
      z: dir.zoom,
      ct: dir._camT,
    });
    if (this._preBuf.length > PRE_FRAMES) this._preBuf.shift();
    this._prevState = dir.state;
  }

  /** Open a window on the transition frame, flushing the rolling pre-buffer as rel -N..-1. */
  _openWindow(dir) {
    // A prior window may still be open (transitions less than POST_FRAMES apart). Keep it,
    // truncated, so nothing is lost — only completed windows are console-emitted.
    if (this._window) this._push(this._window);

    const pre = this._preBuf.slice(-PRE_FRAMES);
    const preFrames = pre.map((p, i) => ({
      rel: i - pre.length,
      // CAMERA-REPRO-1: the camera clock this frame was drawn at. The ONE coordinate a marker and
      // this log share — without it the marker can say WHERE only in prose, and matching a marked
      // moment to a logged window is eyeball work.
      ts: r3(p.ts),
      from: p.st,
      to: dir.state,
      anchorSX: null, // the NEW-state anchor is undefined before the transition
      anchorSY: null,
      oX: r3(p.ox),
      oY: r3(p.oy),
      z: r6(p.z),
      camT: r6(p.ct),
    }));
    const lastPre = pre.length ? pre[pre.length - 1] : null;
    this._window = {
      from: this._prevState,
      to: dir.state,
      preoX: lastPre ? lastPre.ox : null, // candidate A: the offset the eye last saw (rel -1)
      preoY: lastPre ? lastPre.oy : null,
      prez: lastPre ? lastPre.z : null,
      frames: preFrames,
      remaining: POST_FRAMES,
    };
  }

  /** Capture this frame into the active window (rel 0..POST_FRAMES-1), and emit when it fills. */
  _captureInto(dir, tSpaceLerpActive, racers) {
    const w = this._window;
    // The NEW state's centre world point — getPanTarget covers every state (incl. BATTLE, where
    // there is no single anchor racer) — projected with THIS frame's rendered offset/zoom.
    const focus = dir._focusRacers(racers);
    const anchorW = getPanTarget(dir.state, focus, dir._shape);
    const anchorS = dir._proj.toScreen(anchorW, dir.zoom, dir.offsetX, dir.offsetY);
    w.frames.push({
      rel: POST_FRAMES - w.remaining,
      ts: r3(dir._lastTs), // CAMERA-REPRO-1: shared coordinate with the marker's moment.cms
      from: w.from,
      to: dir.state,
      anchorSX: r3(anchorS.x),
      anchorSY: r3(anchorS.y),
      // CAMERA-DETOUR-2: the anchor's WORLD position — so its own motion is separable from the
      // camera's (the OVERVIEW centroid moves on its own as the field spreads).
      awX: r3(anchorW.x),
      awY: r3(anchorW.y),
      rc: focus.length, // how many racers the centroid came from (a changing set moves it)
      oX: r3(dir.offsetX),
      oY: r3(dir.offsetY),
      z: r6(dir.zoom),
      // the glide's ENDPOINT as recomputed this frame — a moving endpoint shows up as a moving one
      toX: r3(dir.targetOffsetX),
      toY: r3(dir.targetOffsetY),
      s: r6(this._glideS), // glide progress (linear) …
      e: r6(this._glideE), // … and eased
      br: this._branch, // which branch WROTE offsetX/offsetY this frame: glide | cut | follow
      gsoX: r3(dir._glideStartOffsetX), // candidate A: where the glide started from …
      gsoY: r3(dir._glideStartOffsetY),
      gsz: r6(dir._glideStartZoom),
      preoX: r3(w.preoX), // … versus the offset the eye last saw
      preoY: r3(w.preoY),
      prez: r6(w.prez),
      camT: r6(dir._camT), // candidate B: the second (track-space) mover
      camTRead: !!tSpaceLerpActive, // did the follow path read _camT this frame
      // CAMERA-HYGIENE-2: candidate C (containMod/containDX/containDY) is gone. Its writer was the
      // containment clamp, deleted in CAMERA-FRAMING-1; every window logged after that carried
      // `containMod:false, containDX:0, containDY:0` — three columns that could only ever report
      // that the thing which no longer exists did not happen.
      stZoom: r6(this._setTargetsZoom), // candidate D: the zoom _setTargets used …
      rz: r6(dir.zoom), // … versus the zoom the renderer drew with
    });
    w.remaining -= 1;
    if (w.remaining === 0) {
      this._push(w);
      try {
        // eslint-disable-next-line no-console
        console.info(`[RA CAMERA DETOUR] ${w.from}->${w.to}`, JSON.stringify(w.frames));
      } catch {
        // console unavailable (headless) — the window is still in the log for export
      }
      this._window = null;
    }
  }
}
