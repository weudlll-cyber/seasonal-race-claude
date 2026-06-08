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

const UNREACHABLE_MSG =
  'Server not reachable. Check that the backend is running (docker compose up in the project root), then try again.';

class TimeoutError extends Error {
  constructor() {
    super(UNREACHABLE_MSG);
    this.code = 'TIMEOUT';
  }
}

export function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), ms)),
  ]);
}

export async function apiCall(url, options = {}) {
  let res;
  try {
    res = await withTimeout(fetch(url, options), TIMEOUT_MS);
  } catch (err) {
    throw new Error(err.code === 'TIMEOUT' ? err.message : UNREACHABLE_MSG);
  }
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) errMsg = body.error;
    } catch {
      // ignore parse failure
    }
    throw new Error(errMsg);
  }
  return res;
}
