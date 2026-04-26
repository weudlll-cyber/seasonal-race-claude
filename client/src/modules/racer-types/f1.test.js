// ============================================================
// File:        f1.test.js
// Path:        client/src/modules/racer-types/f1.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for F1RacerType (D3.5.3).
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { F1RacerType } from './index.js';
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

describe('F1RacerType — manifest', () => {
  let f1;
  beforeEach(() => {
    f1 = F1RacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(f1.config.id).toBe('f1');
    expect(f1.getEmoji()).toBe('🏎️');
  });

  it('has correct sprite config', () => {
    expect(f1.config.frameCount).toBe(8);
    expect(f1.config.displaySize).toBe(38);
    expect(f1.config.basePeriodMs).toBe(400);
    expect(f1.config.tintMode).toBe('multiply');
  });

  it('has correct speedMultiplier', () => {
    expect(f1.getSpeedMultiplier()).toBe(1.2);
  });

  it('has exactly 11 coats each with id, name, tint', () => {
    expect(f1.config.coats).toHaveLength(11);
    for (const coat of f1.config.coats) {
      expect(typeof coat.id).toBe('string');
      expect(typeof coat.name).toBe('string');
      expect(coat.tint === null || typeof coat.tint === 'string').toBe(true);
    }
  });

  it('has exactly one coat with tint: null (base)', () => {
    const nullTints = f1.config.coats.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
    expect(nullTints[0].id).toBe('base');
  });

  it('_getFrameIndex cycles through all 8 frames', () => {
    const period = f1.config.basePeriodMs;
    const binWidth = period / 8;
    const seen = new Set();
    for (let i = 0; i < 8; i++)
      seen.add(f1._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    expect(seen.size).toBe(8);
  });

  it('getTrailParticles returns array', () => {
    expect(Array.isArray(f1.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });

  it('_drawBody falls back to arc when sprite not loaded', () => {
    const ctx = makeCtx();
    f1._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('drawRacer saves/restores ctx and never calls fillText', () => {
    const ctx = makeCtx();
    f1.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });
});
