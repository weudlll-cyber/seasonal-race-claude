// ============================================================
// File:        buggy.test.js
// Path:        client/src/modules/racer-types/buggy.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for BuggyRacerType (D3.5.3 — replaces CarRacerType).
//              Mask-tinting type: chassis area tinted via mask PNG.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BuggyRacerType } from './index.js';
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

describe('BuggyRacerType — manifest', () => {
  let buggy;
  beforeEach(() => {
    buggy = BuggyRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(buggy.config.id).toBe('buggy');
    expect(buggy.getEmoji()).toBe('🚙');
  });

  it('has correct sprite config', () => {
    expect(buggy.config.frameCount).toBe(8);
    expect(buggy.config.displaySize).toBe(38);
    expect(buggy.config.basePeriodMs).toBe(500);
  });

  it('uses mask-tinting mode', () => {
    expect(buggy.config.tintMode).toBe('mask');
    expect(typeof buggy.config.maskUrl).toBe('string');
    expect(buggy.config.maskUrl.length).toBeGreaterThan(0);
  });

  it('has correct speedMultiplier (0.95)', () => {
    expect(buggy.getSpeedMultiplier()).toBe(0.95);
  });

  it('has exactly 11 coats', () => {
    expect(buggy.config.coats).toHaveLength(11);
  });

  it('has exactly one coat with tint: null', () => {
    const nullTints = buggy.config.coats.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
  });

  it('_getFrameIndex cycles through all 8 frames', () => {
    const period = buggy.config.basePeriodMs;
    const binWidth = period / 8;
    const seen = new Set();
    for (let i = 0; i < 8; i++)
      seen.add(buggy._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    expect(seen.size).toBe(8);
  });

  it('getTrailParticles returns array', () => {
    expect(Array.isArray(buggy.getTrailParticles(0, 0, 1, 0, 0))).toBe(true);
  });

  it('_drawBody falls back to arc when sprite not loaded', () => {
    const ctx = makeCtx();
    buggy._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('drawRacer saves/restores ctx and never calls fillText', () => {
    const ctx = makeCtx();
    buggy.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });
});
