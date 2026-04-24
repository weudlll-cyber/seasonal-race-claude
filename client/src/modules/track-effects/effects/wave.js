const configSchema = [
  { key: 'count', type: 'range', min: 10, max: 500, step: 10, default: 6, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 5, step: 0.1, default: 2, label: 'Size' },
  { key: 'color', type: 'color', default: '#66bbdd', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.3, label: 'Opacity' },
  { key: 'speed', type: 'range', min: 0.1, max: 5, step: 0.1, default: 0.8, label: 'Speed' },
  {
    key: 'pulseSpeed',
    type: 'range',
    min: 0,
    max: 3,
    step: 0.1,
    default: 0.5,
    label: 'Pulse Speed',
  },
];

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

const STEPS = 80;

function create(canvas, config) {
  const { width, height } = canvas;

  const nWaves = config.count;
  const waves = Array.from({ length: nWaves }, (_, i) => ({
    y: height * (0.6 + (nWaves > 1 ? i / (nWaves - 1) : 0) * 0.35),
    amplitude: 2 + Math.random() * 4,
    phase: (i / Math.max(nWaves, 1)) * Math.PI * 2,
  }));

  let elapsed = 0;

  return {
    update(dt) {
      elapsed += dt;
    },
    render(ctx) {
      if (waves.length === 0) return;
      const pulse = 0.7 + 0.3 * Math.sin(elapsed * 0.001 * config.pulseSpeed);
      ctx.globalAlpha = config.opacity;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.size;
      for (const w of waves) {
        const phase = w.phase + elapsed * 0.001 * config.speed;
        ctx.beginPath();
        ctx.moveTo(0, w.y + Math.sin(phase) * w.amplitude * pulse);
        for (let i = 1; i <= STEPS; i++) {
          const x = (i / STEPS) * width;
          const y = w.y + Math.sin(phase + (i / STEPS) * Math.PI * 4) * w.amplitude * pulse;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };
}

export default {
  id: 'wave',
  label: 'Wave',
  description: 'Undulating sine-wave lines for water-adjacent tracks',
  configSchema,
  defaultConfig,
  create,
};
