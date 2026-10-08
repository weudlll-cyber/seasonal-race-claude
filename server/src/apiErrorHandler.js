// ============================================================
// File:        apiErrorHandler.js
// Path:        server/src/apiErrorHandler.js
// Project:     RaceArena — AUDIT-1 A5M-08 (2026-10-09)
// Description: The app's LAST middleware: an error that reaches it is answered as the API answers,
//              never with Express's default page.
//
// ── WHY IT EXISTS ───────────────────────────────────────────────────────────────────────────────
// With no error handler of its own, a malformed JSON body, an over-limit body or a throw in a route
// went to Express's `finalhandler`, which — whenever NODE_ENV is not "production", and the image
// does not set it — answers with an HTML page CARRYING THE STACK TRACE: file paths and module names
// handed to any caller who sends one bad byte.
//
// ── ★ THE BODY IS CHOSEN SO NOTHING A PERSON SEES CHANGES ────────────────────────────────────────
// `{ error: 'HTTP <status>' }`, and the status is unchanged. The client shows `body.error` when it
// can parse one and `HTTP <status>` when it cannot (client/src/services/apiClient.js `request`), and
// the old HTML page could not be parsed — so the client showed `HTTP 500` before and shows it now.
// A more descriptive message would be a visible change, which this fix is not allowed to make.
//
// ── ★ WHAT IS LOGGED, AND WHAT IS NOT ───────────────────────────────────────────────────────────
// A 5xx is a fault of ours: its stack goes to the server log, where the operator needs it.
// A 4xx is the caller's mistake, and its MESSAGE IS NOT LOGGED: on Node 20 a JSON parse error quotes
// the start of the body, which for a malformed sign-in is the password. Only the status and the
// error's `type` (e.g. `entity.parse.failed`) are logged.
// ============================================================

/**
 * Express error middleware (four arguments — that arity is what makes it one).
 * @type {import('express').ErrorRequestHandler}
 */
export function apiErrorHandler(err, req, res, next) {
  // A response already under way cannot be replaced; Express's own handler closes the connection.
  if (res.headersSent) return next(err);
  const raw = Number(err?.status ?? err?.statusCode);
  const status = raw >= 400 && raw < 600 ? raw : 500;
  if (status >= 500) console.error(`[api] ${req.method} ${req.path} → ${status}`, err);
  else console.warn(`[api] ${req.method} ${req.path} → ${status} (${err?.type ?? 'client error'})`);
  res.status(status).json({ error: `HTTP ${status}` });
}
