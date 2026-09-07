// ============================================================
// File:        pendingRaces.test.js
// Path:        client/src/modules/pendingRaces.test.js
// Project:     RaceArena — RACE-SAVE-3
// Description: Sending a race that is already safe.
//
//              ★ THE PROPERTY THIS FILE DEFENDS: a race is NEVER lost and never silently dropped.
//              A send that fails leaves it pending; a refusal that retrying cannot fix is recorded
//              against the entry with its reason. Neither ever deletes anything.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../services/racesApi.js', () => ({ postRace: vi.fn() }));

import { postRace } from '../services/racesApi.js';
import { sendOne, flushPendingRaces, startPendingRaceSync } from './pendingRaces.js';
import { recordFinishedRace, readHistory, pendingEntries, SYNC } from './raceHistory.js';
import { markServerReachable, markServerUnreachable, resetServerStatus } from './serverStatus.js';

function aParsedResult() {
  return {
    finishOrder: [{ name: 'Grace' }, { name: 'Ada' }],
    elapsedTime: 187,
    race: {
      trackId: 't1',
      geometryId: 'garden-path',
      racerTypeId: 'beetle',
      racers: [{ name: 'Grace' }, { name: 'Ada' }],
      racePlanSeed: 4242,
      raceActionStage: 'wild',
      targetDurationSec: 200,
      racePlanEnabled: true,
      winners: 1,
    },
    worldConfig: { schemaVersion: 2, configs: {}, racerTypeOverrides: {}, effectiveRacerTypes: {} },
  };
}

beforeEach(() => {
  localStorage.clear();
  resetServerStatus();
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── One race ──────────────────────────────────────────────────────────────────

describe('sendOne', () => {
  it('marks the race sent and remembers the server id', async () => {
    const e = recordFinishedRace(aParsedResult());
    postRace.mockResolvedValue({ ok: true, id: 'server-1', alreadyStored: false });

    expect(await sendOne(e)).toBe('sent');
    expect(readHistory()[0].sync.state).toBe(SYNC.SENT);
    expect(readHistory()[0].sync.serverId).toBe('server-1');
  });

  it('a race the server had ALREADY stored is still marked sent, not retried forever', async () => {
    const e = recordFinishedRace(aParsedResult());
    postRace.mockResolvedValue({ ok: true, id: 'server-1', alreadyStored: true });

    expect(await sendOne(e)).toBe('sent');
    expect(pendingEntries()).toEqual([]);
  });

  it('★ a transport failure KEEPS the race pending — nothing is lost', async () => {
    const e = recordFinishedRace(aParsedResult());
    postRace.mockRejectedValue(new Error('Server not reachable'));

    expect(await sendOne(e)).toBe('kept');
    expect(readHistory()).toHaveLength(1);
    expect(readHistory()[0].sync.state).toBe(SYNC.PENDING);
    expect(pendingEntries()).toHaveLength(1);
  });

  it('★ a RETRYABLE refusal keeps it pending too', async () => {
    const e = recordFinishedRace(aParsedResult());
    postRace.mockResolvedValue({ ok: false, retryable: true, error: 'no team yet' });

    expect(await sendOne(e)).toBe('kept');
    expect(readHistory()[0].sync.state).toBe(SYNC.PENDING);
  });

  it('★ a PERMANENT refusal is RECORDED, with the reason — never discarded', async () => {
    const e = recordFinishedRace(aParsedResult());
    postRace.mockResolvedValue({ ok: false, retryable: false, error: 'storeRace requires a team' });

    expect(await sendOne(e)).toBe('failed');
    const stored = readHistory()[0];
    expect(stored).toBeTruthy(); // the race is still in the history
    expect(stored.sync.state).toBe(SYNC.FAILED);
    expect(stored.sync.error).toContain('requires a team');
    expect(pendingEntries()).toEqual([]); // and it is not tried again forever
  });

  it('never throws, whatever the API does', async () => {
    const e = recordFinishedRace(aParsedResult());
    postRace.mockRejectedValue(new Error('boom'));
    await expect(sendOne(e)).resolves.toBe('kept');
  });
});

// ── The queue ─────────────────────────────────────────────────────────────────

describe('flushPendingRaces', () => {
  it('sends every pending race, oldest first', async () => {
    const a = recordFinishedRace(aParsedResult());
    const b = recordFinishedRace(aParsedResult());
    postRace.mockResolvedValue({ ok: true, id: 'sid', alreadyStored: false });

    const out = await flushPendingRaces();

    expect(out.sent).toBe(2);
    expect(postRace).toHaveBeenCalledTimes(2);
    expect(postRace.mock.calls[0][0].clientRaceId).toBe(a.id);
    expect(postRace.mock.calls[1][0].clientRaceId).toBe(b.id);
    expect(pendingEntries()).toEqual([]);
  });

  it('★ STOPS at the first race it cannot send — the server is not taking races', async () => {
    recordFinishedRace(aParsedResult());
    recordFinishedRace(aParsedResult());
    postRace.mockRejectedValue(new Error('Server not reachable'));

    const out = await flushPendingRaces();

    expect(out.kept).toBe(1);
    expect(postRace).toHaveBeenCalledTimes(1); // not two identical failures
    expect(pendingEntries()).toHaveLength(2); // and both are still waiting
  });

  it('does nothing when nothing is pending', async () => {
    expect(await flushPendingRaces()).toEqual({ sent: 0, failed: 0, kept: 0 });
    expect(postRace).not.toHaveBeenCalled();
  });

  it('two flushes at once do not both run', async () => {
    recordFinishedRace(aParsedResult());
    let release;
    postRace.mockReturnValue(
      new Promise((r) => {
        release = () => r({ ok: true, id: 's' });
      })
    );

    const first = flushPendingRaces();
    const second = await flushPendingRaces(); // starts while the first is still in flight
    expect(second).toEqual({ sent: 0, failed: 0, kept: 0 });

    release();
    await first;
    expect(postRace).toHaveBeenCalledTimes(1);
  });
});

// ── ★ The trigger: no polling, no timer ──────────────────────────────────────

describe('★ startPendingRaceSync — the trigger is the server coming back, not a clock', () => {
  it('flushes when the server becomes reachable', async () => {
    recordFinishedRace(aParsedResult());
    postRace.mockResolvedValue({ ok: true, id: 's1' });

    markServerUnreachable();
    const stop = startPendingRaceSync();
    expect(postRace).not.toHaveBeenCalled(); // still down: nothing is attempted

    markServerReachable(); // some OTHER request succeeded
    await vi.waitFor(() => expect(postRace).toHaveBeenCalledTimes(1));
    stop();
  });

  it('flushes once at start-up when the server is ALREADY reachable', async () => {
    // A status that is already `reachable` never transitions, so waiting for a transition would
    // strand races left over from a previous session.
    recordFinishedRace(aParsedResult());
    postRace.mockResolvedValue({ ok: true, id: 's1' });
    markServerReachable();

    const stop = startPendingRaceSync();
    await vi.waitFor(() => expect(postRace).toHaveBeenCalledTimes(1));
    stop();
  });

  it('does not flush while the server stays unreachable', async () => {
    recordFinishedRace(aParsedResult());
    markServerUnreachable();
    const stop = startPendingRaceSync();

    markServerUnreachable(); // no change
    await Promise.resolve();
    expect(postRace).not.toHaveBeenCalled();
    stop();
  });

  it('unsubscribes — a stopped sync does not flush on a later reconnection', async () => {
    recordFinishedRace(aParsedResult());
    markServerUnreachable();
    const stop = startPendingRaceSync();
    stop();

    markServerReachable();
    await Promise.resolve();
    expect(postRace).not.toHaveBeenCalled();
  });
});
