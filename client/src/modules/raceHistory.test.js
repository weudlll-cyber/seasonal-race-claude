// ============================================================
// File:        raceHistory.test.js
// Path:        client/src/modules/raceHistory.test.js
// Project:     RaceArena — RACE-SAVE-3
// Description: The local record of a finished race.
//
//              THE THREE PROPERTIES THAT MATTER: the race is written even when everything about
//              the server is broken; the 100-cap never deletes a race that has not been sent; and
//              the inputs are the ones the race RAN with, never re-gathered from this machine.
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  buildHistoryEntry,
  capHistory,
  recordFinishedRace,
  readHistory,
  writeHistory,
  pendingEntries,
  markSent,
  markFailed,
  toServerPayload,
  HISTORY_CAP,
  SYNC,
} from './raceHistory.js';
import { storageGet, storageSet, KEYS } from './storage/storage';

/** The payload the race screen writes to sessionStorage when a race ends. */
function aParsedResult(overrides = {}) {
  return {
    finishOrder: [
      { name: 'Grace', index: 0 },
      { name: 'Ada', index: 1 },
    ],
    elapsedTime: 187,
    race: {
      trackId: 'garden-path-1',
      geometryId: 'garden-path',
      racerTypeId: 'beetle',
      racers: [{ name: 'Grace' }, { name: 'Ada' }],
      racePlanSeed: 4242,
      raceActionStage: 'wild',
      targetDurationSec: 200,
      racePlanEnabled: true,
      winners: 1,
    },
    worldConfig: {
      schemaVersion: 2,
      configs: { cameraConfig: { minRacersVisible: 5 } },
      racerTypeOverrides: { beetle: { normalSpeed: 150 } },
      effectiveRacerTypes: { beetle: { normalSpeed: 150 } },
    },
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── What the entry carries ────────────────────────────────────────────────────

describe('buildHistoryEntry', () => {
  it('keeps everything the history has always carried', () => {
    const e = buildHistoryEntry(aParsedResult());
    expect(e.trackId).toBe('garden-path-1');
    expect(e.duration).toBe(187);
    expect(e.playerCount).toBe(2);
    expect(e.seed).toBe(4242);
    expect(e.raceActionStage).toBe('wild');
    expect(e.winners).toEqual(['Grace']);
    expect(e.finishOrder).toHaveLength(2);
    expect(e.id).toBeTruthy();
    expect(e.date).toBeTruthy();
  });

  it('★ carries the inputs the race RAN with, taken from the payload', () => {
    const e = buildHistoryEntry(aParsedResult());
    expect(e.inputs.geometryId).toBe('garden-path');
    expect(e.inputs.racerTypeId).toBe('beetle');
    expect(e.inputs.names).toEqual(['Grace', 'Ada']);
    expect(e.inputs.racePlanSeed).toBe(4242);
    expect(e.inputs.targetDurationSec).toBe(200);
    expect(e.inputs.racePlanEnabled).toBe(true);
    // The world the race ran with, carried from the race screen — not re-gathered here.
    expect(e.inputs.worldSchemaVersion).toBe(2);
    expect(e.inputs.worldConfigs).toEqual({ cameraConfig: { minRacersVisible: 5 } });
    expect(e.inputs.effectiveRacerTypes).toEqual({ beetle: { normalSpeed: 150 } });
  });

  it('★ does NOT invent inputs when the payload carries no world', () => {
    // An entry from an older build. Filling the world in from this machine's CURRENT settings would
    // claim the race ran with values it never saw — the defect the identifier work exists against.
    const e = buildHistoryEntry(aParsedResult({ worldConfig: undefined }));
    expect(e.inputs).toBeNull();
    expect(e.sync).toBeNull(); // and it is not queued for sending
    expect(e.winners).toEqual(['Grace']); // but it is still a normal history entry
  });

  it('a race is PENDING the moment it is built — the server has not seen it', () => {
    expect(buildHistoryEntry(aParsedResult()).sync.state).toBe(SYNC.PENDING);
  });

  it('stores seed null rather than zero for the legacy unseeded value', () => {
    const e = buildHistoryEntry(
      aParsedResult({ race: { ...aParsedResult().race, racePlanSeed: 0 } })
    );
    expect(e.seed).toBeNull();
  });
});

describe('toServerPayload', () => {
  it('sends the outcome and the inputs, and NEVER a team', () => {
    const e = buildHistoryEntry(aParsedResult());
    const payload = toServerPayload(e);

    expect(payload.clientRaceId).toBe(e.id);
    expect(payload.finishedAt).toBe(e.date);
    expect(payload.geometryId).toBe('garden-path');
    expect(payload.results).toEqual(e.finishOrder);
    expect(payload.winners).toEqual(['Grace']);
    expect(payload.elapsedSec).toBe(187);
    // ★ The team is the server's to decide. A client that could name one could file a race into
    // somebody else's history.
    expect(payload).not.toHaveProperty('team');
  });
});

// ── ★ The cap must not delete an unsent race ─────────────────────────────────

describe('★ capHistory', () => {
  const sent = (i) => ({ id: `s${i}`, sync: { state: SYNC.SENT } });
  const pending = (i) => ({ id: `p${i}`, sync: { state: SYNC.PENDING } });
  const legacy = (i) => ({ id: `l${i}` }); // written before this piece: no sync at all

  it('keeps the newest hundred', () => {
    const list = Array.from({ length: 150 }, (_, i) => sent(i));
    expect(capHistory(list)).toHaveLength(HISTORY_CAP);
    expect(capHistory(list)[0].id).toBe('s0');
  });

  it('★ RESCUES a pending race from beyond the cap rather than deleting it', () => {
    // An evening of more than a hundred races with the server down. The old `slice(0, 100)` would
    // have dropped the earliest ones before they were ever sent, and nothing would have said so.
    const list = [...Array.from({ length: 120 }, (_, i) => sent(i)), pending(1), pending(2)];
    const capped = capHistory(list);

    expect(capped).toHaveLength(HISTORY_CAP + 2);
    expect(capped.map((e) => e.id)).toContain('p1');
    expect(capped.map((e) => e.id)).toContain('p2');
  });

  it('★ rescues a FAILED race too — it must stay visible, not vanish', () => {
    const list = [
      ...Array.from({ length: 120 }, (_, i) => sent(i)),
      { id: 'f1', sync: { state: SYNC.FAILED } },
    ];
    expect(capHistory(list).map((e) => e.id)).toContain('f1');
  });

  it('does NOT rescue a legacy entry — it was never going to be sent', () => {
    const list = [...Array.from({ length: 120 }, (_, i) => sent(i)), legacy(1)];
    expect(capHistory(list)).toHaveLength(HISTORY_CAP);
  });

  it('does not rescue an entry that already reached the server', () => {
    const list = Array.from({ length: 120 }, (_, i) => sent(i));
    expect(capHistory(list)).toHaveLength(HISTORY_CAP);
  });
});

// ── ★ Nothing about saving may interrupt the result screen ───────────────────

describe('★ recording a race never throws', () => {
  it('writes the entry and returns it', () => {
    const entry = recordFinishedRace(aParsedResult());
    expect(entry).toBeTruthy();
    expect(readHistory()).toHaveLength(1);
    expect(readHistory()[0].id).toBe(entry.id);
  });

  it('★ returns null instead of throwing when the device store is full', () => {
    // A quota failure must be a logged line, never an error where the player is looking at who won.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => recordFinishedRace(aParsedResult())).not.toThrow();
    expect(recordFinishedRace(aParsedResult())).toBeNull();
    expect(err).toHaveBeenCalled();
  });

  it('reads an unreadable store as empty rather than throwing', () => {
    storageSet(KEYS.RACE_HISTORY, 'not a list');
    expect(readHistory()).toEqual([]);
  });

  it('writeHistory reports failure rather than raising it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('nope');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(writeHistory([])).toBe(false);
  });
});

// ── Sync state ────────────────────────────────────────────────────────────────

describe('sync state', () => {
  it('lists pending races oldest first, so they arrive in the order they ran', () => {
    const a = recordFinishedRace(aParsedResult());
    const b = recordFinishedRace(aParsedResult());
    expect(pendingEntries().map((e) => e.id)).toEqual([a.id, b.id]);
  });

  it('a sent race leaves the pending list and remembers the server id', () => {
    const e = recordFinishedRace(aParsedResult());
    markSent(e.id, 'server-abc');

    expect(pendingEntries()).toEqual([]);
    const stored = readHistory().find((x) => x.id === e.id);
    expect(stored.sync.state).toBe(SYNC.SENT);
    expect(stored.sync.serverId).toBe('server-abc');
  });

  it('★ a FAILED race is KEPT, with the reason, where a person can see it', () => {
    const e = recordFinishedRace(aParsedResult());
    markFailed(e.id, 'storeRace requires a non-empty roster');

    const stored = readHistory().find((x) => x.id === e.id);
    expect(stored).toBeTruthy(); // not deleted
    expect(stored.sync.state).toBe(SYNC.FAILED);
    expect(stored.sync.error).toContain('roster');
    expect(pendingEntries()).toEqual([]); // and not retried forever
  });

  it('an entry the person has since deleted is a no-op, not an error', () => {
    const e = recordFinishedRace(aParsedResult());
    storageSet(KEYS.RACE_HISTORY, []);
    expect(markSent(e.id, 'x')).toBe(false);
    expect(storageGet(KEYS.RACE_HISTORY, [])).toEqual([]);
  });
});
