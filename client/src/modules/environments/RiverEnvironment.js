const N_BUBBLES = 18;
const N_REFLECTIONS = 12;

export class RiverEnvironment {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this.bubbles = Array.from({ length: N_BUBBLES }, (_, i) => ({
      x: (i * 97.3) % 1,
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

    // Deep river background
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    const hue = 180 + 20 * Math.sin(frame * 0.0004);
    grad.addColorStop(0, `hsl(${hue},40%,6%)`);
    grad.addColorStop(0.5, `hsl(${hue + 15},35%,10%)`);
    grad.addColorStop(1, `hsl(${hue},40%,6%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Lily pads in background
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

  drawTrackSurface(ctx, shape, trackWidth, frame) {
    const waterHue = 195 + 15 * Math.sin(frame * 0.0005);
    const path2D = shape.getPath2D();

    // Cyan glowing river banks — drawn first, slightly wider
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#00ffff';
    ctx.strokeStyle = 'rgba(0,220,255,0.85)';
    ctx.lineWidth = trackWidth + 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path2D);
    ctx.restore();

    // Blue/teal water surface
    ctx.save();
    ctx.strokeStyle = `hsl(${waterHue},55%,22%)`;
    ctx.lineWidth = trackWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path2D);
    ctx.restore();

    // Bubbles rising inside the track
    for (const b of this.bubbles) {
      const t = (b.y + frame * b.speed * 0.0001) % 1;
      const offset = (b.x - 0.5) * 0.9;
      const pos = shape.getPosition(t, offset, trackWidth);
      const alpha = 0.4 + 0.3 * Math.sin(frame * 0.005 + b.phase);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `hsl(${waterHue + 20},80%,85%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Light reflections
    for (const rf of this.reflections) {
      const pos = shape.getPosition(rf.x, (rf.y - 0.5) * 0.9, trackWidth);
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(frame * 0.006 + rf.phase);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 5, 2, rf.phase, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

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
      ctx.fillStyle = i % 2 === 0 ? '#fff' : '#222';
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
