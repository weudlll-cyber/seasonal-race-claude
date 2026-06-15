// ============================================================
// File:        boarder.test.js
// Path:        client/src/modules/racer-types/boarder.test.js
// Project:     RaceArena
// Created:     2026-06-01
// Description: Tests for BoarderRacerType — registry presence, label,
//              sprite config, coat palette, and draw safety.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BoarderRacerType, getRacerTypeLabel, RACER_TYPE_IDS, RACER_TYPES } from './index.js';
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
    ensureRacerTypeWarm: vi.fn(),
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

describe('BoarderRacerType — registry', () => {
  it('is present in RACER_TYPE_IDS', () => {
    expect(RACER_TYPE_IDS).toContain('boarder');
  });

  it('is present in RACER_TYPES', () => {
    expect(RACER_TYPES.boarder).toBeDefined();
    expect(RACER_TYPES.boarder).toBe(BoarderRacerType);
  });

  it('getRacerTypeLabel returns "Boarder 🛹"', () => {
    expect(getRacerTypeLabel('boarder')).toBe('Boarder 🛹');
  });
});

describe('BoarderRacerType — manifest', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(BoarderRacerType.config.id).toBe('boarder');
    expect(BoarderRacerType.getEmoji()).toBe('🛹');
  });

  it('spriteUrl points to /assets/racers/boarder-sprite.png', () => {
    expect(BoarderRacerType.config.spriteUrl).toBe('/assets/racers/boarder-sprite.png');
  });

  it('has frameCount 12', () => {
    expect(BoarderRacerType.config.frameCount).toBe(12);
  });

  it('has frameWidth 128 and frameHeight 128', () => {
    expect(BoarderRacerType.config.frameWidth).toBe(128);
    expect(BoarderRacerType.config.frameHeight).toBe(128);
  });

  it('has tintMode "multiply"', () => {
    expect(BoarderRacerType.config.tintMode).toBe('multiply');
  });

  it('has exactly 17 coats (BOARDER_COAT_PALETTE: base + 16 colors)', () => {
    expect(BoarderRacerType.config.coats).toHaveLength(17);
  });

  it('first coat has tint: null (base coat)', () => {
    expect(BoarderRacerType.config.coats[0].tint).toBeNull();
    expect(BoarderRacerType.config.coats[0].id).toBe('base');
  });

  it('speedMultiplier is 1.0', () => {
    expect(BoarderRacerType.getSpeedMultiplier()).toBe(1.0);
  });

  it('basePeriodMs is 1800', () => {
    expect(BoarderRacerType.config.basePeriodMs).toBe(1800);
  });

  it('_getFrameIndex cycles through all 12 frames', () => {
    const fc = BoarderRacerType.config.frameCount;
    // basePeriodMs (1800) exceeds the 1500ms upper clamp in _getFrameIndex at speed=1.
    // Sample at the effective clamped period so bin widths align with actual frame boundaries.
    const effectivePeriod = Math.min(1500, Math.max(200, BoarderRacerType.config.basePeriodMs / 1));
    const binWidth = effectivePeriod / fc;
    const seen = new Set();
    for (let i = 0; i < fc; i++) {
      seen.add(BoarderRacerType._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    }
    expect(seen.size).toBe(fc);
  });

  it('_drawBody falls back to arc circle when sprite not loaded', () => {
    const ctx = makeCtx();
    BoarderRacerType._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc).toHaveBeenCalledOnce();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('drawRacer saves/restores ctx state', () => {
    const ctx = makeCtx();
    BoarderRacerType.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('getTrailParticles returns an array', () => {
    expect(Array.isArray(BoarderRacerType.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });
});
