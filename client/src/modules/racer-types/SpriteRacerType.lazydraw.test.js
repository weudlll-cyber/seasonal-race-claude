// ============================================================
// File:        SpriteRacerType.lazydraw.test.js
// Path:        client/src/modules/racer-types/SpriteRacerType.lazydraw.test.js
// Project:     RaceArena
// Description: Honesty proofs for the D6b-Fix-3 lazy-draw kick:
//              on cache miss the draw path fires a one-shot fire-and-forget
//              load; subsequent frames do not re-kick (idempotent); warm cache
//              never triggers a kick.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('./spriteLoader.js', () => ({
  getCachedSprite: vi.fn().mockReturnValue(undefined),
  loadSprite: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
  _clearSpriteCache: vi.fn(),
}));

vi.mock('./spriteTinter.js', () => {
  const getCoatVariants = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
  getCoatVariants.cached = vi.fn().mockReturnValue(undefined);
  return {
    getCoatVariants,
    tintSprite: vi.fn().mockReturnValue(null),
    tintSpriteWithMask: vi.fn().mockReturnValue(null),
    tintSpriteBodyAndMask: vi.fn().mockReturnValue(null),
    tintSpriteWithDualMask: vi.fn().mockReturnValue(null),
    detectTintMode: vi.fn().mockReturnValue('multiply'),
    getPatternedVariant: vi.fn().mockReturnValue(null),
    _clearTintCache: vi.fn(),
    _clearMaskedTintCache: vi.fn(),
  };
});

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import { SpriteRacerType } from './SpriteRacerType.js';
import { getCoatVariants } from './spriteTinter.js';
import { loadSprite } from './spriteLoader.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const SPRITE_URL = 'http://localhost:4000/api/racers/test-lazy/sprite';

function makeInstance(overrides = {}) {
  return new SpriteRacerType({
    id: 'test-lazy',
    spriteUrl: SPRITE_URL,
    frameCount: 4,
    basePeriodMs: 600,
    displaySize: 40,
    bodyFillX: 0.5,
    bodyFillY: 0.5,
    coats: [{ id: 'default', name: 'Default', tint: null }],
    trailFactory: () => [],
    tintMode: 'multiply',
    primaryColor: '#ff0000',
    ...overrides,
  });
}

// Minimal canvas context for the fallback path (arc/fill only).
function makeCtx() {
  return {
    fillStyle: null,
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
  };
}

const RACER = { coatId: 'default', speed: 1, patternId: 'solid' };

beforeEach(() => {
  vi.clearAllMocks();
  // Reset to cache-miss state after clearAllMocks wipes the mock return values.
  getCoatVariants.cached.mockReturnValue(undefined);
  getCoatVariants.mockReturnValue(new Promise(() => {}));
  loadSprite.mockReturnValue(new Promise(() => {}));
});

// ── Honesty proofs ─────────────────────────────────────────────────────────────
//
// (a) Cache miss → exactly ONE getCoatVariants call (non-mask) / loadSprite call (mask).
//     Second frame with still-empty cache does NOT kick again (idempotent).
//     RED: without the kick code, neither function is called.
//     GREEN: first frame calls once; second frame does not add another call.
// (b) When variants are already cached (step 1 fast path), no kick fires at all.
// (c) Two independent instances each get their own kick (instance-level tracker).

describe('SpriteRacerType — lazy draw kick on cache miss (D6b-Fix-3)', () => {
  it('(a) non-mask: first draw on cache miss calls getCoatVariants exactly once', () => {
    const instance = makeInstance();
    const ctx = makeCtx();
    instance._drawBody(ctx, RACER, 0);
    expect(getCoatVariants).toHaveBeenCalledTimes(1);
    expect(getCoatVariants).toHaveBeenCalledWith(SPRITE_URL, expect.any(Array), expect.any(String));
  });

  it('(a) non-mask: second draw with cache still empty does NOT kick again (idempotent)', () => {
    const instance = makeInstance();
    const ctx = makeCtx();
    instance._drawBody(ctx, RACER, 0);
    instance._drawBody(ctx, RACER, 1);
    expect(getCoatVariants).toHaveBeenCalledTimes(1);
  });

  it('(a) fallback circle is drawn on cache miss (arc called)', () => {
    const instance = makeInstance();
    const ctx = makeCtx();
    instance._drawBody(ctx, RACER, 0);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
  });

  it('(a) mask-mode: loadSprite kicked (not getCoatVariants) on cache miss', () => {
    const instance = makeInstance({ tintMode: 'mask', maskUrl: '/mask.png' });
    const ctx = makeCtx();
    instance._drawBody(ctx, RACER, 0);
    expect(loadSprite).toHaveBeenCalledWith(SPRITE_URL);
    expect(getCoatVariants).not.toHaveBeenCalled();
  });

  it('(a) mask-mode: second draw does NOT kick loadSprite again (idempotent)', () => {
    const instance = makeInstance({ tintMode: 'mask', maskUrl: '/mask.png' });
    const ctx = makeCtx();
    instance._drawBody(ctx, RACER, 0);
    instance._drawBody(ctx, RACER, 1);
    expect(loadSprite).toHaveBeenCalledTimes(1);
  });

  it('(b) no kick when variant cache is already warm (fast path succeeds)', () => {
    const instance = makeInstance();
    const ctx = makeCtx();
    // Pre-fill variant cache so step 1 produces a drawable.
    getCoatVariants.cached.mockReturnValue(new Map([['default', {}]]));
    instance._drawBody(ctx, RACER, 0);
    expect(getCoatVariants).not.toHaveBeenCalled();
  });

  it('(c) two instances with the same spriteUrl each get their own independent kick', () => {
    const i1 = makeInstance();
    const i2 = makeInstance();
    const ctx = makeCtx();
    i1._drawBody(ctx, RACER, 0);
    i2._drawBody(ctx, RACER, 0);
    expect(getCoatVariants).toHaveBeenCalledTimes(2);
  });

  it('(c) kicks on the same instance with different spriteUrls are tracked independently', () => {
    const i1 = makeInstance({ spriteUrl: 'http://localhost:4000/api/racers/a/sprite' });
    const i2 = makeInstance({ spriteUrl: 'http://localhost:4000/api/racers/b/sprite' });
    const ctx = makeCtx();
    i1._drawBody(ctx, RACER, 0);
    i1._drawBody(ctx, RACER, 1); // same URL, no re-kick
    i2._drawBody(ctx, RACER, 0); // different URL, new kick
    expect(getCoatVariants).toHaveBeenCalledTimes(2); // a once + b once
  });
});
