// ============================================================
// File:        CityEnvironment.js
// Path:        client/src/modules/environments/CityEnvironment.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: City environment — building silhouettes with flickering
//              windows outside the track, streetlights inside, dashed
//              lane centre lines, and optional rain particles.
// ============================================================

// Building silhouettes (x fraction, y fraction from bottom, width, height fractions)
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

// Window grid seeds
const WINDOWS = Array.from({ length: 80 }, (_, i) => ({
  bldgIdx: i % BUILDINGS.length,
  col: (i * 3) % 5,
  row: (i * 7) % 8,
  phase: i * 0.41,
  offRate: 0.003 + (i % 5) * 0.002,
}));

// Rain drops
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
        bw = b.w * cw;
      const bh = b.h * ch;
      const by = groundY - bh;
      ctx.fillStyle = '#0f0f18';
      ctx.fillRect(bx, by, bw, bh + 10);
    }

    // Flickering windows on buildings
    for (const w of WINDOWS) {
      const b = BUILDINGS[w.bldgIdx];
      const bx = b.x * cw,
        bw = b.w * cw;
      const bh = b.h * ch;
      const by = ch * 0.72 - bh;
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

  drawTrackSurface(ctx, shape, totalLanes, frame) {
    const { outer, inner } = shape.getEdgePoints(totalLanes, 150);
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.002);

    // Asphalt fill
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    for (const p of [...inner].reverse()) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = '#1c1c24';
    ctx.fill();

    // Dashed centre line per lane
    const nLines = totalLanes - 1;
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    for (let li = 1; li <= nLines; li++) {
      const frac = li / (nLines + 1);
      ctx.beginPath();
      let first = true;
      for (let i = 0; i < outer.length; i++) {
        const po = outer[i],
          pi_ = inner[i];
        const x = po.x + (pi_.x - po.x) * frac;
        const y = po.y + (pi_.y - po.y) * frac;
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Streetlights along the inner edge (dots with glow)
    for (let i = 0; i < inner.length; i += 15) {
      const p = inner[i];
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(frame * 0.002 + i * 0.4);
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffee88';
      ctx.fillStyle = '#ffee88';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Glowing road edge borders
    ctx.shadowBlur = 14 + 6 * pulse;
    ctx.shadowColor = '#4466ff';
    ctx.strokeStyle = `rgba(80,110,255,${0.75 + 0.2 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#2244cc';
    ctx.strokeStyle = `rgba(60,90,200,0.65)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(inner[0].x, inner[0].y);
    for (const p of inner.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    this._drawFinishLine(ctx, shape, totalLanes);
  }

  _drawFinishLine(ctx, shape, totalLanes) {
    const pO = shape.getPosition(0, totalLanes - 1, totalLanes);
    const pI = shape.getPosition(0, 0, totalLanes);
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
