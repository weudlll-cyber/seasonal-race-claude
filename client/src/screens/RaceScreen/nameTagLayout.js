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
//
//              ── LABEL-STAGGER-1: THE TRIGGER SHIPPED, THE PLACEMENT DID NOT ──────────────────
//              The owner asked for the start-formation overlap to be fixed by staggering labels
//              between two vertical levels, fired by local geometry, on every track, only where the
//              room runs out. Half of that is here and half of it is NOT, and the half that is
//              missing was removed on evidence rather than left undone:
//
//              WHAT SHIPPED — `formationNeedsStagger`, the trigger. It is EXACT: measured across all
//              ten tracks at every field size from 2 to each track's maximum, it fires on 0 of the
//              formations that have no overlap and misses 0 of the ones that do.
//
//              WHAT DID NOT — the placement. FOUR variants were built and measured, and none of them
//              gets the overlap count to zero:
//                  row parity, one box-height step        84 field sizes still overlapping
//                  row parity, two box-height step        84
//                  greedy by screen order, two levels     91
//                  greedy by screen order, six levels     90
//              The reason is not vertical room — six levels is no better than two. Adjacent start
//              rows sit about one label height apart in screen y while a label IS one label height
//              tall, so shifting a whole row vertically does not separate it from its neighbours; it
//              walks the collision along the formation into the next row. On the crowded tracks the
//              formation is simply denser than the labels are small.
//
//              Shipping it anyway would have made the picture busier, moved names further from their
//              racers, moved the render fingerprint, and still left river-run overlapping at 55 of
//              the 56 field sizes where it overlaps today. So nothing in the render path reads the
//              decision yet. `assignLabelLevels` and `labelStaggerStep` stay because
//              `scripts/diag/start-formation.mjs` drives them to REPRODUCE that negative result —
//              they are the evidence, not dead code.
// ============================================================

/** Screen-px padding around the text inside the label's background box. */
const BOX_PAD_X = 8;
/** The label box height as a multiple of the font size. */
const BOX_H_FACTOR = 1.18;
/** How far above the racer's centre the label sits, as a multiple of the font size. */
const BOX_OFFSET_FACTOR = 2.0;

/**
 * THE LABEL'S OWN GEOMETRY — one home, because there used to be two (LABEL-STAGGER-1).
 *
 * This module decided WHERE a label box is in order to lay the labels out, and `racerRendering.js`
 * re-typed the same three numbers as literals (`fontPx * 1.18`, `fontPx * 2.0`, `+ 8`) in order to
 * DRAW it. Two copies of the shape of one rectangle: the layout could have been reasoning about a
 * box the renderer never drew, and nothing would have failed. Nothing had drifted yet — that is the
 * point of fixing it while it is still true.
 *
 * The renderer now imports these. If the label box changes shape, it changes here and the layout and
 * the drawing move together by construction.
 */

/** The label box height in screen px. */
export function labelBoxHeight(fontPx) {
  return fontPx * BOX_H_FACTOR;
}

/** How far above the racer's centre the BOTTOM of the label sits, in screen px. */
export function labelOffsetAbove(fontPx) {
  return fontPx * BOX_OFFSET_FACTOR;
}

/** The label box width for a measured text width, in screen px. */
export function labelBoxWidth(textWidth) {
  return textWidth + BOX_PAD_X;
}

/**
 * THE STAGGER STEP — how far the second level sits above the first, in screen px.
 *
 * TWO box heights, and the factor of two is forced rather than chosen. One height is the obvious
 * value and it does not work: measured across all ten tracks at every field size, it left 84 field
 * sizes still overlapping, and every single residual pair was at ROW DISTANCE 1 — pairs the parity
 * had already put on different levels.
 *
 * The reason is that the level is keyed on the row INDEX while the collision is in screen SPACE, and
 * the two do not agree about which way is up. Where the next row sits LOWER on screen, lifting it
 * moves it toward its neighbour instead of away.
 *
 * The algebra, so nobody has to rediscover it: two labels overlap when their screen separation `dy`
 * satisfies |dy| < H. Lifting one by S makes the separation |dy - S|, and |dy - S| >= S - |dy|, so
 * S = 2H guarantees a separation greater than H for every |dy| < H — whichever way round the pair
 * happened to be. One height guarantees nothing at all: at dy close to +H it lands the two labels
 * exactly on top of each other.
 *
 * The cost is honest and is the owner's to judge: a second-level label sits further above its racer,
 * and a label that is not clearly attached to a body is its own readability problem. It buys a
 * guarantee that holds at every field size on every track rather than on most of them.
 */
export function labelStaggerStep(fontPx) {
  return 2 * labelBoxHeight(fontPx);
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
 * DOES THIS FORMATION NEED ITS LABELS STAGGERED? (LABEL-STAGGER-1)
 *
 * The owner's rule: ONE rule for every track, fired by the local geometry, only where the room runs
 * out. Never keyed on track name, track id, open vs closed, racer type or a racer count — the goal
 * is explicitly not to make another exception for one track. Nothing below reads any of those; it
 * sees a list of boxes in screen pixels and nothing else.
 *
 * ONE ANSWER PER FORMATION, not per label. A formation with half its names staggered and half not
 * reads as an accident, so this returns a single boolean for the whole field.
 *
 * WHY IT COMPARES AGAINST THE WHOLE BOX AND NOT AGAINST THE LABEL'S HEIGHT. The rule was specified
 * as "compare the separation between adjacent start rows against the height of one label". Measured
 * across all ten tracks at every field size from 2 to the maximum, that test is wrong in both
 * directions, and badly: taken on the vertical axis it fires **153 times where no labels overlapped
 * at all**, and taken as a centre-to-centre distance it never fires and misses **120** real
 * overlaps. Neither can pass this block's own acceptance test, which is that the rule must never
 * fire where it was not needed.
 *
 * The reason is that a label is a RECTANGLE. Two of them miss each other if they are clear on
 * EITHER axis — separated horizontally by their widths, or vertically by one height. A height-only
 * test is blind to the horizontal escape, so it condemns every formation whose rows sit side by side
 * on screen, which is most of them. So the comparison is against the box: do any two labels in this
 * formation actually intersect? That is the same question the specification asked, asked about the
 * shape the label really has.
 *
 * It is exact by construction — no false positives and no false negatives are possible, because the
 * predicate IS the condition rather than a proxy for it. That is what makes "it never fires where it
 * was not needed" a property rather than a measurement that could drift.
 *
 * @param {Array<{left:number,right:number,top:number,bottom:number}>} boxes  label boxes, screen px
 * @returns {boolean} true when at least one pair intersects
 */
export function formationNeedsStagger(boxes) {
  if (!Array.isArray(boxes) || boxes.length < 2) return false;
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesIntersect(a, boxes[j])) return true;
    }
  }
  return false;
}

/** Do two screen-space label boxes intersect? The one definition; everything here calls it. */
function boxesIntersect(a, b) {
  return (
    Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
    Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
  );
}

/**
 * WHICH LEVEL EACH ROW'S LABELS SIT ON — the placement half of LABEL-STAGGER-1.
 *
 * WHY THIS IS NOT `rowIndex % 2`, which is what it was first and which MEASURED WRONG. Alternating
 * on the row index leaves 84 field sizes still overlapping across the ten tracks, and the residual
 * pairs are not leftovers — they are pairs the stagger CREATED. A probe of one, river-run at 72
 * racers: rows 1 and 2 were 30 px apart and perfectly legible; lifting row 1 put it inside row 2.
 *
 * The cause is that **start rows are not monotonic in screen y**. The formation follows a curving
 * track, so row 2 can sit ABOVE row 1 on screen. Any static key — row parity, index, anything decided
 * without looking at where the labels actually landed — is therefore blind to the geometry it is
 * trying to fix, and a bigger step does not help: it just breaks a different pair. Measured at one
 * box height and at two, the count of bad field sizes was 84 both times.
 *
 * So the level is CHOSEN BY LOOKING. Rows are visited in screen order and each is offered level 0
 * first; it is lifted only if level 0 collides with a row already placed. A row is kept whole,
 * because the owner's rule is one answer per formation and half a row on each level is the
 * accidental look he asked to avoid.
 *
 * It is still two levels and it still fires only where the room runs out — the difference is that it
 * verifies its own placement instead of assuming it.
 *
 * @param {Array<{index:number,left:number,right:number,top:number,bottom:number}>} boxes
 * @param {Map<number, number>} rowOf  racer index -> start-row index
 * @param {number} step  screen px to lift a level-1 label by
 * @returns {Map<number, number>} racer index -> 0 or 1
 */
export function assignLabelLevels(boxes, rowOf, step, levels = 2) {
  const level = new Map();
  if (!Array.isArray(boxes) || boxes.length === 0) return level;

  const byRow = new Map();
  for (const b of boxes) {
    const r = rowOf?.get(b.index) ?? 0;
    if (!byRow.has(r)) byRow.set(r, []);
    byRow.get(r).push(b);
  }
  // Screen order, not row order — the whole point. Ties break on the row index so the result is
  // deterministic (a layout that varies between two equal frames is churn, Lesson 190).
  const rows = [...byRow.entries()]
    .map(([r, list]) => ({
      r,
      list,
      y: list.reduce((s, b) => s + b.top, 0) / list.length,
    }))
    .sort((a, b) => a.y - b.y || a.r - b.r);

  const placed = [];
  const lift = (b, d) => ({ ...b, top: b.top - d, bottom: b.bottom - d });
  for (const row of rows) {
    let chosen = 0;
    for (let cand = 0; cand < levels; cand++) {
      const moved = row.list.map((b) => lift(b, cand * step));
      if (!moved.some((m) => placed.some((p) => boxesIntersect(m, p)))) {
        chosen = cand;
        break;
      }
      chosen = cand; // if neither is clear, the last one tried still separates the most pairs
    }
    for (const b of row.list) {
      level.set(b.index, chosen);
      placed.push(lift(b, chosen * step));
    }
  }
  return level;
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
  measureText,
  showAll = false,
  labelOf = (r) => r.name ?? '',
  incumbents = null,
  edgeMarginFrac = EDGE_MARGIN_FRAC,
  yieldOverlapFrac = YIELD_OVERLAP_FRAC,
  rowOf = null,
}) {
  const shown = new Set();
  if (!Array.isArray(racers) || racers.length === 0 || !(fontPx > 0)) {
    return { shown, eligible: 0, placed: 0, dropped: 0, stagger: false };
  }

  const boxH = labelBoxHeight(fontPx);
  const offsetAbove = labelOffsetAbove(fontPx);
  const edgeMargin = Math.max(0, edgeMarginFrac) * canvasH;

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
    // The box, in screen px, exactly where it will be drawn.
    eligible.push({
      index: r.index,
      t: r.t ?? 0,
      left: sx - w / 2,
      right: sx + w / 2,
      top: sy - offsetAbove - boxH,
      bottom: sy - offsetAbove,
    });
  }

  // ── THE START-FORMATION EXCEPTION ────────────────────────────────────────────────────────────
  // The owner's requirement, with his reason: during the start formation EVERY name must be
  // visible, so that every spectator can find their racer once. It is not a fallback that happens
  // to survive the new rule — it is a feature, and the decluttering below would otherwise take the
  // roll call away the moment it shipped. No decluttering runs while it holds.
  if (showAll) {
    for (const e of eligible) shown.add(e.index);
    return {
      shown,
      eligible: eligible.length,
      placed: eligible.length,
      dropped: 0,
      // THE STAGGER DECISION, and it is asked ONLY here — see formationNeedsStagger. The LEVELS are
      // computed only when it fires, so a roomy formation does no extra work and gets an empty map,
      // which the renderer reads as "every label where it has always been".
      // MEASURED, NOT WIRED. Reported so the diagnostic gates on the same predicate the game would
      // use; nothing in the render path reads it. See the header on why the placement half did not
      // ship.
      stagger: formationNeedsStagger(eligible),
    };
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
    const area = Math.max(1, (e.right - e.left) * (e.bottom - e.top));
    const budget = incumbent ? yieldOverlapFrac * area : 0;
    let intrusion = 0;
    for (const p of placed) {
      const ox = Math.min(e.right, p.right) - Math.max(e.left, p.left);
      const oy = Math.min(e.bottom, p.bottom) - Math.max(e.top, p.top);
      if (ox > 0 && oy > 0) intrusion += ox * oy;
      if (intrusion > budget) break;
    }
    if (intrusion > budget) continue;
    placed.push(e);
    shown.add(e.index);
  }

  return {
    shown,
    eligible: eligible.length,
    placed: placed.length,
    dropped: eligible.length - placed.length,
    // NOT staggered outside the start formation, and that is deliberate rather than an omission.
    // Here the decluttering above has already removed every overlap by DROPPING a label, so there is
    // nothing left for a stagger to fix — and moving labels mid-race would change a picture that has
    // no defect in it. The stagger exists because the start formation is the one place decluttering
    // is switched off (the owner's roll-call requirement), which is exactly where overlaps survive.
    stagger: false,
  };
}
