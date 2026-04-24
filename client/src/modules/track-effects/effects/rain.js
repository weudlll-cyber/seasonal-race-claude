const configSchema = [
  { key: 'count', type: 'range', min: 10, max: 500, step: 10, default: 200, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 5, step: 0.1, default: 1, label: 'Size' },
  { key: 'color', type: 'color', default: '#88aaff', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.4, label: 'Opacity' },
  { key: 'speed', type: 'range', min: 0.1, max: 5, step: 0.1, default: 3, label: 'Speed' },
  {
    key: 'direction',
    type: 'select',
    options: ['down', 'random'],
    default: 'down',
    label: 'Direction',
  },
];

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

function create(canvas, config) {
  const { width, height } = canvas;

  const resetDrop = (d, randomY = false) => {
    d.x = Math.random() * width;
    d.y = randomY ? Math.random() * height : -(10 + Math.random() * 20);
    d.length = 10 + Math.random() * 10;
    d.vx = config.direction === 'random' ? (Math.random() - 0.5) * 0.4 : 0;
  };

  const drops = Array.from({ length: config.count }, () => {
    const d = { x: 0, y: 0, length: 0, vx: 0 };
    resetDrop(d, true);
    return d;
  });

  const BASE = 6;

  return {
    update(dt) {
      const dy = config.speed * BASE * (dt / 16);
      for (const d of drops) {
        d.y += dy;
        d.x += d.vx * dy;
        if (d.y > height + d.length) resetDrop(d, false);
      }
    },
    render(ctx) {
      if (drops.length === 0) return;
      ctx.globalAlpha = config.opacity;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.size;
      ctx.beginPath();
      for (const d of drops) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.vx * d.length, d.y - d.length);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  };
}

export default {
  id: 'rain',
  label: 'Rain',
  description: 'Falling rain lines for stormy tracks',
  configSchema,
  defaultConfig,
  create,
};
