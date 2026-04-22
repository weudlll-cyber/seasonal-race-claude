// Building silhouettes
const BUILDINGS = [
  { x: 0.02, w: 0.06, h: 0.28 },
  { x: 0.09, w: 0.04, h: 0.35 },
  { x: 0.14, w: 0.05, h: 0.22 },
  { x: 0.2, w: 0.07, h: 0.4 },
  { x: 0.28, w: 0.04, h: 0.25 },
  { x: 0.33, w: 0.06, h: 0.32 },
  { x: 0.4, w: 0.05, h: 0.42 },
  { x: 0.46, w: 0.04, h: 0.28 },
  { x: 0.52, w: 0.06, h: 0.38 },
  { x: 0.59, w: 0.05, h: 0.24 },
  { x: 0.65, w: 0.07, h: 0.44 },
  { x: 0.73, w: 0.04, h: 0.3 },
  { x: 0.78, w: 0.06, h: 0.36 },
  { x: 0.85, w: 0.05, h: 0.26 },
  { x: 0.91, w: 0.08, h: 0.42 },
];

const WINDOWS = Array.from({ length: 80 }, (_, i) => ({
  bldgIdx: i % BUILDINGS.length,
  col: (i * 3) % 5,
  row: (i * 7) % 8,
  phase: i * 0.41,
  offRate: 0.003 + (i % 5) * 0.002,
}));

const RAIN = Array.from({ length: 60 }, (_, i) => ({
  x: (i * 0.0167) % 1,
  y: (i * 0.023) % 1,
  len: 6 + (i % 5) * 2,
  speed: 4 + (i % 4),
}));

export class CityEnvironment {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
  }

  drawBackground(ctx, frame) {
    const { cw, ch } = this;

    // Night sky
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, '#080810');
    grad.addColorStop(0.6, '#0c0c18');
    grad.addColorStop(1, '#111118');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Building silhouettes
    const groundY = ch * 0.72;
    for (const b of BUILDINGS) {
      const bx = b.x * cw,
        bw = b.w * cw,
        bh = b.h * ch,
        by = groundY - bh;
      ctx.fillStyle = '#0f0f18';
      ctx.fillRect(bx, by, bw, bh + 10);
    }

    // Flickering windows
    for (const w of WINDOWS) {
      const b = BUILDINGS[w.bldgIdx];
      const bx = b.x * cw,
        bw = b.w * cw,
        bh = b.h * ch,
        by = ch * 0.72 - bh;
      const cols = Math.max(1, Math.floor(bw / 10));
      const rows = Math.max(1, Math.floor(bh / 14));
      if (w.col >= cols || w.row >= rows) continue;
      const on = Math.sin(frame * w.offRate + w.phase) > -0.2;
      if (!on) continue;
      const wx = bx + (w.col + 0.5) * (bw / cols) - 2;
      const wy = by + (w.row + 0.5) * (bh / rows) - 2;
      const warm = w.row % 3 === 0;
      ctx.fillStyle = warm ? 'rgba(255,220,120,0.8)' : 'rgba(120,180,255,0.6)';
      ctx.fillRect(wx, wy, 4, 4);
    }

    // Rain
    ctx.strokeStyle = 'rgba(140,180,255,0.18)';
    ctx.lineWidth = 1;
    for (const r of RAIN) {
      const rx = (r.x * cw + frame * 0.3) % cw;
      const ry = (r.y * ch + frame * r.speed * 0.08) % ch;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 2, ry + r.len);
      ctx.stroke();
    }

    // Top strip
    ctx.fillStyle = 'rgba(6,6,12,0.92)';
    ctx.fillRect(0, 0, cw, 58);
    ctx.strokeStyle = 'rgba(100,120,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 58);
    ctx.lineTo(cw, 58);
    ctx.stroke();
  }

  drawTrackSurface(ctx, shape, trackWidth, frame) {
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.002);
    const path2D = shape.getPath2D();

    // Blue neon boundary with glow — drawn first, slightly wider
    ctx.save();
    ctx.shadowBlur = 14 + 6 * pulse;
    ctx.shadowColor = '#4488ff';
    ctx.strokeStyle = `rgba(80,110,255,${0.75 + 0.2 * pulse})`;
    ctx.lineWidth = trackWidth + 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path2D);
    ctx.restore();

    // Dark asphalt track surface
    ctx.save();
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = trackWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path2D);
    ctx.restore();

    // White dashed center line along the path
    ctx.save();
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke(path2D);
    ctx.setLineDash([]);
    ctx.restore();

    // Streetlights along the inner edge
    const nLights = 10;
    for (let i = 0; i < nLights; i++) {
      const pos = shape.getPosition(i / nLights, -1.0, trackWidth);
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(frame * 0.002 + i * 0.4);
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffee88';
      ctx.fillStyle = '#ffee88';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    this._drawFinishLine(ctx, shape, trackWidth);
  }

  _drawFinishLine(ctx, shape, trackWidth) {
    const pO = shape.getPosition(0, 1.0, trackWidth);
    const pI = shape.getPosition(0, -1.0, trackWidth);
    const dx = pO.x - pI.x,
      dy = pO.y - pI.y;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffd700';
    const perp = Math.atan2(dy, dx) + Math.PI / 2;
    const hw = 6;
    for (let i = 0; i < 8; i++) {
      const f0 = i / 8,
        f1 = (i + 1) / 8;
      ctx.fillStyle = i % 2 === 0 ? '#fff' : '#111';
      ctx.beginPath();
      ctx.moveTo(pI.x + dx * f0, pI.y + dy * f0);
      ctx.lineTo(pI.x + dx * f1, pI.y + dy * f1);
      ctx.lineTo(pI.x + dx * f1 + Math.cos(perp) * hw, pI.y + dy * f1 + Math.sin(perp) * hw);
      ctx.lineTo(pI.x + dx * f0 + Math.cos(perp) * hw, pI.y + dy * f0 + Math.sin(perp) * hw);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}
