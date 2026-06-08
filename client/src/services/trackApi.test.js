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
