// ============================================================
// File:        serverRecoveryProbe.js
// Path:        client/src/modules/serverRecoveryProbe.js
// Project:     RaceArena — OFFLINE-1 F2 (the owner's decision of 2026-10-18)
// Description: WHILE THE SERVER IS NOT ANSWERING, ASK IT — LIGHTLY — WHETHER IT IS BACK.
//
// OFFLINE-1 measured that after an outage the red banner and the pending race waited for the app's
// NEXT request: on the result screen, 10 s after the server returned, the banner still said it was
// not answering and the race was still pending. This module closes that gap and nothing else:
//
//   · ONLY in the `unreachable` state (serverStatus.js) it sends `GET /api/health` — the public,
//     cheapest route — every RECOVERY_PROBE_MS, and stops the moment the state leaves `unreachable`.
//     While the server answers, nothing here runs: serverStatus.js's "a status light that polls
//     competes with the race" stays true for every normal minute.
//   · It reports through the SAME event every request uses (`racearena:server-status`, the idiom of
//     services/apiClient.js), so an answer marks the server reachable, the banner clears, and
//     pendingRaces.js's existing flush sends the pending races — the one send path, reused, not a
//     second one.
//   · `racearena:server-check` asks for ONE probe now, unless the 10 s clock is already running
//     (then the clock's next probe answers it). bgImageCache.js sends it when a
//     track background fails to load: the race makes no requests of its own, so without it an outage
//     that began before the race started went unnoticed until the race ended (finding F3).
//
// It never retries a probe that is still in flight, and a probe that gets no answer within
// PROBE_TIMEOUT_MS counts as no answer.
// ============================================================

import { API_BASE_URL } from '../services/api.js';
import { getServerStatus, subscribeServerStatus } from './serverStatus.js';

/** How often the server is asked while it is not answering. */
export const RECOVERY_PROBE_MS = 10_000;

/** A probe with no answer by then is a probe with no answer. */
const PROBE_TIMEOUT_MS = 5_000;

function report(reachable) {
  window.dispatchEvent(new CustomEvent('racearena:server-status', { detail: { reachable } }));
}

/**
 * Ask once. ANY response, of any status, is an answer (serverStatus.js's rule).
 * @returns {Promise<boolean>} whether the server answered
 */
export async function probeServerOnce() {
  try {
    await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    report(true);
    return true;
  } catch {
    report(false);
    return false;
  }
}

/**
 * Run the probe for the life of the application. Mounted by `ServerRecoveryProbe.jsx`.
 * @returns {() => void} stop
 */
export function startServerRecoveryProbe({ intervalMs = RECOVERY_PROBE_MS } = {}) {
  let timer = null;
  let inFlight = false;

  const probe = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      await probeServerOnce();
    } finally {
      inFlight = false;
    }
  };

  // Start the clock on entering `unreachable`, stop it on leaving. Nothing runs in any other state.
  const follow = () => {
    const down = getServerStatus() === 'unreachable';
    if (down && timer === null) timer = setInterval(probe, intervalMs);
    if (!down && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  // One check on request — unless the clock is already running, which asks anyway (measured: a
  // background retry every 10 s otherwise doubled the probes during an outage).
  const check = () => {
    if (timer === null) probe();
  };

  follow();
  const unsubscribe = subscribeServerStatus(follow);
  window.addEventListener('racearena:server-check', check);

  return () => {
    unsubscribe();
    window.removeEventListener('racearena:server-check', check);
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
}
