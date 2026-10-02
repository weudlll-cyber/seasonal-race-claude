// ============================================================
// File:        CameraDirectorLevelSet.js
// Path:        client/src/modules/camera/CameraDirectorLevelSet.js
// Project:     RaceArena — P1-CAMERADIRECTOR-SPLIT-1
//
// WHAT THIS IS FOR: WHO IS STILL IN THE FIGHT AT THE LINE, as the camera judges it from what is
// visible on track. Three related answers, all measured in ONE racer length:
//   · the CONTENTION WATCH (CONTENTION-WATCH-1) — can this racer still win? A one-way verdict that
//     only ever releases a racer from the pinned photo-finish pair, eased out, never back in;
//   · the LEVEL SET (RUNIN-LEVEL-SET-BUILD-1) — everyone at most one racer length behind the leader
//     along the track, and the width ceiling that keeps them all in frame;
//   · the ABREAST CONTENDERS (CONTENDER-ZOOM-1, ITEM7-MEMBERSHIP-1) — who is on a free lane and
//     level, and the framing set the photo finish holds.
//
// WHY IT IS ITS OWN MODULE: these eight methods share one unit and one subject — the racers near
// the leader at the end — and they read each other rather than the rest of the director. Keeping
// them together keeps the unit's three call sites side by side, which is the point of
// RUNIN-LEVEL-SET-BUILD-1's "a unit stated three times is a unit that can drift".
//
// THE UNIT ITSELF STAYS ON THE CLASS. `contactLengthBetween` and `withinOneLength` are STATIC
// methods of CameraDirector, reached from scripts and spied on by tests as
// `CameraDirector.contactLengthBetween`. The moved methods call them as `this.constructor.*`,
// which on every director IS `CameraDirector` — so a spy on the class still intercepts every call
// site, and this module still does not import CameraDirector.js. That one token at three call
// sites is the only change to the moved code; everything else is VERBATIM, comments included.
//
// HOW IT IS INSTALLED: exactly like CameraDirectorDiag.js — `Object.defineProperties` onto
// CameraDirector.prototype at the bottom of CameraDirector.js.
// ============================================================

import { shortestArcDeltaT } from '../../utils/mathUtils.js';
import { DEFAULT_INNER_FRAME_PCT } from './framingConfig.js';
import { contenderGuarantee } from './framingRule.js';

export const levelSetMixin = {
  /**
   * THE CONTENDERS, BY LANE — everyone not blocked by a racer ahead of them on their own lane.
   *
   * Two bodies are on the same lane when they OVERLAP across the track: their lateral separation is
   * less than the sum of their half widths. That is `pairContact`'s `contactWidth` in
   * `raceBehavior.js`, reused rather than restated, and the physicalY unit is rowLayout.js's — one
   * unit is half a track width.
   *
   * @param {object[]} ordered  racers sorted by t, leader first
   * @returns {object[]} the contenders, leader first
   */
  /**
   * CONTENTION-WATCH-1 — CAN THIS RACER STILL WIN, JUDGED FROM WHAT IS VISIBLE ON TRACK?
   *
   * ── THE ESTIMATE, AND WHERE EVERY QUANTITY IN IT COMES FROM ───────────────────────────────────
   *
   * The gap now, plus the speed difference carried forward over the distance that remains:
   *
   *     remaining      = (finishT - leader.t) x pathLengthPx          world px the leader has left
   *     msToLine       = remaining / leaderSpeed                      at the speed he is running
   *     projectedGap   = gapNow + (leaderSpeed - racerSpeed) x msToLine
   *     out            <=> projectedGap > one body length
   *
   * `pathLengthPx`, `drawnBodyLengthPx` and `t` are all quantities THE RACE puts on a racer, and
   * "one body length" is `pairContact`'s own along-track touch distance — the identical expression
   * `_abreastContenders` uses for "nearly level with the leader". No new number enters here; the
   * only one this feature adds is the cadence, and it is named in defaults.js.
   *
   * IT NEVER READS THE RACE PLAN. His instruction, and the reason is not caution: the plan knows
   * the outcome, and a camera that drops a racer who still looks close on screen would be spoiling
   * the result. Everything above is visible to the viewer too.
   *
   * ── WHY IT CANNOT OSCILLATE, STRUCTURALLY ─────────────────────────────────────────────────────
   *
   * THE VERDICT IS ONE-WAY. `_contentionOut` is a Set that is only ever added to, and it is cleared
   * only when a new race resets the director. So a racer's state can change at most ONCE per race,
   * from in to out, and "flicker" is not a shape this can take — not because it was measured not to,
   * but because there is no code path that removes a member. That is what FINISH-PAIR-1's pin was
   * defending and it is preserved rather than re-litigated: the pair is still pinned, and this only
   * ever REMOVES from it.
   *
   * A RELEASE NEEDS THE VERDICT TWICE RUNNING. One-way means a single bad estimate is permanent, so
   * a racer judged out is put in `_contentionPending` first and released only if the NEXT check
   * agrees. Two consecutive checks, not a tuned threshold — and a racer who recovers in between
   * simply falls out of `_contentionPending`, which is the one place this design is two-way and is
   * safe because it decides nothing on its own.
   *
   * ── WITHOUT GEOMETRY THERE IS NO VERDICT ──────────────────────────────────────────────────────
   *
   * The same guard `_abreastContenders` carries, for the same reason: a caller that supplies bare
   * {t, x, y, index} shapes — every synthetic fixture in this director's own suite — would otherwise
   * be judged on absent fields. With no geometry nobody is ever released, which is today's picture.
   *
   * @returns {void} mutates `_contentionOut`; read through `_contentionWeight`
   */
  _updateContentionWatch(racers, raceState, ts) {
    if (!this._contentionWatch) return;
    if (!(raceState?.finishT > 0) || (raceState.finishedCount ?? 0) > 0) return;
    if (!racers?.length) return;
    // THE WINDOW IS THE RACE'S OWN, and it is the same one requirement 5 is scoped to. Nothing
    // before 95% is touched by this feature at all.
    let maxT = 0;
    let leader = null;
    for (const r of racers)
      if (r.t > maxT) {
        maxT = r.t;
        leader = r;
      }
    if (!leader || maxT / raceState.finishT < this._endgameThreshold) return;
    if (this._contentionNextTs !== null && ts < this._contentionNextTs) return;
    this._contentionNextTs = ts + (this._contentionCheckMs ?? 250);
    this._contentionChecks++;

    const pathLen = leader.pathLengthPx ?? 0;
    const hasGeometry = pathLen > 0 && (leader.drawnBodyLengthPx ?? 0) > 0;
    // The rate is measured BETWEEN checks, so the cadence is also the estimator's window — which is
    // why it is chosen against the estimate's stability rather than against a feeling.
    const prevLeader = this._contentionLast.get(leader.index);
    const nextLast = new Map();
    for (const r of racers) nextLast.set(r.index, { ts, t: r.t });
    const rateOf = (r) => {
      const p = this._contentionLast.get(r.index);
      if (!p || !(ts > p.ts)) return null;
      return ((r.t - p.t) * pathLen) / (ts - p.ts); // world px per ms
    };
    const vLeader = prevLeader ? rateOf(leader) : null;
    if (!hasGeometry || !(vLeader > 0)) {
      this._contentionLast = nextLast;
      return;
    }
    const msToLine = ((raceState.finishT - leader.t) * pathLen) / vLeader;

    for (const r of racers) {
      if (r === leader || r.index === leader.index) continue;
      if (this._contentionOut.has(r.index)) continue;
      const vR = rateOf(r);
      if (vR === null) continue;
      const gapNow = shortestArcDeltaT(leader.t, r.t) * pathLen;
      const contactLength = this.constructor.contactLengthBetween(leader, r);
      if (!(contactLength > 0)) continue;
      const projected = gapNow + (vLeader - vR) * msToLine;
      if (projected > contactLength) {
        if (this._contentionPending.has(r.index)) {
          this._contentionOut.add(r.index);
          this._contentionPending.delete(r.index);
          this._contentionReleasedAt.set(r.index, ts);
        } else {
          this._contentionPending.add(r.index);
        }
      } else {
        this._contentionPending.delete(r.index);
      }
    }
    this._contentionLast = nextLast;
  },

  /**
   * How much of a racer the framing still holds: 1 while he is in contention, easing to 0 over the
   * run-in's own opening span once he is released.
   *
   * THE DURATION IS `runInOpenMs`, WHICH ALREADY EXISTS — the owner's own 1-1.5 s, the span the
   * endgame's opening move occupies. A second duration for "how long a subject takes to leave the
   * frame" would be a number with no argument behind it.
   *
   * THE EASE IS THE SAME SMOOTHSTEP the schedule uses: C1, so the rate is continuous at both ends
   * and nothing steps. That is his requirement 6 applied to this move rather than restated for it.
   */
  _contentionWeight(index, ts) {
    if (!this._contentionWatch || !this._contentionOut.has(index)) return 1;
    const at = this._contentionReleasedAt.get(index);
    const dur = this._runInOpenMs;
    if (!(at >= 0) || !(dur > 0)) return 0;
    const u = Math.min(1, Math.max(0, (ts - at) / dur));
    const e = u * u * (3 - 2 * u);
    return 1 - e;
  },

  /**
   * A released racer, as the FRAMING sees him: his own position while he is in contention, easing
   * to the leader's as he leaves it.
   *
   * ONE BLEND MOVES BOTH THINGS AT ONCE, which is why it is done this way rather than by dropping
   * him from the set. `subjects.point` is built from the pair and so is `contenderGuarantee`, so
   * easing his POSITION eases the pan and the width together, on one curve — the same lesson
   * `_beginRunInGlide` records as "pan and zoom on one ease, or the frame empties between them".
   * Dropping him from the set instead would step both on the frame he left it.
   *
   * At weight 0 he sits exactly on the leader, where he constrains nothing and pulls the anchor
   * nowhere — the shot is then the leader's own, which is what it would have been had he never been
   * captured.
   */
  _contentionEased(r, leader, ts) {
    if (!this._contentionWatch || !r || !leader || r.index === leader.index) return r;
    const w = this._contentionWeight(r.index, ts);
    if (w >= 1) return r;
    // ── EVERY FIELD THE FRAMING READS, NOT JUST THE POSITION ──────────────────────────────────
    //
    // The first cut eased `x` and `y` alone and moved NOTHING: measured on space-sprint seed 9 the
    // picture was byte-identical with the watch on. `getPanTarget` computes a pair's midpoint from
    // `t` — `shape.getPosition((r0.t + r1.t) / 2, 0)`, deliberately, so the point stays on the
    // racing line instead of cutting across the infield — so the pan never saw the blend at all.
    //
    // The blend therefore covers each field the framing actually reads: `t` for the pan target and
    // the heading, `x`/`y` for the contender guarantee, `physicalY` for the lateral one. At weight
    // 0 the released racer is the leader in every respect the CAMERA can see, so he constrains
    // nothing and pulls nothing — while the RACE's own copy of him is untouched, because this is a
    // shallow copy made for the framing and thrown away with the frame.
    return {
      ...r,
      t: leader.t + (r.t - leader.t) * w,
      x: leader.x + (r.x - leader.x) * w,
      y: leader.y + (r.y - leader.y) * w,
      physicalY: (leader.physicalY ?? 0) + ((r.physicalY ?? 0) - (leader.physicalY ?? 0)) * w,
    };
  },

  /**
   * THE LEVEL SET — the owner's rule of 2026-08-24, as a membership.
   *
   * *"Any racer at most ONE RACER LENGTH behind the leader ALONG THE TRACK must be in frame, however
   * far to the side he is running."*
   *
   * IT IS `_abreastContenders` CONDITION 1 ALONE. That method carries a second condition — ON A FREE
   * LANE — which is an ACROSS-TRACK test, and the owner has now excluded across-track distance from
   * deciding membership: a racer's lane says nothing about his chance. Condition 2 stays where it is
   * and keeps deciding the PHOTO_FINISH framing set; it simply has no part in this rule.
   *
   * **LIVE, NOT PINNED — decided deliberately; see the report's pin-or-live section.** The shipped
   * contender set is captured once at the PHOTO_FINISH transition and never re-sorted, because
   * re-sorting moves the ANCHOR (the pair midpoint) and that is steering. This set never touches the
   * anchor — it returns a width ceiling and nothing else — so the pin's reason does not reach it.
   * And a pinned set would fail the rule by construction: a racer who closes to within a length
   * AFTER the pin could never be admitted, and arriving late alongside is precisely the case.
   *
   * @returns {Array<{x:number,y:number}>} the leader and everyone level with him; never null
   */
  _levelContenders(racers) {
    if (!racers?.length) return [];
    let leader = null;
    let maxT = -Infinity;
    for (const r of racers) {
      if (r.t > maxT) {
        maxT = r.t;
        leader = r;
      }
    }
    if (!leader) return [];
    const pathLen = leader.pathLengthPx ?? 0;
    // THE SAME GEOMETRY GUARD `_abreastContenders` CARRIES, for the same reason: without
    // `pathLengthPx` and a drawn body the rule cannot be applied, and a caller supplying neither
    // (a director test on bare shapes, `camera-replay`'s marker fields) would otherwise pass EVERY
    // racer and frame the whole field. Five FINISH-PAIR-1 tests went red on exactly that.
    if (!(pathLen > 0) || !((leader.drawnBodyLengthPx ?? 0) > 0)) return [];
    const out = [leader];
    for (const r of racers) {
      if (r === leader || r.index === leader.index) continue;
      if (this.constructor.withinOneLength(leader, r, pathLen)) out.push(r);
    }
    return out;
  },

  /**
   * THE LEVEL GUARANTEE — the width that keeps every member of that set IN FRAME.
   *
   * A PRESENCE GUARANTEE, NOT A SPAN ONE, and that distinction is the larger half of this build.
   * `contenderGuarantee` is given the anchor, so each member is measured against the room the frame
   * actually has from where the subject sits — `presenceCeilingFrom` in framingRule.js, which is
   * `halfCorridorCeiling` with a different vector. Without the anchor it would fit the span BETWEEN
   * members, which two racers running wide TOGETHER satisfy while both are off screen: measured over
   * 1,260 races, span removes 11 of 126 winner-off races and presence removes 93.
   *
   * SCOPED TO THE RUN-IN. Infinity whenever the run-in is not composing, so **every frame before the
   * closing stretch is what it was, to the pixel** — asserted by a test rather than asserted here.
   *
   * WIDEN-ONLY BY CONSTRUCTION: it returns a CEILING on cam.zoom, and the caller composes it with
   * `Math.min`. It can make the shot wider and it has no way to make it tighter. That is what keeps
   * the finish line — a version that could tighten would lose it, measured at 14.5-32.7% of frames
   * against today's 85.7% (RUNIN-CONTENDER-GUARANTEE-1 §6).
   *
   * ── THE RELEASE IS EASED, WHICH IS WHAT MAKES A LIVE SET SAFE ─────────────────────────────────
   *
   * Membership is live, so a racer hovering at exactly one body length joins and leaves repeatedly.
   * Admitting him is instant — he must not be cut while the camera thinks about it — but RELEASING
   * him is eased, so the width cannot pump. The ceiling may FALL (widen) on any frame and may RISE
   * (tighten) only along a smoothstep.
   *
   * **NO NEW CONSTANT.** The span is `runInOpenMs`, the owner's own 1-1.5 s, which already paces the
   * opening glide and already times `_contentionWeight`'s release of a racer who has dropped out of
   * contention. The ease is the same `3u^2 - 2u^3` the schedule uses, so nothing here can disagree
   * with the rest of the endgame about the shape of a move. The interpolation is in LOG space,
   * because a scale change is perceived logarithmically and this file says so in three other places.
   *
   * IT RELEASES TO THE SHOT THAT WOULD OTHERWISE BE, not to infinity: `preLevel` is the width every
   * other authority has already agreed on, so at the end of the ease this term is exactly non-binding
   * and hands back without a step.
   *
   * @param {number} preLevel  the cam.zoom every other authority has settled on this frame
   * @returns {number} the cam.zoom ceiling to compose with `Math.min`
   */
  _levelCeiling(racers, subjects, frameSize, preLevel, ts) {
    if (!(preLevel > 0)) {
      this._levelHeld = null;
      this._levelEaseFrom = null;
      this._levelEaseTarget = null;
      this._levelSet = 0;
      return Infinity;
    }
    // ── THE WINDOW CLOSING IS NOT A REASON TO DROP THE WIDTH (RUNIN-EASED-ADMIT-1) ─────────────
    //
    // This used to reset and return Infinity the moment the run-in stopped composing, which is the
    // crossing. Measured on mountainstreet seed 32, that took `guaranteed` from 1.3139 to 4.0 in one
    // frame — a factor of 3.05, and the largest single step this term ever produced. The rule's
    // WINDOW ending is a fact about the rule; the PICTURE's width is not allowed to be discontinuous
    // because of it. So the ceiling now leaves the only way it is allowed to: by easing to the shot
    // that would have been and disengaging when it gets there.
    //
    // IT THEREFORE OUTLIVES `_runInComposingNow` BY AT MOST `runInOpenMs`, and that is a deliberate
    // change to what "the run-in hands back at the line" means. It hands back over a window instead
    // of on a frame. The shot it hands back TO is unchanged — `preLevel` is the state's own — so
    // what moved is when the picture arrives there, not where.
    if (!this._runInComposingNow || !subjects?.point) {
      this._levelSet = 0;
      if (this._levelHeld === null) return Infinity;
      return this._levelEaseTo(preLevel, preLevel, ts);
    }
    const set = this._levelContenders(racers);
    this._levelSet = set.length;
    // ── NOBODY LEVEL MEANS NOTHING TO GUARANTEE, AND THAT IS THE RULE WORKING ─────────────────
    //
    // The set always holds the leader, so fewer than two members means nobody is within a racer
    // length of him. His rule then says nothing about the width and today's shot stands — it is not
    // a gap to be filled with a default. Without this the leader's own PADDING would still constrain
    // (he sits on the anchor, so only his body's half-width is left to fit) and the term would
    // quietly widen races with nobody in contention at all. Caught by a test that asserted exactly
    // that and failed.
    //
    // IT DOES NOT SHORT-CIRCUIT, and that was a bug the churn test caught. Returning Infinity here
    // THREW AWAY the release state, so a racer hovering at the boundary snapped the guarantee off and
    // on and the ease never ran at all — the single worst frame-to-frame move was as large as with no
    // ease whatsoever. An empty set is not "no guarantee", it is "release toward the shot that would
    // otherwise be", and the code below already knows how to do that.
    const at = this._anchorScreen(frameSize.width, frameSize.height, subjects.t);
    const raw =
      set.length >= 2
        ? contenderGuarantee(
            set,
            this._proj.axisX,
            this._proj.axisY,
            frameSize.width,
            frameSize.height,
            this._innerFramePct ?? DEFAULT_INNER_FRAME_PCT,
            this._drawnBodyWidthRefPx,
            subjects.point,
            at
          )
        : Infinity;
    // Never more constraining than the rule asks, never tighter than the shot would have been.
    const target = Math.min(Number.isFinite(raw) ? raw : Infinity, preLevel);
    // Never fired, and nothing to fire for: the ordinary case, and it must cost exactly nothing.
    if (this._levelHeld === null && !(target < preLevel)) return Infinity;
    return this._levelEaseTo(target, preLevel, ts);
  },

  /**
   * RUNIN-EASED-ADMIT-1 — THE LEVEL CEILING'S ONE CONTINUITY RULE.
   *
   * ── THE CAUSE THIS REPLACES, and it was NOT the one-sided admit alone ──────────────────────────
   *
   * What stood here eased in ONE direction and, where it did ease, did not smooth anything. Three
   * boundaries, three ways the width could jump, all of them the same underlying fault: **the value
   * was allowed to be discontinuous.**
   *
   *   1. THE ADMIT SNAPPED. `target <= _levelHeld` assigned `target` outright, so a new member moved
   *      the width by his full demand in one frame. That is the asymmetry the owner named.
   *
   *   2. THE EASE RE-PROJECTED TARGET CHANGES INSTEAD OF ABSORBING THEM, and this was the bigger of
   *      the two. It anchored `_levelRiseFrom` ONCE and then interpolated toward a LIVE target with
   *      a RUNNING clock, so when the target moved mid-ease the already-elapsed fraction `e` was
   *      applied immediately to the new, larger ratio. The output jumped by `(newTarget/oldTarget)^e`
   *      in a single frame. Measured on river-run seed 18: the ceiling went 1.3703 -> 2.4251, a
   *      factor of 1.77, on the frame the set dropped 2 -> 1 — **while the ease was already running**
   *      — and `1.34 x (3.9868/1.34)^0.544` reproduces 2.4251 exactly. A smoother that passes a step
   *      through, scaled by how far it happens to have travelled, is not a smoother.
   *
   *   3. THE EXIT DROPPED THE CEILING. Both exits — the set emptying and `_runInComposingNow` going
   *      false at the crossing — returned `Infinity` and cleared the state, so the width returned to
   *      the state's own shot in one frame. Measured on mountainstreet seed 32: `guaranteed`
   *      1.3139 -> 4.0, a factor of 3.05, at the crossing.
   *
   * ── WHY THIS IS THE CAUSE AND NOT A BRIDGE OVER IT ────────────────────────────────────────────
   *
   * `preLevel` is smooth across every one of those frames — 3.945 -> 3.999 on seed 18 while the
   * ceiling jumped 1.77x. So the picture's discontinuity was never the demand's own: it was this
   * term failing to be a continuous function of it. **The repair is to give the quantity the
   * contract it was missing**, not to hide the step behind a filter: the ceiling moves from WHERE IT
   * IS to WHEREVER THE TARGET IS, always, in both directions, and it leaves by arriving rather than
   * by vanishing. After it the value is continuous; there is nothing left to disguise.
   *
   * ── THE RULE, in one sentence ─────────────────────────────────────────────────────────────────
   *
   * Re-anchor whenever the target moves — start from the value currently held, restart the clock —
   * and ease in log space on the same smoothstep over the same `runInOpenMs` the release already
   * used. No new key, no new constant, no second smoother; the old release is this function's
   * `target > held` case and behaves as it always meant to.
   *
   * @returns {number} the ceiling this frame, or Infinity once it has arrived and handed back.
   */
  _levelEaseTo(target, preLevel, ts) {
    const dur = this._runInOpenMs;
    // Engage at the shot that would have been, so the width GROWS onto the new member from where
    // the picture already is. Starting at `target` is what made the admit a step.
    if (this._levelHeld === null) {
      this._levelHeld = preLevel;
      this._levelEaseFrom = null;
      this._levelEaseTarget = null;
    }
    if (!(dur > 0)) {
      // No duration configured is the one case where a step is the honest answer: there is no
      // window to move over, and pretending otherwise would invent one.
      this._levelHeld = target;
      this._levelEaseFrom = null;
      this._levelEaseTarget = null;
    } else {
      // THE RE-ANCHOR. A target that has moved starts a fresh ease from the value on screen right
      // now, which is what makes the first frame after any change cost ZERO — `e` is 0 there by
      // construction. Without this the elapsed fraction is applied to the new ratio, which is
      // defect 2 above.
      const moved =
        this._levelEaseTarget === null || Math.abs(Math.log(target / this._levelEaseTarget)) > 1e-9;
      if (moved) {
        this._levelEaseFrom = this._levelHeld;
        this._levelEaseAt = ts;
        this._levelEaseTarget = target;
      }
      const k = Math.min(1, Math.max(0, (ts - this._levelEaseAt) / dur));
      const e = k * k * (3 - 2 * k);
      this._levelHeld = this._levelEaseFrom * Math.pow(target / this._levelEaseFrom, e);
    }
    // Arrived: the term is exactly non-binding, so it hands back and stops existing rather than
    // sitting at the delivered width pretending to hold it. It now leaves by ARRIVING here, which
    // is the only way out — the two exits that used to drop it are gone.
    // BOTH CONDITIONS, and the second one is load-bearing. Arriving is not enough: on the frame the
    // ease ENGAGES it starts at `preLevel` by construction (that is what makes the admit cost zero
    // on its first frame), so a check on the value alone fires immediately and the term is inert
    // forever. It leaves only when it has arrived AND nothing is still asking it to be wider.
    if (this._levelHeld >= preLevel - 1e-12 && target >= preLevel - 1e-12) {
      this._levelHeld = null;
      this._levelEaseFrom = null;
      this._levelEaseTarget = null;
      return Infinity;
    }
    return this._levelHeld;
  },

  /**
   * THE GEOMETRIC LOOP ON ITS OWN — the racers who are actually level with the leader on a free
   * lane, with NO fallback and no floor. May be one racer, and that is a real answer.
   *
   * WHY IT IS SPLIT OUT (ITEM7-MEMBERSHIP-1). `_abreastContenders` ends by falling back to the top
   * two when fewer than two survive, and that fallback is a FRAMING device: it exists so the photo
   * finish has somebody to hold. It says nothing about who can still win. The viewer sheet's item 7
   * — "everyone still in with a chance is in frame" — was reading the fallback as if it did, and so
   * required a racer in shot on the strength of a rule that was only ever about composition.
   *
   * THE LOOP IS NOT DUPLICATED. `_abreastContenders` calls this and then applies its own guards and
   * its fallback, so there is exactly one copy of the level test and the lane test.
   *
   * NO CALLER IN THE CAMERA USES THIS. It is read by the probe payload, beside the director's other
   * fields, and it changes no framing decision.
   *
   * @param {object[]} ordered racers sorted by `t`, leader first
   * @returns {object[]} the survivors, leader first; possibly just the leader
   */
  _abreastSurvivors(ordered) {
    const tw = this._trackWidthPx;
    const leader = ordered[0];
    if (!leader) return [];
    const pathLen = leader.pathLengthPx ?? 0;
    const out = [];
    for (const r of ordered) {
      // ── CONDITION 1: NEARLY LEVEL WITH THE LEADER ─────────────────────────────────────────
      // A racer well behind the leader is not fighting for the win however clear his lane is, and
      // MEASURED, the lane test alone reaches up to 18.2 body lengths back (dirt-oval seed 9) —
      // which is what was forcing the shot open. `contactLength` is pairContact's own along-track
      // touch distance, `halfLengthA + halfLengthB`, i.e. exactly one body length between two equal
      // racers. Not a new number and not a lap fraction.
      if (r !== leader) {
        const gapPx = shortestArcDeltaT(leader.t, r.t) * pathLen;
        const contactLength = this.constructor.contactLengthBetween(leader, r);
        // `pathLen > 0` is tested HERE rather than relied on from the caller: `_abreastContenders`
        // still refuses a geometry-less field before it ever gets here, but this function is also
        // called directly and must not admit the whole grid on a zero gap.
        if (!(pathLen > 0) || !(contactLength > 0) || gapPx > contactLength) continue;
      }
      // ── CONDITION 2: ON A FREE LANE ───────────────────────────────────────────────────────
      // Blocked by somebody ahead across the track means he would have to move aside AND then still
      // overtake, and the photo finish is far too short for both. `contactWidth` is pairContact's
      // across-track touch distance; the physicalY unit is rowLayout's, one unit = trackWidth/2.
      let blocked = false;
      for (const ahead of out) {
        const lateralPx = (Math.abs((r.physicalY ?? 0) - (ahead.physicalY ?? 0)) * tw) / 2;
        const contactWidth = ((r.drawnBodyWidthPx ?? 0) + (ahead.drawnBodyWidthPx ?? 0)) / 2;
        if (contactWidth > 0 && lateralPx < contactWidth) {
          blocked = true;
          break;
        }
      }
      if (!blocked) out.push(r);
    }
    return out;
  },

  /**
   * THE SET THE FRAMING USES — the survivors, or the top two when fewer than two survive.
   *
   * UNCHANGED IN BEHAVIOUR by ITEM7-MEMBERSHIP-1: the same two guards, the same loop (now in
   * `_abreastSurvivors`), the same fallback. What changed is that the loop's own answer is now
   * readable without it, so a caller asking "who can still win" and a caller asking "who does the
   * shot hold" no longer get the same array.
   */
  _abreastContenders(ordered) {
    const tw = this._trackWidthPx;
    const leader = ordered[0];
    if (!(tw > 0) || !leader) return ordered.slice(0, 2);
    // ── THE RULE IS GEOMETRIC, SO WITHOUT GEOMETRY IT CANNOT BE APPLIED ───────────────────────
    //
    // BOTH conditions in the loop are built from quantities the RACE puts on a racer —
    // `pathLengthPx`, `drawnBodyLengthPx`, `drawnBodyWidthPx`. A caller that supplies none of them
    // (a director test driving bare `{t, x, y, index}` shapes, `camera-replay`'s marker fields)
    // would silently pass EVERY racer through both tests and frame the whole field.
    //
    // THAT IS NOT HYPOTHETICAL AND IT WAS NOT CAUGHT BY MEASUREMENT. Five FINISH-PAIR-1 tests went
    // red because their fixture's third racer — sitting at t = 0.6 against a leader at 0.98, THIRTY-
    // EIGHT PER CENT OF A LAP BACK — was being admitted as a contender. He is not one by any
    // reading; the level condition had simply evaporated with `pathLengthPx` absent. The tests were
    // right and this guard is the repair. Real races carry all three fields on every racer.
    const pathLen = leader.pathLengthPx ?? 0;
    const hasGeometry =
      pathLen > 0 && (leader.drawnBodyLengthPx ?? 0) > 0 && (leader.drawnBodyWidthPx ?? 0) > 0;
    if (!hasGeometry) return ordered.slice(0, 2);
    const out = this._abreastSurvivors(ordered);
    // Fewer than two survivors means nobody is contesting the line with the leader — and a field
    // with no geometry at all (a harness racer carries no physicalY) lands here too. Fall back to
    // the pair, which is master's behaviour, rather than framing one racer or the whole grid.
    //
    // ★ THIS IS A FRAMING DEVICE AND NOT A VERDICT ON WHO CAN WIN. Read `_abreastSurvivors` if the
    // question is the second one; ITEM7-MEMBERSHIP-1 exists because item 7 was reading this.
    return out.length >= 2 ? out : ordered.slice(0, 2);
  },
};
