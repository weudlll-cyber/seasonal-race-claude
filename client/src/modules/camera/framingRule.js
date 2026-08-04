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
 * @param {{x:number,y:number}} headingWorld  the track tangent at the anchor (any length)
 * @param {number} trackWidthPx  corridor width in world px
 * @returns {number} cam.zoom ceiling
 */
export function corridorGuarantee(
  headingWorld,
  trackWidthPx,
  axisX,
  axisY,
  frameW,
  frameH,
  innerFramePct = 1
) {
  if (!(trackWidthPx > 0)) return Infinity;
  const perp = perpendicularOf(headingWorld);
  if (!perp) {
    // No heading available: fall back to the worst orientation, which is what a heading-blind
    // guarantee would have to assume everywhere. Conservative, never wrong, just wider.
    return Math.min(
      zoomCeilingToFit({ x: trackWidthPx, y: 0 }, axisX, axisY, frameW, frameH, innerFramePct),
      zoomCeilingToFit({ x: 0, y: trackWidthPx }, axisX, axisY, frameW, frameH, innerFramePct)
    );
  }
  return zoomCeilingToFit(
    { x: perp.x * trackWidthPx, y: perp.y * trackWidthPx },
    axisX,
    axisY,
    frameW,
    frameH,
    innerFramePct
  );
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
export function pairGuarantee(a, b, axisX, axisY, frameW, frameH, innerFramePct = 1, padding = 0) {
  if (!a || !b) return Infinity;
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
export function anchorScreenPoint(frameW, frameH, forwardFrac, headingScreen) {
  const centre = { x: frameW / 2, y: frameH / 2 };
  if (forwardFrac == null || !headingScreen) return centre;
  const len = Math.hypot(headingScreen.x, headingScreen.y);
  if (!(len > 0)) return centre;
  const ux = headingScreen.x / len;
  const uy = headingScreen.y / len;
  const shift = (forwardFrac - 0.5) * frameExtentAlong(ux, uy, frameW, frameH);
  return { x: centre.x + ux * shift, y: centre.y + uy * shift };
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
 * @param {{x:number,y:number}} anchor   the world point the shot is built around
 * @param {Array<{x:number,y:number,finished?:boolean}>} racers  the live field (the anchor may be in it)
 * @param {number} minVisible  how many racers must be in frame INCLUDING the anchor; <= 1 disables
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
  const need = Math.floor(minVisible) - 1; // the anchor itself is one of them
  if (!(need > 0)) return Infinity;
  const at = anchorAt ?? { x: frameW / 2, y: frameH / 2 };
  const ceilings = [];
  for (const r of racers) {
    if (!r || r.finished) continue;
    const dx = r.x - anchor.x;
    const dy = r.y - anchor.y;
    if (dx === 0 && dy === 0) continue; // the anchor itself
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
  // Most permissive first: ceilings[0] is the nearest company, in the frame's own terms.
  ceilings.sort((a, b) => b - a);
  // Asking for more company than the field can supply must not zoom to a point: take what exists.
  return ceilings[Math.min(need, ceilings.length) - 1];
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
