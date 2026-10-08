// ============================================================
// File:        verifyOffMainThread.js
// Path:        server/src/races/verifyOffMainThread.js
// Project:     RaceArena — VERIFY-OFF-MAIN-1 (2026-10-07)
// Description: Runs a verify's replay on a worker thread, ONE AT A TIME per server.
//
// ★ WHY. A replay is one full race of the engine: 1.5–2.3 s at 20 racers and 3.5–5.4 s at 40,
// measured over 89 verifies in a 9-hour soak (reports/release/SOAK-1.md). On the server's own thread
// that is how long EVERY other request waited — sign-in, history, the static files — and the soak
// counted connection errors that fell inside those windows. On a worker the main thread stays free.
//
// ★ ONE AT A TIME. A worker is a second V8 instance with the whole engine loaded; two verifies at
// once would double that for an admin-only action that is rare by design. A second request while one
// runs gets `BUSY`, which the route answers with 429.
//
// ★ A worker thread, not a child process: the production server spawns no processes, and the audit
// that established it (SOAK-1 part A) is a property worth keeping.
//
// ★ BOUNDED IN TIME AND MEMORY (AUDIT-1 A5M-10). The replay's own 200 s ceiling is SIMULATED time;
// the field size is the stored roster's length, bounded only by the 1 MB body. So the worker is
// stopped after VERIFY_TIMEOUT_MS of wall clock — ten times the slowest verify measured (5.4 s at 40
// racers) — and its heap is capped, so a hostile record costs one admin a 500 rather than holding
// the one verify slot, or the server's memory, indefinitely.
// ============================================================

import { Worker } from 'node:worker_threads';

const WORKER_URL = new URL('./verifyReplay.worker.js', import.meta.url);

/** Wall clock a verify may take before its worker is stopped. */
export const VERIFY_TIMEOUT_MS = 60_000;
/** The worker's heap cap. A 40-racer replay fits well inside it (racesVerify.test.js). */
const WORKER_HEAP_MB = 512;

/** Returned instead of a promise when a verify is already running. */
export const BUSY = Symbol('verify busy');

let running = false;

/**
 * Re-race one stored record on a worker thread.
 *
 * @param {object} race    the stored record, as the store returns it
 * @param {object[]} tracks this installation's track records
 * @param {{ timeoutMs?: number }} [opts] the wall-clock bound; tests shorten it, the route does not
 * @returns {typeof BUSY | Promise<{result?: object, refusal?: string, unavailable?: true, error?: string}>}
 *   `BUSY` when another verify is running; otherwise the worker's one message. A worker that dies
 *   without one, or runs past the bound, resolves to `{ error }`, so the caller always gets an answer.
 */
export function verifyOffMainThread(race, tracks, { timeoutMs = VERIFY_TIMEOUT_MS } = {}) {
  if (running) return BUSY;
  running = true;
  let worker;
  try {
    worker = new Worker(WORKER_URL, {
      workerData: { race, tracks },
      resourceLimits: { maxOldGenerationSizeMb: WORKER_HEAP_MB },
    });
  } catch (e) {
    running = false;
    throw e;
  }
  return new Promise((resolve) => {
    let answered = false;
    const answer = (msg) => {
      if (answered) return;
      answered = true;
      clearTimeout(timer);
      running = false;
      resolve(msg);
    };
    const timer = setTimeout(() => {
      answer({ error: `the verify did not finish within ${timeoutMs} ms and was stopped` });
      worker.terminate();
    }, timeoutMs);
    worker.once('message', answer);
    worker.once('error', (e) => answer({ error: e?.stack ?? String(e) }));
    worker.once('exit', (code) =>
      answer({ error: `the verify worker exited with code ${code} and no answer` })
    );
  });
}
