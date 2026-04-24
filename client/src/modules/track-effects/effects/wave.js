const configSchema = [
  { key: 'count', type: 'range', min: 2, max: 20, step: 1, default: 6, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 3, step: 0.1, default: 2, label: 'Size' },
  { key: 'color', type: 'color', default: '#66bbdd', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.3, label: 'Opacity' },
  { key: 'speed', type: 'range', min: 0.3, max: 2, step: 0.1, default: 0.8, label: 'Speed' },
];
const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

const MAX_R = 60;
const MAX_AGE = 4000;

function create(canvas, config) {
  const { width, height } = canvas;
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
