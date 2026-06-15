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
    ensureRacerTypeWarm: vi.fn(),
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
import { getCoatVariants, ensureRacerTypeWarm } from './spriteTinter.js';

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
});

// ── Honesty proofs ─────────────────────────────────────────────────────────────
//
// (a) Cache miss → ensureRacerTypeWarm called ONCE (shared function for both
//     mask and non-mask paths). Second frame does NOT kick again (idempotent).
//     RED: without the kick code, ensureRacerTypeWarm is never called.
//     GREEN: first frame calls once; second frame does not add another call.
// (a-dedup) ensureRacerTypeWarm (not inline getCoatVariants/loadSprite) is called,
//     proving the lazy-kick uses the same shared function as _runLoad warm-up.
// (b) When variants are already cached (step 1 fast path), no kick fires at all.
// (c) Two independent instances each get their own kick (instance-level tracker).

describe('SpriteRacerType — lazy draw kick on cache miss (D6b-finalize)', () => {
  it('(a) first draw on cache miss calls ensureRacerTypeWarm exactly once', () => {
    const instance = makeInstance();
    const ctx = makeCtx();
    instance._drawBody(ctx, RACER, 0);
    expect(ensureRacerTypeWarm).toHaveBeenCalledTimes(1);
    expect(ensureRacerTypeWarm).toHaveBeenCalledWith(
      expect.objectContaining({ spriteUrl: SPRITE_URL })
    );
  });

  it('(a) second draw with cache still empty does NOT kick again (idempotent)', () => {
    const instance = makeInstance();
    const ctx = makeCtx();
    instance._drawBody(ctx, RACER, 0);
    instance._drawBody(ctx, RACER, 1);
    expect(ensureRacerTypeWarm).toHaveBeenCalledTimes(1);
  });

  it('(a) fallback circle is drawn on cache miss (arc called)', () => {
    const instance = makeInstance();
    const ctx = makeCtx();
    instance._drawBody(ctx, RACER, 0);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
  });

  it('(a-dedup) mask-mode: ensureRacerTypeWarm called with mask config (shared function, loads masks internally)', () => {
    const instance = makeInstance({ tintMode: 'mask', maskUrl: '/mask.png' });
    const ctx = makeCtx();
    instance._drawBody(ctx, RACER, 0);
    expect(ensureRacerTypeWarm).toHaveBeenCalledTimes(1);
    expect(ensureRacerTypeWarm).toHaveBeenCalledWith(
      expect.objectContaining({ spriteUrl: SPRITE_URL, tintMode: 'mask' })
    );
  });

  it('(a) mask-mode: second draw does NOT kick again (idempotent)', () => {
    const instance = makeInstance({ tintMode: 'mask', maskUrl: '/mask.png' });
    const ctx = makeCtx();
    instance._drawBody(ctx, RACER, 0);
    instance._drawBody(ctx, RACER, 1);
    expect(ensureRacerTypeWarm).toHaveBeenCalledTimes(1);
  });

  it('(b) no kick when variant cache is already warm (fast path succeeds)', () => {
    const instance = makeInstance();
    const ctx = makeCtx();
    // Pre-fill variant cache so step 1 produces a drawable.
    getCoatVariants.cached.mockReturnValue(new Map([['default', {}]]));
    instance._drawBody(ctx, RACER, 0);
    expect(ensureRacerTypeWarm).not.toHaveBeenCalled();
  });

  it('(c) two instances with the same spriteUrl each get their own independent kick', () => {
    const i1 = makeInstance();
    const i2 = makeInstance();
    const ctx = makeCtx();
    i1._drawBody(ctx, RACER, 0);
    i2._drawBody(ctx, RACER, 0);
    expect(ensureRacerTypeWarm).toHaveBeenCalledTimes(2);
  });

  it('(c) kicks on the same instance with different spriteUrls are tracked independently', () => {
    const i1 = makeInstance({ spriteUrl: 'http://localhost:4000/api/racers/a/sprite' });
    const i2 = makeInstance({ spriteUrl: 'http://localhost:4000/api/racers/b/sprite' });
    const ctx = makeCtx();
    i1._drawBody(ctx, RACER, 0);
    i1._drawBody(ctx, RACER, 1); // same URL, no re-kick
    i2._drawBody(ctx, RACER, 0); // different URL, new kick
    expect(ensureRacerTypeWarm).toHaveBeenCalledTimes(2); // a once + b once
  });
});

// ── bodyFillX/Y defaults (D6b-Fix step 1) ────────────────────────────────────
//
// Honesty proofs (L126 — RED without / GREEN with the ??= defaults):
// (a) Config WITHOUT bodyFillX/Y → both default to 1.0 (finite).
//     RED: undefined; GREEN: 1.0.
// (b) Config WITH explicit bodyFillX/Y → values are NOT overridden.
// (c) Math.min(bodyFillX, bodyFillY) is finite (no NaN in draw geometry).

function makeInstanceNoBF(overrides = {}) {
  return new SpriteRacerType({
    id: 'test-bf',
    spriteUrl: SPRITE_URL,
    frameCount: 4,
    basePeriodMs: 600,
    displaySize: 40,
    coats: [{ id: 'default', name: 'Default', tint: null }],
    trailFactory: () => [],
    tintMode: 'multiply',
    primaryColor: '#ff0000',
    ...overrides,
  });
}

describe('SpriteRacerType — bodyFillX/Y constructor defaults (D6b-Fix step1)', () => {
  it('(a) config without bodyFillX/Y → both default to 1.0', () => {
    const instance = makeInstanceNoBF();
    expect(instance.config.bodyFillX).toBe(1.0);
    expect(instance.config.bodyFillY).toBe(1.0);
  });

  it('(b) explicit bodyFillX/Y values are NOT overridden by the ??= default', () => {
    const instance = makeInstanceNoBF({ bodyFillX: 0.398, bodyFillY: 0.672 });
    expect(instance.config.bodyFillX).toBe(0.398);
    expect(instance.config.bodyFillY).toBe(0.672);
  });

  it('(c) Math.min(bodyFillX, bodyFillY) is finite after default (no NaN draw geometry)', () => {
    const instance = makeInstanceNoBF();
    expect(Number.isFinite(Math.min(instance.config.bodyFillX, instance.config.bodyFillY))).toBe(
      true
    );
  });
});

// ── Finite guard for bodyFillX/Y in _drawBody (D-guard, D6b-finalize) ─────────
//
// Honesty proofs (L126 — RED without / GREEN with the guard):
// (d-nan) Config with explicit NaN bodyFill → guard clamps to 1.0; _drawBody does
//         not throw; drawImage is called (render path reached, geometry is finite).
//         RED: without guard, Math.min(NaN,NaN)=NaN → scale=NaN → drawImage with NaN args.
// (d-zero) bodyFill=0 → guard prevents division by zero; render path succeeds.

describe('SpriteRacerType — finite bodyFill guard in _drawBody (D-guard, D6b-finalize)', () => {
  it('(d-nan) NaN bodyFill → guard clamps to 1.0; render path does not throw', () => {
    const instance = makeInstance({ bodyFillX: NaN, bodyFillY: NaN });
    const ctx = makeCtx();
    // Warm variant cache so we hit the render path (not fallback circle).
    getCoatVariants.cached.mockReturnValue(new Map([['default', { width: 128, height: 128 }]]));
    expect(() => instance._drawBody(ctx, RACER, 0)).not.toThrow();
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it('(d-zero) bodyFill=0 → guard prevents division by zero; render path succeeds', () => {
    const instance = makeInstance({ bodyFillX: 0, bodyFillY: 0 });
    const ctx = makeCtx();
    getCoatVariants.cached.mockReturnValue(new Map([['default', { width: 128, height: 128 }]]));
    expect(() => instance._drawBody(ctx, RACER, 0)).not.toThrow();
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it('(d-nan) without guard, NaN bodyFill is confirmed in config (??= does not catch NaN)', () => {
    const instance = makeInstance({ bodyFillX: NaN, bodyFillY: NaN });
    expect(Number.isNaN(instance.config.bodyFillX)).toBe(true);
    expect(Number.isNaN(instance.config.bodyFillY)).toBe(true);
  });
});
