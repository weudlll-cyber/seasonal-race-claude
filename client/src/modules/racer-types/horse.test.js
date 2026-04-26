// ============================================================
// File:        horse.test.js
// Path:        client/src/modules/racer-types/horse.test.js
// Project:     RaceArena
// Created:     2026-04-25
// Description: Tests for HorseRacerType extended manifest.
//              D3.5 part 2: HorseRacerType is now a SpriteRacerType instance.
//              Style fields accessed via horse.config.*, drawBody via horse._drawBody,
//              getFrameIndex via horse._getFrameIndex.
//              _createTrail tests removed (dead system, never called by RaceScreen).
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HorseRacerType, RocketRacerType, CarRacerType } from './index.js';
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

describe('HorseRacerType — D1 extended manifest', () => {
  let horse;
  beforeEach(() => {
    horse = HorseRacerType;
    getCachedSprite.mockReturnValue(undefined); // sprite not yet loaded
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Config shape ───────────────────────────────────────────────────────

  it('has required config fields with correct types', () => {
    expect(horse.config.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(horse.config.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(typeof horse.config.silhouetteScale).toBe('number');
    expect(typeof horse.config.frameCount).toBe('number');
    expect(typeof horse.config.trailFactory).toBe('function');
  });

  it('config.displaySize is a positive number', () => {
    expect(horse.config.displaySize).toBeGreaterThan(0);
  });

  // ── 2. getFrameIndex — determinism ────────────────────────────────────────

  it('_getFrameIndex is deterministic for the same (frame, speed) pair', () => {
    const a = horse._getFrameIndex(137, 2.5);
    const b = horse._getFrameIndex(137, 2.5);
    expect(a).toBe(b);
  });

  // ── 3. Other racers untouched ─────────────────────────────────────────────

  it('rocket, car have no render/animation/trail/style/config sections', () => {
    // Duck upgraded D3.1→D3.5, Snail upgraded D3.2→D3.5 — only rocket and car remain emoji-only
    const others = [RocketRacerType, CarRacerType];
    for (const Cls of others) {
      const rt = new Cls();
      expect(rt.render).toBeUndefined();
      expect(rt.animation).toBeUndefined();
      expect(rt.trail).toBeUndefined();
      expect(rt.style).toBeUndefined();
      expect(rt.config).toBeUndefined();
    }
  });
});

describe('HorseRacerType — D2 drawRacer wired to Canvas manifest', () => {
  let horse;
  beforeEach(() => {
    horse = HorseRacerType;
    getCachedSprite.mockReturnValue(undefined); // fallback path by default
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── 5. drawRacer — Canvas transform wiring ────────────────────────────────

  it('drawRacer positions the canvas at (x, y) and rotates by angle', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 150, 200, Math.PI / 4, MOCK_RACER, false, 0);
    expect(ctx.translate.mock.calls[0]).toEqual([150, 200]);
    expect(ctx.rotate.mock.calls[0]).toEqual([Math.PI / 4]);
  });

  it('drawRacer saves and restores ctx state', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('drawRacer never calls fillText (no emoji fallback)', () => {
    const ctx = makeCtx();
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });

  // ── 6. Leader glow ────────────────────────────────────────────────────────

  it('drawRacer with isLeader=true sets gold strokeStyle (#ffd700)', () => {
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
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, true, 0);
    expect(strokeColors).toContain('#ffd700');
  });

  it('drawRacer with isLeader=false does not set gold strokeStyle', () => {
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
    horse.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(strokeColors).not.toContain('#ffd700');
  });
});

describe('HorseRacerType — D2.3 sprite-based render', () => {
  let horse;
  beforeEach(() => {
    horse = HorseRacerType;
    vi.clearAllMocks();
  });

  // ── 7. Config sprite fields ───────────────────────────────────────────────

  it('config has required sprite fields with correct types', () => {
    expect(typeof horse.config.spriteUrl).toBe('string');
    expect(typeof horse.config.frameWidth).toBe('number');
    expect(typeof horse.config.frameHeight).toBe('number');
    expect(typeof horse.config.frameCount).toBe('number');
    expect(typeof horse.config.basePeriodMs).toBe('number');
    expect(typeof horse.config.displaySize).toBe('number');
    expect(typeof horse.config.baseRotationOffset).toBe('number');
  });

  // ── 8. _getFrameIndex ────────────────────────────────────────────────────

  it('_getFrameIndex returns an integer in range [0, frameCount-1]', () => {
    for (let frame = 0; frame <= 5000; frame += 50) {
      for (const speed of [0.5, 1, 2, 5]) {
        const idx = horse._getFrameIndex(frame, speed);
        expect(Number.isInteger(idx)).toBe(true);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(horse.config.frameCount - 1);
      }
    }
  });

  it('_getFrameIndex cycles through all 8 frames over one period at speed=1', () => {
    const frameCount = horse.config.frameCount;
    const period = horse.config.basePeriodMs; // 700ms at speed=1
    const binWidth = period / frameCount;
    const seen = new Set();
    for (let i = 0; i < frameCount; i++) {
      // Sample at bin midpoint to avoid floor-collision on non-integer bin widths
      seen.add(horse._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    }
    expect(seen.size).toBe(frameCount);
  });

  it('_getFrameIndex advances faster at higher speed — period is inversely proportional to speed', () => {
    // speed=1: period=700ms; at 125ms → t≈0.179 → idx=1
    // speed=2: period=350ms; at 125ms → t≈0.357 → idx=2
    const idx_speed1 = horse._getFrameIndex(125, 1);
    const idx_speed2 = horse._getFrameIndex(125, 2);
    expect(idx_speed2).toBeGreaterThan(idx_speed1);
  });

  // ── 9. _drawBody — sprite blit ────────────────────────────────────────────

  it('_drawBody calls drawImage with the sprite image when sprite is loaded', () => {
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    horse._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(mockImg);
  });

  it('_drawBody falls back to an arc circle when sprite is not loaded', () => {
    getCachedSprite.mockReturnValue(undefined);
    const ctx = makeCtx();
    horse._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('_drawBody applies baseRotationOffset correction when sprite is loaded', () => {
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    horse._drawBody(ctx, MOCK_RACER, 0);
    const rotationCalls = ctx.rotate.mock.calls;
    const hasOffset = rotationCalls.some(
      (call) => Math.abs(call[0] - horse.config.baseRotationOffset) < 0.0001
    );
    expect(hasOffset).toBe(true);
  });

  // ── 10. Coat variants (D2.4) ──────────────────────────────────────────────

  it('config has 11 coats each with id, name, and tint (string or null)', () => {
    expect(horse.config.coats).toHaveLength(11);
    for (const coat of horse.config.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(coat.tint === null || typeof coat.tint === 'string').toBe(true);
    }
    expect(horse.config.defaultCoatId).toBe('cream');
  });

  it('_drawBody with variants cache empty falls back to base sprite', () => {
    getCoatVariants.cached.mockReturnValue(undefined);
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    horse._drawBody(ctx, { ...MOCK_RACER, coatId: 'cream' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(mockImg);
  });

  it('_drawBody with valid coatId uses the coat variant canvas', () => {
    const tintedCanvas = { _isTinted: true };
    getCoatVariants.cached.mockReturnValue(
      new Map([
        ['bay', tintedCanvas],
        ['cream', {}],
      ])
    );
    const ctx = makeCtx();
    horse._drawBody(ctx, { ...MOCK_RACER, coatId: 'bay' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(tintedCanvas);
  });

  it('_drawBody with unknown coatId falls back to defaultCoatId variant', () => {
    const creamDrawable = { _isCream: true };
    getCoatVariants.cached.mockReturnValue(new Map([['cream', creamDrawable]]));
    const ctx = makeCtx();
    horse._drawBody(ctx, { ...MOCK_RACER, coatId: 'mystery-coat' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(creamDrawable);
  });

  // ── 11. Other racers untouched ─────────────────────────────────────────────

  it('rocket, car do not have config.spriteUrl defined', () => {
    // Duck upgraded D3.1→D3.5, Snail upgraded D3.2→D3.5 — only rocket and car remain emoji-only
    const others = [RocketRacerType, CarRacerType];
    for (const Cls of others) {
      const rt = new Cls();
      expect(rt.config?.spriteUrl).toBeUndefined();
    }
  });
});
