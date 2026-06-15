// ============================================================
// File:        beetle.test.js
// Path:        client/src/modules/racer-types/beetle.test.js
// Project:     RaceArena
// Created:     2026-06-01
// Description: Tests for BeetleRacerType — registry presence, label,
//              sprite config, coat palette, and draw safety.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BeetleRacerType, getRacerTypeLabel, RACER_TYPE_IDS, RACER_TYPES } from './index.js';
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
    detectTintMode: vi.fn().mockReturnValue('multiply'),
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

describe('BeetleRacerType — registry', () => {
  it('is present in RACER_TYPE_IDS', () => {
    expect(RACER_TYPE_IDS).toContain('beetle');
  });

  it('is present in RACER_TYPES', () => {
    expect(RACER_TYPES.beetle).toBeDefined();
    expect(RACER_TYPES.beetle).toBe(BeetleRacerType);
  });

  it('getRacerTypeLabel returns "Beetle 🪲"', () => {
    expect(getRacerTypeLabel('beetle')).toBe('Beetle 🪲');
  });
});

describe('BeetleRacerType — manifest', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(BeetleRacerType.config.id).toBe('beetle');
    expect(BeetleRacerType.getEmoji()).toBe('🪲');
  });

  it('spriteUrl points to /assets/racers/beetle.png', () => {
    expect(BeetleRacerType.config.spriteUrl).toBe('/assets/racers/beetle.png');
  });

  it('has frameCount 8', () => {
    expect(BeetleRacerType.config.frameCount).toBe(8);
  });

  it('has frameWidth 128 and frameHeight 128', () => {
    expect(BeetleRacerType.config.frameWidth).toBe(128);
    expect(BeetleRacerType.config.frameHeight).toBe(128);
  });

  it('has tintMode "multiply"', () => {
    expect(BeetleRacerType.config.tintMode).toBe('multiply');
  });

  it('has exactly 17 coats (BEETLE_COAT_PALETTE: base + 16 colors)', () => {
    expect(BeetleRacerType.config.coats).toHaveLength(17);
  });

  it('first coat has tint: null (base coat)', () => {
    expect(BeetleRacerType.config.coats[0].tint).toBeNull();
    expect(BeetleRacerType.config.coats[0].id).toBe('base');
  });

  it('speedMultiplier is 0.9', () => {
    expect(BeetleRacerType.getSpeedMultiplier()).toBe(0.9);
  });

  it('basePeriodMs is 1600', () => {
    expect(BeetleRacerType.config.basePeriodMs).toBe(1600);
  });

  it('_getFrameIndex cycles through all 8 frames', () => {
    const fc = BeetleRacerType.config.frameCount;
    // basePeriodMs (1600) exceeds the 1500ms upper clamp in _getFrameIndex at speed=1.
    // Sample at the effective clamped period so bin widths align with actual frame boundaries.
    const effectivePeriod = Math.min(1500, Math.max(200, BeetleRacerType.config.basePeriodMs / 1));
    const binWidth = effectivePeriod / fc;
    const seen = new Set();
    for (let i = 0; i < fc; i++) {
      seen.add(BeetleRacerType._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    }
    expect(seen.size).toBe(fc);
  });

  it('_drawBody falls back to arc circle when sprite not loaded', () => {
    const ctx = makeCtx();
    BeetleRacerType._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc).toHaveBeenCalledOnce();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('drawRacer saves/restores ctx state', () => {
    const ctx = makeCtx();
    BeetleRacerType.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('getTrailParticles returns an array', () => {
    expect(Array.isArray(BeetleRacerType.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });
});
