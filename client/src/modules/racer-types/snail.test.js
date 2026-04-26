// ============================================================
// File:        snail.test.js
// Path:        client/src/modules/racer-types/snail.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for SnailRacerType extended manifest (D3.2).
//              Mirrors duck.test.js structure: manifest shape, animation
//              determinism, trail lifecycle, drawRacer wiring, sprite blit,
//              coat variants.
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
    _clearTintCache: vi.fn(),
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
    snail = new SnailRacerType();
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has render, animation, trail, and style sections with correct member types', () => {
    expect(typeof snail.render.drawBody).toBe('function');
    expect(typeof snail.render.getDimensions).toBe('function');
    expect(typeof snail.animation.getFrameIndex).toBe('function');
    expect(typeof snail.trail.createTrail).toBe('function');
    expect(snail.style.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(snail.style.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(typeof snail.style.silhouetteScale).toBe('number');
    expect(snail.style.sprite).toBeDefined();
    expect(snail.style.sprite.frameCount).toBe(4);
    expect(snail.style.sprite.displaySize).toBe(35);
  });

  it('getDimensions returns positive width and height', () => {
    const { width, height } = snail.render.getDimensions();
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('getEmoji returns 🐌', () => {
    expect(snail.getEmoji()).toBe('🐌');
  });

  it('getFrameIndex is deterministic for the same (frame, speed) pair', () => {
    const a = snail.animation.getFrameIndex(137, 2.5);
    const b = snail.animation.getFrameIndex(137, 2.5);
    expect(a).toBe(b);
  });

  it('getFrameIndex returns an integer in range [0, frameCount-1]', () => {
    for (let frame = 0; frame <= 5000; frame += 50) {
      for (const speed of [0.3, 0.5, 1, 2]) {
        const idx = snail.animation.getFrameIndex(frame, speed);
        expect(Number.isInteger(idx)).toBe(true);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(snail.style.sprite.frameCount - 1);
      }
    }
  });

  it('getFrameIndex cycles through all 4 frames over one period at speed=1', () => {
    const frameCount = snail.style.sprite.frameCount;
    const period = snail.style.sprite.basePeriodMs;
    const binWidth = period / frameCount;
    const seen = new Set();
    for (let i = 0; i < frameCount; i++) {
      seen.add(snail.animation.getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    }
    expect(seen.size).toBe(frameCount);
  });

  it('createTrail returns an object with spawn, update, and render methods', () => {
    const trail = snail.trail.createTrail(MOCK_RACER);
    expect(typeof trail.spawn).toBe('function');
    expect(typeof trail.update).toBe('function');
    expect(typeof trail.render).toBe('function');
  });

  it('particles are removed after their lifetime elapses', () => {
    const trail = snail.trail.createTrail(MOCK_RACER);
    const rand = vi.spyOn(Math, 'random').mockReturnValue(0); // 0 < 0.35 threshold = spawn
    trail.spawn({ ...MOCK_RACER, baseSpeed: 0.3 }, 1);
    rand.mockRestore();
    for (let i = 0; i < 35; i++) trail.update(1); // lifetime = 30 frames
    const ctx = makeCtx();
    trail.render(ctx);
    expect(ctx.arc.mock.calls.length).toBe(0);
  });
});

describe('SnailRacerType — D3.2 drawRacer wired to Canvas manifest', () => {
  let snail;
  beforeEach(() => {
    snail = new SnailRacerType();
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
    snail = new SnailRacerType();
    vi.clearAllMocks();
  });

  it('style.sprite has required fields with correct types', () => {
    const { sprite } = snail.style;
    expect(typeof sprite.url).toBe('string');
    expect(typeof sprite.frameWidth).toBe('number');
    expect(typeof sprite.frameHeight).toBe('number');
    expect(sprite.frameCount).toBe(4);
    expect(typeof sprite.basePeriodMs).toBe('number');
    expect(sprite.displaySize).toBe(35);
    expect(typeof sprite.baseRotationOffset).toBe('number');
  });

  it('_drawBody calls drawImage with the sprite image when sprite is loaded', () => {
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    snail.render.drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(mockImg);
  });

  it('_drawBody falls back to an arc circle when sprite is not loaded', () => {
    getCachedSprite.mockReturnValue(undefined);
    const ctx = makeCtx();
    snail.render.drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('_drawBody fallback circle uses accentColor', () => {
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
    snail.render.drawBody(ctx, MOCK_RACER, 0);
    expect(fillStyles).toContain(snail.style.accentColor);
  });

  it('_drawBody applies baseRotationOffset correction when sprite is loaded', () => {
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    snail.render.drawBody(ctx, MOCK_RACER, 0);
    const rotationCalls = ctx.rotate.mock.calls;
    const hasOffset = rotationCalls.some(
      (call) => Math.abs(call[0] - snail.style.sprite.baseRotationOffset) < 0.0001
    );
    expect(hasOffset).toBe(true);
  });

  it('manifest has 11 coats, exactly one with tint: null (garden)', () => {
    expect(snail.style.coats).toHaveLength(11);
    const nullTints = snail.style.coats.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
    expect(nullTints[0].id).toBe('garden');
    for (const coat of snail.style.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(coat.tint === null || typeof coat.tint === 'string').toBe(true);
    }
    expect(snail.style.defaultCoatId).toBe('garden');
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
    snail.render.drawBody(ctx, { ...MOCK_RACER, coatId: 'amber' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(tintedCanvas);
  });

  it('_drawBody with unknown coatId falls back to defaultCoatId variant', () => {
    const gardenDrawable = { _isGarden: true };
    getCoatVariants.cached.mockReturnValue(new Map([['garden', gardenDrawable]]));
    const ctx = makeCtx();
    snail.render.drawBody(ctx, { ...MOCK_RACER, coatId: 'mystery-coat' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(gardenDrawable);
  });
});
