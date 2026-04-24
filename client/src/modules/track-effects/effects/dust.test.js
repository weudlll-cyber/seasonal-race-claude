import { describe, it, expect } from 'vitest';
import dustEffect from './dust.js';

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

describe('dust effect — manifest shape', () => {
  it('has all required manifest fields', () => {
    expect(dustEffect).toHaveProperty('id', 'dust');
    expect(dustEffect).toHaveProperty('label', 'Dust');
    expect(dustEffect).toHaveProperty('description');
    expect(Array.isArray(dustEffect.configSchema)).toBe(true);
    expect(dustEffect.configSchema.length).toBeGreaterThan(0);
    expect(typeof dustEffect.defaultConfig).toBe('object');
    expect(typeof dustEffect.create).toBe('function');
  });

  it('defaultConfig keys match configSchema keys exactly — no drift', () => {
    const schemaKeys = dustEffect.configSchema.map((f) => f.key).sort();
    const configKeys = Object.keys(dustEffect.defaultConfig).sort();
    expect(configKeys).toEqual(schemaKeys);
  });

  it('direction field has select type with options', () => {
    const dirField = dustEffect.configSchema.find((f) => f.key === 'direction');
    expect(dirField).toBeDefined();
    expect(dirField.type).toBe('select');
    expect(dirField.options).toContain('random');
  });
});

describe('dust effect — create() contract', () => {
  it('returns object with update and render functions', () => {
    const instance = dustEffect.create(MOCK_CANVAS, dustEffect.defaultConfig);
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.render).toBe('function');
  });

  it('render() draws exactly one arc per dust particle', () => {
    const config = { ...dustEffect.defaultConfig, count: 7 };
    const instance = dustEffect.create(MOCK_CANVAS, config);
    instance.update(16);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(7);
    expect(ctx.calls.fill).toBe(7);
  });

  it('render() with count = 0 makes no draw calls', () => {
    const config = { ...dustEffect.defaultConfig, count: 0 };
    const instance = dustEffect.create(MOCK_CANVAS, config);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(0);
  });

  it('update() moves particles without throwing', () => {
    const instance = dustEffect.create(MOCK_CANVAS, dustEffect.defaultConfig);
    instance.update(200);
    expect(() => instance.render(makeMockCtx())).not.toThrow();
  });

  it('render() resets globalAlpha to 1 after drawing', () => {
    const config = { ...dustEffect.defaultConfig, count: 4 };
    const instance = dustEffect.create(MOCK_CANVAS, config);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.globalAlpha).toBe(1);
  });
});
