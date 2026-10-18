// @vitest-environment node
// SUITE-ENV-SPLIT: no DOM and no browser global, here or in anything this file imports — see the
// note in vitest.config.js. Verified by running it in BOTH environments: same tests, same count.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getBackgroundImage,
  forgetFailedBackgroundImages,
  RETRY_FAILED_MS,
  _clearBackgroundImageCache,
} from './bgImageCache.js';

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

// OFFLINE-1 F1 (2026-10-18): a failed load is not kept for the life of the page.
describe('bgImageCache — a failed load is tried again', () => {
  let made;
  let OrigImage;

  beforeEach(() => {
    _clearBackgroundImageCache();
    vi.useFakeTimers();
    vi.setSystemTime(0);
    made = [];
    OrigImage = globalThis.Image;
    globalThis.Image = function MockImage() {
      const img = { onload: null, onerror: null, src: '' };
      made.push(img);
      return img;
    };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.Image = OrigImage;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('waits RETRY_FAILED_MS after a failure, then loads the path again — one request, not one per frame', () => {
    getBackgroundImage('/bg');
    made[0].onerror();
    vi.setSystemTime(RETRY_FAILED_MS - 1);
    for (let frame = 0; frame < 60; frame++) getBackgroundImage('/bg');
    expect(made).toHaveLength(1);

    vi.setSystemTime(RETRY_FAILED_MS);
    expect(getBackgroundImage('/bg')).toBeNull();
    expect(made).toHaveLength(2);
    made[1].onload();
    expect(getBackgroundImage('/bg')).toBe(made[1]);
  });

  it('forgetting the failures (the server answered) loads a failed path on the next request', () => {
    getBackgroundImage('/bg');
    made[0].onerror();
    forgetFailedBackgroundImages();
    getBackgroundImage('/bg');
    expect(made).toHaveLength(2);
  });

  it('keeps a loaded image when the failures are forgotten', () => {
    getBackgroundImage('/ok');
    made[0].onload();
    forgetFailedBackgroundImages();
    expect(getBackgroundImage('/ok')).toBe(made[0]);
    expect(made).toHaveLength(1);
  });

  it('warns once per path however often it is retried', () => {
    getBackgroundImage('/bg');
    made[0].onerror();
    forgetFailedBackgroundImages();
    getBackgroundImage('/bg');
    made[1].onerror();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
