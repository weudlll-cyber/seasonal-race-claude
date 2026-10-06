// ============================================================
// File:        asyncRoute.js
// Path:        server/utils/asyncRoute.js
// Project:     RaceArena — SERVER-DEFECTS-1
// Description: An `async` Express route handler whose failure is ANSWERED, not lost.
//
// ── THE DEFECT IT EXISTS FOR ────────────────────────────────────────────────────────────────────
// Express 4 calls a handler and ignores what it returns. When an `async` handler throws — an
// explicit rethrow, or a synchronous throw outside any `try` (an `async` function turns that into a
// rejected promise too) — nobody catches the rejection: the request never gets an answer, and under
// Node's default `--unhandled-rejections=throw` the whole server process exits. Found documenting
// the API (TIDY-C-3, 2026-10-06): `POST /api/races/:shortKey/verify` rethrew any error that was not
// a refusal.
//
// ── WHAT IT DOES ────────────────────────────────────────────────────────────────────────────────
// Runs the handler and, if it fails, logs the error server-side with the route it came from and
// answers `500 { error: 'internal error' }` — the wording every other 500 of this server uses — so
// the request ends and the server keeps running. If the handler had already started answering, the
// error is still logged and nothing more is written.
// ============================================================

/**
 * @param {string} label  the log prefix, e.g. 'races' — the same tag the route's own logs use
 * @param {(req, res, next) => Promise<unknown>} handler
 * @returns {(req, res, next) => void}
 */
export function asyncRoute(label, handler) {
  return function answeredAsyncRoute(req, res, next) {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch((err) => {
        console.error(`[${label}] ${req.method} ${req.originalUrl} failed:`, err?.stack ?? err);
        if (!res.headersSent) res.status(500).json({ error: 'internal error' });
      });
  };
}
