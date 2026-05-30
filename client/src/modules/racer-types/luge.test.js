// ============================================================
// File:        luge.test.js
// Path:        client/src/modules/racer-types/luge.test.js
// Project:     RaceArena
// Created:     2026-05-28
// Description: Tests for LugeRacerType — registry presence, label,
//              sprite config, coat count, and draw safety.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LugeRacerType, getRacerTypeLabel, RACER_TYPE_IDS, RACER_TYPES } from './index.js';
import { getCachedSprite } from './spriteLoader.js';

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
    getPatternedVariant: vi.fn().mockReturnValue(null),
    detectTintMode: vi.fn().mockReturnValue('screen'),
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

describe('LugeRacerType — registry', () => {
  it('is present in RACER_TYPE_IDS', () => {
    expect(RACER_TYPE_IDS).toContain('luge');
  });

  it('is present in RACER_TYPES', () => {
    expect(RACER_TYPES.luge).toBeDefined();
    expect(RACER_TYPES.luge).toBe(LugeRacerType);
  });

  it('getRacerTypeLabel returns "Luge 🛷"', () => {
    expect(getRacerTypeLabel('luge')).toBe('Luge 🛷');
  });
});

describe('LugeRacerType — manifest', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id', () => {
    expect(LugeRacerType.config.id).toBe('luge');
  });

  it('has correct emoji', () => {
    expect(LugeRacerType.getEmoji()).toBe('🛷');
  });

  it('spriteUrl points to /assets/racers/luge-slide.png', () => {
    expect(LugeRacerType.config.spriteUrl).toBe('/assets/racers/luge-slide.png');
  });

  it('has frameCount 16', () => {
    expect(LugeRacerType.config.frameCount).toBe(16);
  });

  it('has frameWidth 125 and frameHeight 238', () => {
    expect(LugeRacerType.config.frameWidth).toBe(125);
    expect(LugeRacerType.config.frameHeight).toBe(238);
  });

  it('has tintMode "screen"', () => {
    expect(LugeRacerType.config.tintMode).toBe('screen');
  });

  it('has exactly 20 coats (STANDARD_COAT_PALETTE)', () => {
    expect(LugeRacerType.config.coats).toHaveLength(20);
  });

  it('first coat has tint: null (base coat)', () => {
    expect(LugeRacerType.config.coats[0].tint).toBeNull();
    expect(LugeRacerType.config.coats[0].id).toBe('base');
  });

  it('speedMultiplier is 1.1', () => {
    expect(LugeRacerType.getSpeedMultiplier()).toBe(1.1);
  });

  it('_getFrameIndex cycles through all 16 frames', () => {
    const period = LugeRacerType.config.basePeriodMs;
    const fc = LugeRacerType.config.frameCount;
    const binWidth = period / fc;
    const seen = new Set();
    for (let i = 0; i < fc; i++) {
      seen.add(LugeRacerType._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    }
    expect(seen.size).toBe(fc);
  });

  it('_drawBody falls back to arc circle when sprite not loaded', () => {
    const ctx = makeCtx();
    LugeRacerType._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc).toHaveBeenCalledOnce();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('drawRacer saves/restores ctx state', () => {
    const ctx = makeCtx();
    LugeRacerType.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('getTrailParticles returns an array', () => {
    expect(Array.isArray(LugeRacerType.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });
});
