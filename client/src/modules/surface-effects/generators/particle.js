// ============================================================
// File:        particle.js
// Path:        client/src/modules/surface-effects/generators/particle.js
// Project:     RaceArena
// Description: Surface-effect generator — individual point/circle particles.
//              Use for: asphalt grit, grass flecks, air shimmer.
//              Renders in world coordinates (camera transform applied by caller).
// ============================================================

const configSchema = [
  { key: 'color', type: 'color', default: '#aaaaaa', label: 'Color' },
  { key: 'sizeMin', type: 'range', min: 0.5, max: 10, step: 0.5, default: 2, label: 'Size Min' },
  { key: 'sizeMax', type: 'range', min: 0.5, max: 15, step: 0.5, default: 4, label: 'Size Max' },
  {
    key: 'lifetimeFrames',
    type: 'range',
    min: 10,
    max: 120,
    step: 5,
    default: 30,
    label: 'Lifetime (frames)',
  },
  {
    key: 'spawnProbability',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.4,
    label: 'Spawn Rate',
  },
  { key: 'drift', type: 'range', min: 0, max: 5, step: 0.1, default: 1.0, label: 'Drift' },
  { key: 'gravity', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0, label: 'Gravity' },
];

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

const START_ALPHA = 0.8;

/**
 * create — returns the spawn/update/render triplet for the particle generator.
 * @param {object} config — merged configSchema values
 * @param {object} [_racer] — reserved for VRE-3 per-racer customisation
 */
function create(config, _racer) {
  return {
    /**
     * Spawn 0 or 1 particle per call based on spawnProbability, appended IN PLACE
     * into `out` (the racer's live-particle array). Allocation-free at the seam: no
     * intermediate array, only a genuinely-new object when a particle actually spawns.
     * Spawn-decision logic and RNG call order are unchanged (visually identical).
     * @param {object[]} out — array to append into
     */
    spawn(out, x, y, _speed, angle) {
      if (Math.random() > config.spawnProbability) return;
      const r = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
      const fadePerFrame = START_ALPHA / config.lifetimeFrames;
      out.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle + Math.PI) * config.drift + (Math.random() - 0.5) * 0.8,
        vy: Math.sin(angle + Math.PI) * config.drift + (Math.random() - 0.5) * 0.8,
        gy: config.gravity,
        r,
        alpha: START_ALPHA,
        fadePerFrame,
        color: config.color,
      });
    },

    /**
     * Advance all particles by dt frames IN PLACE, removing dead ones via
     * swap-with-last + length-- (same allocation-free idiom as the dust/burst advance
     * blocks in RaceScreen). No new array and no per-particle rematerialization — each
     * live particle's own fields are mutated. Motion/alpha math is byte-identical to the
     * prior map body. Returns the same array instance.
     * @param {object[]} particles
     * @param {number} [dt=1]
     * @returns {object[]} the same array, advanced and compacted
     */
    update(particles, dt = 1) {
      let i = 0;
      while (i < particles.length) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt + p.gy * dt;
        p.alpha -= p.fadePerFrame * dt;
        if (p.alpha > 0) {
          i++;
        } else {
          particles[i] = particles[particles.length - 1];
          particles.length--;
        }
      }
      return particles;
    },

    /**
     * Render particles to ctx. Camera transform must already be applied.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object[]} particles
     */
    render(ctx, particles) {
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

export default { id: 'particle', label: 'Particle', configSchema, defaultConfig, create };
