// ============================================================
// File:        playwright.h05.config.js
// Path:        client/playwright.h05.config.js
// Project:     RaceArena
// Description: Playwright config for H-05 cache+leak diagnostic measurement.
//              TEMPORARY — remove after H-05 measurement.
//              Targets port 3000 (standard dev server port per project convention).
//              Forces Chromium with performance.memory enabled via --enable-precise-memory-info.
// ============================================================

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'h05-cache-leak-measurement.spec.js',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
