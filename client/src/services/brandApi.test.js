// ============================================================
// File:        brandApi.test.js
// Path:        client/src/services/brandApi.test.js
// Project:     RaceArena
// Description: Unit tests for brandApi (D4). Verifies correct URL, method,
//              body, JSON parsing, encodeURIComponent on :id, FormData for logo
//              upload, and error propagation.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient.js', () => ({ apiCall: vi.fn() }));
vi.mock('./api.js', () => ({ API_BASE_URL: 'http://test' }));

import {
  fetchBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  uploadBrandLogo,
  deleteBrandLogo,
  setBrandDefault,
  clearBrandDefault,
  exportBrandSeed,
} from './brandApi.js';
import { apiCall } from './apiClient.js';

const MOCK_BRAND = {
  id: 'abc-123',
  name: 'Christmas Party',
  eventName: 'Winter Race Championship',
  subtitle: '',
  primaryColor: '#e63946',
  secondaryColor: '#f4a261',
  sponsorText: '',
  logoFile: null,
  isDefault: false,
  logoMaxHeight: 90,
  logoOpacity: 0.9,
  logoCorner: 'bottom-right',
  createdAt: '2026-06-15T00:00:00.000Z',
  updatedAt: '2026-06-15T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── fetchBrands ───────────────────────────────────────────────────────────────

describe('fetchBrands', () => {
  it('calls GET /api/brands and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => [MOCK_BRAND] });
    const result = await fetchBrands();
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands');
    expect(result).toEqual([MOCK_BRAND]);
  });

  it('propagates errors from apiCall', async () => {
    const err = Object.assign(new Error('not authenticated'), { status: 401 });
    apiCall.mockRejectedValue(err);
    await expect(fetchBrands()).rejects.toMatchObject({ status: 401 });
  });
});

// ── createBrand ───────────────────────────────────────────────────────────────

describe('createBrand', () => {
  it('calls POST /api/brands with JSON body and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_BRAND });
    const data = { name: 'Christmas Party', eventName: 'Winter Race Championship' };
    const result = await createBrand(data);
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    expect(result).toEqual(MOCK_BRAND);
  });

  it('propagates 400 error (validation)', async () => {
    const err = Object.assign(new Error('name is required'), { status: 400 });
    apiCall.mockRejectedValue(err);
    await expect(createBrand({ name: '', eventName: '' })).rejects.toMatchObject({ status: 400 });
  });

  it('propagates 409 error (id already exists)', async () => {
    const err = Object.assign(new Error("Brand 'abc-123' already exists"), { status: 409 });
    apiCall.mockRejectedValue(err);
    await expect(createBrand({ id: 'abc-123', name: 'X', eventName: 'Y' })).rejects.toMatchObject({
      status: 409,
    });
  });
});

// ── updateBrand ───────────────────────────────────────────────────────────────

describe('updateBrand', () => {
  it('calls PUT /api/brands/:id with JSON body and returns parsed JSON', async () => {
    const updated = { ...MOCK_BRAND, name: 'Updated Party' };
    apiCall.mockResolvedValue({ json: async () => updated });
    const result = await updateBrand('abc-123', { name: 'Updated Party', eventName: 'Race' });
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands/abc-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Party', eventName: 'Race' }),
    });
    expect(result.name).toBe('Updated Party');
  });

  it('percent-encodes the id in the URL', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_BRAND });
    await updateBrand('id with spaces', { name: 'X', eventName: 'Y' });
    expect(apiCall).toHaveBeenCalledWith(
      'http://test/api/brands/id%20with%20spaces',
      expect.any(Object)
    );
  });

  it('propagates 404 error (brand not found)', async () => {
    const err = Object.assign(new Error('Brand not found'), { status: 404 });
    apiCall.mockRejectedValue(err);
    await expect(updateBrand('no-such', { name: 'X', eventName: 'Y' })).rejects.toMatchObject({
      status: 404,
    });
  });
});

// ── deleteBrand ───────────────────────────────────────────────────────────────

describe('deleteBrand', () => {
  it('calls DELETE /api/brands/:id and returns void', async () => {
    apiCall.mockResolvedValue(undefined);
    await deleteBrand('abc-123');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands/abc-123', { method: 'DELETE' });
  });

  it('percent-encodes the id in the URL', async () => {
    apiCall.mockResolvedValue(undefined);
    await deleteBrand('id/with/slashes');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands/id%2Fwith%2Fslashes', {
      method: 'DELETE',
    });
  });

  it('propagates 403 error (cannot delete default brand)', async () => {
    const err = Object.assign(new Error('Cannot delete a default brand'), { status: 403 });
    apiCall.mockRejectedValue(err);
    await expect(deleteBrand('seasonal-entertainment')).rejects.toMatchObject({ status: 403 });
  });

  it('propagates 404 error (brand not found)', async () => {
    const err = Object.assign(new Error('Brand not found'), { status: 404 });
    apiCall.mockRejectedValue(err);
    await expect(deleteBrand('ghost')).rejects.toMatchObject({ status: 404 });
  });
});

// ── uploadBrandLogo ───────────────────────────────────────────────────────────

describe('uploadBrandLogo', () => {
  it('calls POST /api/brands/:id/logo with FormData and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => ({ logoFile: 'abc-123.png' }) });
    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    const result = await uploadBrandLogo('abc-123', file);
    expect(apiCall).toHaveBeenCalledWith(
      'http://test/api/brands/abc-123/logo',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
    );
    expect(result).toEqual({ logoFile: 'abc-123.png' });
  });

  it('percent-encodes the id in the URL', async () => {
    apiCall.mockResolvedValue({ json: async () => ({ logoFile: 'x.png' }) });
    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    await uploadBrandLogo('id with space', file);
    expect(apiCall).toHaveBeenCalledWith(
      'http://test/api/brands/id%20with%20space/logo',
      expect.any(Object)
    );
  });
});

// ── deleteBrandLogo ───────────────────────────────────────────────────────────

describe('deleteBrandLogo', () => {
  it('calls DELETE /api/brands/:id/logo and returns void', async () => {
    apiCall.mockResolvedValue(undefined);
    await deleteBrandLogo('abc-123');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands/abc-123/logo', {
      method: 'DELETE',
    });
  });

  it('percent-encodes the id in the URL', async () => {
    apiCall.mockResolvedValue(undefined);
    await deleteBrandLogo('id/slash');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands/id%2Fslash/logo', {
      method: 'DELETE',
    });
  });
});

// ── Admin routes (D4b stubs — URL/method shape only) ─────────────────────────

describe('setBrandDefault', () => {
  it('calls POST /api/brands/:id/set-default', async () => {
    apiCall.mockResolvedValue({ json: async () => ({ ...MOCK_BRAND, isDefault: true }) });
    const result = await setBrandDefault('abc-123');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands/abc-123/set-default', {
      method: 'POST',
    });
    expect(result.isDefault).toBe(true);
  });

  it('percent-encodes id', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_BRAND });
    await setBrandDefault('id with space');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands/id%20with%20space/set-default', {
      method: 'POST',
    });
  });
});

describe('clearBrandDefault', () => {
  it('calls POST /api/brands/:id/clear-default', async () => {
    apiCall.mockResolvedValue({ json: async () => ({ ...MOCK_BRAND, isDefault: false }) });
    const result = await clearBrandDefault('abc-123');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands/abc-123/clear-default', {
      method: 'POST',
    });
    expect(result.isDefault).toBe(false);
  });
});

describe('exportBrandSeed', () => {
  it('calls GET /api/brands/:id/export-seed', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_BRAND });
    const result = await exportBrandSeed('abc-123');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/brands/abc-123/export-seed');
    expect(result).toEqual(MOCK_BRAND);
  });
});
