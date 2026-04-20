// ============================================================
// File:        DirtOvalEnvironment.js
// Path:        client/src/modules/environments/DirtOvalEnvironment.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Dirt-oval environment — sand surface, grandstands with
//              bobbing crowd silhouettes, dust clouds at corners, and
//              a lens-flare sun in the upper corner.
// ============================================================

// Pre-seeded crowd positions (avoids layout thrash each frame)
const CROWD = Array.from({ length: 60 }, (_, i) => ({
  x: (i * 137.5) % 1280,
  phase: i * 0.41,
  size: 6 + (i % 4),
}));

// Static sand speckle positions
const SPECKLES = Array.from({ length: 120 }, (_, i) => ({
  x: (i * 83.7) % 1,
  y: (i * 61.3) % 1,
  r: 1 + (i % 3) * 0.5,
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
      sunY = 28;
    const sunR = 18;
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

  // Draw the sand track surface and neon borders using shape geometry
  drawTrackSurface(ctx, shape, totalLanes, frame) {
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.0022);

    // Use oval-specific efficient drawing when available
    if (typeof shape.getBandParams === 'function') {
      this._drawOvalTrack(ctx, shape, totalLanes, frame, pulse);
    } else {
      this._drawGenericTrack(ctx, shape, totalLanes, frame, pulse);
    }

    this._drawFinishLine(ctx, shape, totalLanes, frame);
    this._drawTitle(ctx, shape, frame);
  }

  _drawOvalTrack(ctx, shape, totalLanes, frame, pulse) {
    const bp = shape.getBandParams(totalLanes);
    const { cx, cy, outerRx, outerRy, innerRx, innerRy, laneWidth, TW } = bp;

    // Sand fill
    ctx.beginPath();
    ctx.ellipse(cx, cy, outerRx, outerRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c8a46a';
    ctx.fill();

    // Sand speckles (decorative)
    for (const sp of SPECKLES) {
      const theta = sp.x * Math.PI * 2;
      const rOff = innerRx + (outerRx - innerRx) * sp.y;
      const sx = cx + rOff * Math.cos(theta);
      const sy = cy + (innerRy + (outerRy - innerRy) * sp.y) * Math.sin(theta);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = sp.r > 2 ? '#a07040' : '#e8c888';
      ctx.beginPath();
      ctx.arc(sx, sy, sp.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Inner dark area
    ctx.beginPath();
    ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
    const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRx);
    ig.addColorStop(0, '#04091a');
    ig.addColorStop(0.6, '#060d28');
    ig.addColorStop(1, '#0a1535');
    ctx.fillStyle = ig;
    ctx.fill();

    // Inner rings
    for (let r = 40; r < innerRy - 8; r += 35) {
      ctx.strokeStyle = 'rgba(80,120,200,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, (r * bp.rx) / bp.ry, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Lane dividers
    for (let i = 1; i < totalLanes; i++) {
      const delta = -TW / 2 + i * laneWidth;
      const rxi = bp.rx + delta,
        ryi = bp.ry + delta;
      if (rxi > 0 && ryi > 0) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rxi, ryi, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Outer neon border
    const glow = 14 + 12 * pulse;
    ctx.shadowBlur = glow * 2;
    ctx.shadowColor = '#00eeff';
    ctx.strokeStyle = `rgba(0,${180 + Math.round(70 * pulse)},255,0.92)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, outerRx, outerRy, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner neon border
    ctx.shadowBlur = glow;
    ctx.strokeStyle = `rgba(0,${160 + Math.round(70 * pulse)},230,0.75)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawGenericTrack(ctx, shape, totalLanes, frame, pulse) {
    const { outer, inner } = shape.getEdgePoints(totalLanes, 120);

    // Sand fill path
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer.slice(1)) ctx.lineTo(p.x, p.y);
    for (const p of [...inner].reverse()) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = '#c8a46a';
    ctx.fill();

    // Neon border
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
  }

  _drawFinishLine(ctx, shape, totalLanes) {
    const pOuter = shape.getPosition(0, totalLanes - 1, totalLanes);
    const pInner = shape.getPosition(0, 0, totalLanes);
    const dx = pOuter.x - pInner.x,
      dy = pOuter.y - pInner.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
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
    // FINISH label
    const midX = (pOuter.x + pInner.x) / 2;
    const midY = (pOuter.y + pInner.y) / 2;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('FINISH', midX, midY - 8);
  }

  _drawTitle(ctx, shape, frame) {
    // Title is drawn by RaceScreen so environments skip it
  }
}
