import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadSprite, getCachedSprite, _clearSpriteCache } from './spriteLoader.js';

// Image stub: fires onload async for any src value (including blob: URLs).
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
      Promise.resolve().then(() => this._onload && this._onload());
    }
  };
}

const HTTP_SPRITE_URL = 'http://localhost:4000/api/racers/test-cat/sprite';

// ── Same-origin / data: URL path ──────────────────────────────────────────────

describe('spriteLoader — same-origin / data: path', () => {
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

  // Honesty proof (b): data:/same-origin URLs skip fetch entirely.
  // RED: if fetch were called for data: URLs.
  it('(b) data: URL → fetch NOT called, direct img.src path used', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const DATA_URL =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await loadSprite(DATA_URL);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ── Cross-origin fetch→blob path ──────────────────────────────────────────────
//
// Honesty proofs (D6b-Fix-2a, L126 — RED without / GREEN with):
// (a) http URL → fetch({ credentials: 'include' }); blob: URL used for Image.
// (b) data: URL → no fetch (tested above in same-origin suite).
// (c) fetch !res.ok → console.error with URL + status; Promise rejects.
// (d) _clearSpriteCache → URL.revokeObjectURL called for each Object-URL created.

describe('spriteLoader — cross-origin fetch→blob path (D6b-Fix-2a honesty proofs)', () => {
  let fetchMock;
  let createObjectURLMock;
  let revokeObjectURLMock;
  let origCreateObjectURL;
  let origRevokeObjectURL;

  beforeEach(() => {
    _clearSpriteCache();
    vi.stubGlobal('Image', makeImageStub());

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // Save originals (jsdom may or may not define these)
    origCreateObjectURL = URL.createObjectURL;
    origRevokeObjectURL = URL.revokeObjectURL;
    createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLMock = vi.fn();
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;
  });

  afterEach(() => {
    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    vi.unstubAllGlobals();
    _clearSpriteCache();
  });

  function mockFetchOk() {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['x'], { type: 'image/png' })),
    });
  }

  // (a) credentials:include + blob: URL pipeline
  it('(a) http URL → fetch called with { credentials: "include" }', async () => {
    mockFetchOk();
    await loadSprite(HTTP_SPRITE_URL);
    expect(fetchMock).toHaveBeenCalledWith(HTTP_SPRITE_URL, { credentials: 'include' });
  });

  it('(a) http URL → URL.createObjectURL called (image loaded from blob: URL, not original URL)', async () => {
    mockFetchOk();
    await loadSprite(HTTP_SPRITE_URL);
    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it('https URL → also uses fetch path with credentials', async () => {
    mockFetchOk();
    await loadSprite('https://cdn.example.com/sprite.png');
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/sprite.png', {
      credentials: 'include',
    });
  });

  it('relative URL → fetch NOT called (same-origin path)', async () => {
    await loadSprite('/assets/sprite.png');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // (c) !res.ok → loud error + rejection
  it('(c) fetch !res.ok → console.error contains URL + status; Promise rejects', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(loadSprite(HTTP_SPRITE_URL)).rejects.toThrow();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(HTTP_SPRITE_URL));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('404'));
    spy.mockRestore();
  });

  // (d) _clearSpriteCache revokes Object-URLs
  it('(d) _clearSpriteCache revokes Object-URLs created for http sprites', async () => {
    mockFetchOk();
    await loadSprite(HTTP_SPRITE_URL);
    _clearSpriteCache();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });

  it('(d) _clearSpriteCache for same-origin-only loads does NOT call revokeObjectURL', async () => {
    await loadSprite('/relative.png');
    _clearSpriteCache();
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
  });

  it('http URL loaded twice returns same cached Image without a second fetch', async () => {
    mockFetchOk();
    const img1 = await loadSprite(HTTP_SPRITE_URL);
    const img2 = await loadSprite(HTTP_SPRITE_URL);
    expect(img1).toBe(img2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
