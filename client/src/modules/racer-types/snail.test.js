// ============================================================
// File:        snail.test.js
// Path:        client/src/modules/racer-types/snail.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for SnailRacerType extended manifest (D3.2 → D3.5).
//              D3.5 part 2: SnailRacerType is now a SpriteRacerType instance.
//              Style fields accessed via snail.config.*, drawBody via snail._drawBody,
//              getFrameIndex via snail._getFrameIndex.
//              _createTrail tests removed (dead system).
//              Snail-specific: fallbackColor = accentColor (documented drift).
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SnailRacerType } from './index.js';
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

describe('SnailRacerType — D3.2 extended manifest', () => {
  let snail;
  beforeEach(() => {
    snail = SnailRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has required config fields with correct types', () => {
    expect(typeof snail.config.primaryColor).toBe('string');
    expect(typeof snail.config.accentColor).toBe('string');
    expect(typeof snail.config.silhouetteScale).toBe('number');
    expect(snail.config.frameCount).toBe(4);
    expect(snail.config.displaySize).toBe(35);
    expect(typeof snail.config.trailFactory).toBe('function');
  });

  it('config.displaySize is a positive number', () => {
    expect(snail.config.displaySize).toBeGreaterThan(0);
  });

  it('getEmoji returns 🐌', () => {
    expect(snail.getEmoji()).toBe('🐌');
  });

  it('_getFrameIndex is deterministic for the same (frame, speed) pair', () => {
    const a = snail._getFrameIndex(137, 2.5);
    const b = snail._getFrameIndex(137, 2.5);
    expect(a).toBe(b);
  });

  it('_getFrameIndex returns an integer in range [0, frameCount-1]', () => {
    for (let frame = 0; frame <= 5000; frame += 50) {
      for (const speed of [0.3, 0.5, 1, 2]) {
        const idx = snail._getFrameIndex(frame, speed);
        expect(Number.isInteger(idx)).toBe(true);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(snail.config.frameCount - 1);
      }
    }
  });

  it('_getFrameIndex cycles through all 4 frames over one period at speed=1', () => {
    const frameCount = snail.config.frameCount;
    const period = snail.config.basePeriodMs;
    const binWidth = period / frameCount;
    const seen = new Set();
    for (let i = 0; i < frameCount; i++) {
      seen.add(snail._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    }
    expect(seen.size).toBe(frameCount);
  });
});

describe('SnailRacerType — D3.2 drawRacer wired to Canvas manifest', () => {
  let snail;
  beforeEach(() => {
    snail = SnailRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('drawRacer positions the canvas at (x, y) and rotates by angle', () => {
    const ctx = makeCtx();
    snail.drawRacer(ctx, 150, 200, Math.PI / 4, MOCK_RACER, false, 0);
    expect(ctx.translate.mock.calls[0]).toEqual([150, 200]);
    expect(ctx.rotate.mock.calls[0]).toEqual([Math.PI / 4]);
  });

  it('drawRacer saves and restores ctx state', () => {
    const ctx = makeCtx();
    snail.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('drawRacer never calls fillText (no emoji fallback)', () => {
    const ctx = makeCtx();
    snail.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });

  it('drawRacer with isLeader=true sets green strokeStyle (#88ff44)', () => {
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
    snail.drawRacer(ctx, 0, 0, 0, MOCK_RACER, true, 0);
    expect(strokeColors).toContain('#88ff44');
  });

  it('drawRacer with isLeader=false does not set green strokeStyle', () => {
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
    snail.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(strokeColors).not.toContain('#88ff44');
  });
});

describe('SnailRacerType — D3.2 sprite-based render', () => {
  let snail;
  beforeEach(() => {
    snail = SnailRacerType;
    vi.clearAllMocks();
  });

  it('config has required sprite fields with correct types', () => {
    expect(typeof snail.config.spriteUrl).toBe('string');
    expect(typeof snail.config.frameWidth).toBe('number');
    expect(typeof snail.config.frameHeight).toBe('number');
    expect(snail.config.frameCount).toBe(4);
    expect(typeof snail.config.basePeriodMs).toBe('number');
    expect(snail.config.displaySize).toBe(35);
    expect(typeof snail.config.baseRotationOffset).toBe('number');
  });

  it('_drawBody calls drawImage with the sprite image when sprite is loaded', () => {
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    snail._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(mockImg);
  });

  it('_drawBody falls back to an arc circle when sprite is not loaded', () => {
    getCachedSprite.mockReturnValue(undefined);
    const ctx = makeCtx();
    snail._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('_drawBody fallback circle uses accentColor (= fallbackColor for snail)', () => {
    getCachedSprite.mockReturnValue(undefined);
    const fillStyles = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'fillStyle', {
      get() {
        return this._fillStyle ?? '';
      },
      set(v) {
        this._fillStyle = v;
        fillStyles.push(v);
      },
      configurable: true,
    });
    snail._drawBody(ctx, MOCK_RACER, 0);
    expect(fillStyles).toContain(snail.config.accentColor);
  });

  it('_drawBody applies baseRotationOffset correction when sprite is loaded', () => {
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    snail._drawBody(ctx, MOCK_RACER, 0);
    const rotationCalls = ctx.rotate.mock.calls;
    const hasOffset = rotationCalls.some(
      (call) => Math.abs(call[0] - snail.config.baseRotationOffset) < 0.0001
    );
    expect(hasOffset).toBe(true);
  });

  it('config has 11 coats, exactly one with tint: null (garden)', () => {
    expect(snail.config.coats).toHaveLength(11);
    const nullTints = snail.config.coats.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
    expect(nullTints[0].id).toBe('garden');
    for (const coat of snail.config.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(coat.tint === null || typeof coat.tint === 'string').toBe(true);
    }
    expect(snail.config.defaultCoatId).toBe('garden');
  });

  it('_drawBody with valid coatId uses the coat variant canvas', () => {
    const tintedCanvas = { _isTinted: true };
    getCoatVariants.cached.mockReturnValue(
      new Map([
        ['amber', tintedCanvas],
        ['garden', {}],
      ])
    );
    const ctx = makeCtx();
    snail._drawBody(ctx, { ...MOCK_RACER, coatId: 'amber' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(tintedCanvas);
  });

  it('_drawBody with unknown coatId falls back to defaultCoatId variant', () => {
    const gardenDrawable = { _isGarden: true };
    getCoatVariants.cached.mockReturnValue(new Map([['garden', gardenDrawable]]));
    const ctx = makeCtx();
    snail._drawBody(ctx, { ...MOCK_RACER, coatId: 'mystery-coat' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(gardenDrawable);
  });
});
