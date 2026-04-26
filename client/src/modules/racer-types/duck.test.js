// ============================================================
// File:        duck.test.js
// Path:        client/src/modules/racer-types/duck.test.js
// Project:     RaceArena
// Created:     2026-04-25
// Description: Tests for DuckRacerType extended manifest (D3.1 → D3.5).
//              D3.5 part 2: DuckRacerType is now a SpriteRacerType instance.
//              Style fields accessed via duck.config.*, drawBody via duck._drawBody,
//              getFrameIndex via duck._getFrameIndex.
//              _createTrail tests removed (dead system).
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DuckRacerType } from './index.js';
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

describe('DuckRacerType — D3.1 extended manifest', () => {
  let duck;
  beforeEach(() => {
    duck = DuckRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has required config fields with correct types', () => {
    expect(duck.config.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(duck.config.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(typeof duck.config.silhouetteScale).toBe('number');
    expect(duck.config.frameCount).toBe(8);
    expect(typeof duck.config.trailFactory).toBe('function');
  });

  it('config.displaySize is a positive number', () => {
    expect(duck.config.displaySize).toBeGreaterThan(0);
  });

  it('_getFrameIndex is deterministic for the same (frame, speed) pair', () => {
    const a = duck._getFrameIndex(137, 2.5);
    const b = duck._getFrameIndex(137, 2.5);
    expect(a).toBe(b);
  });

  it('_getFrameIndex returns an integer in range [0, frameCount-1]', () => {
    for (let frame = 0; frame <= 5000; frame += 50) {
      for (const speed of [0.5, 1, 2, 5]) {
        const idx = duck._getFrameIndex(frame, speed);
        expect(Number.isInteger(idx)).toBe(true);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(duck.config.frameCount - 1);
      }
    }
  });

  it('_getFrameIndex cycles through all 8 frames over one period at speed=1', () => {
    const frameCount = duck.config.frameCount;
    const period = duck.config.basePeriodMs;
    const binWidth = period / frameCount;
    const seen = new Set();
    for (let i = 0; i < frameCount; i++) {
      // Sample at the midpoint of each bin to avoid floor-collision on non-integer bin widths
      seen.add(duck._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    }
    expect(seen.size).toBe(frameCount);
  });
});

describe('DuckRacerType — D3.1 drawRacer wired to Canvas manifest', () => {
  let duck;
  beforeEach(() => {
    duck = DuckRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('drawRacer positions the canvas at (x, y) and rotates by angle', () => {
    const ctx = makeCtx();
    duck.drawRacer(ctx, 150, 200, Math.PI / 4, MOCK_RACER, false, 0);
    expect(ctx.translate.mock.calls[0]).toEqual([150, 200]);
    expect(ctx.rotate.mock.calls[0]).toEqual([Math.PI / 4]);
  });

  it('drawRacer saves and restores ctx state', () => {
    const ctx = makeCtx();
    duck.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('drawRacer never calls fillText (no emoji fallback)', () => {
    const ctx = makeCtx();
    duck.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });

  it('drawRacer with isLeader=true sets cyan strokeStyle (#00ccff)', () => {
    const strokeColors = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'strokeStyle', {
      get() {
        return this._strokeStyle ?? '';
      },
      set(v) {
        this._strokeStyle = v;
        strokeColors.push(v);
      },
      configurable: true,
    });
    duck.drawRacer(ctx, 0, 0, 0, MOCK_RACER, true, 0);
    expect(strokeColors).toContain('#00ccff');
  });

  it('drawRacer with isLeader=false does not set cyan strokeStyle', () => {
    const strokeColors = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'strokeStyle', {
      get() {
        return this._strokeStyle ?? '';
      },
      set(v) {
        this._strokeStyle = v;
        strokeColors.push(v);
      },
      configurable: true,
    });
    duck.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(strokeColors).not.toContain('#00ccff');
  });
});

describe('DuckRacerType — D3.1 sprite-based render', () => {
  let duck;
  beforeEach(() => {
    duck = DuckRacerType;
    vi.clearAllMocks();
  });

  it('config has required sprite fields with correct types', () => {
    expect(typeof duck.config.spriteUrl).toBe('string');
    expect(typeof duck.config.frameWidth).toBe('number');
    expect(typeof duck.config.frameHeight).toBe('number');
    expect(duck.config.frameCount).toBe(8);
    expect(typeof duck.config.basePeriodMs).toBe('number');
    expect(typeof duck.config.displaySize).toBe('number');
    expect(typeof duck.config.baseRotationOffset).toBe('number');
  });

  it('_drawBody calls drawImage with the sprite image when sprite is loaded', () => {
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    duck._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(mockImg);
  });

  it('_drawBody falls back to an arc circle when sprite is not loaded', () => {
    getCachedSprite.mockReturnValue(undefined);
    const ctx = makeCtx();
    duck._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('_drawBody applies baseRotationOffset correction when sprite is loaded', () => {
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    duck._drawBody(ctx, MOCK_RACER, 0);
    const rotationCalls = ctx.rotate.mock.calls;
    const hasOffset = rotationCalls.some(
      (call) => Math.abs(call[0] - duck.config.baseRotationOffset) < 0.0001
    );
    expect(hasOffset).toBe(true);
  });

  it('config has 11 coats each with id, name, and tint (string or null)', () => {
    expect(duck.config.coats).toHaveLength(11);
    for (const coat of duck.config.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(coat.tint === null || typeof coat.tint === 'string').toBe(true);
    }
    expect(duck.config.defaultCoatId).toBe('yellow');
  });

  it('_drawBody with valid coatId uses the coat variant canvas', () => {
    const tintedCanvas = { _isTinted: true };
    getCoatVariants.cached.mockReturnValue(
      new Map([
        ['mallard', tintedCanvas],
        ['yellow', {}],
      ])
    );
    const ctx = makeCtx();
    duck._drawBody(ctx, { ...MOCK_RACER, coatId: 'mallard' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(tintedCanvas);
  });

  it('_drawBody with unknown coatId falls back to defaultCoatId variant', () => {
    const yellowDrawable = { _isYellow: true };
    getCoatVariants.cached.mockReturnValue(new Map([['yellow', yellowDrawable]]));
    const ctx = makeCtx();
    duck._drawBody(ctx, { ...MOCK_RACER, coatId: 'mystery-coat' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(yellowDrawable);
  });
});
