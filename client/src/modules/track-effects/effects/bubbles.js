const configSchema = [
  { key: 'count', type: 'range', min: 10, max: 500, step: 10, default: 60, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 5, step: 0.1, default: 1.2, label: 'Size' },
  { key: 'color', type: 'color', default: '#aaddff', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.6, label: 'Opacity' },
  { key: 'speed', type: 'range', min: 0.1, max: 5, step: 0.1, default: 1, label: 'Speed' },
  { key: 'drift', type: 'range', min: 0, max: 1, step: 0.05, default: 0.3, label: 'Drift' },
];

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

function create(canvas, config) {
  const { width, height } = canvas;

  const bubbles = Array.from({ length: config.count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    phase: Math.random() * Math.PI * 2,
    ratio: 0.6 + Math.random() * 0.8,
  }));

  let elapsed = 0;

  return {
    update(dt) {
      elapsed += dt;
      const rise = config.speed * 0.04 * height * (dt / 1000);
      for (const b of bubbles) {
        b.y -= rise;
        if (b.y < -(config.size * b.ratio * 8)) {
          b.y = height + config.size * b.ratio * 8;
          b.x = Math.random() * width;
        }
      }
    },
    render(ctx) {
      for (const b of bubbles) {
        const r = config.size * b.ratio * 4;
        const bx = b.x + Math.sin(elapsed * 0.001 + b.phase) * config.drift * 30;
        ctx.globalAlpha = config.opacity;
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(bx, b.y, r, 0, Math.PI * 2);
        ctx.fill();
        // Inner highlight
        ctx.globalAlpha = config.opacity * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx - r * 0.3, b.y - r * 0.3, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

export default {
  id: 'bubbles',
  label: 'Bubbles',
  description: 'Rising bubbles for water-themed tracks',
  configSchema,
  defaultConfig,
  create,
};
