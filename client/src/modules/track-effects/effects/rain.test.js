import { describe, it, expect } from 'vitest';
import rainEffect from './rain.js';

const MOCK_CANVAS = { width: 800, height: 600 };

function makeMockCtx() {
  const calls = { beginPath: 0, moveTo: 0, lineTo: 0, stroke: 0 };
  return {
    calls,
    globalAlpha: 1,
    strokeStyle: '',
    lineWidth: 1,
    beginPath() {
      calls.beginPath++;
    },
    moveTo() {
      calls.moveTo++;
    },
    lineTo() {
      calls.lineTo++;
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

  it('direction field has select type with options', () => {
    const dirField = rainEffect.configSchema.find((f) => f.key === 'direction');
    expect(dirField).toBeDefined();
    expect(dirField.type).toBe('select');
    expect(Array.isArray(dirField.options)).toBe(true);
    expect(dirField.options).toContain('down');
  });
});

describe('rain effect — create() contract', () => {
  it('returns object with update and render functions', () => {
    const instance = rainEffect.create(MOCK_CANVAS, rainEffect.defaultConfig);
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.render).toBe('function');
  });

  it('render() draws one moveTo per raindrop', () => {
    const config = { ...rainEffect.defaultConfig, count: 12 };
    const instance = rainEffect.create(MOCK_CANVAS, config);
    instance.update(16);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.moveTo).toBe(12);
    expect(ctx.calls.lineTo).toBe(12);
  });

  it('render() with count = 0 makes no draw calls', () => {
    const config = { ...rainEffect.defaultConfig, count: 0 };
    const instance = rainEffect.create(MOCK_CANVAS, config);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.moveTo).toBe(0);
    expect(ctx.calls.stroke).toBe(0);
  });

  it('update() moves drops without throwing', () => {
    const instance = rainEffect.create(MOCK_CANVAS, rainEffect.defaultConfig);
    instance.update(200);
    expect(() => instance.render(makeMockCtx())).not.toThrow();
  });

  it('render() resets globalAlpha to 1 after drawing', () => {
    const config = { ...rainEffect.defaultConfig, count: 5 };
    const instance = rainEffect.create(MOCK_CANVAS, config);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.globalAlpha).toBe(1);
  });
});
