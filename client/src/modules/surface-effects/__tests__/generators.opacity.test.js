// @vitest-environment node
// ============================================================
// File:        generators.opacity.test.js
// Path:        client/src/modules/surface-effects/__tests__/generators.opacity.test.js
// Project:     RaceArena — PARTICLES-VISIBILITY-3
// Description: Each racer-trail generator's starting opacity is a setting now. Its default must be the
//              constant it hard-coded before (so every stored class renders as it did), a config with
//              no `opacity` key must fall back to that default, and a changed opacity must reach the
//              alpha the trail is actually drawn with.
// ============================================================
import { describe, it, expect } from 'vitest';
import cloud from '../generators/cloud.js';
import line from '../generators/line.js';
import particle from '../generators/particle.js';
import splash from '../generators/splash.js';

// The constants the four generators hard-coded until PARTICLES-VISIBILITY-3.
const OLD = [
  [cloud, 0.6],
  [line, 0.7],
  [particle, 0.8],
  [splash, 0.85],
];

/** Records the globalAlpha in force at every draw call. */
function recordingCtx() {
  const alphas = [];
  const draw = () => alphas.push(ctx.globalAlpha);
  const noop = () => {};
  const ctx = {
    alphas,
    globalAlpha: 1,
    canvas: { width: 1000, height: 1000 },
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: draw,
    stroke: draw,
    drawImage: draw,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: '',
  };
  return ctx;
}

/** Spawn one fresh particle/segment near the canvas centre and return the pool. */
function spawnFresh(gen, config) {
  const inst = gen.create({ ...config, spawnProbability: 1 });
  const out = [];
  if (gen === line) inst.spawn(out, 500, 500, 1, 0); // the line generator emits from the second call
  inst.spawn(out, 510, 510, 1, 0);
  return { inst, out };
}

describe.each(OLD)('%s', (gen, oldConstant) => {
  it('has an opacity setting from 0 to 1 whose default is the old constant', () => {
    const field = gen.configSchema.find((f) => f.key === 'opacity');
    expect(field).toBeDefined();
    expect(field.min).toBe(0);
    expect(field.max).toBe(1);
    expect(field.default).toBe(oldConstant);
    expect(gen.defaultConfig.opacity).toBe(oldConstant);
  });

  it('a stored config WITHOUT the key starts at the old constant', () => {
    const { opacity: _drop, ...stored } = gen.defaultConfig;
    const { out } = spawnFresh(gen, stored);
    expect(out.length).toBeGreaterThan(0);
    for (const p of out) expect(p.alpha).toBe(oldConstant);
  });

  it('a changed opacity reaches the drawn alpha', () => {
    const drawnAt = (opacity) => {
      const { inst, out } = spawnFresh(gen, { ...gen.defaultConfig, opacity });
      const ctx = recordingCtx();
      inst.render(ctx, out);
      expect(ctx.alphas.length).toBeGreaterThan(0);
      return Math.max(...ctx.alphas);
    };
    const atDefault = drawnAt(oldConstant);
    const atFull = drawnAt(1);
    const atLow = drawnAt(0.2);
    // Drawn alpha scales with the setting (the line generator draws a bucket midpoint, not the
    // exact value, so the test compares ratios rather than equality).
    expect(atFull / atDefault).toBeCloseTo(1 / oldConstant, 5);
    expect(atLow / atDefault).toBeCloseTo(0.2 / oldConstant, 5);
  });
});
