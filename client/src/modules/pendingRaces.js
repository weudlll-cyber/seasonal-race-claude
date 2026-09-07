// ============================================================
// File:        pendingRaces.js
// Path:        client/src/modules/pendingRaces.js
// Project:     RaceArena — RACE-SAVE-3
// Created:     2026-09-06
// Description: SENDING A RACE THAT IS ALREADY SAFE. Everything here runs after the race is on disk,
//              so everything here is allowed to fail.
//
// ── THERE IS NO POLLING, NO TIMER AND NO RECONNECTION LOOP ──────────────────────────────────────
// The owner's rule and SERVER-GONE-1's design agree, so this piece reuses that signal rather than
// inventing a second one. `serverStatus.js` never makes a request: it records what the requests the
// application was making anyway already found out, and it says why in its own header — "a status
// light that polls is a background job, and a background job that runs while a race is running
// competes with the race for the main thread."
//
// So the trigger is `serverStatus` becoming `reachable`. That transition happens because some
// OTHER request succeeded — the auth probe, the track list, a save — which is exactly "the next
// successful contact the client makes anyway". Nothing here asks the server whether it is back.
//
// ── WHY A FAILED SEND IS NOT AN ERROR ANYWHERE ──────────────────────────────────────────────────
// The race is already recorded. A send that fails leaves the entry `pending` and returns; the
// player is told nothing, because there is nothing they need to do. The banner from SERVER-GONE-1
// already says the server is not answering, and it says it once for the whole application rather
// than once per race.
//
// The ONE case that is not silent is a race the server refuses for a reason retrying cannot fix.
// That is recorded on the entry as `failed` WITH the reason (`raceHistory.markFailed`), because a
// race that will never go up must not look the same as one that has not gone up yet.
// ============================================================

import { postRace } from '../services/racesApi.js';
import { pendingEntries, toServerPayload, markSent, markFailed } from './raceHistory.js';
import { getServerStatus, subscribeServerStatus } from './serverStatus.js';

/**
 * Send one entry. Never throws.
 *
 * @returns {'sent'|'failed'|'kept'} `kept` means it is still pending and should be tried again.
 */
export async function sendOne(entry) {
  let res;
  try {
    res = await postRace(toServerPayload(entry));
  } catch (err) {
    // A transport failure, a timeout, or a 5xx. The server may well take it next time, so the
    // entry stays exactly as it is.
    console.warn(
      '[races] a finished race could not be sent yet; it stays on this device:',
      err?.message ?? err
    );
    return 'kept';
  }

  if (res.ok) {
    markSent(entry.id, res.id);
    return 'sent';
  }

  if (res.retryable) return 'kept';

  // Refused for good. Recorded against the entry, never discarded.
  console.error(`[races] the server refused a finished race and will not take it: ${res.error}`);
  markFailed(entry.id, res.error);
  return 'failed';
}

// A flush in progress. Two flushes at once would send the same race twice — harmless, because the
// server dedupes on the client id, but pointless, so they are simply not started.
let flushing = false;

/**
 * Send every race that has not reached the server, oldest first.
 *
 * ★ STOPS AT THE FIRST `kept`. If one race cannot be sent the server is not taking races, and
 * walking the rest of the list to fail identically costs a request each and reorders nothing. The
 * next successful contact starts again from the oldest.
 *
 * @returns {Promise<{sent: number, failed: number, kept: number}>}
 */
export async function flushPendingRaces() {
  if (flushing) return { sent: 0, failed: 0, kept: 0 };
  flushing = true;
  const out = { sent: 0, failed: 0, kept: 0 };
  try {
    for (const entry of pendingEntries()) {
      const result = await sendOne(entry);
      if (result === 'kept') {
        out.kept += 1;
        break;
      }
      out[result === 'sent' ? 'sent' : 'failed'] += 1;
    }
  } finally {
    flushing = false;
  }
  return out;
}

/**
 * Flush whenever the server becomes reachable, and once now if it already is.
 *
 * Registered by `PendingRaceSync.jsx` at mount. Returns the unsubscribe function.
 */
export function startPendingRaceSync() {
  let last = getServerStatus();

  // If the application already knows the server is answering, races left over from a previous
  // session go now rather than waiting for the status to change — a status that is already
  // `reachable` never transitions, so waiting for a transition would strand them until the next
  // outage. `flushPendingRaces` is a no-op when nothing is pending.
  if (last === 'reachable') flushPendingRaces();

  return subscribeServerStatus(() => {
    const now = getServerStatus();
    const cameBack = now === 'reachable' && last !== 'reachable';
    last = now;
    if (cameBack) flushPendingRaces();
  });
}
