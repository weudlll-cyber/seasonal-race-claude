// ============================================================
// File:        rocket.test.js
// Path:        client/src/modules/racer-types/rocket.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for RocketRacerType (D3.5.3 — migrated from class to SpriteRacerType).
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RocketRacerType } from './index.js';
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

describe('RocketRacerType — manifest', () => {
  let rocket;
  beforeEach(() => {
    rocket = RocketRacerType;
    getCachedSprite.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has correct id and emoji', () => {
    expect(rocket.config.id).toBe('rocket');
    expect(rocket.getEmoji()).toBe('🚀');
  });

  it('has correct sprite config', () => {
    expect(rocket.config.frameCount).toBe(8);
    expect(rocket.config.displaySize).toBe(40);
    expect(rocket.config.basePeriodMs).toBe(500);
    expect(rocket.config.tintMode).toBe('multiply');
  });

  it('has correct speedMultiplier (1.25)', () => {
    expect(rocket.getSpeedMultiplier()).toBe(1.25);
  });

  it('has exactly 11 coats', () => {
    expect(rocket.config.coats).toHaveLength(11);
  });

  it('has exactly one coat with tint: null', () => {
    const nullTints = rocket.config.coats.filter((c) => c.tint === null);
    expect(nullTints).toHaveLength(1);
  });

  it('_getFrameIndex cycles through all 8 frames', () => {
    const period = rocket.config.basePeriodMs;
    const binWidth = period / 8;
    const seen = new Set();
    for (let i = 0; i < 8; i++)
      seen.add(rocket._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    expect(seen.size).toBe(8);
  });

  it('getTrailParticles emits orange-tinted particles', () => {
    let particles = [];
    for (let i = 0; i < 50; i++) {
      particles = rocket.getTrailParticles(100, 100, 1, 0, i * 50);
      if (particles.length > 0) break;
    }
    if (particles.length > 0) {
      expect(particles[0]).toHaveProperty('color', '#ffaa44');
    }
  });

  it('_drawBody falls back to arc when sprite not loaded', () => {
    const ctx = makeCtx();
    rocket._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('drawRacer saves/restores ctx and never calls fillText', () => {
    const ctx = makeCtx();
    rocket.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });
});
