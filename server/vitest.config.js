// ============================================================
// File:        server/vitest.config.js
// Project:     RaceArena — GATE-SERIAL-BCRYPT-1
//
// ── WHY THIS FILE HAS PROJECTS (2026-08-26) ────────────────────────────────────────────────────
//
// bcrypt at cost 12 costs ~247 ms per call and a single test spends four to eight of them. Run with
// every file at once, those calls CONTEND and each test's wall clock grows though the test itself
// never changed: measured, the worst unprotected test took 1,006 ms alone and up to 4,979 ms at
// fourteen workers, against vitest's 5,000 ms default. GATE-RED-1 has the full account.
//
// `20868394` dropped `--no-file-parallelism` on purpose — that flag was serialisation standing in
// for isolation, and the isolation is now real (one users store per file, `test/env-setup.js`).
// **The owner's decision of 2026-08-26 is that the blanket serialisation does not come back.**
//
// ── THE DISEASE IS OVERSUBSCRIPTION, NOT FILE COUNT ────────────────────────────────────────────
//
// bcrypt is async and runs on libuv's threadpool — FOUR threads per worker process by default. At
// fourteen workers that is up to 56 bcrypt threads on 14 cores, and the 4x oversubscription is what
// inflates each call's wall clock. So the repair BOUNDS the concurrency of the files that spend
// bcrypt time; it does not serialise them.
//
// MEASURED, four runs of the whole suite per arm (wall clock · worst test · margin against the
// 5,000 ms timeout, which this file does NOT change):
//
//     unbounded, as master runs it   39.1 s · 8,289 ms · -3,289 ms   RED on 2 of 3 runs
//     bcrypt group at 1 (serial)     96.2 s · 3,779 ms ·  1,221 ms   green — and no cheaper than
//                                                                   serialising the whole suite
//     bcrypt group at 6              29.1 s · 4,155 ms ·    845 ms   green
//  >> bcrypt group at 3              37.7 s · 3,106 ms ·  1,894 ms   green, 0 tests over 4 s
//
// **THREE IS CHOSEN BECAUSE IT COSTS NOTHING AND BUYS EVERYTHING.** It is not slower than the suite
// is today (37.7 s against 39.1 s, inside run-to-run variance) and it takes the margin from 21 ms to
// 1,894 ms. Six is 8.6 s faster still and keeps less than half the margin; the conservative bound is
// right for a file whose whole purpose is that the gate can be trusted. There is no env override on
// purpose — a stray variable that silently re-loosens the gate is this very defect's shape.
//
// ── MEMBERSHIP IS NOT DECIDED HERE ─────────────────────────────────────────────────────────────
//
// `test/suiteShape.mjs` owns it, and `scripts/verify.mjs` reads the SAME module to decide the
// suite's scheduling. That is the point: this fact had three owners once, and the two that went
// stale were the two being read. There is no list in this file to fall off.
// ============================================================

import { defineConfig } from 'vitest/config';
import { suiteShape } from './test/suiteShape.mjs';

const { bounded, parallel } = suiteShape();

/** How many bcrypt-heavy files may run at once. See the measurement table above. */
const BCRYPT_MAX_WORKERS = 3;

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
    },
    // TWO GROUPS, AND THEY RUN ONE AFTER THE OTHER BY CONSTRUCTION. Vitest refuses two projects with
    // different `maxWorkers` under the same `sequence.groupOrder` — "Provide unique 'groupOrder' for
    // them" — and a unique group order means sequential. So this is NOT "a bounded group alongside a
    // parallel group"; it is the bounded group, then the rest. Measured, that is still faster than
    // today, because removing the oversubscription saves more than the sequencing costs.
    projects: [
      {
        test: {
          name: 'bcrypt-bounded',
          root: import.meta.dirname,
          include: bounded,
          setupFiles: ['./test/env-setup.js'],
          maxWorkers: BCRYPT_MAX_WORKERS,
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: 'parallel',
          root: import.meta.dirname,
          include: parallel,
          setupFiles: ['./test/env-setup.js'],
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
