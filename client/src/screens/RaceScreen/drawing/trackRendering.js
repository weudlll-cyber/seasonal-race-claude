import { getBackgroundImage } from '../../../modules/track-effects/bgImageCache.js';

const CANVAS_W = 1280;

/**
 * Draws the animated stadium background — gradient sky, stars, crowd, and sun.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} frame  Current timestamp / frame counter for animation.
 * @param {string|null} bgPath  URL of a custom background image, or null for the default gradient.
 * @param {number} [ww=CANVAS_W]  World (canvas) width in pixels.
 * @param {number} [wh=720]  World (canvas) height in pixels.
 */
export function drawEditorBackground(ctx, frame, bgPath, ww = CANVAS_W, wh = 720) {
  const bgImg = bgPath ? getBackgroundImage(bgPath) : null;
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, ww, wh);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, ww, wh);
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
 * Draws the closed-track finish-line checkerboard at T=0.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} shape  EditorShape instance.
 */
export function drawEditorTrackSurface(ctx, shape) {
  // Boundary lines and lane fill removed — replaced by track-light dots.
  // Only the finish line is drawn here.
  const pOuter = shape.getPosition(0, 1.0);
  const pInner = shape.getPosition(0, -1.0);
  const dx = pOuter.x - pInner.x,
    dy = pOuter.y - pInner.y;
  const segments = 8;
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ffd700';
  for (let i = 0; i < segments; i++) {
    const f0 = i / segments,
      f1 = (i + 1) / segments;
    ctx.fillStyle = i % 2 === 0 ? '#fff' : '#222';
    ctx.beginPath();
    ctx.moveTo(pInner.x + dx * f0, pInner.y + dy * f0);
    ctx.lineTo(pInner.x + dx * f1, pInner.y + dy * f1);
    const perp = pInner.angle + Math.PI / 2;
    const hw = 7;
    ctx.lineTo(pInner.x + dx * f1 + Math.cos(perp) * hw, pInner.y + dy * f1 + Math.sin(perp) * hw);
    ctx.lineTo(pInner.x + dx * f0 + Math.cos(perp) * hw, pInner.y + dy * f0 + Math.sin(perp) * hw);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  const midX = (pOuter.x + pInner.x) / 2,
    midY = (pOuter.y + pInner.y) / 2;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('FINISH', midX, midY - 8);
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
export function drawOpenTrackFinishLine(ctx, shape, ft, hw) {
  // Use the LOCAL track angle at ft so the finish line is always perpendicular
  // to the track direction at the actual finish position, regardless of how
  // much the track curves between the midpoint and the finish.
  const center = shape.getPosition(ft, 0);
  const localAngle = center.angle;
  const perpCos = Math.cos(localAngle + Math.PI / 2);
  const perpSin = Math.sin(localAngle + Math.PI / 2);
  const fwdCos = Math.cos(localAngle);
  const fwdSin = Math.sin(localAngle);
  const pInner = {
    x: center.x - perpCos * hw,
    y: center.y - perpSin * hw,
  };
  const pOuter = {
    x: center.x + perpCos * hw,
    y: center.y + perpSin * hw,
  };
  const dx = pOuter.x - pInner.x,
    dy = pOuter.y - pInner.y;
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const f0 = i / segments,
      f1 = (i + 1) / segments;
    ctx.fillStyle = i % 2 === 0 ? '#fff' : '#222';
    ctx.beginPath();
    ctx.moveTo(pInner.x + dx * f0, pInner.y + dy * f0);
    ctx.lineTo(pInner.x + dx * f1, pInner.y + dy * f1);
    // Stripe depth runs along the forward direction (⊥ to the finish line).
    const stripeHW = 7;
    ctx.lineTo(pInner.x + dx * f1 + fwdCos * stripeHW, pInner.y + dy * f1 + fwdSin * stripeHW);
    ctx.lineTo(pInner.x + dx * f0 + fwdCos * stripeHW, pInner.y + dy * f0 + fwdSin * stripeHW);
    ctx.closePath();
    ctx.fill();
  }
  // Gold border — replaces ctx.shadowBlur (which forced an offscreen compositor pass
  // every frame). Thick stroke drawn once; same visual read as the former glow.
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pInner.x, pInner.y);
  ctx.lineTo(pOuter.x, pOuter.y);
  ctx.lineTo(pOuter.x + fwdCos * 7, pOuter.y + fwdSin * 7);
  ctx.lineTo(pInner.x + fwdCos * 7, pInner.y + fwdSin * 7);
  ctx.closePath();
  ctx.stroke();
  const midX = (pOuter.x + pInner.x) / 2,
    midY = (pOuter.y + pInner.y) / 2;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('FINISH', midX, midY - 8);
}
