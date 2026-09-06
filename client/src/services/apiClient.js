// ============================================================
// File:        apiClient.js
// Path:        client/src/services/apiClient.js
// Project:     RaceArena
// Description: Shared fetch boilerplate for API service modules.
//              Provides withTimeout (user-facing timeout with server
//              diagnostic message) and apiCall (error-propagating
//              fetch wrapper). Used by trackApi.js and surfaceClassApi.js.
//
//              Note: storage/trackLoader.js and storage/surfaceClassLoader.js
//              have their own minimal withTimeout that throws a plain 'timeout'
//              error caught internally for silent fallback. Those are intentionally
//              different and remain separate.
// ============================================================

const TIMEOUT_MS = 8000;

/**
 * SERVER-GONE-1: say whether the server answered, WITHOUT importing anything.
 *
 * ★ WHY AN EVENT AND NOT AN IMPORT. `client/src/services/api.js` and this file are inside
 * `raceCore.js`'s import closure — the hull `scripts/engine-reach.mjs` calls "what can change the
 * race". Importing a status module from here would drag that module into the hull too, which is
 * both untrue (it holds a string) and expensive: every future edit to it would then select the
 * world-fingerprint guard. The dependency is inverted instead, using the idiom this file already
 * uses for 401 a few lines below, so the listener imports the emitter and never the other way.
 *
 * @param {boolean} reachable
 */
function reportServerReachable(reachable) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('racearena:server-status', { detail: { reachable } }));
}

// ── PLAYER-WORDS-1: THIS STRING REACHES THE PLAYER, so it does not name a command ──────────────
//
// It is the message of the Error every service call throws when the server does not answer, and
// screens render it verbatim — `SetupScreen/PlayerGroupPicker.jsx:145` prints "Saved groups could
// not be loaded (…)" with this text inside the brackets. The owner saw it on his own setup screen:
// it told whoever was standing there to run `docker compose up` in the project root.
//
// A person at the screen during an event cannot act on that, and does not have the project root.
// What they CAN act on is waiting, and knowing the evening is not over — which the status banner
// above already tells them in full, so this points at it rather than repeating it.
//
// ★ THE PHRASE "Server not reachable" IS KEPT DELIBERATELY. Four test files and the Dev Screen's
// own alerts match on it, and it is honest player language for the condition; what was wrong was
// the instruction after it, not the diagnosis.
//
// THE DEVELOPER DETAIL IS NOT LOST — it moves to the console, which is where developers read, in
// `reportServerReachable` below.
const UNREACHABLE_MSG =
  'Server not reachable. Try again in a moment — the banner at the top of the screen says what still works without it.';

/** The instruction that used to be shown to players. Console only, and said once per failure. */
const DEV_HINT =
  '[api] the server did not answer. If you are running this locally: `docker compose up` in the project root.';

class TimeoutError extends Error {
  constructor() {
    super(UNREACHABLE_MSG);
    this.code = 'TIMEOUT';
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), ms)),
  ]);
}

export async function apiCall(url, options = {}) {
  const { _skipAuthRedirect = false, ...rest } = options;
  let res;
  try {
    res = await withTimeout(fetch(url, { credentials: 'include', ...rest }), TIMEOUT_MS);
  } catch (err) {
    // SERVER-GONE-1: the failure this function already knew about, said once where the interface
    // can hear it. Nothing new is requested and nothing is retried — this is the same throw as
    // before with a note attached, so every caller behaves exactly as it did.
    reportServerReachable(false);
    console.warn(DEV_HINT);
    throw new Error(err.code === 'TIMEOUT' ? err.message : UNREACHABLE_MSG);
  }
  // ANY response means the server is there. A 401 or a 500 is an ANSWER, and reporting it as
  // "unreachable" would send somebody to restart a backend that is already running.
  reportServerReachable(true);
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) errMsg = body.error;
    } catch {
      // ignore parse failure
    }
    const err = new Error(errMsg);
    err.status = res.status;
    if (res.status === 401 && !_skipAuthRedirect) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('racearena:unauthorized'));
      }
    }
    throw err;
  }
  return res;
}
