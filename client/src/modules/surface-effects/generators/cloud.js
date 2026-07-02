// ============================================================
// File:        cloud.js
// Path:        client/src/modules/surface-effects/generators/cloud.js
// Project:     RaceArena
// Description: Surface-effect generator — soft, growing, fading blobs.
//              Use for: sand billows, earth puffs, snow powder, air contrails.
//              Renders in world coordinates (camera transform applied by caller).
// ============================================================

// Pre-rendered soft radial-gradient puff + viewport cull are shared with the other
// generators — see spriteHelpers.js. Blitting a scaled copy per particle is much cheaper
// than arc+fill+globalAlpha on a large canvas.
import { createBlobSprite, cullBounds, isVisible } from './spriteHelpers.js';

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
  const blobSprite = createBlobSprite(config.endSize, config.color);

  return {
    // Spawn 0 or 1 blob per call, appended IN PLACE into `out` (the racer's array).
    // Allocation-free at the seam; spawn-decision logic and RNG call order unchanged.
    spawn(out, x, y, _speed, angle) {
      if (Math.random() > config.spawnProbability) return;
      const fadePerFrame = START_ALPHA / config.lifetimeFrames;
      const growPerFrame = (config.endSize - config.startSize) / config.lifetimeFrames;
      const driftAngle =
        config.driftDirection === 'back' ? angle + Math.PI : Math.random() * Math.PI * 2;
      const driftSpeed = 0.4 + Math.random() * 0.4;
      out.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(driftAngle) * driftSpeed,
        vy: Math.sin(driftAngle) * driftSpeed,
        r: config.startSize,
        growPerFrame,
        alpha: START_ALPHA,
        fadePerFrame,
        color: config.color,
      });
    },

    // Advance IN PLACE + swap-remove dead (same idiom as dust/burst). No new array,
    // no per-particle rematerialization; motion/grow/alpha math byte-identical to the
    // prior map body. Returns the same array instance.
    update(particles, dt = 1) {
      let i = 0;
      while (i < particles.length) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.growPerFrame * dt;
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

    render(ctx, particles) {
      // Viewport cull: skip blobs entirely outside the canvas (shared helper).
      const cull = cullBounds(ctx);
      for (const p of particles) {
        if (!isVisible(cull, p.x, p.y, p.r)) continue;
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
