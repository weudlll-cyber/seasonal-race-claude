// ============================================================
// File:        playwright.config.js
// Path:        client/playwright.config.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Playwright e2e configuration — headless Chromium, an ISOLATED API and client
//              started for the run, and a setup project that authenticates once so every spec
//              starts logged in (E2E-LOGIN-1).
//
// ── NIGHT WORK ONLY. This suite is deliberately NOT in the per-push CI path and not in
// `npm run verify`'s ordinary routing: it costs about ten minutes, five times the whole of CI, and
// its flake budget is unknown. The owner decided that on 2026-08-16. The command and the reason
// live in docs/NIGHT-RUN.md, which is their one home.
//
// ── WHY TWO SERVERS AND NOT THE DEV SERVER ──────────────────────────────────────────────────────
// This file used to start `npm run dev -- --port 5173` with `reuseExistingServer: true`, which
// meant a run on this machine silently tested whatever was already listening — the owner's dev
// server, his data and his login. That is also why the suite could never authenticate: there was no
// account it was entitled to create.
//
// Now the run brings its own API on its own port with its own empty data directory, so it can
// create a first account the way any new user would, and its own Vite pointed at that API. Nothing
// it does touches 4000, 5173 or 4173.
// ============================================================

import { defineConfig, devices } from '@playwright/test';
import { E2E, STATE_FILE } from './e2e/e2e-env.js';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  // The old config had no explicit timeout, so a spec blocked at the login gate sat for Playwright's
  // default. 30 s is long enough for a real page and short enough that a suite-wide failure reports
  // in minutes instead of half an hour.
  timeout: 30_000,
  use: {
    baseURL: E2E.appUrl,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // ── THE FIXTURE, AS CONFIGURATION RATHER THAN AS A HABIT ───────────────────────────────────────
  // `setup` runs first and writes the authenticated browser state; `chromium` depends on it and
  // consumes that state for EVERY spec under testDir. A new spec file is authenticated because of
  // where it lives, not because its author remembered to call a helper — which matters, because the
  // failure mode of forgetting is a 30 s timeout that looks exactly like the defect this removes.
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STATE_FILE },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      // The isolated API. RA_DATA_DIR is the server's own documented redirect for all runtime
      // storage, so this instance shares no track, no user and no session with anything else.
      command: 'npm start',
      cwd: '../server',
      url: `${E2E.apiUrl}/api/auth/setup-needed`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(E2E.apiPort),
        RA_DATA_DIR: E2E.dataDir,
        RA_SESSION_SECRET: E2E.sessionSecret,
        RA_BOOTSTRAP_TOKEN: E2E.bootstrapToken,
        // corsOptions is built ONCE at module load, so the client's origin has to be known here —
        // a port missing from this list looks exactly like a dead backend from the browser.
        RA_CLIENT_ORIGIN: E2E.appUrl,
      },
    },
    {
      command: `npm run dev -- --port ${E2E.appPort} --strictPort`,
      url: E2E.appUrl,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_URL: E2E.apiUrl },
    },
  ],

  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
});
