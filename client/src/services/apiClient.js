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

const UNREACHABLE_MSG =
  'Server not reachable. Check that the backend is running (docker compose up in the project root), then try again.';

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
