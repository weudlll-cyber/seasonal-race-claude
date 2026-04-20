// ============================================================
// File:        RocketRacerType.js
// Path:        client/src/modules/racer-types/RocketRacerType.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Rocket racer — rotates to face travel direction, thrust
//              flame particles, fast speed multiplier.
// ============================================================

export class RocketRacerType {
  getEmoji() {
    return '🚀';
  }
  getSpeedMultiplier() {
    return 1.5;
  }

  drawRacer(ctx, x, y, angle, racer, isLeader, frame) {
    ctx.save();
    ctx.translate(x, y);
    // Rocket emoji naturally points up, travel angle 0 = right.
    // Rotate so the tip faces the direction of travel.
    ctx.rotate(angle + Math.PI / 2);
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isLeader) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff8800';
    }
    ctx.fillText('🚀', 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  getTrailParticles(x, y, speed, angle, frame) {
    const particles = [];
    const count = 3;
    const FLAME_COLORS = ['#ff6600', '#ffaa00', '#ff3300', '#ffff00'];
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: Math.cos(angle + Math.PI) * (2.5 + Math.random() * 2) + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle + Math.PI) * (2.5 + Math.random() * 2) + (Math.random() - 0.5) * 2,
        alpha: 0.9,
        r: 4 + Math.random() * 4,
        color: FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)],
      });
    }
    return particles;
  }
}
