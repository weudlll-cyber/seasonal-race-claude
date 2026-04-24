// ============================================================
// File:        racer-types.test.js
// Path:        client/src/modules/racer-types/racer-types.test.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Tests for all racer-type modules — verifies emoji,
//              speed multiplier, trail particle output, and draw safety.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import {
  getRacerType,
  RACER_TYPE_IDS,
  HorseRacerType,
  DuckRacerType,
  RocketRacerType,
  SnailRacerType,
  CarRacerType,
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
  ['rocket', RocketRacerType],
  ['snail', SnailRacerType],
  ['car', CarRacerType],
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
    expect(rt).toBeInstanceOf(HorseRacerType);
  });

  it('RACER_TYPE_IDS contains all 5 types', () => {
    expect(RACER_TYPE_IDS).toHaveLength(5);
  });
});

describe.each(ALL_TYPES)('%s racer type', (id, Cls) => {
  const rt = new Cls();

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
    expect(new SnailRacerType().getSpeedMultiplier()).toBeLessThan(
      new HorseRacerType().getSpeedMultiplier()
    );
  });

  it('rocket is faster than horse', () => {
    expect(new RocketRacerType().getSpeedMultiplier()).toBeGreaterThan(
      new HorseRacerType().getSpeedMultiplier()
    );
  });
});
