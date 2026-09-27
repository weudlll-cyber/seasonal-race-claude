// ============================================================
// File:        cookiePolicy.js
// Path:        server/src/auth/cookiePolicy.js
// Project:     RaceArena — DELIVERY-CLEAN-3 piece 1 (B9)
// Created:     2026-09-27
//
// WHAT THIS OWNS: the single rule deciding whether the session cookie is marked `Secure`.
//
// ── WHY IT MOVED OUT OF session.js, WHICH IS THE ONLY CHANGE HERE ───────────────────────────────
//
// The rule was `session.js:23`, and it still behaves identically — this file is its new home and
// `session.js` re-exports it, so every existing caller (`authRouter.js:14`, `session.test.js:17`)
// is untouched.
//
// It had to move because `startupReadiness.js` now needs it, and `session.js` imports
// `better-sqlite3` and `express-session`. `startupReadiness.js`'s own header promises it "reads no
// files, starts nothing, and changes NO behaviour... so it can be tested without an environment" —
// importing a database driver into it to ask one question about a string would have broken that
// promise. ★ The alternative was to restate the four-line rule in the readiness file, which is a
// SECOND HOME for a rule, and this project's whole discipline is that a fact has one.
//
// ── THE `env` PARAMETER, AND WHY IT DEFAULTS ────────────────────────────────────────────────────
//
// `resolveCookieSecure` used to read `process.env` directly. It now takes the environment as an
// argument DEFAULTING to `process.env`, so every existing call is byte-for-byte unchanged in
// behaviour, while `startupReadinessLines` — which is handed an `env` object precisely so it can be
// judged without one — can ask the same question about the environment it was given.
// ============================================================

/**
 * Is the session cookie marked `Secure`?
 *
 * `RA_COOKIE_SECURE` overrides the environment-derived default so operators can set `secure:true`
 * on non-production HTTPS, or keep it false on production HTTP behind a terminating proxy that does
 * not set `NODE_ENV=production`. `'auto'` delegates to express-session's trust-proxy logic, which
 * means the answer is decided per-request and is NOT knowable here.
 *
 * @param {boolean} isProduction  `NODE_ENV === 'production'`.
 * @param {object}  [env]         the environment to read; defaults to the real one.
 * @returns {true|false|'auto'} `'auto'` means "decided per request by trust-proxy".
 */
export function resolveCookieSecure(isProduction, env = process.env) {
  const v = env.RA_COOKIE_SECURE;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'auto') return 'auto';
  return isProduction;
}
