// ============================================================
// File:        surfaceClassApi.test.js
// Path:        client/src/services/surfaceClassApi.test.js
// Project:     RaceArena
// Created:     2026-06-19
// Description: Unit tests for the surface-class server API client
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchSurfaceClasses,
  createSurfaceClass,
  updateSurfaceClass,
  deleteSurfaceClass,
} from './surfaceClassApi.js';

const MOCK_CLASS = {
  id: 'grass',
  label: 'Grass',
  generatorId: 'particle',
  config: { color: '#4caf50', density: 0.5 },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchSurfaceClasses', () => {
  it('GETs /api/surface-classes and returns the array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [MOCK_CLASS],
      })
    );

    const result = await fetchSurfaceClasses();
    expect(result).toEqual([MOCK_CLASS]);

    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/surface-classes$/);
    expect(call[1]).not.toHaveProperty('method');
  });

  it('throws with server error message on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      })
    );

    await expect(fetchSurfaceClasses()).rejects.toThrow('Internal server error');
  });

  it('throws with unreachable message when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    await expect(fetchSurfaceClasses()).rejects.toThrow(/Server not reachable/);
  });
});

describe('createSurfaceClass', () => {
  it('POSTs to /api/surface-classes and returns the created class', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_CLASS,
      })
    );

    const result = await createSurfaceClass({
      id: 'grass',
      label: 'Grass',
      generatorId: 'particle',
      config: {},
    });
    expect(result).toEqual(MOCK_CLASS);

    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/surface-classes$/);
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toMatchObject({ id: 'grass', label: 'Grass' });
  });

  it('throws with server error message on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'label is required' }),
      })
    );

    await expect(createSurfaceClass({})).rejects.toThrow('label is required');
  });

  it('throws with unreachable message when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    await expect(createSurfaceClass({})).rejects.toThrow(/Server not reachable/);
  });
});

describe('updateSurfaceClass', () => {
  it('PUTs to /api/surface-classes/:id and returns the updated class', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...MOCK_CLASS, label: 'Updated Grass' }),
      })
    );

    const result = await updateSurfaceClass('grass', { label: 'Updated Grass' });
    expect(result.label).toBe('Updated Grass');

    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/surface-classes\/grass$/);
    expect(call[1].method).toBe('PUT');
    expect(JSON.parse(call[1].body)).toMatchObject({ label: 'Updated Grass' });
  });

  it('throws with server error message on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Surface class not found' }),
      })
    );

    await expect(updateSurfaceClass('no-such-id', {})).rejects.toThrow('Surface class not found');
  });

  it('throws with unreachable message when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    await expect(updateSurfaceClass('grass', {})).rejects.toThrow(/Server not reachable/);
  });

  it('percent-encodes the id in the URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_CLASS }));

    await updateSurfaceClass('id/slash', { label: 'Test' });
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/surface-classes\/id%2Fslash$/);
  });
});

describe('deleteSurfaceClass', () => {
  it('sends DELETE to /api/surface-classes/:id and resolves undefined', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    await expect(deleteSurfaceClass('grass')).resolves.toBeUndefined();

    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/surface-classes\/grass$/);
    expect(call[1].method).toBe('DELETE');
  });

  it('throws with server error message on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Surface class not found' }),
      })
    );

    await expect(deleteSurfaceClass('no-such-id')).rejects.toThrow('Surface class not found');
  });

  it('throws with unreachable message when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    await expect(deleteSurfaceClass('grass')).rejects.toThrow(/Server not reachable/);
  });

  it('percent-encodes the id in the URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    await deleteSurfaceClass('id with space');
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/surface-classes\/id%20with%20space$/);
  });
});
