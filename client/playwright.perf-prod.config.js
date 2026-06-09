// ============================================================
// File:        playwright.perf-prod.config.js
// Path:        client/playwright.perf-prod.config.js
// Project:     RaceArena
// Description: Playwright config for PERF-REALITY PROD run (port 4173 preview).
// ============================================================
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'perf-reality-check.spec.js',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    launchOptions: {
      args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'],
    },
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 45_000,
  },
  reporter: [['list']],
});
