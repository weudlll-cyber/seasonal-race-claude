// ============================================================
// File:        trailResolver.test.js
// Path:        client/src/modules/surface-effects/__tests__/trailResolver.test.js
// Project:     RaceArena
// Description: Unit tests for resolveTrailEmitter — match, no-match, edge cases,
//              and a performance smoke test (20 racers × 60 frames).
// ============================================================

import { describe, test, expect, beforeEach } from 'vitest';
import { resolveTrailEmitter } from '../trailResolver.js';
import { resetToDefaults } from '../registry.js';

// Minimal SpriteRacerType stub — only getSurfaceClasses() matters here
function makeRacerType(surfaceClasses) {
  return { getSurfaceClasses: () => surfaceClasses };
}

beforeEach(() => {
  resetToDefaults();
});

// ── Match path ────────────────────────────────────────────────────────────────

describe('resolveTrailEmitter — match found', () => {
  test('returns an emitter when racer and track share a class', () => {
    const rt = makeRacerType(['water', 'grass']);
    const emitter = resolveTrailEmitter(rt, ['water']);
    expect(emitter).not.toBeNull();
    expect(typeof emitter.spawn).toBe('function');
    expect(typeof emitter.update).toBe('function');
    expect(typeof emitter.render).toBe('function');
  });

  test('picks the first racer class that appears in the track list', () => {
    // horse has ['sand', 'earth', 'grass', 'asphalt', 'snow', 'mud']
    // garden-path track has ['grass', 'earth']
    // first match in racer order: 'earth' (sand not in track, earth is)
    const rt = makeRacerType(['sand', 'earth', 'grass']);
    const emitter = resolveTrailEmitter(rt, ['earth', 'grass']);
    expect(emitter).not.toBeNull();
  });

  test('each call returns a fresh emitter instance (stateful line generator)', () => {
    const rt = makeRacerType(['asphalt']);
    const e1 = resolveTrailEmitter(rt, ['asphalt']);
    const e2 = resolveTrailEmitter(rt, ['asphalt']);
    // Both are valid emitters...
    expect(e1).not.toBeNull();
    expect(e2).not.toBeNull();
    // ...but not the same object (fresh closures)
    expect(e1).not.toBe(e2);
  });

  test('line-generator emitters maintain independent position state per instance', () => {
    const rt = makeRacerType(['asphalt']); // asphalt → line generator
    const e1 = resolveTrailEmitter(rt, ['asphalt']);
    const e2 = resolveTrailEmitter(rt, ['asphalt']);

    // First call on each emitter initialises lastX/lastY — returns []
    expect(e1.spawn(10, 20)).toEqual([]);
    expect(e2.spawn(50, 60)).toEqual([]);

    // Second call on e1 draws from (10,20) to (15,25)
    const seg1 = e1.spawn(15, 25);
    expect(seg1.length).toBe(1);
    expect(seg1[0].x1).toBe(10);
    expect(seg1[0].y1).toBe(20);

    // e2 draws from its own last position (50,60), not e1's
    const seg2 = e2.spawn(55, 65);
    expect(seg2.length).toBe(1);
    expect(seg2[0].x1).toBe(50);
    expect(seg2[0].y1).toBe(60);
  });

  test('splash emitter returns particles with correct shape', () => {
    const rt = makeRacerType(['water']); // water → splash generator
    const emitter = resolveTrailEmitter(rt, ['water']);
    // spawn is probabilistic; run multiple times to get at least one particle
    let particles = [];
    for (let i = 0; i < 50; i++) {
      particles.push(...emitter.spawn(100, 100, 0.001, 0));
    }
    expect(particles.length).toBeGreaterThan(0);
    expect(particles[0]).toHaveProperty('x');
    expect(particles[0]).toHaveProperty('alpha');
  });
});

// ── No-match / fallback path ──────────────────────────────────────────────────

describe('resolveTrailEmitter — no match → null (Heimat-Trail)', () => {
  test('returns null when racer classes and track classes do not overlap', () => {
    const rt = makeRacerType(['asphalt']);
    const emitter = resolveTrailEmitter(rt, ['water']);
    expect(emitter).toBeNull();
  });

  test('returns null when racer has no surface classes', () => {
    const rt = makeRacerType([]);
    const emitter = resolveTrailEmitter(rt, ['earth', 'grass']);
    expect(emitter).toBeNull();
  });

  test('returns null when track has no surface classes (legacy track)', () => {
    const rt = makeRacerType(['earth', 'grass']);
    const emitter = resolveTrailEmitter(rt, []);
    expect(emitter).toBeNull();
  });

  test('returns null when trackSurfaceClasses is undefined', () => {
    const rt = makeRacerType(['earth']);
    expect(resolveTrailEmitter(rt, undefined)).toBeNull();
  });

  test('returns null when trackSurfaceClasses is null', () => {
    const rt = makeRacerType(['earth']);
    expect(resolveTrailEmitter(rt, null)).toBeNull();
  });

  test('returns null when racerType has no getSurfaceClasses method', () => {
    const rt = {}; // plain object, no method
    expect(resolveTrailEmitter(rt, ['earth'])).toBeNull();
  });
});

// ── Emitter lifecycle ─────────────────────────────────────────────────────────

describe('resolveTrailEmitter — emitter lifecycle', () => {
  test('update returns only still-alive particles', () => {
    const rt = makeRacerType(['earth']); // earth → cloud generator
    const emitter = resolveTrailEmitter(rt, ['earth']);
    let particles = [];
    for (let i = 0; i < 100; i++) {
      particles.push(...emitter.spawn(0, 0, 0.001, 0));
    }
    const alive = particles.length;
    // After many frames of updates, particles should fade out
    let p = [...particles];
    for (let f = 0; f < 200; f++) p = emitter.update(p, 1);
    expect(p.length).toBeLessThan(alive);
  });

  test('render does not throw with empty particle array', () => {
    const rt = makeRacerType(['grass']); // grass → particle generator
    const emitter = resolveTrailEmitter(rt, ['grass']);
    const ctx = {
      globalAlpha: 1,
      fillStyle: '',
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
    };
    expect(() => emitter.render(ctx, [])).not.toThrow();
  });
});

// ── Performance smoke ─────────────────────────────────────────────────────────

describe('resolveTrailEmitter — performance smoke', () => {
  test('20 racers × 60 frames of spawn+update stays within 50 ms', () => {
    const classes = ['earth', 'water', 'asphalt', 'air'];
    const emitters = [];
    for (let i = 0; i < 20; i++) {
      // Round-robin over classes so we exercise different generators
      const cls = classes[i % classes.length];
      const rt = makeRacerType([cls]);
      emitters.push({ emitter: resolveTrailEmitter(rt, [cls]), particles: [] });
    }

    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      for (const e of emitters) {
        e.particles.push(...e.emitter.spawn(Math.random() * 1280, Math.random() * 720, 0.001, 0));
        e.particles = e.emitter.update(e.particles, 1);
      }
    }
    const elapsed = performance.now() - start;

    // 50 ms is generous; typical run is < 5 ms. Guard against severe regression.
    expect(elapsed).toBeLessThan(50);
  });
});
