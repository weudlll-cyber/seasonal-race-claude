// Pre-seeded crowd positions (avoids layout thrash each frame)
const CROWD = Array.from({ length: 60 }, (_, i) => ({
  x: (i * 137.5) % 1280,
  phase: i * 0.41,
  size: 6 + (i % 4),
}));

export class DirtOvalEnvironment {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
  }

  // Full canvas background: sky gradient + grandstand bar + crowd
  drawBackground(ctx, frame) {
    const { cw, ch } = this;

    // Animated sky gradient
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.0006);
    const grad = ctx.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, '#0a0414');
    grad.addColorStop(0.5, `hsl(248,${20 + pulse * 10}%,${8 + pulse * 3}%)`);
    grad.addColorStop(1, '#0a0414');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Faint star field
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
      ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Grandstand strip
    ctx.fillStyle = 'rgba(14,7,2,0.92)';
    ctx.fillRect(0, 0, cw, 58);

    // Bobbing crowd silhouettes inside the grandstand
    for (const p of CROWD) {
      const bob = Math.sin(frame * 0.003 + p.phase) * 2;
      ctx.fillStyle = `hsl(${20 + ((p.size * 7) % 30)},30%,${18 + (p.size % 4) * 3}%)`;
      ctx.beginPath();
      ctx.ellipse(p.x, 50 + bob, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grandstand edge line
    ctx.strokeStyle = 'rgba(200,130,40,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 58);
    ctx.lineTo(cw, 58);
    ctx.stroke();

    // Sun / lens flare in corner
    const sunX = cw * 0.9,
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

  drawTrackSurface(ctx, shape, trackWidth, frame) {
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.0022);
    const { outer, inner } = shape.getEdgePoints(trackWidth, 120);

    // Sandy brown fill
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    for (const p of [...inner].reverse()) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = '#c8a46a';
    ctx.fill();

    // Subtle speckle texture
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < outer.length; i += 4) {
      const po = outer[i],
        pi_ = inner[i];
      for (let f = 0.15; f < 1; f += 0.25) {
        const sx = po.x + (pi_.x - po.x) * f + (Math.random() - 0.5) * 3;
        const sy = po.y + (pi_.y - po.y) * f + (Math.random() - 0.5) * 3;
        ctx.fillStyle = i % 3 === 0 ? '#b08840' : '#dbbf7a';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Neon cyan boundary lines
    const glow = 14 + 12 * pulse;
    ctx.shadowBlur = glow;
    ctx.shadowColor = '#00eeff';
    ctx.strokeStyle = `rgba(0,${200 + Math.round(55 * pulse)},255,0.9)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(inner[0].x, inner[0].y);
    for (const p of inner.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    this._drawFinishLine(ctx, shape, trackWidth);
  }

  _drawFinishLine(ctx, shape, trackWidth) {
    const pOuter = shape.getPosition(0, 1.0, trackWidth);
    const pInner = shape.getPosition(0, -1.0, trackWidth);
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
    const midX = (pOuter.x + pInner.x) / 2;
    const midY = (pOuter.y + pInner.y) / 2;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('FINISH', midX, midY - 8);
  }
}
