// ============================================================
// File:        dust.js
// Path:        client/src/modules/track-effects/effects/dust.js
// Project:     RaceArena
// Description: Track effect — drifting dust particles along the track path
// ============================================================

const configSchema = [
  // PARTICLES-VISIBILITY-3: 0 = off (nothing spawned or drawn). The maximum is where the effect is
  // clearly many on screen in an ordinary race, or lower where frame time measurably degraded first;
  // measured in the browser, see reports/particles/PARTICLES-VISIBILITY-3.md.
  // The unit is unchanged (particles on the track at once), so every stored setting looks as it did.
  // The step divides the default and every stored value, so they stay on the slider's grid.
  { key: 'count', type: 'range', min: 0, max: 4000, step: 10, default: 80, label: 'Count' },
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

// PARTICLES-VISIBILITY-2: `world` is the area this effect is drawn in when that is not the canvas —
// the race screen draws track effects inside the world transform and passes the world size, so
// placement (and any edge wrap or clamp below) covers the whole track instead of a canvas-sized
// corner of it. The track editor draws in screen space and passes nothing, so it keeps the canvas.
function create(canvas, config, world) {
  const { width, height } = world ?? canvas;

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
    destroy() {
      particles.length = 0;
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
