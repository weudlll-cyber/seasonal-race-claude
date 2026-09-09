// ============================================================
// File:        prod-ports.js
// Path:        client/e2e/prod-ports.js
// Project:     RaceArena — PROD-ARM-1
//
// ★ WHAT THIS OWNS: pointing the shared e2e environment at the PRODUCTION arm's single origin,
// before `e2e-env.js` resolves its defaults. That is all it does.
//
// WHY IT IS A SEPARATE FILE. `e2e-env.js` already reads `RA_E2E_API_PORT` and `RA_E2E_APP_PORT` from
// the environment and falls back to the dev arm's 4399/5399 — the override mechanism exists and is
// REUSED here rather than rebuilt. But ESM import declarations run in order and hoist above ordinary
// statements, so a `process.env.X = …` written inside `playwright.prod.config.js` would execute
// AFTER `e2e-env.js` had already frozen its values. Importing this module first is what makes the
// assignment land in time.
//
// ★ WHY BOTH PORTS ARE THE SAME NUMBER, and this is the shape of the production path rather than a
// shortcut: in production ONE Node server serves the API and the built client together, so the app
// and the API share an origin. The dev arm needs two ports because Vite is a second process; the
// production arm does not have one. `auth.setup.js` then reaches the API at that origin with no
// change to it at all.
//
// WHAT IT DELIBERATELY DOES NOT DO: it sets nothing else. The data directory, the session secret and
// the bootstrap token stay where they are, in `e2e-env.js` and the prod config's `webServer` block.
// ============================================================

/** The production arm's single origin. Chosen to collide with nothing: the dev arm holds 4399 and
 *  5399, and 4000 / 4173 / 5173 are the owner's. */
export const PROD_PORT = 4599;

process.env.RA_E2E_API_PORT = String(PROD_PORT);
process.env.RA_E2E_APP_PORT = String(PROD_PORT);
