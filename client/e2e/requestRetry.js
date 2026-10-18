// ============================================================
// File:        client/e2e/requestRetry.js
// Path:        client/e2e/requestRetry.js
// Project:     RaceArena — APPREADY-HANGUP-1 (2026-10-18)
//
// ONE SECOND CHANCE FOR A CONNECTION THE SERVER DROPPED — AND ONLY FOR THAT.
//
// The Browser gate failed twice (2026-10-01 on master `fc4dd636`, 2026-10-18 on `1bbc3d33`, a
// docs-only commit) on the same line: `appReady.js`'s geometry-key read, `page.request.get(…/api/
// tracks)`, rejected with `apiRequestContext.get: socket hang up` — the connection closed before any
// answer, while the server stayed up and every later spec passed. The server's side was looked for
// in the run's transcript and found silent; the cause is NOT proven. (One candidate, not shown: a
// pooled keep-alive connection closed by the server — Node's default `keepAliveTimeout` is 5 s and
// the server sets none — at the moment the client reuses it.)
//
// So this retries, bounded, and narrowly:
//   · at most `attempts` (3) tries, with `pauseMs` (250 ms) between them;
//   · ONLY when the request REJECTED with a dropped-connection error (socket hang up, ECONNRESET,
//     ECONNREFUSED, EPIPE, ECONNABORTED) — never on an HTTP status: Playwright's `request.get`
//     resolves with a 4xx or 5xx response, and that response is returned as it is, so a server that
//     answers wrongly still fails the spec on its first answer;
//   · anything else is thrown at once, and the last attempt's error is thrown unchanged.
//
// Deliberately free of Playwright imports, so `requestRetry.spec.js` can drive it against a server
// that drops exactly one connection.
// ============================================================

/** The errors that mean "the connection went away before an answer", and nothing else. */
const CONNECTION_DROPPED = /socket hang up|ECONNRESET|ECONNREFUSED|EPIPE|ECONNABORTED/i;

/** @param {unknown} err */
export const isDroppedConnection = (err) => CONNECTION_DROPPED.test(String(err?.message ?? err));

/**
 * `request.get(url)`, tried again only after a dropped connection.
 *
 * @param {{ get: (url: string) => Promise<any> }} request  a Playwright APIRequestContext
 * @param {string} url
 * @param {{ attempts?: number, pauseMs?: number }} [opts]
 */
export async function getWithConnectionRetry(request, url, { attempts = 3, pauseMs = 250 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await request.get(url);
    } catch (err) {
      if (attempt >= attempts || !isDroppedConnection(err)) throw err;
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }
}
