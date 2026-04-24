const configSchema = [
  { key: 'count', type: 'range', min: 10, max: 500, step: 10, default: 40, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 5, step: 0.1, default: 1.2, label: 'Size' },
  { key: 'color', type: 'color', default: '#553322', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.7, label: 'Opacity' },
  { key: 'gravity', type: 'range', min: -1, max: 1, step: 0.05, default: 0.6, label: 'Gravity' },
  { key: 'lifespan', type: 'range', min: 0.5, max: 10, step: 0.5, default: 2, label: 'Lifespan' },
  { key: 'spawnRate', type: 'range', min: 0, max: 10, step: 0.5, default: 4, label: 'Spawn Rate' },
];

const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

function create(canvas, config) {
  const { width, height } = canvas;

  let particles = [];
  let spawnAccum = 0;

  const mkP = () => ({
    x: Math.random() * width,
    y: height - 20 + Math.random() * 20,
    vx: (Math.random() - 0.5) * 3,
    vy: -(1 + Math.random() * 3),
    age: 0,
    life: config.lifespan * (0.7 + Math.random() * 0.6),
  });

  return {
    update(dt) {
      if (config.spawnRate > 0) {
        spawnAccum += dt / 1000;
        const interval = 1 / config.spawnRate;
        while (spawnAccum >= interval && particles.length < config.count) {
          particles.push(mkP());
          spawnAccum -= interval;
        }
        spawnAccum %= interval;
      }
      for (const p of particles) {
        p.vy += config.gravity * 0.3 * (dt / 16);
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.age += dt / 1000;
      }
      particles = particles.filter((p) => p.age < p.life);
    },
    render(ctx) {
      for (const p of particles) {
        ctx.globalAlpha = config.opacity * Math.max(0, 1 - p.age / p.life);
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, config.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

export default {
  id: 'mud',
  label: 'Mud',
  description: 'Splash bursts and ground-level muddy particles',
  configSchema,
  defaultConfig,
  create,
};
