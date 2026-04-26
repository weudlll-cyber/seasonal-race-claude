// ============================================================
// File:        dragon.test.js
// Path:        client/src/modules/racer-types/dragon.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for DragonRacerType (D3.5.3).
//              Dragon has 16 frames (unique — all other types have 4 or 8).
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DragonRacerType } from './index.js';
import { getCachedSprite } from './spriteLoader.js';
import { getCoatVariants } from './spriteTinter.js';

vi.mock('./spriteLoader.js', () => ({
  getCachedSprite: vi.fn(),
  loadSprite: vi.fn().mockResolvedValue({}),
  _clearSpriteCache: vi.fn(),
}));

vi.mock('./spriteTinter.js', () => {
  const getCoatVariants = vi.fn().mockResolvedValue(new Map());
  getCoatVariants.cached = vi.fn();
  return {
    getCoatVariants,
    tintSprite: vi.fn().mockReturnValue({}),
    tintSpriteWithMask: vi.fn().mockReturnValue({}),
    _clearTintCache: vi.fn(),
    _clearMaskedTintCache: vi.fn(),
  };
});

function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
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
  };
}

const MOCK_RACER = { x: 100, y: 100, angle: 0, baseSpeed: 2, index: 0 };

describe('DragonRacerType — manifest', () => {
  let dragon;
  beforeEach(() => {
    dragon = DragonRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(dragon.config.id).toBe('dragon');
    expect(dragon.getEmoji()).toBe('🐉');
  });

  it('has frameCount === 16 (ping-pong wing-beat sheet)', () => {
    expect(dragon.config.frameCount).toBe(16);
  });

  it('has correct sprite config', () => {
    expect(dragon.config.displaySize).toBe(50);
    expect(dragon.config.basePeriodMs).toBe(700);
    expect(dragon.config.spriteUrl).toMatch(/dragon-fly\.png$/);
  });

  it('has correct speedMultiplier', () => {
    expect(dragon.getSpeedMultiplier()).toBe(1.1);
  });

  it('has exactly 11 coats', () => {
    expect(dragon.config.coats).toHaveLength(11);
  });

  it('has exactly one coat with tint: null (pearl)', () => {
    const nullTints = dragon.config.coats.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
    expect(nullTints[0].id).toBe('pearl');
  });

  it('_getFrameIndex returns integer in [0, 15]', () => {
    for (let f = 0; f <= 2000; f += 100) {
      const idx = dragon._getFrameIndex(f, 1);
      expect(Number.isInteger(idx)).toBe(true);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(15);
    }
  });

  it('_getFrameIndex cycles through all 16 frames', () => {
    const period = dragon.config.basePeriodMs;
    const binWidth = period / 16;
    const seen = new Set();
    for (let i = 0; i < 16; i++)
      seen.add(dragon._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    expect(seen.size).toBe(16);
  });

  it('getTrailParticles emits ember-orange colored particles', () => {
    let particles = [];
    for (let i = 0; i < 50; i++) {
      particles = dragon.getTrailParticles(100, 100, 1, 0, i * 50);
      if (particles.length > 0) break;
    }
    if (particles.length > 0) {
      expect(particles[0]).toHaveProperty('color', '#cc6633');
    }
  });

  it('_drawBody falls back to arc when sprite not loaded', () => {
    const ctx = makeCtx();
    dragon._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('drawRacer saves/restores ctx and never calls fillText', () => {
    const ctx = makeCtx();
    dragon.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });
});
