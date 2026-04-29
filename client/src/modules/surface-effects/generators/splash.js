// ============================================================
// File:        splash.js
// Path:        client/src/modules/surface-effects/generators/splash.js
// Project:     RaceArena
// Description: Surface-effect generator — fast particles with gravity.
//              Use for: mud splatter, water droplets.
//              Renders in world coordinates (camera transform applied by caller).
// ============================================================

export const configSchema = [
  { key: 'color', type: 'color', default: '#4499cc', label: 'Color' },
  { key: 'count', type: 'range', min: 1, max: 8, step: 1, default: 3, label: 'Count' },
  {
    key: 'sizeMin',
    type: 'range',
    min: 0.5,
    max: 8,
    step: 0.5,
    default: 1.5,
    label: 'Size Min',
  },
  { key: 'sizeMax', type: 'range', min: 0.5, max: 12, step: 0.5, default: 3, label: 'Size Max' },
  {
    key: 'lifetimeFrames',
    type: 'range',
    min: 10,
    max: 80,
    step: 5,
    default: 25,
    label: 'Lifetime (frames)',
  },
  {
    key: 'spawnProbability',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.35,
    label: 'Spawn Rate',
  },
  {
    key: 'gravity',
    type: 'range',
    min: 0.01,
    max: 0.5,
    step: 0.01,
    default: 0.12,
    label: 'Gravity',
  },
  {
    key: 'spreadAngle',
    type: 'range',
    min: 0.1,
    max: 3.14,
    step: 0.1,
    default: 1.2,
    label: 'Spread Angle',
  },
];

export const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

const START_ALPHA = 0.85;
const BURST_SPEED = 2.5;

/**
 * create — returns the spawn/update/render triplet for the splash generator.
 * @param {object} config
 * @param {object} [_racer]
 */
export function create(config, _racer) {
  return {
    spawn(x, y, speed, angle) {
      if (Math.random() > config.spawnProbability) return [];
      const count = Math.max(1, Math.round(config.count));
      const fadePerFrame = START_ALPHA / config.lifetimeFrames;
      const burstSpeed = BURST_SPEED + speed * 0.5;

      return Array.from({ length: count }, () => {
        const halfSpread = config.spreadAngle / 2;
        // Splash spreads around the backward direction with spreadAngle half-cone
        const spreadDir = angle + Math.PI + (Math.random() - 0.5) * config.spreadAngle * 2;
        const r = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
        const s = burstSpeed * (0.5 + Math.random() * 0.5);
        void halfSpread; // used implicitly via spreadDir
        return {
          x: x + (Math.random() - 0.5) * 4,
          y: y + (Math.random() - 0.5) * 4,
          vx: Math.cos(spreadDir) * s,
          vy: Math.sin(spreadDir) * s,
          gy: config.gravity,
          r,
          alpha: START_ALPHA,
          fadePerFrame,
          color: config.color,
        };
      });
    },

    update(particles, dt = 1) {
      return particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt + p.gy * dt,
          vy: p.vy + p.gy * dt,
          r: p.r * (1 - 0.015 * dt),
          alpha: p.alpha - p.fadePerFrame * dt,
        }))
        .filter((p) => p.alpha > 0 && p.r > 0.2);
    },

    render(ctx, particles) {
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.r), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

export default { id: 'splash', label: 'Splash', configSchema, defaultConfig, create };
