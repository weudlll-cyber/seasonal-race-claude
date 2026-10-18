// ============================================================
// File:        serverRecoveryProbe.test.js
// Path:        client/src/modules/serverRecoveryProbe.test.js
// Project:     RaceArena — OFFLINE-1 F2
// Description: The recovery probe asks GET /api/health ONLY while the server is not answering,
//              every RECOVERY_PROBE_MS, and stops once it answers; an answer clears the status
//              through the shared event; `racearena:server-check` asks once in any state; and a
//              failed track background asks for that check (bgImageCache.js) and is forgotten
//              when the server answers.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startServerRecoveryProbe, RECOVERY_PROBE_MS } from './serverRecoveryProbe.js';
import {
  getServerStatus,
  markServerReachable,
  markServerUnreachable,
  resetServerStatus,
} from './serverStatus.js';
import { getBackgroundImage, _clearBackgroundImageCache } from './track-effects/bgImageCache.js';

let stop;
let fetchMock;

beforeEach(() => {
  vi.useFakeTimers();
  resetServerStatus();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetServerStatus();
});

const healthCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/health'));

describe('serverRecoveryProbe — only while the server is not answering', () => {
  it('asks nothing while the server answers, or before anything is known', async () => {
    stop = startServerRecoveryProbe();
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS * 3);
    markServerReachable();
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks GET /api/health every RECOVERY_PROBE_MS while unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    markServerUnreachable();
    stop = startServerRecoveryProbe();
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS - 1);
    expect(healthCalls()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(healthCalls()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS * 2);
    expect(healthCalls()).toHaveLength(3);
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
    expect(getServerStatus()).toBe('unreachable');
  });

  it('an answer marks the server reachable and the probe stops', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    markServerUnreachable();
    stop = startServerRecoveryProbe();
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS);
    expect(getServerStatus()).toBe('reachable');
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS * 5);
    expect(healthCalls()).toHaveLength(1);
  });

  it('an error status is an answer too (serverStatus.js rule)', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 503 }));
    markServerUnreachable();
    stop = startServerRecoveryProbe();
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS);
    expect(getServerStatus()).toBe('reachable');
  });

  it('starts again on the next outage', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    markServerUnreachable();
    stop = startServerRecoveryProbe();
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS);
    markServerUnreachable();
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS);
    expect(healthCalls()).toHaveLength(2);
  });

  it('stopping it leaves no timer behind', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    markServerUnreachable();
    stop = startServerRecoveryProbe();
    stop();
    stop = undefined;
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('serverRecoveryProbe — one check on request (F3)', () => {
  it('`racearena:server-check` asks once even while the server was thought reachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    markServerReachable();
    stop = startServerRecoveryProbe();
    window.dispatchEvent(new CustomEvent('racearena:server-check'));
    await vi.advanceTimersByTimeAsync(0);
    expect(healthCalls()).toHaveLength(1);
    expect(getServerStatus()).toBe('unreachable');
  });

  it('a check while the clock is already running adds no probe of its own', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    markServerUnreachable();
    stop = startServerRecoveryProbe();
    window.dispatchEvent(new CustomEvent('racearena:server-check'));
    await vi.advanceTimersByTimeAsync(0);
    expect(healthCalls()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS);
    expect(healthCalls()).toHaveLength(1);
  });

  it('a failed track background asks for that check, and is forgotten when the server answers', async () => {
    _clearBackgroundImageCache();
    const made = [];
    vi.stubGlobal('Image', function MockImage() {
      const img = { onload: null, onerror: null, src: '' };
      made.push(img);
      return img;
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    markServerReachable();
    stop = startServerRecoveryProbe();

    getBackgroundImage('/api/tracks/x/background');
    made[0].onerror();
    await vi.advanceTimersByTimeAsync(0);
    expect(healthCalls()).toHaveLength(1);
    expect(getServerStatus()).toBe('unreachable');

    // Still failed and inside the retry window: no new load.
    getBackgroundImage('/api/tracks/x/background');
    expect(made).toHaveLength(1);

    // The server answers the probe: the failure is forgotten and the next request loads it again.
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await vi.advanceTimersByTimeAsync(RECOVERY_PROBE_MS);
    expect(getServerStatus()).toBe('reachable');
    getBackgroundImage('/api/tracks/x/background');
    expect(made).toHaveLength(2);
    _clearBackgroundImageCache();
  });
});
