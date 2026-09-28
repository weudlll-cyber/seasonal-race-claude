// ============================================================
// File:        bubbles.js
// Path:        client/src/modules/track-effects/effects/bubbles.js
// Project:     RaceArena
// Description: Track effect — floating bubble particles along the track path
// ============================================================

import { cullBounds, isVisible } from '../../surface-effects/generators/spriteHelpers.js';

const configSchema = [
  // PARTICLES-VISIBILITY-3: 0 = off (nothing spawned or drawn). The maximum is where the effect is
  // clearly many on screen in an ordinary race, or lower where frame time measurably degraded first;
  // measured in the browser, see reports/particles/PARTICLES-VISIBILITY-3.md.
  // The unit is unchanged (bubbles per minute), so every stored setting looks as it did.
  // The step divides the default and every stored value, so they stay on the slider's grid.
  { key: 'count', type: 'range', min: 0, max: 240000, step: 20, default: 40, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1.2, label: 'Size' },
  { key: 'color', type: 'color', default: '#aaddff', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.6, label: 'Opacity' },
];
const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

// PARTICLES-VISIBILITY-2: `world` is the area this effect is drawn in when that is not the canvas —
// the race screen draws track effects inside the world transform and passes the world size, so
// placement (and any edge wrap or clamp below) covers the whole track instead of a canvas-sized
// corner of it. The track editor draws in screen space and passes nothing, so it keeps the canvas.
// PARTICLES-VISIBILITY-4: bubbles and their droplets are drawn in this many alpha tiers, one path and one fill per tier,
// instead of a path, a fill and an alpha change per item. Each takes its tier's midpoint alpha — at
// most 1/16 of the opacity away from its own.
const ALPHA_TIERS = 8;

function create(canvas, config, world) {
  const { width, height } = world ?? canvas;
  let bubbles = [],
    spawnAccum = 0;
  const RISE = 500;
  const POP = 300;

  // One reusable list per alpha tier of flat (x, y, r) triples, refilled every frame (no allocation).
  const tiers = Array.from({ length: ALPHA_TIERS }, () => []);

  return {
    update(dt) {
      for (const b of bubbles) b.age += dt;
      bubbles = bubbles.filter((b) => b.age < b.totalMs);
      if (config.count <= 0) return;
      spawnAccum += dt / 1000;
      const interval = 60 / config.count;
      while (spawnAccum >= interval) {
        const rise = RISE * (0.8 + Math.random() * 0.4);
        const n = 2 + Math.floor(Math.random() * 2);
        bubbles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          age: 0,
          riseMs: rise,
          totalMs: rise + POP,
          splitters: Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
            return { dx: Math.cos(a), dy: Math.sin(a) };
          }),
        });
        spawnAccum -= interval;
      }
    },
    render(ctx) {
      // PARTICLES-VISIBILITY-4: skip items whose drawn circle does not touch the canvas (both axis
      // scales, the helper racer trails use). Only DRAWING is skipped — update() still moves every item,
      // so nothing pops in when the camera turns. The margin is the item's drawn radius.
      // A popping bubble reaches its spread plus a droplet radius from its centre.
      const cull = cullBounds(ctx);
      const reach = config.size * 14;
      const tierOf = (alpha) => tiers[Math.min(ALPHA_TIERS - 1, Math.floor(alpha * ALPHA_TIERS))];
      for (const tier of tiers) tier.length = 0;
      for (const b of bubbles) {
        if (!isVisible(cull, b.x, b.y, reach)) continue;
        if (b.age < b.riseMs) {
          const t = b.age / b.riseMs;
          tierOf(Math.min(t * 3, 1)).push(b.x, b.y, Math.max(0.5, config.size * 4 * t));
        } else {
          const t = (b.age - b.riseMs) / POP;
          const spread = config.size * 12 * t;
          const r = Math.max(0.5, config.size * 2 * (1 - t));
          const tier = tierOf(1 - t);
          for (const s of b.splitters) tier.push(b.x + s.dx * spread, b.y + s.dy * spread, r);
        }
      }
      // PARTICLES-VISIBILITY-4: one path and one fill per alpha tier (see ALPHA_TIERS).
      ctx.fillStyle = config.color;
      for (let k = 0; k < ALPHA_TIERS; k++) {
        const tier = tiers[k];
        if (tier.length === 0) continue;
        ctx.globalAlpha = (config.opacity * (k + 0.5)) / ALPHA_TIERS;
        ctx.beginPath();
        for (let i = 0; i < tier.length; i += 3) {
          ctx.moveTo(tier[i] + tier[i + 2], tier[i + 1]);
          ctx.arc(tier[i], tier[i + 1], tier[i + 2], 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    destroy() {
      bubbles = [];
    },
  };
}

export default {
  id: 'bubbles',
  label: 'Bubbles',
  description: 'Bubbles rising to the surface and popping into small droplets — top-down view',
  configSchema,
  defaultConfig,
  create,
};
