// ============================================================
// File:        Minimap.js
// Path:        client/src/modules/camera/Minimap.js
// Project:     RaceArena
// Created:     2026-04-26
//
// WHAT THIS IS FOR: the picture-in-picture overview in the corner of the race canvas — the whole
// track at a glance, with the racers on it, so a viewer can see where the shot currently is, and
// where the race starts and ends. The last part matters most on an OPEN track, where the band runs
// on past the finish and looks there exactly as it does before it.
//
// WHAT IT IS NOT FOR: the camera. It is pure render and reads nothing the director owns; it draws
// in canvas pixels directly and takes no part in the world<->screen projection.
//
// ── ONE SOURCE FOR THE RIBBON (MINIMAP-ONE-SOURCE-1) ─────────────────────────────────────────────
//
// Everything this file draws that follows the track — the band fill, both edge outlines, the start
// and finish marks and the unraced tail — is ONE ribbon, and it is sampled in ONE place:
// `crossSection`, which asks the shape for `getPosition(t, -0.5)` and `getPosition(t, +0.5)`. Four
// walks of that ribbon became one.
//
// IT USED TO BE TWO PARAMETERISATIONS. The band and its edges walked `getEdgePoints(80)` BY INDEX
// while the marks and the tail were built from `getPosition`, and the two do not agree: inside
// `EditorShape`, `getEdgePoints` resolves t through `_idx`, which ROUNDS to the nearest stored
// sample, while `getPosition` INTERPOLATES between the two it lies between. So the same t named two
// different points, and the tail drawn on one lay up to 1.9 panel px off the band drawn on the
// other — a bright sliver of un-washed band along the whole unraced stretch, worst on space-sprint.
//
// WHY `getPosition` IS THE ONE THAT SURVIVED, and not the other way round:
//
//   1. IT IS WHAT THE WORLD USES. The finish gate the racers actually cross is drawn at
//      `getPosition(ft, 0)` extruded by half the track width. A mark built from anything else can
//      drift away from the line it claims to be.
//   2. IT IS THE ONLY ONE THAT CAN SAY WHERE THE TAIL STARTS. The tail begins at `finishT`, which
//      is an arbitrary t and not a sample index. `getEdgePoints` can only hand back whole samples,
//      so it could never have drawn the tail's first cross-section at all — that is why the two
//      parameterisations existed in the first place, rather than by anyone's choice.
//   3. IT IS THE FINER OF THE TWO. Rounding to the nearest stored sample is a quantisation the
//      interpolating reader does not have; the sliver IS that quantisation, seen edge-on.
//
// WHAT `getEdgePoints` PROVIDED THAT THIS MUST STILL PROVIDE, checked rather than assumed:
//   - both edges of the whole track at a chosen density. `crossSection` at t = i/TRACK_SAMPLES
//     gives the same 81 pairs at the same spacing.
//   - which side is which. `getPosition` clamps its offset to [-0.5, +0.5] and maps -0.5 to the
//     INNER edge and +0.5 to the OUTER, so the naming carries over exactly.
//   - the closed-track wrap. At t 1 a closed shape wraps to t 0, so the last pair of the walk IS
//     the first and `closePath()` still closes on a point rather than across a gap.
// ============================================================

export const MINIMAP_W = 280;
export const MINIMAP_H = 160;
export const MINIMAP_MARGIN = 14;

const PADDING = 6;
const TRACK_SAMPLES = 80;

// ── Start and finish marks ────────────────────────────────────────────────────────────────────
// Both marks are BARS ACROSS THE BAND — one cross-section of the ribbon, from the same
// `crossSection` the band itself is drawn with, which is the SAME segment the world's finish gate
// spans, since that gate is drawn at `getPosition(ft, 0)` extruded by half the track width. So the
// mark, the band it lies on, and the line the racers cross cannot drift apart.
//
// MEASURED on all ten shipped tracks: that bar is 12–27 panel px long. Every size below is chosen
// against those numbers, not against a guess — a mark tuned for a 50 px bar would have been a blob
// on half the tracks.
//
// ITS ENDS USED TO LAND WITHIN 1.5 PANEL PX OF THE DRAWN BAND EDGE, and that tolerance was this
// file's own record of the two-parameterisation defect: the bar was right and the band it was
// measured against was the rounded one. MINIMAP-ONE-SOURCE-1 makes the two the same walk, and the
// measured gap is now 0.000 px on all ten tracks. `scripts/minimap-truth.mjs` is what says so.
//
// The two are told apart by PATTERN FIRST and colour second — a solid green bar starts, a
// black/white checker finishes — because a checker still reads where a colour alone, in a 4 px
// stripe on a tan band, does not.
const MARK_START_COLOR = '#00e05a';
const MARK_CHECKER_DARK = '#101010';
const MARK_CHECKER_LIGHT = '#ffffff';
const MARK_THICKNESS = 4;
// The cell count is derived so the checker holds roughly square cells at any band width, and
// floored at four so it still alternates visibly on the narrowest track.
const MARK_CHECKER_CELL_PX = 5;
const MARK_CHECKER_MIN_CELLS = 4;
const MARK_CHECKER_MAX_CELLS = 10;
// Where start and finish are the SAME point, the checker keeps its own size and gains a green
// PLATE behind it — three px past each end, one px proud on each side — so it reads as a
// checkered gate on green posts. One mark saying both things, instead of two bars stacking into
// an unreadable smear.
const MARK_PLATE_GROW_PX = 3;
const MARK_PLATE_THICKNESS = MARK_THICKNESS + 2;
// …and that is what "the same point" means here: two bars whose centres land closer together than
// this on the PANEL. Decided in panel pixels rather than in t so the rule holds on both topologies
// and at any track size.
const MARK_COINCIDE_PX = 6;

// ── The unraced tail ─────────────────────────────────────────────────────────────────────────
// On an OPEN track the band runs on past the finish, and that stretch is never raced. It is washed
// down so the extent of the race is obvious. A CLOSED loop is raced in full and has no tail — the
// same `shape.isOpen` the band already asks about decides it, not a second rule.
//
// IT IS BUILT FROM `crossSection`, THE SAME SOURCE THE FINISH MARK AND THE BAND USE, which is the
// whole reason the seam lands on the checker: the tail's first cross-section IS the mark's bar, to
// the pixel, rather than two parameterisations that have to be trusted to agree. They did not —
// pairing `getEdgePoints` by index disagreed with `getPosition` by up to 502 world px on
// luger-hill (that is an along-track offset, not a width error), which would have put the seam
// visibly off the mark on the longest tail in the game. The band it washes now comes from the same
// place, so the tail no longer leaves a sliver of un-washed band along its edge either.
//
// A WASH, NOT A COLOUR. The tail keeps the band's own hue and loses its light, so the raced part
// is what the eye finds first. It is drawn BEFORE the edge outlines, so the cyan edge still runs
// through it — without that the tail would read as "the track ends here", which is the opposite of
// true and the one misreading this addition could cause.
const TAIL_WASH = 'rgba(6,10,14,0.5)';

/**
 * Renders a picture-in-picture minimap in the bottom-left corner of the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ getBoundingBox, getPosition, isOpen }} shape  `getEdgePoints` is deliberately NOT in
 *   this list any more: MINIMAP-ONE-SOURCE-1 made `getPosition` the only reader of the track's
 *   geometry here, so a caller can hand this function a shape that does not implement the other.
 * @param {Array<{x:number, y:number, color:string, index:number}>} racers
 * @param {number} leaderIndex  Index of the leading racer in the racers array
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {Set<number>|null} [highlightIndices]  Optional set of racer indices to badge with a ring
 * @param {{startT:number, finishT:number}|null} [marks]  Where the race starts and ends, in the
 *   caller's t units — `finishT` may be a LAP COUNT on a closed track, which normalises to the
 *   gate at t 0. Passed IN rather than read out of race state, so the minimap keeps reading
 *   nothing but the shape it is handed. `null` draws no marks AND no unraced tail: the tail is
 *   the stretch behind `finishT`, so without a finish there is nothing to say where it starts.
 */
export function renderMinimap(
  ctx,
  shape,
  racers,
  leaderIndex,
  canvasW,
  canvasH,
  highlightIndices = null,
  marks = null
) {
  const bx = MINIMAP_MARGIN;
  const by = canvasH - MINIMAP_H - MINIMAP_MARGIN;

  const bbox = shape.getBoundingBox();
  const bboxW = bbox.maxX - bbox.minX;
  const bboxH = bbox.maxY - bbox.minY;

  const innerW = MINIMAP_W - PADDING * 2;
  const innerH = MINIMAP_H - PADDING * 2;
  const scale = Math.min(innerW / bboxW, innerH / bboxH);

  const scaledW = bboxW * scale;
  const scaledH = bboxH * scale;
  const ox = bx + PADDING + (innerW - scaledW) / 2;
  const oy = by + PADDING + (innerH - scaledH) / 2;

  const toMx = (wx) => ox + (wx - bbox.minX) * scale;
  const toMy = (wy) => oy + (wy - bbox.minY) * scale;

  ctx.save();

  // Background panel
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx, by, MINIMAP_W, MINIMAP_H);

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, MINIMAP_W, MINIMAP_H);

  // THE RIBBON, WALKED ONCE. The band fill and both edge outlines are three drawings of these two
  // polylines; walking the shape again for each of them is what let them disagree with the marks
  // and the tail, which walk it at their own t values.
  const band = ribbon(shape, ribbonTs(0), toMx, toMy);

  // Track band fill
  ctx.beginPath();
  tracePolyline(ctx, band.outer);
  for (let i = band.inner.length - 1; i >= 0; i--) {
    ctx.lineTo(band.inner[i].x, band.inner[i].y);
  }
  if (!shape.isOpen) ctx.closePath();
  ctx.fillStyle = 'rgba(200,180,120,0.5)';
  ctx.fill();

  // The unraced tail — with the band, and before the edge outlines so the cyan edge still runs
  // through it. Open tracks only; a closed loop has no tail.
  if (marks) drawUnracedTail(ctx, shape, marks.finishT, toMx, toMy);

  // Outer edge outline
  ctx.strokeStyle = 'rgba(0,220,220,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  tracePolyline(ctx, band.outer);
  if (!shape.isOpen) ctx.closePath();
  ctx.stroke();

  // Inner edge outline
  ctx.beginPath();
  tracePolyline(ctx, band.inner);
  if (!shape.isOpen) ctx.closePath();
  ctx.stroke();

  // Start and finish marks — BEFORE the dots, so a mark can never cover a racer.
  if (marks) drawStartFinishMarks(ctx, shape, marks, toMx, toMy);

  // Racer dots
  for (let i = 0; i < racers.length; i++) {
    const r = racers[i];
    const isLeader = i === leaderIndex;
    const isBadged = highlightIndices != null && highlightIndices.has(r.index);
    const mapX = toMx(r.x);
    const mapY = toMy(r.y);

    ctx.beginPath();
    ctx.arc(mapX, mapY, isLeader ? 5 : isBadged ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = r.color ?? '#fff';
    ctx.fill();

    if (isLeader) {
      ctx.beginPath();
      ctx.arc(mapX, mapY, 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (isBadged) {
      ctx.beginPath();
      ctx.arc(mapX, mapY, 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * The same normalisation the finish line itself uses: an open track clamps to its ends, a closed
 * track wraps — which is what turns a closed race's `finishT` of "3 laps" back into the gate at 0.
 */
function markT(shape, t) {
  return shape.isOpen ? Math.max(0, Math.min(1, t)) : ((t % 1) + 1) % 1;
}

/**
 * THE ONE PLACE THIS FILE ASKS THE SHAPE WHERE THE TRACK IS. One cross-section of the ribbon at
 * `t`, both edges, already in panel pixels.
 *
 * `getPosition` clamps its offset to [-0.5, +0.5] and maps -0.5 to the inner edge and +0.5 to the
 * outer, so this is the full width of the band and the naming is the shape's own.
 */
function crossSection(shape, t, toMx, toMy) {
  const i = shape.getPosition(t, -0.5);
  const o = shape.getPosition(t, 0.5);
  return {
    inner: { x: toMx(i.x), y: toMy(i.y) },
    outer: { x: toMx(o.x), y: toMy(o.y) },
  };
}

/**
 * The t values a stretch of the ribbon from `t0` to the end of the track is sampled at.
 *
 * ONE GRID, NOT JUST ONE SOURCE. The whole band is `TRACK_SAMPLES` even steps; a stretch that
 * starts partway along takes its own first sample at `t0` — which is the point of it, since `t0` is
 * a finish position and not a sample index — and then EVERY BAND SAMPLE AFTER IT, rather than
 * re-dividing its own span evenly.
 *
 * That last part is not tidiness, it is the rest of the sliver. Two polylines through the same
 * curve at different sample points are not the same polyline: each is a run of chords, and where
 * one track's chord cuts a corner the other does not, they part company. Sampling the same source
 * at a re-divided span left up to 1.5 panel px between the tail and the band it washes, on top of
 * the 1.9 px the two different sources cost. Sharing the grid makes every vertex of the stretch
 * after the first a vertex of the band itself, and the two outlines coincide.
 *
 * The DENSITY is unchanged — it is still the band's own, which is what the tail always asked for.
 * Only the phase is.
 */
function ribbonTs(t0) {
  const ts = [t0];
  for (let i = Math.ceil(t0 * TRACK_SAMPLES); i <= TRACK_SAMPLES; i++) {
    const t = i / TRACK_SAMPLES;
    if (t > t0) ts.push(t);
  }
  return ts;
}

/**
 * A stretch of the ribbon as two panel-pixel polylines. Every outline this file draws is one of
 * these — the band is the whole ribbon, the tail is the stretch behind the finish, and a mark is
 * one cross-section.
 */
function ribbon(shape, ts, toMx, toMy) {
  const inner = [];
  const outer = [];
  for (const t of ts) {
    const c = crossSection(shape, t, toMx, toMy);
    inner.push(c.inner);
    outer.push(c.outer);
  }
  return { inner, outer };
}

/** Opens a path on a polyline's first point and runs through the rest. */
function tracePolyline(ctx, pts) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
}

/**
 * Washes down the stretch of band behind the finish, which no racer ever runs.
 *
 * OPEN TRACKS ONLY, and silent when the finish is at or past the end of the geometry — there is
 * no tail to draw then, and a zero-length polygon would be a smear at the last sample.
 *
 * The sample count is derived from how much of the track the tail covers, at the band's own
 * density (`TRACK_SAMPLES` over the whole track), so the tail's outline follows the curve exactly
 * as closely as the band it sits on — a fixed count would be coarse on a long tail and wasteful on
 * a short one.
 */
function drawUnracedTail(ctx, shape, finishT, toMx, toMy) {
  if (!shape.isOpen) return;
  const t0 = markT(shape, finishT);
  if (t0 >= 1) return;

  const tail = ribbon(shape, ribbonTs(t0), toMx, toMy);

  ctx.beginPath();
  tracePolyline(ctx, tail.inner);
  for (let i = tail.outer.length - 1; i >= 0; i--) {
    ctx.lineTo(tail.outer[i].x, tail.outer[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = TAIL_WASH;
  ctx.fill();
}

/** The bar across the band at `t`, inner edge to outer edge, already in panel pixels. */
function bandBarAt(shape, t, toMx, toMy) {
  const c = crossSection(shape, t, toMx, toMy);
  return { ax: c.inner.x, ay: c.inner.y, bx: c.outer.x, by: c.outer.y };
}

/** The same bar with both ends pushed out by `growPx` along its own direction. */
function grownBar(bar, growPx) {
  const dx = bar.bx - bar.ax;
  const dy = bar.by - bar.ay;
  const len = Math.hypot(dx, dy);
  if (len === 0) return bar;
  const ux = (dx / len) * growPx;
  const uy = (dy / len) * growPx;
  return { ax: bar.ax - ux, ay: bar.ay - uy, bx: bar.bx + ux, by: bar.by + uy };
}

function drawSolidBar(ctx, bar, color, thickness) {
  ctx.lineWidth = thickness;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(bar.ax, bar.ay);
  ctx.lineTo(bar.bx, bar.by);
  ctx.stroke();
}

/**
 * The finish bar: alternating dark and light cells along the bar. The cell COUNT is derived from
 * the bar's drawn length and floored at four, so the pattern still alternates visibly on a narrow
 * track instead of degenerating into one or two blocks.
 */
function drawCheckerBar(ctx, bar, thickness) {
  const dx = bar.bx - bar.ax;
  const dy = bar.by - bar.ay;
  const cells = Math.max(
    MARK_CHECKER_MIN_CELLS,
    Math.min(MARK_CHECKER_MAX_CELLS, Math.round(Math.hypot(dx, dy) / MARK_CHECKER_CELL_PX))
  );
  ctx.lineWidth = thickness;
  for (let i = 0; i < cells; i++) {
    ctx.beginPath();
    ctx.moveTo(bar.ax + (dx * i) / cells, bar.ay + (dy * i) / cells);
    ctx.lineTo(bar.ax + (dx * (i + 1)) / cells, bar.ay + (dy * (i + 1)) / cells);
    ctx.strokeStyle = i % 2 === 0 ? MARK_CHECKER_DARK : MARK_CHECKER_LIGHT;
    ctx.stroke();
  }
}

/**
 * Draws where the race starts and where it ends. Two bars when they are apart (open track), ONE
 * combined bar when they are the same point (closed track, where the gate and the front start row
 * both sit at t 0).
 */
function drawStartFinishMarks(ctx, shape, marks, toMx, toMy) {
  const startBar = bandBarAt(shape, markT(shape, marks.startT), toMx, toMy);
  const finishBar = bandBarAt(shape, markT(shape, marks.finishT), toMx, toMy);

  // The caller's context may arrive with lineCap 'round' — that would bleed every checker cell
  // into its neighbour and turn the pattern into a smear. The outer save/restore hands it back.
  ctx.lineCap = 'butt';

  const gapPx = Math.hypot(
    (startBar.ax + startBar.bx) / 2 - (finishBar.ax + finishBar.bx) / 2,
    (startBar.ay + startBar.by) / 2 - (finishBar.ay + finishBar.by) / 2
  );

  if (gapPx < MARK_COINCIDE_PX) {
    drawSolidBar(
      ctx,
      grownBar(finishBar, MARK_PLATE_GROW_PX),
      MARK_START_COLOR,
      MARK_PLATE_THICKNESS
    );
    drawCheckerBar(ctx, finishBar, MARK_THICKNESS);
    return;
  }

  drawSolidBar(ctx, startBar, MARK_START_COLOR, MARK_THICKNESS);
  drawCheckerBar(ctx, finishBar, MARK_THICKNESS);
}
