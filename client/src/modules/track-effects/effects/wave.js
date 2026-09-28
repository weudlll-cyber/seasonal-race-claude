// ============================================================
// File:        wave.js
// Path:        client/src/modules/track-effects/effects/wave.js
// Project:     RaceArena
// Description: Track effect — sinusoidal wave bands scrolling across the track
// ============================================================

const configSchema = [
  // PARTICLES-VISIBILITY-3: 0 = off (nothing spawned or drawn). The maximum is where the effect is
  // clearly many on screen in an ordinary race, or lower where frame time measurably degraded first;
  // measured in the browser, see reports/particles/PARTICLES-VISIBILITY-3.md.
  // The unit is unchanged (ripples on the track at once), so every stored setting looks as it did.
  // The step divides the default and every stored value, so they stay on the slider's grid.
  { key: 'count', type: 'range', min: 0, max: 500, step: 1, default: 6, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 3, step: 0.1, default: 2, label: 'Size' },
  { key: 'color', type: 'color', default: '#66bbdd', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.3, label: 'Opacity' },
  { key: 'speed', type: 'range', min: 0.3, max: 2, step: 0.1, default: 0.8, label: 'Speed' },
];
const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

const MAX_R = 60;
const MAX_AGE = 4000;

// PARTICLES-VISIBILITY-2: `world` is the area this effect is drawn in when that is not the canvas —
// the race screen draws track effects inside the world transform and passes the world size, so
// placement (and any edge wrap or clamp below) covers the whole track instead of a canvas-sized
// corner of it. The track editor draws in screen space and passes nothing, so it keeps the canvas.
function create(canvas, config, world) {
  const { width, height } = world ?? canvas;
  const ripples = Array.from({ length: config.count }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    age: (i / Math.max(config.count, 1)) * MAX_AGE,
    maxAge: MAX_AGE * (0.8 + Math.random() * 0.4),
  }));

  return {
    update(dt) {
      for (const r of ripples) {
        r.age += dt * config.speed;
        if (r.age >= r.maxAge) {
          r.x = Math.random() * width;
          r.y = Math.random() * height;
          r.age = 0;
          r.maxAge = MAX_AGE * (0.8 + Math.random() * 0.4);
        }
      }
    },
    render(ctx) {
      if (ripples.length === 0) return;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 1.5;
      for (const r of ripples) {
        const t = r.age / r.maxAge;
        ctx.globalAlpha = config.opacity * Math.sin(t * Math.PI);
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0.5, t * MAX_R * config.size), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    destroy() {
      ripples.length = 0;
    },
  };
}

export default {
  id: 'wave',
  label: 'Wave',
  description: 'Calm water ripples expanding from random points — top-down view',
  configSchema,
  defaultConfig,
  create,
};
