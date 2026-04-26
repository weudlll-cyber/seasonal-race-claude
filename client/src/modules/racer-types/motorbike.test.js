// ============================================================
// File:        motorbike.test.js
// Path:        client/src/modules/racer-types/motorbike.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for MotorbikeRacerType (D3.5.3).
//              Mask-tinting type: body area tinted via mask PNG.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MotorbikeRacerType } from './index.js';
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

describe('MotorbikeRacerType — manifest', () => {
  let motorbike;
  beforeEach(() => {
    motorbike = MotorbikeRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(motorbike.config.id).toBe('motorbike');
    expect(motorbike.getEmoji()).toBe('🏍️');
  });

  it('has correct sprite config', () => {
    expect(motorbike.config.frameCount).toBe(8);
    expect(motorbike.config.displaySize).toBe(36);
    expect(motorbike.config.basePeriodMs).toBe(500);
  });

  it('uses mask-tinting mode', () => {
    expect(motorbike.config.tintMode).toBe('mask');
    expect(typeof motorbike.config.maskUrl).toBe('string');
    expect(motorbike.config.maskUrl.length).toBeGreaterThan(0);
  });

  it('has correct speedMultiplier (1.05)', () => {
    expect(motorbike.getSpeedMultiplier()).toBe(1.05);
  });

  it('has exactly 11 coats', () => {
    expect(motorbike.config.coats).toHaveLength(11);
  });

  it('has exactly one coat with tint: null', () => {
    const nullTints = motorbike.config.coats.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
  });

  it('_getFrameIndex cycles through all 8 frames', () => {
    const period = motorbike.config.basePeriodMs;
    const binWidth = period / 8;
    const seen = new Set();
    for (let i = 0; i < 8; i++)
      seen.add(motorbike._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    expect(seen.size).toBe(8);
  });

  it('getTrailParticles returns array', () => {
    expect(Array.isArray(motorbike.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });

  it('_drawBody falls back to arc when sprite not loaded', () => {
    const ctx = makeCtx();
    motorbike._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('drawRacer saves/restores ctx and never calls fillText', () => {
    const ctx = makeCtx();
    motorbike.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });
});
