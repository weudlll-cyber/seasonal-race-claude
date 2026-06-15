// ============================================================
// File:        turtle.test.js
// Path:        client/src/modules/racer-types/turtle.test.js
// Project:     RaceArena
// Description: Tests for TurtleRacerType — registry, sprite config,
//              dual-mask coat palette, and draw safety.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TurtleRacerType, getRacerTypeLabel, RACER_TYPE_IDS, RACER_TYPES } from './index.js';
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

describe('TurtleRacerType — registry', () => {
  it('is present in RACER_TYPE_IDS', () => {
    expect(RACER_TYPE_IDS).toContain('turtle');
  });

  it('is present in RACER_TYPES', () => {
    expect(RACER_TYPES.turtle).toBe(TurtleRacerType);
  });

  it('getRacerTypeLabel returns "Turtle 🐢"', () => {
    expect(getRacerTypeLabel('turtle')).toBe('Turtle 🐢');
  });
});

describe('TurtleRacerType — manifest', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has id turtle and emoji 🐢', () => {
    expect(TurtleRacerType.config.id).toBe('turtle');
    expect(TurtleRacerType.getEmoji()).toBe('🐢');
  });

  it('frameCount is 16', () => {
    expect(TurtleRacerType.config.frameCount).toBe(16);
  });

  it('frameWidth and frameHeight are 128', () => {
    expect(TurtleRacerType.config.frameWidth).toBe(128);
    expect(TurtleRacerType.config.frameHeight).toBe(128);
  });

  it('tintMode is mask', () => {
    expect(TurtleRacerType.config.tintMode).toBe('mask');
  });

  it('speedMultiplier is 0.85', () => {
    expect(TurtleRacerType.getSpeedMultiplier()).toBe(0.85);
  });

  it('surfaceClasses contains water', () => {
    expect(TurtleRacerType.config.surfaceClasses).toContain('water');
  });
});

describe('TurtleRacerType — coat palette', () => {
  it('has exactly 18 coats', () => {
    expect(TurtleRacerType.config.coats).toHaveLength(18);
  });

  it('all coats have id, name, tint, borderTint, patternMask, borderMask', () => {
    for (const coat of TurtleRacerType.config.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(typeof coat.tint).toBe('string');
      expect(typeof coat.borderTint).toBe('string');
      expect(typeof coat.patternMask).toBe('string');
      expect(typeof coat.borderMask).toBe('string');
    }
  });

  it('all coat ids are unique', () => {
    const ids = TurtleRacerType.config.coats.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all coats use turtle-mask-plates.png as patternMask', () => {
    for (const coat of TurtleRacerType.config.coats) {
      expect(coat.patternMask).toMatch(/turtle-mask-plates\.png$/);
    }
  });

  it('all coats use turtle-mask-borders.png as borderMask', () => {
    for (const coat of TurtleRacerType.config.coats) {
      expect(coat.borderMask).toMatch(/turtle-mask-borders\.png$/);
    }
  });

  it('borderTint is darker than tint for every coat', () => {
    for (const coat of TurtleRacerType.config.coats) {
      const parse = (hex) => parseInt(hex.slice(1), 16);
      expect(parse(coat.borderTint)).toBeLessThan(parse(coat.tint));
    }
  });
});

describe('TurtleRacerType — drawing', () => {
  beforeEach(() => {
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to arc circle when sprite not loaded', () => {
    const ctx = makeCtx();
    TurtleRacerType._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc).toHaveBeenCalledOnce();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('drawRacer saves and restores ctx state', () => {
    const ctx = makeCtx();
    TurtleRacerType.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('getTrailParticles returns an array', () => {
    expect(Array.isArray(TurtleRacerType.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });
});
