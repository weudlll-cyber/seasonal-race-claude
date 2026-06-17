// ============================================================
// File:        brandingSync.test.js
// Path:        client/src/modules/branding/brandingSync.test.js
// Project:     RaceArena
// Description: Tests for syncBrandingMirror. Verifies data-URL logo mirror,
//              per-brand server-URL fallback, two-stage quota fallback,
//              stale-on-error behaviour, and the honesty proof:
//              when logoFetch succeeds the mirror logo IS a Data-URL (L126).
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../services/brandApi.js', () => ({ fetchBrands: vi.fn() }));
vi.mock('../../services/api.js', () => ({ API_BASE_URL: 'http://test' }));
vi.mock('../storage/storage.js', () => ({
  storageSet: vi.fn(),
  KEYS: { BRANDING: 'racearena:branding' },
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

import { syncBrandingMirror } from './brandingSync.js';
import { fetchBrands } from '../../services/brandApi.js';
import { storageSet } from '../storage/storage.js';

const BRAND_WITH_LOGO = {
  id: 'seasonal-entertainment',
  name: 'Seasonal Entertainment',
  eventName: 'Seasonal Race',
  logoFile: 'seasonal-entertainment.jpg',
  isDefault: true,
};

const BRAND_WITHOUT_LOGO = {
  id: 'plain-brand',
  name: 'Plain Brand',
  eventName: 'Plain Event',
  logoFile: null,
  isDefault: false,
};

// Build a mock FileReader class that synchronously resolves readAsDataURL.
function makeMockFileReaderClass(dataUrl) {
  return class MockFileReader {
    constructor() {
      this.result = dataUrl;
      this.onload = null;
      this.onerror = null;
    }
    readAsDataURL() {
      Promise.resolve().then(() => {
        if (this.onload) this.onload();
      });
    }
  };
}

// Stub global fetch + FileReader for a successful logo response.
function stubSuccessfulLogoFetch(dataUrl = 'data:image/jpeg;base64,MOCK') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve({ size: 100 }),
    })
  );
  vi.stubGlobal('FileReader', makeMockFileReaderClass(dataUrl));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: storage writes succeed so syncBrandingMirror returns after first write.
  storageSet.mockReturnValue(true);
  // Default: fetch fails fast — tests that need a successful fetch call stubSuccessfulLogoFetch().
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch not stubbed in this test')));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Honesty proof (L126) — new contract ──────────────────────────────────────

describe('syncBrandingMirror — honesty proof (L126)', () => {
  it('mirror logo IS a Data-URL (data: prefix) when logo fetch succeeds', async () => {
    stubSuccessfulLogoFetch();
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO]);
    await syncBrandingMirror();
    const [, written] = storageSet.mock.calls[0];
    const brand = written.find((b) => b.id === 'seasonal-entertainment');
    expect(brand.logo).toMatch(/^data:/);
  });

  it('mirror logo is "" (not data-URL) when logoFile is null', async () => {
    fetchBrands.mockResolvedValue([BRAND_WITHOUT_LOGO]);
    await syncBrandingMirror();
    const [, written] = storageSet.mock.calls[0];
    const brand = written.find((b) => b.id === 'plain-brand');
    expect(brand.logo).not.toMatch(/^data:/);
    expect(brand.logo).toBe('');
  });
});

// ── Logo fetch fallback ───────────────────────────────────────────────────────

describe('syncBrandingMirror — logo fetch fallback', () => {
  it('falls back to server URL when logo fetch returns !res.ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO]);
    await syncBrandingMirror();
    const [, written] = storageSet.mock.calls[0];
    const brand = written.find((b) => b.id === 'seasonal-entertainment');
    expect(brand.logo).toBe('http://test/api/brands/seasonal-entertainment/logo');
  });

  it('falls back to server URL when logo fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO]);
    await syncBrandingMirror();
    const [, written] = storageSet.mock.calls[0];
    const brand = written.find((b) => b.id === 'seasonal-entertainment');
    expect(brand.logo).toBe('http://test/api/brands/seasonal-entertainment/logo');
  });

  it('sets logo="" when logoFile is null (no fetch attempted)', async () => {
    fetchBrands.mockResolvedValue([BRAND_WITHOUT_LOGO]);
    await syncBrandingMirror();
    const [, written] = storageSet.mock.calls[0];
    expect(written.find((b) => b.id === 'plain-brand').logo).toBe('');
  });

  it('handles a mix: data-URL for brand with logo, "" for brand without', async () => {
    stubSuccessfulLogoFetch();
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO, BRAND_WITHOUT_LOGO]);
    await syncBrandingMirror();
    const [, written] = storageSet.mock.calls[0];
    expect(written.find((b) => b.id === 'seasonal-entertainment').logo).toMatch(/^data:/);
    expect(written.find((b) => b.id === 'plain-brand').logo).toBe('');
  });
});

// ── Two-stage quota fallback ──────────────────────────────────────────────────

describe('syncBrandingMirror — two-stage quota fallback', () => {
  it('writes URL mirror when data-URL mirror exceeds quota (storageSet false→true)', async () => {
    stubSuccessfulLogoFetch();
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO]);
    storageSet.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await syncBrandingMirror();
    expect(storageSet).toHaveBeenCalledTimes(2);
    const [, secondMirror] = storageSet.mock.calls[1];
    expect(secondMirror.find((b) => b.id === 'seasonal-entertainment').logo).toBe(
      'http://test/api/brands/seasonal-entertainment/logo'
    );
  });

  it('does not write anything when both storageSet calls fail', async () => {
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO]);
    storageSet.mockReturnValue(false);
    await syncBrandingMirror(); // must not throw
    expect(storageSet).toHaveBeenCalledTimes(2);
  });
});

// ── Stale-on-error ────────────────────────────────────────────────────────────

describe('syncBrandingMirror — stale-on-error', () => {
  it('does NOT call storageSet when fetchBrands rejects', async () => {
    fetchBrands.mockRejectedValue(new Error('Server not reachable'));
    await syncBrandingMirror(); // must not throw
    expect(storageSet).not.toHaveBeenCalled();
  });

  it('does not throw on server error', async () => {
    fetchBrands.mockRejectedValue(new Error('500'));
    await expect(syncBrandingMirror()).resolves.toBeUndefined();
  });
});

// ── Mirror write ──────────────────────────────────────────────────────────────

describe('syncBrandingMirror — mirror write', () => {
  it('writes to KEYS.BRANDING', async () => {
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO]);
    await syncBrandingMirror();
    expect(storageSet).toHaveBeenCalledWith('racearena:branding', expect.any(Array));
  });

  it('writes an empty array when server returns no brands', async () => {
    fetchBrands.mockResolvedValue([]);
    await syncBrandingMirror();
    expect(storageSet).toHaveBeenCalledWith('racearena:branding', []);
  });

  it('preserves all other brand fields in the mirror', async () => {
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO]);
    await syncBrandingMirror();
    const [, written] = storageSet.mock.calls[0];
    const brand = written[0];
    expect(brand.id).toBe('seasonal-entertainment');
    expect(brand.name).toBe('Seasonal Entertainment');
    expect(brand.eventName).toBe('Seasonal Race');
    expect(brand.isDefault).toBe(true);
  });
});
