// ============================================================
// File:        CameraDirectorRunIn.js
// Path:        client/src/modules/camera/CameraDirectorRunIn.js
// Project:     RaceArena — P1-CAMERADIRECTOR-SPLIT-1
//
// WHAT THIS IS FOR: the RUN-IN — the camera's endgame, from the moment the finish line becomes a
// subject until the leader crosses it. Whether the run-in is composing this frame, and at what
// cam.zoom ceiling: the engagement latch, the scheduled widen and close (ENDGAME-SCHEDULE-1/-2),
// the sweep, the glide into it, and the monotone progress measure all of them are written in.
//
// WHY IT IS ITS OWN MODULE: it is one decision with one entry point. `_setTargets` asks
// `_updateRunIn` for a ceiling once per frame and nothing else in the director calls the schedule
// helpers; they share a block of `_runIn*` / `_schedule*` fields that only they write. It was the
// largest single cohesive block in CameraDirector.js (about 650 lines).
//
// WHAT IT IS NOT FOR: the finish line's own demand — `_lineCeiling`, which the schedule asks, stays
// in the director beside the other guarantee ceilings — and the finish SEQUENCE after the crossing,
// which is finishPhase.js. Read docs/CAMERA_DIRECTOR.md and docs/ENDING-PHASES.md before changing
// anything here; the ordering inside `update()` that calls this is load-bearing.
//
// HOW IT IS INSTALLED: exactly like CameraDirectorDiag.js — `Object.defineProperties` onto
// CameraDirector.prototype at the bottom of CameraDirector.js. Every method resolves `this.*`
// against a live director at call time, and the methods were moved VERBATIM: their bodies and
// their comments are what they were in the class. It does not import from CameraDirector.js,
// which keeps the dependency one-way.
// ============================================================

import { COMPANY_FRAME_PCT } from './framingRule.js';

export const runInMixin = {
  /**
   * THE RUN-IN'S DECISION FOR THIS FRAME: is it composing, and at what ceiling?
   *
   * Sets `_runInComposingNow` — which `_forwardFracNow` reads, so it must run BEFORE any guarantee
   * measures room — and returns the ceiling to join `_setTargets`'s `Math.min`.
   *
   * ── WHY IT STARTS LATER THAN THE WINDOW OPENS (RUNIN-MINIMAL-1) ────────────────────────────────
   *
   * The owner's ruling, in two parts: open only far enough that the finish is WELL in frame and no
   * further; and if that would still mean opening far too wide, the end scenario should simply
   * start a little later.
   *
   * "Too wide" is not a taste question here and needs no number: **the run-in engages when the line
   * can be framed WITHOUT opening wider than the widest shot this camera already composes**, which
   * is OVERVIEW's own width. Until then nothing happens at all — the normal states run exactly as
   * they do with the key off. Measured before this rule, the run-in reached 100% of the world on
   * Searound, because at the endgame threshold a closed track's finish is most of a lap away and
   * "the line in frame" meant "the whole lap in frame".
   *
   * THE ENGAGEMENT LATCHES, ONE WAY. `room / distance` is not perfectly monotone — the room depends
   * on the heading, which turns — so a bare comparison would let the run-in flicker on and off, and
   * each flicker is a jump between a wide shot and a tight one. It only ever needs to fire once: the
   * leader is running at the line and does not go back. The latch is not a tuning number, it is the
   * statement that the run-in is a phase rather than a per-frame test.
   *
   * THE TEST USES THE RUN-IN'S OWN FRAMING, not the outgoing shot's. It asks "can the run-in frame
   * this?", so it must ask under the framing the run-in would use — centred, per `_forwardFracNow`.
   * Asking with the forward bias still on would delay the start by the very factor this block
   * removed.
   *
   * @returns {number} the cam.zoom ceiling for this frame, or Infinity when the run-in is not on
   */

  /**
   * THE ENDGAME AS A SCHEDULE (ENDGAME-SCHEDULE-1) — his specification of 2026-08-23.
   *
   * -- WHY A SCHEDULE AND NOT A CEILING ---------------------------------------------------------
   *
   * Every previous shape made the endgame's width a BOUND and let the shot settle against it. A
   * bound has no opinion about MOTION, so the picture stands still whenever the bound does — which
   * is exactly what he saw and rejected: the wide shot stands still for a long stretch. A SCHEDULE
   * has motion as its subject matter: it is a position for every frame, moving through the whole
   * phase and arriving at a stated place at a stated moment.
   *
   * -- THE TWO SEGMENTS, AND WHY THEY MEET AT THE THRESHOLD --------------------------------------
   *
   *   WIDEN, ending AT `endgameThreshold`. His requirement 1 makes that instant a DEADLINE: by 95%
   *          of the race at the latest the winner and the line are both visible. So the move that
   *          makes them visible must be FINISHED there, not started there — which is why the run-in
   *          now begins before the threshold rather than at it.
   *   CLOSE, from the threshold to the crossing, landing on the ACTIVE STATE'S OWN zoom. That is
   *          requirement 2 and it introduces no value: `_stateCamZoom()` is the leader view's 0.75
   *          corridors or the photo finish's 0.4, whichever is running.
   *
   * -- THE EASE IS A SMOOTHSTEP, WHICH IS REQUIREMENTS 3 AND 6 BY CONSTRUCTION -------------------
   *
   * `3u^2 - 2u^3` is C1 with a bounded second derivative, so the rate is continuous everywhere and
   * the acceleration is finite — his "every acceleration and deceleration is gradual, never
   * abrupt". It is monotone, so the shot cannot reopen once it is closing. Its rate is zero at
   * exactly two instants: the TURN, where widening becomes closing and any continuous camera must
   * pass through zero whatever curve it uses, and the ARRIVAL, which is what landing on a value
   * means. Requirement 7 permits the first and requirement 2 requires the second.
   *
   * -- EVERYTHING IS IN LOG SPACE ---------------------------------------------------------------
   *
   * A scale change is perceived logarithmically, so an even-looking close is even in `ln(width)`.
   * Interpolating cam.zoom linearly would crawl at the wide end and rush at the tight one.
   *
   * -- THE CLOSE IS PARAMETERISED BY PROGRESS, THE WIDEN BY ITS OWN SPAN -------------------------
   *
   * `_runInProgressOf` is 0 at the threshold and 1 at the line BY CONSTRUCTION, so the close lands
   * exactly at the crossing however the field paces itself — the same reasoning RUNIN-HOLD-1 gives
   * for its sweep, and the reason a wall-clock close would land early or late. The widen cannot use
   * that measure (it runs BEFORE the threshold, where it is pinned at 0), so it runs on its own
   * progress span, captured when it starts.
   *
   * @returns {number} the cam.zoom the schedule places this frame, or Infinity when it is not on
   */
  _updateRunIn(subjects, frameSize, racers, raceState, ts) {
    this._runInComposingNow = false;
    if (!this._runInShot || !subjects?.point) return Infinity;
    if (!(raceState?.finishT > 0) || (raceState.finishedCount ?? 0) > 0) return Infinity;

    let maxT = 0;
    for (const r of racers) if (r.t > maxT) maxT = r.t;
    const p = maxT / raceState.finishT;
    const deadline = this._endgameThreshold;

    // THE TRAIL, kept every frame so the prediction below is available the moment it is needed.
    this._progTrail.push({ ts, p });
    while (this._progTrail.length > 2 && ts - this._progTrail[0].ts > this._runInOpenMs) {
      this._progTrail.shift();
    }

    // WHEN IT OPENS — one question, and Infinity here means "the endgame is not running yet"
    // rather than "no width", which is what the three separate exits inside it used to say.
    if (!this._scheduleEngaged(subjects, frameSize, raceState, ts, p, deadline)) return Infinity;

    this._runInComposingNow = true;
    // ── THE RAMP IS SMOOTH; ITS PARAMETER WAS NOT (ENDGAME-SCHEDULE-2) ────────────────────────
    //
    // `_runInProgressOf` reads the leader's `t`, which advances with the physics' own jitter.
    // Measured over the endgame, the largest single-frame advance is 2.0x the median one — so a
    // smoothstep of it delivers a curve whose rate doubles and halves from frame to frame. That is
    // hopping, and it is why the worst delivered step was twice the ramp's own theoretical peak.
    //
    // The fix uses the trail the schedule ALREADY keeps: a least-squares line through the last
    // `runInOpenMs` of (time, progress) samples, evaluated at NOW. It is a smoothing with no new
    // constant — the window is the opening's own duration — and it is UNBIASED, unlike an average
    // or an EMA, because it extrapolates the fitted line to the current instant rather than
    // reporting the window's middle. Progress is very nearly linear in time over a fifth of a
    // second, which is what makes a straight line the right model rather than a chosen filter.
    //
    // IT REMAINS MONOTONE AND IT STILL LANDS: `_runInProgressOf` clamps monotone, and the fit is
    // fed the real progress, so it converges on it at the line.
    const fitP = this._scheduleFittedProgress(ts, p);
    this._runInProgress = this._runInProgressOf(racers, raceState, fitP);

    // THE NARROWEST WIDTH THAT SHOWS BOTH — requirement 4 wants the smallest opening that satisfies
    // requirement 1, and requirement 5 is what makes it small: the line need only be VISIBLE, so it
    // is guaranteed inside the FULL frame rather than inside the subject's 70% box. That factor of
    // 1/0.7 = 1.43 is the whole of the width this retires.
    // THE REGION THE LINE IS GUARANTEED INSIDE, and it is the project's own constant rather than a
    // new one. Requirement 5 asks only that the viewer KNOW WHERE THE LINE IS — it may sit near the
    // edge and it need not stay framed at all afterwards — so the subject's `innerFramePct` (0.7,
    // and a 1.43x tax on every frame) is the wrong region. `COMPANY_FRAME_PCT` is what this project
    // already means by "in frame, near the edge is acceptable": it is the region a COMPANION must
    // be inside, 5% off each edge, and it costs 1.11x instead of 1.43x.
    //
    // 1.0 WAS TRIED FIRST AND IS THE CHEAPER-LOOKING WRONG ANSWER: it puts the line EXACTLY on the
    // frame edge, where the pan's own lag takes it straight back out — measured, requirement 1's
    // deadline failed on 2 of 3 probe tracks with the line a few pixels outside. The 11% is what
    // buys the deadline, and `_lineCeiling`'s own header records the identical failure for the
    // identical reason.
    // ── THE TARGET IS MEASURED FROM WHERE THE FRAMING RULE PUTS THE ANCHOR (ENDGAME-REPAIR-1) ──
    //
    // It used to be measured from where the anchor ACTUALLY WAS on screen last frame — the pan does
    // not always reach its intended place, and CAMERA-ANCHOR-TRUTH-1 recorded the cost of assuming
    // it does. That correction is real, but it may not be applied HERE, and the reason is
    // arithmetic rather than taste.
    //
    // `pointGuarantee` divides the ROOM left from the anchor to the region's edge by the DISTANCE
    // to the line. Measured from a point the pan has pushed toward that edge, the room goes to zero
    // and the demanded WIDTH goes to infinity; past the edge the function answers Infinity, meaning
    // "no zoom fixes this". So the schedule's target had a SINGULARITY sitting in the middle of the
    // one segment whose whole job is to be smooth.
    //
    // MEASURED over the widen's own frames, seed 9, all nine scorable tracks, both arms
    // (reports/evolution/ENDGAME-REPAIR-1.md §2.2):
    //
    //     from the OBSERVED anchor   undefined on 63-84% of frames on six tracks; where it IS
    //                                defined it reaches 2108 corridors on city-circuit
    //     from the RULE's anchor     undefined on 0% of frames on every track; median 2.8-7.3
    //                                corridors, worst 11.6
    //
    // The observed anchor was therefore not delivering a correction on those frames — it was
    // delivering Infinity, which the schedule reads as "no target", which is where the freeze and
    // the single-frame blow-up came from: on ice-track the widen sat still for 66 frames, took ONE
    // frame in which the demand was finite, and moved the picture from 1.4 corridors to the
    // world-sized frame (14.6) between two frames. Both halves are this term.
    //
    // The pan's displacement is a TRANSIENT — it shrinks as the shot widens, because the framing
    // rule the pan converges on is the same one this reads. Sizing a schedule on a transient is
    // what produced the singularity. Keeping the line in frame DESPITE a displaced pan is a real
    // requirement, and it is enforced where it belongs: as a term that widens when the line is
    // actually near the edge, never as a divide-by-nearly-zero in the ramp's endpoint.
    const demand = this._lineCeiling(subjects, frameSize, raceState, COMPANY_FRAME_PCT);

    // REQUIREMENT 2, LITERALLY: "at the crossing the shot is at the zoom factor of the leader view
    // or of the photo finish — whichever, but one of the two; it is not a new value." So the
    // endpoint is one of those two constants and NOT `_stateCamZoom()`. The difference is not
    // pedantic: during the endgame the director may still be running OVERVIEW, whose zoom is far
    // wider than either, and aiming the close at it would make the endpoint move under the ramp.
    const endZoom = this._inPhotoFinish ? this._photoFinishZoom : this._leaderZoom;

    // ── THE CLOSE BEGINS WHEN THE WIDEN IS DONE, NOT WHEN THE CLOCK SAYS SO (ENDGAME-SCHEDULE-2) ──
    //
    // His third observation: the close begins VERY LATE and should begin EARLIER and run SLOWER.
    // It began at `endgameThreshold` because that is where the widen was scheduled to finish — but
    // the widen's TARGET falls as the leader closes on the line, so the shot and the demand meet
    // well before the deadline. Waiting for the clock after that is dead time, and it compresses
    // the whole close into the last 5% of the race.
    //
    // The widen is therefore DONE when the shot is as wide as the line needs — `this.zoom <= demand`
    // in cam.zoom, i.e. the delivered width has reached the demanded width. Derived from the two
    // quantities the segment is already made of; no new number, and it cannot fire before there is
    // a demand to meet. The close then runs from there to the crossing: it starts earlier and, over
    // more of the race for the same distance, it runs slower.
    //
    // THE DEADLINE IS STILL A DEADLINE. `p >= deadline` remains a completion condition, so a track
    // where the two never meet behaves exactly as before.
    if (!this._runInWidenDone && Number.isFinite(demand) && this.zoom <= demand) {
      this._runInWidenDone = true;
    }
    this._runInAfterDeadline = p >= deadline || this._runInWidenDone;
    if (!this._runInAfterDeadline) return this._scheduleWiden(demand, p, deadline);
    return this._scheduleClose(demand, endZoom);
  },

  /**
   * WHEN THE ENDGAME OPENS — the design page's first heading, as a step with a name.
   *
   * It is a PHASE, so this latches ONE WAY and stays on. Every flicker between a wide shot and a
   * tight one this camera has produced came from asking a per-frame question about something that
   * should have been asked once.
   *
   * TWO CONDITIONS, AND IT NEEDS BOTH.
   *
   *   1. THE LEADER IS WITHIN ONE OPENING-SPAN OF THE DEADLINE. The widen must FINISH at the
   *      threshold — his requirement 1 makes that instant a deadline, not a starting gun — so it
   *      must START one span before it. The span is `runInOpenMs`, which already paces the opening,
   *      and the rate is observed over that same span, so the estimator adds no second number.
   *
   *      The bound before it — the widen may not take more of the race than the close does, which
   *      is `2 x threshold - 1` and symmetric by construction — is not cosmetic. A caller that
   *      advances the race in large steps makes the time prediction fire arbitrarily early, and
   *      because the latch is one-way a single early frame handed the schedule the width authority
   *      for the WHOLE race: 19 tests failed, almost none of them about the endgame.
   *
   *   2. THE FINISH CAN ACTUALLY BE FRAMED. Condition 1 alone latched the phase on frames where
   *      there was nothing to widen to, and the ramp then ran on the clock while the segment was
   *      inert — arriving part-way up a curve it had never travelled. Measured on space-sprint at
   *      93.7%: the demand went 800 -> 4834 px between two frames and the pan moved 1817 px. That
   *      is the owner's "the zoom sits still and then the camera suddenly jumps back", both halves,
   *      from one cause.
   *
   * THE OPENING IS A GLIDE, because two quantities change discontinuously at that instant: the
   * width opens by whatever the line requires, and `_forwardFracNow` flips the leader's place in
   * frame to its mirror, which moves every guarantee's idea of the room available. Measured on a
   * two-racer fixture, the shot jumped 5.67x in ONE frame. Pan and zoom must move on ONE ease or
   * the frame empties between them, and `_beginRunInGlide` is the existing, tested absorber —
   * running for `runInOpenMs`, exactly the span of the widen, so the glide IS the opening move
   * rather than a second one beside it.
   *
   * @returns {boolean} true when the phase is composing this frame
   */
  _scheduleEngaged(subjects, frameSize, raceState, ts, p, deadline) {
    if (this._runInEngaged) return true;
    // -- HAS THE WIDEN STARTED? ------------------------------------------------------------
    // It starts when the deadline is one `runInOpenMs` away, so that it FINISHES there. The rate is
    // observed over the last `runInOpenMs` — the same span the move occupies, so the estimator's
    // window is not a new number. The latch is one-way for the reason RUNIN-MINIMAL-1 gives: the
    // run-in is a phase, and a per-frame test would flicker between two very different shots.
    // ── THE WIDEN MAY NOT TAKE MORE OF THE RACE THAN THE CLOSE DOES ─────────────────────────
    //
    // The close spans [`endgameThreshold`, 1], so the widen is allowed at most that same span
    // BEFORE the threshold — `2 * threshold - 1`, which is 0.90 at the shipped 0.95. Derived
    // entirely from the existing key and symmetric by construction; no new number.
    //
    // IT IS NOT COSMETIC. Without it the only gate on engagement was the time-to-deadline
    // prediction, and a caller that advances the race in large steps — every synthetic fixture in
    // the director's own suite — makes that prediction fire arbitrarily early. The latch is
    // one-way, so a single early frame handed the schedule the width authority for the WHOLE race:
    // 19 tests failed, and almost none of them were about the endgame (OVERVIEW converging to the
    // leader's zoom, the dt-scaled lerp reading 1, the D6 transition probes). A phase that can
    // start at any moment is not a phase.
    if (!this._runInEngaged && p < 2 * deadline - 1) return false;
    if (!this._runInEngaged) {
      if (p < deadline) {
        const first = this._progTrail[0];
        const dt = ts - first.ts;
        const dp = p - first.p;
        if (!(dt > 0) || !(dp > 0)) return false;
        const msToDeadline = ((deadline - p) / dp) * dt;
        if (msToDeadline > this._runInOpenMs * 1) return false;
      }
      // ── THE WIDEN MAY NOT LATCH BEFORE THERE IS SOMETHING TO WIDEN TO (ENDGAME-SCHEDULE-2) ──
      //
      // `_lineCeiling` returns Infinity while the line cannot be framed at all, and on a long open
      // track that is true for most of the approach. The latch used to fire on the TIME prediction
      // alone, so `_runInWidenFrom` and `_runInWidenStartP` were captured at a moment the segment
      // could not yet run — and then the segment did nothing for tens of frames while `u` advanced
      // on the clock regardless. When the demand finally turned finite the schedule entered at
      // u = 0.74, i.e. 84% of the way to a very wide value, IN ONE FRAME.
      //
      // MEASURED on space-sprint at 93.7%: the schedule's own demand went 800 -> 4834 px between
      // two frames, the delivered width jumped 535 -> 668 at 6.9 ln/s, and the pan moved 1817 px.
      // That is the owner's "the zoom sits still and then the camera suddenly jumps back" — both
      // halves of it, from one cause: the still part is the frames where the segment was latched
      // but inert, and the jump is it arriving mid-ramp.
      //
      // The demand is therefore computed BEFORE the latch, and the latch waits for it.
      if (!Number.isFinite(this._lineCeiling(subjects, frameSize, raceState, COMPANY_FRAME_PCT)))
        return false;
      this._runInEngaged = true;
      // THE ENGAGEMENT IS A GLIDE, for the same reason it always was. `_forwardFracNow` STEPS at
      // this instant — the leader's framing position flips from `leaderForwardFrac` to its mirror,
      // 0.66 to 0.34 — and every guarantee measures its room from that position, so the width they
      // ask for steps with it. Measured on a two-racer fixture, the shot jumped 5.67x in ONE frame.
      // The zoom-only harness could not see it, because the step is in the ANCHOR and the zoom
      // merely follows; the director's own suite caught it.
      //
      // `_beginRunInGlide` is the existing, tested absorber and it runs for `runInOpenMs` — exactly
      // the span of the widen — so the glide IS the opening move rather than a second one beside it.
      this._beginRunInGlide(ts);
      this._runInWidenFrom = this.zoom;
      this._runInWidenStartP = p;
    }
    return true;
  },

  /**
   * THE RAMP'S PARAMETER, SMOOTHED — a least-squares line through the trail, read at NOW.
   *
   * The raw leader progress advances with the physics' own jitter: measured over the endgame, the
   * largest single-frame advance is 2.0x the median one, so a smoothstep of it delivers a curve
   * whose rate doubles and halves between frames. That is hopping, and it is why the worst
   * delivered step was twice the ramp's own theoretical peak.
   *
   * IT INTRODUCES NO CONSTANT. The window is the trail the schedule already keeps, whose length is
   * the opening's own duration. And it is UNBIASED, unlike an average or an EMA, because it
   * extrapolates the fitted line to the current instant rather than reporting the window's middle —
   * progress is very nearly linear in time over a fifth of a second, which is what makes a straight
   * line the right model rather than a chosen filter.
   *
   * IT REMAINS MONOTONE AND IT STILL LANDS: `_runInProgressOf` clamps monotone, and the fit is fed
   * the real progress, so it converges on it at the line.
   *
   * @returns {number} the fitted race progress, or the raw `p` when there is not enough trail
   */
  _scheduleFittedProgress(ts, p) {
    const n = this._progTrail.length;
    if (n < 3) return p;
    let sx = 0,
      sy = 0,
      sxx = 0,
      sxy = 0;
    const t0 = this._progTrail[0].ts;
    for (const q of this._progTrail) {
      const x = q.ts - t0;
      sx += x;
      sy += q.p;
      sxx += x * x;
      sxy += x * q.p;
    }
    const den = n * sxx - sx * sx;
    if (!(Math.abs(den) > 1e-12)) return p;
    const slope = (n * sxy - sx * sy) / den;
    const intercept = (sy - slope * sx) / n;
    const at = intercept + slope * (ts - t0);
    return Number.isFinite(at) ? Math.min(1, Math.max(0, at)) : p;
  },

  /**
   * THE WIDEN — from where the camera stands to the width the finish needs, ending at the deadline.
   *
   * It is the first of the schedule's two segments and it only ever OPENS. Three of the endgame's
   * six invariants live here and each was found by measurement rather than derived:
   *
   *   INVARIANT 3, THE RAMP ADVANCES ONLY ON FRAMES IT CAN RUN. With no computable demand the
   *   segment HOLDS the width it last placed and the carried parameter does not move. A held width
   *   also does not move the anchor, which is what stops the demand and the delivery feeding each
   *   other — measured as 60 consecutive frames alternating between 267 px and 1500 px.
   *
   *   INVARIANT 4, RE-ANCHOR NEVER STEP. On resuming from an inert stretch, and on a state change
   *   (which moves the anchor's intended place and therefore the width the line needs), the ramp
   *   starts again from where the camera IS rather than jumping onto the curve it would have been
   *   on. The trigger is an equality test on the state; there is no number in it.
   *
   *   INVARIANT 2, MONOTONE. `u` is carried and each active frame advances it by the share of the
   *   remaining race-to-deadline that this frame consumed, so it reaches 1 exactly at the deadline,
   *   cannot advance while the segment is inert, and never restarts.
   *
   * @returns {number} the cam.zoom the widen places this frame
   */
  _scheduleWiden(demand, p, deadline) {
    // -- WIDEN ---------------------------------------------------------------------------
    //
    // ── THE RAMP MAY ONLY ADVANCE ON FRAMES IT CAN ACTUALLY RUN (ENDGAME-SCHEDULE-2) ──────
    //
    // `_lineCeiling` returns Infinity whenever the line cannot be framed from the anchor, and on
    // a curving track that FLICKERS: `pointGuarantee`'s room depends on the heading, and the
    // heading turns. The ramp's `u` was derived from absolute race progress, so on every inert
    // frame it advanced anyway — and when the demand came back the segment resumed part-way up a
    // curve it had never travelled.
    //
    // MEASURED on space-sprint: the widen latched at 92.9% from a 460 px shot, sat inert (the
    // zoom visibly STILL, at the state's own 800 px) until 93.7%, and then resumed at u = 0.38 —
    // delivering the schedule's demand as 4834 px in a single frame. The picture moved 0.22 ln of
    // zoom and 1817 px of pan between two frames. That is the owner's "the zoom sits still and
    // then the camera suddenly jumps back", and both halves are this one defect.
    //
    // So the ramp RE-ANCHORS whenever it has been unable to run: it starts again from where the
    // camera actually is, aimed at what the line actually needs now. It cannot then arrive
    // anywhere it did not travel to, and an inert stretch costs a later start rather than a jump.
    // ── A SCHEDULE PLACES EVERY FRAME IT IS COMPOSING (ENDGAME-REPAIR-1) ─────────────────
    //
    // Returning Infinity here handed the width back to the STATE for that one frame, and the
    // state's shot is a different shot: on ice-track 1.2 corridors against the schedule's 7. The
    // demand flickers finite/Infinity because `pointGuarantee`'s room is measured from where the
    // anchor ACTUALLY IS on screen — which depends on the width this function just placed. So the
    // two halves fed each other and the result was a PERIOD-2 LIMIT CYCLE: the wide frame put the
    // anchor outside the region, which made the demand Infinity, which delivered the tight frame,
    // which put the anchor back inside, which made the demand finite, which delivered the wide
    // frame again. Measured on ice-track under the shipped defaults: 60 consecutive frames
    // alternating between 267 px and 1500 px of width, a full second of the endgame strobing at
    // 30 Hz — and the same shape on seven of the nine scorable tracks, worth up to 2.51 ln and
    // 10337 px of pan IN ONE FRAME.
    //
    // Neither of this block's earlier attempts touched it. Restarting the ramp on every resume
    // (`36a0b70d`) cut the strobe's AMPLITUDE and stalled the widen instead — river-run standstill
    // 55%; carrying it (`415a5e9e`) restored the motion and let the amplitude back in — widest
    // frame 6.2 -> 15.6 corridors, monotonicity 8/9 -> 4/9. Both were treating a symptom.
    //
    // THE SEGMENT THEREFORE HOLDS. On a frame it cannot compute a demand for, it places the width
    // it last placed. That is requirement 7's permitted pause, it is monotone, it introduces no
    // number — and it BREAKS THE LOOP AT ITS SOURCE, because a held width does not move the
    // anchor, so the next frame's demand is computed from the same geometry as this one's.
    if (!Number.isFinite(demand)) {
      this._runInWidenInert = true;
      return this._runInHeldZoom ?? this.zoom;
    }
    if (this._runInWidenInert) {
      this._runInWidenInert = false;
      this._runInWidenFrom = this.zoom;
    }
    // ── THE TARGET MOVES WHEN THE STATE DOES, AND IT MAY NOT DO SO AS A STEP (ENDGAME-REPAIR-1) ──
    //
    // The widen's target is a piece of GEOMETRY measured under the composition that is running:
    // `_forwardFracNow` puts the anchor at the mirror of the leader's forward placement while a
    // FORWARD state is running and at the centre of frame while one that is not is running, and
    // `subjects.point` is the state's own subject — the leader for one shot, a group's centre for
    // another. Both change the instant the state changes, so the width the line needs changes with
    // them, as a STEP.
    //
    // MEASURED on river-run, both arms, at 94.25% of the race: LEAD_CHANGE -> BATTLE_ZOOM moved
    // the anchor's intended place from 0.340 to 0.500 of the frame and the subject 72 world px,
    // and the delivered width went 1.99 -> 2.81 corridors BETWEEN TWO FRAMES — 0.347 ln, the
    // largest remaining step anywhere in the endgame on any track.
    //
    // So the widen RE-ANCHORS on a state change, which is exactly what the close below already
    // does when its endpoint factor flips, and for the identical reason: it starts again from
    // where the camera IS and eases to the new target over what is left of the segment. The
    // trigger is an equality test on the state, not a threshold — there is no number in it — and
    // the ramp still reaches 1 at the deadline, because `u` is renormalised against the race that
    // remains rather than against the span it originally had.
    if (this._runInWidenState !== null && this._runInWidenState !== this.state) {
      this._runInWidenFrom = this.zoom;
      this._runInWidenU = 0;
      this._runInWidenPrevP = p;
    }
    this._runInWidenState = this.state;
    const from = this._runInWidenFrom;
    // ── THE RAMP ADVANCES ON THE FRAMES IT RUNS, AND ONLY THOSE ──────────────────────────
    //
    // Deriving `u` from absolute race progress advanced it on inert frames and produced the jump
    // this block opened with. RESTARTING it on every resume fixed that and broke the opposite
    // way: on river-run the demand flickers almost every other frame, so the ramp restarted
    // continuously and never got anywhere — standstill 13% -> 55% on the shipped defaults.
    //
    // So `u` is CARRIED, and each active frame advances it by the share of the remaining
    // race-to-deadline that this frame consumed. It reaches 1 exactly at the deadline, cannot
    // advance while the segment is inert, and never restarts — all three at once, and no constant.
    const prevP = this._runInWidenPrevP ?? this._runInWidenStartP ?? p;
    const remPrev = deadline - prevP;
    const remNow = deadline - p;
    if (remNow <= 0) this._runInWidenU = 1;
    else if (remPrev > 0 && remNow < remPrev)
      this._runInWidenU = 1 - (1 - (this._runInWidenU ?? 0)) * (remNow / remPrev);
    this._runInWidenPrevP = p;
    const u = Math.min(1, Math.max(0, this._runInWidenU ?? 0));
    const e = u * u * (3 - 2 * u);
    const z = Math.exp(Math.log(from) + (Math.log(demand) - Math.log(from)) * e);
    // This segment only ever OPENS: a demand tighter than the shot already is would make the
    // widen a close, and the turn would then happen twice.
    this._runInHeldZoom = Math.min(z, from);
    return this._runInHeldZoom;
  },

  /**
   * THE CLOSE — from the width delivered at the turn to the factor the shot arrives at.
   *
   * The second segment, parameterised by the leader's progress to the line so that it LANDS at the
   * crossing however the field paces itself. Its endpoint is one of the two factors the director
   * already carries, never a new value, and never the active state's own zoom — during the endgame
   * the state may still be OVERVIEW, whose zoom is far wider than either, and aiming at it would
   * make the endpoint move under the ramp.
   *
   * INVARIANT 4 AGAIN: the endpoint can change mid-close, because which factor applies is decided
   * by the race. The ratio between them is ln(0.75/0.4) = 0.629, so a flip part-way up the ramp
   * would move the delivered zoom by `e x 0.629` in ONE frame — measured at exactly 97.0% of the
   * race on three tracks, one number, no geometry involved. So the ramp re-anchors on the change.
   *
   * INVARIANT 5 LIVES HERE AS A FLOOR, not as a second author: the close may not go tighter than
   * the width at which the finish is findable. It cannot make the shot jump, because the close
   * starts at or wider than that width and it shrinks monotonically — and it releases exactly at
   * the crossing, because the guarantee answers Infinity when the distance to the line is zero, so
   * requirement 2's arrival is untouched by arithmetic rather than by care.
   *
   * @returns {number} the cam.zoom the close places this frame, or Infinity if it cannot place one
   */
  _scheduleClose(demand, endZoom) {
    // -- CLOSE -----------------------------------------------------------------------------
    // The width reached at the deadline is the start; the state's own zoom is the end. Latched
    // once, because interpolating from a live value would let the start of the ramp move under it.
    // THE CLOSE STARTS FROM THE DELIVERED WIDTH, NOT FROM THE WIDEN'S OWN LAST VALUE. They differ
    // wherever a guarantee widened the shot during the widen, and starting the ramp from the value
    // the schedule WANTED rather than the one the viewer SAW put a one-frame step at the turn —
    // measured on mountainstreet under the shipped defaults at -3.2 ln/s, which is precisely the
    // abruptness requirement 6 forbids. Latched once, on the first frame past the deadline.
    if (this._runInDeadlineZoom === null) this._runInDeadlineZoom = this.zoom;

    // ── THE ENDPOINT CAN CHANGE MID-CLOSE, AND IT MAY NOT DO SO AS A STEP (ENDGAME-SCHEDULE-2) ──
    //
    // Requirement 2 names TWO factors, the leader view and the photo finish, and which one applies
    // is decided by the race: `_inPhotoFinish` flips when the finish phase says so. The ratio
    // between them is ln(0.75/0.4) = 0.629, so a flip part-way up the ramp moves the delivered zoom
    // by `e x 0.629` IN ONE FRAME.
    //
    // MEASURED: on ice-track, mountainstreet and space-sprint alike the worst single-frame step sat
    // at exactly 97.0% of the race and was worth 0.23 ln — 0.352 x 0.629, the ease value at that
    // moment times the ratio. Three tracks, one number, no geometry involved: a flip, not a wobble.
    //
    // So the ramp RE-ANCHORS on the change, exactly as the widen does when it resumes: it starts
    // again from where the camera IS, and eases to the new factor over what is left of the close.
    // Requirement 2 still holds — `u` reaches 1 at the line by construction, so the arrival is on
    // the factor that is actually running — and requirement 6 holds too, because nothing steps.
    if (this._runInEndZoom !== null && Math.abs(endZoom - this._runInEndZoom) > 1e-12) {
      this._runInDeadlineZoom = this.zoom;
      this._runInCloseFromU = this._runInProgress ?? 0;
    }
    this._runInEndZoom = endZoom;

    const from = this._runInDeadlineZoom;
    if (!(from > 0) || !(endZoom > 0)) return Infinity;
    const u0 = this._runInCloseFromU ?? 0;
    const raw = this._runInProgress ?? 0;
    // Re-normalised so the ramp still reaches 1 exactly at the line, whatever it re-anchored at.
    const u = u0 >= 1 ? 1 : Math.min(1, Math.max(0, (raw - u0) / (1 - u0)));
    const e = u * u * (3 - 2 * u);
    // The smoothstep is monotone and `e` never exceeds 1, so this cannot pass the endpoint. No
    // clamp is needed and an earlier one was actively harmful: `Math.min(z, stateZoom)` pinned the
    // shot to a WIDE state instead of letting the schedule close through it, which is exactly the
    // standstill this block exists to remove (measured: mountainstreet held 800 px from 94.9% to
    // 97.0%, then dived at -2.3 ln/s the frame the state changed).
    const z = Math.exp(Math.log(from) + (Math.log(endZoom) - Math.log(from)) * e);

    // ── REQUIREMENT 5: THE VIEWER CAN ALWAYS TELL WHERE THE LINE IS (ENDGAME-LINE-1) ───────────
    //
    // His requirement, as written: from the START of the endgame until the crossing the viewer can
    // always tell where the finish line is. It need not be whole — cut at the edge is fine, part of
    // the band is enough — but it never becomes unfindable.
    //
    // THE CONDITION: the line's CENTRE POINT stays inside the frame at `COMPANY_FRAME_PCT`. The
    // band runs THROUGH that point, so if the point is in shot the band is in shot, cut at its ends
    // by the frame edge — which is exactly what he allows. It is far looser than the promise the
    // old `check-runin-frame` held (the point inside the subject's 0.7 box, a 1.43x tax on every
    // frame) and far stricter than what the schedule did (free to leave after 95%). 1.0 is the
    // cheaper-looking wrong answer: it puts the point ON the edge, where the pan's own lag takes it
    // straight back out, and `_lineCeiling`'s header records that failure for the same reason.
    //
    // AN EARLIER PERMISSION WAS MINE, NOT HIS. ENDGAME-SCHEDULE-1 read requirement 1 as "the line
    // need not stay framed after the 95% mark". It does not say that; 95% is where the endgame
    // BEGINS. The frame he photographed with no line in it is that misreading, correctly built.
    //
    // IT IS A FLOOR, SO THE SCHEDULE STAYS THE SOLE AUTHOR. `demand` is the width at which the line
    // is inside that region; the close may not go tighter than it. It cannot make the shot jump,
    // because the close STARTS at or wider than the demand — that is the very condition
    // `_runInWidenDone` tests — and the demand shrinks monotonically as the leader approaches.
    //
    // REQUIREMENT 2 IS UNTOUCHED, and by arithmetic rather than by care. `pointGuarantee` returns
    // Infinity when the distance to the line is zero, so the floor RELEASES exactly at the crossing
    // and the ramp's own endpoint — the leader view's factor or the photo finish's — is what the
    // shot arrives at. The same argument RUNIN-HOLD-1 gives for its sweep landing exactly.
    if (Number.isFinite(demand) && demand < z) return demand;
    return z;
  },

  /**
   * HOW FAR THROUGH THE ONE SWEEP THIS FRAME IS — 0 while holding, 1 at the line.
   *
   * Read by `_forwardFracNow` as well as by the ceiling above, so the anchor's travel and the
   * zoom's close are the SAME move rather than two moves that happen to overlap. That is the same
   * lesson `_beginRunInGlide` records: pan and zoom on one ease, or the frame empties between them.
   *
   * @returns {number} 0..1
   */
  /**
   * IS THE SCHEDULED ENDGAME COMPOSING THIS FRAME? — invariant 1's one question, asked once.
   *
   * The endgame's first rule is that while the schedule composes, nothing else writes the zoom.
   * Five places enforce that, and before this they each re-derived the condition inline. That is
   * not a tidiness point: **the endgame had five separate authors of the zoom precisely because
   * there was no name to consult**, so every repair invented its own test and the next repair could
   * not see the others. A quantity with five authors has no design, it has an argument.
   *
   * Three of the five need a REFINEMENT — is the schedule what actually set the width, is its
   * ceiling finite, is it past the turn — and each states that refinement beside its own call
   * rather than folding it in here. The base question has one answer and one place.
   *
   * @returns {boolean}
   */
  _scheduleComposing() {
    return this._runInComposingNow;
  },

  _runInSweepU() {
    // The schedule has no "release": it is moving from the moment it engages, so its travel
    // parameter is the CLOSE's own `u` — 0 through the widen and `_runInProgress` after the turn.
    // The leader's walk back and the zoom's close therefore run on ONE parameter and land together.
    return this._runInAfterDeadline ? (this._runInProgress ?? 0) : 0;
  },

  /**
   * THE ENGAGEMENT IS A GLIDE, and it has to be (RUNIN-GLIDE-1).
   *
   * On the frame the run-in engages, the framing it asks for changes discontinuously in BOTH
   * quantities at once: the zoom opens by however much the line requires — measured at up to 6.5x on
   * space-sprint, where the finish is most of the track away at the endgame threshold — and the
   * anchor steps from its forward place to its mirrored one. Left to the ordinary tracking lerp,
   * pan and zoom ease independently and the frame goes EMPTY for a handful of frames while they do:
   * 93 such frames across ten tracks, every one of them at run-in progress 0.006-0.016, i.e. the
   * engagement itself and nothing else.
   *
   * MEASURED WHICH STEP CAUSED IT, rather than assumed. With the anchor travel disabled and only the
   * zoom step left, the count was 95 — no better. **The zoom step is the whole of it**, and the
   * anchor travel is free: it costs nothing in emptiness and it lifts the line's in-frame share from
   * 90.1% to 95.3% and brings the line into shot 0.4 s -> 0.2 s after the window opens.
   *
   * SO THIS USES THE MECHANISM THE PROJECT ALREADY HAS FOR EXACTLY THIS. `docs/DEAD-ENDS.md` §M
   * states the lesson in one line: *the glide is what makes a big zoom change safe — it moves pan
   * and zoom on ONE ease, so the anchor is framed consistently by construction*, and master performs
   * a LARGER zoom change than this at the PHOTO_FINISH seam inside a glide for free. The run-in is
   * not a state, so no transition fires to start one; this starts the same glide by hand, on the
   * same `glideDurationMs` every other transition uses. **No new number** — and it is the only
   * remaining reason the run-in may open as far as the line actually requires rather than being
   * capped.
   *
   * It is deliberately ONE-SHOT, guarded by the same latch that makes the run-in a phase: a glide
   * restarted every frame is not an ease, it is a rail.
   *
   * ── IT HAS ITS OWN DURATION, AND THE BORROWING BEFORE IT WAS A MISTAKE ────────────────────────
   *
   * The owner watched it at `glideDurationMs` and called it HECTIC — measured on ice-track, cam.zoom
   * fell 4.549 -> 1.000 in about half a second, the pace of an ordinary state change and not of an
   * authored move. It then borrowed `finishOverviewZoomOutDurationMs` for one day, which was wrong
   * for a reason worth keeping: that key paces the zoom-out AFTER the crossing, a shot the owner has
   * already accepted at its present length. One value for two motions that happen at different
   * moments for different reasons means tuning either moves the other, and it put a settled value at
   * risk to change an unsettled one.
   *
   * `runInOpenMs` is its own key now, beside that zoom-out in the ending controls.
   */
  _beginRunInGlide(ts) {
    if (!this._shape) return;
    this._lerpPhase = 'glide';
    this._glideStartTs = ts;
    this._glideStartZoom = this.zoom;
    this._glideStartOffsetX = this.offsetX;
    this._glideStartOffsetY = this.offsetY;
    this._glideDurationActiveMs = this._runInOpenMs;
  },

  /**
   * THE ONE PROGRESS MEASURE the run-in runs on: the leader's remaining distance to the line, as a
   * fraction of the distance he had at engagement. 0 at the endgame threshold, 1 at the line.
   *
   * MEASURED ALONG THE TRACK, NOT ACROSS THE GROUND, and that is the honest choice rather than the
   * obvious one. `pointGuarantee` needs the straight-line distance because it is asking what fits in
   * a rectangle; a PROGRESS measure must be monotone, and the straight-line distance is not — on a
   * closed track the leader can be euclidean-near the finish and still m ost of a lap from it, and it
   * wobbles as the track turns. Along the track it is `leaderProgress`, which is the same quantity
   * `endgameThreshold` is written in — so this is 0 exactly where the window opens and 1 exactly at
   * the line, with no captured reference and no new number.
   *
   * IT NEVER RUNS BACKWARDS. `_runInProgress` is clamped monotone, which is the one-way latch doing
   * its real job: the anchor's travel toward its ordinary place must be a journey, not a negotiation,
   * and a measure that dipped would walk the leader back across the frame in view.
   *
   * @returns {number} 0..1
   */
  _runInProgressOf(racers, raceState, pOverride = null) {
    let maxT = 0;
    for (const r of racers) if (r.t > maxT) maxT = r.t;
    // ENDGAME-SCHEDULE-2 lets the scheduled endgame pass a SMOOTHED progress here. The raw leader
    // progress jitters by 2x frame to frame, and this measure drives a ramp.
    const p = pOverride ?? maxT / raceState.finishT;
    const span = 1 - this._endgameThreshold;
    const raw = span > 0 ? (p - this._endgameThreshold) / span : 1;
    const s = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    return this._runInProgress === null ? s : Math.max(this._runInProgress, s);
  },
};
