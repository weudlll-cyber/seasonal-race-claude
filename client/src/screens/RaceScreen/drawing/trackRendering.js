// ============================================================
// File:        trackRendering.js
// Path:        client/src/screens/RaceScreen/drawing/trackRendering.js
// Project:     RaceArena
// Created:     2026-05-25
// Description: Canvas renderer for track geometry, background image (pre-darkened
//              cache), and track lighting.
// ============================================================

import { REFERENCE_CANVAS_W } from '../../../modules/camera/projection.js';

import { getBackgroundImage } from '../../../modules/track-effects/bgImageCache.js';

const CANVAS_W = REFERENCE_CANVAS_W;

// Pre-darkened background cache — keyed by `${path}_${ww}x${wh}`.
// Each entry is an OffscreenCanvas with rgba(0,0,0,0.25) baked in once at load.
const _darkenedBgCache = new Map();

export function getBgCanvasReady(bgImg, path, ww, wh) {
  const key = `${path}_${ww}x${wh}`;
  const cached = _darkenedBgCache.get(key);
  if (cached) return cached;

  if (typeof OffscreenCanvas === 'undefined') return null;

  const oc = new OffscreenCanvas(ww, wh);
  const octx = oc.getContext('2d');
  octx.drawImage(bgImg, 0, 0, ww, wh);
  octx.fillStyle = 'rgba(0,0,0,0.25)';
  octx.fillRect(0, 0, ww, wh);
  _darkenedBgCache.set(key, oc);
  return oc;
}

/**
 * Draws the animated stadium background — gradient sky, stars, crowd, and sun.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} frame  Current timestamp / frame counter for animation.
 * @param {string|null} bgPath  URL of a custom background image, or null for the default gradient.
 * @param {number} [ww=CANVAS_W]  World (canvas) width in pixels.
 * @param {number} [wh=720]  World (canvas) height in pixels.
 */
export function drawEditorBackground(
  ctx,
  frame,
  bgPath,
  ww = CANVAS_W,
  wh = 720,
  skipImageBlit = false
) {
  const bgImg = bgPath ? getBackgroundImage(bgPath) : null;
  if (bgImg) {
    if (!skipImageBlit) {
      const darkened = getBgCanvasReady(bgImg, bgPath, ww, wh);
      if (darkened) {
        ctx.drawImage(darkened, 0, 0);
      } else {
        // OffscreenCanvas unavailable — fall back to original two-step draw
        ctx.drawImage(bgImg, 0, 0, ww, wh);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, 0, ww, wh);
      }
    }
  } else {
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.0006);
    const grad = ctx.createLinearGradient(0, 0, ww, wh);
    grad.addColorStop(0, '#0a0414');
    grad.addColorStop(0.5, `hsl(248,${20 + pulse * 10}%,${8 + pulse * 3}%)`);
    grad.addColorStop(1, '#0a0414');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ww, wh);
  }
  const stars = [
    [80, 35],
    [180, 18],
    [310, 48],
    [470, 12],
    [620, 42],
    [770, 22],
    [920, 55],
    [1060, 15],
    [1190, 38],
    [40, 62],
    [390, 68],
    [730, 70],
    [1100, 50],
  ];
  for (const [sx, sy] of stars) {
    ctx.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(frame * 0.001 + sx * 0.05));
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx * (ww / CANVAS_W), sy, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(14,7,2,0.92)';
  ctx.fillRect(0, 0, ww, 58);
  // Crowd members span full world width
  const crowdCount = Math.max(60, Math.ceil((ww / CANVAS_W) * 60));
  for (let i = 0; i < crowdCount; i++) {
    const cx = (i * 137.5) % ww;
    const phase = i * 0.41;
    const size = 6 + (i % 4);
    const bob = Math.sin(frame * 0.003 + phase) * 2;
    ctx.fillStyle = `hsl(${20 + ((size * 7) % 30)},30%,${18 + (size % 4) * 3}%)`;
    ctx.beginPath();
    ctx.ellipse(cx, 50 + bob, size * 0.6, size, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(200,130,40,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 58);
  ctx.lineTo(ww, 58);
  ctx.stroke();
  const sunX = ww * 0.9,
    sunY = 28,
    sunR = 18;
  const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3);
  sg.addColorStop(0, 'rgba(255,220,80,0.55)');
  sg.addColorStop(0.4, 'rgba(255,160,30,0.2)');
  sg.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,140,0.9)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * THE FINISH GATE on a closed track — FINISH-READABLE-1.
 *
 * ── WHAT WAS HERE BEFORE PAINTED NOTHING, AND THAT IS NOT A FIGURE OF SPEECH ───────────────────
 *
 * The old checkerboard issued eight `fill()` calls whose paths enclosed **zero area**. Measured off
 * the recorded draw stream on all five closed tracks: mean quad area **0.000–0.001 world px²**
 * where the shape implies 229–369. The five OPEN tracks paint 218–262 px² and were always fine.
 *
 * THE CAUSE, in one line: the stripe depth was taken along `angle + PI/2` — which is the direction
 * the finish line ALREADY RUNS, because the line is `getPosition(0, +w)` minus `getPosition(0, -w)`,
 * i.e. the across-track perpendicular. Extruding a segment along itself gives a parallelogram with
 * two parallel edges and no area. `drawOpenTrackFinishLine` extrudes along `localAngle` — the
 * FORWARD direction — which is why the open tracks were never affected. The owner's screenshot shows
 * the gold FINISH label and no band because the label is drawn separately and was never broken.
 *
 * A SECOND ERROR RODE ALONG WITH IT: the line was built from `getPosition(0, ±1.0)`, and that offset
 * scales by `_centerWidth`, which IS the track width — so the band spanned TWICE the corridor,
 * overhanging it by half a width on each side. The edges are `±0.5`.
 *
 * ── WHAT "EDGES ONLY" GOT WRONG, AND IT WAS A MISREADING (FINISH-READABLE-2) ────────────────────
 *
 * FINISH-READABLE-1 read his ruling as "structure at the edges only" and DELETED the ground band
 * instead of repairing it, leaving two checkered posts and a hairline. His verdict on that, on
 * dirt-oval and garden-path: "a very thin, barely visible line, otherwise nothing has changed. I see
 * nothing."
 *
 * What he had rejected was a GANTRY — a structure standing OVER the track, which would hide the
 * racers passing under it. "Structure at the edges" was about things standing UP. **A flat marking
 * painted ON the racing surface covers nobody**: the racers drive over it, as in a real race. So the
 * band is back, across the full corridor, and the posts stay because he said they are good.
 *
 * THE RACING SURFACE STAYS CLEAR OF ANYTHING STANDING UP. Everything here is paint on the ground,
 * issued before `drawRacers`, and that ordering is MEASURED rather than asserted — see the band
 * block below.
 *
 * ── AND IT SURVIVES ZOOMING OUT, WHICH IS WHY IT TAKES THE ZOOM ────────────────────────────────
 *
 * A world-sized mark shrinks with the shot: at the widest overview the FINISH label measured 3.9 px,
 * which is the owner's "it is not there". Every dimension below is therefore a SCREEN size converted
 * back into world units through the effective zoom, so the marking is the same size on screen at
 * every shot. `drawTrackLights` already takes the zoom for the same reason, so this is the
 * established shape rather than a new idea. That half of FINISH-READABLE-1 was right and stays; what
 * changed is the SIZES, which had been chosen to sit BESIDE the corridor rather than to be read.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} shape  EditorShape instance.
 * @param {number} effZoomX  world→screen scale on X, so screen sizes can be held constant.
 * @param {number} effZoomY  the same on Y; a closed track's mapping is anisotropic.
 */
export function drawEditorTrackSurface(ctx, shape, effZoomX = 1, effZoomY = 1) {
  // The TRUE corridor edges. `offset` scales by `_centerWidth` (the track width), so ±0.5 is ±half
  // a width — the edge. The old ±1.0 was a full width each way.
  const pOuter = shape.getPosition(0, 0.5);
  const pInner = shape.getPosition(0, -0.5);
  drawFinishGate(ctx, pInner, pOuter, pInner.angle, effZoomX, effZoomY);
}

/**
 * The gate itself, shared by both topologies so there is ONE finish marking in the game rather than
 * two that drift apart — which is exactly how the closed one came to be broken while the open one
 * was not.
 *
 * @param {{x:number,y:number}} pInner  one edge of the corridor at the line
 * @param {{x:number,y:number}} pOuter  the other
 * @param {number} fwdAngle  the track's forward direction at the line, in world radians
 */
export function drawFinishGate(ctx, pInner, pOuter, fwdAngle, effZoomX, effZoomY) {
  const dx = pOuter.x - pInner.x;
  const dy = pOuter.y - pInner.y;
  const span = Math.hypot(dx, dy);
  if (!(span > 0)) return;
  const ux = dx / span;
  const uy = dy / span;
  // FORWARD, not the perpendicular. This was FINISH-READABLE-1's repair and it stays.
  const fx = Math.cos(fwdAngle);
  const fy = Math.sin(fwdAngle);

  // ── SCREEN SIZES, CONVERTED ALONG THE DIRECTION THEY ARE MEASURED IN ─────────────────────────
  //
  // The world→screen scale is ANISOTROPIC on a closed track, so "screen px per world px" is not one
  // number — it depends on which way you are pointing. FINISH-READABLE-1 divided by `effZoomX` for
  // the across size and `effZoomY` for the along size, which is only correct when the track happens
  // to run along a screen axis. The right conversion projects the direction through both scales.
  const sx = effZoomX > 0 ? effZoomX : 1;
  const sy = effZoomY > 0 ? effZoomY : 1;
  const sAlong = Math.hypot(fx * sx, fy * sy); // screen px per world px, along the track
  const sAcross = Math.hypot(ux * sx, uy * sy); // screen px per world px, across it
  if (!(sAlong > 0) || !(sAcross > 0)) return;

  // ── HOW DEEP THE BAND IS, AND WHY THESE NUMBERS ─────────────────────────────────────────────
  //
  // 30 screen px, two rows of 15. The owner's verdict on the 9 px version was "a very thin, barely
  // visible line … I see nothing", and 9 px is what a marking measures when its size was chosen to
  // sit BESIDE the corridor rather than to be read. Measured against the corridor's own screen
  // width, 30 px is about 1:22 at the mid-race shot — the proportion a real finish line has against
  // a real road, which is the thing it has to look like.
  const BAND_SCREEN_PX = 30;
  const ROWS = 2;
  // NEVER DEEPER THAN HALF THE ROAD IS WIDE. At the widest overview the corridor is only tens of
  // screen px across, so an unclamped 30 px band would be deeper than the road is wide and would
  // stop reading as a LINE and start reading as a blob straddling the track. This is the one bound
  // that is geometry rather than taste, and it is the reason the reported depth differs between the
  // three shots even though the nominal size does not.
  const depth = Math.min(BAND_SCREEN_PX / sAlong, span * 0.5);
  const rowDepth = depth / ROWS;

  // Columns across the corridor, sized so a checker is SQUARE ON SCREEN — a checkerboard whose
  // squares are not square stops reading as one. Capped so the tightest shot cannot ask for
  // hundreds of quads; past the cap the squares simply get wider, which still reads.
  const COLS_MAX = 48;
  const COLS_MIN = 4;
  const colTarget = (rowDepth * sAlong) / sAcross; // world px per column for a square checker
  const cols = Math.max(COLS_MIN, Math.min(COLS_MAX, Math.round(span / colTarget)));
  const colW = span / cols; // exact, so the band ends flush with both corridor edges

  /** One quad, laid out on the ground: `w` across the track, `h` along it, from a corner. */
  const quad = (ox, oy, w, h, colour) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + ux * w, oy + uy * w);
    ctx.lineTo(ox + ux * w + fx * h, oy + uy * w + fy * h);
    ctx.lineTo(ox + fx * h, oy + fy * h);
    ctx.closePath();
    ctx.fill();
  };

  // ── THE BAND, ACROSS THE WHOLE CORRIDOR, FLAT ON THE RACING SURFACE ─────────────────────────
  //
  // It is PAINT. A racer drives over it exactly as in a real race, and it covers nobody — this is
  // called before `drawRacers`, so every racer is drawn on top. That ordering is not an assumption:
  // `scripts/finish-band-truth.mjs` renders a real frame at the tightest endgame zoom and compares
  // the band's last draw index against the first draw issued at any racer's own world position.
  //
  // WHAT WENT WRONG BEFORE, so it is not repeated: his rejection of a GANTRY — a structure standing
  // OVER the track, which would hide the racers passing under it — was read as "edges only", and the
  // ground band was deleted rather than repaired. A flat marking on the surface was never what he
  // objected to. "Structure at the edges" was about things standing UP.
  const startX = pInner.x - fx * (depth / 2);
  const startY = pInner.y - fy * (depth / 2);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const ox = startX + ux * (c * colW) + fx * (r * rowDepth);
      const oy = startY + uy * (c * colW) + fy * (r * rowDepth);
      quad(ox, oy, colW, rowDepth, (r + c) % 2 === 0 ? '#fff' : '#151515');
    }
  }

  // ── THE EDGE POSTS, KEPT — he said they are good ─────────────────────────────────────────────
  //
  // They now flank the band rather than replacing it: the same checker pattern, but reaching
  // further ALONG the track at each corridor edge, so the finish reads as a gate the field passes
  // between. Still flat paint, still under the racers, and still at the edges where nothing races.
  const POST_DEPTH_MULT = 1.9;
  const postDepth = depth * POST_DEPTH_MULT;
  const postW = Math.min(colW * 1.25, span / 6);
  const postRows = 4;
  const postRow = postDepth / postRows;
  for (const side of [0, 1]) {
    const baseX = side === 0 ? pInner.x : pOuter.x - ux * postW;
    const baseY = side === 0 ? pInner.y : pOuter.y - uy * postW;
    for (let r = 0; r < postRows; r++) {
      const off = (r - postRows / 2) * postRow;
      quad(
        baseX + fx * off,
        baseY + fy * off,
        postW,
        postRow,
        (r + side) % 2 === 0 ? '#fff' : '#151515'
      );
    }
  }

  // ── THE GOLD ACCENT, KEPT AND WIDENED ────────────────────────────────────────────────────────
  //
  // It bisects the band at the exact finish line, so the band says "this is the finish" and the gold
  // says "and this is the line". At 1 px it was the hairline he complained about; at 2.5 screen px it
  // reads at the widest overview and still cannot hide a racer, being under them like everything
  // else here.
  const GOLD_SCREEN_PX = 2.5;
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = GOLD_SCREEN_PX / Math.max(sAlong, 1e-6);
  ctx.beginPath();
  ctx.moveTo(pInner.x, pInner.y);
  ctx.lineTo(pOuter.x, pOuter.y);
  ctx.stroke();

  // ── THE LABEL ────────────────────────────────────────────────────────────────────────────────
  //
  // 20 screen px, held constant through the inverse scale. It measured 3.9 px before
  // FINISH-READABLE-1 and 13 px after, and 13 was still inside the picture he called empty. It sits
  // clear of the band along the track, so it labels the line without sitting on it.
  const midX = (pOuter.x + pInner.x) / 2;
  const midY = (pOuter.y + pInner.y) / 2;
  const LABEL_SCREEN_PX = 20;
  ctx.save();
  ctx.translate(midX, midY);
  ctx.scale(1 / sx, 1 / sy);
  ctx.font = `bold ${LABEL_SCREEN_PX}px sans-serif`;
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('FINISH', 0, -(postDepth / 2) * sAlong - 6);
  ctx.restore();
}

/**
 * Draws the open-track finish-line checkerboard at the given T fraction.
 * Direction vectors are derived from the local track angle at ft so the line
 * is perpendicular to the track at any finish position.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} shape  EditorShape instance.
 * @param {number} ft  T-fraction where the finish line sits (0–1).
 * @param {number} hw  Half-width of the track in world pixels.
 */
export function drawOpenTrackFinishLine(ctx, shape, ft, hw, effZoomX = 1, effZoomY = 1) {
  // Use the LOCAL track angle at ft so the finish line is always perpendicular to the track
  // direction at the actual finish position, regardless of how much the track curves between the
  // midpoint and the finish.
  const center = shape.getPosition(ft, 0);
  const localAngle = center.angle;
  const perpCos = Math.cos(localAngle + Math.PI / 2);
  const perpSin = Math.sin(localAngle + Math.PI / 2);
  // FINISH-READABLE-1: the SAME gate the closed tracks draw. It was a second implementation of one
  // marking, and the two had already drifted — the closed one extruded its stripes along the finish
  // line instead of along the track and had been painting zero-area quads on all five closed tracks.
  // One function now, so a repair to the finish cannot reach half the game.
  drawFinishGate(
    ctx,
    { x: center.x - perpCos * hw, y: center.y - perpSin * hw },
    { x: center.x + perpCos * hw, y: center.y + perpSin * hw },
    localAngle,
    effZoomX,
    effZoomY
  );
}
