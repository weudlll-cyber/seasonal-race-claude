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
    // ── SUITE-ENV-SPLIT: jsdom IS STILL THE DEFAULT, AND THAT IS THE POINT ─────────────────────
    //
    // `isolate` defaults to true, so vitest builds ONE jsdom per test file. Measured on this suite,
    // 253 files: **environment 503.7 s against tests 211.2 s** — more than twice as long spent
    // constructing browsers as running assertions.
    //
    // 69 of those files touch no DOM object and no browser global, and they now carry
    // `// @vitest-environment node` at the top. THE DEFAULT HERE DOES NOT CHANGE: a file gets a
    // browser unless it has opted out, so a NEW test file is safe by construction and the only way
    // to lose an environment is to write the line deliberately.
    //
    // ★ MEMBERSHIP WAS ESTABLISHED PER FILE, NOT BY FOLDER AND NOT BY NAME, in two passes that
    // both had to agree:
    //   1. STATIC, and TRANSITIVE: a file is a candidate only if neither it nor ANY module it
    //      imports from `src/` names a DOM object, a browser-only global (`localStorage`,
    //      `window`, `fetch`, `OffscreenCanvas`, …) or a library that reaches for one. Transitive
    //      is what makes it conservative — a test whose *import* touches localStorage stays.
    //   2. EMPIRICAL: every candidate was then run in BOTH environments and kept only if it
    //      produced the IDENTICAL number of passing AND skipped tests. That second count is the
    //      one that matters: a file going green because a global quietly vanished, or because its
    //      tests were skipped, is worse than a slow one.
    //
    // All 69 passed both. 184 files keep the browser — 62 because they are `.jsx`, 51 for
    // `localStorage`, 28 for `document`, 20 for `window`, and the rest for jsdom, `fetch`,
    // `OffscreenCanvas`, canvas or testing-library.
    environment: 'jsdom',
    // Expose describe/it/expect/vi globally so tests don't need to import them
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Let Vite's CSS pipeline process .module.css files in tests
    css: true,
    // Exclude Playwright e2e specs — they use @playwright/test, not Vitest
    exclude: ['e2e/**', 'node_modules/**'],
    // ── GATE-CLIENT-CROWDING-2: THE SUITE STARVED ITSELF, AND THIS IS THE BOUND ────────────────
    //
    // Vitest defaults to roughly one worker per core. On a 14-core machine that is thirteen workers,
    // and this suite holds fifteen tests that pass beyond 5,000 ms and therefore carry their own
    // extended timeouts — the golden real-arm comparisons, sim-fairness, replay. Each is individually
    // heavy. Thirteen of those running beside each other starve everything else, and the tests that
    // fail first are the ordinary 5-second React render tests that have no slack.
    //
    // MEASURED, nine full runs in three arms (margin against the 5,000 ms default this file does NOT
    // change, taken on the worst test with no timeout of its own — GATE-SERIAL-BCRYPT-1's unit):
    //
    //     unbounded, 3 runs        14 failures   worst 10,457 ms   margin -5,457 ms
    //     unbounded, 3 runs         6 failures   worst  8,511 ms   margin -3,511 ms
    //  >> maxWorkers 4, 3 runs      0 failures   worst  4,402 ms   margin   +598 ms
    //
    // The two tests that kept failing reached 10,457 ms and 8,511 ms against a 5,000 ms limit —
    // starved to twice their own limit, not hung. The heaviest test in the suite also runs 2.3x
    // faster bounded (113,789 ms -> 49,482 ms), which is what distinguishes oversubscription from a
    // slow test: nothing about that test changed.
    //
    // IT COSTS ABOUT 29% WALL CLOCK (313 s -> 403 s mean), and the owner accepted that trade on
    // 2026-08-27. The server's equivalent bound cost nothing; this one does, and it is worth it
    // because a gate that returns PASS and FAIL for the same tree has stopped gating.
    //
    // FOUR IS WHAT WAS MEASURED AND WHAT HE AGREED TO. It is not a tuned optimum and the sweep that
    // would find one has not been run — see the backlog entry. There is no env override, on purpose:
    // a stray variable that silently re-loosens the gate is this very defect's shape.
    //
    // SCHEDULING IS NOT DECIDED HERE. `scripts/verify.mjs` already marks `client-suite` exclusive,
    // which is the other half of the server-suite remedy and was already in place.
    maxWorkers: 4,
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
