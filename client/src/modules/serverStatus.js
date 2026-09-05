// ============================================================
// File:        serverStatus.js
// Path:        client/src/modules/serverStatus.js
// Project:     RaceArena — SERVER-GONE-1
//
// IS THE SERVER ANSWERING? A RECORD OF WHAT ALREADY HAPPENED — NOT A PROBE.
//
// ── WHAT THIS IS, AND THE ONE RULE IT KEEPS ─────────────────────────────────────────────────────
//
// This module NEVER makes a request. It has no timer, no retry, no queue and no reconnection logic;
// it holds one value and tells whoever is listening when that value changes. The value is written by
// the requests the application was going to make anyway — the auth probe at start-up, the track list,
// every service call — so knowing that the server is gone costs exactly nothing extra.
//
// WHY THAT RULE MATTERS RATHER THAN BEING A STYLE CHOICE: a status light that polls is a background
// job, and a background job that runs while a race is running competes with the race for the main
// thread. The one thing this must not do is cost the picture a frame to say the server is down.
//
// ── WHAT COUNTS AS UNREACHABLE, AND WHAT DELIBERATELY DOES NOT ──────────────────────────────────
//
// UNREACHABLE means the request never got an answer: a transport failure, a CORS refusal, or the
// timeout in `apiClient.js`. That is the case the player cannot otherwise see.
//
// An HTTP STATUS IS AN ANSWER — including 401, 403 and 500. The server is there and is refusing or
// failing, which is a different thing and a different message, and calling it "server unreachable"
// would send somebody to restart a backend that is already running. So any response, of any status,
// marks the server REACHABLE. This mirrors the split `AuthContext.jsx:58-68` already makes, where a
// network error with no status becomes `offline-hint` and anything with a status does not.
// ============================================================

/** @typedef {'unknown' | 'reachable' | 'unreachable'} ServerStatus */

/**
 * `unknown` until the first request resolves either way. The banner renders nothing in this state:
 * before anything has been tried, "the server is down" is a guess, and a status line that guesses is
 * worse than no status line.
 * @type {ServerStatus}
 */
let status = 'unknown';

const listeners = new Set();

function set(next) {
  if (next === status) return; // no spurious re-render on the steady state
  status = next;
  for (const fn of listeners) fn();
}

/** The server answered — with anything at all, including an error status. */
export function markServerReachable() {
  set('reachable');
}

/** The request never got an answer: transport failure, CORS, or the client-side timeout. */
export function markServerUnreachable() {
  set('unreachable');
}

/** @returns {ServerStatus} */
export function getServerStatus() {
  return status;
}

/**
 * Subscribe to changes. Returns the unsubscribe function, in the shape `useSyncExternalStore` wants.
 * @param {() => void} fn
 * @returns {() => void}
 */
export function subscribeServerStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Test seam: put the module back to how it starts. Not used by the application. */
export function resetServerStatus() {
  status = 'unknown';
}

// ── HOW THE VALUE GETS HERE ─────────────────────────────────────────────────────────────────────
//
// By EVENT, and the direction is deliberate. `services/apiClient.js` and `storage/trackLoader.js`
// are the two places that find out — and both are inside `raceCore.js`'s import closure, the hull
// `scripts/engine-reach.mjs` calls "what can change the race". If they imported this module, this
// module would join that hull: untrue, since it holds a string and no race reads it, and expensive,
// because every later edit here would then select the world-fingerprint guard.
//
// So they dispatch and this listens. The listener is registered when this module is first evaluated,
// which is at start-up — `App.jsx` imports the banner, the banner imports this — and therefore
// before the auth probe or the track list can resolve. A failure that somehow beat the import would
// be missed rather than mis-reported, and the next request corrects it.
if (typeof window !== 'undefined') {
  window.addEventListener('racearena:server-status', (e) => {
    if (e?.detail?.reachable) markServerReachable();
    else markServerUnreachable();
  });
}
