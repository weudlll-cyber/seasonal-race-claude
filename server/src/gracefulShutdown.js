// ============================================================
// File:        gracefulShutdown.js
// Path:        server/src/gracefulShutdown.js
// Project:     RaceArena — AUDIT-1 A10-01 (2026-10-09)
// Description: On SIGTERM or SIGINT the server finishes what it is doing and exits 0, instead of
//              being killed in the middle of it.
//
// ── WHY ─────────────────────────────────────────────────────────────────────────────────────────
// In the image, node runs as PID 1 (`docker-entrypoint.sh` execs it). PID 1 gets NO default signal
// handling, so with no handler a SIGTERM from `docker stop`, `docker compose down` or
// `racearena update` was ignored and the container was SIGKILLed — measured: exit 137. A request in
// flight at that moment, a race being saved or a password being changed, was cut off mid-answer.
//
// ── WHAT IT DOES, AND WHAT IT DELIBERATELY DOES NOT ─────────────────────────────────────────────
// `server.close()` stops accepting connections and calls back once every in-flight request has
// answered; on Node 19+ it also drops idle keep-alive sockets, so an open browser tab cannot hold
// the close open. Then the process exits 0. If something does hold it — a stuck upload — the exit
// is forced after `timeoutMs`, inside Docker's default 10 s grace period, so the outcome is never
// worse than before.
//
// It does NOT close the databases by hand. Both are SQLite with a rollback journal and every JSON
// store writes by atomic rename, so the files are consistent at any instant; better-sqlite3 closes
// its handles at exit. Reaching into each store to close it would couple this file to all of them
// for no gain in safety.
// ============================================================

/** How long in-flight requests get before the exit is forced — under Docker's 10 s grace period. */
export const SHUTDOWN_TIMEOUT_MS = 8000;

/**
 * Install the handlers. Returns the function the signals call, so a test can drive it directly.
 *
 * @param {import('node:http').Server} server  what `listenOn` returned
 * @param {object} [opts]
 * @param {NodeJS.EventEmitter} [opts.signals]  the process (a test passes its own emitter)
 * @param {(code: number) => void} [opts.exit]  `process.exit` (a test records the call instead)
 * @param {number} [opts.timeoutMs]
 * @param {(msg: string) => void} [opts.log]
 */
export function installGracefulShutdown(
  server,
  {
    signals = process,
    exit = (code) => process.exit(code),
    timeoutMs = SHUTDOWN_TIMEOUT_MS,
    log = (msg) => console.warn(msg),
  } = {}
) {
  let stopping = false;
  const shutdown = (signal) => {
    if (stopping) return; // a second Ctrl+C while closing changes nothing
    stopping = true;
    log(`[shutdown] ${signal}: finishing in-flight requests, then exiting`);
    const force = setTimeout(() => {
      log(`[shutdown] requests still open after ${timeoutMs} ms; exiting anyway`);
      exit(1);
    }, timeoutMs);
    force.unref();
    server.close(() => {
      clearTimeout(force);
      exit(0);
    });
  };
  for (const s of ['SIGTERM', 'SIGINT']) signals.once(s, () => shutdown(s));
  return shutdown;
}
