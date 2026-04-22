function _seeded(seed, max) {
  return (((seed * 9301 + 49297) % 233280) / 233280) * max;
}

// Pre-generate star layers (3 layers at different speeds)
const STAR_LAYERS = [0.12, 0.28, 0.55].map((speed, layer) =>
  Array.from({ length: 30 + layer * 20 }, (_, i) => ({
    x: _seeded(i * (layer + 1) * 37, 1),
    y: _seeded(i * (layer + 1) * 53, 1),
    r: 0.6 + layer * 0.5,
    brightness: 0.4 + _seeded(i * 13, 0.5),
    phase: _seeded(i * 7, Math.PI * 2),
    speed,
  }))
);

// Nebula blobs
const NEBULAE = [
  { x: 0.15, y: 0.25, r: 120, hue: 280, alpha: 0.07 },
  { x: 0.82, y: 0.6, r: 100, hue: 320, alpha: 0.06 },
  { x: 0.45, y: 0.75, r: 90, hue: 210, alpha: 0.08 },
];

export class SpaceEnvironment {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this.shootingStar = null;
    this.shootingCooldown = 0;
  }

  drawBackground(ctx, frame) {
    const { cw, ch } = this;

    ctx.fillStyle = '#02020d';
    ctx.fillRect(0, 0, cw, ch);

    // Nebula blobs
    for (const nb of NEBULAE) {
      const drift = Math.sin(frame * 0.0003 + nb.hue) * 0.015;
      const bx = (nb.x + drift) * cw,
        by = nb.y * ch;
      const ng = ctx.createRadialGradient(bx, by, 0, bx, by, nb.r);
      ng.addColorStop(0, `hsla(${nb.hue},70%,55%,${nb.alpha * 2})`);
      ng.addColorStop(0.5, `hsla(${nb.hue + 20},60%,45%,${nb.alpha})`);
      ng.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(bx, by, nb.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Three-layer parallax stars
    for (const layer of STAR_LAYERS) {
      for (const s of layer) {
        const scrollX = (frame * s.speed * 0.005) % 1;
        const sx = ((s.x - scrollX + 2) % 1) * cw;
        const sy = s.y * ch;
        const twinkle = s.brightness + 0.3 * Math.sin(frame * 0.003 + s.phase);
        ctx.globalAlpha = Math.max(0, Math.min(1, twinkle));
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Shooting star
    this.shootingCooldown--;
    if (this.shootingCooldown <= 0 && !this.shootingStar) {
      if (Math.random() < 0.005) {
        this.shootingStar = { x: Math.random() * cw, y: Math.random() * ch * 0.4, life: 1 };
        this.shootingCooldown = 300;
      }
    }
    if (this.shootingStar) {
      const ss = this.shootingStar;
      ctx.globalAlpha = ss.life;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#aaddff';
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x + 80 * ss.life, ss.y + 30 * ss.life);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ss.x += 4;
      ss.y += 1.5;
      ss.life -= 0.03;
      if (ss.life <= 0) this.shootingStar = null;
    }
    ctx.globalAlpha = 1;

    // Planet in upper-right corner
    const px = cw * 0.88,
      py = 38,
      pr = 28;
    const plg = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 0, px, py, pr);
    plg.addColorStop(0, 'rgba(180,120,255,0.9)');
    plg.addColorStop(0.6, 'rgba(100,50,180,0.7)');
    plg.addColorStop(1, 'rgba(30,10,60,0)');
    ctx.fillStyle = plg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,170,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px, py, pr * 1.7, pr * 0.4, -0.4, 0, Math.PI * 2);
    ctx.stroke();

    // Top strip
    ctx.fillStyle = 'rgba(2,2,18,0.9)';
    ctx.fillRect(0, 0, cw, 58);
    ctx.strokeStyle = 'rgba(80,80,200,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 58);
    ctx.lineTo(cw, 58);
    ctx.stroke();
  }

  drawTrackSurface(ctx, shape, trackWidth, frame) {
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.0018);
    const path2D = shape.getPath2D();

    // Purple neon boundary with glow — drawn first, slightly wider
    ctx.save();
    ctx.shadowBlur = 20 + 10 * pulse;
    ctx.shadowColor = '#8855ff';
    ctx.strokeStyle = `rgba(140,80,255,${0.7 + 0.2 * pulse})`;
    ctx.lineWidth = trackWidth + 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path2D);
    ctx.restore();

    // Dark blue/purple energy corridor
    ctx.save();
    ctx.strokeStyle = `hsl(245,30%,${9 + pulse * 4}%)`;
    ctx.lineWidth = trackWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path2D);
    ctx.restore();

    this._drawStartLine(ctx, shape, trackWidth);
    this._drawFinishLine(ctx, shape, trackWidth);
  }

  _drawStartLine(ctx, shape, trackWidth) {
    const pO = shape.getPosition(0, 1.0, trackWidth);
    const pI = shape.getPosition(0, -1.0, trackWidth);
    const dx = pO.x - pI.x,
      dy = pO.y - pI.y;
    ctx.shadowBlur = 12;
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
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00ffcc';
    const perp = Math.atan2(dy, dx) + Math.PI / 2;
    const hw = 6;
    for (let i = 0; i < 8; i++) {
      const f0 = i / 8,
        f1 = (i + 1) / 8;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,255,200,0.9)' : 'rgba(0,80,60,0.8)';
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
