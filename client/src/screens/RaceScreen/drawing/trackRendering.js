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
 * ── WHAT IT DRAWS NOW: HIS RULING, WHICH IS "STRUCTURE AT THE EDGES ONLY" ──────────────────────
 *
 * Two checkered posts, one at each edge of the corridor, running along the FORWARD direction — so
 * the finish reads as a gate the racers pass between, and **nothing crosses the racing surface**.
 * The gold rule that used to be a shadow blur is drawn as a thin line joining the two posts at the
 * line itself; it marks WHERE the finish is without covering what happens on it.
 *
 * ── AND IT SURVIVES ZOOMING OUT, WHICH IS WHY IT TAKES THE ZOOM ────────────────────────────────
 *
 * A world-sized mark shrinks with the shot: at the widest overview the FINISH label measures 3.9 px,
 * which is the owner's "it is not there". Every dimension below is therefore a SCREEN size converted
 * back into world units through the effective zoom, so the gate is the same size on screen at every
 * shot. `drawTrackLights` already takes the zoom for the same reason, so this is the established
 * shape rather than a new idea.
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
  // FORWARD, not the perpendicular. This is the whole repair.
  const fx = Math.cos(fwdAngle);
  const fy = Math.sin(fwdAngle);

  // ── SCREEN SIZES, held constant, converted back to world through the zoom ───────────────────
  const sx = effZoomX > 0 ? effZoomX : 1;
  const sy = effZoomY > 0 ? effZoomY : 1;
  // One checker is this many screen px on its shorter side; a post is three of them deep. Small
  // enough to sit beside a corridor at the tightest shot, large enough to survive the widest.
  const CHECKER_SCREEN_PX = 9;
  const cw = CHECKER_SCREEN_PX / sx; // world px per checker, across the track
  const ch = CHECKER_SCREEN_PX / sy; // world px per checker, along the track
  // A post is never wider than a quarter of the corridor: on a narrow track the screen-derived size
  // would otherwise reach across, and reaching across is the one thing his ruling forbids.
  const postW = Math.min(cw, span / 4);
  const ROWS = 3;

  const square = (ox, oy, w, h, colour) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + ux * w, oy + uy * w);
    ctx.lineTo(ox + ux * w + fx * h, oy + uy * w + fy * h);
    ctx.lineTo(ox + fx * h, oy + fy * h);
    ctx.closePath();
    ctx.fill();
  };

  // Two posts: one growing INWARD from each edge, so the gap between them is the racing surface.
  for (const side of [0, 1]) {
    const baseX = side === 0 ? pInner.x : pOuter.x - ux * postW;
    const baseY = side === 0 ? pInner.y : pOuter.y - uy * postW;
    for (let r = 0; r < ROWS; r++) {
      // Centred on the line along the forward axis, so the gate straddles the finish rather than
      // sitting behind it.
      const off = (r - ROWS / 2) * ch;
      square(baseX + fx * off, baseY + fy * off, postW, ch, (r + side) % 2 === 0 ? '#fff' : '#222');
    }
  }

  // The rule ACROSS the line — a hairline, so it says where the finish is without covering it.
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = Math.max(1 / sx, 1 / sy);
  ctx.beginPath();
  ctx.moveTo(pInner.x, pInner.y);
  ctx.lineTo(pOuter.x, pOuter.y);
  ctx.stroke();

  // The label, at the same screen size at every zoom — the reason he could not see it at 3.9 px.
  const midX = (pOuter.x + pInner.x) / 2;
  const midY = (pOuter.y + pInner.y) / 2;
  const LABEL_SCREEN_PX = 13;
  ctx.save();
  ctx.translate(midX, midY);
  ctx.scale(1 / sx, 1 / sy);
  ctx.font = `bold ${LABEL_SCREEN_PX}px sans-serif`;
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('FINISH', 0, -(ROWS / 2) * ch * sy - 4);
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
