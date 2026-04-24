import { describe, it, expect } from 'vitest';
import bubblesEffect from './bubbles.js';

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

describe('bubbles effect — manifest shape', () => {
  it('has all required manifest fields', () => {
    expect(bubblesEffect).toHaveProperty('id', 'bubbles');
    expect(bubblesEffect).toHaveProperty('label', 'Bubbles');
    expect(bubblesEffect).toHaveProperty('description');
    expect(Array.isArray(bubblesEffect.configSchema)).toBe(true);
    expect(bubblesEffect.configSchema.length).toBeGreaterThan(0);
    expect(typeof bubblesEffect.defaultConfig).toBe('object');
    expect(typeof bubblesEffect.create).toBe('function');
  });

  it('defaultConfig keys match configSchema keys exactly — no drift', () => {
    const schemaKeys = bubblesEffect.configSchema.map((f) => f.key).sort();
    const configKeys = Object.keys(bubblesEffect.defaultConfig).sort();
    expect(configKeys).toEqual(schemaKeys);
  });

  it('schema does not include deprecated side-view fields', () => {
    const keys = bubblesEffect.configSchema.map((f) => f.key);
    expect(keys).not.toContain('speed');
    expect(keys).not.toContain('drift');
  });
});

describe('bubbles effect — create() contract', () => {
  it('returns object with update and render functions', () => {
    const instance = bubblesEffect.create(MOCK_CANVAS, bubblesEffect.defaultConfig);
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.render).toBe('function');
  });

  it('render() draws one arc per rising bubble after spawning', () => {
    // count=60/min, interval=1s (exact) → update(5000ms) spawns exactly 5 bubbles (all age=0, rise phase)
    const config = { ...bubblesEffect.defaultConfig, count: 60 };
    const instance = bubblesEffect.create(MOCK_CANVAS, config);
    instance.update(5000);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(5);
    expect(ctx.calls.fill).toBe(5);
  });

  it('render() with count = 0 makes no draw calls', () => {
    const config = { ...bubblesEffect.defaultConfig, count: 0 };
    const instance = bubblesEffect.create(MOCK_CANVAS, config);
    instance.update(5000);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.arc).toBe(0);
    expect(ctx.calls.fill).toBe(0);
  });

  it('update() advances state without throwing', () => {
    const instance = bubblesEffect.create(MOCK_CANVAS, bubblesEffect.defaultConfig);
    instance.update(1000);
    expect(() => instance.render(makeMockCtx())).not.toThrow();
  });

  it('render() resets globalAlpha to 1 after drawing', () => {
    const config = { ...bubblesEffect.defaultConfig, count: 60 };
    const instance = bubblesEffect.create(MOCK_CANVAS, config);
    instance.update(5000);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.globalAlpha).toBe(1);
  });
});
