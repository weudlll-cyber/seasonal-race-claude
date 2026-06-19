// ============================================================
// File:        cloud.js
// Path:        client/src/modules/surface-effects/generators/cloud.js
// Project:     RaceArena
// Description: Surface-effect generator — soft, growing, fading blobs.
//              Use for: sand billows, earth puffs, snow powder, air contrails.
//              Renders in world coordinates (camera transform applied by caller).
// ============================================================

// Pre-render a soft radial-gradient puff to an offscreen canvas once per generator instance.
// drawImage a scaled copy per particle is much cheaper than arc+fill+globalAlpha on a large canvas.
function _hexToRgba(hex, a) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(200,216,232,${a})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function _createBlobSprite(endSize, color) {
  const s = Math.ceil(endSize) * 2 + 2;
  try {
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(s, s)
        : Object.assign(document.createElement('canvas'), { width: s, height: s });
    const ctx2d = canvas.getContext('2d');
    const cx = s / 2;
    const grad = ctx2d.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grad.addColorStop(0, _hexToRgba(color, 0.9));
    grad.addColorStop(0.55, _hexToRgba(color, 0.4));
    grad.addColorStop(1, _hexToRgba(color, 0));
    ctx2d.fillStyle = grad;
    ctx2d.fillRect(0, 0, s, s);
    return canvas;
  } catch {
    return null;
  }
}

const configSchema = [
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

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

const START_ALPHA = 0.6;

/**
 * create — returns the spawn/update/render triplet for the cloud generator.
 * @param {object} config
 * @param {object} [_racer]
 */
function create(config, _racer) {
  const blobSprite = _createBlobSprite(config.endSize, config.color);

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
        if (blobSprite) {
          // Blit pre-rendered soft gradient puff — much cheaper than arc+fill per particle.
          ctx.drawImage(blobSprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.1, p.r), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  };
}

export default { id: 'cloud', label: 'Cloud', configSchema, defaultConfig, create };
