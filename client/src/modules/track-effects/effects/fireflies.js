// ============================================================
// File:        fireflies.js
// Path:        client/src/modules/track-effects/effects/fireflies.js
// Project:     RaceArena
// Description: Track effect — blinking firefly particles around the track
// ============================================================

import { cullBounds, isVisible } from '../../surface-effects/generators/spriteHelpers.js';

const configSchema = [
  // PARTICLES-VISIBILITY-3: 0 = off (nothing spawned or drawn). The maximum is where the effect is
  // clearly many on screen in an ordinary race, or lower where frame time measurably degraded first;
  // measured in the browser, see reports/particles/PARTICLES-VISIBILITY-3.md.
  // The unit is unchanged (fireflies on the track at once), so every stored setting looks as it did.
  // The step divides the default and every stored value, so they stay on the slider's grid.
  // PARTICLES-VISIBILITY-7: maximum lowered 4000 → 250, the owner's decision of 2026-09-28. 250 is the
  // highest level at which every run kept frame-time median and p90 inside the range of ten no-effect runs,
  // for the pre-start flight and the first 10 s of racing; 300 already halved the frame rate in one run.
  // Measured in the browser, see reports/particles/PARTICLES-VISIBILITY-7.md for the rule and the numbers.
  { key: 'count', type: 'range', min: 0, max: 250, step: 10, default: 30, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 5, step: 0.1, default: 1.5, label: 'Size' },
  { key: 'color', type: 'color', default: '#ffee88', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.8, label: 'Opacity' },
  { key: 'drift', type: 'range', min: 0, max: 1, step: 0.05, default: 0.6, label: 'Drift' },
  {
    key: 'pulseSpeed',
    type: 'range',
    min: 0,
    max: 3,
    step: 0.1,
    default: 0.8,
    label: 'Pulse Speed',
  },
  { key: 'glow', type: 'range', min: 0, max: 1, step: 0.05, default: 0.5, label: 'Glow' },
];

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

// PARTICLES-VISIBILITY-2: `world` is the area this effect is drawn in when that is not the canvas —
// the race screen draws track effects inside the world transform and passes the world size, so
// placement (and any edge wrap or clamp below) covers the whole track instead of a canvas-sized
// corner of it. PARTICLES-VISIBILITY-9: the track editor now passes its world size too and draws inside
// its own world transform, so its preview shows what the race shows. With no `world`, the canvas is used.
function create(canvas, config, world) {
  const { width, height } = world ?? canvas;

  const flies = Array.from({ length: config.count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    phase: Math.random() * Math.PI * 2,
    driftPhase: Math.random() * Math.PI * 2,
  }));

  let elapsed = 0;

  return {
    update(dt) {
      elapsed += dt;
      const t = elapsed * 0.001;
      for (const f of flies) {
        f.x += Math.cos(t * config.drift * 1.3 + f.driftPhase) * 0.5;
        f.y += Math.sin(t * config.drift * 0.9 + f.phase) * 0.5;
        if (f.x < 0) f.x = 0;
        if (f.x > width) f.x = width;
        if (f.y < 0) f.y = 0;
        if (f.y > height) f.y = height;
      }
    },
    render(ctx) {
      const pulse = 0.7 + 0.3 * Math.sin(elapsed * 0.001 * config.pulseSpeed);
      // PARTICLES-VISIBILITY-4: skip items whose drawn circle does not touch the canvas (both axis
      // scales, the helper racer trails use). Only DRAWING is skipped — update() still moves every item,
      // so nothing pops in when the camera turns. The margin is the item's drawn radius.
      // The glow is a shadowBlur in SCREEN pixels (the transform does not scale it), so it is
      // converted to world units with the smaller axis scale before it is added to the margin.
      const cull = cullBounds(ctx);
      const r = config.size * 2;
      const reach = r + (config.glow * 15) / Math.min(cull.sx, cull.sy);
      // PARTICLES-VISIBILITY-4: every firefly shares one colour, one alpha and one glow, so the state
      // is set once and all visible flies are filled as ONE path — the glow (a shadow blur, the
      // expensive part) is computed once per frame instead of once per fly.
      if (config.glow > 0) {
        ctx.shadowBlur = config.glow * 15;
        ctx.shadowColor = config.color;
      }
      ctx.globalAlpha = config.opacity * pulse;
      ctx.fillStyle = config.color;
      ctx.beginPath();
      let drawn = 0;
      for (const f of flies) {
        if (!isVisible(cull, f.x, f.y, reach)) continue;
        ctx.moveTo(f.x + r, f.y);
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        drawn++;
      }
      if (drawn > 0) ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    },
    destroy() {
      flies.length = 0;
    },
  };
}

export default {
  id: 'fireflies',
  label: 'Fireflies',
  description: 'Drifting glowing points for garden and forest tracks',
  configSchema,
  defaultConfig,
  create,
};
