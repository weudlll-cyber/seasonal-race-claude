import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBackgroundImage, _clearBackgroundImageCache } from './bgImageCache.js';

describe('bgImageCache — getBackgroundImage', () => {
  let mockImg;
  let OrigImage;

  beforeEach(() => {
    _clearBackgroundImageCache();
    mockImg = { onload: null, onerror: null, src: '' };
    OrigImage = globalThis.Image;
    globalThis.Image = function MockImage() {
      return mockImg;
    };
  });

  afterEach(() => {
    globalThis.Image = OrigImage;
  });

  it('returns null on first call while image is loading', () => {
    expect(getBackgroundImage('/track.jpg')).toBeNull();
  });

  it('returns the image element after onload fires', () => {
    getBackgroundImage('/track.jpg');
    mockImg.onload();
    expect(getBackgroundImage('/track.jpg')).toBe(mockImg);
  });

  it('returns null when path is falsy', () => {
    expect(getBackgroundImage('')).toBeNull();
    expect(getBackgroundImage(null)).toBeNull();
  });

  it('emits console.warn on onerror with path and docker compose hint', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getBackgroundImage('/missing.jpg');
    mockImg.onerror();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('/missing.jpg');
    expect(warnSpy.mock.calls[0][0]).toContain('docker compose up');
    warnSpy.mockRestore();
  });

  it('console.warn fires only once per URL even if onerror is triggered again', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getBackgroundImage('/missing.jpg');
    mockImg.onerror();
    mockImg.onerror(); // second trigger — must not warn again
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('returns null after image failure (record.failed path)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getBackgroundImage('/missing.jpg');
    mockImg.onerror();
    warnSpy.mockRestore();
    expect(getBackgroundImage('/missing.jpg')).toBeNull();
  });
});
