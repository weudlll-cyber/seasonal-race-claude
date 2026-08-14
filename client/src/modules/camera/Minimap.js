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
// ============================================================

export const MINIMAP_W = 280;
export const MINIMAP_H = 160;
export const MINIMAP_MARGIN = 14;

const PADDING = 6;
const TRACK_SAMPLES = 80;

// ── Start and finish marks ────────────────────────────────────────────────────────────────────
// Both marks are BARS ACROSS THE BAND, from `getPosition(t, ±0.5)` — the SAME segment the world's
// finish gate spans, since that gate is drawn at `getPosition(ft, 0)` extruded by half the track
// width. So the mark and the line the racers cross cannot drift apart.
//
// MEASURED on all ten shipped tracks: that bar is 12–22 panel px long, and its ends land within
// 1.5 panel px of the drawn band edge. Every size below is chosen against those numbers, not
// against a guess — a mark tuned for a 50 px bar would have been a blob on half the tracks.
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
// IT IS BUILT FROM `getPosition(t, ±0.5)`, THE SAME SOURCE THE FINISH MARK USES, which is the
// whole reason the seam lands on the checker: the tail's first cross-section IS the mark's bar,
// to the pixel, rather than two parameterisations that have to be trusted to agree. They do not —
// pairing `getEdgePoints` by index disagrees with `getPosition` by up to 502 world px on
// luger-hill (that is an along-track offset, not a width error), which would have put the seam
// visibly off the mark on the longest tail in the game.
//
// A WASH, NOT A COLOUR. The tail keeps the band's own hue and loses its light, so the raced part
// is what the eye finds first. It is drawn BEFORE the edge outlines, so the cyan edge still runs
// through it — without that the tail would read as "the track ends here", which is the opposite of
// true and the one misreading this addition could cause.
const TAIL_WASH = 'rgba(6,10,14,0.5)';

/**
 * Renders a picture-in-picture minimap in the bottom-left corner of the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ getBoundingBox, getEdgePoints, getPosition, isOpen }} shape
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

  // Track band fill
  const { outer, inner } = shape.getEdgePoints(TRACK_SAMPLES);
  ctx.beginPath();
  ctx.moveTo(toMx(outer[0].x), toMy(outer[0].y));
  for (let i = 1; i <= TRACK_SAMPLES; i++) {
    ctx.lineTo(toMx(outer[i].x), toMy(outer[i].y));
  }
  for (let i = TRACK_SAMPLES; i >= 0; i--) {
    ctx.lineTo(toMx(inner[i].x), toMy(inner[i].y));
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
  ctx.moveTo(toMx(outer[0].x), toMy(outer[0].y));
  for (let i = 1; i <= TRACK_SAMPLES; i++) {
    ctx.lineTo(toMx(outer[i].x), toMy(outer[i].y));
  }
  if (!shape.isOpen) ctx.closePath();
  ctx.stroke();

  // Inner edge outline
  ctx.beginPath();
  ctx.moveTo(toMx(inner[0].x), toMy(inner[0].y));
  for (let i = 1; i <= TRACK_SAMPLES; i++) {
    ctx.lineTo(toMx(inner[i].x), toMy(inner[i].y));
  }
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

  const span = 1 - t0;
  const n = Math.max(2, Math.ceil(span * TRACK_SAMPLES));
  const at = (i, offset) => {
    const p = shape.getPosition(t0 + (span * i) / n, offset);
    return { x: toMx(p.x), y: toMy(p.y) };
  };

  ctx.beginPath();
  let p = at(0, -0.5);
  ctx.moveTo(p.x, p.y);
  for (let i = 1; i <= n; i++) {
    p = at(i, -0.5);
    ctx.lineTo(p.x, p.y);
  }
  for (let i = n; i >= 0; i--) {
    p = at(i, 0.5);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = TAIL_WASH;
  ctx.fill();
}

/** The bar across the band at `t`, inner edge to outer edge, already in panel pixels. */
function bandBarAt(shape, t, toMx, toMy) {
  const innerPt = shape.getPosition(t, -0.5);
  const outerPt = shape.getPosition(t, 0.5);
  return {
    ax: toMx(innerPt.x),
    ay: toMy(innerPt.y),
    bx: toMx(outerPt.x),
    by: toMy(outerPt.y),
  };
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
