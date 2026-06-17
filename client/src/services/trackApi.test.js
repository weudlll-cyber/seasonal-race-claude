// ============================================================
// File:        trackApi.test.js
// Path:        client/src/services/trackApi.test.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Unit tests for the track server API client
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createTrackOnServer,
  updateTrackOnServer,
  deleteTrackFromServer,
  uploadTrackBackground,
  setTrackDefault,
  clearTrackDefault,
  exportTrackSeed,
} from './trackApi.js';

const MOCK_TRACK = {
  id: 'abc123',
  geometryId: 'custom-geo-1',
  name: 'Test Track',
  closed: false,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createTrackOnServer', () => {
  it('POSTs to /api/tracks and returns the created track', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_TRACK,
      })
    );

    const result = await createTrackOnServer({ name: 'Test Track', closed: false });
    expect(result).toEqual(MOCK_TRACK);

    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/tracks$/);
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toMatchObject({ name: 'Test Track' });
  });

  it('throws with server error message on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'name is required' }),
      })
    );

    await expect(createTrackOnServer({})).rejects.toThrow('name is required');
  });

  it('throws with unreachable message when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    await expect(createTrackOnServer({})).rejects.toThrow(/Server not reachable/);
  });
});

describe('updateTrackOnServer', () => {
  it('PUTs to /api/tracks/:id and returns updated track', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...MOCK_TRACK, name: 'Updated' }),
      })
    );

    const result = await updateTrackOnServer('abc123', { name: 'Updated', closed: false });
    expect(result.name).toBe('Updated');

    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/tracks\/abc123$/);
    expect(call[1].method).toBe('PUT');
  });

  it('throws on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Track not found' }),
      })
    );

    await expect(updateTrackOnServer('no-such-id', {})).rejects.toThrow('Track not found');
  });
});

describe('deleteTrackFromServer', () => {
  it('sends DELETE to /api/tracks/:id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    await expect(deleteTrackFromServer('abc123')).resolves.toBeUndefined();

    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/tracks\/abc123$/);
    expect(call[1].method).toBe('DELETE');
  });

  it('throws on server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Track not found' }),
      })
    );

    await expect(deleteTrackFromServer('no-such-id')).rejects.toThrow('Track not found');
  });
});

describe('uploadTrackBackground', () => {
  it('POSTs multipart to /api/tracks/:id/background', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ backgroundImageFile: 'abc123.jpg' }),
      })
    );

    const blob = new Blob(['fake-image'], { type: 'image/jpeg' });
    const result = await uploadTrackBackground('abc123', blob);
    expect(result.backgroundImageFile).toBe('abc123.jpg');

    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/tracks\/abc123\/background$/);
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toBeInstanceOf(FormData);
  });

  it('throws on 413 (file too large)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 413,
        json: async () => ({ error: 'File too large. Maximum 10 MB allowed.' }),
      })
    );

    await expect(uploadTrackBackground('abc123', new Blob(['x']))).rejects.toThrow(/too large/i);
  });
});

describe('setTrackDefault', () => {
  it('POSTs to /api/tracks/:id/set-default and returns JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...MOCK_TRACK, isDefault: true }),
      })
    );
    const result = await setTrackDefault('abc123');
    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/tracks\/abc123\/set-default$/);
    expect(call[1].method).toBe('POST');
    expect(result.isDefault).toBe(true);
  });

  it('percent-encodes the id in the URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK }));
    await setTrackDefault('id with space');
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/tracks\/id%20with%20space\/set-default$/);
  });
});

describe('clearTrackDefault', () => {
  it('POSTs to /api/tracks/:id/clear-default and returns JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...MOCK_TRACK, isDefault: false }),
      })
    );
    const result = await clearTrackDefault('abc123');
    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/tracks\/abc123\/clear-default$/);
    expect(call[1].method).toBe('POST');
    expect(result.isDefault).toBe(false);
  });

  it('percent-encodes the id in the URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK }));
    await clearTrackDefault('id/slash');
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/tracks\/id%2Fslash\/clear-default$/);
  });
});

describe('exportTrackSeed', () => {
  it('GETs /api/tracks/:id/export-seed and returns JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK }));
    const result = await exportTrackSeed('abc123');
    const call = fetch.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/tracks\/abc123\/export-seed$/);
    expect(result).toEqual(MOCK_TRACK);
  });

  it('percent-encodes the id in the URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_TRACK }));
    await exportTrackSeed('id with space');
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/tracks\/id%20with%20space\/export-seed$/);
  });
});
