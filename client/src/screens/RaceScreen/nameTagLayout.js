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
//              ── WHAT CAME FROM WHERE (START-SEQUENCE-1) ──────────────────────────
//              Two things were PLUNDERED from branches the owner did not merge, rather than
//              re-typed, because a second copy of either would be the duplication this module has
//              already been cleaned of once:
//                • `formationNeedsStagger` — the overlap TRIGGER, from feat/label-stagger-1. Measured
//                  exact across ten tracks at every field size: 0 false positives, 0 misses.
//                • the label-box geometry helpers — the one home for the box's shape, so the module
//                  that LAYS OUT a label and the one that DRAWS it cannot disagree about it.
//              What was deliberately NOT taken: the stagger PLACEMENT (measured, does not work — it
//              creates as many overlaps as it removes) and the SHRINK behaviour (built, and rejected
//              by the owner at the picture). Neither is in this file.
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
/**
 * THE ROLL CALL IN WAVES — split a formation into the FEWEST groups in which no two labels overlap.
 *
 * The owner's promise is that every spectator can find their racer once. When every name fits at
 * once, that is one group and the picture is exactly what it has always been. When they do not fit,
 * the promise is kept over TIME instead of in one frame: each name still appears, at full size,
 * fully readable, in its turn.
 *
 * "ONLY WHERE NECESSARY" FALLS OUT OF THE MECHANISM rather than being a special case bolted on. A
 * formation with no overlaps produces exactly one wave by construction — the first box opens wave 0
 * and every subsequent box finds no conflict there. There is no branch that asks "does this track
 * need it"; the answer is the shape of the result.
 *
 * WHAT THIS IS, precisely: minimum colouring of the labels' conflict graph, solved greedily. Optimal
 * colouring is NP-hard in general, so "fewest" is greedy-fewest, not proven-fewest. That is an honest
 * limit and it is the right trade here — the alternative costs exponential time to save, at most, a
 * wave, and the measured group counts are small.
 *
 * NOTHING IS SHRUNK AND NOTHING IS MOVED. Labels stay at full size, in the place they have always
 * been drawn. The only thing that varies is WHICH of them is on screen at a given moment, which is
 * the same lever the decluttering already owns — so this adds a rule to that lever rather than a new
 * mechanism beside it.
 *
 * @param {Array<{index:number,left:number,right:number,top:number,bottom:number}>} boxes
 * @returns {Array<Array<object>>} waves, each a list of mutually non-overlapping boxes
 */
/**
 * IS THIS LABEL AMBIGUOUS — does it fail to point at exactly one racer? (ROLL-CALL-PAIRING-1)
 *
 * THE OWNER'S COMPLAINT, after watching river-run: *"you see a name but have no idea which racer it
 * belongs to."* The roll call delivered what it was asked for — every name readable, none forgotten
 * — against a requirement that was never readability. It was always that a viewer can FIND HIS
 * RACER. Readability is not pairing, and nothing here had ever measured pairing.
 *
 * THE GEOMETRY OF THE FAILURE. A label is centred on its own racer, so the box's centre IS a pointer
 * — as long as the box is about one racer wide. With a four-character name it was. With a realistic
 * name the box is ~170 px against a racer spacing of ~24, so it spans a handful of racers and its
 * centre becomes a claim the eye cannot verify. Nothing is wrong with the label; there is simply no
 * longer any visible evidence of WHICH racer it names.
 *
 * SO THE TEST IS: how many racers lie underneath this label? Exactly one — its own — and it points
 * unambiguously. More than one, and as far as a viewer can tell the name belongs to any of them.
 *
 * WHY NOT "which racer is nearest the box centre": the label is centred on its owner, so the owner
 * is at distance zero by construction and that test can never fire. It would look principled and
 * measure nothing.
 *
 * NO NEW CONSTANT. The horizontal reach is the box's own width. The vertical window is
 * `labelOffsetAbove`, which exists already because it is how far a label sits above its racer — a
 * racer a row away is not confusable with this one and is not counted.
 *
 * @param {{index:number,left:number,right:number}} box  the label, screen px
 * @param {{x:number,y:number}} owner  its racer's screen position
 * @param {Array<{index:number,x:number,y:number}>} racers  every racer on screen
 * @param {number} fontPx
 * @returns {boolean} true when more than one racer sits under this label
 */
export function labelIsAmbiguous(box, owner, racers, fontPx) {
  if (!box || !owner || !Array.isArray(racers)) return false;
  const halfW = (box.right - box.left) / 2;
  const cx = (box.left + box.right) / 2;
  const band = labelOffsetAbove(fontPx);
  let under = 0;
  for (const r of racers) {
    if (Math.abs(r.x - cx) <= halfW && Math.abs(r.y - owner.y) <= band) {
      under++;
      if (under > 1) return true;
    }
  }
  return false;
}

/**
 * DOES THIS FORMATION NEED THE PAIRING AIDS AT ALL? (ROLL-CALL-PAIRING-1)
 *
 * The owner's standing rule: only where necessary. Where every shown label already sits over exactly
 * one racer — a short name, a roomy formation, the 86.5% of field sizes that need a single wave —
 * nothing is dimmed and no connector is drawn, and the picture is exactly what it has always been.
 *
 * ONE ANSWER PER FORMATION, not per label, and it is the same call this project already made about
 * the wave partition, for the same stated reason: a formation where half the names have a connector
 * and half do not reads as an accident rather than as a rule.
 *
 * Derived from geometry and nothing else — no track name, no track id, no racer type, and no
 * wave-count threshold. A one-wave formation gets no aids because each of its labels sits over one
 * racer, not because anything counted its waves.
 *
 * @param {Array<object>} shownBoxes  the labels actually on screen this frame
 * @param {Map<number,{x:number,y:number}>} racerById  screen position by racer index
 * @param {Array<{index:number,x:number,y:number}>} racers  every racer on screen
 * @param {number} fontPx
 * @returns {boolean}
 */
export function formationNeedsPairingAid(shownBoxes, racerById, racers, fontPx) {
  if (!Array.isArray(shownBoxes) || shownBoxes.length === 0) return false;
  for (const box of shownBoxes) {
    const owner = racerById?.get(box.index);
    if (owner && labelIsAmbiguous(box, owner, racers, fontPx)) return true;
  }
  return false;
}

export function partitionIntoWaves(boxes) {
  const waves = [];
  if (!Array.isArray(boxes) || boxes.length === 0) return waves;

  // WIDEST FIRST, and the order is not cosmetic. Greedy colouring's result depends on the order it
  // visits: the widest label conflicts with the most others, so placing it while the waves are still
  // empty gives it the best chance of sharing one, and placing it last forces a wave of its own.
  // Ties break on `index` so the same formation always yields the same waves — a roll call that
  // reshuffles between two identical frames is churn, and Lesson 190 requires a DECISIVE decision.
  const order = [...boxes].sort(
    (a, b) => b.right - b.left - (a.right - a.left) || a.index - b.index
  );

  for (const box of order) {
    let placed = false;
    for (const wave of waves) {
      if (!wave.some((other) => boxesIntersect(box, other))) {
        wave.push(box);
        placed = true;
        break;
      }
    }
    if (!placed) waves.push([box]);
  }
  return waves;
}

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
  // START-SEQUENCE-1: which wave of the roll call is on screen right now. Ignored entirely when the
  // formation needs only one — which is why a roomy track cannot be affected by it.
  waveIndex = 0,
}) {
  const shown = new Set();
  if (!Array.isArray(racers) || racers.length === 0 || !(fontPx > 0)) {
    return { shown, eligible: 0, placed: 0, dropped: 0, stagger: false, waveCount: 1 };
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
    // ── THE ROLL CALL, IN WAVES ────────────────────────────────────────────────────────────────
    // Every name still appears, at full size. When they all fit, `waves` has ONE entry and this is
    // byte-for-byte what it has always been. When they do not, the promise is kept over time.
    const waves = partitionIntoWaves(eligible);
    const wave =
      waves.length > 1 ? waves[Math.min(waveIndex, waves.length - 1) % waves.length] : eligible;
    for (const e of wave) shown.add(e.index);
    return {
      shown,
      eligible: eligible.length,
      placed: wave.length,
      dropped: eligible.length - wave.length,
      waveCount: waves.length,
      // The trigger is still reported: `waveCount > 1` and it agree by construction, and the
      // diagnostic gates on the same predicate the game runs.
      stagger: waves.length > 1,
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
    // One "wave" outside the roll call: the decluttering above has already removed every overlap by
    // DROPPING a label, so there is nothing to spread over time.
    waveCount: 1,
    // NOT staggered outside the start formation, and that is deliberate rather than an omission.
    // Here the decluttering above has already removed every overlap by DROPPING a label, so there is
    // nothing left for a stagger to fix — and moving labels mid-race would change a picture that has
    // no defect in it. The stagger exists because the start formation is the one place decluttering
    // is switched off (the owner's roll-call requirement), which is exactly where overlaps survive.
    stagger: false,
  };
}

/**
 * HOW LONG THE COUNTDOWN LASTS — one home, so the phase advance and the camera cannot disagree.
 *
 * `max(configured minimum, waves x per-wave)`. It STRETCHES only where it must: a formation whose
 * names all fit is one wave, one wave times any per-wave value is at most the minimum in practice,
 * and the max() makes that exact rather than approximate. So the tracks that never needed a roll
 * call keep the countdown they have always had, to the millisecond.
 *
 * @param {number} waveCount     how many waves the roll call needs (>= 1)
 * @param {number} minimumMs     cameraConfig.countdownDurationMs
 * @param {number} msPerWave     cameraConfig.rollCallMsPerWave
 * @returns {number} countdown length in ms
 */
export function countdownDurationFor(waveCount, minimumMs, msPerWave) {
  const waves = Math.max(1, Math.floor(waveCount) || 1);
  const min = Math.max(0, minimumMs || 0);
  const per = Math.max(0, msPerWave || 0);
  return Math.max(min, waves * per);
}

/**
 * WHICH WAVE IS ON SCREEN at a given moment of the countdown.
 *
 * Keyed on elapsed time and the per-wave beat rather than on the countdown's total length, so the
 * wave a viewer sees does not change when the total stretches for an unrelated reason. Clamped to
 * the last wave: once the roll call has finished, it stays on the final group rather than looping,
 * because a name reappearing after the call has ended reads as a glitch rather than a repeat.
 *
 * @param {number} elapsedMs   ms since the countdown began
 * @param {number} msPerWave
 * @param {number} waveCount
 * @returns {number} wave index, 0-based
 */
export function rollCallWaveIndex(elapsedMs, msPerWave, waveCount) {
  const waves = Math.max(1, Math.floor(waveCount) || 1);
  if (waves === 1) return 0;
  const per = Math.max(1, msPerWave || 1);
  return Math.min(waves - 1, Math.max(0, Math.floor((elapsedMs || 0) / per)));
}
