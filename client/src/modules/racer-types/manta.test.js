// ============================================================
// File:        manta.test.js
// Path:        client/src/modules/racer-types/manta.test.js
// Project:     RaceArena
// Description: Tests for MantaRacerType — registry, sprite config,
//              body+mask coat palette, and draw safety.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MantaRacerType, getRacerTypeLabel, RACER_TYPE_IDS, RACER_TYPES } from './index.js';
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

describe('MantaRacerType — registry', () => {
  it('is present in RACER_TYPE_IDS', () => {
    expect(RACER_TYPE_IDS).toContain('manta');
  });

  it('is present in RACER_TYPES', () => {
    expect(RACER_TYPES.manta).toBe(MantaRacerType);
  });

  it('getRacerTypeLabel returns "Manta 🦈"', () => {
    expect(getRacerTypeLabel('manta')).toBe('Manta 🦈');
  });
});

describe('MantaRacerType — manifest', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has id manta and emoji 🦈', () => {
    expect(MantaRacerType.config.id).toBe('manta');
    expect(MantaRacerType.getEmoji()).toBe('🦈');
  });

  it('frameCount is 16', () => {
    expect(MantaRacerType.config.frameCount).toBe(16);
  });

  it('frameWidth and frameHeight are 128', () => {
    expect(MantaRacerType.config.frameWidth).toBe(128);
    expect(MantaRacerType.config.frameHeight).toBe(128);
  });

  it('tintMode is mask', () => {
    expect(MantaRacerType.config.tintMode).toBe('mask');
  });

  it('speedMultiplier is 1.1', () => {
    expect(MantaRacerType.getSpeedMultiplier()).toBe(1.1);
  });

  it('surfaceClasses contains water', () => {
    expect(MantaRacerType.config.surfaceClasses).toContain('water');
  });
});

describe('MantaRacerType — coat palette', () => {
  it('has exactly 9 coats', () => {
    expect(MantaRacerType.config.coats).toHaveLength(9);
  });

  it('all coats have id, name, tint, patchTint, patternMask', () => {
    for (const coat of MantaRacerType.config.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(typeof coat.tint).toBe('string');
      expect(typeof coat.patchTint).toBe('string');
      expect(typeof coat.patternMask).toBe('string');
    }
  });

  it('all coat ids are unique', () => {
    const ids = MantaRacerType.config.coats.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all coats use manta-mask-shoulders.png', () => {
    for (const coat of MantaRacerType.config.coats) {
      expect(coat.patternMask).toMatch(/manta-mask-shoulders\.png$/);
    }
  });

  it('body tints are dark — all channels below 100', () => {
    for (const coat of MantaRacerType.config.coats) {
      const r = parseInt(coat.tint.slice(1, 3), 16);
      const g = parseInt(coat.tint.slice(3, 5), 16);
      const b = parseInt(coat.tint.slice(5, 7), 16);
      expect(Math.max(r, g, b)).toBeLessThan(100);
    }
  });

  it('patch tints are light — all channels above 150', () => {
    for (const coat of MantaRacerType.config.coats) {
      const r = parseInt(coat.patchTint.slice(1, 3), 16);
      const g = parseInt(coat.patchTint.slice(3, 5), 16);
      const b = parseInt(coat.patchTint.slice(5, 7), 16);
      expect(Math.min(r, g, b)).toBeGreaterThan(150);
    }
  });
});

describe('MantaRacerType — drawing', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to arc circle when sprite not loaded', () => {
    const ctx = makeCtx();
    MantaRacerType._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc).toHaveBeenCalledOnce();
  });

  it('drawRacer saves and restores ctx state', () => {
    const ctx = makeCtx();
    MantaRacerType.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('getTrailParticles returns an array', () => {
    expect(Array.isArray(MantaRacerType.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });
});
