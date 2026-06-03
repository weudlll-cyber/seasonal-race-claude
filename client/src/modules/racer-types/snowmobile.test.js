// ============================================================
// File:        snowmobile.test.js
// Path:        client/src/modules/racer-types/snowmobile.test.js
// Project:     RaceArena
// Description: Tests for SnowmobileRacerType — registry, sprite config,
//              multiply-tint coat palette, and draw safety.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SnowmobileRacerType, getRacerTypeLabel, RACER_TYPE_IDS, RACER_TYPES } from './index.js';
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
    tintSpriteBodyAndMask: vi.fn().mockReturnValue({}),
    tintSpriteWithDualMask: vi.fn().mockReturnValue({}),
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

describe('SnowmobileRacerType — registry', () => {
  it('is present in RACER_TYPE_IDS', () => {
    expect(RACER_TYPE_IDS).toContain('snowmobile');
  });

  it('is present in RACER_TYPES', () => {
    expect(RACER_TYPES.snowmobile).toBe(SnowmobileRacerType);
  });

  it('getRacerTypeLabel returns "Snowmobile 🏂"', () => {
    expect(getRacerTypeLabel('snowmobile')).toBe('Snowmobile 🏂');
  });
});

describe('SnowmobileRacerType — manifest', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has id snowmobile and emoji 🏂', () => {
    expect(SnowmobileRacerType.config.id).toBe('snowmobile');
    expect(SnowmobileRacerType.getEmoji()).toBe('🏂');
  });

  it('frameCount is 16', () => {
    expect(SnowmobileRacerType.config.frameCount).toBe(16);
  });

  it('frameWidth and frameHeight are 192', () => {
    expect(SnowmobileRacerType.config.frameWidth).toBe(192);
    expect(SnowmobileRacerType.config.frameHeight).toBe(192);
  });

  it('tintMode is multiply', () => {
    expect(SnowmobileRacerType.config.tintMode).toBe('multiply');
  });

  it('speedMultiplier is 1.1', () => {
    expect(SnowmobileRacerType.getSpeedMultiplier()).toBe(1.1);
  });

  it('surfaceClasses contains snow and ice', () => {
    expect(SnowmobileRacerType.config.surfaceClasses).toContain('snow');
    expect(SnowmobileRacerType.config.surfaceClasses).toContain('ice');
  });
});

describe('SnowmobileRacerType — coat palette', () => {
  it('has exactly 16 coats', () => {
    expect(SnowmobileRacerType.config.coats).toHaveLength(16);
  });

  it('all coats have id, name, and non-null tint', () => {
    for (const coat of SnowmobileRacerType.config.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(typeof coat.tint).toBe('string');
    }
  });

  it('all coat ids are unique', () => {
    const ids = SnowmobileRacerType.config.coats.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('palette spans both light and dark tones', () => {
    const luminances = SnowmobileRacerType.config.coats.map((c) => {
      const r = parseInt(c.tint.slice(1, 3), 16);
      const g = parseInt(c.tint.slice(3, 5), 16);
      const b = parseInt(c.tint.slice(5, 7), 16);
      return r + g + b;
    });
    const max = Math.max(...luminances);
    const min = Math.min(...luminances);
    expect(max - min).toBeGreaterThan(300);
  });
});

describe('SnowmobileRacerType — drawing', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to arc circle when sprite not loaded', () => {
    const ctx = makeCtx();
    SnowmobileRacerType._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc).toHaveBeenCalledOnce();
  });

  it('drawRacer saves and restores ctx state', () => {
    const ctx = makeCtx();
    SnowmobileRacerType.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('getTrailParticles returns an array', () => {
    expect(Array.isArray(SnowmobileRacerType.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });
});
