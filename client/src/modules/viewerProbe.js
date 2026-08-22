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
// WINNER-CROSSING-1. The moment the race is about to be decided, and the frames either side of it.
// Everything else in this file grades the window BEFORE the crossing; nothing graded the crossing
// itself, which is how "arrival: 0% error on every track" stayed green while the winner sat in a
// corner. That figure grades the ZOOM FACTOR and says nothing about what is in the picture.
let _crossing = null;
let _crossRing = [];
let _windowStates = {};
let _contention = null;
// ── ENDGAME-COMPLETE-1: THE ACCEPTANCE SHEET, ACCUMULATED IN ONE PASS ─────────────────────────
//
// Every block in this thread graded the symptom it was repairing and nothing else, so each fix
// broke or exposed something the previous one had established. This accumulates what ALL TWELVE of
// his requirements need, on every race, so a change can never again be judged on the item it was
// aimed at alone.
//
// It grades THE PICTURE. Where an item cannot be graded from the picture the field says so rather
// than carrying an easier number in its place — three figures in this thread were green while his
// eye disagreed, and each of them was a proxy.
let _sheet = null;
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
  _crossing = null;
  _crossRing = [];
  _windowStates = {};
  _contention = { released: [], checks: 0, on: false };
  _sheet = {
    win: [], // one row per in-window frame — everything items 1,3,4,5,6,7,8,10,11 are taken from
    pre: 0, // frames BEFORE the window, for item 12
    preEvents: 0,
    deadline: null, // item 1: the first frame at or past the threshold
    // item 2 is graded from the crossing record, which carries the delivered zoom and the two
  };
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

  // ── THE WINDOW HIS RULE APPLIES TO (VIEWER-INVARIANTS-2) ────────────────────────────────────
  //
  // HIS CLARIFICATION, 2026-08-24: "the leader and the finish line are always visible" applies FROM
  // 95% OF THE RACE ONWARDS ONLY. Everything before that stays as it is — the group-framing states
  // frame a group on purpose and are not part of this subject at all.
  //
  // So invariants 2 and 3 are SCOPED and invariants 1, 4 and 5 are not: a camera off the course, or
  // a frame that jumps, is wrong everywhere in the race. That split is his sentence, not a
  // convenience — VIEWER-INVARIANTS-1 reported 10809 leader-off frames of which 10617 were
  // COMEBACK_ZOOM and BATTLE_ZOOM doing exactly what they are for, and scoping is what that
  // measurement was missing rather than a duration rule, which he ruled out.
  //
  // THE WINDOW IS THE RACE'S, NOT THE DIRECTOR'S. `endgameFrom` is `endgameThreshold` and the
  // progress is the leader's own; scoping to `_runInComposingNow` instead would let a candidate
  // that engages late score better by measuring fewer of its own frames, which is the trap
  // `endgame-spec.mjs` records in its own header.
  const prog = _progressOf(f);
  const inWindow = f.finishT > 0 && (f.finishedCount ?? 0) === 0 && prog >= f.endgameFrom;
  // WHICH SHOTS RUN INSIDE THE WINDOW, counted whether or not anything is wrong on the frame. The
  // brief asks a question no violation list can answer: if a group shot runs after 95%, his rule
  // still applies there, because the exemption is about the earlier race and not about those states
  // as such. This is the census that answers it.
  if (inWindow) _windowStates[f.state] = (_windowStates[f.state] ?? 0) + 1;
  if (_contention && f.contentionOut) {
    _contention.on = !!f.contentionOn;
    _contention.checks = f.contentionChecks ?? 0;
    for (const idx of f.contentionOut)
      if (!_contention.released.some((r) => r.idx === idx))
        _contention.released.push({ idx, frame: i, p: prog, ms: Math.round(f.ts) });
  }

  // ── 2 — THE LEADER IS IN THE PICTURE (in the window) ────────────────────────────────────────
  let lead = f.racers[0];
  for (const r of f.racers) if (r.t > lead.t) lead = r;
  const LX = sx(lead);
  const LY = sy(lead);
  if (inWindow && !onCanvas(LX, LY)) {
    const dx = LX < 0 ? -LX : LX > CW ? LX - CW : 0;
    const dy = LY < 0 ? -LY : LY > CH ? LY - CH : 0;
    const d = Math.hypot(dx, dy);
    add(
      '2-leader',
      `the leader is ${Math.round(d)} px outside the canvas at (${Math.round(LX)}, ${Math.round(LY)})`,
      d
    );
  }

  // ── 3 — WHERE THE FINISH LINE IS, IS FINDABLE (in the window) ───────────────────────────────
  if (inWindow) {
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

  // ── THE SHEET'S ROW FOR THIS FRAME ─────────────────────────────────────────────────────────
  if (_sheet) {
    if (!inWindow && !_crossed) _sheet.pre++;
    if (inWindow) {
      const band = _bandPct(f, sx, sy, CW, CH);
      // WHERE THE LEADER SITS ALONG THE DIRECTION OF TRAVEL, as a fraction of the frame's chord in
      // that direction. This is the quantity items 9 and 10 are both about — his "about 60% of the
      // frame" and the run-in's deliberate walk from behind centre — and it is the same expression
      // endgame-spec.mjs already uses, so a row here can be laid beside a row there.
      const h = f.heading;
      const hl = h ? Math.hypot(h.x, h.y) : 0;
      let leadFrac = null;
      if (hl > 0) {
        const ux = h.x / hl;
        const uy = h.y / hl;
        const LX2 = sx(lead);
        const LY2 = sy(lead);
        const chord = Math.abs(ux) * CW + Math.abs(uy) * CH;
        leadFrac = 0.5 + ((LX2 - CW / 2) * ux + (LY2 - CH / 2) * uy) / chord;
      }
      // ITEM 7: the racers still in with a chance, by the director's OWN definition, and whether
      // each is on the canvas. No rank cut and no threshold is added here.
      let contOff = 0;
      if (f.contenderIdx) {
        for (const idx of f.contenderIdx) {
          const r = f.racers.find((q) => q.index === idx);
          if (!r) continue;
          const X = sx(r);
          const Y = sy(r);
          if (!(X >= 0 && X <= CW && Y >= 0 && Y <= CH)) contOff++;
        }
      }
      _sheet.win.push({
        i,
        ms: Math.round(f.ts),
        p: prog,
        corr: +(width / f.trackWidthPx).toFixed(4),
        lnW: Math.log(width),
        band,
        leaderOn: onCanvas(LX, LY),
        courseIn,
        leadFrac: leadFrac === null ? null : +leadFrac.toFixed(4),
        contOff,
        contN: f.contenderIdx?.length ?? 0,
        state: f.state,
      });
      if (_sheet.deadline === null)
        _sheet.deadline = {
          p: prog,
          leaderOn: onCanvas(LX, LY),
          band,
          corr: +(width / f.trackWidthPx).toFixed(4),
        };
    }
  }
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
      lerp: f.lerpPhase,
      // WHO THE FRAMING IS BUILT ON THIS FRAME, and whether the leader is one of them. A guarantee
      // that is binding while the leader is off screen is a guarantee whose subject set does not
      // contain him, and that is a different defect from a pan that is merely late.
      anchorSX: f.anchorPoint ? Math.round(sx(f.anchorPoint)) : null,
      anchorSY: f.anchorPoint ? Math.round(sy(f.anchorPoint)) : null,
      leaderIdx: lead.index ?? null,
      leaderIsSubject: f.subjectIndices ? f.subjectIndices.includes(lead.index) : null,
      // The pan's residual in screen px, and where the anchor would sit if the pan had arrived.
      lagX: Number.isFinite(f.targetOffsetX) ? Math.round(f.targetOffsetX - f.offsetX) : null,
      lagY: Number.isFinite(f.targetOffsetY) ? Math.round(f.targetOffsetY - f.offsetY) : null,
      // THE TARGET'S OFFSETS BELONG TO THE TARGET'S ZOOM, not to the delivered one. Mixing them
      // reads a fast-moving zoom as a pan error, which is exactly the wrong diagnosis to reach here.
      anchorAtTargetX:
        f.anchorPoint && Number.isFinite(f.targetOffsetX) && f.camZoom > 0
          ? Math.round(f.targetOffsetX + f.anchorPoint.x * f.effZoomX * (f.targetZoom / f.camZoom))
          : null,
      anchorAtTargetY:
        f.anchorPoint && Number.isFinite(f.targetOffsetY) && f.camZoom > 0
          ? Math.round(f.targetOffsetY + f.anchorPoint.y * f.effZoomY * (f.targetZoom / f.camZoom))
          : null,
      zoomRatio: f.camZoom > 0 ? +(f.targetZoom / f.camZoom).toFixed(4) : null,
      ff: Number.isFinite(f.forwardFrac) ? +f.forwardFrac.toFixed(3) : null,
      u: Number.isFinite(f.runInU) ? +f.runInU.toFixed(3) : null,
      rp: Number.isFinite(f.runInProgress) ? +f.runInProgress.toFixed(3) : null,
      comp: !!f.composing,
      // Where the pan is aimed, and the two things it might be aimed at, all in SCREEN px under the
      // camera actually drawn — so they can be read against each other directly.
      ptSX: f.panTargetX != null ? Math.round(sx({ x: f.panTargetX, y: f.panTargetY })) : null,
      ptSY: f.panTargetX != null ? Math.round(sy({ x: f.panTargetX, y: f.panTargetY })) : null,
      lineSX: f.lineWorld ? Math.round(sx(f.lineWorld)) : null,
      lineSY: f.lineWorld ? Math.round(sy(f.lineWorld)) : null,
      lat: Number.isFinite(f.lateralShift) ? Math.round(f.lateralShift) : null,
      clamped: f.panClamped ?? null,
      camX: Number.isFinite(f.panCamX) ? Math.round(f.panCamX) : null,
      wMaxX: Number.isFinite(f.worldMaxX) ? Math.round(f.worldMaxX) : null,
      wMaxY: Number.isFinite(f.worldMaxY) ? Math.round(f.worldMaxY) : null,
      // THE FRAMING ERROR, DECOMPOSED AT ONE ZOOM. Everything here uses the zoom the frame was
      // DRAWN with, so nothing is mixed: `want` is the offset that would put the anchor at the
      // centre of the canvas, `errTarget` is how far the TARGET offset is from that, and `errPan`
      // is how far the DELIVERED offset is from the target. Their sum is the whole error, and which
      // of the two carries it says whether the shot is badly aimed or badly delivered.
      errTargetX: f.anchorPoint
        ? Math.round(f.targetOffsetX - (CW / 2 - f.anchorPoint.x * f.effZoomX))
        : null,
      errTargetY: f.anchorPoint
        ? Math.round(f.targetOffsetY - (CH / 2 - f.anchorPoint.y * f.effZoomY))
        : null,
      errPanX: Math.round(f.offsetX - f.targetOffsetX),
      errPanY: Math.round(f.offsetY - f.targetOffsetY),
      // ── ENDGAME-WHO-AND-HOWMUCH, question 1 ────────────────────────────────────────────────
      //
      // HOW MUCH OF THE BAND THE VIEWER CAN SEE, which is what his requirement is about. The
      // margin `check-runin-frame` grades is the distance of the band's nearest point from the
      // region's edge; it says nothing about how much of the band is on screen. The band is a
      // straight segment across the corridor, so its visible share is the share of a dense uniform
      // sample that projects inside the canvas — no clipping arithmetic of its own to be wrong.
      // THE SECOND ARGUMENT OF `getPosition` IS NORMALISED, NOT WORLD PX. raceCore calls it as
      // `getPosition(t, r.physicalY / 2)` with `physicalY` in [-1, +1], so the corridor edges are
      // -0.5 and +0.5. Sampling `(k/200 - 0.5) * trackWidthPx` walks a segment 300x too long, and
      // every sample but a handful lands outside the world — which reads as "1.49% of the band is
      // visible" on frames where the whole band is in shot. Found by the sanity check: the figure
      // was IDENTICAL on frames the guard passes and frames it fails, and 1.49% is exactly 3/201.
      bandPct: (() => {
        if (!inWindow || !f.shape || !(f.trackWidthPx > 0)) return null;
        const tAt = f.shape.isOpen ? Math.min(1, f.finishT) : ((f.finishT % 1) + 1) % 1;
        let on = 0;
        let n = 0;
        for (let k = 0; k <= 200; k++) {
          const w = f.shape.getPosition(tAt, k / 200 - 0.5);
          if (!w) continue;
          n++;
          const X = sx(w);
          const Y = sy(w);
          if (X >= 0 && X <= CW && Y >= 0 && Y <= CH) on++;
        }
        return n ? +((100 * on) / n).toFixed(2) : null;
      })(),
      // ── question 2: IS THE LINE OUT BECAUSE THE SHOT IS TOO TIGHT, OR BECAUSE THE FRAME MOVED?
      //
      // Both fit what has been measured so far and nobody has established which. The test is
      // decisive and needs no threshold: `need` is the screen distance from the ANCHOR to the
      // nearest point of the band; `room` is the distance from the frame's CENTRE to the canvas
      // edge along that same direction. If need > room, no placement centred on the anchor could
      // hold both — the shot is TOO TIGHT. If need <= room, a correctly placed frame would hold
      // it and the frame has MOVED.
      tightOrMoved: (() => {
        if (!inWindow || !f.anchorPoint || !f.shape) return null;
        const aX = sx(f.anchorPoint);
        const aY = sy(f.anchorPoint);
        const tAt = f.shape.isOpen ? Math.min(1, f.finishT) : ((f.finishT % 1) + 1) % 1;
        let best = Infinity;
        let bx = 0;
        let by = 0;
        for (let k = 0; k <= 200; k++) {
          const w = f.shape.getPosition(tAt, k / 200 - 0.5);
          if (!w) continue;
          const X = sx(w);
          const Y = sy(w);
          const d = Math.hypot(X - aX, Y - aY);
          if (d < best) {
            best = d;
            bx = X;
            by = Y;
          }
        }
        if (!Number.isFinite(best) || best === 0) return null;
        const ux = (bx - aX) / best;
        const uy = (by - aY) / best;
        // Distance from the canvas centre to its edge along that direction.
        const room = Math.min(
          ux > 0 ? CW / 2 / ux : ux < 0 ? -(CW / 2) / ux : Infinity,
          uy > 0 ? CH / 2 / uy : uy < 0 ? -(CH / 2) / uy : Infinity
        );
        return { need: Math.round(best), room: Math.round(room), tooTight: best > room };
      })(),
      // ── question 2: WHOM the binding rule selects, and the race's own numbers about them ─────
      //
      // `f.subjectIndices` is the framing pair the director pinned. For each member: the along-track
      // gap to the leader in the race's own T units and in world px, and the rank. Whether any of
      // them can still win is decided OFFLINE from these, against the speeds the race is running.
      pair: (() => {
        if (!f.subjectIndices?.length) return null;
        const ordered = [...f.racers].sort((a, b) => b.t - a.t);
        const ld = ordered[0];
        return f.subjectIndices.map((idx) => {
          const r = f.racers.find((q) => q.index === idx) ?? null;
          if (!r) return { idx, missing: true };
          return {
            idx,
            t: +r.t.toFixed(6),
            dT: +(ld.t - r.t).toFixed(6),
            dWorldPx: Math.round(Math.hypot(ld.x - r.x, ld.y - r.y)),
            rank: ordered.findIndex((q) => q.index === idx) + 1,
          };
        });
      })(),
      leaderT: (() => {
        let m = -Infinity;
        for (const r of f.racers) if (r.t > m) m = r.t;
        return +m.toFixed(6);
      })(),
      finishT: f.finishT,
      subjects: f.subjectIndices ? f.subjectIndices.join('/') : null,
      courseIn,
    });
  // ── THE CROSSING, AND THE FRAMES EITHER SIDE OF IT (WINNER-CROSSING-1) ──────────────────────
  //
  // WHO THE WINNER IS: the racer with the greatest `t` on the frame the count first goes above
  // zero, held by index afterwards so the record follows HIM and not whoever is leading later. A
  // finished racer coasts on a run-out decay rather than freezing, so "the leader" walks backwards
  // through the finishing order after the line — FINISH-PAIR-1 records that, and reading the live
  // leader here would grade the wrong racer within a few frames.
  const _shotOf = (r) => {
    const X = sx(r);
    const Y = sy(r);
    return {
      fx: +(X / CW).toFixed(4), // where he sits ACROSS the frame, 0 = left edge, 1 = right
      fy: +(Y / CH).toFixed(4), // and DOWN it
      onCanvas: X >= 0 && X <= CW && Y >= 0 && Y <= CH,
      state: f.state,
      binding: f.binding,
      corr: +(width / f.trackWidthPx).toFixed(3),
      // ITEM 2 names two factors and no third. These are the director's own values for them, beside
      // the zoom the frame was drawn with, so the item is graded against exactly what it names.
      camZoom: f.camZoom,
      leaderZoom: f.leaderZoom,
      photoFinishZoom: f.photoFinishZoom,
      frame: i,
      ms: Math.round(f.ts),
      p: prog,
    };
  };
  if (!_crossed) {
    let ld = f.racers[0];
    for (const r of f.racers) if (r.t > ld.t) ld = r;
    _crossRing.push({ idx: ld.index, shot: _shotOf(ld) });
    if (_crossRing.length > 30) _crossRing.shift();
  }
  if ((f.finishedCount ?? 0) > 0 && !_crossed) {
    let w = f.racers[0];
    for (const r of f.racers) if (r.t > w.t) w = r;
    _crossing = {
      winnerIdx: w.index,
      at: _shotOf(w),
      // The band at the crossing, measured the same way as everywhere else in this file.
      bandPct: _bandPct(f, sx, sy, CW, CH),
      before: _crossRing.map((q) => q.shot),
      after: [],
    };
  }
  if (_crossing && (f.finishedCount ?? 0) > 0 && _crossing.after.length < 260) {
    const w = f.racers.find((r) => r.index === _crossing.winnerIdx);
    if (w) _crossing.after.push({ ..._shotOf(w), bandPct: _bandPct(f, sx, sy, CW, CH) });
  }
  if ((f.finishedCount ?? 0) > 0) _crossed = true;
  _prev = { width, offsetX: f.offsetX, offsetY: f.offsetY };
}

/** Share of the finish band on the canvas. One definition, used by the window and the crossing. */
function _bandPct(f, sx, sy, CW, CH) {
  if (!f.shape || !(f.finishT > 0)) return null;
  const tAt = f.shape.isOpen ? Math.min(1, f.finishT) : ((f.finishT % 1) + 1) % 1;
  let on = 0;
  let n = 0;
  for (let k = 0; k <= 200; k++) {
    const w = f.shape.getPosition(tAt, k / 200 - 0.5);
    if (!w) continue;
    n++;
    const X = sx(w);
    const Y = sy(w);
    if (X >= 0 && X <= CW && Y >= 0 && Y <= CH) on++;
  }
  return n ? +((100 * on) / n).toFixed(2) : null;
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
    crossing: _crossing,
    // Frames per camera state INSIDE the window, so "does a group shot ever run after 95%" is
    // answered by a count rather than by an argument from the code.
    windowStates: _windowStates,
    // CONTENTION-WATCH-1: who the watch released and when, so "how often does a racer drop out"
    // is a count from the run rather than an estimate.
    contention: _contention,
    dump: _dump,
    sheet: _sheet,
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
