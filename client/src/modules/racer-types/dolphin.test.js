// ============================================================
// File:        dolphin.test.js
// Path:        client/src/modules/racer-types/dolphin.test.js
// Project:     RaceArena
// Description: Tests for DolphinRacerType — registry, sprite config,
//              body+mask coat palette, and draw safety.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DolphinRacerType, getRacerTypeLabel, RACER_TYPE_IDS, RACER_TYPES } from './index.js';
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

describe('DolphinRacerType — registry', () => {
  it('is present in RACER_TYPE_IDS', () => {
    expect(RACER_TYPE_IDS).toContain('dolphin');
  });

  it('is present in RACER_TYPES', () => {
    expect(RACER_TYPES.dolphin).toBe(DolphinRacerType);
  });

  it('getRacerTypeLabel returns "Dolphin 🐬"', () => {
    expect(getRacerTypeLabel('dolphin')).toBe('Dolphin 🐬');
  });
});

describe('DolphinRacerType — manifest', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has id dolphin and emoji 🐬', () => {
    expect(DolphinRacerType.config.id).toBe('dolphin');
    expect(DolphinRacerType.getEmoji()).toBe('🐬');
  });

  it('frameCount is 16', () => {
    expect(DolphinRacerType.config.frameCount).toBe(16);
  });

  it('frameWidth and frameHeight are 256', () => {
    expect(DolphinRacerType.config.frameWidth).toBe(256);
    expect(DolphinRacerType.config.frameHeight).toBe(256);
  });

  it('tintMode is mask', () => {
    expect(DolphinRacerType.config.tintMode).toBe('mask');
  });

  it('speedMultiplier is 1.15', () => {
    expect(DolphinRacerType.getSpeedMultiplier()).toBe(1.15);
  });

  it('surfaceClasses contains water', () => {
    expect(DolphinRacerType.config.surfaceClasses).toContain('water');
  });
});

describe('DolphinRacerType — coat palette', () => {
  it('has exactly 18 coats', () => {
    expect(DolphinRacerType.config.coats).toHaveLength(18);
  });

  it('all coats have id, name, tint, patchTint, patternMask', () => {
    for (const coat of DolphinRacerType.config.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(typeof coat.tint).toBe('string');
      expect(typeof coat.patchTint).toBe('string');
      expect(typeof coat.patternMask).toBe('string');
    }
  });

  it('all coat ids are unique', () => {
    const ids = DolphinRacerType.config.coats.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all coats use dolphin-mask-belly.png', () => {
    for (const coat of DolphinRacerType.config.coats) {
      expect(coat.patternMask).toMatch(/dolphin-mask-belly\.png$/);
    }
  });

  it('belly tints are lighter than body tints', () => {
    for (const coat of DolphinRacerType.config.coats) {
      const bodyLum =
        parseInt(coat.tint.slice(1, 3), 16) +
        parseInt(coat.tint.slice(3, 5), 16) +
        parseInt(coat.tint.slice(5, 7), 16);
      const bellyLum =
        parseInt(coat.patchTint.slice(1, 3), 16) +
        parseInt(coat.patchTint.slice(3, 5), 16) +
        parseInt(coat.patchTint.slice(5, 7), 16);
      expect(bellyLum).toBeGreaterThan(bodyLum);
    }
  });
});

describe('DolphinRacerType — drawing', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to arc circle when sprite not loaded', () => {
    const ctx = makeCtx();
    DolphinRacerType._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc).toHaveBeenCalledOnce();
  });

  it('drawRacer saves and restores ctx state', () => {
    const ctx = makeCtx();
    DolphinRacerType.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('getTrailParticles returns an array', () => {
    expect(Array.isArray(DolphinRacerType.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });
});
