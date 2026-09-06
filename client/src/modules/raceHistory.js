// ============================================================
// File:        raceHistory.js
// Path:        client/src/modules/raceHistory.js
// Project:     RaceArena — RACE-SAVE-3
// Created:     2026-09-06
// Description: THE LOCAL RECORD OF A FINISHED RACE. It is written first, it is written here, and
//              nothing about it depends on the server.
//
// ── THE OWNER'S RULE, 2026-09-06 ────────────────────────────────────────────────────────────────
// The race is written LOCALLY FIRST, always. The server is a second store, never a gatekeeper. If
// the server is gone the race still runs to the end, the result is still kept, and it goes up
// later. Every function in this file holds that line: none of them awaits the network, none of
// them can fail in a way that reaches the result screen, and the entry is complete on disk before
// anything is sent.
//
// ── WHY THE ENTRY GREW RATHER THAN A SECOND STORE APPEARING ─────────────────────────────────────
// The history entry already existed (ResultScreen wrote it inline) and already carried what a
// person reads: the date, the track, the winners, the finish order. A separate "outbox" beside it
// would be a second list to keep in step with the first, and the two would drift the first time a
// race was deleted from one and not the other. So the entry gains two fields — `inputs`, which is
// what re-running needs, and `sync`, which is where the race is on its way to the server — and
// stays the single record of a race on this device.
//
// ── NOTHING IS DUPLICATED INSIDE THE ENTRY ──────────────────────────────────────────────────────
// `inputs` carries the RACE'S INPUTS and nothing else. The outcome — winners, finish order,
// duration — stays where it already was, at the top of the entry, and `toServerPayload` reads it
// from there. Writing the outcome twice would be two homes for one fact inside one object.
// ============================================================

import { storageGet, storageSet, KEYS, newId } from './storage/storage';
import { normalizeRaceActionStage } from './raceActionStage.js';
import { RACE_IDENTIFIER_VERSION } from './raceIdentifier.js';
import { raceIdentifierBuildId } from './raceIdentifierBuild.js';
import { DEFAULT_RACE_DEFAULTS } from './storage/defaults.js';

/** How many races the list keeps — the cap that has always been here. */
export const HISTORY_CAP = 100;

/** Where a race is on its way to the server. */
export const SYNC = {
  /** Not on the server yet. It will be sent on the next successful contact. */
  PENDING: 'pending',
  /** Stored on the server. */
  SENT: 'sent',
  /** The server refused it for a reason retrying cannot fix. Kept, and visible. */
  FAILED: 'failed',
};

/**
 * Cap the list WITHOUT ever dropping a race that has not reached the server.
 *
 * ★ THE CAP USED TO BE `history.slice(0, 100)`, full stop. That is now a way to lose a race: an
 * evening of more than a hundred races with the server down would push the earliest ones off the
 * end before they were ever sent, and nothing would say so. So the cap keeps the newest hundred
 * AND every entry behind them that is still `pending` or `failed`.
 *
 * The consequence is deliberate and worth stating: while races are unsent, the list can be LONGER
 * than a hundred. That is the trade — the cap exists to stop the list growing without bound, and a
 * race nobody has stored yet is not something to discard to save space. Entries written before this
 * piece have no `sync` at all and were never going to be sent, so they are capped as they always
 * were.
 */
export function capHistory(list) {
  const kept = list.slice(0, HISTORY_CAP);
  const rescued = list
    .slice(HISTORY_CAP)
    .filter((e) => e?.sync?.state === SYNC.PENDING || e?.sync?.state === SYNC.FAILED);
  return rescued.length ? [...kept, ...rescued] : kept;
}

/**
 * Build the entry for a finished race from the `raceResults` payload the race screen wrote.
 *
 * @param {object} parsed  sessionStorage `raceResults`: { finishOrder, elapsedTime, race, worldConfig }
 */
export function buildHistoryEntry(parsed) {
  const order = parsed?.finishOrder ?? [];
  const race = parsed?.race ?? {};
  const world = parsed?.worldConfig ?? null;
  const stage = normalizeRaceActionStage(race.raceActionStage);

  return {
    // ── unchanged: what the history has always carried, and what a person reads ──
    id: newId(),
    date: new Date().toISOString(),
    trackId: race.trackId,
    duration: parsed?.elapsedTime,
    playerCount: order.length,
    // SEED-REAL-RACE-1: `null` for a race from before the seed existed, and for the legacy unseeded
    // value 0 — a race that cannot be reproduced should say so rather than claim seed zero.
    seed: Number(race.racePlanSeed) > 0 ? Number(race.racePlanSeed) : null,
    // RACE-ACTION-CONTROL-1: stored beside the seed because the two together make an entry
    // reproducible.
    raceActionStage: stage,
    winners: order.slice(0, race.winners ?? DEFAULT_RACE_DEFAULTS.winners).map((r) => r.name),
    finishOrder: order,

    // ── RACE-SAVE-3: what re-running needs ──
    //
    // Every input `raceIdentifier.js` encodes, taken from the race that RAN. `world` is the value
    // the race screen carried forward; if it is absent — an entry written by an older build, or a
    // payload from before this piece — the inputs are marked incomplete rather than filled in from
    // this machine's current settings, which would describe a race nobody ran.
    inputs: world
      ? {
          identifierVersion: RACE_IDENTIFIER_VERSION,
          buildId: raceIdentifierBuildId(),
          geometryId: race.geometryId,
          racerTypeId: race.racerTypeId,
          names: (race.racers ?? []).map((r) => r.name),
          racePlanSeed: race.racePlanSeed,
          raceActionStage: stage,
          targetLaps: race.targetLaps,
          targetDurationSec: race.targetDurationSec,
          racePlanEnabled: !!race.racePlanEnabled,
          worldSchemaVersion: world.schemaVersion ?? null,
          worldConfigs: world.configs ?? {},
          racerTypeOverrides: world.racerTypeOverrides ?? {},
          effectiveRacerTypes: world.effectiveRacerTypes ?? {},
        }
      : null,

    // A race with no inputs cannot be stored usefully, so it is not queued for sending. It is still
    // kept locally and still read by a person, exactly as every entry before this piece is.
    sync: world ? { state: SYNC.PENDING } : null,
  };
}

/**
 * Turn a local entry into the body `POST /api/races` takes.
 *
 * NO TEAM IS SENT. The server reads it from the session — a client that could name a team could
 * file a race into somebody else's history.
 */
export function toServerPayload(entry) {
  return {
    clientRaceId: entry.id,
    finishedAt: entry.date,
    ...entry.inputs,
    elapsedSec: entry.duration,
    results: entry.finishOrder,
    winners: entry.winners,
  };
}

/** Read the list. Never throws: an unreadable store reads as empty. */
export function readHistory() {
  try {
    const list = storageGet(KEYS.RACE_HISTORY, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Write the list, capped.
 *
 * ★ RETURNS false RATHER THAN THROWING. The one thing this file may not do is interrupt the result
 * screen: a full quota or a blocked store is a reason to log, never a reason for the player to see
 * an error instead of who won.
 */
export function writeHistory(list) {
  let ok;
  try {
    // `storageSet` REPORTS failure rather than throwing it — it catches the quota error itself and
    // returns false (storage.js:91-100). Waiting for a throw here would therefore never fire, and
    // this function would have reported success for a write that did not happen. The try/catch
    // stays for the one thing storageSet cannot absorb: `capHistory` being handed something that
    // is not a list.
    ok = storageSet(KEYS.RACE_HISTORY, capHistory(list));
  } catch (err) {
    console.error('[history] the race could not be written to this device:', err?.message ?? err);
    return false;
  }
  if (!ok) {
    console.error(
      '[history] the race could not be written to this device — the store refused the write. ' +
        'The result is on screen and the race ran normally; this device has no record of it.'
    );
  }
  return ok;
}

/**
 * Record a finished race locally. THE FIRST THING THAT HAPPENS when a race ends, and the only one
 * that has to succeed.
 *
 * @returns {object|null} the entry, or null if it could not be built or written
 */
export function recordFinishedRace(parsed) {
  let entry;
  try {
    entry = buildHistoryEntry(parsed);
  } catch (err) {
    console.error('[history] the finished race could not be recorded:', err?.message ?? err);
    return null;
  }
  return writeHistory([entry, ...readHistory()]) ? entry : null;
}

/** Every race that still has to reach the server, oldest first so they arrive in the order they ran. */
export function pendingEntries() {
  return readHistory()
    .filter((e) => e?.sync?.state === SYNC.PENDING && e.inputs)
    .reverse();
}

/**
 * Update one entry's sync state in place.
 *
 * A race whose entry has since been deleted is a no-op rather than an error — the person removed
 * it, and re-adding it here would be the store arguing with them.
 */
export function setSyncState(id, sync) {
  const list = readHistory();
  const idx = list.findIndex((e) => e?.id === id);
  if (idx === -1) return false;
  const next = [...list];
  next[idx] = { ...next[idx], sync: { ...next[idx].sync, ...sync } };
  return writeHistory(next);
}

export function markSent(id, serverId) {
  return setSyncState(id, {
    state: SYNC.SENT,
    serverId,
    at: new Date().toISOString(),
    error: undefined,
  });
}

/**
 * The server refused this race for a reason retrying cannot fix.
 *
 * ★ IT IS NOT DELETED. The entry stays in the history with the reason attached, so a person can see
 * that this race never went up and why. Silently dropping it is the failure this records against.
 */
export function markFailed(id, error) {
  return setSyncState(id, {
    state: SYNC.FAILED,
    error: String(error ?? 'unknown'),
    at: new Date().toISOString(),
  });
}
