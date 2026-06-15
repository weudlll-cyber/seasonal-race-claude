// ============================================================
// File:        spriteTinter.test.js
// Path:        client/src/modules/racer-types/spriteTinter.test.js
// Project:     RaceArena
// Description: Tests for spriteTinter — offscreen canvas tinting and
//              coat variant cache. Canvas pixels are not verified (jsdom
//              limitation); tests assert composite op sequence and caching.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectTintMode,
  tintSprite,
  getCoatVariants,
  tintSpriteWithMask,
  tintSpriteBodyAndMask,
  tintSpriteWithDualMask,
  getPatternedVariant,
  ensureRacerTypeWarm,
  PATTERN_IDS,
  _clearTintCache,
  _clearMaskedTintCache,
  _clearPatternedVariantCache,
  _patternedVariantCacheSize,
} from './spriteTinter.js';
import { loadSprite } from './spriteLoader.js';

vi.mock('./spriteLoader.js', () => ({
  loadSprite: vi.fn(),
  getCachedSprite: vi.fn(),
  _clearSpriteCache: vi.fn(),
}));

function makeCtxMock() {
  return {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    createPattern: vi.fn().mockReturnValue({}),
    globalCompositeOperation: 'source-over',
    fillStyle: '',
  };
}

function makePixel(r, g, b, a) {
  const data = new Uint8ClampedArray(4);
  data[0] = r;
  data[1] = g;
  data[2] = b;
  data[3] = a;
  return { data, width: 1, height: 1 };
}

describe('detectTintMode', () => {
  it('returns screen for all-black opaque pixels (luminance = 0)', () => {
    expect(detectTintMode(makePixel(0, 0, 0, 255))).toBe('screen');
  });

  it('returns multiply for all-white opaque pixels (luminance = 255)', () => {
    expect(detectTintMode(makePixel(255, 255, 255, 255))).toBe('multiply');
  });

  it('returns multiply when there are no opaque pixels', () => {
    expect(detectTintMode(makePixel(0, 0, 0, 0))).toBe('multiply');
  });

  it('returns screen when average luminance is 79 (just below threshold)', () => {
    // gray(79,79,79) → L = 0.2126*79 + 0.7152*79 + 0.0722*79 = 79
    expect(detectTintMode(makePixel(79, 79, 79, 255))).toBe('screen');
  });

  it('returns multiply when average luminance is above threshold', () => {
    // gray(100,100,100) → L = 100 >> 80 → multiply
    expect(detectTintMode(makePixel(100, 100, 100, 255))).toBe('multiply');
  });
});

describe('tintSprite', () => {
  let ctxMock;

  beforeEach(() => {
    ctxMock = makeCtxMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a canvas with the same dimensions as the source image', () => {
    const src = { naturalWidth: 512, naturalHeight: 128 };
    const canvas = tintSprite(src, '#8B4513');
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(128);
  });

  it('draws source, applies multiply fillRect, then restores alpha via destination-in', () => {
    const src = { naturalWidth: 64, naturalHeight: 64 };
    const callOrder = [];
    ctxMock.drawImage = vi.fn().mockImplementation(() => callOrder.push('drawImage'));
    ctxMock.fillRect = vi.fn().mockImplementation(() => callOrder.push('fillRect'));
    Object.defineProperty(ctxMock, 'globalCompositeOperation', {
      get() {
        return callOrder[callOrder.length - 1]?.startsWith?.('composite:')
          ? callOrder[callOrder.length - 1].slice(10)
          : 'source-over';
      },
      set(v) {
        callOrder.push(`composite:${v}`);
      },
      configurable: true,
    });

    tintSprite(src, '#8B4513');

    expect(callOrder).toEqual([
      'drawImage',
      'composite:multiply',
      'fillRect',
      'composite:destination-in',
      'drawImage',
      'composite:source-over',
    ]);
    expect(ctxMock.fillRect).toHaveBeenCalledWith(0, 0, 64, 64);
  });

  it('uses screen composite op when mode is screen', () => {
    const src = { naturalWidth: 32, naturalHeight: 32 };
    const callOrder = [];
    ctxMock.drawImage = vi.fn().mockImplementation(() => callOrder.push('drawImage'));
    ctxMock.fillRect = vi.fn().mockImplementation(() => callOrder.push('fillRect'));
    Object.defineProperty(ctxMock, 'globalCompositeOperation', {
      get() {
        return 'source-over';
      },
      set(v) {
        callOrder.push(`composite:${v}`);
      },
      configurable: true,
    });

    tintSprite(src, '#ff0000', 'screen');

    expect(callOrder).toContain('composite:screen');
    expect(callOrder).not.toContain('composite:multiply');
  });
});

describe('getCoatVariants', () => {
  let ctxMock;

  beforeEach(() => {
    _clearTintCache();
    vi.clearAllMocks();
    ctxMock = makeCtxMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _clearTintCache();
  });

  it('returns a Map with one entry per coat', async () => {
    const mockImg = { naturalWidth: 128, naturalHeight: 128 };
    loadSprite.mockResolvedValue(mockImg);
    const coats = [
      { id: 'cream', tint: null },
      { id: 'bay', tint: '#8B4513' },
      { id: 'chestnut', tint: '#A0522D' },
    ];
    const map = await getCoatVariants('/test.png', coats);
    expect(map.size).toBe(3);
    expect(map.has('cream')).toBe(true);
    expect(map.has('bay')).toBe(true);
    expect(map.has('chestnut')).toBe(true);
  });

  it('coat with tint=null returns the original Image, not a canvas', async () => {
    const mockImg = { naturalWidth: 128, naturalHeight: 128 };
    loadSprite.mockResolvedValue(mockImg);
    const coats = [{ id: 'cream', tint: null }];
    const map = await getCoatVariants('/test-null.png', coats);
    expect(map.get('cream')).toBe(mockImg);
  });

  it('same URL called twice returns the same Map instance (cached)', async () => {
    const mockImg = { naturalWidth: 64, naturalHeight: 64 };
    loadSprite.mockResolvedValue(mockImg);
    const coats = [{ id: 'cream', tint: null }];
    const map1 = await getCoatVariants('/test-cache.png', coats);
    const map2 = await getCoatVariants('/test-cache.png', coats);
    expect(map1).toBe(map2);
    expect(loadSprite).toHaveBeenCalledTimes(1);
  });

  it('getCoatVariants.cached returns undefined before load, Map instance after', async () => {
    const mockImg = { naturalWidth: 32, naturalHeight: 32 };
    loadSprite.mockResolvedValue(mockImg);
    const coats = [{ id: 'cream', tint: null }];
    expect(getCoatVariants.cached('/test-sync.png')).toBeUndefined();
    await getCoatVariants('/test-sync.png', coats);
    expect(getCoatVariants.cached('/test-sync.png')).toBeDefined();
  });

  it('coat with tint string produces a canvas (HTMLCanvasElement), not the source image', async () => {
    const mockImg = { naturalWidth: 128, naturalHeight: 128 };
    loadSprite.mockResolvedValue(mockImg);
    const coats = [{ id: 'bay', tint: '#8B4513' }];
    const map = await getCoatVariants('/test-tinted.png', coats);
    const result = map.get('bay');
    expect(result).not.toBe(mockImg);
    expect(result instanceof HTMLCanvasElement).toBe(true);
  });
});

describe('tintSpriteWithMask', () => {
  let ctxMock;

  beforeEach(() => {
    _clearMaskedTintCache();
    ctxMock = makeCtxMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _clearMaskedTintCache();
  });

  it('returns a canvas with the same dimensions as the source image', () => {
    const src = { naturalWidth: 512, naturalHeight: 128, src: '/mask-test-src.png' };
    const mask = { naturalWidth: 512, naturalHeight: 128, src: '/mask-test-mask.png' };
    const canvas = tintSpriteWithMask(src, mask, '#ff0000');
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(128);
  });

  it('returns the same canvas object for the same (source, mask, color) triple', () => {
    const src = { naturalWidth: 64, naturalHeight: 64, src: '/mwm-src-a.png' };
    const mask = { naturalWidth: 64, naturalHeight: 64, src: '/mwm-mask-a.png' };
    const c1 = tintSpriteWithMask(src, mask, '#ff0000');
    const c2 = tintSpriteWithMask(src, mask, '#ff0000');
    expect(c1).toBe(c2);
  });

  it('returns a different canvas for a different tint color with the same mask', () => {
    const src = { naturalWidth: 64, naturalHeight: 64, src: '/mwm-src-b.png' };
    const mask = { naturalWidth: 64, naturalHeight: 64, src: '/mwm-mask-b.png' };
    const c1 = tintSpriteWithMask(src, mask, '#ff0000');
    const c2 = tintSpriteWithMask(src, mask, '#00ff00');
    expect(c1).not.toBe(c2);
  });

  it('returns a different canvas for a different mask with the same color', () => {
    const src = { naturalWidth: 64, naturalHeight: 64, src: '/mwm-src-c.png' };
    const maskA = { naturalWidth: 64, naturalHeight: 64, src: '/mwm-mask-c1.png' };
    const maskB = { naturalWidth: 64, naturalHeight: 64, src: '/mwm-mask-c2.png' };
    const c1 = tintSpriteWithMask(src, maskA, '#ff0000');
    const c2 = tintSpriteWithMask(src, maskB, '#ff0000');
    expect(c1).not.toBe(c2);
  });

  it('does not pollute the getCoatVariants cache (_variantCache)', async () => {
    _clearTintCache();
    const mockImg = { naturalWidth: 32, naturalHeight: 32, src: '/mwm-src-d.png' };
    loadSprite.mockResolvedValue(mockImg);
    const mask = { naturalWidth: 32, naturalHeight: 32, src: '/mwm-mask-d.png' };
    tintSpriteWithMask(mockImg, mask, '#ff0000');
    expect(getCoatVariants.cached('/mwm-src-d.png')).toBeUndefined();
  });
});

describe('PATTERN_IDS', () => {
  it('exports exactly 3 pattern ids', () => {
    expect(PATTERN_IDS).toHaveLength(3);
  });

  it('contains solid, stripes, and dots', () => {
    expect(PATTERN_IDS).toContain('solid');
    expect(PATTERN_IDS).toContain('stripes');
    expect(PATTERN_IDS).toContain('dots');
  });
});

describe('tintSprite — with patterns', () => {
  let ctxMock;

  beforeEach(() => {
    ctxMock = makeCtxMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('solid patternId does not call createPattern', () => {
    const src = { naturalWidth: 64, naturalHeight: 64 };
    tintSprite(src, '#ff0000', 'multiply', 'solid');
    expect(ctxMock.createPattern).not.toHaveBeenCalled();
  });

  it('stripes patternId calls createPattern and uses source-atop composite', () => {
    const src = { naturalWidth: 64, naturalHeight: 64 };
    const compositeOps = [];
    Object.defineProperty(ctxMock, 'globalCompositeOperation', {
      get() {
        return 'source-over';
      },
      set(v) {
        compositeOps.push(v);
      },
      configurable: true,
    });
    tintSprite(src, '#ff0000', 'multiply', 'stripes');
    expect(ctxMock.createPattern).toHaveBeenCalled();
    expect(compositeOps).toContain('source-atop');
    expect(compositeOps[compositeOps.length - 1]).toBe('source-over');
  });

  it('dots patternId calls createPattern and uses source-atop composite', () => {
    const src = { naturalWidth: 64, naturalHeight: 64 };
    const compositeOps = [];
    Object.defineProperty(ctxMock, 'globalCompositeOperation', {
      get() {
        return 'source-over';
      },
      set(v) {
        compositeOps.push(v);
      },
      configurable: true,
    });
    tintSprite(src, '#ff0000', 'multiply', 'dots');
    expect(ctxMock.createPattern).toHaveBeenCalled();
    expect(compositeOps).toContain('source-atop');
  });

  it('returns a canvas with correct dimensions regardless of patternId', () => {
    const src = { naturalWidth: 200, naturalHeight: 100 };
    const stripeCanvas = tintSprite(src, '#ff0000', 'multiply', 'stripes');
    const dotsCanvas = tintSprite(src, '#ff0000', 'multiply', 'dots');
    expect(stripeCanvas.width).toBe(200);
    expect(stripeCanvas.height).toBe(100);
    expect(dotsCanvas.width).toBe(200);
    expect(dotsCanvas.height).toBe(100);
  });
});

describe('getPatternedVariant — lazy baking', () => {
  let ctxMock;

  beforeEach(() => {
    _clearTintCache();
    _clearPatternedVariantCache();
    vi.clearAllMocks();
    ctxMock = makeCtxMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _clearTintCache();
    _clearPatternedVariantCache();
  });

  it('returns null when solid variants not yet loaded', () => {
    const result = getPatternedVariant('/not-loaded.png', 'multiply', 'bay', 'stripes');
    expect(result).toBeNull();
  });

  it('solid path returns the solid canvas, not from _patternedVariantCache', async () => {
    const mockImg = { naturalWidth: 64, naturalHeight: 64 };
    loadSprite.mockResolvedValue(mockImg);
    const coats = [{ id: 'bay', tint: '#8B4513' }];
    const map = await getCoatVariants('/pv-solid.png', coats);
    const solidCanvas = map.get('bay');
    const result = getPatternedVariant('/pv-solid.png', 'multiply', 'bay', 'solid');
    expect(result).toBe(solidCanvas);
    expect(_patternedVariantCacheSize()).toBe(0);
  });

  it('lazy bake: stripes variant is created and cached on first call', async () => {
    const mockImg = { naturalWidth: 64, naturalHeight: 64 };
    loadSprite.mockResolvedValue(mockImg);
    const coats = [{ id: 'bay', tint: '#8B4513' }];
    await getCoatVariants('/pv-stripes.png', coats);
    expect(_patternedVariantCacheSize()).toBe(0);
    const result = getPatternedVariant('/pv-stripes.png', 'multiply', 'bay', 'stripes');
    expect(result).not.toBeNull();
    expect(result instanceof HTMLCanvasElement).toBe(true);
    expect(_patternedVariantCacheSize()).toBe(1);
  });

  it('second call returns the same cached canvas instance', async () => {
    const mockImg = { naturalWidth: 64, naturalHeight: 64 };
    loadSprite.mockResolvedValue(mockImg);
    const coats = [{ id: 'bay', tint: '#8B4513' }];
    await getCoatVariants('/pv-cache.png', coats);
    const r1 = getPatternedVariant('/pv-cache.png', 'multiply', 'bay', 'stripes');
    const r2 = getPatternedVariant('/pv-cache.png', 'multiply', 'bay', 'stripes');
    expect(r1).toBe(r2);
    expect(_patternedVariantCacheSize()).toBe(1);
  });

  it('only requested (coatId, patternId) pairs are baked', async () => {
    const mockImg = { naturalWidth: 64, naturalHeight: 64 };
    loadSprite.mockResolvedValue(mockImg);
    const coats = [
      { id: 'bay', tint: '#8B4513' },
      { id: 'gray', tint: '#888888' },
    ];
    await getCoatVariants('/pv-selective.png', coats);
    getPatternedVariant('/pv-selective.png', 'multiply', 'bay', 'stripes');
    expect(_patternedVariantCacheSize()).toBe(1);
    getPatternedVariant('/pv-selective.png', 'multiply', 'bay', 'dots');
    expect(_patternedVariantCacheSize()).toBe(2);
    getPatternedVariant('/pv-selective.png', 'multiply', 'gray', 'stripes');
    expect(_patternedVariantCacheSize()).toBe(3);
  });

  it('returns null when the coat ID is not in the loaded solid variants', async () => {
    const mockImg = { naturalWidth: 64, naturalHeight: 64 };
    loadSprite.mockResolvedValue(mockImg);
    const coats = [{ id: 'bay', tint: '#8B4513' }];
    await getCoatVariants('/pv-unknown-coat.png', coats);
    const result = getPatternedVariant(
      '/pv-unknown-coat.png',
      'multiply',
      'nonexistent',
      'stripes'
    );
    expect(result).toBeNull();
  });
});

// ── tintSpriteBodyAndMask — cache key correctness ─────────────────────────────

describe('tintSpriteBodyAndMask — cache key correctness', () => {
  let ctxMock;

  beforeEach(() => {
    _clearMaskedTintCache();
    ctxMock = makeCtxMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _clearMaskedTintCache();
  });

  it('same inputs return the identical canvas instance (cache hit)', () => {
    const src = { naturalWidth: 64, naturalHeight: 64, src: '/bm-src.png' };
    const mask = { naturalWidth: 64, naturalHeight: 64, src: '/bm-mask.png' };
    const c1 = tintSpriteBodyAndMask(src, '#800000', mask, '#ffcccc');
    const c2 = tintSpriteBodyAndMask(src, '#800000', mask, '#ffcccc');
    expect(c1).toBe(c2);
  });

  it('swapped bodyTint and patchTint produce different canvases', () => {
    const src = { naturalWidth: 64, naturalHeight: 64, src: '/bm-src-swap.png' };
    const mask = { naturalWidth: 64, naturalHeight: 64, src: '/bm-mask-swap.png' };
    const c1 = tintSpriteBodyAndMask(src, '#800000', mask, '#ffcccc');
    const c2 = tintSpriteBodyAndMask(src, '#ffcccc', mask, '#800000');
    expect(c1).not.toBe(c2);
  });

  it('does not alias with tintSpriteWithMask for overlapping source and color (bm: prefix isolates)', () => {
    const src = { naturalWidth: 64, naturalHeight: 64, src: '/bm-shared-src.png' };
    const mask = { naturalWidth: 64, naturalHeight: 64, src: '/bm-shared-mask.png' };
    const wmResult = tintSpriteWithMask(src, mask, '#ff0000');
    const bmResult = tintSpriteBodyAndMask(src, '#ff0000', mask, '#0000ff');
    expect(wmResult).not.toBe(bmResult);
  });
});

// ── tintSpriteWithDualMask — cache key correctness ────────────────────────────

describe('tintSpriteWithDualMask — cache key correctness', () => {
  let ctxMock;

  beforeEach(() => {
    _clearMaskedTintCache();
    ctxMock = makeCtxMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _clearMaskedTintCache();
  });

  it('same quintuple returns the identical canvas instance (cache hit)', () => {
    const src = { naturalWidth: 64, naturalHeight: 64, src: '/dm-src.png' };
    const mask1 = { naturalWidth: 64, naturalHeight: 64, src: '/dm-mask1.png' };
    const mask2 = { naturalWidth: 64, naturalHeight: 64, src: '/dm-mask2.png' };
    const c1 = tintSpriteWithDualMask(src, mask1, '#111111', mask2, '#222222');
    const c2 = tintSpriteWithDualMask(src, mask1, '#111111', mask2, '#222222');
    expect(c1).toBe(c2);
  });

  it('swapped mask order produces different canvases', () => {
    const src = { naturalWidth: 64, naturalHeight: 64, src: '/dm-src-swap.png' };
    const mask1 = { naturalWidth: 64, naturalHeight: 64, src: '/dm-mask1-swap.png' };
    const mask2 = { naturalWidth: 64, naturalHeight: 64, src: '/dm-mask2-swap.png' };
    const c1 = tintSpriteWithDualMask(src, mask1, '#111111', mask2, '#222222');
    const c2 = tintSpriteWithDualMask(src, mask2, '#111111', mask1, '#222222');
    expect(c1).not.toBe(c2);
  });

  it('does not alias with tintSpriteBodyAndMask for the same source and tints (dm: vs bm: prefix)', () => {
    const src = { naturalWidth: 64, naturalHeight: 64, src: '/dm-bm-src.png' };
    const mask1 = { naturalWidth: 64, naturalHeight: 64, src: '/dm-bm-mask1.png' };
    const mask2 = { naturalWidth: 64, naturalHeight: 64, src: '/dm-bm-mask2.png' };
    const dmResult = tintSpriteWithDualMask(src, mask1, '#111111', mask2, '#222222');
    const bmResult = tintSpriteBodyAndMask(src, '#111111', mask1, '#222222');
    expect(dmResult).not.toBe(bmResult);
  });
});

// ── getCoatVariants — auto tint mode routing ──────────────────────────────────

describe('getCoatVariants — auto tint mode routing', () => {
  let ctxMock;

  beforeEach(() => {
    _clearTintCache();
    vi.clearAllMocks();
    ctxMock = makeCtxMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _clearTintCache();
  });

  it('uses screen composite when pixel data is dark (detectTintMode result is threaded through)', async () => {
    const darkData = { data: new Uint8ClampedArray([10, 10, 10, 255]), width: 1, height: 1 };
    ctxMock.getImageData = vi.fn().mockReturnValue(darkData);
    const compositeOps = [];
    Object.defineProperty(ctxMock, 'globalCompositeOperation', {
      get() {
        return 'source-over';
      },
      set(v) {
        compositeOps.push(v);
      },
      configurable: true,
    });
    loadSprite.mockResolvedValue({ naturalWidth: 1, naturalHeight: 1 });
    await getCoatVariants('/auto-dark.png', [{ id: 'coat1', tint: '#8B4513' }], 'auto');
    expect(compositeOps).toContain('screen');
    expect(compositeOps).not.toContain('multiply');
  });

  it('uses multiply composite when pixel data is bright', async () => {
    const brightData = { data: new Uint8ClampedArray([200, 200, 200, 255]), width: 1, height: 1 };
    ctxMock.getImageData = vi.fn().mockReturnValue(brightData);
    const compositeOps = [];
    Object.defineProperty(ctxMock, 'globalCompositeOperation', {
      get() {
        return 'source-over';
      },
      set(v) {
        compositeOps.push(v);
      },
      configurable: true,
    });
    loadSprite.mockResolvedValue({ naturalWidth: 1, naturalHeight: 1 });
    await getCoatVariants('/auto-bright.png', [{ id: 'coat1', tint: '#8B4513' }], 'auto');
    expect(compositeOps).toContain('multiply');
    expect(compositeOps).not.toContain('screen');
  });
});

// ── ensureRacerTypeWarm (A-dedup honesty proof) ───────────────────────────────
//
// Tests prove the shared function handles both mask and non-mask paths correctly.
// (a) Non-mask: kicks getCoatVariants (via loadSprite internally).
// (b) Mask with maskUrl: kicks loadSprite for spriteUrl AND maskUrl.
// (c) Mask with coat-level patternMask/borderMask: kicks loadSprite for each.
// (d) Mask + lazy-kick proves masks are NOW loaded (was omitted before dedup).
//     RED: before dedup, inline lazy-kick only loaded the base sprite.
//     GREEN: ensureRacerTypeWarm loads base + maskUrl + coat masks.

describe('ensureRacerTypeWarm — shared warm-up function (A-dedup, D6b-finalize)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSprite.mockResolvedValue({});
    _clearTintCache();
  });

  it('(a) non-mask: loadSprite called for spriteUrl (via getCoatVariants internally)', () => {
    ensureRacerTypeWarm({
      id: 'test',
      spriteUrl: '/sprite.png',
      coats: [{ id: 'default', tint: null }],
      tintMode: 'multiply',
    });
    expect(loadSprite).toHaveBeenCalledWith('/sprite.png');
  });

  it('(b) mask with maskUrl: loadSprite called for spriteUrl and maskUrl', () => {
    ensureRacerTypeWarm({
      id: 'test',
      spriteUrl: '/sprite.png',
      maskUrl: '/mask.png',
      coats: [],
      tintMode: 'mask',
    });
    expect(loadSprite).toHaveBeenCalledWith('/sprite.png');
    expect(loadSprite).toHaveBeenCalledWith('/mask.png');
  });

  it('(c) mask with coat patternMask/borderMask: all coat masks loaded', () => {
    ensureRacerTypeWarm({
      id: 'test',
      spriteUrl: '/sprite.png',
      coats: [
        { id: 'a', patternMask: '/pattern-a.png' },
        { id: 'b', borderMask: '/border-b.png' },
        { id: 'c', patternMask: '/pattern-c.png', borderMask: '/border-c.png' },
      ],
      tintMode: 'mask',
    });
    expect(loadSprite).toHaveBeenCalledWith('/sprite.png');
    expect(loadSprite).toHaveBeenCalledWith('/pattern-a.png');
    expect(loadSprite).toHaveBeenCalledWith('/border-b.png');
    expect(loadSprite).toHaveBeenCalledWith('/pattern-c.png');
    expect(loadSprite).toHaveBeenCalledWith('/border-c.png');
  });

  it('(d) mask without maskUrl or coat masks: only loadSprite for spriteUrl', () => {
    ensureRacerTypeWarm({
      id: 'test',
      spriteUrl: '/sprite.png',
      coats: [{ id: 'default' }],
      tintMode: 'mask',
    });
    expect(loadSprite).toHaveBeenCalledTimes(1);
    expect(loadSprite).toHaveBeenCalledWith('/sprite.png');
  });

  it('null/undefined cfg → no-op (no throw)', () => {
    expect(() => ensureRacerTypeWarm(null)).not.toThrow();
    expect(() => ensureRacerTypeWarm(undefined)).not.toThrow();
    expect(loadSprite).not.toHaveBeenCalled();
  });
});
