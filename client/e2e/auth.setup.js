// ============================================================
// File:        client/e2e/auth.setup.js
// Path:        client/e2e/auth.setup.js
// Project:     RaceArena — E2E-LOGIN-1
//
// LOG IN ONCE, AND EVERY SPEC STARTS AUTHENTICATED.
//
// ── THE DEFECT THIS EXISTS FOR ──────────────────────────────────────────────────────────────────
// `ProtectedRoute` landed on 2026-06-14 and wraps every route in the app. No spec ever
// authenticated, so every spec that navigated was redirected to `/login` and then waited 30 s for a
// control it was never shown. WIRE-SUITES-1 measured it: 85 of 102 failing, and the only survivors
// were the pure `page.evaluate` arithmetic tests that never touch the UI. The suite had been dead
// for two months while specs kept being written against it, because nothing ran it.
//
// ── WHY A SETUP PROJECT AND NOT A HELPER ────────────────────────────────────────────────────────
// This is Playwright's own mechanism: a `setup` project writes `storageState`, and every other
// project DEPENDS on it and consumes that state through `use`. The alternative — an exported
// `login(page)` helper called from each spec — was rejected for one reason: **a spec author can
// forget to call it**, and the failure mode of forgetting is a 30 s timeout that looks exactly like
// the defect this fixture removes. Configuration cannot be forgotten. A new spec file dropped into
// `e2e/` is authenticated because of where it is, not because of what it remembers to import.
//
// ── NO CREDENTIAL EVER ENTERS THE REPOSITORY ────────────────────────────────────────────────────
// The account is CREATED for the run, the way a first-time user creates one, against a server that
// is started for the run with its own empty data directory:
//
//   1. `playwright.config.js` generates a bootstrap token, a session secret and a username and
//      password, all random per run, and hands them to the API it starts.
//   2. This file posts them to `/api/auth/setup`, the real first-run endpoint, gated by that token.
//   3. It then logs in THROUGH THE REAL LOGIN FORM, so the session cookie is issued by the same
//      path a user's would be — not injected.
//
// Nothing here is committed: the generated values live only in the process environment, and the
// saved state file is written under `client/e2e/.auth/`, which is gitignored.
//
// `RA_E2E_USERNAME` / `RA_E2E_PASSWORD` override the generated pair if someone wants to point this
// at an existing instance. They are read from the environment and, when the config cannot generate
// (see below), their absence FAILS with a message that says what to set.
//
// ── WHY IT DOES NOT TOUCH THE OWNER'S SERVER ────────────────────────────────────────────────────
// The old config pointed at `localhost:5173` with `reuseExistingServer: true`, so a run on this
// machine talked to whatever dev server happened to be up — the owner's, with the owner's data and
// the owner's login. This run is isolated on its own ports with its own data directory, so it can
// create an account without asking anybody for one and without disturbing anything.
// ============================================================

import { test as setup, expect } from '@playwright/test';
import { STATE_FILE, E2E } from './e2e-env.js';

setup('create an account and save the authenticated state', async ({ page, request }) => {
  // ── 1. The account. `/api/auth/setup` is the real first-run endpoint and is gated by the
  // bootstrap token; the isolated server has no setup marker, so it is open exactly once.
  const setupNeeded = await request.get(`${E2E.apiUrl}/api/auth/setup-needed`);
  expect(
    setupNeeded.ok(),
    `the isolated API did not answer at ${E2E.apiUrl}. It is started by playwright.config.js.`
  ).toBeTruthy();

  if ((await setupNeeded.json()).setupNeeded) {
    const created = await request.post(`${E2E.apiUrl}/api/auth/setup`, {
      headers: { 'x-bootstrap-token': E2E.bootstrapToken },
      data: { username: E2E.username, password: E2E.password },
    });
    expect(
      created.ok(),
      `first-run setup was refused (${created.status()}). The data directory is meant to be empty ` +
        `and the bootstrap token is generated for this run — see playwright.config.js.`
    ).toBeTruthy();
  }
  // If setup was NOT needed the instance is being reused deliberately (RA_E2E_* pointed at an
  // existing server), and the login below is the only step that matters.

  // ── 2. Log in through the REAL form. Injecting a cookie would be faster and would prove nothing
  // about the gate; the point of this suite is the product behind the gate, so the gate is used.
  await page.goto(`${E2E.appUrl}/login`);
  await page.getByLabel(/username/i).fill(E2E.username);
  await page.getByLabel(/password/i).fill(E2E.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // ── 3. Assert we are actually through it. Without this the state file would be saved whether or
  // not the login worked, and every spec would fail later with a redirect that looks like a new bug.
  await expect(
    page,
    'login did not leave /login — the saved state would have been an unauthenticated one'
  ).not.toHaveURL(/\/login/, { timeout: 15_000 });

  await page.context().storageState({ path: STATE_FILE });
});
