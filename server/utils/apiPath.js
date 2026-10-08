// ============================================================
// File:        apiPath.js
// Path:        server/utils/apiPath.js
// Project:     RaceArena — AUDIT-1 A5M-01 (2026-10-09)
// Description: The ONE answer to "is this request for the API?", as Express routes it.
//
// ── ★★ WHY THIS EXISTS: A CRITICAL BYPASS ─────────────────────────────────────────────────────────
// Express 4 matches mount paths IGNORING CASE: `app.use('/api/users', …)` also serves `/API/users`.
// The sign-in guard, the admin policy and the CSRF guard compared the path case-SENSITIVELY, so
// `/API/users` was "not an API path" to them and reached the users router with no session at all
// — an anonymous `POST /API/users` created an admin (AUDIT-1, reports/release/AUDIT-1.md, A5M-01).
// Every guard must judge the path in the same form the router matches it in, so they all ask here.
// ============================================================

/** The request path in the form the guards compare: lower case, as Express's routing ignores case. */
export function routingPath(path) {
  return String(path).toLowerCase();
}

/** True for `/api` and everything under `/api/`, in any letter case. */
export function isApiPath(path) {
  const p = routingPath(path);
  return p === '/api' || p.startsWith('/api/');
}
