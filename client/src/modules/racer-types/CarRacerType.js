// ============================================================
// File:        CarRacerType.js
// Path:        client/src/modules/racer-types/CarRacerType.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Car racer — rotates to face travel direction, exhaust
//              smoke and tyre-smoke trail particles.
// ============================================================

export class CarRacerType {
  getEmoji() {
    return '🚗';
  }
  getSpeedMultiplier() {
    return 1.2;
  }

  drawRacer(ctx, x, y, angle, racer, isLeader, frame) {
    ctx.save();
    ctx.translate(x, y);
    // 🚗 emoji faces right by default; rotate to match travel direction.
    ctx.rotate(angle);
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isLeader) {
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#00aaff';
    }
    ctx.fillText('🚗', 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  getTrailParticles(x, y, speed, angle, frame) {
    if (Math.random() > 0.5) return [];
    const SMOKE = ['#aaaaaa', '#888888', '#cccccc'];
    return [
      {
        x: x + Math.cos(angle + Math.PI) * 10 + (Math.random() - 0.5) * 6,
        y: y + Math.sin(angle + Math.PI) * 10 + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle + Math.PI) * 1.0 + (Math.random() - 0.5) * 1.5,
        vy: Math.sin(angle + Math.PI) * 1.0 + (Math.random() - 0.5) * 1.5 - 0.5,
        alpha: 0.45,
        r: 5 + Math.random() * 5,
        color: SMOKE[Math.floor(Math.random() * SMOKE.length)],
      },
    ];
  }
}
