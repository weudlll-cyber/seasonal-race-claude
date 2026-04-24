import { describe, it, expect } from 'vitest';
import mudEffect from './mud.js';

const MOCK_CANVAS = { width: 800, height: 600 };

function makeMockCtx() {
  const calls = { beginPath: 0, moveTo: 0, lineTo: 0, closePath: 0, fill: 0 };
  return {
    calls,
    globalAlpha: 1,
    fillStyle: '',
    beginPath() {
      calls.beginPath++;
    },
    moveTo() {
      calls.moveTo++;
    },
    lineTo() {
      calls.lineTo++;
    },
    closePath() {
      calls.closePath++;
    },
    fill() {
      calls.fill++;
    },
  };
}

describe('mud effect — manifest shape', () => {
  it('has all required manifest fields', () => {
    expect(mudEffect).toHaveProperty('id', 'mud');
    expect(mudEffect).toHaveProperty('label', 'Mud');
    expect(mudEffect).toHaveProperty('description');
    expect(Array.isArray(mudEffect.configSchema)).toBe(true);
    expect(mudEffect.configSchema.length).toBeGreaterThan(0);
    expect(typeof mudEffect.defaultConfig).toBe('object');
    expect(typeof mudEffect.create).toBe('function');
  });

  it('defaultConfig keys match configSchema keys exactly — no drift', () => {
    const schemaKeys = mudEffect.configSchema.map((f) => f.key).sort();
    const configKeys = Object.keys(mudEffect.defaultConfig).sort();
    expect(configKeys).toEqual(schemaKeys);
  });

  it('schema does not include deprecated fields', () => {
    const keys = mudEffect.configSchema.map((f) => f.key);
    expect(keys).not.toContain('gravity');
    expect(keys).not.toContain('spawnRate');
  });
});

describe('mud effect — create() contract', () => {
  it('returns object with update and render functions', () => {
    const instance = mudEffect.create(MOCK_CANVAS, mudEffect.defaultConfig);
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.render).toBe('function');
  });

  it('render() draws one fill per active blob after spawning', () => {
    // count=40/min, interval=1.5s → update(4500ms) spawns exactly 3 blobs (all age=0)
    const config = { ...mudEffect.defaultConfig, count: 40, lifespan: 10 };
    const instance = mudEffect.create(MOCK_CANVAS, config);
    instance.update(4500);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.fill).toBe(3);
  });

  it('render() with count = 0 makes no draw calls even after update', () => {
    const config = { ...mudEffect.defaultConfig, count: 0 };
    const instance = mudEffect.create(MOCK_CANVAS, config);
    instance.update(5000);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.calls.fill).toBe(0);
  });

  it('update() advances state without throwing', () => {
    const instance = mudEffect.create(MOCK_CANVAS, mudEffect.defaultConfig);
    instance.update(500);
    expect(() => instance.render(makeMockCtx())).not.toThrow();
  });

  it('render() resets globalAlpha to 1 after drawing', () => {
    const config = { ...mudEffect.defaultConfig, count: 40, lifespan: 10 };
    const instance = mudEffect.create(MOCK_CANVAS, config);
    instance.update(4500);
    const ctx = makeMockCtx();
    instance.render(ctx);
    expect(ctx.globalAlpha).toBe(1);
  });
});
