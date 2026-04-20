// ============================================================
// File:        HorseRacerType.js
// Path:        client/src/modules/racer-types/HorseRacerType.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Horse racer — gallop bobbing animation, sand-dust trail.
// ============================================================

export class HorseRacerType {
  getEmoji() {
    return '🐴';
  }

  // Snails are 0.3×; horses are baseline 1.0×
  getSpeedMultiplier() {
    return 1.0;
  }

  drawRacer(ctx, x, y, angle, racer, isLeader, frame) {
    const bob = Math.sin(frame * 0.012 + (racer.index ?? 0) * 1.2) * 3;
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isLeader) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ffd700';
    }
    ctx.fillText('🐴', x, y + bob);
    ctx.shadowBlur = 0;
  }

  getTrailParticles(x, y, speed, angle, frame) {
    if (Math.random() > 0.45) return [];
    return [
      {
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle + Math.PI) * 1.2 + (Math.random() - 0.5) * 1.5,
        vy: Math.sin(angle + Math.PI) * 1.2 + (Math.random() - 0.5) * 1.5,
        alpha: 0.55,
        r: 3 + Math.random() * 3,
        color: '#c4a060',
      },
    ];
  }
}
