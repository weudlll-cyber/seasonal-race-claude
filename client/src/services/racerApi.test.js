// ============================================================
// File:        racerApi.test.js
// Path:        client/src/services/racerApi.test.js
// Project:     RaceArena
// Description: Unit tests for racerApi (D6a). Verifies correct URL, method,
//              body, JSON parsing, encodeURIComponent on :id, FormData for
//              sprite upload, and error propagation. Mirrors brandApi.test.js.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient.js', () => ({ apiCall: vi.fn() }));
vi.mock('./api.js', () => ({ API_BASE_URL: 'http://test' }));

import {
  fetchRacers,
  createRacer,
  updateRacer,
  deleteRacer,
  uploadRacerSprite,
  deleteRacerSprite,
} from './racerApi.js';
import { apiCall } from './apiClient.js';

const MOCK_RACER = {
  id: 'my-racer',
  name: 'My Racer',
  emoji: '🏇',
  frameCount: 4,
  basePeriodMs: 500,
  displaySize: 60,
  trailStyle: 'dust',
  coats: ['black'],
  primaryColor: '#ff0000',
  spriteFile: null,
  createdAt: '2026-06-15T00:00:00.000Z',
  updatedAt: '2026-06-15T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── fetchRacers ───────────────────────────────────────────────────────────────

describe('fetchRacers', () => {
  it('calls GET /api/racers and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => [MOCK_RACER] });
    const result = await fetchRacers();
    expect(apiCall).toHaveBeenCalledWith('http://test/api/racers');
    expect(result).toEqual([MOCK_RACER]);
  });

  it('propagates errors from apiCall', async () => {
    const err = Object.assign(new Error('not authenticated'), { status: 401 });
    apiCall.mockRejectedValue(err);
    await expect(fetchRacers()).rejects.toMatchObject({ status: 401 });
  });
});

// ── createRacer ───────────────────────────────────────────────────────────────

describe('createRacer', () => {
  it('calls POST /api/racers with JSON body and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_RACER });
    const data = { name: 'My Racer', emoji: '🏇', coats: ['black'] };
    const result = await createRacer(data);
    expect(apiCall).toHaveBeenCalledWith('http://test/api/racers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    expect(result).toEqual(MOCK_RACER);
  });

  it('propagates 400 error (validation)', async () => {
    const err = Object.assign(new Error('name is required'), { status: 400 });
    apiCall.mockRejectedValue(err);
    await expect(createRacer({})).rejects.toMatchObject({ status: 400 });
  });

  it('propagates 409 error (id collision)', async () => {
    const err = Object.assign(new Error("Racer 'my-racer' already exists"), { status: 409 });
    apiCall.mockRejectedValue(err);
    await expect(createRacer({ id: 'my-racer' })).rejects.toMatchObject({ status: 409 });
  });
});

// ── updateRacer ───────────────────────────────────────────────────────────────

describe('updateRacer', () => {
  it('calls PUT /api/racers/:id with JSON body and returns parsed JSON', async () => {
    const updated = { ...MOCK_RACER, name: 'Updated' };
    apiCall.mockResolvedValue({ json: async () => updated });
    const result = await updateRacer('my-racer', { name: 'Updated' });
    expect(apiCall).toHaveBeenCalledWith('http://test/api/racers/my-racer', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(result.name).toBe('Updated');
  });

  it('percent-encodes the id in the URL', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_RACER });
    await updateRacer('id with spaces', {});
    expect(apiCall).toHaveBeenCalledWith(
      'http://test/api/racers/id%20with%20spaces',
      expect.any(Object)
    );
  });

  it('propagates 404 error (racer not found)', async () => {
    const err = Object.assign(new Error('Racer not found'), { status: 404 });
    apiCall.mockRejectedValue(err);
    await expect(updateRacer('no-such', {})).rejects.toMatchObject({ status: 404 });
  });
});

// ── deleteRacer ───────────────────────────────────────────────────────────────

describe('deleteRacer', () => {
  it('calls DELETE /api/racers/:id', async () => {
    apiCall.mockResolvedValue(undefined);
    await deleteRacer('my-racer');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/racers/my-racer', { method: 'DELETE' });
  });

  it('percent-encodes the id', async () => {
    apiCall.mockResolvedValue(undefined);
    await deleteRacer('id/with/slashes');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/racers/id%2Fwith%2Fslashes', {
      method: 'DELETE',
    });
  });

  it('propagates 404 error', async () => {
    const err = Object.assign(new Error('Racer not found'), { status: 404 });
    apiCall.mockRejectedValue(err);
    await expect(deleteRacer('ghost')).rejects.toMatchObject({ status: 404 });
  });
});

// ── uploadRacerSprite ─────────────────────────────────────────────────────────

describe('uploadRacerSprite', () => {
  it('calls POST /api/racers/:id/sprite with FormData and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => ({ spriteFile: 'my-racer.png' }) });
    const file = new File(['img'], 'sprite.png', { type: 'image/png' });
    const result = await uploadRacerSprite('my-racer', file);
    expect(apiCall).toHaveBeenCalledWith(
      'http://test/api/racers/my-racer/sprite',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
    );
    expect(result).toEqual({ spriteFile: 'my-racer.png' });
  });

  it('percent-encodes the id', async () => {
    apiCall.mockResolvedValue({ json: async () => ({ spriteFile: 'x.png' }) });
    const file = new File(['img'], 'x.png', { type: 'image/png' });
    await uploadRacerSprite('id with space', file);
    expect(apiCall).toHaveBeenCalledWith(
      'http://test/api/racers/id%20with%20space/sprite',
      expect.any(Object)
    );
  });
});

// ── deleteRacerSprite ─────────────────────────────────────────────────────────

describe('deleteRacerSprite', () => {
  it('calls DELETE /api/racers/:id/sprite', async () => {
    apiCall.mockResolvedValue(undefined);
    await deleteRacerSprite('my-racer');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/racers/my-racer/sprite', {
      method: 'DELETE',
    });
  });

  it('percent-encodes the id', async () => {
    apiCall.mockResolvedValue(undefined);
    await deleteRacerSprite('id/slash');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/racers/id%2Fslash/sprite', {
      method: 'DELETE',
    });
  });
});
