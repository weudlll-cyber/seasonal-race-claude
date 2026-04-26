// ============================================================
// File:        bubbles.js
// Path:        client/src/modules/track-effects/effects/bubbles.js
// Project:     RaceArena
// Description: Track effect — floating bubble particles along the track path
// ============================================================

const configSchema = [
  { key: 'count', type: 'range', min: 10, max: 100, step: 5, default: 40, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1.2, label: 'Size' },
  { key: 'color', type: 'color', default: '#aaddff', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.6, label: 'Opacity' },
];
const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

function create(canvas, config) {
  const { width, height } = canvas;
  let bubbles = [],
    spawnAccum = 0;
  const RISE = 500;
  const POP = 300;

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
      ctx.fillStyle = config.color;
      for (const b of bubbles) {
        if (b.age < b.riseMs) {
          const t = b.age / b.riseMs;
          ctx.globalAlpha = config.opacity * Math.min(t * 3, 1);
          ctx.beginPath();
          ctx.arc(b.x, b.y, Math.max(0.5, config.size * 4 * t), 0, Math.PI * 2);
          ctx.fill();
        } else {
          const t = (b.age - b.riseMs) / POP;
          const spread = config.size * 12 * t;
          for (const s of b.splitters) {
            ctx.globalAlpha = config.opacity * (1 - t);
            ctx.beginPath();
            ctx.arc(
              b.x + s.dx * spread,
              b.y + s.dy * spread,
              Math.max(0.5, config.size * 2 * (1 - t)),
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
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
