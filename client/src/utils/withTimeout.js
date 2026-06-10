// ============================================================
// File:        withTimeout.js
// Path:        client/src/utils/withTimeout.js
// Project:     RaceArena
// Description: Shared promise timeout utility for storage loaders.
//              Races a promise against a plain rejection after ms.
//              (apiClient.js has its own separate withTimeout that
//              throws a user-facing TimeoutError — keep them distinct.)
// ============================================================

export function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}
