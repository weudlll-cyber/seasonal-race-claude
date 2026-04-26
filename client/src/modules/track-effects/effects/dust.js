// ============================================================
// File:        dust.js
// Path:        client/src/modules/track-effects/effects/dust.js
// Project:     RaceArena
// Description: Track effect — drifting dust particles along the track path
// ============================================================

const configSchema = [
  { key: 'count', type: 'range', min: 10, max: 500, step: 10, default: 80, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 5, step: 0.1, default: 0.8, label: 'Size' },
  { key: 'color', type: 'color', default: '#ddcc99', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.35, label: 'Opacity' },
  { key: 'drift', type: 'range', min: 0, max: 1, step: 0.05, default: 0.8, label: 'Drift' },
  {
    key: 'direction',
    type: 'select',
    options: ['right', 'left', 'random'],
    default: 'random',
    label: 'Direction',
  },
];

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

function create(canvas, config) {
  const { width, height } = canvas;

  const baseVx = config.direction === 'left' ? -1 : config.direction === 'right' ? 1 : 0;

  const particles = Array.from({ length: config.count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (baseVx + (Math.random() - 0.5)) * 0.03,
    vy: (Math.random() - 0.5) * 0.015,
    ratio: 0.5 + Math.random(),
  }));

  return {
    update(dt) {
      for (const p of particles) {
        p.x += p.vx * config.drift * dt;
        p.y += p.vy * dt;
        if (p.x < -50) p.x = width + 50;
        if (p.x > width + 50) p.x = -50;
        if (p.y < -50) p.y = height + 50;
        if (p.y > height + 50) p.y = -50;
      }
    },
    render(ctx) {
      for (const p of particles) {
        ctx.globalAlpha = config.opacity;
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, config.size * p.ratio * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

export default {
  id: 'dust',
  label: 'Dust',
  description: 'Drifting dust particles for dry and desert tracks',
  configSchema,
  defaultConfig,
  create,
};
