// ============================================================
// File:        playwright.prod.config.js
// Path:        client/playwright.prod.config.js
// Project:     RaceArena — PROD-ARM-1
//
// ★ EVERY BROWSER PROOF THIS PROJECT HAS TAKEN WAS TAKEN IN AN ENVIRONMENT THE OWNER DOES NOT USE.
//
// `playwright.config.js` points `baseURL` at a Vite DEV server and starts it with `npm run dev`. The
// owner runs a BUILT bundle served by the Node server. Those two differ in ways that hide defects:
// the dev transform resolves a missing named export to `undefined` where a bundle refuses outright,
// dev serves unminified modules one file at a time where production serves one tree-shaken chunk,
// and dev has no server-side HTML step at all.
//
// THIS IS THAT SECOND ARM. Same specs, same directory, run against the package as it ships.
//
// ── ★ WHAT USED TO BLOCK IT, AND WHY IT NO LONGER DOES ──────────────────────────────────────────
//
// The dev arm passes `VITE_API_URL` into the client's BUILD (`playwright.config.js`, webServer[1]).
// That was the only way the client could learn its API address, so a production arm would have had
// to bake an address into the bundle — which is exactly the thing RUNTIME-API-URL-1 removed.
//
// It is gone. `server/src/runtimeConfig.js` renders `window.__RA_RUNTIME_CONFIG__` from
// `RA_PUBLIC_ORIGIN` into the one `index.html` the server serves, and `services/api.js` reads it at
// runtime. So this arm needs NO build-time variable: it builds once, and the server tells the page
// where the API is when it hands the page over.
//
// The consequence is that this arm is SIMPLER than the dev arm, not harder — ONE process instead of
// two, because the server serves the client and the API on the same origin. Same-origin also means
// `RA_CLIENT_ORIGIN` is not needed here: there is no cross-origin request to allow.
//
// ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────────────────────────
//
//   · IT IS AN ARM, NOT A REPLACEMENT. `playwright.config.js` is untouched and still the default;
//     nothing that exists changes meaning. Run this one deliberately:
//         npx playwright test --config=playwright.prod.config.js
//   · IT IS NOT WIRED INTO `verify` OR CI. What it would cost and where it would belong are in the
//     report; wiring is a separate decision.
//   · IT DOES NOT BUILD THE CLIENT ITSELF. `client/dist` must exist — the same prerequisite
//     `docker compose` has, and for the same reason: a harness that rebuilds silently can be
//     measuring something other than the artefact you meant to test. It fails loudly if absent.
//   · IT SHARES `storageState` WITH THE DEV ARM. Both write `e2e/.auth/state.json`, so the two arms
//     must not run at the same time. They are separate commands; this is stated, not guarded.
// ============================================================

import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// ★ FIRST, AND THE ORDER IS LOAD-BEARING. This points the shared e2e environment at this arm's
// single origin before `e2e-env.js` below resolves its 4399/5399 defaults. ESM imports run in
// order, which is why it is a module and not an assignment further down. See its header.
import { PROD_PORT } from './e2e/prod-ports.js';
import { E2E, STATE_FILE } from './e2e/e2e-env.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, 'dist');

// LOUD-FAILURE RULE: a production arm with no production build is not a slower dev arm, it is a
// harness measuring nothing. Say so before Playwright starts anything.
if (!existsSync(join(DIST, 'index.html'))) {
  throw new Error(
    'PROD-ARM-1: there is no built client at client/dist.\n' +
      'This arm exists to test the BUILT package, so it refuses rather than falling back to dev.\n' +
      'Run `npm run build` in client/ first.'
  );
}

// Its own port (from prod-ports.js, the one home for it), so this arm can never collide with the
// dev arm's API (4399) or client (5399), and touches none of the owner's — 4000, 4173 and 5173.
const PROD_ORIGIN = `http://localhost:${PROD_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // E2E-ONE-WORKER-1: the same reason as the dev arm — one API, one team, one sign-in. See the note
  // in playwright.config.js; running this arm wide would reproduce exactly those false failures.
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: {
    // ★ THE WHOLE POINT: the built bundle, served by the Node server, on the server's own origin.
    baseURL: PROD_ORIGIN,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    {
      name: 'chromium-production',
      use: { ...devices['Desktop Chrome'], storageState: STATE_FILE },
      dependencies: ['setup'],
    },
  ],

  // ONE server. It serves the API and the built client together, which is how the package ships.
  webServer: [
    {
      command: 'npm start',
      cwd: '../server',
      url: `${PROD_ORIGIN}/api/auth/setup-needed`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(PROD_PORT),
        // Its own data directory, so this arm shares no track, user or session with anything else.
        RA_DATA_DIR: `${E2E.dataDir}-prod`,
        RA_SESSION_SECRET: E2E.sessionSecret,
        RA_BOOTSTRAP_TOKEN: E2E.bootstrapToken,
        // ★ The built client, and the address the server injects into it. Together these are what
        // makes this the production path: no VITE_API_URL anywhere.
        RA_CLIENT_DIST: DIST,
        RA_PUBLIC_ORIGIN: PROD_ORIGIN,
      },
    },
  ],
});
