// ============================================================
// File:        rain.js
// Path:        client/src/modules/track-effects/effects/rain.js
// Project:     RaceArena
// Description: Track effect — falling rain streaks over the track area
// ============================================================

import { cullBounds, isVisible } from '../../surface-effects/generators/spriteHelpers.js';

const configSchema = [
  // PARTICLES-VISIBILITY-4: maximum raised 2000 → 4000 — with off-screen culling and cheaper drawing,
  // frame time stays as with the effect off at 4000, in the race camera AND with the whole track in view.
  // PARTICLES-VISIBILITY-3: 0 = off (nothing spawned or drawn). The maximum is where the effect is
  // clearly many on screen in an ordinary race, or lower where frame time measurably degraded first;
  // measured in the browser, see reports/particles/PARTICLES-VISIBILITY-3.md.
  // The unit is unchanged (drops per second), so every stored setting looks as it did.
  // The step divides the default and every stored value, so they stay on the slider's grid.
  { key: 'count', type: 'range', min: 0, max: 4000, step: 10, default: 200, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1, label: 'Size' },
  { key: 'color', type: 'color', default: '#88aaff', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.5, label: 'Opacity' },
];
const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

const MAX_R = 12;
const MAX_AGE = 500;

// PARTICLES-VISIBILITY-4: rings are drawn in this many alpha tiers, one stroke per tier, instead of
// one stroke per ring. Each ring takes its tier's midpoint alpha — at most 1/16 of the opacity away
// from its own.
const ALPHA_TIERS = 8;

/**
 * @param {{width:number,height:number}} canvas  the drawing surface
 * @param {object} config
 * @param {{width:number,height:number}} [world]  the area the drops are drawn in, when it is not the
 *   canvas. PARTICLES-VISIBILITY-2: the race screen draws track effects INSIDE the world transform,
 *   so drops placed over the canvas size (1280x720) only ever landed in the world's top-left corner;
 *   it now passes the world size here. The track editor draws effects in screen space and passes
 *   nothing, so it keeps the canvas. `count` stays drops per second over whichever area this is.
 */
function create(canvas, config, world) {
  const { width, height } = world ?? canvas;
  let drops = [];
  let spawnAccum = 0;

  // One reusable list per alpha tier, refilled every frame (no per-frame allocation).
  const tiers = Array.from({ length: ALPHA_TIERS }, () => []);

  return {
    update(dt) {
      for (const d of drops) d.age += dt;
      drops = drops.filter((d) => d.age < d.maxAge);
      if (config.count <= 0) return;
      spawnAccum += dt / 1000;
      const interval = 1 / config.count;
      while (spawnAccum >= interval) {
        drops.push({
          x: Math.random() * width,
          y: Math.random() * height,
          age: 0,
          maxAge: MAX_AGE * (0.7 + Math.random() * 0.6),
        });
        spawnAccum -= interval;
      }
    },
    render(ctx) {
      if (drops.length === 0) return;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 1;
      // PARTICLES-VISIBILITY-4: skip items whose drawn circle does not touch the canvas (both axis
      // scales, the helper racer trails use). Only DRAWING is skipped — update() still moves every item,
      // so nothing pops in when the camera turns. The margin is the item's drawn radius.
      const cull = cullBounds(ctx);
      for (const tier of tiers) tier.length = 0;
      for (const d of drops) {
        const t = d.age / d.maxAge;
        if (!isVisible(cull, d.x, d.y, Math.max(0.5, t * MAX_R * config.size) + ctx.lineWidth / 2))
          continue;
        tiers[Math.min(ALPHA_TIERS - 1, Math.floor((1 - t) * ALPHA_TIERS))].push(d);
      }
      // PARTICLES-VISIBILITY-4: one path and one stroke per alpha tier (see ALPHA_TIERS).
      for (let k = 0; k < ALPHA_TIERS; k++) {
        if (tiers[k].length === 0) continue;
        ctx.globalAlpha = (config.opacity * (k + 0.5)) / ALPHA_TIERS;
        ctx.beginPath();
        for (const d of tiers[k]) {
          const t = d.age / d.maxAge;
          const radius = Math.max(0.5, t * MAX_R * config.size);
          ctx.moveTo(d.x + radius, d.y);
          ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    destroy() {
      drops = [];
    },
  };
}

export default {
  id: 'rain',
  label: 'Rain',
  description: 'Raindrops hitting a flat surface — expanding impact rings seen from above',
  configSchema,
  defaultConfig,
  create,
};
