let _bgImg = null;
function _loadBg() {
  if (_bgImg !== null) return;
  _bgImg = typeof Image !== 'undefined' ? new Image() : {};
  _bgImg.onerror = () => {
    _bgImg = null;
  };
  if ('src' in _bgImg) _bgImg.src = '/assets/tracks/backgrounds/garden-path.jpg';
}

// Pre-seeded flower positions (relative to outer edge samples)
const FLOWERS = Array.from({ length: 30 }, (_, i) => ({
  t: (i * 0.0333) % 1,
  side: i % 2, // 0 = outer edge, 1 = inner edge
  offset: 4 + (i % 5) * 2,
  hue: [0, 30, 300, 260, 60][i % 5],
  size: 3 + (i % 3),
}));

// Falling leaves
const LEAVES = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 0.0625) % 1,
  y: (i * 0.09) % 1,
  vx: 0.3 + (i % 3) * 0.2,
  vy: 0.5 + (i % 4) * 0.15,
  rot: i * 0.7,
  rotSpeed: 0.02 + (i % 5) * 0.01,
  hue: 30 + (i % 4) * 15,
  size: 5 + (i % 4),
  phase: i * 0.55,
}));

// Butterfly waypoints
const BUTTERFLIES = Array.from({ length: 3 }, (_, i) => ({
  x: (i * 0.35) % 1,
  y: 0.3 + ((i * 0.2) % 0.4),
  phase: i * 2.1,
  hue: [280, 60, 200][i],
}));

export class GardenEnvironment {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
  }

  drawBackground(ctx, frame) {
    const { cw, ch } = this;
    _loadBg();

    const imgReady = _bgImg?.complete && _bgImg.naturalWidth > 0;
    if (imgReady) {
      ctx.drawImage(_bgImg, 0, 0, cw, ch);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, cw, ch);
    } else {
      // Dark green grass background fallback
      ctx.fillStyle = '#0a1f0a';
      ctx.fillRect(0, 0, cw, ch);
    }

    // Layered grass texture
    for (let layer = 0; layer < 3; layer++) {
      const lightness = 12 + layer * 5;
      const y0 = ch * (0.55 + layer * 0.08);
      const grad = ctx.createLinearGradient(0, y0, 0, ch);
      grad.addColorStop(0, `hsl(115,${35 + layer * 5}%,${lightness}%)`);
      grad.addColorStop(1, `hsl(115,30%,${lightness - 3}%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, y0, cw, ch - y0);
    }

    // Falling leaves
    for (const leaf of LEAVES) {
      const lx = (leaf.x * cw + frame * leaf.vx * 0.1) % cw;
      const ly = (leaf.y * ch + frame * leaf.vy * 0.06) % ch;
      const rot = leaf.rot + frame * leaf.rotSpeed;
      const sway = Math.sin(frame * 0.003 + leaf.phase) * 12;
      ctx.save();
      ctx.translate(lx + sway, ly);
      ctx.rotate(rot);
      ctx.globalAlpha = 0.55 + 0.2 * Math.sin(frame * 0.004 + leaf.phase);
      ctx.fillStyle = `hsl(${leaf.hue},55%,35%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size, leaf.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Butterflies
    for (const bf of BUTTERFLIES) {
      const bx = (bf.x * cw + frame * 0.12) % cw;
      const by = bf.y * ch + Math.sin(frame * 0.005 + bf.phase) * 20;
      const flutter = Math.sin(frame * 0.02 + bf.phase) * 0.6;
      ctx.save();
      ctx.translate(bx, by);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = `hsl(${bf.hue},70%,60%)`;
      ctx.beginPath();
      ctx.ellipse(-5, 0, 8, 5, flutter, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(5, 0, 8, 5, -flutter, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Top strip
    ctx.fillStyle = 'rgba(5,15,5,0.9)';
    ctx.fillRect(0, 0, cw, 58);
    ctx.strokeStyle = 'rgba(40,160,60,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 58);
    ctx.lineTo(cw, 58);
    ctx.stroke();
  }

  drawTrackSurface(ctx, shape, trackWidth, frame) {
    const { outer, inner } = shape.getEdgePoints(trackWidth, 200);

    // Brown dirt fill
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    for (const p of [...inner].reverse()) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = '#6b4c2a';
    ctx.fill();

    // Dirt texture speckles
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < outer.length; i += 5) {
      const po = outer[i],
        pi_ = inner[i];
      for (let f = 0.1; f < 1; f += 0.2) {
        const sx = po.x + (pi_.x - po.x) * f;
        const sy = po.y + (pi_.y - po.y) * f;
        ctx.fillStyle = i % 2 === 0 ? '#8b6340' : '#543d20';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Flower dots along both edges
    for (const fl of FLOWERS) {
      const idx = Math.round(fl.t * (outer.length - 1));
      if (idx >= outer.length) continue;
      const edgePt = fl.side === 0 ? outer[idx] : inner[idx];
      const bloom = 0.7 + 0.3 * Math.sin(frame * 0.004 + fl.t * Math.PI * 4);
      ctx.globalAlpha = 0.8 * bloom;
      ctx.fillStyle = `hsl(${fl.hue},80%,65%)`;
      ctx.beginPath();
      ctx.arc(edgePt.x, edgePt.y, fl.size * bloom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(edgePt.x, edgePt.y, fl.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Bright green grass edge boundary lines
    ctx.strokeStyle = 'rgba(60,180,70,0.85)';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(40,200,60,0.6)';
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(inner[0].x, inner[0].y);
    for (const p of inner.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    this._drawStartLine(ctx, shape, trackWidth);
    this._drawFinishLine(ctx, shape, trackWidth);
  }

  _drawStartLine(ctx, shape, trackWidth) {
    const pO = shape.getPosition(0, 1.0, trackWidth);
    const pI = shape.getPosition(0, -1.0, trackWidth);
    const dx = pO.x - pI.x,
      dy = pO.y - pI.y;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff88';
    const perp = Math.atan2(dy, dx) + Math.PI / 2;
    const hw = 6;
    for (let i = 0; i < 8; i++) {
      const f0 = i / 8,
        f1 = (i + 1) / 8;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,255,136,0.9)' : 'rgba(0,60,30,0.8)';
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

  _drawFinishLine(ctx, shape, trackWidth) {
    const pO = shape.getPosition(1, 1.0, trackWidth);
    const pI = shape.getPosition(1, -1.0, trackWidth);
    const dx = pO.x - pI.x,
      dy = pO.y - pI.y;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffd700';
    const perp = Math.atan2(dy, dx) + Math.PI / 2;
    const hw = 6;
    for (let i = 0; i < 8; i++) {
      const f0 = i / 8,
        f1 = (i + 1) / 8;
      ctx.fillStyle = i % 2 === 0 ? '#fff' : '#333';
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
