// ============================================================
// File:        viewerProbe.js
// Path:        client/src/modules/viewerProbe.js
// Project:     RaceArena — VIEWER-INVARIANTS-1
//
// WHAT THE VIEWER SEES, AS EVENTS. Five sentences that must be true of EVERY frame, checked in the
// REAL BROWSER against the transform the frame was actually DRAWN with, and reported as individual
// violations — never as a share.
//
// ── WHY EVENTS AND NOT A PERCENTAGE ────────────────────────────────────────────────────────────
//
// This project has now measured the same class of failure twice and reported it twice as an
// average that hid it:
//
//   ENDGAME-SCHEDULE-2  the smoothness figure was GREEN (worst |d2 ln w| 13.1) on a 5-frame SMOOTHED
//                       series while the owner's eye reported hopping. The single-frame event it
//                       averaged away was 0.2206 ln — 141 screen px at the frame edge, in one frame.
//   ENDGAME-REPAIR-1    "the line is findable in 88.0% of endgame frames". The owner then pointed
//                       out that his black frame has NO LEADER AND NO LINE in it — so that check had
//                       not MISSED his excursion, it had COUNTED it, as a twelfth of a percentage.
//
// A RUN WITH ONE CATASTROPHIC FRAME IS WORSE THAN A RUN WITH FIFTY NEAR-MISSES, and no aggregate
// says that. So every violation here carries seed, track, frame index, race progress, which
// invariant broke and BY HOW MUCH. Shares are printed beside the events as context and are never
// the verdict.
//
// ── WHY IN THE BROWSER AND NOT IN THE HEADLESS DIRECTOR ────────────────────────────────────────
//
// The two are proven to diverge, twice, and both times the headless side was the blind one:
//
//   CAMERA-SEED-AND-LINE-1  every harness on `raceDriver` takes the camera's random seed from the
//                           run identity, whose default is a fixed constant. The browser derives it
//                           from the race seed. No harness had ever run the camera the browser runs.
//   RENDER-FINGERPRINT-1    the draw sequence was inlined in RaceScreen and closed over forty-two
//                           pieces of component state, so the render path could not be driven
//                           headlessly and had no protection at all.
//
// This file therefore runs where the picture is: inside the rAF loop, after the draw, on the values
// the RENDERER reports back — `frame.effZoomX/effZoomY` — and not on anything re-derived. That is
// CAMERA-REPRO-1's own rule for its marker: a probe that re-derives its own numbers describes a
// frame that was never drawn.
//
// ── PROD-SAFE, AND OFF UNLESS ASKED FOR ────────────────────────────────────────────────────────
//
// Activated by `?viewerprobe=1`, persisted to sessionStorage so it survives the SPA navigation to
// /race — exactly the shape `rAFProbe.js` already uses for the same reason. When it is off, every
// entry point below returns immediately and allocates nothing.
// ============================================================

import { COMPANY_FRAME_PCT } from './camera/framingRule.js';

let _active = false;
if (typeof window !== 'undefined') {
  try {
    if (new URLSearchParams(window.location.search).get('viewerprobe') === '1') {
      sessionStorage.setItem('_ra_viewerprobe', '1');
    }
    _active = sessionStorage.getItem('_ra_viewerprobe') === '1';
  } catch {
    // Storage blocked (private mode etc.) — the probe simply stays off.
  }
}

// ── THE BOUNDS, AND WHERE EACH ONE CAME FROM ──────────────────────────────────────────────────
//
// Every one of these is either a defect line that needs no number, or a constant this repository
// already owns. NONE was chosen by running a sweep and picking a value that passed; where a bound
// is weak, it says so rather than being quietly tightened until it looks sharp.
//
//   1 COURSE IN SHOT     no threshold at all. Either some sampled point of the track spine projects
//                        inside the canvas or none does. A picture with no course in it is a defect
//                        by inspection — the same standing `check-runin-frame` gives "no racer on
//                        screen", which is the half that actually caught FINISH-FRAMED-1.
//   2 LEADER IN SHOT     no threshold. The leader's own point is on the canvas or it is not.
//   3 LINE FINDABLE      `COMPANY_FRAME_PCT` (0.9), this project's own constant for "in frame, near
//                        the edge is acceptable" — the region a guaranteed COMPANION must be inside.
//                        Not 1.0 (the point sits ON the edge, where the pan's lag takes it back out
//                        — recorded twice, in `_lineCeiling`'s header and in ENDGAME-SCHEDULE-2) and
//                        not 0.7 (the SUBJECT's region, a 1.43x tax the owner's requirement 4
//                        rejects). Scoped to [endgameThreshold, crossing], which is his
//                        requirement 5's own window.
//   4 STEP BOUNDS        a single frame may not HALVE OR DOUBLE the picture (|d ln width| > ln 2),
//                        and may not replace the whole picture sideways (pan step >= the canvas
//                        width). Both are the lines ENDGAME-REPAIR-1's `wild-frame.mjs` already
//                        uses, and both are stated as "this is not a camera move" rather than as a
//                        smoothness taste. THEY ARE DELIBERATELY FAR LOOSER THAN THE SMOOTHNESS
//                        BUDGET — 0.693 against the 0.0230 ln the owner's eye was reacting to.
//                        This file is a floor beneath the framing measurements, not a replacement
//                        for them: it catches catastrophes, and `endgame-spec.mjs` prices texture.
//   5 WIDTH BAND         tighter than the tightest NAMED shot, or wider than the WORLD. The tight
//                        end is the photo finish's own factor, converted to a width by the caller.
//                        THE WIDE END IS ADMITTEDLY WEAK: "not wider than the world" is a sanity
//                        bound, because nothing outside the world exists to look at, and it is the
//                        only wide-end figure in this repository that is not a framing preference.
//                        The observed maximum is reported beside it so the owner's eye can set a
//                        real one; it is NOT tightened here to make a run look better.
const STEP_LN_MAX = Math.log(2);

let _events = [];
let _frames = 0;
let _run = null;
let _prev = null;
let _spine = null;
let _widest = 0;
let _tightest = Infinity;
let _crossed = false;
// DIAGNOSIS ONLY. With `_ra_viewerdump` set, every frame's transform is kept so a violation can be
// traced back through the frames that produced it. Off by default: a sweep keeps only the events.
let _dump = null;

/**
 * Begin recording. Called once per race from RaceScreen; clears anything a previous race left.
 *
 * @param {object} run  identity of the race under test — echoed into every event so a violation
 *   names the race it happened in without the driver having to correlate anything.
 */
export function beginViewerProbe(run) {
  if (!_active) return;
  _events = [];
  _frames = 0;
  _prev = null;
  _spine = null;
  _widest = 0;
  _tightest = Infinity;
  _crossed = false;
  _run = run ?? null;
  try {
    _dump = sessionStorage.getItem('_ra_viewerdump') === '1' ? [] : null;
  } catch {
    _dump = null;
  }
}

/**
 * One frame, AFTER the draw, on the transform the renderer reports.
 *
 * Every argument is a value the caller already has; nothing is recomputed from a second source.
 *
 * @param {object} f
 * @param {number} f.ts            rAF timestamp
 * @param {number} f.effZoomX      world->screen scale the frame was DRAWN with, X
 * @param {number} f.effZoomY      the same on Y
 * @param {number} f.offsetX       screen offset the frame was DRAWN with
 * @param {number} f.offsetY
 * @param {number} f.canvasW
 * @param {number} f.canvasH
 * @param {object} f.shape         the track shape (`getPosition(t, lateral)`)
 * @param {number} f.trackWidthPx  the corridor's width in world px
 * @param {Array}  f.racers        the racers as drawn, each with x, y, t
 * @param {number} f.finishT       the race's finish T
 * @param {number} f.finishedCount how many have crossed
 * @param {number} f.endgameFrom   race progress at which requirement 5's window opens
 * @param {number} f.tightestNamed the tightest NAMED shot's width in world px (the photo finish's)
 * @param {number} f.worldWidth    the world's own width in world px
 * @param {string} f.state         the camera state, for the event's diagnosis
 * @param {string} f.binding       the term that placed the width, for the event's diagnosis
 */
export function recordViewerFrame(f) {
  if (!_active) return;
  if (!f || !(f.effZoomX > 0) || !(f.effZoomY > 0) || !f.shape || !f.racers?.length) return;
  const { canvasW: CW, canvasH: CH } = f;
  if ((f.finishedCount ?? 0) > 0) _crossed = true;
  const i = _frames++;

  const sx = (q) => f.offsetX + q.x * f.effZoomX;
  const sy = (q) => f.offsetY + q.y * f.effZoomY;
  const onCanvas = (X, Y) => X >= 0 && X <= CW && Y >= 0 && Y <= CH;
  const width = CW / f.effZoomX;
  if (width > _widest) _widest = width;
  if (width < _tightest) _tightest = width;

  // The spine, sampled once per race. 240 points is ~1.5 m of track between samples on the longest
  // course here, which cannot straddle a 1280 px canvas.
  if (!_spine) {
    _spine = [];
    for (let k = 0; k <= 240; k++) {
      const p = f.shape.getPosition(k / 240, 0);
      if (p) _spine.push(p);
    }
  }

  const add = (invariant, detail, by) =>
    _events.push({
      ..._run,
      frame: i,
      ms: Math.round(f.ts),
      progress: _progressOf(f),
      invariant,
      detail,
      by,
      state: f.state,
      binding: f.binding,
      widthCorridors: +(width / f.trackWidthPx).toFixed(3),
    });

  // ── 1 — SOME OF THE COURSE IS IN THE PICTURE ────────────────────────────────────────────────
  let courseIn = false;
  for (const p of _spine) {
    if (onCanvas(sx(p), sy(p))) {
      courseIn = true;
      break;
    }
  }
  if (!courseIn) {
    // How far away it is, so the event says by HOW MUCH and not merely that it happened.
    let best = Infinity;
    for (const p of _spine) {
      const X = sx(p);
      const Y = sy(p);
      const dx = X < 0 ? -X : X > CW ? X - CW : 0;
      const dy = Y < 0 ? -Y : Y > CH ? Y - CH : 0;
      const d = Math.hypot(dx, dy);
      if (d < best) best = d;
    }
    add(
      '1-course',
      `no point of the course is on the canvas; nearest is ${Math.round(best)} px outside`,
      best
    );
  }

  // ── 2 — THE LEADER IS IN THE PICTURE ────────────────────────────────────────────────────────
  let lead = f.racers[0];
  for (const r of f.racers) if (r.t > lead.t) lead = r;
  const LX = sx(lead);
  const LY = sy(lead);
  if (!onCanvas(LX, LY)) {
    const dx = LX < 0 ? -LX : LX > CW ? LX - CW : 0;
    const dy = LY < 0 ? -LY : LY > CH ? LY - CH : 0;
    const d = Math.hypot(dx, dy);
    add(
      '2-leader',
      `the leader is ${Math.round(d)} px outside the canvas at (${Math.round(LX)}, ${Math.round(LY)})`,
      d
    );
  }

  // ── 3 — WHERE THE FINISH LINE IS, IS FINDABLE ───────────────────────────────────────────────
  const prog = _progressOf(f);
  if (f.finishT > 0 && (f.finishedCount ?? 0) === 0 && prog >= f.endgameFrom) {
    const HX = (CW * COMPANY_FRAME_PCT) / 2;
    const HY = (CH * COMPANY_FRAME_PCT) / 2;
    const tAt = f.shape.isOpen ? Math.min(1, f.finishT) : ((f.finishT % 1) + 1) % 1;
    let band = -Infinity;
    for (let k = 0; k <= 40; k++) {
      const w = f.shape.getPosition(tAt, (k / 40 - 0.5) * f.trackWidthPx);
      if (!w) continue;
      const m = Math.min(HX - Math.abs(sx(w) - CW / 2), HY - Math.abs(sy(w) - CH / 2));
      if (m > band) band = m;
    }
    if (band < 0)
      add(
        '3-line',
        `no part of the finish band is inside the frame region; nearest is ${Math.round(-band)} px outside`,
        -band
      );
  }

  // ── 4 — NO FRAME CHANGES THE PICTURE BEYOND THE STATED BOUND ────────────────────────────────
  if (_prev) {
    const dLn = Math.abs(Math.log(width / _prev.width));
    if (dLn > STEP_LN_MAX)
      add(
        '4-widthstep',
        `the picture changed width by a factor of ${Math.exp(dLn).toFixed(2)} in one frame (${dLn.toFixed(3)} ln)`,
        dLn
      );
    const dPan = Math.hypot(f.offsetX - _prev.offsetX, f.offsetY - _prev.offsetY);
    if (dPan >= CW)
      add(
        '4-panstep',
        `the picture moved ${Math.round(dPan)} px sideways in one frame — ${(dPan / CW).toFixed(2)} canvas widths`,
        dPan
      );
  }

  // ── 5 — THE WIDTH STAYS BETWEEN A STATED MINIMUM AND MAXIMUM ────────────────────────────────
  if (f.tightestNamed > 0 && width < f.tightestNamed - 1e-6)
    add(
      '5-tootight',
      `the picture is ${(width / f.trackWidthPx).toFixed(2)} corridors, tighter than the tightest named shot (${(f.tightestNamed / f.trackWidthPx).toFixed(2)})`,
      f.tightestNamed - width
    );
  if (f.worldWidth > 0 && width > f.worldWidth + 1e-6)
    add(
      '5-toowide',
      `the picture is ${Math.round(width)} world px wide, wider than the world itself (${Math.round(f.worldWidth)})`,
      width - f.worldWidth
    );

  if (_dump)
    _dump.push({
      i,
      ms: Math.round(f.ts),
      p: prog,
      w: +(width / f.trackWidthPx).toFixed(3),
      ox: Math.round(f.offsetX),
      oy: Math.round(f.offsetY),
      ez: +f.effZoomX.toFixed(5),
      lx: Math.round(LX),
      ly: Math.round(LY),
      st: f.state,
      b: f.binding,
      courseIn,
    });
  _prev = { width, offsetX: f.offsetX, offsetY: f.offsetY };
}

function _progressOf(f) {
  if (!(f.finishT > 0)) return 0;
  let maxT = 0;
  for (const r of f.racers) if (r.t > maxT) maxT = r.t;
  return +(maxT / f.finishT).toFixed(5);
}

/** The verdict: every violation as an event, plus context that is never the verdict. */
export function readViewerProbe() {
  const byInvariant = {};
  for (const e of _events) byInvariant[e.invariant] = (byInvariant[e.invariant] ?? 0) + 1;
  return {
    active: _active,
    run: _run,
    frames: _frames,
    // The driver stops here: after the first crossing the finish ceremony runs, and these five
    // sentences do not govern it — invariant 3's own window closes at the crossing by definition.
    crossed: _crossed,
    dump: _dump,
    events: _events,
    byInvariant,
    widestCorridors: _run?.trackWidthPx > 0 ? +(_widest / _run.trackWidthPx).toFixed(3) : null,
    tightestCorridors:
      _run?.trackWidthPx > 0 && Number.isFinite(_tightest)
        ? +(_tightest / _run.trackWidthPx).toFixed(3)
        : null,
  };
}

if (typeof window !== 'undefined') window.__viewerProbe = readViewerProbe;
