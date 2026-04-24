import { describe, it, expect } from 'vitest';
import firefliesEffect from './fireflies.js';

const MOCK_CANVAS = { width: 800, height: 600 };

function makeMockCtx() {
  const calls = { beginPath: 0, arc: 0, fill: 0 };
  return {
    calls,
    globalAlpha: 1,
    fillStyle: '',
    shadowBlur: 0,
    shadowColor: '',
    beginPath() {
      calls.beginPath++;
    },
    arc() {
      calls.arc++;
    },
    fill() {
      calls.fill++;
    },
  };
}

describe('fireflies effect — manifest shape', () => {
  it('has all required manifest fields', () => {
    expect(firefliesEffect).toHaveProperty('id', 'fireflies');
    expect(firefliesEffect).toHaveProperty('label', 'Fireflies');
    expect(firefliesEffect).toHaveProperty('description');
    expect(Array.isArray(firefliesEffect.configSchema)).toBe(true);
    expect(firefliesEffect.configSchema.length).toBeGreaterThan(0);
    expect(typeof firefliesEffect.defaultConfig).toBe('object');
    expect(typeof firefliesEffect.create).toBe('function');
  });

  it('defaultConfig keys match configSchema keys exactly — no drift', () => {
    const schemaKeys = firefliesEffect.configSchema.map((f) => f.key).sort();
    const configKeys = Object.keys(firefliesEffect.defaultConfig).sort();
    expect(configKeys).toEqual(schemaKeys);
  });
});

describe('fireflies effect — create() contract', () => {
  it('returns object with update and render functions', () => {
    const instance = firefliesEffect.create(MOCK_CANVAS, firefliesEffect.defaultConfig);
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.render).toBe('function');
  });

  it('render() draws exactly one arc per firefly', () => {
    const config = { ...firefliesEffect.defaultConfig, count: 8 };
    const instance = firefliesEffect.create(MOCK_CANVAS, config);
    instance.update(16);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(8);
    expect(ctx.calls.fill).toBe(8);
  });

  it('render() with count = 0 makes no draw calls', () => {
    const config = { ...firefliesEffect.defaultConfig, count: 0 };
    const instance = firefliesEffect.create(MOCK_CANVAS, config);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(0);
  });

  it('update() advances state without throwing', () => {
    const instance = firefliesEffect.create(MOCK_CANVAS, firefliesEffect.defaultConfig);
    instance.update(500);
    expect(() => instance.render(makeMockCtx())).not.toThrow();
  });

  it('render() resets shadowBlur to 0 and globalAlpha to 1 after drawing', () => {
    const config = { ...firefliesEffect.defaultConfig, count: 2, glow: 0.5 };
    const instance = firefliesEffect.create(MOCK_CANVAS, config);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.shadowBlur).toBe(0);
    expect(ctx.globalAlpha).toBe(1);
  });
});
