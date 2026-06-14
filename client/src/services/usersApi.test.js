// ============================================================
// File:        usersApi.test.js
// Path:        client/src/services/usersApi.test.js
// Project:     RaceArena
// Description: Unit tests for usersApi service (Phase C step 4).
//              Verifies correct URL, method, body, and JSON parsing for each
//              operation; verifies error propagation (status + message).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient.js', () => ({ apiCall: vi.fn() }));
vi.mock('./api.js', () => ({ API_BASE_URL: 'http://test' }));

import { fetchUsers, createUser, updateUser, deleteUser } from './usersApi.js';
import { apiCall } from './apiClient.js';

const MOCK_USER = {
  id: '1',
  username: 'alice',
  role: 'operator',
  createdAt: '2026-06-14T00:00:00.000Z',
  createdBy: 'setup',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── fetchUsers ────────────────────────────────────────────────────────────────

describe('fetchUsers', () => {
  it('calls GET /api/users and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => [MOCK_USER] });
    const result = await fetchUsers();
    expect(apiCall).toHaveBeenCalledWith('http://test/api/users');
    expect(result).toEqual([MOCK_USER]);
  });

  it('propagates errors from apiCall (e.g. 401 → not authenticated)', async () => {
    const err = Object.assign(new Error('not authenticated'), { status: 401 });
    apiCall.mockRejectedValue(err);
    await expect(fetchUsers()).rejects.toMatchObject({ message: 'not authenticated', status: 401 });
  });
});

// ── createUser ────────────────────────────────────────────────────────────────

describe('createUser', () => {
  it('calls POST /api/users with JSON body and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_USER });
    const result = await createUser({ username: 'alice', password: 'pw', role: 'operator' });
    expect(apiCall).toHaveBeenCalledWith('http://test/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'pw', role: 'operator' }),
    });
    expect(result).toEqual(MOCK_USER);
  });

  it('propagates 409 error (username taken)', async () => {
    const err = Object.assign(new Error('username already taken'), { status: 409 });
    apiCall.mockRejectedValue(err);
    await expect(
      createUser({ username: 'alice', password: 'pw', role: 'operator' })
    ).rejects.toMatchObject({ message: 'username already taken', status: 409 });
  });

  it('propagates 400 error (invalid role)', async () => {
    const err = Object.assign(new Error('Role must be "operator" or "admin"'), { status: 400 });
    apiCall.mockRejectedValue(err);
    await expect(
      createUser({ username: 'x', password: 'pw', role: 'superuser' })
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ── updateUser ────────────────────────────────────────────────────────────────

describe('updateUser', () => {
  it('calls PUT /api/users/:id with JSON body and returns parsed JSON', async () => {
    apiCall.mockResolvedValue({ json: async () => ({ ...MOCK_USER, role: 'admin' }) });
    const result = await updateUser('1', { role: 'admin' });
    expect(apiCall).toHaveBeenCalledWith('http://test/api/users/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    });
    expect(result.role).toBe('admin');
  });

  it('percent-encodes the id in the URL', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_USER });
    await updateUser('has space', { role: 'operator' });
    expect(apiCall).toHaveBeenCalledWith(expect.stringContaining('has%20space'), expect.anything());
  });

  it('propagates 409 error (last admin cannot be demoted)', async () => {
    const err = Object.assign(new Error('Cannot demote the last admin'), { status: 409 });
    apiCall.mockRejectedValue(err);
    await expect(updateUser('1', { role: 'operator' })).rejects.toMatchObject({
      message: 'Cannot demote the last admin',
      status: 409,
    });
  });

  it('propagates 404 error (user not found)', async () => {
    const err = Object.assign(new Error('user not found'), { status: 404 });
    apiCall.mockRejectedValue(err);
    await expect(updateUser('no-such-id', { role: 'admin' })).rejects.toMatchObject({
      status: 404,
    });
  });
});

// ── deleteUser ────────────────────────────────────────────────────────────────

describe('deleteUser', () => {
  it('calls DELETE /api/users/:id and returns parsed JSON (deleted user)', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_USER });
    const result = await deleteUser('1');
    expect(apiCall).toHaveBeenCalledWith('http://test/api/users/1', { method: 'DELETE' });
    expect(result).toEqual(MOCK_USER);
  });

  it('percent-encodes the id in the URL', async () => {
    apiCall.mockResolvedValue({ json: async () => MOCK_USER });
    await deleteUser('has space');
    expect(apiCall).toHaveBeenCalledWith(expect.stringContaining('has%20space'), expect.anything());
  });

  it('propagates 409 error (Cannot delete the last admin)', async () => {
    const err = Object.assign(new Error('Cannot delete the last admin'), { status: 409 });
    apiCall.mockRejectedValue(err);
    await expect(deleteUser('1')).rejects.toMatchObject({
      message: 'Cannot delete the last admin',
      status: 409,
    });
  });

  it('propagates 404 error (user not found)', async () => {
    const err = Object.assign(new Error('user not found'), { status: 404 });
    apiCall.mockRejectedValue(err);
    await expect(deleteUser('no-such-id')).rejects.toMatchObject({ status: 404 });
  });
});
