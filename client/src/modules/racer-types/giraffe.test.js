// ============================================================
// File:        giraffe.test.js
// Path:        client/src/modules/racer-types/giraffe.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for GiraffeRacerType (D3.5.3).
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GiraffeRacerType } from './index.js';
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

describe('GiraffeRacerType — manifest', () => {
  let giraffe;
  beforeEach(() => {
    giraffe = GiraffeRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(giraffe.config.id).toBe('giraffe');
    expect(giraffe.getEmoji()).toBe('🦒');
  });

  it('has correct sprite config', () => {
    expect(giraffe.config.frameCount).toBe(8);
    expect(giraffe.config.displaySize).toBe(48);
    expect(giraffe.config.basePeriodMs).toBe(750);
    expect(typeof giraffe.config.spriteUrl).toBe('string');
  });

  it('has correct speedMultiplier', () => {
    expect(giraffe.getSpeedMultiplier()).toBe(0.9);
  });

  it('has exactly 11 coats', () => {
    expect(giraffe.config.coats).toHaveLength(11);
  });

  it('has exactly one coat with tint: null', () => {
    const nullTints = giraffe.config.coats.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
  });

  it('defaultCoatId is golden', () => {
    expect(giraffe.config.defaultCoatId).toBe('golden');
  });

  it('_getFrameIndex returns integer in [0, 7]', () => {
    for (let f = 0; f <= 1000; f += 100) {
      const idx = giraffe._getFrameIndex(f, 1);
      expect(Number.isInteger(idx)).toBe(true);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(7);
    }
  });

  it('_getFrameIndex cycles through all 8 frames', () => {
    const period = giraffe.config.basePeriodMs;
    const binWidth = period / 8;
    const seen = new Set();
    for (let i = 0; i < 8; i++)
      seen.add(giraffe._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    expect(seen.size).toBe(8);
  });

  it('getTrailParticles returns an array', () => {
    expect(Array.isArray(giraffe.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });

  it('_drawBody falls back to arc when sprite not loaded', () => {
    const ctx = makeCtx();
    giraffe._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('drawRacer saves/restores ctx and never calls fillText', () => {
    const ctx = makeCtx();
    giraffe.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });
});
