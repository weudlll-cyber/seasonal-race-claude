// ============================================================
// File:        snake.test.js
// Path:        client/src/modules/racer-types/snake.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for SnakeRacerType (D3.5.3).
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SnakeRacerType } from './index.js';
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

describe('SnakeRacerType — manifest', () => {
  let snake;
  beforeEach(() => {
    snake = SnakeRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(snake.config.id).toBe('snake');
    expect(snake.getEmoji()).toBe('🐍');
  });

  it('has correct sprite config', () => {
    expect(snake.config.frameCount).toBe(8);
    expect(snake.config.displaySize).toBe(36);
    expect(snake.config.basePeriodMs).toBe(600);
    expect(typeof snake.config.spriteUrl).toBe('string');
  });

  it('has correct speedMultiplier', () => {
    expect(snake.getSpeedMultiplier()).toBe(0.75);
  });

  it('has exactly 11 coats', () => {
    expect(snake.config.coats).toHaveLength(11);
  });

  it('has exactly one coat with tint: null (emerald)', () => {
    const nullTints = snake.config.coats.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
    expect(nullTints[0].id).toBe('emerald');
  });

  it('_getFrameIndex cycles through all 8 frames', () => {
    const period = snake.config.basePeriodMs;
    const binWidth = period / 8;
    const seen = new Set();
    for (let i = 0; i < 8; i++)
      seen.add(snake._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    expect(seen.size).toBe(8);
  });

  it('getTrailParticles returns an array', () => {
    expect(Array.isArray(snake.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });

  it('_drawBody falls back to arc when sprite not loaded', () => {
    const ctx = makeCtx();
    snake._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('drawRacer saves/restores ctx and never calls fillText', () => {
    const ctx = makeCtx();
    snake.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });
});
