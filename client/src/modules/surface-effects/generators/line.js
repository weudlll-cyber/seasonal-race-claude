// ============================================================
// File:        line.js
// Path:        client/src/modules/surface-effects/generators/line.js
// Project:     RaceArena
// Description: Surface-effect generator — persistent ground-level line segments.
//              Use for: tire tracks on asphalt, ice scratches, snail trails.
//              Stateful: remembers the previous spawn position to draw segments.
//              Renders in world coordinates (camera transform applied by caller).
// ============================================================

const configSchema = [
  { key: 'color', type: 'color', default: '#333333', label: 'Color' },
  {
    key: 'thickness',
    type: 'range',
    min: 0.5,
    max: 8,
    step: 0.5,
    default: 1.5,
    label: 'Thickness',
  },
  {
    key: 'lifetimeFrames',
    type: 'range',
    min: 30,
    max: 300,
    step: 10,
    default: 90,
    label: 'Lifetime (frames)',
  },
];

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

const START_ALPHA = 0.7;

/**
 * create — returns the spawn/update/render triplet for the line generator.
 * Maintains internal state (last racer position) to form continuous segments.
 * @param {object} config
 * @param {object} [_racer]
 */
function create(config, _racer) {
  let lastX = null;
  let lastY = null;
  const fadePerFrame = START_ALPHA / config.lifetimeFrames;

  return {
    spawn(x, y) {
      if (lastX === null) {
        // First call: record position, emit nothing (no previous point)
        lastX = x;
        lastY = y;
        return [];
      }
      const segment = {
        x1: lastX,
        y1: lastY,
        x2: x,
        y2: y,
        alpha: START_ALPHA,
        fadePerFrame,
        color: config.color,
        thickness: config.thickness,
      };
      lastX = x;
      lastY = y;
      return [segment];
    },

    update(particles, dt = 1) {
      return particles
        .map((p) => ({ ...p, alpha: p.alpha - p.fadePerFrame * dt }))
        .filter((p) => p.alpha > 0);
    },

    render(ctx, particles) {
      ctx.lineCap = 'round';
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.thickness;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };
}

export default { id: 'line', label: 'Line', configSchema, defaultConfig, create };
