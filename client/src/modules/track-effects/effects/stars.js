// ============================================================
// File:        stars.js
// Path:        client/src/modules/track-effects/effects/stars.js
// Project:     RaceArena
// Description: Track effect — twinkling star particles as a background overlay
// ============================================================

const configSchema = [
  { key: 'count', type: 'range', min: 50, max: 500, step: 10, default: 150, label: 'Count' },
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

function create(canvas, config) {
  const { width, height } = canvas;

  const stars = Array.from({ length: config.count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    phaseOffset: Math.random() * 2 * Math.PI,
    baseSize: 0.6 + Math.random() * 0.8,
  }));

  let elapsed = 0;

  return {
    update(deltaTime) {
      elapsed += deltaTime * config.twinkleSpeed;
    },
    render(ctx) {
      for (const star of stars) {
        const brightness = 0.5 + 0.5 * Math.sin(elapsed + star.phaseOffset);
        ctx.globalAlpha = config.opacity * brightness;
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, config.size * star.baseSize, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
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
