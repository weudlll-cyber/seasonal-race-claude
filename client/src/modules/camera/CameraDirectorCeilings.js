// ============================================================
// File:        CameraDirectorCeilings.js
// Path:        client/src/modules/camera/CameraDirectorCeilings.js
// Project:     RaceArena — P1-CAMERADIRECTOR-SPLIT-1
//
// WHAT THIS IS FOR: the GUARANTEE CEILINGS — how WIDE the shot must be so that whoever matters
// stays in frame. Each method answers one guarantee as a cam.zoom bound and nothing else:
//   · `_guaranteeCeiling` — the state's own guarantee (the pair, or the corridor fallback);
//   · `_corridorCapWeight` / `_corridorWidthCap` — the road as a MAXIMUM width (a floor on zoom);
//   · `_lineCeiling` — the finish line as a guaranteed subject of the endgame;
//   · `_companyCeiling` — "do not show emptiness", the headcount around a single anchor;
//   · `_fieldCeiling` — every racer, held from the ceremony until the guarantee retires;
// and the three small readings they share: where the finish line is in the world
// (`_finishLineWorldPoint`), where the anchor will sit on screen (`_anchorScreen`), and the
// forward fraction that placement uses this frame (`_forwardFracNow`).
//
// WHY IT IS ITS OWN MODULE: framingRule.js's rule is that guarantees WIDEN and never steer, and
// these methods are where the director applies it — they read the director's state and return a
// bound; none of them writes the camera's position. `_setTargets` composes them, and the ORDER in
// which it asks and combines them is load-bearing (docs/CAMERA_DIRECTOR.md), which is why the
// composition stays in CameraDirector.js and only the bounds moved.
//
// WHAT IT IS NOT FOR: the level set (CameraDirectorLevelSet.js) and the run-in schedule
// (CameraDirectorRunIn.js), which are ceilings too but each carries its own membership or clock;
// and the guarantee arithmetic itself, which is framingRule.js and is only called from here.
//
// HOW IT IS INSTALLED: exactly like CameraDirectorDiag.js — `Object.defineProperties` onto
// CameraDirector.prototype at the bottom of CameraDirector.js. The methods were moved VERBATIM,
// bodies and comments, from three places in the class (two orphaned doc blocks travelled with the
// methods they stood beside). It does not import from CameraDirector.js; the state names come from
// camState.js.
// ============================================================

import { CAM_STATE } from './camState.js';
import { DEFAULT_INNER_FRAME_PCT } from './framingConfig.js';
import {
  framingFor,
  GUARANTEE,
  POSITION,
  corridorGuarantee,
  contenderGuarantee,
  companyGuarantee,
  COMPANY_FRAME_PCT,
  // AIM-ROOM-REPAIR-1: imported UNDER AN ALIAS and used by exactly one method,
  // `_anchorScreen`. The bare name `anchorScreenPoint` does not exist in this file, so a
  // four-argument call that silently drops the room floor cannot be written by accident.
  anchorScreenPoint as anchorScreenPointRaw,
  pointGuarantee,
} from './framingRule.js';

export const ceilingsMixin = {
  /**
   * CAMERA-FRAMING-1: the GUARANTEE, as a cam.zoom CEILING. "Everyone who matters right now stays in
   * frame." It WIDENS the shot when the state setting would crop the guaranteed subjects, and does
   * nothing otherwise — it never moves a centre and never picks a subject (Lesson 192).
   *
   * Orientation-aware: the corridor is measured perpendicular to the heading and the pair along the
   * line between them, so the bound binds exactly when it must instead of assuming the worst
   * orientation for the whole lap.
   *
   * @returns {number} cam.zoom ceiling, Infinity when nothing constrains
   */
  _guaranteeCeiling(subjects, frameSize) {
    const kind = framingFor(this.state).guarantee;
    const { axisX, axisY } = this._proj;
    const inner = this._innerFramePct ?? DEFAULT_INNER_FRAME_PCT;
    if (kind === GUARANTEE.PAIR) {
      // CONTENDER-ZOOM-1: THE CONTENDERS ARE THE BINDING REQUIREMENT, however many there are.
      //
      // `subjects.pair` is the pinned set. `contenderGuarantee` is `pairGuarantee` over every pair in
      // it and reduces to exactly `pairGuarantee` at two — which is what the set holds today, so this
      // line changes no picture until the capture widens. It is here rather than waiting for that
      // widening because the guarantee is the half that can be built without a membership rule; the
      // membership rule is the half that cannot. See the block above `_photoFinishContenders`.
      //
      // THE PADDING IS THE NARROW BODY REFERENCE, and that is stated rather than assumed adequate:
      // `_drawnBodyWidthRefPx` covers a MEDIAN 44.6% of the drawn sprite (measured across ten tracks,
      // FRONT-GROUP-7 §1), so a contender at the very edge of the shot can still be clipped by the
      // remainder. What it cannot be is half out of frame. Closing that needs the DRAWN size, which
      // depends on the zoom being solved for, and the sprite sits at its screen cap on only 23.4% of
      // endgame frames — so there is no closed form for the other 77%.
      const ceiling = contenderGuarantee(
        subjects.pair,
        axisX,
        axisY,
        frameSize.width,
        frameSize.height,
        inner,
        this._drawnBodyWidthRefPx
      );
      // A pair state with only one contender present has no pair to keep together; fall back to the
      // corridor so the shot is still bounded by something real.
      if (Number.isFinite(ceiling)) return ceiling;
    }
    // CAMERA-COMPANY-ONLY-3: THE SINGLE-ANCHOR STATES ARE NOT BOUNDED BY THE ROAD.
    //
    // LEADER, OVERVIEW and COMEBACK are limited by the owner's own setting and by the COMPANY
    // guarantee, and by nothing else. The corridor used to be their ceiling and it silently overruled
    // his number on six of ten tracks — on Mountainstreet his 1.0 became anything from 300 to 688
    // world px as the road turned, which is the "restless" picture he complained about. His words for
    // why the road lost: THE ROAD IS NOT WHO MATTERS, THE RACERS ARE.
    //
    // Owner-approved 2026-08-05 on `exp/company-only` @ d2ecc27c, mountainstreet seed 5601, having
    // seen BOTH regimes — a torn-apart field where the company guarantee opens the shot wide, and a
    // tight pack where the camera stays at his 1.0.
    //
    // The corridor is still reached from the PAIR branch above when a pair state has fewer than two
    // contenders. Measured: that fallback fired on 0 of 11,813 pair frames across ten tracks, so it
    // is DEFENSIVE, not load-bearing — kept deliberately, and said out loud rather than assumed.
    if (kind !== GUARANTEE.PAIR) return Infinity;

    // WHERE THE ANCHOR WILL SIT, from the framing rule — the same zoom-independent position the
    // company guarantee uses, for the same reason: the corridor runs half a track width to each
    // side of the anchor, so the room that matters is the room from THERE, not the chord through
    // the frame's centre. Reusing `anchorScreenPoint` keeps the two guarantees from disagreeing
    // about where the subject is about to be.
    const at = this._anchorScreen(frameSize.width, frameSize.height, subjects.t);
    return corridorGuarantee(
      this._headingAt(subjects.t),
      this._trackWidthPx,
      axisX,
      axisY,
      frameSize.width,
      frameSize.height,
      inner,
      at
    );
  },

  /**
   * THE CORRIDOR AS A MAXIMUM WIDTH — the zoom BELOW which the shot would be wider than the road.
   *
   * Returns a LOWER bound on `cam.zoom`, which is the opposite direction from every ceiling in this
   * file; the composition site says why that cannot be one more `_ceilings` entry. It reuses
   * `corridorGuarantee` unchanged, so the three things that were right about it survive intact and
   * are not restated here: the SCREEN-relative anchor point, the per-axis projection of the
   * perpendicular that makes an angled corridor ask for more than a flat one, and the body padding.
   *
   * `innerFramePct` is 1 deliberately — the promise is "the road's width fits", and the safe-region
   * inset belongs to the subject rather than to the road.
   *
   * @returns {number|null} a cam.zoom FLOOR, or null when nothing should be capped
   */
  /**
   * HOW MUCH OF THE CAP APPLIES THIS FRAME — a continuous weight, not a switch (ZOOM-PACE-5).
   *
   * THE CAP USED TO APPEAR IN ONE FRAME. Its scope was `state === PHOTO_FINISH`, which is a CUT by
   * construction: on the frame the state changed it went from absent to fully applied and took the
   * target from 2.47 to 10.02 — measured, the whole of the "leap" the owner objects to.
   *
   * SO IT HANGS ON A CONTINUOUS QUANTITY INSTEAD, and the run-in already owns exactly one:
   * `_runInProgress`, 0 where the endgame window opens and 1 at the line, clamped monotone. **No
   * duration, no easing and no new number** — the cap's demand simply grows with the leader's own
   * approach, which is the quantity the whole endgame is already written in.
   *
   * PAST THE RUN-IN it is 1. The run-in releases at the crossing, by which point progress has
   * already reached 1, so the hand-over is continuous rather than another step.
   */
  _corridorCapWeight() {
    // ── (b) WAS TRIED FIRST AND IT FAILED — recorded so it is not tried again ──────────────────
    //
    // The honest shape is to hang the cap on a continuous quantity instead of a state predicate,
    // and the run-in already owns one: `_runInProgress`. Built that way, the leap did flatten — and
    // the cap ESCAPED THE FINISH SHOT. The run-in composes during OVERVIEW and LEADER_ZOOM too, so
    // the cap began tightening mid-race states in the endgame: `visibleCorridors` in OVERVIEW went
    // from its 1.5 setting to 0.469, caught by four convergence tests. The run-in's progress is
    // continuous but it is not CONFINED to the shot the owner's rule is about, and confining it
    // again would reintroduce the same cut.
    //
    // SO THE SCOPE STAYS `PHOTO_FINISH` AND THE ONSET GETS A DURATION.
    if (this.state !== CAM_STATE.PHOTO_FINISH) return 0;
    if (this._photoFinishEnteredTs === null || !(this._corridorCapArriveMs > 0)) return 1;
    const k = ((this._frameTs ?? 0) - this._photoFinishEnteredTs) / this._corridorCapArriveMs;
    if (!(k > 0)) return 0;
    if (k >= 1) return 1;
    // The SAME smoothstep the glide uses, so the two cannot disagree about the shape of a move.
    return k * k * (3 - 2 * k);
  },

  _corridorWidthCap(subjects, frameSize) {
    // THE ENDGAME, not one state. An earlier draft scoped this by `GUARANTEE.PAIR`, which looks
    // equivalent and is not: BATTLE_ZOOM and LEAD_CHANGE are pair states too, and with the cap
    // reaching them `check-runin-frame` went red — 14 frames with NO racer on screen at all on
    // searound. Scoping it to PHOTO_FINISH fixed that and introduced the step. The weight above is
    // what keeps it off the mid-race shots now: outside the run-in and outside the photo finish it
    // is 0, so this value is computed and then applied not at all.
    if (this._corridorCapWeight() <= 0) return null;
    if (!subjects?.point || !(this._trackWidthPx > 0)) return null;
    const at = this._anchorScreen(frameSize.width, frameSize.height, subjects.t);
    const cap = corridorGuarantee(
      this._headingAt(subjects.t),
      this._trackWidthPx + this._drawnBodyWidthRefPx,
      this._proj.axisX,
      this._proj.axisY,
      frameSize.width,
      frameSize.height,
      1,
      at
    );
    return Number.isFinite(cap) ? cap : null;
  },

  /**
   * THE WORLD POINT WHERE THE RACE ENDS.
   *
   * Same open/closed topology question `_finishLookbackT` answers, and answered the same way: a lap
   * count wraps on a loop and clamps on a line. Two laps on a closed track finish where one lap
   * started, so `finishT = 2` is the point at `t = 0`. (Taken from `feat/finish-framed`.)
   *
   * @param {number} finishT
   * @returns {{x:number,y:number}|null}
   */
  _finishLineWorldPoint(finishT) {
    if (!this._shape || !(finishT > 0)) return null;
    const t = this._isOpenTrack ? Math.min(1, finishT) : ((finishT % 1) + 1) % 1;
    return this._shape.getPosition(t, 0);
  },

  /**
   * WHERE THE SUBJECT SITS ALONG THE FRAME THIS FRAME — the framing rule's POSITION column, with the
   * run-in's TRAVEL folded in. Six call sites read this; they used to read the table directly, and
   * six copies of one question is how the run-in's answer reached five of them and not the sixth.
   *
   * ── THE RUN-IN GLIDES FROM WIDE-AND-BACK TO THE ORDINARY SHOT (RUNIN-GLIDE-1) ──────────────────
   *
   * The owner's design, and both halves happen at once: the leader starts BEHIND the frame centre,
   * so most of the frame lies toward the finish and the line fits at a modest zoom; then, as he
   * closes, he travels back to his ordinary position while the shot tightens; and at the crossing
   * he is at `leaderForwardFrac` under the state's own zoom — the ordinary shot exactly, so there is
   * no seam to hand over.
   *
   * IT IS ONE INTERPOLATION AND IT INVENTS NO NUMBER. The END of the travel is the state's own
   * answer from the table: `leaderForwardFrac` for a FORWARD state, dead centre for a CENTRED one.
   * The START is that answer MIRRORED about the centre — `1 - end` — which is the same displacement
   * the other way. `leaderForwardFrac` already says how far off centre a subject is placed; this
   * uses it twice and interpolates between.
   *
   * A CENTRED STATE THEREFORE DOES NOT MOVE AT ALL: mirroring 0.5 gives 0.5. That is not a special
   * case, it falls out — and it is why the photo finish keeps its own framing throughout.
   *
   * WHY THE EXCESS THIS REPLACES WAS WORTH REMOVING: measured, a FORWARD anchor left only a third of
   * the frame ahead of the leader toward the line, so the shot had to be 3.01x wider than the
   * distance demands (Searound 2.15x). Starting at the mirror turns that third into two thirds.
   *
   * @returns {number|null} the fraction along the heading, or null for dead centre
   */
  /**
   * AIM-ROOM-REPAIR-1 — **THE ONE PLACE THIS DIRECTOR OBTAINS AN AIM POINT.**
   *
   * ── WHY THIS EXISTS, AND WHY IT IS AN ACCESSOR RATHER THAN SEVEN CAREFUL CALL SITES ───────────
   *
   * `anchorScreenPoint` takes the room floor as a FIFTH parameter with a default of 0. Seven call
   * sites in this file passed four, so every framing guarantee — company, corridor, point, pair —
   * planned its shot around an aim that `_applyLeaderForwardBias` then moved. The guarantees and
   * the aim disagreed, which is the one thing `framingRule.js`'s contract forbids, and it is the
   * same class of failure recorded at `_companyCeiling` below: *"0.66 assumed against a true 0.399
   * dead ahead, which is why it delivered one companion fewer than it promised."*
   *
   * **The defaulted parameter is what produced the defect.** Seven places each remembering to pass
   * it is seven chances to forget, and the eighth call site written next month forgets BY DEFAULT
   * and degrades silently. So the fix is not "pass it everywhere"; it is to make an aim
   * uncomputable without the floor.
   *
   * **HOW THAT IS ENFORCED, and it is the whole point:** `anchorScreenPoint` is **no longer
   * imported into this file**. There is no raw function here to call with four arguments. A future
   * call site must either use this method — which cannot omit the floor, because it does not take
   * it — or re-add the import, which is a visible, reviewable act rather than a silent omission.
   *
   * **WHAT IT COSTS.** The parameter was not made *required* in `framingRule.js`, which would have
   * been the loudest shape: `anchorScreenPoint` has around twenty callers outside this file — six
   * assertions in `framingRule.test.js`, two in `levelSet.test.js`, and a dozen harnesses that
   * reconstruct the aim for measurement — and a required parameter would break all of them at once
   * to fix a defect that lives entirely in this class. Those callers reconstruct rather than
   * decide, so an un-floored anchor there is a measurement question, not a picture. The cost of the
   * shape chosen is therefore that `anchorScreenPoint`'s default still exists for them; the benefit
   * is that the director, which is the only thing that can ship a wrong picture, cannot reach it.
   *
   * @param {number} frameW
   * @param {number} frameH
   * @param {number} t  the track position whose heading the aim is taken along
   * @returns {{x:number,y:number}} the aim point in screen coordinates
   */
  _anchorScreen(frameW, frameH, t) {
    return anchorScreenPointRaw(
      frameW,
      frameH,
      this._forwardFracNow(),
      this._headingScreen(t),
      this._leaderAimRoomFloorPx
    );
  },

  _forwardFracNow() {
    const tableFrac =
      framingFor(this.state).position === POSITION.FORWARD ? (this._leaderForwardFrac ?? 0.5) : 0.5;
    if (!this._runInComposingNow || this._runInProgress === null) {
      return framingFor(this.state).position === POSITION.FORWARD ? this._leaderForwardFrac : null;
    }
    const back = 1 - tableFrac; // the mirror: the same displacement, the other way
    // RUNIN-HOLD-1: the SWEEP, not the raw progress. The anchor's travel and the zoom's close are
    // one move — holding the shot while the leader walked back across the frame would be two moves
    // at once, which is the shape `_beginRunInGlide` records emptying the frame. `_runInSweepU` is 0
    // throughout the hold, so the leader simply stays at the mirror until the sweep begins, and it
    // is 1 at the line, so he arrives at the state's own place exactly at the crossing.
    const u = this._runInSweepU();
    // RUNIN-BACK-1: AND THAT IS THE WHOLE ANSWER AGAIN.
    //
    // RUNIN-AHEAD-1 put a bound here that held the leader FORWARD, to stop the frame reaching past
    // the finish line. It contradicted the owner's own specification — he set this travel
    // deliberately, from a little BEFORE the centre of frame to a little AFTER it, so that more of
    // the track ahead is visible — and WHY-SO-WIDE-1 measured what it cost. With only about a third
    // of the frame ahead of him, a line 874 world px away forced a frame 2668 px wide, where every
    // other term would have been satisfied with 338. The extra width bought no racer: the whole
    // field spans 600-830 px.
    //
    // THE BOUND IS GONE AND NOTHING REPLACES IT. Placing the leader BEHIND centre is itself the
    // reason the frame does not reach past the line — most of the frame lies toward the finish, so
    // the line sits near the front edge by construction rather than by a clamp. That is what
    // RUNIN-GLIDE-1's mirror was always for, and the two lines above are the whole of it.
    return back + (tableFrac - back) * u;
  },

  /**
   * THE RUN-IN (RUNIN-OWNS-1) — the finish line stays in frame from the endgame threshold to the
   * crossing, whatever shot the director is running.
   *
   * ── IT OWNS THE FRAMING, NOT THE STATE SLOT, AND THAT DISTINCTION IS THE WHOLE DESIGN ──────────
   *
   * The run-in does not compete for the state. It READS whichever state is active and bounds that
   * state's zoom. Two consequences follow, and both are requirements rather than side effects:
   *
   *   THE FINAL PICTURE IS THE STATE'S PICTURE, EXACTLY. Anchor, guarantee, position, slow motion,
   *   `hudState` — none of them are touched. As the leader closes, `room / distance` rises past the
   *   state's own setting, this term stops being the smallest in `_setTargets`'s `Math.min`, and
   *   what is left is the shot that was always there, bit for bit. There is nothing to hand over
   *   and nothing to switch off.
   *
   *   THE PHOTO FINISH IS STILL THE PHOTO FINISH. RaceScreen starts the slow motion on
   *   `hudState === 'PHOTO_FINISH'`. The previous shape of this repair made RUN_IN a camera STATE
   *   that took the endgame slot — which would have suppressed the slow motion outright, and owned
   *   only 14.9%/18.5% of the window in any case, because a shot entered just before the threshold
   *   holds its own gate across it. Reading the states instead of replacing them fixes both at once.
   *
   * ── THE TWO BOUNDS, AND NEITHER IS A NEW NUMBER ───────────────────────────────────────────────
   *
   *   1. THE LINE, which is this function: `pointGuarantee` from the anchor's own place in the
   *      frame to the finish. It drives the shot while the leader is far away.
   *   2. THE ACTIVE STATE'S OWN ZOOM, which is `stateZoom` — already the first term of the
   *      `Math.min` this joins, and therefore not a line of code at all. If a leader shot is
   *      running the run-in closes to the leader zoom and no further; if a photo finish is running
   *      it closes to the photo-finish zoom. That is the same sentence as "never tighter than the
   *      underlying state", said by the machinery rather than by a new rule.
   *
   * It carries no bound of its own at the wide end: `_setTrackTargets` resolves every zoom through
   * `resolveCamera` with `minEffZoom = proj.minEffX()`, the widest the world-to-canvas mapping
   * allows, and a ceiling below that is clamped there whatever this returns. Two wide-end bounds
   * were built and both removed — the field's own extent (never binds on an open track) and
   * OVERVIEW's width (bound so hard it cost the design its point). Bounding at the projection's own
   * minimum measured IDENTICAL to no bound, which is the proof the downstream clamp is the real one.
   *
   * @returns {number} cam.zoom ceiling; Infinity when the run-in is not composing this frame
   */
  _lineCeiling(subjects, frameSize, raceState, framePct = null, atOverride = null) {
    if (!subjects?.point) return Infinity;
    const line = this._finishLineWorldPoint(raceState?.finishT ?? 0);
    if (!line) return Infinity;
    // The SAME anchor placement the corridor and company guarantees use, and for the same reason:
    // where the subject sits in frame decides how much room there is toward anything else.
    // `atOverride` lets a caller measure the room from where the anchor ACTUALLY IS rather than
    // from where the framing rule intends to put him. The two differ wherever the pan is displaced
    // — the world-edge clamp above all — and ENDGAME-SCHEDULE-1's header records what that cost.
    // The region, decided once. Identical to the conditional this replaces on every branch:
    // the subject's region unless a caller names another one AND `bandFloor` is off to allow it.
    const subjectRegion = this._innerFramePct ?? DEFAULT_INNER_FRAME_PCT;
    const lineRegion =
      framePct === null || (this._bandFloor && framePct === COMPANY_FRAME_PCT)
        ? subjectRegion
        : framePct;
    const at = atOverride ?? this._anchorScreen(frameSize.width, frameSize.height, subjects.t);
    return pointGuarantee(
      subjects.point,
      line,
      this._proj.axisX,
      this._proj.axisY,
      frameSize.width,
      frameSize.height,
      // ── THE REGION THE FINISH IS GUARANTEED INSIDE ─────────────────────────────────────────
      //
      // THE SUBJECT'S OWN REGION, `innerFramePct`. framingRule.js states the rule this follows:
      // that region "exists so the SUBJECT does not cling to the edge", and the finish line is a
      // guaranteed SUBJECT of the endgame. A caller may name a different region, and one does —
      // but `bandFloor` overrides the company margin back to the subject's, so at the shipped
      // defaults this is the subject's region on every call.
      //
      // WHY IT IS NOT THE LOOSER ONE, MEASURED TWICE. At the company margin the shot is minimal to
      // 1.05x and the line therefore sits ON the frame edge, where the tracking lag alone pushes it
      // out — measured on a third of the frames, and again as the frames the owner photographed
      // with no line in them. A tighter region asks for MORE width, and width is what puts the band
      // back on screen. It is the one place this design spends requirement 4 to buy requirement 5,
      // and `bandFloor` is the switch that says so.
      //
      // The history of this argument is in reports/evolution/ENDGAME-COMPLETE-1.md: the region has
      // been the subject's, then 1.0, then the company margin, then the subject's again, and the
      // attempt that sized on the band's nearest point instead was measured BACKWARDS — less width,
      // so less band.
      lineRegion,
      at
    );
  },

  /**
   * CAMERA-COMPANY-1: the DRAMATURGICAL guarantee — "do not show emptiness".
   *
   * Deliberately NOT part of `_guaranteeCeiling`. The geometric guarantees protect named subjects;
   * this one protects the SHOT, and folding them together would hide that they answer different
   * questions. Both are applied with Math.min at the same place, before the camera moves.
   *
   * Applies to the SINGLE-ANCHOR states only. BATTLE, PHOTO_FINISH and LEAD_CHANGE already guarantee
   * a pair, which IS company — adding a headcount there would fight a guarantee that is already
   * doing the job. See the report for the measurement behind that choice.
   */
  _companyCeiling(subjects, racers, frameSize) {
    if (!(this._minRacersVisible > 1)) return Infinity;
    if (framingFor(this.state).guarantee === GUARANTEE.PAIR) return Infinity;
    // The company sits BEHIND a forward-framed subject, and forward framing gives it more room: a
    // leader at 0.66 along the frame has 0.66 of it behind him. A centred subject has half.
    // WHERE the anchor will sit, from the framing rule — so the room toward each companion is
    // measured rather than assumed. A single scalar in every direction was over-generous everywhere
    // (0.66 assumed against a true 0.399 dead ahead), which is why it delivered one companion fewer
    // than it promised. This is the INTENDED position and is deliberately zoom-INDEPENDENT: reading
    // the anchor back off the live camera instead was tried and measured worse (promise kept 82.3%
    // of frames against 97.1%), because during a widening the live zoom is tighter than the target,
    // so the read-back over-states the room the finished shot will actually have and the guarantee
    // talks itself into staying tight. See the report.
    const at = this._anchorScreen(frameSize.width, frameSize.height, subjects.t);
    // COMPANY_FRAME_PCT, not `_innerFramePct`: a guaranteed companion needs to be visible with a
    // margin, not inside the subject's safe region. See the constant for the owner's reasoning.
    return companyGuarantee(
      subjects.point,
      racers,
      this._minRacersVisible,
      this._proj.axisX,
      this._proj.axisY,
      frameSize.width,
      frameSize.height,
      COMPANY_FRAME_PCT,
      at
    );
  },

  /**
   * THE FIELD GUARANTEE, CARRIED PAST THE GUN — CEREMONY-HANDOVER-1 (b).
   *
   * THE DEFECT IT ENDS, in the owner's words: the camera "zooms out again and moves the focus so far
   * while zooming out that for a short time we can no longer see all the racers". At the gun the
   * ceremony's promise simply stopped and the COMPANY guarantee took over — five racers instead of
   * forty — so the very next move was free to drop the other thirty-five out of frame, immediately
   * after a shot that had just shown everyone.
   *
   * IT IS THE COMPANY GUARANTEE WITH THE WHOLE FIELD AS ITS COMPANY. Not a new geometry: the same
   * `companyGuarantee`, at the same anchor, through the same `roomFromPointAlong`, with `minVisible`
   * set past the end of the field so the tightest ceiling — the FARTHEST racer — is the one returned.
   * That matters for more than economy. The ceremony's own `fieldGuarantee` measures from the
   * formation's CENTRE, which is exactly right while the camera is centred on the formation and
   * exactly wrong afterwards: during the race the camera sits on the leader, forward-framed, and a
   * promise measured from the centre would under-widen by the whole of that offset and drop the back
   * of the field — the defect, rebuilt inside its own fix.
   *
   * A CEILING, SO IT WIDENS AND NEVER STEERS (Lesson 192). It joins the existing `Math.min` beside
   * the other two. It cannot move a centre, choose an anchor or read a clock.
   *
   * @returns {number} cam.zoom ceiling, or Infinity once the guarantee has retired
   */
  _fieldCeiling(subjects, racers, frameSize) {
    if (!this._fieldGuaranteeActive) return Infinity;
    if (!subjects?.point || !Array.isArray(racers) || racers.length === 0) return Infinity;
    const at = this._anchorScreen(frameSize.width, frameSize.height, subjects.t);
    // `racers.length + 1` asks for more company than exists, and `companyGuarantee` answers that by
    // taking what exists — the tightest ceiling in the list, which is every racer in frame.
    const ceiling = companyGuarantee(
      subjects.point,
      racers,
      racers.length + 1,
      this._proj.axisX,
      this._proj.axisY,
      frameSize.width,
      frameSize.height,
      COMPANY_FRAME_PCT,
      at
    );

    // ── RETIREMENT ───────────────────────────────────────────────────────────────────────────────
    // IT RETIRES WHEN IT CAN NO LONGER BE KEPT, and the measure of "kept" is the camera's own widest
    // named shot. OVERVIEW is defined in this project as the same shot at the widest setting — the
    // widest framing the design admits and the owner sets. A guarantee demanding more than that is
    // asking for a picture this camera does not have a name for; carrying on would quietly make
    // every state a de-facto OVERVIEW and replace the whole vocabulary with one shot.
    //
    // FROM GEOMETRY, NEVER FROM A CLOCK. Both sides are zooms: one falls out of where the racers
    // actually are, the other is the owner's OVERVIEW setting. No timer, no lap count, no field size
    // appears in it — a tight field keeps its guarantee for longer than a scattered one on the same
    // track, which is the behaviour asked for.
    //
    // LATCHED, one way. A field that re-converges — after a crash-back, or a lap boundary on a
    // closed track — would otherwise re-impose the wide shot mid-race and the picture would breathe
    // in and out. Retirement is a statement about the START being over, and the start does not
    // resume.
    if (!(ceiling >= this._overviewStateZoom)) {
      this._fieldGuaranteeActive = false;
      this._fieldGuaranteeRetiredAt = subjects.t ?? null;
      return Infinity;
    }
    return ceiling;
  },
};
