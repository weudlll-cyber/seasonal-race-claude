// ============================================================
// File:        playwright.basepath.config.js
// Path:        client/playwright.basepath.config.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 2
// Created:     2026-11-11
// Description: The BUILT client served by the real server UNDER A BASE PATH (RA_BASE_PATH=/games/race),
//              one origin, one port — the shape the website's proxy forwards to. It runs only the
//              specs in e2e-basepath/, which no other config collects, so the "/" arms
//              (playwright.config.js, playwright.prod.config.js) are untouched.
//
//              Like the production arm it REFUSES without a build: the point is the built package.
//              Every secret is generated for this run and never printed; the data directory is a
//              fresh temporary one, removed by nobody but the OS (it holds only this run's data).
//
//              Run:  npm run build && npx playwright test --config playwright.basepath.config.js
// ============================================================

import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { BASEPATH_ARM } from './e2e-basepath/basepath-env.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, 'dist');

if (!existsSync(join(DIST, 'index.html'))) {
  throw new Error(
    'WEBSITE-EMBED-1: there is no built client at client/dist. This arm tests the BUILT package ' +
      'under a base path, so it refuses rather than falling back to dev. Run `npm run build` first.'
  );
}

export default defineConfig({
  testDir: './e2e-basepath',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm start',
      cwd: '../server',
      url: `${BASEPATH_ARM.appUrl}/api/auth/setup-needed`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(BASEPATH_ARM.port),
        RA_BASE_PATH: BASEPATH_ARM.basePath,
        RA_DATA_DIR: join(tmpdir(), `racearena-basepath-${randomUUID().slice(0, 8)}`),
        RA_SESSION_SECRET: randomUUID(),
        RA_BOOTSTRAP_TOKEN: BASEPATH_ARM.bootstrapToken,
        RA_CLIENT_DIST: DIST,
        RA_PUBLIC_ORIGIN: BASEPATH_ARM.origin,
      },
    },
  ],
  reporter: [['list']],
});
