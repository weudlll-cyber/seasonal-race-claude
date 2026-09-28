// ============================================================
// File:        mud.js
// Path:        client/src/modules/track-effects/effects/mud.js
// Project:     RaceArena
// Description: Track effect — mud splat particles along the track path
// ============================================================

const configSchema = [
  // PARTICLES-VISIBILITY-3: 0 = off (nothing spawned or drawn). The maximum is where the effect is
  // clearly many on screen in an ordinary race, or lower where frame time measurably degraded first;
  // measured in the browser, see reports/particles/PARTICLES-VISIBILITY-3.md.
  // The unit is unchanged (blobs per minute), so every stored setting looks as it did.
  // The step divides the default and every stored value, so they stay on the slider's grid.
  { key: 'count', type: 'range', min: 0, max: 80000, step: 20, default: 40, label: 'Count' },
  { key: 'size', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1.2, label: 'Size' },
  { key: 'color', type: 'color', default: '#553322', label: 'Color' },
  { key: 'opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.7, label: 'Opacity' },
  { key: 'lifespan', type: 'range', min: 1, max: 4, step: 0.5, default: 2, label: 'Lifespan' },
];
const defaultConfig = Object.fromEntries(configSchema.map((f) => [f.key, f.default]));

// PARTICLES-VISIBILITY-2: `world` is the area this effect is drawn in when that is not the canvas —
// the race screen draws track effects inside the world transform and passes the world size, so
// placement (and any edge wrap or clamp below) covers the whole track instead of a canvas-sized
// corner of it. The track editor draws in screen space and passes nothing, so it keeps the canvas.
function create(canvas, config, world) {
  const { width, height } = world ?? canvas;
  let blobs = [],
    spawnAccum = 0;

  return {
    update(dt) {
      for (const b of blobs) b.age += dt;
      blobs = blobs.filter((b) => b.age < b.maxAge);
      if (config.count <= 0) return;
      spawnAccum += dt / 1000;
      const interval = 60 / config.count;
      while (spawnAccum >= interval) {
        const r = 12 * config.size;
        const n = 4 + Math.floor(Math.random() * 3);
        blobs.push({
          x: Math.random() * width,
          y: Math.random() * height,
          age: 0,
          maxAge: config.lifespan * 1000 * (0.7 + Math.random() * 0.6),
          verts: Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2;
            return { a, r: r * (0.6 + Math.random() * 0.8) };
          }),
        });
        spawnAccum -= interval;
      }
    },
    render(ctx) {
      ctx.fillStyle = config.color;
      for (const b of blobs) {
        ctx.globalAlpha = config.opacity * (1 - b.age / b.maxAge);
        ctx.beginPath();
        ctx.moveTo(
          b.x + Math.cos(b.verts[0].a) * b.verts[0].r,
          b.y + Math.sin(b.verts[0].a) * b.verts[0].r
        );
        for (let i = 1; i < b.verts.length; i++) {
          ctx.lineTo(
            b.x + Math.cos(b.verts[i].a) * b.verts[i].r,
            b.y + Math.sin(b.verts[i].a) * b.verts[i].r
          );
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    destroy() {
      blobs = [];
    },
  };
}

export default {
  id: 'mud',
  label: 'Mud',
  description: 'Irregular mud splatter blobs that fade over time — top-down view',
  configSchema,
  defaultConfig,
  create,
};
