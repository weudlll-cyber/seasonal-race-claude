/**
 * Appends a burst of 45 coloured particles at (x, y) to the burstParticles array.
 * Pure data mutation — no canvas context needed.
 * @param {Array} burstParticles  Mutable array from game state.
 * @param {number} x
 * @param {number} y
 */
export function emitBurst(burstParticles, x, y) {
  const colors = ['#ffd700', '#ff6b35', '#ff3388', '#00ffcc', '#fff', '#ff0', '#0ff'];
  for (let i = 0; i < 45; i++) {
    const a = (i / 45) * Math.PI * 2 + Math.random() * 0.4;
    const spd = 2 + Math.random() * 7;
    burstParticles.push({
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      alpha: 1,
      r: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

/**
 * Draws all active dust and burst particles.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} dustParticles
 * @param {Array} burstParticles
 */
export function drawParticles(ctx, dustParticles, burstParticles) {
  for (const p of dustParticles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color ?? '#d4b880';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of burstParticles) {
    ctx.globalAlpha = p.alpha;
    ctx.shadowBlur = 6;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

/**
 * Draws per-racer surface-class trail particles (world coords, inside camera transform).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} racers
 */
export function drawSurfaceTrails(ctx, racers) {
  for (const r of racers) {
    if (r.surfaceEmitter && r.surfaceParticles.length > 0) {
      r.surfaceEmitter.render(ctx, r.surfaceParticles);
    }
  }
}
