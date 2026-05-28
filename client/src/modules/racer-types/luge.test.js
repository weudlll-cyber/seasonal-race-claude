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

  it('has frameCount 12', () => {
    expect(LugeRacerType.config.frameCount).toBe(12);
  });

  it('has frameWidth 128 and frameHeight 232', () => {
    expect(LugeRacerType.config.frameWidth).toBe(128);
    expect(LugeRacerType.config.frameHeight).toBe(232);
  });

  it('has tintMode "multiply"', () => {
    expect(LugeRacerType.config.tintMode).toBe('multiply');
  });

  it('has exactly 11 coats (STANDARD_COAT_PALETTE)', () => {
    expect(LugeRacerType.config.coats).toHaveLength(11);
  });

  it('first coat has tint: null (base coat)', () => {
    expect(LugeRacerType.config.coats[0].tint).toBeNull();
    expect(LugeRacerType.config.coats[0].id).toBe('base');
  });

  it('speedMultiplier is 1.1', () => {
    expect(LugeRacerType.getSpeedMultiplier()).toBe(1.1);
  });

  it('_getFrameIndex cycles through all 12 frames', () => {
    const period = LugeRacerType.config.basePeriodMs;
    const binWidth = period / 12;
    const seen = new Set();
    for (let i = 0; i < 12; i++) {
      seen.add(LugeRacerType._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    }
    expect(seen.size).toBe(12);
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
