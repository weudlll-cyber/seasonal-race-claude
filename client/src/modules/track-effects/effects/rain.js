// ============================================================
// File:        rain.js
// Path:        client/src/modules/track-effects/effects/rain.js
// Project:     RaceArena
// Description: Track effect — falling rain streaks over the track area
// ============================================================

const configSchema = [
  { key: 'count', type: 'range', min: 50, max: 500, step: 10, default: 200, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1, label: 'Size' },
  { key: 'color', type: 'color', default: '#88aaff', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.5, label: 'Opacity' },
];
const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

const MAX_R = 12;
const MAX_AGE = 500;

function create(canvas, config) {
  const { width, height } = canvas;
  let drops = [];
  let spawnAccum = 0;

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
      for (const d of drops) {
        const t = d.age / d.maxAge;
        ctx.globalAlpha = config.opacity * (1 - t);
        ctx.beginPath();
        ctx.arc(d.x, d.y, Math.max(0.5, t * MAX_R * config.size), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
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
