// ============================================================
// File:        nameTagLayout.js
// Path:        client/src/screens/RaceScreen/nameTagLayout.js
// Project:     RaceArena
// Created:     2026-08-03
// Description: WHICH name tags are drawn this frame, decided in SCREEN space (CAMERA-TAGS-1).
//
//              THE REFRAME THIS MODULE IS BUILT ON. The owner's two goals — as many names readable
//              as possible, covering the racers as rarely as possible — read as a trade-off and are
//              mostly not one. Ten labels on a clump are UNREADABLE *and* cover more racers than one
//              label would. Decluttering buys both at once. So there is no compromise to tune here:
//              this module lays labels out, and the COUNT falls out of the layout.
//
//              WHAT REPLACED WHAT. `visibleTagRacers` selected the top N by race position, N a Dev
//              Screen number. That answers "who matters in the STANDINGS"; a label answers "who is
//              that ON SCREEN". The old rule labelled a leader who was off-frame and left an
//              on-screen racer in P17 anonymous, and it never once looked at whether two labels
//              landed on top of each other. Eligibility is now "is the racer on canvas", and
//              label-vs-label occlusion decides the rest.
//
//              WHY SCREEN SPACE. Whether two labels collide is a question about pixels. The tags are
//              DRAWN inside the camera transform, but they may not be DECIDED there: a world-space
//              overlap test would answer a different question on every track, because a closed
//              track's world->screen scale is anisotropic (X and Y differ by up to 18.5%).
//
//              WHAT THIS STAGE DELIBERATELY DOES NOT DO — stages 2 and 3, named so nobody has to
//              guess whether they were forgotten:
//                • PRIORITY from the director's anchor + guarantee set. Stage 1 orders by race
//                  position, which is what the old rule did, so the change here is decluttering and
//                  nothing else. Stage 2 makes the labels agree with the camera about who matters.
//                • PLACEMENT in more than one slot (above / above-left / above-right / below), which
//                  is what lets a clump stagger into two or three legible rows instead of dropping
//                  to one. Stage 3.
//                • SPRITE avoidance — a label must also not cover a racer. Stage 3.
//
//              Pure: no canvas, no state, no clock. Text measurement comes in as a function so the
//              caller can hand it a real ctx and a test can hand it a ruler.
// ============================================================

/** Screen-px padding around the text inside the label's background box. */
const BOX_PAD_X = 8;
/** The label box height as a multiple of the font size. */
const BOX_H_FACTOR = 1.18;

/**
 * THE LABEL BOX'S SHAPE — one home (CLEANUP-BEFORE-NUMBERS-1, salvaged from LABEL-SHRINK-1).
 *
 * These numbers had TWO homes: this module named them in order to lay labels out, and
 * `racerRendering.js` re-typed them as literals (`fontPx * 1.18`, `fontPx * 2.0`, `+ 8`) in order to
 * draw one. Two copies of the shape of a single rectangle — the layout could have been reasoning
 * about a box the renderer never drew, and nothing would have failed.
 *
 * Nothing had drifted, which is the argument for fixing it while that is still true. The merge is
 * arithmetically identical, and the render fingerprint being unchanged is what proves it rather than
 * an argument that it must be.
 *
 * The renderer imports these. If the box changes shape, it changes here and the layout and the
 * drawing move together by construction.
 *
 * LABEL-OFFSET-1 collected the first dividend: `labelOffsetAbove` changed from a font multiple to a
 * racer-derived gap, and because there was one home the layout's idea of where a label sits and the
 * renderer's could not part company. Had the literal still been in both files, the boxes the
 * decluttering reasons about would have moved and the boxes drawn would not.
 */

/** The label box height in screen px. */
export function labelBoxHeight(fontPx) {
  return fontPx * BOX_H_FACTOR;
}

/**
 * How far above the racer's CENTRE the BOTTOM of the label sits, in screen px.
 *
 * ── THE GAP FOLLOWS THE RACER, NOT THE FONT (LABEL-OFFSET-1) ─────────────────────────────────────
 * It used to be `fontPx × 2.0`. That is the defect the owner saw on river-run: the distance between
 * a racer and its label was a property of the TEXT, so it stayed the same while the racer changed
 * size. On a large sprite two font-heights reads as snug; on a small one the same absolute gap reads
 * as detached, and the label stops looking like it belongs to anything.
 *
 * The gap is now HALF THE RACER'S DRAWN HEIGHT — which puts the label's bottom edge exactly at the
 * top of the racer — PLUS a margin. Two terms doing two jobs:
 *
 *   racerScreenH / 2   reaches the top of the racer. Not a constant anywhere: it falls out of the
 *                      drawn size, so it is automatically right on every track, at every zoom, for
 *                      every racer type, and it needs no per-track or per-type number to be so.
 *   marginPx           the breathing space above that edge, and the owner's slider.
 *
 * WHY THE MARGIN IS NOT ALSO DERIVED FROM THE RACER. It would then be `racerScreenH × k`, the two
 * terms would collapse into one factor, and the owner's slider would no longer be a gap — it would be
 * a second size multiplier. It is also the term that absorbs what the first term cannot know:
 * `racerScreenH` is the visible NARROW BODY, and sprite extremities (a giraffe's neck, a rocket's
 * fin) reach past it. A fixed screen-px margin clears those without pretending to measure them.
 *
 * @param {number} racerScreenH  the racer's drawn height in screen px (drawnRacerScreenPx, Y axis)
 * @param {number} marginPx      breathing space above the racer's top edge, in screen px
 * @returns {number} screen px from the racer's centre to the bottom of its label
 */
export function labelOffsetAbove(racerScreenH, marginPx) {
  const h = Number.isFinite(racerScreenH) && racerScreenH > 0 ? racerScreenH : 0;
  const m = Number.isFinite(marginPx) && marginPx > 0 ? marginPx : 0;
  return h / 2 + m;
}

/** The label box width for a measured text width, in screen px. */
export function labelBoxWidth(textWidth) {
  return textWidth + BOX_PAD_X;
}

/**
 * STABILITY, and both numbers are measured rather than chosen. A first-fit layout recomputed every
 * frame churns: across the ten tracks at 40 racers it changed 12.06 labels per second, and a name
 * that appears and vanishes twice a second cannot be read at all.
 *
 * The churn split almost evenly — 5.40/s from racers crossing the canvas EDGE, 6.66/s from labels
 * crossing each other — so both halves needed an answer, and neither answer is a timer (Lesson 190
 * is explicit that a decision must change when the change is DECISIVE, never on a clock).
 *
 *   EDGE_MARGIN_FRAC   a racer must be this far INSIDE the frame to gain a label, and keeps it until
 *                      it is this far OUTSIDE. Hysteresis on the geometry, not on time.
 *   YIELD_OVERLAP_FRAC how much of its own box an incumbent tolerates before giving up its slot.
 *                      A newcomer must be completely clear; an incumbent has a budget. Asymmetric,
 *                      which is what makes the threshold decisive rather than a coin-flip boundary.
 *
 * Together with incumbency they take the churn to 5.45/s over ~20 labels — about one change per
 * label every 3.7 s. The cost is visible in the measurement rather than hidden: readable labels fall
 * from 18.7 to 17.0, because a tolerated intrusion is a small overlap.
 */
const EDGE_MARGIN_FRAC = 0.02;
const YIELD_OVERLAP_FRAC = 0.35;

/**
 * THE UNIT. The label is UI: it is the same size on screen at every zoom, on every track, at every
 * world resolution — a fraction of the frame height and nothing else.
 *
 * CAMERA-TAGS-1 fixed the previous rule, `Math.max(8, Math.round(11 * inv))`. The `11 * inv` was
 * right — dividing by the zoom is what keeps a world-drawn label constant on screen. The damage was
 * the other two operations: `round()` collapses the world size toward zero at high zoom, and the
 * `max(8, …)` added to protect against that then CLAMPED, so above effZoom 1.375 the label started
 * growing again. Same setting, 2.4x difference between tracks. The fix is to remove the rounding
 * rather than to floor it — the same class as the zoom unit and the sprite floor, an absolute pixel
 * value in a space where it does not survive.
 *
 * @param {number} frameFrac  label font size as a fraction of frame height
 * @param {number} canvasH    frame height in screen px
 * @returns {number} font size in SCREEN px
 */
export function tagFontScreenPx(frameFrac, canvasH) {
  if (!(frameFrac > 0) || !(canvasH > 0)) return 0;
  return frameFrac * canvasH;
}

/**
 * Decide which racers get a name tag this frame.
 *
 * @param {object} p
 * @param {Array}  p.racers      every racer (finished ones included; the caller filters if it wants)
 * @param {number} p.effX        world->screen scale on X at the current zoom
 * @param {number} p.effY        world->screen scale on Y
 * @param {number} p.offsetX     camera offset X (screen px)
 * @param {number} p.offsetY     camera offset Y
 * @param {number} p.canvasW
 * @param {number} p.canvasH
 * @param {number} p.fontPx      label font size in screen px (from tagFontScreenPx)
 * @param {number} [p.racerScreenH=0]  LABEL-OFFSET-1: the racer's DRAWN height in screen px, which is
 *        what the label's distance from it is derived from. The layout must be given the same number
 *        the renderer draws with, or it reasons about boxes that are not where the labels are.
 * @param {number} [p.labelMarginPx=0]  breathing space above the racer's top edge, in screen px
 * @param {(name:string)=>number} p.measureText  text width in screen px at that font size
 * @param {Set<number>|null} [p.incumbents]  racer indices labelled last frame (stability)
 * @param {number} [p.edgeMarginFrac=0]  canvas-edge hysteresis band, as a fraction of frame height
 * @param {number} [p.yieldOverlapFrac=0]  how much of its own box an incumbent tolerates before yielding
 * @param {boolean} [p.showAll=false]  the START-FORMATION exception: label everyone, no decluttering
 * @param {(r:object)=>string} [p.labelOf]  the string actually drawn (row suffixes etc.)
 * @returns {{ shown: Set<number>, eligible: number, placed: number, dropped: number }}
 *   `shown` holds racer.index values.
 */
export function computeTagLayout({
  racers,
  effX,
  effY,
  offsetX,
  offsetY,
  canvasW,
  canvasH,
  fontPx,
  racerScreenH = 0,
  labelMarginPx = 0,
  measureText,
  showAll = false,
  labelOf = (r) => r.name ?? '',
  wideLabelOf = null,
  wideIncumbents = null,
  incumbents = null,
  edgeMarginFrac = EDGE_MARGIN_FRAC,
  yieldOverlapFrac = YIELD_OVERLAP_FRAC,
}) {
  const shown = new Set();
  // LABEL-DEGRADE-1: which racers got the WIDE form (the name) rather than the narrow one.
  const wide = new Set();
  if (!Array.isArray(racers) || racers.length === 0 || !(fontPx > 0)) {
    return { shown, wide, eligible: 0, placed: 0, dropped: 0 };
  }

  const boxH = labelBoxHeight(fontPx);
  const offsetAbove = labelOffsetAbove(racerScreenH, labelMarginPx);
  const edgeMargin = Math.max(0, edgeMarginFrac) * canvasH;

  /** A label box in screen px, exactly where it will be drawn, for a given text width. */
  const boxAt = (sx, sy, w) => ({
    left: sx - w / 2,
    right: sx + w / 2,
    top: sy - offsetAbove - boxH,
    bottom: sy - offsetAbove,
  });

  // ── ELIGIBLE: on canvas. Not "top N by position" — a label answers "who is that on screen". ──
  const eligible = [];
  for (const r of racers) {
    if (!r || r.index == null) continue;
    const sx = r.x * effX + offsetX;
    const sy = r.y * effY + offsetY;
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
    // ELIGIBILITY HYSTERESIS. A racer must be comfortably INSIDE to gain a label, and stays until
    // it is comfortably OUTSIDE. Without this a racer hovering on the frame edge gains and loses its
    // name every few frames, and that was 45% of all label churn — more than occlusion caused.
    const isIncumbent = incumbents ? incumbents.has(r.index) : false;
    const m = isIncumbent ? -edgeMargin : edgeMargin;
    if (sx < m || sx > canvasW - m || sy < m || sy > canvasH - m) continue;
    const w = Math.max(1, labelBoxWidth(measureText(labelOf(r))));
    // LABEL-DEGRADE-1: the WIDE form's box too, when a wider text is on offer for this racer. It is
    // measured here beside the narrow one so both are in the same units, from the same `measureText`,
    // and the placement pass below can choose between them without re-deriving anything.
    const wideText = wideLabelOf ? wideLabelOf(r) : null;
    const wideW =
      wideText != null && wideText.length > 0
        ? Math.max(1, labelBoxWidth(measureText(wideText)))
        : null;
    eligible.push({
      index: r.index,
      t: r.t ?? 0,
      ...boxAt(sx, sy, w),
      // The wide candidate, or null when this racer has no wider form to offer.
      wide: wideW != null && wideW > w ? boxAt(sx, sy, wideW) : null,
    });
  }

  // ── THE START-FORMATION EXCEPTION ────────────────────────────────────────────────────────────
  // The owner's requirement, with his reason: during the start formation EVERY name must be
  // visible, so that every spectator can find their racer once. It is not a fallback that happens
  // to survive the new rule — it is a feature, and the decluttering below would otherwise take the
  // roll call away the moment it shipped. No decluttering runs while it holds.
  if (showAll) {
    // The start formation shows every NAME already (the roll call), so the wide form is what it
    // means by a label — but it does no decluttering, so nothing here needs to choose.
    for (const e of eligible) shown.add(e.index);
    return { shown, wide, eligible: eligible.length, placed: eligible.length, dropped: 0 };
  }

  // ── PRIORITY: race position, highest t first. Stage 2 replaces this with the director's anchor
  // and guarantee set; keeping the old ordering here means this block changes ONE thing.
  // INCUMBENCY, then race position. A label already on screen is offered its pixels FIRST, so it
  // only goes away when something with a better claim genuinely lands on it — Lesson 190 as an
  // ORDERING rather than a timer or a threshold.
  //
  // It is HALF the answer, and the measurement said so: incumbency alone took label churn from 12.1
  // to 9.2 changes per second, because 45% of the churn was never about occlusion at all — it was
  // racers crossing the canvas edge. That half is fixed by `edgeMarginFrac` above.
  if (incumbents && incumbents.size > 0) {
    eligible.sort((a, b) => {
      const ai = incumbents.has(a.index) ? 0 : 1;
      const bi = incumbents.has(b.index) ? 0 : 1;
      return ai !== bi ? ai - bi : b.t - a.t;
    });
  } else {
    eligible.sort((a, b) => b.t - a.t);
  }

  // ── DECLUTTER: first-fit. A label is drawn unless a higher-priority one already occupies its
  // pixels. The count is the OUTPUT — a spread field gets many labels, a clump gets few, and every
  // one that survives is readable.
  const placed = [];
  for (const e of eligible) {
    const incumbent = incumbents ? incumbents.has(e.index) : false;
    // DECISIVENESS, Lesson 190, as a threshold on GEOMETRY rather than a timer. A label that is not
    // yet on screen appears only when its pixels are completely free. A label already on screen
    // yields only when the intrusion is DECISIVE — more than `yieldOverlapFrac` of its own box.
    // Without the asymmetry two racers drifting past each other trade the same label many times a
    // second; measured, that was two thirds of all remaining churn on the bunched tracks.
    const fits = (box, hasTenure) => {
      const area = Math.max(1, (box.right - box.left) * (box.bottom - box.top));
      const budget = hasTenure ? yieldOverlapFrac * area : 0;
      let intrusion = 0;
      for (const p of placed) {
        const ox = Math.min(box.right, p.right) - Math.max(box.left, p.left);
        const oy = Math.min(box.bottom, p.bottom) - Math.max(box.top, p.top);
        if (ox > 0 && oy > 0) intrusion += ox * oy;
        if (intrusion > budget) return false;
      }
      return true;
    };

    // ── LABEL-DEGRADE-1: THE NAME WHEN THERE IS ROOM, THE NUMBER WHEN THERE IS NOT ─────────────
    //
    // ONE DECISION PER LABEL PER CYCLE, in this fixed order, and never revisited. That is what
    // stops the cascade the owner named: widening A displaces B, which frees room, which would let
    // A widen again. Here A is decided before B is looked at, B sees A's chosen box, and neither is
    // asked twice — so the pass cannot oscillate within a frame however the boxes fall.
    //
    // THE SAME ASYMMETRY GOVERNS THE SWITCH as governs the label itself, which is why this needed no
    // new machinery: a racer NOT showing its name must find its wide box COMPLETELY free to gain
    // one; a racer already showing its name keeps it until the intrusion is decisive. Tenure is
    // tracked separately (`wideIncumbents`) from label tenure, because a racer can hold its label
    // while losing the room for its name — those are two different claims on two different boxes.
    if (e.wide && fits(e.wide, wideIncumbents ? wideIncumbents.has(e.index) : false)) {
      placed.push(e.wide);
      shown.add(e.index);
      wide.add(e.index);
      continue;
    }
    if (!fits(e, incumbent)) continue;
    placed.push(e);
    shown.add(e.index);
  }

  return {
    shown,
    wide,
    eligible: eligible.length,
    placed: placed.length,
    dropped: eligible.length - placed.length,
  };
}
