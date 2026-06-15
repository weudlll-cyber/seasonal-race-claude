// ============================================================
// File:        brandingSync.test.js
// Path:        client/src/modules/branding/brandingSync.test.js
// Project:     RaceArena
// Description: Tests for syncBrandingMirror (D4). Verifies logoFile→URL mapping,
//              idempotent write to KEYS.BRANDING, stale-on-error behaviour, and
//              the honesty proof: mirror logo is NEVER base64 and NEVER empty when
//              logoFile is set (L126 criterion from spec).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/brandApi.js', () => ({ fetchBrands: vi.fn() }));
vi.mock('../../services/api.js', () => ({ API_BASE_URL: 'http://test' }));
vi.mock('../storage/storage.js', () => ({
  storageSet: vi.fn(),
  KEYS: { BRANDING: 'racearena:branding' },
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Logo URL mapping ──────────────────────────────────────────────────────────

describe('syncBrandingMirror — logo mapping', () => {
  it('maps logoFile → absolute URL in the mirror', async () => {
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO]);
    await syncBrandingMirror();
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:branding',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seasonal-entertainment',
          logo: 'http://test/api/brands/seasonal-entertainment/logo',
        }),
      ])
    );
  });

  it('sets logo="" when logoFile is null', async () => {
    fetchBrands.mockResolvedValue([BRAND_WITHOUT_LOGO]);
    await syncBrandingMirror();
    expect(storageSet).toHaveBeenCalledWith(
      'racearena:branding',
      expect.arrayContaining([expect.objectContaining({ id: 'plain-brand', logo: '' })])
    );
  });

  it('handles a mix of branded and unbranded entries', async () => {
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO, BRAND_WITHOUT_LOGO]);
    await syncBrandingMirror();
    const [written] = storageSet.mock.calls[0].slice(1);
    const withLogo = written.find((b) => b.id === 'seasonal-entertainment');
    const withoutLogo = written.find((b) => b.id === 'plain-brand');
    expect(withLogo.logo).toBe('http://test/api/brands/seasonal-entertainment/logo');
    expect(withoutLogo.logo).toBe('');
  });
});

// ── Honesty proof (L126) ──────────────────────────────────────────────────────

describe('syncBrandingMirror — honesty proof (L126)', () => {
  it('mirror logo is a URL, NEVER base64, when logoFile is set', async () => {
    fetchBrands.mockResolvedValue([BRAND_WITH_LOGO]);
    await syncBrandingMirror();
    const [, written] = storageSet.mock.calls[0];
    const brand = written.find((b) => b.id === 'seasonal-entertainment');
    expect(brand.logo).not.toMatch(/^data:/); // not base64
    expect(brand.logo).not.toBe(''); // not empty
    expect(brand.logo).toMatch(/^http/); // is a URL
  });

  it('mirror logo is "" (not base64) when logoFile is null', async () => {
    fetchBrands.mockResolvedValue([BRAND_WITHOUT_LOGO]);
    await syncBrandingMirror();
    const [, written] = storageSet.mock.calls[0];
    const brand = written.find((b) => b.id === 'plain-brand');
    expect(brand.logo).not.toMatch(/^data:/);
    expect(brand.logo).toBe('');
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
