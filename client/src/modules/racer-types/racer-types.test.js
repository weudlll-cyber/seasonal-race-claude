// ============================================================
// File:        racer-types.test.js
// Path:        client/src/modules/racer-types/racer-types.test.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Tests for all racer-type modules — verifies emoji,
//              speed multiplier, trail particle output, and draw safety.
//              D3.5.3: Updated for 12 racer types, no class-based types.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import {
  getRacerType,
  RACER_TYPE_IDS,
  HorseRacerType,
  DuckRacerType,
  SnailRacerType,
  ElephantRacerType,
  GiraffeRacerType,
  SnakeRacerType,
  DragonRacerType,
  F1RacerType,
  RocketRacerType,
  BuggyRacerType,
  MotorbikeRacerType,
  PlaneRacerType,
  warmUpAllRacerTypes,
  _resetWarmUpForTesting,
} from './index.js';

// Minimal canvas 2D context mock
function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    stroke: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowBlur: 0,
    shadowColor: '',
    lineWidth: 0,
    globalAlpha: 1,
    scale: vi.fn(),
  };
}

const ALL_TYPES = [
  ['horse', HorseRacerType],
  ['duck', DuckRacerType],
  ['snail', SnailRacerType],
  ['elephant', ElephantRacerType],
  ['giraffe', GiraffeRacerType],
  ['snake', SnakeRacerType],
  ['dragon', DragonRacerType],
  ['f1', F1RacerType],
  ['rocket', RocketRacerType],
  ['buggy', BuggyRacerType],
  ['motorbike', MotorbikeRacerType],
  ['plane', PlaneRacerType],
];

const MOCK_RACER = { index: 0, name: 'Tester', color: '#ff0000' };

describe('getRacerType factory', () => {
  it('returns an instance for every registered typeId', () => {
    for (const id of RACER_TYPE_IDS) {
      const rt = getRacerType(id);
      expect(rt).toBeTruthy();
      expect(typeof rt.drawRacer).toBe('function');
    }
  });

  it('falls back to HorseRacerType for unknown id', () => {
    const rt = getRacerType('totally-unknown');
    expect(rt).toBe(HorseRacerType);
  });

  it('RACER_TYPE_IDS contains all 12 types', () => {
    expect(RACER_TYPE_IDS).toHaveLength(12);
  });
});

describe.each(ALL_TYPES)('%s racer type', (id, rt) => {
  describe('getEmoji', () => {
    it('returns a non-empty string', () => {
      expect(typeof rt.getEmoji()).toBe('string');
      expect(rt.getEmoji().length).toBeGreaterThan(0);
    });
  });

  describe('getSpeedMultiplier', () => {
    it('returns a positive number', () => {
      const m = rt.getSpeedMultiplier();
      expect(typeof m).toBe('number');
      expect(m).toBeGreaterThan(0);
    });
  });

  describe('drawRacer', () => {
    it('does not throw when called with valid args', () => {
      const ctx = makeCtx();
      expect(() => rt.drawRacer(ctx, 100, 100, 0, MOCK_RACER, false, 1000)).not.toThrow();
    });

    it('calls ctx methods (renders something)', () => {
      const ctx = makeCtx();
      rt.drawRacer(ctx, 100, 100, 0.5, MOCK_RACER, true, 2000);
      // At least fillText or save should have been called
      const called = ctx.fillText.mock.calls.length + ctx.save.mock.calls.length;
      expect(called).toBeGreaterThan(0);
    });
  });

  describe('getTrailParticles', () => {
    it('returns an array', () => {
      const result = rt.getTrailParticles(100, 100, 1.0, 0, 1000);
      expect(Array.isArray(result)).toBe(true);
    });

    it('each particle has required shape', () => {
      // Call multiple times since emission is probabilistic
      let particles = [];
      for (let i = 0; i < 30; i++) {
        particles = rt.getTrailParticles(100, 100, 1.0, 0, i * 100);
        if (particles.length > 0) break;
      }
      if (particles.length > 0) {
        const p = particles[0];
        expect(p).toHaveProperty('x');
        expect(p).toHaveProperty('y');
        expect(p).toHaveProperty('vx');
        expect(p).toHaveProperty('vy');
        expect(p).toHaveProperty('alpha');
        expect(p).toHaveProperty('r');
        expect(p).toHaveProperty('color');
        expect(isFinite(p.x)).toBe(true);
        expect(isFinite(p.y)).toBe(true);
        expect(p.alpha).toBeGreaterThan(0);
        expect(p.r).toBeGreaterThan(0);
      }
    });
  });
});

describe('speed ordering', () => {
  it('snail is slower than horse', () => {
    expect(SnailRacerType.getSpeedMultiplier()).toBeLessThan(HorseRacerType.getSpeedMultiplier());
  });

  it('rocket is faster than horse', () => {
    expect(RocketRacerType.getSpeedMultiplier()).toBeGreaterThan(
      HorseRacerType.getSpeedMultiplier()
    );
  });

  it('elephant is slower than horse', () => {
    expect(ElephantRacerType.getSpeedMultiplier()).toBeLessThan(
      HorseRacerType.getSpeedMultiplier()
    );
  });

  it('dragon is faster than horse', () => {
    expect(DragonRacerType.getSpeedMultiplier()).toBeGreaterThan(
      HorseRacerType.getSpeedMultiplier()
    );
  });
});

describe('warmUpAllRacerTypes', () => {
  it('is idempotent — calling twice does not throw', () => {
    expect(() => {
      warmUpAllRacerTypes();
      warmUpAllRacerTypes();
    }).not.toThrow();
  });

  it('re-warms after reset', () => {
    _resetWarmUpForTesting();
    expect(() => warmUpAllRacerTypes()).not.toThrow();
  });
});
