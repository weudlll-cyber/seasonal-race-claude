import { describe, it, expect } from 'vitest';
import rainEffect from './rain.js';

const MOCK_CANVAS = { width: 800, height: 600 };

function makeMockCtx() {
  const calls = { beginPath: 0, arc: 0, stroke: 0 };
  return {
    calls,
    globalAlpha: 1,
    strokeStyle: '',
    lineWidth: 1,
    beginPath() {
      calls.beginPath++;
    },
    arc() {
      calls.arc++;
    },
    stroke() {
      calls.stroke++;
    },
  };
}

describe('rain effect — manifest shape', () => {
  it('has all required manifest fields', () => {
    expect(rainEffect).toHaveProperty('id', 'rain');
    expect(rainEffect).toHaveProperty('label', 'Rain');
    expect(rainEffect).toHaveProperty('description');
    expect(Array.isArray(rainEffect.configSchema)).toBe(true);
    expect(rainEffect.configSchema.length).toBeGreaterThan(0);
    expect(typeof rainEffect.defaultConfig).toBe('object');
    expect(typeof rainEffect.create).toBe('function');
  });

  it('defaultConfig keys match configSchema keys exactly — no drift', () => {
    const schemaKeys = rainEffect.configSchema.map((f) => f.key).sort();
    const configKeys = Object.keys(rainEffect.defaultConfig).sort();
    expect(configKeys).toEqual(schemaKeys);
  });

  it('schema does not include deprecated side-view fields', () => {
    const keys = rainEffect.configSchema.map((f) => f.key);
    expect(keys).not.toContain('speed');
    expect(keys).not.toContain('direction');
  });
});

describe('rain effect — create() contract', () => {
  it('returns object with update and render functions', () => {
    const instance = rainEffect.create(MOCK_CANVAS, rainEffect.defaultConfig);
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.render).toBe('function');
  });

  it('render() draws one arc per active drop after spawning', () => {
    // count=10 drops/sec, interval=0.1s → update(1000ms) spawns exactly 10 drops
    const config = { ...rainEffect.defaultConfig, count: 10 };
    const instance = rainEffect.create(MOCK_CANVAS, config);
    instance.update(1000);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(10);
    expect(ctx.calls.stroke).toBe(10);
  });

  it('render() with count = 0 makes no draw calls', () => {
    const config = { ...rainEffect.defaultConfig, count: 0 };
    const instance = rainEffect.create(MOCK_CANVAS, config);
    instance.update(1000);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(0);
    expect(ctx.calls.stroke).toBe(0);
  });

  it('update() advances drops without throwing', () => {
    const instance = rainEffect.create(MOCK_CANVAS, rainEffect.defaultConfig);
    instance.update(200);
    expect(() => instance.render(makeMockCtx())).not.toThrow();
  });

  it('render() resets globalAlpha to 1 after drawing', () => {
    const config = { ...rainEffect.defaultConfig, count: 10 };
    const instance = rainEffect.create(MOCK_CANVAS, config);
    instance.update(1000);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.globalAlpha).toBe(1);
  });
});
