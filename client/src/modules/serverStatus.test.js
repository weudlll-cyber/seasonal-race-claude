// ============================================================
// File:        serverStatus.test.js
// Path:        client/src/modules/serverStatus.test.js
// Project:     RaceArena — SERVER-GONE-1
//
// THE ONE DISTINCTION THIS FEATURE RESTS ON: a 500 is an ANSWER.
//
// If "unreachable" ever came to include HTTP errors, the banner would tell an operator to go and
// restart a backend that is running perfectly well and is returning an error — sending them away
// from the real problem in the middle of an event. That is the failure these tests hold, and it is
// asserted against `apiCall` itself rather than against the store, because the store cannot make the
// mistake on its own: the classification lives in the caller.
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getServerStatus,
  markServerReachable,
  markServerUnreachable,
  resetServerStatus,
  subscribeServerStatus,
} from './serverStatus.js';
import { apiCall } from '../services/apiClient.js';

beforeEach(() => {
  resetServerStatus();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetServerStatus();
});

describe('serverStatus — the store', () => {
  // What breaks if deleted: the banner could render on a cold start before anything was tried,
  // announcing a dead server on every first paint.
  it('starts unknown, so nothing is claimed before anything is tried', () => {
    expect(getServerStatus()).toBe('unknown');
  });

  // What breaks if deleted: subscribers could stop being told, and the banner would show the state
  // at mount for ever.
  it('tells subscribers when the value changes, and not when it does not', () => {
    const seen = vi.fn();
    const off = subscribeServerStatus(seen);

    markServerUnreachable();
    expect(seen).toHaveBeenCalledTimes(1);
    markServerUnreachable(); // same value — a re-render here would be spurious
    expect(seen).toHaveBeenCalledTimes(1);

    markServerReachable();
    expect(seen).toHaveBeenCalledTimes(2);

    off();
    markServerUnreachable();
    expect(seen).toHaveBeenCalledTimes(2);
  });
});

describe('serverStatus — what apiCall reports', () => {
  // What breaks if deleted: the whole feature. A transport failure is the case the player cannot
  // otherwise see.
  it('marks UNREACHABLE when the request never gets an answer', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiCall('http://example.invalid/api/x')).rejects.toThrow();
    expect(getServerStatus()).toBe('unreachable');
  });

  // ★ What breaks if deleted: a 500 starts reading as "server unreachable" and the banner sends the
  // operator to restart a server that is up.
  it('marks REACHABLE on an HTTP error, because the server answered', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'boom' }),
    });
    await expect(apiCall('http://example.invalid/api/x')).rejects.toThrow();
    expect(getServerStatus()).toBe('reachable');
  });

  // What breaks if deleted: a 401 could be reported as unreachable, which would put a "server is
  // down" banner in front of everybody who is merely signed out.
  it('marks REACHABLE on a 401, which is a refusal and not an absence', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'unauthorized' }),
    });
    await expect(
      apiCall('http://example.invalid/api/me', { _skipAuthRedirect: true })
    ).rejects.toThrow();
    expect(getServerStatus()).toBe('reachable');
  });

  // What breaks if deleted: the banner could stay up after the server came back, since nothing else
  // clears it.
  it('marks REACHABLE on success, so the banner clears itself', async () => {
    markServerUnreachable();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    await apiCall('http://example.invalid/api/x');
    expect(getServerStatus()).toBe('reachable');
  });
});
