// ============================================================
// File:        SnailRacerType.js
// Path:        client/src/modules/racer-types/SnailRacerType.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Snail racer — slow wobble animation, slime trail.
//              Speed multiplier 0.3× makes it the slowest racer.
// ============================================================

export class SnailRacerType {
  getEmoji() {
    return '🐌';
  }
  getSpeedMultiplier() {
    return 0.3;
  }

  drawRacer(ctx, x, y, angle, racer, isLeader, frame) {
    // Very slow, lazy wobble
    const wobble = Math.sin(frame * 0.004 + (racer.index ?? 0) * 0.6) * 1.5;
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isLeader) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#88ff44';
    }
    ctx.fillText('🐌', x + wobble, y);
    ctx.shadowBlur = 0;
  }

  getTrailParticles(x, y, speed, angle, frame) {
    // Slime trail: translucent green blobs left behind
    if (Math.random() > 0.35) return [];
    return [
      {
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: 0.45,
        r: 4 + Math.random() * 5,
        color: '#7ddc60',
      },
    ];
  }
}
