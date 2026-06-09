// ============================================================
// File:        playwright.h05b.config.js
// Path:        client/playwright.h05b.config.js
// Project:     RaceArena
// Description: Playwright config for H-05 Phase 1b detached-node diagnosis.
//              TEMPORARY — remove after H-05 measurement.
//              Uses Chromium with --enable-precise-memory-info and --expose-gc.
//              Performance domain + HeapProfiler exposed via CDP session.
// ============================================================

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'h05-detached-node-diagnosis.spec.js',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: [
        '--enable-precise-memory-info',
        '--js-flags=--expose-gc',
        '--disable-web-security',
      ],
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
