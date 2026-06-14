// ============================================================
// File:        playerGroupApi.test.js
// Path:        client/src/services/playerGroupApi.test.js
// Project:     RaceArena
// Description: Unit tests for playerGroupApi (D2). Verifies correct URL, method,
//              body, JSON parsing, encodeURIComponent on :id, and error propagation.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient.js', () => ({ apiCall: vi.fn() }));
vi.mock('./api.js', () => ({ API_BASE_URL: 'http://test' }));

import {
  fetchPlayerGroups,
  createPlayerGroup,
  updatePlayerGroup,
  deletePlayerGroup,
  setPlayerGroupDefault,
  clearPlayerGroupDefault,
  exportPlayerGroupSeed,
} from './playerGroupApi.js';
import { apiCall } from './apiClient.js';

const MOCK_GROUP = {
  id: 'abc-123',
  name: 'Friday Crew',
  players: ['Alice', 'Bob'],
  isDefault: false,
  createdAt: '2026-06-14T00:00:00.000Z',
  updatedAt: '2026-06-14T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── fetchPlayerGroups ─────────────────────────────────────────────────────────

describe('fetchPlayerGroups', () => {
  it('calls GET /api/player-groups and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => [MOCK_GROUP] });
    const result = await fetchPlayerGroups();
    expect(apiCall).toHaveBeenCalledWith('http://test/api/player-groups');
    expect(result).toEqual([MOCK_GROUP]);
  });

  it('propagates errors from apiCall', async () => {
    const err = Object.assign(new Error('not authenticated'), { status: 401 });
    apiCall.mockRejectedValue(err);
    await expect(fetchPlayerGroups()).rejects.toMatchObject({ status: 401 });
  });
});

// ── createPlayerGroup ─────────────────────────────────────────────────────────

describe('createPlayerGroup', () => {
  it('calls POST /api/player-groups with JSON body and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_GROUP });
    const result = await createPlayerGroup({ name: 'Friday Crew', players: ['Alice', 'Bob'] });
    expect(apiCall).toHaveBeenCalledWith('http://test/api/player-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Friday Crew', players: ['Alice', 'Bob'] }),
    });
    expect(result).toEqual(MOCK_GROUP);
  });

  it('propagates 400 error (validation)', async () => {
    const err = Object.assign(new Error('name is required'), { status: 400 });
    apiCall.mockRejectedValue(err);
    await expect(createPlayerGroup({ name: '', players: [] })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('propagates 409 error (id already exists)', async () => {
    const err = Object.assign(new Error("Player group 'abc-123' already exists"), { status: 409 });
    apiCall.mockRejectedValue(err);
    await expect(
      createPlayerGroup({ id: 'abc-123', name: 'X', players: ['Y'] })
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ── updatePlayerGroup ─────────────────────────────────────────────────────────

describe('updatePlayerGroup', () => {
  it('calls PUT /api/player-groups/:id with JSON body and returns parsed JSON', async () => {
    const updated = { ...MOCK_GROUP, name: 'Updated Crew' };
    apiCall.mockResolvedValue({ json: async () => updated });
    const result = await updatePlayerGroup('abc-123', { name: 'Updated Crew', players: ['Alice'] });
    expect(apiCall).toHaveBeenCalledWith('http://test/api/player-groups/abc-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Crew', players: ['Alice'] }),
    });
    expect(result.name).toBe('Updated Crew');
  });

  it('percent-encodes the id in the URL', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_GROUP });
    await updatePlayerGroup('id with spaces', { name: 'X', players: ['Y'] });
    expect(apiCall).toHaveBeenCalledWith(
      'http://test/api/player-groups/id%20with%20spaces',
      expect.any(Object)
    );
  });

  it('propagates 404 error (group not found)', async () => {
    const err = Object.assign(new Error('Player group not found'), { status: 404 });
    apiCall.mockRejectedValue(err);
    await expect(updatePlayerGroup('no-such', { name: 'X', players: ['Y'] })).rejects.toMatchObject(
      { status: 404 }
    );
  });
});

// ── deletePlayerGroup ─────────────────────────────────────────────────────────

describe('deletePlayerGroup', () => {
  it('calls DELETE /api/player-groups/:id and returns void', async () => {
    apiCall.mockResolvedValue(undefined);
    await deletePlayerGroup('abc-123');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/player-groups/abc-123', {
      method: 'DELETE',
    });
  });

  it('percent-encodes the id in the URL', async () => {
    apiCall.mockResolvedValue(undefined);
    await deletePlayerGroup('id/with/slashes');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/player-groups/id%2Fwith%2Fslashes', {
      method: 'DELETE',
    });
  });

  it('propagates 403 error (cannot delete default group)', async () => {
    const err = Object.assign(new Error('Cannot delete a default player group'), { status: 403 });
    apiCall.mockRejectedValue(err);
    await expect(deletePlayerGroup('default-example-group')).rejects.toMatchObject({ status: 403 });
  });

  it('propagates 404 error (group not found)', async () => {
    const err = Object.assign(new Error('Player group not found'), { status: 404 });
    apiCall.mockRejectedValue(err);
    await expect(deletePlayerGroup('ghost')).rejects.toMatchObject({ status: 404 });
  });
});

// ── Admin routes (D2b stubs — URL/method shape only) ─────────────────────────

describe('setPlayerGroupDefault', () => {
  it('calls POST /api/player-groups/:id/set-default', async () => {
    apiCall.mockResolvedValue({ json: async () => ({ ...MOCK_GROUP, isDefault: true }) });
    const result = await setPlayerGroupDefault('abc-123');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/player-groups/abc-123/set-default', {
      method: 'POST',
    });
    expect(result.isDefault).toBe(true);
  });

  it('percent-encodes id', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_GROUP });
    await setPlayerGroupDefault('id with space');
    expect(apiCall).toHaveBeenCalledWith(
      'http://test/api/player-groups/id%20with%20space/set-default',
      { method: 'POST' }
    );
  });
});

describe('clearPlayerGroupDefault', () => {
  it('calls POST /api/player-groups/:id/clear-default', async () => {
    apiCall.mockResolvedValue({ json: async () => ({ ...MOCK_GROUP, isDefault: false }) });
    const result = await clearPlayerGroupDefault('abc-123');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/player-groups/abc-123/clear-default', {
      method: 'POST',
    });
    expect(result.isDefault).toBe(false);
  });
});

describe('exportPlayerGroupSeed', () => {
  it('calls GET /api/player-groups/:id/export-seed', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_GROUP });
    const result = await exportPlayerGroupSeed('abc-123');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/player-groups/abc-123/export-seed');
    expect(result).toEqual(MOCK_GROUP);
  });
});
