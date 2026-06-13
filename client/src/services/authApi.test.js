// ============================================================
// File:        authApi.test.js
// Path:        client/src/services/authApi.test.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Unit tests for the auth API service
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMe, login, logout, getSetupNeeded, setup } from './authApi.js';

function mockFetch(ok, status, data) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status, json: async () => data }));
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('getMe', () => {
  it('200 { username, role } → returns the user object', async () => {
    mockFetch(true, 200, { username: 'a', role: 'admin' });
    expect(await getMe()).toEqual({ username: 'a', role: 'admin' });
  });

  it('401 → returns null', async () => {
    mockFetch(false, 401, { error: 'not authenticated' });
    expect(await getMe()).toBeNull();
  });

  it('500 → throws with status attached', async () => {
    mockFetch(false, 500, { error: 'server error' });
    await expect(getMe()).rejects.toMatchObject({ status: 500 });
  });
});

describe('login', () => {
  it('200 → returns { username, role }', async () => {
    mockFetch(true, 200, { username: 'alice', role: 'operator' });
    expect(await login('alice', 'pass')).toEqual({ username: 'alice', role: 'operator' });
  });

  it('401 → throws', async () => {
    mockFetch(false, 401, { error: 'invalid credentials' });
    await expect(login('x', 'bad')).rejects.toThrow();
  });
});

describe('logout', () => {
  it('200 → resolves without throwing', async () => {
    mockFetch(true, 200, { ok: true });
    await expect(logout()).resolves.toBeUndefined();
  });
});

describe('getSetupNeeded', () => {
  it('{ setupNeeded: true } → true', async () => {
    mockFetch(true, 200, { setupNeeded: true });
    expect(await getSetupNeeded()).toBe(true);
  });

  it('{ setupNeeded: false } → false', async () => {
    mockFetch(true, 200, { setupNeeded: false });
    expect(await getSetupNeeded()).toBe(false);
  });
});

describe('setup', () => {
  it('201 → returns { username, role }', async () => {
    mockFetch(true, 201, { username: 'admin', role: 'admin' });
    expect(await setup('admin', 'pass', 'TOKEN')).toEqual({ username: 'admin', role: 'admin' });
  });
});
