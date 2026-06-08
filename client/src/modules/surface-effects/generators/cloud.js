// ============================================================
// File:        cloud.js
// Path:        client/src/modules/surface-effects/generators/cloud.js
// Project:     RaceArena
// Description: Surface-effect generator — soft, growing, fading blobs.
//              Use for: sand billows, earth puffs, snow powder, air contrails.
//              Renders in world coordinates (camera transform applied by caller).
// ============================================================

export const configSchema = [
  { key: 'color', type: 'color', default: '#cccccc', label: 'Color' },
  {
    key: 'startSize',
    type: 'range',
    min: 1,
    max: 20,
    step: 0.5,
    default: 3,
    label: 'Start Size',
  },
  { key: 'endSize', type: 'range', min: 2, max: 40, step: 1, default: 12, label: 'End Size' },
  {
    key: 'lifetimeFrames',
    type: 'range',
    min: 10,
    max: 120,
    step: 5,
    default: 40,
    label: 'Lifetime (frames)',
  },
  {
    key: 'spawnProbability',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.3,
    label: 'Spawn Rate',
  },
  {
    key: 'driftDirection',
    type: 'select',
    options: ['back', 'random'],
    default: 'back',
    label: 'Drift Direction',
  },
];

export const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

const START_ALPHA = 0.6;

/**
 * create — returns the spawn/update/render triplet for the cloud generator.
 * @param {object} config
 * @param {object} [_racer]
 */
export function create(config, _racer) {
  return {
    spawn(x, y, _speed, angle) {
      if (Math.random() > config.spawnProbability) return [];
      const fadePerFrame = START_ALPHA / config.lifetimeFrames;
      const growPerFrame = (config.endSize - config.startSize) / config.lifetimeFrames;
      const driftAngle =
        config.driftDirection === 'back' ? angle + Math.PI : Math.random() * Math.PI * 2;
      const driftSpeed = 0.4 + Math.random() * 0.4;
      return [
        {
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(driftAngle) * driftSpeed,
          vy: Math.sin(driftAngle) * driftSpeed,
          r: config.startSize,
          growPerFrame,
          alpha: START_ALPHA,
          fadePerFrame,
          color: config.color,
        },
      ];
    },

    update(particles, dt = 1) {
      return particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          r: p.r + p.growPerFrame * dt,
          alpha: p.alpha - p.fadePerFrame * dt,
        }))
        .filter((p) => p.alpha > 0);
    },

    render(ctx, particles) {
      // Viewport cull: skip blobs entirely outside the canvas.
      // ctx.getTransform() reads the live camera matrix — no extra parameters needed.
      // At N=70 in a tight pack, ~1050 blobs are alive; at LEADER_ZOOM most are off-screen.
      const { a: ez, e: ox, f: oy } = ctx.getTransform();
      const cw = ctx.canvas.width;
      const ch = ctx.canvas.height;
      for (const p of particles) {
        const sr = p.r * ez;
        const sx = p.x * ez + ox;
        if (sx + sr < 0 || sx - sr > cw) continue;
        const sy = p.y * ez + oy;
        if (sy + sr < 0 || sy - sr > ch) continue;
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

export default { id: 'cloud', label: 'Cloud', configSchema, defaultConfig, create };
