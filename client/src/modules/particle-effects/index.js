// ============================================================
// File:        index.js
// Path:        client/src/modules/particle-effects/index.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Particle effects engine — dust clouds, sparkles, trail effects
// ============================================================

/**
 * Particle effect types
 */
export const PARTICLE_TYPES = {
  DUST: 'dust',
  SPARK: 'spark',
  TRAIL: 'trail',
};

/**
 * Create particle effect system
 */
export function createParticleEffects() {
  const particles = [];

  return {
    /**
     * Emit particles at a position
     */
    emit(x, y, type = PARTICLE_TYPES.DUST, count = 8, velocity = 2) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = velocity * (0.5 + Math.random() * 0.5);

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          type,
          life: type === PARTICLE_TYPES.DUST ? 0.5 : 1,
          maxLife: type === PARTICLE_TYPES.DUST ? 0.5 : 1,
          size: type === PARTICLE_TYPES.DUST ? 3 + Math.random() * 3 : 2,
        });
      }
    },

    /**
     * Update all particles (call each frame)
     */
    update(delta) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= delta / 1000; // delta is in ms

        if (p.life <= 0) {
          particles.splice(i, 1);
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.1; // gravity
        }
      }
    },

    /**
     * Draw all particles on canvas
     */
    draw(ctx) {
      for (const p of particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        const color =
          p.type === PARTICLE_TYPES.DUST
            ? `rgba(139, 115, 85, ${alpha * 0.6})`
            : `rgba(255, 215, 0, ${alpha * 0.8})`;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * Get current particles (for testing)
     */
    getParticles() {
      return particles;
    },

    /**
     * Clear all particles
     */
    clear() {
      particles.length = 0;
    },
  };
}
