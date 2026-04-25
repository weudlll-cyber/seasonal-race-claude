import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadSprite, getCachedSprite, _clearSpriteCache } from './spriteLoader.js';

function makeImageStub() {
  return class {
    constructor() {
      this._onload = null;
    }
    set onload(fn) {
      this._onload = fn;
    }
    set onerror(_fn) {}
    set src(_val) {
      // Fire onload asynchronously, matching real Image behaviour
      Promise.resolve().then(() => this._onload && this._onload());
    }
  };
}

describe('spriteLoader', () => {
  beforeEach(() => {
    _clearSpriteCache();
    vi.stubGlobal('Image', makeImageStub());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    _clearSpriteCache();
  });

  it('loadSprite returns a Promise that resolves to an Image', async () => {
    const img = await loadSprite('/test.png');
    expect(img).toBeDefined();
  });

  it('same URL called twice returns the same cached Image instance', async () => {
    const img1 = await loadSprite('/test.png');
    const img2 = await loadSprite('/test.png');
    expect(img1).toBe(img2);
  });

  it('getCachedSprite returns undefined before load, the Image instance after', async () => {
    expect(getCachedSprite('/test.png')).toBeUndefined();
    await loadSprite('/test.png');
    expect(getCachedSprite('/test.png')).toBeDefined();
  });
});
