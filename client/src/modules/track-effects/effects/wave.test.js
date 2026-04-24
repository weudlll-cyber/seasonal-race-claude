import { describe, it, expect } from 'vitest';
import waveEffect from './wave.js';

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

describe('wave effect — manifest shape', () => {
  it('has all required manifest fields', () => {
    expect(waveEffect).toHaveProperty('id', 'wave');
    expect(waveEffect).toHaveProperty('label', 'Wave');
    expect(waveEffect).toHaveProperty('description');
    expect(Array.isArray(waveEffect.configSchema)).toBe(true);
    expect(waveEffect.configSchema.length).toBeGreaterThan(0);
    expect(typeof waveEffect.defaultConfig).toBe('object');
    expect(typeof waveEffect.create).toBe('function');
  });

  it('defaultConfig keys match configSchema keys exactly — no drift', () => {
    const schemaKeys = waveEffect.configSchema.map((f) => f.key).sort();
    const configKeys = Object.keys(waveEffect.defaultConfig).sort();
    expect(configKeys).toEqual(schemaKeys);
  });

  it('schema does not include deprecated pulseSpeed field', () => {
    const keys = waveEffect.configSchema.map((f) => f.key);
    expect(keys).not.toContain('pulseSpeed');
  });
});

describe('wave effect — create() contract', () => {
  it('returns object with update and render functions', () => {
    const instance = waveEffect.create(MOCK_CANVAS, waveEffect.defaultConfig);
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.render).toBe('function');
  });

  it('render() draws one ring per active ripple', () => {
    // count=5 → 5 ripples pre-allocated at create time
    const config = { ...waveEffect.defaultConfig, count: 5 };
    const instance = waveEffect.create(MOCK_CANVAS, config);
    instance.update(16);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(5);
    expect(ctx.calls.stroke).toBe(5);
  });

  it('render() with count = 0 makes no draw calls', () => {
    const config = { ...waveEffect.defaultConfig, count: 0 };
    const instance = waveEffect.create(MOCK_CANVAS, config);
    instance.update(16);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(0);
    expect(ctx.calls.stroke).toBe(0);
  });

  it('update() advances ripple age without throwing', () => {
    const instance = waveEffect.create(MOCK_CANVAS, waveEffect.defaultConfig);
    instance.update(300);
    expect(() => instance.render(makeMockCtx())).not.toThrow();
  });

  it('render() resets globalAlpha to 1 after drawing', () => {
    const config = { ...waveEffect.defaultConfig, count: 3 };
    const instance = waveEffect.create(MOCK_CANVAS, config);
    instance.update(16);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.globalAlpha).toBe(1);
  });
});
