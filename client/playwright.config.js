// ============================================================
// File:        playwright.config.js
// Path:        client/playwright.config.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Playwright e2e test configuration — headless Chromium,
//              dev-server auto-start, screenshot/video on failure
// ============================================================

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
});
