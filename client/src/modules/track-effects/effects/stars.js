// ============================================================
// File:        stars.js
// Path:        client/src/modules/track-effects/effects/stars.js
// Project:     RaceArena
// Description: Track effect — twinkling star particles as a background overlay
// ============================================================

const configSchema = [
  // PARTICLES-VISIBILITY-3: 0 = off (nothing spawned or drawn). The maximum is where the effect is
  // clearly many on screen in an ordinary race, or lower where frame time measurably degraded first;
  // measured in the browser, see reports/particles/PARTICLES-VISIBILITY-3.md.
  // The unit is unchanged (stars on the track at once), so every stored setting looks as it did.
  // The step divides the default and every stored value, so they stay on the slider's grid.
  { key: 'count', type: 'range', min: 0, max: 2000, step: 10, default: 150, label: 'Count' },
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
function create(canvas, config, world) {
  const { width, height } = world ?? canvas;

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
