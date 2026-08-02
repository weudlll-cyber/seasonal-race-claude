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

import { frameExtentAlong } from './frameGeometry.js';

/** Where the subject sits in frame, and why. */
export const POSITION = {
  /** Something worth seeing lies ahead — centre the subject. */
  CENTRED: 'centred',
  /** Nothing worth seeing ahead — push the subject forward so the frame carries what is behind. */
  FORWARD: 'forward',
};

/** What must stay in frame. */
export const GUARANTEE = {
  /** The full track corridor, measured perpendicular to the heading. */
  CORRIDOR: 'corridor',
  /** Two named contenders, measured along the line between them. */
  PAIR: 'pair',
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
