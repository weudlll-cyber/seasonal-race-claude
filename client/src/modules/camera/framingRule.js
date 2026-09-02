// ============================================================
// File:        framingRule.js
// Path:        client/src/modules/camera/framingRule.js
// Project:     RaceArena
// Created:     2026-08-02
// Description: THE framing rule (CAMERA-FRAMING-1) — the second half of the owner's camera design.
//
//              His governing sentence: ONE framing rule for every state. The state only says WHO the
//              camera is on; the zoom factor (track widths, shipped) says how far in. So a state is
//              described by THREE things and only three:
//
//                ANCHOR      who the camera is on
//                GUARANTEE   who must stay in frame no matter what — the zoom WIDENS to honour it
//                ZOOM        already a per-state setting in track widths; this file never changes it
//
//              FRAME POSITION IS NOT A FOURTH SETTING, and must not become a slider. It follows from
//              one question: is there anything worth seeing AHEAD of the subject? If yes the subject
//              is centred; if no it sits forward of centre so the frame carries the action behind.
//              Each state answers that question once, here, in the table below — that is one rule
//              with six answers, not six special cases.
//
//              THE GUARANTEE, in the owner's refined words: everyone who matters right now stays in
//              frame. "The full track width" was his conservative proxy for that. Where the subject
//              is the field or a lone leader, the corridor IS who matters. Where the subject is a
//              PAIR — a battle, a photo finish — who matters is those two, and the camera may go far
//              tighter than one track width without breaking his rule. That is how settings below 1
//              become honest rather than dangerous.
//
//              A GUARANTEE WIDENS. IT NEVER STEERS (Lesson 192). Everything here returns a zoom
//              CEILING to be combined with Math.min. Nothing in this file moves a centre, picks a
//              subject, or reads a clock.
//
//              ORIENTATION-AWARE, which is the point of doing it here. A track's heading on screen
//              rotates — on an oval "across the track" is horizontal at the top and vertical at the
//              ends. A guarantee that ignores this must assume the worst orientation everywhere and
//              over-widens for most of the lap. These functions take the actual heading, so the
//              guarantee binds exactly when it must and not a frame earlier.
//
//              Pure: no state, no config reads, no clock. Its only import is the frame chord.
// ============================================================

import { frameExtentAlong, roomFromPointAlong } from './frameGeometry.js';
// frameExtentAlong is still the right measure for anchorScreenPoint (a fraction ALONG the frame's
// own chord) and for pairGuarantee (a span between two things that must both be in frame). Only the
// corridor changed, because only the corridor is measured OUTWARD from the anchor to each side.

/** Where the subject sits in frame, and why. */
export const POSITION = {
  /** Something worth seeing lies ahead — centre the subject. */
  CENTRED: 'centred',
  /** Nothing worth seeing ahead — push the subject forward so the frame carries what is behind. */
  FORWARD: 'forward',
};

/**
 * What must stay in frame. TWO KINDS, and the difference matters enough to name:
 *
 *   GEOMETRIC — "do not crop what matters". CORRIDOR and PAIR. They protect named subjects whose
 *               positions are known, and they are satisfied or not by pure geometry.
 *   DRAMATURGICAL — "do not show emptiness". COMPANY. It protects the SHOT rather than a subject:
 *               a leader alone in frame, with no reference and no tension, is a correct picture of
 *               nothing. The owner's words for the failure it prevents: *"das ist nicht spannend"*.
 *
 * A reader must be able to tell them apart, because they answer different questions and will
 * eventually be tuned against each other. They are deliberately NOT folded together.
 */
export const GUARANTEE = {
  /** GEOMETRIC: the full track corridor, measured perpendicular to the heading. */
  CORRIDOR: 'corridor',
  /** GEOMETRIC: two named contenders, measured along the line between them. */
  PAIR: 'pair',
  /** DRAMATURGICAL: enough of the field in frame that the shot has tension. See companyGuarantee. */
  COMPANY: 'company',
  /**
   * GEOMETRIC: EVERY racer, not a corridor and not a chosen pair. See `fieldGuarantee`.
   *
   * It exists for the start ceremony (START-CEREMONY-CAMERA-1), where the subject is the formation
   * itself and "who matters" is literally everyone. During the race no state guarantees the FIELD —
   * that would be a promise the camera cannot keep once the pack is a lap long — so it appears in
   * no row of the table below. It is a guarantee rather than a bespoke fitting because it is the
   * same promise in the same words: it returns a CEILING, so it widens and never steers.
   */
  FIELD: 'field',
};

/**
 * THE TABLE. Six states, three columns, one answer each to the position question.
 *
 * `aheadMatters` is the question itself, kept next to the answer so the two cannot drift apart:
 * it is the reason `position` is what it is, in the owner's terms.
 */
export const FRAMING_BY_STATE = {
  LEADER_ZOOM: {
    anchor: 'leader',
    guarantee: GUARANTEE.CORRIDOR,
    position: POSITION.FORWARD,
    aheadMatters: false, // nobody is ahead of the leader — the race is behind him
  },
  LEAD_CHANGE: {
    anchor: 'new-leader',
    guarantee: GUARANTEE.PAIR, // the new leader AND the racer he just passed
    position: POSITION.FORWARD,
    aheadMatters: false, // the story is the overtaken racer, and he is behind
  },
  BATTLE_ZOOM: {
    anchor: 'pair-midpoint',
    guarantee: GUARANTEE.PAIR,
    position: POSITION.CENTRED,
    aheadMatters: true, // a contender is ahead of the midpoint by construction
  },
  COMEBACK_ZOOM: {
    anchor: 'comebacker',
    guarantee: GUARANTEE.CORRIDOR,
    position: POSITION.CENTRED,
    aheadMatters: true, // he is coming through the field — the racers he is catching are ahead
  },
  OVERVIEW: {
    anchor: 'leader',
    guarantee: GUARANTEE.CORRIDOR,
    position: POSITION.FORWARD,
    aheadMatters: false, // same shot as LEADER at the widest setting; the field is behind
  },
  PHOTO_FINISH: {
    anchor: 'pair-midpoint',
    guarantee: GUARANTEE.PAIR,
    position: POSITION.CENTRED,
    aheadMatters: true, // both contenders matter equally; neither is "the one ahead"
  },
};

/** The framing description for a state; LEADER's is the fallback for anything unlisted. */
export function framingFor(state) {
  return FRAMING_BY_STATE[state] ?? FRAMING_BY_STATE.LEADER_ZOOM;
}

/**
 * THE ONE GUARANTEE COMPUTATION.
 *
 * Given a world-space vector that MUST fit inside the frame, return the tightest cam.zoom that
 * still fits it. Both guarantees are this function; they differ only in which vector they hand it.
 *
 * The algebra, so the next reader does not have to re-derive it: at cam.zoom `z` a world vector
 * `v` maps to the screen vector `z · (v.x·axisX, v.y·axisY)`. Its length is `z · |v ⊙ axis|`, and
 * the frame reaches `frameExtentAlong(v ⊙ axis)` in that direction — a quantity that depends on the
 * DIRECTION only, never on `z`. Requiring the vector to fit inside the inner frame gives
 *
 *     z · |v ⊙ axis| ≤ inner · frameExtentAlong(v ⊙ axis)
 *
 * which solves directly for the ceiling below. Because `frameExtentAlong` is the rectangle's true
 * chord, this is exact on every heading rather than only on the axes.
 *
 * @param {{x:number,y:number}} worldVec  the world-space extent that must fit (full length, not half)
 * @param {number} axisX  projection world→screen scale on X at cam.zoom = 1
 * @param {number} axisY  projection world→screen scale on Y at cam.zoom = 1
 * @param {number} frameW
 * @param {number} frameH
 * @param {number} [innerFramePct=1]  fit inside this fraction of the frame (safe region)
 * @returns {number} the tightest cam.zoom that honours it; Infinity when nothing constrains
 */
export function zoomCeilingToFit(worldVec, axisX, axisY, frameW, frameH, innerFramePct = 1) {
  if (!worldVec) return Infinity;
  const sx = worldVec.x * axisX;
  const sy = worldVec.y * axisY;
  const needed = Math.hypot(sx, sy);
  if (!(needed > 0)) return Infinity; // a zero-length extent constrains nothing
  const available = frameExtentAlong(sx, sy, frameW, frameH) * clamp01(innerFramePct);
  if (!(available > 0)) return Infinity;
  return available / needed;
}

/**
 * GUARANTEE 1 — the corridor. The full track width must be visible, measured PERPENDICULAR to the
 * heading, because that is the direction two racers side by side are separated in.
 *
 * Orientation-aware by construction: the perpendicular rotates with the track, so on the straights
 * of an oval this asks for vertical room and at the ends it asks for horizontal room, and it never
 * asks for both at once the way an axis-blind bound must.
 *
 * MEASURED FROM THE ANCHOR, NOT FROM THE CENTRE — CAMERA-ANCHOR-TRUTH-1. This used to divide by
 * `frameExtentAlong`, the frame's chord THROUGH ITS CENTRE, which is only the room available when
 * the anchor happens to be centred. A FORWARD-framed anchor (LEADER and OVERVIEW at
 * `leaderForwardFrac`) is not, and the corridor runs half a track width to EACH side of where the
 * anchor actually sits — so the binding side is whichever has less room, not the average the chord
 * implies. Measured before the fix, the old form broke its own promise on 69.0% of corridor frames
 * and on 100% of Mountainstreet's, delivering a median 0.781 corridors where it promised 1.
 *
 * The two halves are honoured SEPARATELY and the tighter one wins, because a corridor that fits on
 * one side and is cropped on the other is still cropped. When the anchor IS centred the two rooms
 * are equal and each is exactly half the chord, so this reduces to the old expression identically —
 * asserted by a test, and the cheapest possible proof that nothing else changed.
 *
 * Still a CEILING and still WIDEN-ONLY (Lesson 192): measuring the real room can only return a
 * smaller ceiling than the centre chord did, and a smaller ceiling means a wider shot.
 *
 * @param {{x:number,y:number}} headingWorld  the track tangent at the anchor (any length)
 * @param {number} trackWidthPx  corridor width in world px
 * @param {{x:number,y:number}|null} [anchorAt=null]  the anchor's SCREEN position; frame centre when null
 * @returns {number} cam.zoom ceiling
 */
export function corridorGuarantee(
  headingWorld,
  trackWidthPx,
  axisX,
  axisY,
  frameW,
  frameH,
  innerFramePct = 1,
  anchorAt = null
) {
  if (!(trackWidthPx > 0)) return Infinity;
  const perp = perpendicularOf(headingWorld);
  if (!perp) {
    // No heading available: fall back to the worst orientation, which is what a heading-blind
    // guarantee would have to assume everywhere. Conservative, never wrong, just wider.
    return Math.min(
      halfCorridorCeiling(
        { x: 1, y: 0 },
        trackWidthPx,
        axisX,
        axisY,
        frameW,
        frameH,
        innerFramePct,
        anchorAt
      ),
      halfCorridorCeiling(
        { x: 0, y: 1 },
        trackWidthPx,
        axisX,
        axisY,
        frameW,
        frameH,
        innerFramePct,
        anchorAt
      )
    );
  }
  return halfCorridorCeiling(
    perp,
    trackWidthPx,
    axisX,
    axisY,
    frameW,
    frameH,
    innerFramePct,
    anchorAt
  );
}

/**
 * ONE SUBJECT, MEASURED FROM THE ANCHOR — the PRESENCE computation (RUNIN-LEVEL-SET-BUILD-1).
 *
 * THIS IS `halfCorridorCeiling` WITH A DIFFERENT VECTOR, and that is the whole claim. Both ask the
 * same question of the same helper in the same shape:
 *
 *   halfCorridorCeiling   direction = the corridor perpendicular   extent = half a track width
 *   presenceCeilingFrom   direction = anchor -> this subject       extent = his own displacement
 *
 * and both then divide `roomFromPointAlong(at, direction)` by the screen length that extent needs,
 * and both SKIP a side whose room is 0 rather than returning a ceiling of 0 — the decision
 * `halfCorridorCeiling` and `companyGuarantee` already make, for the reason stated there: the anchor
 * is outside the safe region on that side, no zoom repairs it, and collapsing the shot is worse.
 *
 * WHY IT IS NEEDED AT ALL. `pairGuarantee` below fits the vector BETWEEN two subjects, so it
 * guarantees their SPAN. A span is not a presence: two racers running wide TOGETHER have a small
 * span and sit far from where the camera looks, so the span is satisfied while both are off screen.
 * Measured over 1,260 races (RUNIN-LEVEL-SET-1), the span reading removes 11 of 126 races in which
 * the winner is off frame at the line and this one removes 93. `lateralShiftToFit` at the foot of
 * this file already named the symptom: *"no shift fits everyone, which means the ZOOM guarantee
 * should have widened and did not."*
 *
 * @param {{x:number,y:number}} pt  the subject, in world coordinates
 * @param {{x:number,y:number}} anchorWorld  the world point the framing is built around
 * @param {{x:number,y:number}} anchorAt  where that point sits IN FRAME, in screen px
 * @param {number} padding  world px added to the displacement, so a body fits and not a centre point
 * @returns {number} cam.zoom ceiling; Infinity when the subject constrains nothing
 */
function presenceCeilingFrom(
  pt,
  anchorWorld,
  anchorAt,
  axisX,
  axisY,
  frameW,
  frameH,
  innerFramePct,
  padding
) {
  const dx = pt.x - anchorWorld.x;
  const dy = pt.y - anchorWorld.y;
  const world = Math.hypot(dx, dy);
  const pad = padding > 0 ? padding : 0;
  // Sitting on the anchor: only the padding constrains, and it does so in every direction, so the
  // worst orientation is the honest answer — the same case `pairGuarantee` handles for co-located
  // contenders, resolved the same way.
  if (!(world > 0)) {
    if (!(pad > 0)) return Infinity;
    const axis = (ux, uy) => {
      const vx = ux * pad * axisX;
      const vy = uy * pad * axisY;
      const need = Math.hypot(vx, vy);
      if (!(need > 0)) return Infinity;
      const room = roomFromPointAlong(
        anchorAt.x,
        anchorAt.y,
        vx,
        vy,
        frameW,
        frameH,
        clamp01(innerFramePct)
      );
      return room > 0 ? room / need : Infinity;
    };
    return Math.min(axis(1, 0), axis(0, 1), axis(-1, 0), axis(0, -1));
  }
  // THE EXTENT IS THE DISPLACEMENT PLUS THE PADDING, along the displacement's own direction — the
  // identical construction `pairGuarantee` uses on the separation, with the same units.
  const total = world + pad;
  const vx = (dx / world) * total * axisX;
  const vy = (dy / world) * total * axisY;
  const needed = Math.hypot(vx, vy);
  if (!(needed > 0)) return Infinity;
  const room = roomFromPointAlong(
    anchorAt.x,
    anchorAt.y,
    vx,
    vy,
    frameW,
    frameH,
    clamp01(innerFramePct)
  );
  if (!(room > 0)) return Infinity;
  return room / needed;
}

/**
 * Half a corridor to each side of the anchor along `perp`, each against the room that direction
 * actually has. Split out so the no-heading fallback runs the identical rule on both axes.
 */
function halfCorridorCeiling(
  perp,
  trackWidthPx,
  axisX,
  axisY,
  frameW,
  frameH,
  innerFramePct,
  anchorAt
) {
  const sx = perp.x * axisX;
  const sy = perp.y * axisY;
  const neededHalf = Math.hypot(sx, sy) * (trackWidthPx / 2);
  if (!(neededHalf > 0)) return Infinity;
  const at = anchorAt ?? { x: frameW / 2, y: frameH / 2 };
  const pct = clamp01(innerFramePct);
  const rooms = [
    roomFromPointAlong(at.x, at.y, sx, sy, frameW, frameH, pct),
    roomFromPointAlong(at.x, at.y, -sx, -sy, frameW, frameH, pct),
  ].filter((r) => r > 0);
  // Room 0 means the anchor is already outside the safe region on that side. No zoom repairs that,
  // and returning a ceiling of 0 would collapse the shot — so that side is skipped, the same
  // decision companyGuarantee makes for the same reason. Both sides zero: nothing to constrain.
  if (rooms.length === 0) return Infinity;
  return Math.min(...rooms) / neededHalf;
}

/**
 * GUARANTEE 2 — the pair. Two named contenders must both be in frame, measured along the line
 * between them. This is what lets BATTLE and PHOTO_FINISH honour "everyone who matters stays in
 * frame" while going TIGHTER than one corridor: when the two are nose to tail, who matters is
 * separated by a few body lengths, not by a track width.
 *
 * `padding` widens the required extent so the pair is not framed exactly at the edge — pass the
 * drawn body size so a racer's whole sprite fits, not just its centre point.
 *
 * @param {{x:number,y:number}|null} a
 * @param {{x:number,y:number}|null} b
 * @param {number} [padding=0]  world px added to the separation (e.g. one drawn body width)
 * @returns {number} cam.zoom ceiling; Infinity when fewer than two contenders exist
 */
/**
 * GUARANTEE 2b — THE CONTENDERS, however many there are (CONTENDER-ZOOM-1).
 *
 * The owner's corrected rule: in a photo finish ALL of its participants must be visible, WHOLE. Two
 * contenders means the shot may close in far; three abreast means less far. **The contenders decide
 * how tight it gets**, and the corridor is only the ceiling above them.
 *
 * IT IS `pairGuarantee` OVER EVERY PAIR, minimum wins. Every contender must fit with every other, so
 * the binding constraint is the widest separation in the set — and asking the existing pair rule
 * about each pair reuses its orientation handling, its padding and its co-located case instead of
 * restating any of them.
 *
 * **AT n = 2 IT IS `pairGuarantee`, EXACTLY** — one pair, one call, the same arguments. That is what
 * makes this block's off arm byte-identical rather than approximately so, and it is why the shipped
 * picture cannot move until the contender SET grows beyond two. Today it never does: see
 * `_photoFinishContenders`, which is captured as `slice(0, 2)`.
 *
 * WHY NOT A BOUNDING BOX: an axis-aligned box assumes the worst orientation, which is precisely what
 * `pairGuarantee` was written to stop doing — two racers side by side across a diagonal corridor need
 * far less zoom-out than their bounding box implies. The cost is O(n^2) over a handful of points.
 *
 * ── THE ANCHORED ARM (RUNIN-LEVEL-SET-BUILD-1), and it is OFF unless an anchor is passed ────────
 *
 * With `anchorWorld`/`anchorAt` supplied this stops asking about SPANS and asks about PRESENCE:
 * every subject measured against the room the frame actually has from where the anchor sits, via
 * `presenceCeilingFrom`. **A span is not a presence**, and the difference is not academic — see that
 * function's header for the 11-versus-93 measurement.
 *
 * TWO CONSEQUENCES WORTH NAMING. It needs only ONE subject to constrain, not two, because a lone
 * racer can be off frame while a lone span cannot exist; and it is O(n) rather than O(n^2), because
 * each subject is measured against the anchor instead of against every other subject.
 *
 * **DEFAULT `null` MEANS TODAY'S BEHAVIOUR, EXACTLY.** Every existing caller passes no anchor and
 * runs the unchanged pairwise span code below, so nothing outside the run-in moves a pixel.
 *
 * @param {Array<{x:number,y:number}|null>} pts  the contenders
 * @param {{x:number,y:number}|null} [anchorWorld=null]  the world point the framing is built around
 * @param {{x:number,y:number}|null} [anchorAt=null]  where that point sits in frame, in screen px
 * @returns {number} cam.zoom ceiling; Infinity when nothing constrains
 */
export function contenderGuarantee(
  pts,
  axisX,
  axisY,
  frameW,
  frameH,
  innerFramePct = 1,
  padding = 0,
  anchorWorld = null,
  anchorAt = null
) {
  const live = (pts ?? []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (anchorWorld && anchorAt) {
    if (live.length < 1) return Infinity;
    let ceil = Infinity;
    for (const p of live) {
      const c = presenceCeilingFrom(
        p,
        anchorWorld,
        anchorAt,
        axisX,
        axisY,
        frameW,
        frameH,
        innerFramePct,
        padding
      );
      if (c < ceil) ceil = c;
    }
    return ceil;
  }
  if (live.length < 2) return Infinity;
  let ceiling = Infinity;
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const c = pairGuarantee(
        live[i],
        live[j],
        axisX,
        axisY,
        frameW,
        frameH,
        innerFramePct,
        padding
      );
      if (c < ceiling) ceiling = c;
    }
  }
  return ceiling;
}

export function pairGuarantee(
  a,
  b,
  axisX,
  axisY,
  frameW,
  frameH,
  innerFramePct = 1,
  padding = 0,
  anchorWorld = null,
  anchorAt = null
) {
  if (!a || !b) return Infinity;
  // THE ANCHORED ARM — see `contenderGuarantee`'s header. Two subjects, each measured for PRESENCE
  // from the anchor rather than against each other's SPAN. `null` is today's behaviour, exactly.
  if (anchorWorld && anchorAt) {
    return Math.min(
      presenceCeilingFrom(
        a,
        anchorWorld,
        anchorAt,
        axisX,
        axisY,
        frameW,
        frameH,
        innerFramePct,
        padding
      ),
      presenceCeilingFrom(
        b,
        anchorWorld,
        anchorAt,
        axisX,
        axisY,
        frameW,
        frameH,
        innerFramePct,
        padding
      )
    );
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (!(len > 0)) {
    // Exactly co-located: only the padding constrains, and it does so in every direction, so the
    // worst orientation is the honest answer.
    if (!(padding > 0)) return Infinity;
    return Math.min(
      zoomCeilingToFit({ x: padding, y: 0 }, axisX, axisY, frameW, frameH, innerFramePct),
      zoomCeilingToFit({ x: 0, y: padding }, axisX, axisY, frameW, frameH, innerFramePct)
    );
  }
  const total = len + Math.max(0, padding);
  return zoomCeilingToFit(
    { x: (dx / len) * total, y: (dy / len) * total },
    axisX,
    axisY,
    frameW,
    frameH,
    innerFramePct
  );
}

/**
 * THE COMPANION MARGIN — how much of the frame a guaranteed companion must be inside.
 *
 * CAMERA-COMPANY-2, and it is the owner's decision, not a derivation: **visible with a margin is
 * enough**. A guaranteed companion does NOT have to sit inside `innerFramePct`. The guarantee says
 * "do not show emptiness", and a racer near the frame edge is not emptiness. `innerFramePct` exists
 * so the SUBJECT does not cling to the edge — a different job, and it keeps doing it for the subject
 * and for both geometric guarantees. Only the company guarantee reads this instead.
 *
 * Why 0.9 and not a rounder 1.0: 5% of the frame on each side is half a drawn body at the largest a
 * body gets in these shots — measured across the owner's own race, the drawn body is 6.65% of the
 * frame height at the median and 9.50% at p95 and at maximum. Half of that worst case is 4.75%, so
 * 5% is the smallest round margin that never cuts a guaranteed racer at the edge. It is deliberately
 * NOT sized for the tracking lag as well: measured at the binding companion over the same race, the
 * live camera adds 0.00% extra overshoot past the edge (median, p95 and max alike), because the live
 * zoom trails a WIDENING target and is therefore never tighter than the shot the guarantee sized.
 *
 * Expressed as a fraction of the frame rather than in pixels, per the standing rule. Not a slider:
 * it is read off the sprite size, not chosen by taste, so if the sprite grows this gets re-measured
 * rather than tuned.
 */
export const COMPANY_FRAME_PCT = 0.9;

/**
 * WHERE THE ANCHOR SITS IN FRAME — the framing rule's own answer, in screen coordinates.
 *
 * The company guarantee has to know this before the camera moves, and it can: the position is a
 * FRACTION of the frame, so it is the same at every zoom. A centred subject is at the middle; a
 * forward-framed one is displaced along its heading by `(frac − 0.5)` of the frame's chord in that
 * direction — the same arithmetic `_applyLeaderForwardBias` performs on the pan target, stated once
 * here so the guarantee and the pan cannot disagree about where the subject will be.
 *
 * This is the INTENDED position. Where the world edge clamps the pan the subject lands elsewhere
 * (measured on the owner's frame: 0.601 along the motion axis instead of 0.66, because the leader was
 * within half a viewport of the world's right edge). That is the world-bounds clamp in
 * `_setTrackTargets`, a separate mechanism, and this deliberately does not model it.
 *
 * @param {number} frameW
 * @param {number} frameH
 * @param {number|null} forwardFrac  where along its heading the subject sits; null/0.5 = centred
 * @param {{x:number,y:number}|null} headingScreen  the subject's heading in SCREEN space
 * @returns {{x:number,y:number}} the anchor's screen position
 */
export function anchorScreenPoint(frameW, frameH, forwardFrac, headingScreen, roomFloorPx = 0) {
  const centre = { x: frameW / 2, y: frameH / 2 };
  if (forwardFrac == null || !headingScreen) return centre;
  const len = Math.hypot(headingScreen.x, headingScreen.y);
  if (!(len > 0)) return centre;
  const ux = headingScreen.x / len;
  const uy = headingScreen.y / len;
  const span = frameExtentAlong(ux, uy, frameW, frameH);
  const shift = (forwardFracForRoomFloor(forwardFrac, span, roomFloorPx) - 0.5) * span;
  return { x: centre.x + ux * shift, y: centre.y + uy * shift };
}

/**
 * AIM-ROOM-1 (LEVER B) — the forward fraction, reduced only as far as a ROOM FLOOR requires.
 *
 * THE PROBLEM IT ANSWERS. `forwardFrac` is a fraction of the frame's chord along the heading, so the
 * room it leaves ahead of the subject is `span × (1 − frac)`. The chord is not a constant: measured
 * at 770 px on space-sprint's steep heading against 1,313 on river-run's shallow one. **One constant
 * fraction therefore leaves the least room exactly where the frame is shortest**, which is where the
 * leader's nose runs out of picture.
 *
 * A floor on the ROOM, rather than a per-track fraction, is the shape that needs no table: it binds
 * where the chord is short and is inert where the chord is long, and it is expressed in the quantity
 * that actually matters — how much space is in front of the nose.
 *
 * TWO GUARDS, both deliberate:
 *   · **never behind centre.** The result is clamped at 0.5, so the floor can centre the subject but
 *     can never push him backwards into a shot nobody asked for.
 *   · **a run-in placement is left alone.** `_forwardFracNow` legitimately returns values BELOW 0.5
 *     during the run-in, where the frame carries the finish ahead of the leader on purpose. This
 *     only ever reduces a fraction, and it declines to touch one already under 0.5.
 *
 * SHARED BY THE AIM AND THE PAN, which is why it lives here beside `anchorScreenPoint` rather than in
 * the director: `_applyLeaderForwardBias` performs the same arithmetic on the pan target, and this
 * file's contract is that the guarantee and the pan cannot disagree about where the subject will sit.
 *
 * @param {number|null} forwardFrac  the configured fraction
 * @param {number} span              the frame's chord along the heading, in screen px
 * @param {number} roomFloorPx       0/absent = OFF, the shipped default
 * @returns {number|null} the fraction to use
 */
export function forwardFracForRoomFloor(forwardFrac, span, roomFloorPx = 0) {
  if (forwardFrac == null) return forwardFrac;
  if (!(roomFloorPx > 0) || !(span > 0)) return forwardFrac;
  if (!(forwardFrac > 0.5)) return forwardFrac; // a run-in placement is not this rule's business
  const capped = 1 - roomFloorPx / span;
  return Math.max(0.5, Math.min(forwardFrac, capped));
}

/**
 * THE DRAMATURGICAL GUARANTEE — "do not show emptiness".
 *
 * The owner zooms LEADER in tight ON PURPOSE, and wants the camera to catch him exactly when the
 * picture would go empty. This returns the tightest cam.zoom at which at least `minVisible` racers
 * (the anchor plus its nearest company) are still in frame. Like every guarantee here it is a
 * CEILING, applied with Math.min BEFORE the camera moves — the camera never zooms in and then backs
 * out. That in-then-out shape is pumping, a failure class this project has already paid for once.
 *
 * WHY IT IS SORTED BY CEILING, NOT BY DISTANCE. The old floor ranked racers by world distance and
 * then applied ONE axis scale to both axes — the third instance of the bsX/bsY defect, over-stating
 * screen Y by 18.5% on every closed track. Ranking by the zoom each racer would REQUIRE is both the
 * fix and the orientation-aware form: a racer directly above the anchor is cheaper or dearer to
 * include than one beside it, depending on the frame's shape in that direction, and this asks the
 * frame rather than assuming.
 *
 * WHERE THE ROOM IS MEASURED FROM — CAMERA-COMPANY-2. The corridor and pair vectors span between two
 * things that must BOTH be in frame, so they are compared against the whole chord. A company vector
 * runs FROM the anchor out to a companion, so what matters is the room between the anchor's own place
 * in the frame and the edge, IN THAT DIRECTION.
 *
 * This used to be one scalar `reach` — 0.5 centred, `leaderForwardFrac` forward — applied to every
 * direction alike. Measured against the truth on the owner's own frame it was over-generous
 * everywhere and by wildly different amounts: 0.601 dead behind, 0.591 behind-left, 0.482/0.518
 * beside, 0.399 dead ahead, all computed as 0.66. Over-generous means it permitted a shot TIGHTER
 * than the room allows, so it promised five racers and delivered four. `anchorAt` replaces the
 * scalar: give it where the anchor actually sits and the room is measured, not assumed.
 *
 * THE HEADCOUNT'S PREMISE IS ASKED, NOT ASSUMED (COMPANY-HEADCOUNT-1). `minVisible` counts RACERS.
 * Whether the anchor is one of them is a question about the anchor, and it is answered per call from
 * the anchor itself rather than stated anywhere: the anchor is one of them exactly when some live
 * racer stands on it. It did until CAMERA-LATERAL-1 moved the anchor to the track centreline, and a
 * comment asserting the old premise is what let a promise of five deliver four for as long as it
 * did. Nothing here asserts the premise now, so nothing here can go stale when the anchor moves
 * again — see the body.
 *
 * @param {{x:number,y:number}} anchor   the world point the shot is built around
 * @param {Array<{x:number,y:number,finished?:boolean}>} racers  the live field (the anchor may be in it)
 * @param {number} minVisible  how many RACERS must be in frame — counting the anchor only when a
 *   racer actually stands on it, which this decides for itself; <= 1 disables
 * @param {number} [framePct=COMPANY_FRAME_PCT]  the region a companion must be inside
 * @param {{x:number,y:number}|null} [anchorAt=null]  the anchor's SCREEN position; frame centre when null
 * @returns {number} cam.zoom ceiling; Infinity when nothing constrains
 */
export function companyGuarantee(
  anchor,
  racers,
  minVisible,
  axisX,
  axisY,
  frameW,
  frameH,
  framePct = COMPANY_FRAME_PCT,
  anchorAt = null
) {
  if (!anchor || !Array.isArray(racers)) return Infinity;
  // `<= 1 disables`, exactly as the contract above says and independently of everything below.
  if (!(Math.floor(minVisible) > 1)) return Infinity;
  const at = anchorAt ?? { x: frameW / 2, y: frameH / 2 };
  // ── IS THE ANCHOR ONE OF THE RACERS IT IS COUNTING? ASKED, NEVER ASSUMED (COMPANY-HEADCOUNT-1) ──
  //
  // This used to read `const need = Math.floor(minVisible) - 1; // the anchor itself is one of them`.
  // That sentence was TRUE when it was written: the anchor was the subject racer's own position.
  // CAMERA-LATERAL-1 then replaced it with the racing-line CENTRELINE point — correctly, so every
  // guarantee measures from the anchor the camera will actually use — and the leader stands in his
  // lane, not on the centreline. Measured afterwards: the anchor equals `_centrelineAt(t)` on 100%
  // of frames and coincides with NO racer on 100% of frames. So a promise of five asked for four
  // companions and delivered four racers, and the widening that would have shown the fifth was never
  // requested. See AIM-ROOM-LOST-1.
  //
  // WHY THIS SHAPE. The premise is now DERIVED, in the same pass and from the same inputs the
  // function already walks — the `dx === 0 && dy === 0` test that skips the anchor was always doing
  // the detection, its answer was simply thrown away. There is no second place that states the
  // premise: no parameter, no flag, and no comment asserting it. So there is nothing left that can
  // go stale. A future change that moves the anchor onto or off a racer is picked up on the very
  // next call, because the answer is recomputed from the anchor itself every time.
  //
  // A BOOLEAN PARAMETER WOULD HAVE REPRODUCED THE DEFECT ONE LEVEL UP: the caller would assert the
  // premise, an anchor change would move it, and the caller's assertion would still read true. That
  // is exactly what happened here — a true statement left standing while its premise moved beneath
  // it — so the fix must not create another statement to leave standing.
  //
  // THE DETECTION IS OVER THE SET THAT CAN SATISFY THE PROMISE. A finished racer is skipped before
  // the test, so an anchor sitting on one does not count as "the anchor is among them" — which is
  // right, because a finished racer cannot be one of the live racers the promise is about.
  //
  // EXACT EQUALITY IS THE RIGHT TEST and its failure mode is the safe one. Where the anchor is a
  // racer it is a COPY of that racer's coordinates, so equality holds exactly. An anchor that merely
  // converges near a racer reads as "not one of them", and the guarantee then asks for one MORE
  // racer than strictly needed — it over-delivers rather than under-delivers, which is the direction
  // a guarantee should fail in.
  let anchorIsRacer = false;
  const ceilings = [];
  for (const r of racers) {
    if (!r || r.finished) continue;
    const dx = r.x - anchor.x;
    const dy = r.y - anchor.y;
    if (dx === 0 && dy === 0) {
      anchorIsRacer = true; // and it is therefore one of the `minVisible`
      continue;
    }
    const sx = dx * axisX;
    const sy = dy * axisY;
    const needed = Math.hypot(sx, sy);
    if (!(needed > 0)) continue;
    const room = roomFromPointAlong(at.x, at.y, sx, sy, frameW, frameH, framePct);
    // Room 0 means the anchor is already outside the region in that direction — the framing itself
    // is broken there, and no zoom fixes it. Skipping keeps this from returning a ceiling of 0.
    if (!(room > 0)) continue;
    ceilings.push(room / needed);
  }
  if (ceilings.length === 0) return Infinity;
  // How many COMPANIONS the promise needs, now that whether the anchor is one of them is known
  // rather than assumed. Anchor among them → it supplies one of the `minVisible` and the rest are
  // companions. Anchor not among them (the centreline case) → all `minVisible` must be companions.
  const need = Math.floor(minVisible) - (anchorIsRacer ? 1 : 0);
  // Most permissive first: ceilings[0] is the nearest company, in the frame's own terms.
  ceilings.sort((a, b) => b - a);
  // Asking for more company than the field can supply must not zoom to a point: take what exists.
  return ceilings[Math.min(need, ceilings.length) - 1];
}

/**
 * GUARANTEE 5 — A FIXED WORLD POINT (RUNIN-STATE-1). The tightest cam.zoom at which `target` is
 * still inside the frame, given where the ANCHOR sits in it.
 *
 * TAKEN FROM `feat/finish-framed`, unchanged except for its name in the record. That branch is a
 * quarry, not a base: its zoom MECHANISM was retired (see DEAD-ENDS.md), but this function is pure
 * geometry and the reasoning below is its own, measured, and still true.
 *
 * WHY THIS IS NOT `pairGuarantee`. That one fits the SEPARATION between two things into the frame's
 * full chord, which is right only when the camera sits between them — as it does for BATTLE and the
 * photo finish, whose pan target is the pair's midpoint. The run-in's camera sits on the LEADER, so
 * the room toward the finish line is the distance from the leader's own place in the frame to the
 * edge, not the whole chord. Built with the pair form first and MEASURED: the finish line's
 * in-frame share went 41.4% -> 40.8% on Searound, i.e. nothing, because a fitted separation says
 * nothing about where either end lands. This is the company guarantee's shape — one target instead
 * of a headcount — and it is the honest one for "keep this point in shot".
 *
 * IT HAS NO FLOOR OF ITS OWN, deliberately. As the target recedes the ceiling falls without bound,
 * and "how wide is this camera ever allowed to open" is a question about the ZOOM SETTINGS, which
 * this file knows nothing about (see the header: it never changes a zoom factor). The bound is
 * applied by the caller, against a setting — `_guaranteeCeiling`'s LINE branch.
 *
 * @param {{x:number,y:number}|null} anchor  the world point the shot is built around
 * @param {{x:number,y:number}|null} target  the world point that must stay in frame
 * @param {number} axisX  projection world→screen scale on X at cam.zoom = 1
 * @param {number} axisY
 * @param {number} frameW
 * @param {number} frameH
 * @param {number} [framePct=COMPANY_FRAME_PCT]  the region the target must be inside
 * @param {{x:number,y:number}|null} [anchorAt=null]  the anchor's SCREEN position; centre when null
 * @returns {number} cam.zoom ceiling; Infinity when nothing constrains
 */
export function pointGuarantee(
  anchor,
  target,
  axisX,
  axisY,
  frameW,
  frameH,
  framePct = COMPANY_FRAME_PCT,
  anchorAt = null
) {
  if (!anchor || !target) return Infinity;
  const sx = (target.x - anchor.x) * axisX;
  const sy = (target.y - anchor.y) * axisY;
  const needed = Math.hypot(sx, sy);
  if (!(needed > 0)) return Infinity; // already on the anchor: nothing to keep in frame
  const at = anchorAt ?? { x: frameW / 2, y: frameH / 2 };
  const room = roomFromPointAlong(at.x, at.y, sx, sy, frameW, frameH, framePct);
  // Room 0 means the anchor is already outside the region in that direction; no zoom fixes that.
  if (!(room > 0)) return Infinity;
  return room / needed;
}

/**
 * LEADER-LATERAL-BUILD-1: THE ADMISSIBLE LATERAL SHIFTS THAT KEEP ONE DRAWN BODY WHOLE.
 *
 * `lateralShiftToFit` below answers the same question for a POINT, and for the corridor edges — the
 * subjects it was written for — a point is exact, because they sit at the anchor's own track
 * parameter and their room is the anchor's room. For the LEADER it is not, for two reasons that both
 * bite in the direction that matters:
 *
 *   1. He is displaced ALONG the track as well as across it, and the frame is a rectangle. The room
 *      he has sideways depends on how far forward he is, which a single `roomPlus/roomMinus` pair
 *      taken at the anchor cannot express.
 *   2. He is not a point. He clips when his DRAWN BODY crosses an edge, and on the track where this
 *      defect is worst his sprite is the largest in the game.
 *
 * So this works on the four corners of his oriented body box, in screen px, and returns the interval
 * of shifts that keeps all four inside the frame. Shifting the pan target by `d` along the world
 * perpendicular moves every other point on screen by `-v * d` — the same sign convention as
 * `lateralShiftToFit` — so each corner contributes two inequalities and the answer is their
 * intersection.
 *
 * AN EMPTY INTERVAL IS A REAL ANSWER, NOT A FAILURE: it means no sideways movement of any size fits
 * him, because he is being lost ALONG the track. LEADER-LATERAL-MINIMAL-1 measured that at 14.1% of
 * the frames the rule engages on. The caller must leave the shift alone there rather than invent one;
 * that residual belongs to the zoom, not to the pan.
 *
 * ── AND WHY THE CALLER MUST BOUND WHAT IT DOES WITH THIS ──────────────────────────────────────
 *
 * The note on `lateralShiftToFit` below records that a screen-rectangle test was this mechanism's
 * FIRST DEFECT: because a diagonal perpendicular has a component on both screen axes, a rectangle
 * test will happily rescue a subject lost ALONG the track by sliding a very long way sideways, and it
 * drove the camera 500 world px off the centreline doing exactly that. The empty interval above
 * catches the case where he cannot be fitted at all, but NOT the case where he can be — at an absurd
 * price. That is why the caller bounds the step, and the bound is load-bearing rather than tidy.
 *
 * @param {object} body  `{cx, cy, ux, uy, halfLen, halfWid}` — the body's centre and unit heading in
 *   screen px, and its half extents along and across that heading, also in screen px.
 * @param {number} vx  screen px moved per world px of shift, x component
 * @param {number} vy  screen px moved per world px of shift, y component
 * @param {number} frameW
 * @param {number} frameH
 * @param {number} [marginPx=0]  keep the body this far inside every edge
 * @returns {{lo: number, hi: number}} admissible shift interval in world px; `lo > hi` means none
 */
export function lateralAdmissibleForBody(body, vx, vy, frameW, frameH, marginPx = 0) {
  const empty = { lo: 1, hi: -1 };
  if (!body || !(frameW > 0) || !(frameH > 0)) return empty;
  const { cx, cy, ux, uy, halfLen, halfWid } = body;
  if (![cx, cy, ux, uy, halfLen, halfWid, vx, vy].every(Number.isFinite)) return empty;
  // A margin wider than half the frame would INVERT the box it carves out, and an inverted box
  // produces nonsense rather than an answer, so it is clamped. That is all the clamp promises: a
  // margin large enough to leave a body no room still yields an EMPTY interval, which is the safe
  // degradation — the caller reads that as "no sideways move fits him" and leaves the pan alone, so
  // an absurd setting costs the leader's guarantee and never buys a wild shift.
  const m = marginPx > 0 ? marginPx : 0;
  const mx = Math.min(m, (frameW - 1) / 2);
  const my = Math.min(m, (frameH - 1) / 2);
  let lo = -Infinity;
  let hi = Infinity;
  // `p - v*d` must lie in [min, max]; solve for d and intersect. A zero component never reaches its
  // pair of edges, so it constrains nothing unless the corner is already outside them.
  const bound = (p, v, min, max) => {
    if (Math.abs(v) < 1e-12) {
      if (p < min - 1e-9 || p > max + 1e-9) hi = -Infinity;
      return;
    }
    const e1 = (p - max) / v;
    const e2 = (p - min) / v;
    if (Math.min(e1, e2) > lo) lo = Math.min(e1, e2);
    if (Math.max(e1, e2) < hi) hi = Math.max(e1, e2);
  };
  for (const a of [-1, 1])
    for (const b of [-1, 1]) {
      const px = cx + ux * halfLen * a - uy * halfWid * b;
      const py = cy + uy * halfLen * a + ux * halfWid * b;
      bound(px, vx, mx, frameW - mx);
      bound(py, vy, my, frameH - my);
    }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) return empty;
  return { lo, hi };
}

/**
 * THE LATERAL GUARANTEE — CAMERA-LATERAL-1.
 *
 * The camera sits on the corridor centreline ACROSS the track. That is a default position, and like
 * every default position in this design it has a guarantee behind it: shift off the centreline only
 * when a guaranteed subject would otherwise leave the frame, by the smallest amount that works, and
 * return to zero the moment it is no longer needed.
 *
 * It SHIFTS; it never steers. It cannot choose a subject, cannot look ahead, and has no memory: given
 * the same geometry it returns the same number, and given geometry that already fits it returns
 * exactly 0. That is what keeps it a guarantee rather than a second follow rule (Lesson 192).
 *
 * STRICTLY ONE-DIMENSIONAL, and that is not a simplification — it is the fix for a defect this
 * function had on its first cut. Written as "bring these screen points inside the frame rectangle",
 * it would also try to rescue a subject that is out of frame ALONG the track, because a diagonal
 * perpendicular has a component on both screen axes. On an open track's LEAD_CHANGE, where the
 * passed racer can be far behind, that drove the camera 500 world px off the centreline chasing a
 * subject no sideways move could ever reach. The lateral guarantee owns the lateral axis and nothing
 * else; an along-track excursion is the ZOOM guarantee's business.
 *
 * The algebra, per subject: it sits `L` world px off the centreline; the camera sits `d` off it; so
 * the subject is `(L - d)` off the camera's own axis, which on screen is `(L - d) * scale` px away
 * from the anchor along the perpendicular. That must fall inside the room the frame leaves on each
 * side, giving one interval of admissible `d` per subject. The answer is the value of smallest
 * magnitude in their intersection — which is 0 whenever 0 is admissible, i.e. hold the centreline.
 *
 * @param {number[]} lateralOffsets  each guaranteed subject's world px offset from the centreline
 * @param {number} roomPlus   screen px from the anchor to the frame edge along +perpendicular
 * @param {number} roomMinus  screen px from the anchor to the frame edge along -perpendicular
 * @param {number} scale      screen px per world px along the perpendicular
 * @returns {number} world px to shift the pan target along the perpendicular; 0 = hold the centreline
 */
export function lateralShiftToFit(lateralOffsets, roomPlus, roomMinus, scale) {
  if (!Array.isArray(lateralOffsets) || lateralOffsets.length === 0) return 0;
  if (!(scale > 0) || !(roomPlus >= 0) || !(roomMinus >= 0)) return 0;
  let lo = -Infinity;
  let hi = Infinity;
  for (const L of lateralOffsets) {
    if (!Number.isFinite(L)) continue;
    lo = Math.max(lo, L - roomPlus / scale);
    hi = Math.min(hi, L + roomMinus / scale);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  // Unsatisfiable: no shift fits everyone, which means the ZOOM guarantee should have widened and
  // did not. Split the difference rather than picking a side, and never return a wild number.
  if (lo > hi) return (lo + hi) / 2;
  if (lo <= 0 && hi >= 0) return 0; // the centreline already works — hold it
  return lo > 0 ? lo : hi; // the smallest move that reaches the admissible interval
}

/**
 * GUARANTEE 4 — THE FIELD. The largest cam.zoom at which EVERY racer is inside the frame.
 *
 * This is the start ceremony's target (START-CEREMONY-CAMERA-1 (c)) and it is deliberately written
 * as a guarantee rather than as a bespoke "fit the formation" helper: it returns a CEILING built
 * from the same `zoomCeilingToFit`, so it widens and never steers, and the hold that follows the gun
 * combines it with the other guarantees through the ordinary `Math.min`.
 *
 * DERIVED FROM THE FORMATION'S OWN EXTENT. There is no track name, no field size and no constant in
 * it — it reads where the racers actually are. A 4-racer grid on Searound and a 100-racer grid on
 * river-run go through the identical arithmetic and come out at different zooms because the two
 * formations are different sizes, which is the whole point.
 *
 * WHY TWO AXIS-ALIGNED CALLS RATHER THAN ONE DIAGONAL. The camera is CENTRED on `centre` here, so
 * the question is whether a rectangle fits inside a rectangle — and that is answered per axis. A
 * single call with the bounding box's diagonal would fit the diagonal ALONG ITS OWN DIRECTION, which
 * is a different and weaker condition: a wide, flat grid would pass it and still be cropped left and
 * right. Each call is the one guarantee computation; only the vectors differ, as with every other
 * guarantee in this file.
 *
 * The half-extents are DOUBLED because the camera sits at `centre`: a racer `d` to the left needs
 * `d` of room on the left and its mirror needs `d` on the right, so the span that must fit is `2d`
 * even when no racer sits at the mirror position.
 *
 * @param {Array<{x:number,y:number}>} racers  every racer that must stay in frame
 * @param {{x:number,y:number}} centre  the world point the camera is centred on
 * @param {number} axisX  projection world→screen scale on X at cam.zoom = 1
 * @param {number} axisY
 * @param {number} frameW
 * @param {number} frameH
 * @param {number} [innerFramePct=1]  fit inside this fraction of the frame
 * @returns {number} cam.zoom ceiling; Infinity when there is nothing to keep in frame
 */
export function fieldGuarantee(racers, centre, axisX, axisY, frameW, frameH, innerFramePct = 1) {
  if (!Array.isArray(racers) || racers.length === 0 || !centre) return Infinity;
  let maxDx = 0;
  let maxDy = 0;
  for (const r of racers) {
    if (!r || !Number.isFinite(r.x) || !Number.isFinite(r.y)) continue;
    const dx = Math.abs(r.x - centre.x);
    const dy = Math.abs(r.y - centre.y);
    if (dx > maxDx) maxDx = dx;
    if (dy > maxDy) maxDy = dy;
  }
  // A single racer, or a formation with no extent on an axis, constrains nothing on that axis —
  // zoomCeilingToFit returns Infinity for a zero vector and `min` ignores it.
  return Math.min(
    zoomCeilingToFit({ x: 2 * maxDx, y: 0 }, axisX, axisY, frameW, frameH, innerFramePct),
    zoomCeilingToFit({ x: 0, y: 2 * maxDy }, axisX, axisY, frameW, frameH, innerFramePct)
  );
}

/** Unit perpendicular to a world heading, or null when the heading is degenerate. */
function perpendicularOf(heading) {
  if (!heading) return null;
  const len = Math.hypot(heading.x, heading.y);
  if (!(len > 0)) return null;
  return { x: -heading.y / len, y: heading.x / len };
}

function clamp01(v) {
  if (!Number.isFinite(v) || v <= 0) return 1;
  return Math.min(1, v);
}
