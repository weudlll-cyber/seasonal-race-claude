// ============================================================
// File:        elephant.test.js
// Path:        client/src/modules/racer-types/elephant.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for ElephantRacerType (D3.5.3).
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ElephantRacerType } from './index.js';
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

describe('ElephantRacerType — manifest', () => {
  let elephant;
  beforeEach(() => {
    elephant = ElephantRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(elephant.config.id).toBe('elephant');
    expect(elephant.getEmoji()).toBe('🐘');
  });

  it('has correct sprite config', () => {
    expect(elephant.config.frameCount).toBe(8);
    expect(elephant.config.displaySize).toBe(44);
    expect(elephant.config.basePeriodMs).toBe(800);
    expect(typeof elephant.config.spriteUrl).toBe('string');
  });

  it('has correct speedMultiplier', () => {
    expect(elephant.getSpeedMultiplier()).toBe(0.6);
  });

  it('has exactly 11 coats', () => {
    expect(elephant.config.coats).toHaveLength(11);
  });

  it('has exactly one coat with tint: null', () => {
    const nullTints = elephant.config.coats.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
  });

  it('defaultCoatId is savanna', () => {
    expect(elephant.config.defaultCoatId).toBe('savanna');
  });

  it('_getFrameIndex returns integer in [0, frameCount-1]', () => {
    for (let f = 0; f <= 1000; f += 100) {
      const idx = elephant._getFrameIndex(f, 1);
      expect(Number.isInteger(idx)).toBe(true);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(7);
    }
  });

  it('_getFrameIndex cycles through all 8 frames', () => {
    const period = elephant.config.basePeriodMs;
    const binWidth = period / 8;
    const seen = new Set();
    for (let i = 0; i < 8; i++)
      seen.add(elephant._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    expect(seen.size).toBe(8);
  });

  it('getTrailParticles returns an array with valid particles', () => {
    let particles = [];
    for (let i = 0; i < 50; i++) {
      particles = elephant.getTrailParticles(100, 100, 1, 0, i * 50);
      if (particles.length > 0) break;
    }
    if (particles.length > 0) {
      expect(particles[0]).toHaveProperty('color', '#a09070');
      expect(particles[0].alpha).toBeGreaterThan(0);
    }
  });

  it('_drawBody falls back to arc when sprite not loaded', () => {
    const ctx = makeCtx();
    elephant._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('drawRacer saves/restores ctx and never calls fillText', () => {
    const ctx = makeCtx();
    elephant.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });
});
