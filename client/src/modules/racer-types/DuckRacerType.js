// ============================================================
// File:        DuckRacerType.js
// Path:        client/src/modules/racer-types/DuckRacerType.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Duck racer — bobbing / paddling animation, water-splash trail.
// ============================================================

export class DuckRacerType {
  getEmoji() {
    return '🦆';
  }
  getSpeedMultiplier() {
    return 0.85;
  }

  drawRacer(ctx, x, y, angle, racer, isLeader, frame) {
    const sway = Math.sin(frame * 0.009 + (racer.index ?? 0) * 0.8) * 2.5;
    const bob = Math.abs(Math.sin(frame * 0.009 + (racer.index ?? 0) * 0.8)) * 1.5;
    ctx.save();
    ctx.translate(x + sway, y - bob);
    // 🦆 faces right naturally. Keep right-side-up: flip when going leftward.
    let a = angle;
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    if (Math.abs(a) > Math.PI / 2) {
      ctx.scale(-1, 1);
      a = a > 0 ? a - Math.PI : a + Math.PI;
    }
    ctx.rotate(a);
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isLeader) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00ccff';
    }
    ctx.fillText('🦆', 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  getTrailParticles(x, y, speed, angle, frame) {
    if (Math.random() > 0.4) return [];
    const perp = angle + Math.PI / 2;
    // Water splash — two droplets either side of the wake
    return [-1, 1].map((side) => ({
      x: x + Math.cos(perp) * side * 5,
      y: y + Math.sin(perp) * side * 5,
      vx: Math.cos(angle + Math.PI) * 1.5 + Math.cos(perp) * side * 0.8,
      vy: Math.sin(angle + Math.PI) * 1.5 + Math.sin(perp) * side * 0.8 - 1,
      alpha: 0.5,
      r: 2 + Math.random() * 2,
      color: '#7be0f8',
    }));
  }
}
