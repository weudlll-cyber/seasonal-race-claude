// ============================================================
// File:        vitest.config.js
// Path:        client/vitest.config.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Vitest configuration — jsdom environment, global APIs,
//              coverage via V8, CSS module support
// ============================================================

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { raBuildInfo } from './vite-plugin-ra-build.js';

export default defineConfig({
  // BUILD-TRUTH-1: the same plugin the app uses, so `virtual:ra-build` resolves in tests through the
  // real mechanism rather than a stub that could drift from it.
  plugins: [react(), raBuildInfo()],
  test: {
    environment: 'jsdom',
    // Expose describe/it/expect/vi globally so tests don't need to import them
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Let Vite's CSS pipeline process .module.css files in tests
    css: true,
    // Exclude Playwright e2e specs — they use @playwright/test, not Vitest
    exclude: ['e2e/**', 'node_modules/**'],
    // ZERO, by owner decision (ONE-TRUTH-2 stage 2). It was 3 for months and it hid a suite that
    // failed 3 runs in 10 with the machine to itself. ONE-TRUTH-1 measured 113 attempt-failures
    // across 20 full runs: every single one was class `timeout`, not one was an assertion, and
    // after two measured budgets 3646 tests ran with zero retries. A retry does not fix a slow
    // test; it hides it, and it makes a green run and a nearly-red run look identical.
    retry: 0,
    // NIGHT-TOOLS-1: the retry LEDGER. With `retry: 3` above, a test that failed twice and passed
    // on the third attempt is reported as a pass and is indistinguishable from one that passed
    // first time. The reporter prints which tests needed more than one attempt — and an explicit
    // zero line when none did, so a MISSING ledger is itself a defect signal rather than a silent
    // pass. It lives in scripts/ because it is tooling, and it is loaded HERE rather than wrapped
    // around `verify` because CI runs `npm run test:coverage` directly and would never see a
    // wrapper. See the reporter's header for what it does NOT check.
    reporters: ['default', '../scripts/retry-ledger-reporter.mjs'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{js,jsx}'],
    },
  },
});
