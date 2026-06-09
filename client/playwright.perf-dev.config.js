// ============================================================
// File:        playwright.perf-dev.config.js
// Path:        client/playwright.perf-dev.config.js
// Project:     RaceArena
// Description: Playwright config for PERF-REALITY DEV run (port 3000 dev server).
// ============================================================
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'perf-reality-check.spec.js',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    launchOptions: {
      args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 45_000,
  },
  reporter: [['list']],
});
