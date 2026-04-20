// ============================================================
// File:        RiverEnvironment.js
// Path:        client/src/modules/environments/RiverEnvironment.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: River environment — animated flowing water with sine-wave
//              surface lines, colour-shifting teal/blue tones, rising
//              bubbles, shimmer reflections, and foam at track edges.
// ============================================================

const N_BUBBLES = 18;
const N_REFLECTIONS = 12;

export class RiverEnvironment {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    // Pre-seeded bubbles with random-ish positions
    this.bubbles = Array.from({ length: N_BUBBLES }, (_, i) => ({
      x: (i * 97.3) % 1, // fraction of track width — resolved each draw
      y: (i * 61.7) % 1,
      r: 2 + (i % 4),
      phase: i * 0.53,
      speed: 0.4 + (i % 3) * 0.2,
    }));
    this.reflections = Array.from({ length: N_REFLECTIONS }, (_, i) => ({
      x: (i * 137) % 1,
      y: (i * 79) % 1,
      phase: i * 0.87,
    }));
  }

  drawBackground(ctx, frame) {
    const { cw, ch } = this;

    // Deep river-bank gradient
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    const hue = 180 + 20 * Math.sin(frame * 0.0004);
    grad.addColorStop(0, `hsl(${hue},40%,6%)`);
    grad.addColorStop(0.5, `hsl(${hue + 15},35%,10%)`);
    grad.addColorStop(1, `hsl(${hue},40%,6%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Lily pad dots scattered around (outside track band area)
    const pads = [
      [60, 90],
      [200, 130],
      [400, 80],
      [700, 140],
      [1000, 95],
      [1150, 120],
      [300, 600],
      [650, 620],
      [950, 600],
    ];
    for (const [px, py] of pads) {
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(frame * 0.002 + px * 0.01);
      ctx.fillStyle = '#2a8c3f';
      ctx.beginPath();
      ctx.ellipse(px, py, 14, 9, px * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // River-bank strip at top
    ctx.fillStyle = 'rgba(10,30,20,0.9)';
    ctx.fillRect(0, 0, cw, 58);
    ctx.strokeStyle = 'rgba(30,180,120,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 58);
    ctx.lineTo(cw, 58);
    ctx.stroke();
  }

  drawTrackSurface(ctx, shape, totalLanes, frame) {
    const { outer, inner } = shape.getEdgePoints(totalLanes, 150);

    // === Riverbank infield (dark land contrasts with the water track band) ===
    ctx.beginPath();
    ctx.moveTo(inner[0].x, inner[0].y);
    for (const p of inner.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = '#0d2e0a';
    ctx.fill();

    // === Water fill ===
    const waterHue = 195 + 15 * Math.sin(frame * 0.0005);
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    for (const p of [...inner].reverse()) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = `hsl(${waterHue},55%,22%)`;
    ctx.fill();

    // === Animated sine-wave surface lines (flow direction) ===
    const nLines = 6;
    for (let li = 0; li < nLines; li++) {
      const frac = (li + 0.5) / nLines;
      ctx.beginPath();
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(frame * 0.002 + li);
      ctx.strokeStyle = `hsl(${waterHue + 10},70%,72%)`;
      ctx.lineWidth = 1;
      let first = true;
      const nPts = 80;
      for (let pi = 0; pi <= nPts; pi++) {
        const t = pi / nPts;
        const po = outer[Math.round(t * (outer.length - 1))];
        const pi_ = inner[Math.round(t * (inner.length - 1))];
        const px = po.x + (pi_.x - po.x) * frac;
        const py = po.y + (pi_.y - po.y) * frac;
        // Apply wave offset perpendicular to path direction
        const waveOff = 4 * Math.sin(t * Math.PI * 8 + frame * 0.004);
        const idx = Math.round(t * (outer.length - 1));
        const ang = outer[idx]
          ? Math.atan2(
              outer[Math.min(idx + 1, outer.length - 1)].y - outer[Math.max(idx - 1, 0)].y,
              outer[Math.min(idx + 1, outer.length - 1)].x - outer[Math.max(idx - 1, 0)].x
            ) +
            Math.PI / 2
          : 0;
        const wx = px + Math.cos(ang) * waveOff;
        const wy = py + Math.sin(ang) * waveOff;
        if (first) {
          ctx.moveTo(wx, wy);
          first = false;
        } else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // === Bubbles rising inside the track ===
    for (const b of this.bubbles) {
      const tPos = (b.y + frame * b.speed * 0.0001) % 1;
      const tLat = b.x;
      const idx = Math.round(tPos * (outer.length - 1));
      if (idx >= outer.length) continue;
      const po = outer[idx],
        pi_ = inner[idx];
      const bx = po.x + (pi_.x - po.x) * tLat;
      const by = po.y + (pi_.y - po.y) * tLat;
      const alpha = 0.4 + 0.3 * Math.sin(frame * 0.005 + b.phase);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `hsl(${waterHue + 20},80%,85%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // === Light reflections ===
    for (const rf of this.reflections) {
      const tPos = rf.x;
      const tLat = rf.y;
      const idx = Math.round(tPos * (outer.length - 1));
      if (idx >= outer.length) continue;
      const po = outer[idx],
        pi_ = inner[idx];
      const rx = po.x + (pi_.x - po.x) * tLat;
      const ry = po.y + (pi_.y - po.y) * tLat;
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(frame * 0.006 + rf.phase);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(rx, ry, 5, 2, rf.phase, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // === Foam edge ===
    ctx.strokeStyle = 'rgba(180,240,255,0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(inner[0].x, inner[0].y);
    for (const p of inner.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // === Neon water borders ===
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#00e8ff';
    ctx.strokeStyle = 'rgba(0,220,255,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(inner[0].x, inner[0].y);
    for (const p of inner.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    this._drawFinishLine(ctx, shape, totalLanes);
  }

  _drawFinishLine(ctx, shape, totalLanes) {
    const pOuter = shape.getPosition(0, totalLanes - 1, totalLanes);
    const pInner = shape.getPosition(0, 0, totalLanes);
    const dx = pOuter.x - pInner.x,
      dy = pOuter.y - pInner.y;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffd700';
    const segments = 8;
    const perp = Math.atan2(dy, dx) + Math.PI / 2;
    const hw = 6;
    for (let i = 0; i < segments; i++) {
      const f0 = i / segments,
        f1 = (i + 1) / segments;
      ctx.fillStyle = i % 2 === 0 ? '#fff' : '#222';
      ctx.beginPath();
      ctx.moveTo(pInner.x + dx * f0, pInner.y + dy * f0);
      ctx.lineTo(pInner.x + dx * f1, pInner.y + dy * f1);
      ctx.lineTo(
        pInner.x + dx * f1 + Math.cos(perp) * hw,
        pInner.y + dy * f1 + Math.sin(perp) * hw
      );
      ctx.lineTo(
        pInner.x + dx * f0 + Math.cos(perp) * hw,
        pInner.y + dy * f0 + Math.sin(perp) * hw
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}
