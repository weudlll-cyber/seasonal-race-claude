// ============================================================
// File:        stars.js
// Path:        client/src/modules/track-effects/effects/stars.js
// Project:     RaceArena
// Description: Track effect — twinkling star particles as a background overlay
// ============================================================

import { cullBounds, isVisible } from '../../surface-effects/generators/spriteHelpers.js';

const configSchema = [
  // PARTICLES-VISIBILITY-4: maximum raised 2000 → 8000 — with off-screen culling and cheaper drawing,
  // frame time stays as with the effect off at 8000, in the race camera AND with the whole track in view.
  // PARTICLES-VISIBILITY-3: 0 = off (nothing spawned or drawn). The maximum is where the effect is
  // clearly many on screen in an ordinary race, or lower where frame time measurably degraded first;
  // measured in the browser, see reports/particles/PARTICLES-VISIBILITY-3.md.
  // The unit is unchanged (stars on the track at once), so every stored setting looks as it did.
  // The step divides the default and every stored value, so they stay on the slider's grid.
  { key: 'count', type: 'range', min: 0, max: 8000, step: 10, default: 150, label: 'Count' },
  {
    key: 'twinkleSpeed',
    type: 'range',
    min: 0.1,
    max: 3,
    step: 0.1,
    default: 1,
    label: 'Twinkle Speed',
  },
  { key: 'color', type: 'color', default: '#ffffff', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.8, label: 'Opacity' },
  { key: 'size', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1.5, label: 'Size' },
];

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

// PARTICLES-VISIBILITY-2: `world` is the area this effect is drawn in when that is not the canvas —
// the race screen draws track effects inside the world transform and passes the world size, so
// placement (and any edge wrap or clamp below) covers the whole track instead of a canvas-sized
// corner of it. The track editor draws in screen space and passes nothing, so it keeps the canvas.
// PARTICLES-VISIBILITY-4: stars (by twinkle brightness) are drawn in this many alpha tiers, one path and one fill per tier,
// instead of a path, a fill and an alpha change per item. Each takes its tier's midpoint alpha — at
// most 1/32 of the opacity away from its own.
const ALPHA_TIERS = 16;

function create(canvas, config, world) {
  const { width, height } = world ?? canvas;

  const stars = Array.from({ length: config.count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    phaseOffset: Math.random() * 2 * Math.PI,
    baseSize: 0.6 + Math.random() * 0.8,
  }));

  let elapsed = 0;

  // One reusable list per alpha tier of flat (x, y, r) triples, refilled every frame (no allocation).
  const tiers = Array.from({ length: ALPHA_TIERS }, () => []);

  return {
    update(deltaTime) {
      elapsed += deltaTime * config.twinkleSpeed;
    },
    render(ctx) {
      // PARTICLES-VISIBILITY-4: skip items whose drawn circle does not touch the canvas (both axis
      // scales, the helper racer trails use). Only DRAWING is skipped — update() still moves every item,
      // so nothing pops in when the camera turns. The margin is the item's drawn radius.
      const cull = cullBounds(ctx);
      for (const tier of tiers) tier.length = 0;
      for (const star of stars) {
        const r = config.size * star.baseSize;
        if (!isVisible(cull, star.x, star.y, r)) continue;
        const brightness = 0.5 + 0.5 * Math.sin(elapsed + star.phaseOffset);
        tiers[Math.min(ALPHA_TIERS - 1, Math.floor(brightness * ALPHA_TIERS))].push(
          star.x,
          star.y,
          r
        );
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
      stars.length = 0;
    },
  };
}

export default {
  id: 'stars',
  label: 'Stars',
  description: 'Twinkling stars across the sky',
  configSchema,
  defaultConfig,
  create,
};
