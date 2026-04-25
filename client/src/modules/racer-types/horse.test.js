// ============================================================
// File:        horse.test.js
// Path:        client/src/modules/racer-types/horse.test.js
// Project:     RaceArena
// Created:     2026-04-25
// Description: Tests for HorseRacerType extended manifest.
//              D1: manifest shape, animation determinism, trail lifecycle.
//              D2: drawRacer Canvas transform wiring, leader glow.
//              D2.3: sprite-based render — sprite manifest, getFrameIndex,
//                    drawImage blit, fallback circle, rotation correction.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  HorseRacerType,
  DuckRacerType,
  RocketRacerType,
  SnailRacerType,
  CarRacerType,
} from './index.js';
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

describe('HorseRacerType — D1 extended manifest', () => {
  let horse;
  beforeEach(() => {
    horse = new HorseRacerType();
    getCachedSprite.mockReturnValue(undefined); // sprite not yet loaded
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Manifest shape ─────────────────────────────────────────────────────

  it('has render, animation, trail, and style sections with correct member types', () => {
    expect(typeof horse.render.drawBody).toBe('function');
    expect(typeof horse.render.getDimensions).toBe('function');
    expect(typeof horse.animation.getFrameIndex).toBe('function');
    expect(typeof horse.trail.createTrail).toBe('function');
    expect(horse.style.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(horse.style.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(typeof horse.style.silhouetteScale).toBe('number');
    expect(horse.style.sprite).toBeDefined();
    expect(typeof horse.style.sprite.frameCount).toBe('number');
  });

  it('getDimensions returns positive width and height', () => {
    const { width, height } = horse.render.getDimensions();
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  // ── 2. getFrameIndex — determinism ────────────────────────────────────────

  it('getFrameIndex is deterministic for the same (frame, speed) pair', () => {
    const a = horse.animation.getFrameIndex(137, 2.5);
    const b = horse.animation.getFrameIndex(137, 2.5);
    expect(a).toBe(b);
  });

  // ── 3. createTrail — factory lifecycle ───────────────────────────────────

  it('createTrail returns an object with spawn, update, and render methods', () => {
    const trail = horse.trail.createTrail(MOCK_RACER);
    expect(typeof trail.spawn).toBe('function');
    expect(typeof trail.update).toBe('function');
    expect(typeof trail.render).toBe('function');
  });

  it('spawns ~2 particles per frame at full speed — 30 frames yields 50–70 alive', () => {
    const trail = horse.trail.createTrail(MOCK_RACER);
    const fullSpeed = { ...MOCK_RACER, baseSpeed: 5 };
    for (let i = 0; i < 30; i++) {
      trail.spawn(fullSpeed, 1);
      trail.update(1);
    }
    // After 30 iterations: batch from frame 1 (ttl=30-30=0) is removed,
    // frames 2–30 alive = 29×2 = 58 particles
    const ctx = makeCtx();
    trail.render(ctx);
    expect(ctx.arc.mock.calls.length).toBeGreaterThanOrEqual(50);
    expect(ctx.arc.mock.calls.length).toBeLessThanOrEqual(70);
  });

  it('particles are removed after their lifetime (ttl=30) elapses', () => {
    const trail = horse.trail.createTrail(MOCK_RACER);
    trail.spawn({ ...MOCK_RACER, baseSpeed: 5 }, 1); // 2 particles, ttl=30
    for (let i = 0; i < 35; i++) trail.update(1); // 35 updates — all dead at update 30
    const ctx = makeCtx();
    trail.render(ctx);
    expect(ctx.arc.mock.calls.length).toBe(0);
  });

  // ── 4. Other racers untouched ─────────────────────────────────────────────

  it('duck, rocket, snail, car have no render/animation/trail/style sections', () => {
    const others = [DuckRacerType, RocketRacerType, SnailRacerType, CarRacerType];
    for (const Cls of others) {
      const rt = new Cls();
      expect(rt.render).toBeUndefined();
      expect(rt.animation).toBeUndefined();
      expect(rt.trail).toBeUndefined();
      expect(rt.style).toBeUndefined();
    }
  });
});

describe('HorseRacerType — D2 drawRacer wired to Canvas manifest', () => {
  let horse;
  beforeEach(() => {
    horse = new HorseRacerType();
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
    horse = new HorseRacerType();
    vi.clearAllMocks();
  });

  // ── 7. Sprite manifest shape ──────────────────────────────────────────────

  it('style.sprite has required fields with correct types', () => {
    const { sprite } = horse.style;
    expect(typeof sprite.url).toBe('string');
    expect(typeof sprite.frameWidth).toBe('number');
    expect(typeof sprite.frameHeight).toBe('number');
    expect(typeof sprite.frameCount).toBe('number');
    expect(typeof sprite.basePeriodMs).toBe('number');
    expect(typeof sprite.displaySize).toBe('number');
    expect(typeof sprite.baseRotationOffset).toBe('number');
  });

  // ── 8. getFrameIndex ──────────────────────────────────────────────────────

  it('getFrameIndex returns an integer in range [0, frameCount-1]', () => {
    for (let frame = 0; frame <= 5000; frame += 50) {
      for (const speed of [0.5, 1, 2, 5]) {
        const idx = horse.animation.getFrameIndex(frame, speed);
        expect(Number.isInteger(idx)).toBe(true);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(horse.style.sprite.frameCount - 1);
      }
    }
  });

  it('getFrameIndex cycles through all 4 frames over one period at speed=1', () => {
    const frameCount = horse.style.sprite.frameCount;
    const period = horse.style.sprite.basePeriodMs; // 500ms at speed=1
    const seen = new Set();
    for (let i = 0; i < frameCount; i++) {
      seen.add(horse.animation.getFrameIndex(Math.floor((i * period) / frameCount), 1));
    }
    expect(seen.size).toBe(frameCount);
  });

  it('getFrameIndex advances faster at higher speed — period is inversely proportional to speed', () => {
    // speed=1: period=500ms; at 125ms → t=0.25 → idx=1
    // speed=2: period=250ms; at 125ms → t=0.5  → idx=2
    const idx_speed1 = horse.animation.getFrameIndex(125, 1);
    const idx_speed2 = horse.animation.getFrameIndex(125, 2);
    expect(idx_speed2).toBeGreaterThan(idx_speed1);
  });

  // ── 9. _drawBody — sprite blit ────────────────────────────────────────────

  it('_drawBody calls drawImage with the sprite image when sprite is loaded', () => {
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    horse.render.drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(mockImg);
  });

  it('_drawBody falls back to an arc circle when sprite is not loaded', () => {
    getCachedSprite.mockReturnValue(undefined);
    const ctx = makeCtx();
    horse.render.drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('_drawBody applies baseRotationOffset correction when sprite is loaded', () => {
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    horse.render.drawBody(ctx, MOCK_RACER, 0);
    const rotationCalls = ctx.rotate.mock.calls;
    const hasOffset = rotationCalls.some(
      (call) => Math.abs(call[0] - horse.style.sprite.baseRotationOffset) < 0.0001
    );
    expect(hasOffset).toBe(true);
  });

  // ── 10. Coat variants (D2.4) ──────────────────────────────────────────────

  it('manifest has 11 coats each with id, name, and tint (string or null)', () => {
    expect(horse.style.coats).toHaveLength(11);
    for (const coat of horse.style.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(coat.tint === null || typeof coat.tint === 'string').toBe(true);
    }
    expect(horse.style.defaultCoatId).toBe('cream');
  });

  it('_drawBody with variants cache empty falls back to base sprite', () => {
    getCoatVariants.cached.mockReturnValue(undefined);
    const mockImg = {};
    getCachedSprite.mockReturnValue(mockImg);
    const ctx = makeCtx();
    horse.render.drawBody(ctx, { ...MOCK_RACER, coatId: 'bay' }, 0);
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
    horse.render.drawBody(ctx, { ...MOCK_RACER, coatId: 'bay' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(tintedCanvas);
  });

  it('_drawBody with unknown coatId falls back to defaultCoatId variant', () => {
    const creamDrawable = { _isCream: true };
    getCoatVariants.cached.mockReturnValue(new Map([['cream', creamDrawable]]));
    const ctx = makeCtx();
    horse.render.drawBody(ctx, { ...MOCK_RACER, coatId: 'mystery-coat' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(creamDrawable);
  });

  // ── 11. Other racers untouched ─────────────────────────────────────────────

  it('other racers do not have style.sprite defined', () => {
    const others = [DuckRacerType, RocketRacerType, SnailRacerType, CarRacerType];
    for (const Cls of others) {
      const rt = new Cls();
      expect(rt.style?.sprite).toBeUndefined();
    }
  });
});
