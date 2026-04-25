// ============================================================
// File:        spriteTinter.test.js
// Path:        client/src/modules/racer-types/spriteTinter.test.js
// Project:     RaceArena
// Description: Tests for spriteTinter — offscreen canvas tinting and
//              coat variant cache. Canvas pixels are not verified (jsdom
//              limitation); tests assert composite op sequence and caching.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tintSprite, getCoatVariants, _clearTintCache } from './spriteTinter.js';
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
    globalCompositeOperation: 'source-over',
    fillStyle: '',
  };
}

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
