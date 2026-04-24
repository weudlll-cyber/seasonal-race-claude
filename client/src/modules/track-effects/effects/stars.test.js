import { describe, it, expect } from 'vitest';
import starsEffect from './stars.js';

const MOCK_CANVAS = { width: 800, height: 600 };

function makeMockCtx() {
  const calls = { beginPath: 0, arc: 0, fill: 0 };
  return {
    calls,
    globalAlpha: 1,
    fillStyle: '',
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

describe('stars effect — manifest shape', () => {
  it('has all required manifest fields', () => {
    expect(starsEffect).toHaveProperty('id', 'stars');
    expect(starsEffect).toHaveProperty('label', 'Stars');
    expect(starsEffect).toHaveProperty('description');
    expect(Array.isArray(starsEffect.configSchema)).toBe(true);
    expect(starsEffect.configSchema.length).toBeGreaterThan(0);
    expect(typeof starsEffect.defaultConfig).toBe('object');
    expect(typeof starsEffect.create).toBe('function');
  });

  it('defaultConfig keys match configSchema keys exactly — no drift', () => {
    const schemaKeys = starsEffect.configSchema.map((f) => f.key).sort();
    const configKeys = Object.keys(starsEffect.defaultConfig).sort();
    expect(configKeys).toEqual(schemaKeys);
  });
});

describe('stars effect — create() contract', () => {
  it('returns object with update and render functions', () => {
    const instance = starsEffect.create(MOCK_CANVAS, starsEffect.defaultConfig);
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.render).toBe('function');
  });

  it('render() draws exactly one circle per star', () => {
    const config = { ...starsEffect.defaultConfig, count: 10 };
    const instance = starsEffect.create(MOCK_CANVAS, config);
    instance.update(16);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(10);
    expect(ctx.calls.fill).toBe(10);
    expect(ctx.calls.beginPath).toBe(10);
  });

  it('render() with count = 0 makes no draw calls', () => {
    const config = { ...starsEffect.defaultConfig, count: 0 };
    const instance = starsEffect.create(MOCK_CANVAS, config);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(0);
    expect(ctx.calls.fill).toBe(0);
  });

  it('update() advances elapsed time without throwing', () => {
    const config = { ...starsEffect.defaultConfig, count: 1, twinkleSpeed: 2 };
    const instance = starsEffect.create(MOCK_CANVAS, config);
    instance.update(100);
    const ctx = makeMockCtx();
    expect(() => instance.render(ctx)).not.toThrow();
  });

  it('render() resets globalAlpha to 1 after drawing', () => {
    const config = { ...starsEffect.defaultConfig, count: 3 };
    const instance = starsEffect.create(MOCK_CANVAS, config);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.globalAlpha).toBe(1);
  });
});
