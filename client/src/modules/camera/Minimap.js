export const MINIMAP_W = 280;
export const MINIMAP_H = 160;
export const MINIMAP_MARGIN = 14;

const PADDING = 6;
const TRACK_SAMPLES = 80;

/**
 * Renders a picture-in-picture minimap in the bottom-left corner of the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ getBoundingBox, getEdgePoints, isOpen }} shape
 * @param {Array<{x:number, y:number, color:string}>} racers
 * @param {number} leaderIndex  Index of the leading racer in the racers array
 * @param {number} canvasW
 * @param {number} canvasH
 */
export function renderMinimap(ctx, shape, racers, leaderIndex, canvasW, canvasH) {
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

  // Racer dots
  for (let i = 0; i < racers.length; i++) {
    const r = racers[i];
    const isLeader = i === leaderIndex;
    const mapX = toMx(r.x);
    const mapY = toMy(r.y);

    ctx.beginPath();
    ctx.arc(mapX, mapY, isLeader ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = r.color ?? '#fff';
    ctx.fill();

    if (isLeader) {
      ctx.beginPath();
      ctx.arc(mapX, mapY, 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.restore();
}
