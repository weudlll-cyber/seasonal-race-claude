// ============================================================
// File:        generators.test.js
// Path:        client/src/modules/surface-effects/__tests__/generators.test.js
// Project:     RaceArena
// Description: Unit tests for the four surface-effect generator modules.
// ============================================================

import { describe, it, expect } from 'vitest';
import particle from '../generators/particle.js';
import cloud from '../generators/cloud.js';
import splash from '../generators/splash.js';
import line from '../generators/line.js';

// ── Shared contract tests ────────────────────────────────────────────────────

const GENERATORS = [particle, cloud, splash, line];

describe('Generator contract — all generators', () => {
  for (const gen of GENERATORS) {
    describe(`${gen.id}`, () => {
      it('has id, label, configSchema, defaultConfig, create', () => {
        expect(typeof gen.id).toBe('string');
        expect(gen.id.length).toBeGreaterThan(0);
        expect(typeof gen.label).toBe('string');
        expect(Array.isArray(gen.configSchema)).toBe(true);
        expect(gen.configSchema.length).toBeGreaterThan(0);
        expect(typeof gen.defaultConfig).toBe('object');
        expect(typeof gen.create).toBe('function');
      });

      it('configSchema entries have required fields', () => {
        for (const field of gen.configSchema) {
          expect(typeof field.key).toBe('string');
          expect(typeof field.type).toBe('string');
          expect(typeof field.label).toBe('string');
          expect('default' in field).toBe(true);
        }
      });

      it('defaultConfig covers all configSchema keys', () => {
        for (const field of gen.configSchema) {
          expect(Object.prototype.hasOwnProperty.call(gen.defaultConfig, field.key)).toBe(true);
        }
      });

      it('create() returns object with spawn, update, render', () => {
        const inst = gen.create(gen.defaultConfig);
        expect(typeof inst.spawn).toBe('function');
        expect(typeof inst.update).toBe('function');
        expect(typeof inst.render).toBe('function');
      });

      it('update([]) returns empty array', () => {
        const inst = gen.create(gen.defaultConfig);
        expect(inst.update([])).toEqual([]);
      });

      it('update advances alpha (particles fade over time)', () => {
        // Force-spawn by bypassing probability
        const inst = gen.create({ ...gen.defaultConfig, spawnProbability: 1 });
        const initial = inst.spawn(100, 100, 1, 0);
        if (initial.length === 0) return; // line generator first-call returns []
        const advanced = inst.update(initial, 1);
        if (advanced.length > 0) {
          // alpha must have decreased
          expect(advanced[0].alpha).toBeLessThan(initial[0].alpha);
        }
      });

      it('update removes dead particles (alpha ≤ 0) after enough steps', () => {
        const inst = gen.create({ ...gen.defaultConfig, spawnProbability: 1, lifetimeFrames: 5 });
        // Prime the line generator
        inst.spawn(0, 0, 1, 0);
        const initial = inst.spawn(10, 10, 1, 0);
        if (initial.length === 0) return;
        let pool = initial;
        for (let i = 0; i < 200; i++) {
          pool = inst.update(pool, 1);
          if (pool.length === 0) break;
        }
        expect(pool.length).toBe(0);
      });
    });
  }
});

// ── Particle-specific ────────────────────────────────────────────────────────

describe('particle generator', () => {
  it('spawn returns 0 or 1 particle', () => {
    const inst = particle.create(particle.defaultConfig);
    for (let i = 0; i < 20; i++) {
      const p = inst.spawn(0, 0, 1, 0);
      expect(p.length).toBeGreaterThanOrEqual(0);
      expect(p.length).toBeLessThanOrEqual(1);
    }
  });

  it('spawn with probability 1 always returns a particle', () => {
    const inst = particle.create({ ...particle.defaultConfig, spawnProbability: 1 });
    const p = inst.spawn(50, 50, 1, 0);
    expect(p.length).toBe(1);
    expect(typeof p[0].x).toBe('number');
    expect(typeof p[0].alpha).toBe('number');
    expect(typeof p[0].color).toBe('string');
  });

  it('spawn with probability 0 always returns empty', () => {
    const inst = particle.create({ ...particle.defaultConfig, spawnProbability: 0 });
    for (let i = 0; i < 10; i++) {
      expect(inst.spawn(0, 0, 1, 0).length).toBe(0);
    }
  });

  it('spawned particle has expected fields', () => {
    const inst = particle.create({ ...particle.defaultConfig, spawnProbability: 1 });
    const [p] = inst.spawn(10, 20, 1, Math.PI);
    expect(p).toHaveProperty('x');
    expect(p).toHaveProperty('y');
    expect(p).toHaveProperty('vx');
    expect(p).toHaveProperty('vy');
    expect(p).toHaveProperty('r');
    expect(p).toHaveProperty('alpha');
    expect(p).toHaveProperty('color');
  });

  it('render does not throw when called with empty particles', () => {
    const inst = particle.create(particle.defaultConfig);
    const ctx = {
      globalAlpha: 1,
      fillStyle: '',
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
    };
    expect(() => inst.render(ctx, [])).not.toThrow();
    expect(ctx.globalAlpha).toBe(1);
  });
});

// ── Cloud-specific ───────────────────────────────────────────────────────────

describe('cloud generator', () => {
  it('particle radius grows with each update step', () => {
    const inst = cloud.create({ ...cloud.defaultConfig, spawnProbability: 1 });
    const [p0] = inst.spawn(0, 0, 1, 0);
    const [p1] = inst.update([p0], 1);
    if (p1) expect(p1.r).toBeGreaterThan(p0.r);
  });

  it('startSize < endSize produces positive growPerFrame', () => {
    const inst = cloud.create({
      ...cloud.defaultConfig,
      spawnProbability: 1,
      startSize: 3,
      endSize: 12,
    });
    const [p] = inst.spawn(0, 0, 1, 0);
    expect(p.growPerFrame).toBeGreaterThan(0);
  });
});

// ── Splash-specific ──────────────────────────────────────────────────────────

describe('splash generator', () => {
  it('spawn with count=4 returns up to 4 particles when probability=1', () => {
    const inst = splash.create({ ...splash.defaultConfig, count: 4, spawnProbability: 1 });
    const ps = inst.spawn(0, 0, 1, 0);
    expect(ps.length).toBe(4);
  });

  it('particles have gy (gravity) field', () => {
    const inst = splash.create({ ...splash.defaultConfig, spawnProbability: 1 });
    const [p] = inst.spawn(0, 0, 1, 0);
    expect(typeof p.gy).toBe('number');
    expect(p.gy).toBeGreaterThan(0);
  });

  it('vy increases each frame (gravity accelerates downward)', () => {
    const inst = splash.create({ ...splash.defaultConfig, spawnProbability: 1, gravity: 0.2 });
    const [p0] = inst.spawn(0, 0, 1, 0);
    const [p1] = inst.update([{ ...p0, vy: 0 }], 1);
    if (p1) expect(p1.vy).toBeGreaterThan(0);
  });
});

// ── Line-specific ────────────────────────────────────────────────────────────

describe('line generator', () => {
  it('first spawn call returns empty (no previous position)', () => {
    const inst = line.create(line.defaultConfig);
    expect(inst.spawn(0, 0, 1, 0)).toEqual([]);
  });

  it('second spawn call returns one segment', () => {
    const inst = line.create(line.defaultConfig);
    inst.spawn(0, 0, 1, 0);
    const segs = inst.spawn(10, 10, 1, 0);
    expect(segs.length).toBe(1);
    expect(segs[0]).toHaveProperty('x1', 0);
    expect(segs[0]).toHaveProperty('y1', 0);
    expect(segs[0]).toHaveProperty('x2', 10);
    expect(segs[0]).toHaveProperty('y2', 10);
  });

  it('segment has alpha, color, thickness', () => {
    const inst = line.create({ ...line.defaultConfig, color: '#ff0000', thickness: 2 });
    inst.spawn(0, 0, 1, 0);
    const [seg] = inst.spawn(5, 5, 1, 0);
    expect(seg.color).toBe('#ff0000');
    expect(seg.thickness).toBe(2);
    expect(typeof seg.alpha).toBe('number');
    expect(seg.alpha).toBeGreaterThan(0);
  });

  it('each new create() instance has independent state', () => {
    const a = line.create(line.defaultConfig);
    const b = line.create(line.defaultConfig);
    a.spawn(0, 0, 1, 0);
    // b was never primed — should return []
    expect(b.spawn(10, 10, 1, 0)).toEqual([]);
  });

  it('render draws line segments without throwing', () => {
    const inst = line.create(line.defaultConfig);
    inst.spawn(0, 0, 1, 0);
    const [seg] = inst.spawn(10, 10, 1, 0);
    const ctx = {
      globalAlpha: 1,
      strokeStyle: '',
      lineWidth: 1,
      lineCap: '',
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
    };
    expect(() => inst.render(ctx, [seg])).not.toThrow();
    expect(ctx.globalAlpha).toBe(1);
  });
});
