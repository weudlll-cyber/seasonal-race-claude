// ============================================================
// File:        koi.test.js
// Path:        client/src/modules/racer-types/koi.test.js
// Project:     RaceArena
// Description: Tests for KoiRacerType — registry presence, sprite config,
//              koi coat palette, pattern distribution, and draw safety.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KoiRacerType, getRacerTypeLabel, RACER_TYPE_IDS, RACER_TYPES } from './index.js';
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

describe('KoiRacerType — registry', () => {
  it('is present in RACER_TYPE_IDS', () => {
    expect(RACER_TYPE_IDS).toContain('koi');
  });

  it('is present in RACER_TYPES', () => {
    expect(RACER_TYPES.koi).toBeDefined();
    expect(RACER_TYPES.koi).toBe(KoiRacerType);
  });

  it('getRacerTypeLabel returns "Koi 🐟"', () => {
    expect(getRacerTypeLabel('koi')).toBe('Koi 🐟');
  });
});

describe('KoiRacerType — manifest', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(KoiRacerType.config.id).toBe('koi');
    expect(KoiRacerType.getEmoji()).toBe('🐟');
  });

  it('spriteUrl points to /assets/racers/koi-swim.png', () => {
    expect(KoiRacerType.config.spriteUrl).toBe('/assets/racers/koi-swim.png');
  });

  it('has frameCount 16', () => {
    expect(KoiRacerType.config.frameCount).toBe(16);
  });

  it('has frameWidth 256 and frameHeight 256', () => {
    expect(KoiRacerType.config.frameWidth).toBe(256);
    expect(KoiRacerType.config.frameHeight).toBe(256);
  });

  it('has basePeriodMs 1600', () => {
    expect(KoiRacerType.config.basePeriodMs).toBe(1600);
  });

  it('has displaySize 52', () => {
    expect(KoiRacerType.config.displaySize).toBe(52);
  });

  it('has tintMode "mask"', () => {
    expect(KoiRacerType.config.tintMode).toBe('mask');
  });

  it('speedMultiplier is 0.95', () => {
    expect(KoiRacerType.getSpeedMultiplier()).toBe(0.95);
  });

  it('surfaceClasses contains "water"', () => {
    expect(KoiRacerType.config.surfaceClasses).toContain('water');
  });
});

describe('KoiRacerType — coat palette', () => {
  it('has exactly 16 coats', () => {
    expect(KoiRacerType.config.coats).toHaveLength(16);
  });

  it('all coats have id, name, tint, and patternMask fields', () => {
    for (const coat of KoiRacerType.config.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(typeof coat.tint).toBe('string');
      expect(typeof coat.patternMask).toBe('string');
    }
  });

  it('all coat ids are unique', () => {
    const ids = KoiRacerType.config.coats.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no null-tint base coat — every coat has a tint color', () => {
    expect(KoiRacerType.config.coats.every((c) => c.tint !== null)).toBe(true);
  });

  it('uses exactly 4 distinct pattern masks', () => {
    const masks = new Set(KoiRacerType.config.coats.map((c) => c.patternMask));
    expect(masks.size).toBe(4);
  });

  it('each of the 4 patterns is used by exactly 4 coats', () => {
    const counts = new Map();
    for (const coat of KoiRacerType.config.coats) {
      counts.set(coat.patternMask, (counts.get(coat.patternMask) ?? 0) + 1);
    }
    for (const [, count] of counts) {
      expect(count).toBe(4);
    }
  });

  it('all pattern masks point to /assets/racers/koi-mask-*.png', () => {
    const masks = new Set(KoiRacerType.config.coats.map((c) => c.patternMask));
    for (const url of masks) {
      expect(url).toMatch(/^\/assets\/racers\/koi-mask-.+\.png$/);
    }
  });
});

describe('KoiRacerType — drawing', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('_drawBody falls back to arc circle when sprite not loaded', () => {
    const ctx = makeCtx();
    KoiRacerType._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc).toHaveBeenCalledOnce();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('drawRacer saves/restores ctx state', () => {
    const ctx = makeCtx();
    KoiRacerType.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('_getFrameIndex cycles through all 16 frames', () => {
    const fc = KoiRacerType.config.frameCount;
    const effectivePeriod = Math.min(1500, Math.max(200, KoiRacerType.config.basePeriodMs / 1));
    const binWidth = effectivePeriod / fc;
    const seen = new Set();
    for (let i = 0; i < fc; i++) {
      seen.add(KoiRacerType._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    }
    expect(seen.size).toBe(fc);
  });

  it('getTrailParticles returns an array', () => {
    expect(Array.isArray(KoiRacerType.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });
});
