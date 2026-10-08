// ============================================================
// File:        verifyReplay.worker.js
// Path:        server/src/races/verifyReplay.worker.js
// Project:     RaceArena — VERIFY-OFF-MAIN-1 (2026-10-07)
// Description: The worker thread a verify runs in. It re-races ONE stored record with the shared
//              replay (`scripts/lib/storedRaceReplay.mjs`, unchanged) and posts back exactly one
//              message: the result, a refusal, the engine being absent, or an error.
//
// Started by `verifyOffMainThread.js` with `workerData: { race, tracks }`. Only the fields the route
// answers with are posted back — the replay's per-racer `rows` stay here.
// ============================================================

import { parentPort, workerData } from 'node:worker_threads';

let replay = null;
try {
  // The engine pulls in `client/src`; an image built without it must still answer, with 501.
  replay = await import('../../../scripts/lib/storedRaceReplay.mjs');
} catch {
  parentPort.postMessage({ unavailable: true });
}

if (replay) {
  try {
    const r = replay.replayStoredRace(workerData.race, { tracks: workerData.tracks });
    parentPort.postMessage({
      result: {
        firstDiff: r.firstDiff,
        posMatch: r.posMatch,
        timeMatch: r.timeMatch,
        n: r.n,
        track: r.track,
        racers: r.racers,
      },
    });
  } catch (e) {
    parentPort.postMessage(
      e instanceof replay.StoredRaceRefusal
        ? { refusal: e.message }
        : { error: e?.stack ?? String(e) }
    );
  }
}
