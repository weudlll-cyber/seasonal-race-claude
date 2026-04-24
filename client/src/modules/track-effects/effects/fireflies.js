const configSchema = [
  { key: 'count', type: 'range', min: 10, max: 500, step: 10, default: 30, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 5, step: 0.1, default: 1.5, label: 'Size' },
  { key: 'color', type: 'color', default: '#ffee88', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.8, label: 'Opacity' },
  { key: 'drift', type: 'range', min: 0, max: 1, step: 0.05, default: 0.6, label: 'Drift' },
  {
    key: 'pulseSpeed',
    type: 'range',
    min: 0,
    max: 3,
    step: 0.1,
    default: 0.8,
    label: 'Pulse Speed',
  },
  { key: 'glow', type: 'range', min: 0, max: 1, step: 0.05, default: 0.5, label: 'Glow' },
];

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

function create(canvas, config) {
  const { width, height } = canvas;

  const flies = Array.from({ length: config.count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    phase: Math.random() * Math.PI * 2,
    driftPhase: Math.random() * Math.PI * 2,
  }));

  let elapsed = 0;

  return {
    update(dt) {
      elapsed += dt;
      const t = elapsed * 0.001;
      for (const f of flies) {
        f.x += Math.cos(t * config.drift * 1.3 + f.driftPhase) * 0.5;
        f.y += Math.sin(t * config.drift * 0.9 + f.phase) * 0.5;
        if (f.x < 0) f.x = 0;
        if (f.x > width) f.x = width;
        if (f.y < 0) f.y = 0;
        if (f.y > height) f.y = height;
      }
    },
    render(ctx) {
      const pulse = 0.7 + 0.3 * Math.sin(elapsed * 0.001 * config.pulseSpeed);
      for (const f of flies) {
        if (config.glow > 0) {
          ctx.shadowBlur = config.glow * 15;
          ctx.shadowColor = config.color;
        }
        ctx.globalAlpha = config.opacity * pulse;
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, config.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    },
  };
}

export default {
  id: 'fireflies',
  label: 'Fireflies',
  description: 'Drifting glowing points for garden and forest tracks',
  configSchema,
  defaultConfig,
  create,
};
