// ============================================================
// File:        goldenEquality.test.js
// Path:        client/src/modules/parity/goldenEquality.test.js
// Project:     RaceArena
// Created:     2026-07-24
// Description: THE GOLDEN EQUALITY TEST (fix-plan step 6). One race identity in, two
//              derivation chains — the browser's and the sim's — one outcome hash out.
//              They must be EXACTLY equal. This is the standing guard that keeps the
//              browser↔sim parity promise from silently regressing.
//
//              A handful of representative identities run here on every `npm test`; the
//              broad sweep (300+) lives in scripts/parity/soak.mjs and is reported in
//              reports/parity/GOLDEN-SOAK.md.
//
// SCOPE: the two arms share the per-frame loop (single-sourced since FORCE-PARITY), so what
// this proves is INPUT-DERIVATION equality plus determinism — the layer where every real
// divergence has lived (D-GRID, D-STREAM, D-DUR, O1). See the header of
// scripts/parity/goldenRunner.mjs for what a stronger version would require.
//
// ── SPLIT ACROSS FOUR FILES BY VERIFY-COST-1, WITH NOTHING REMOVED ──────────────────────────────
// This file used to hold all fourteen tests. Measured: 67.6 s alone, 244.9 s inside the full suite,
// because vitest parallelises across FILES — one file is one worker, so sixty-five seconds of
// CPU-bound race simulation queued behind itself while thirteen other workers had the machine.
//
// The same tests now live in four files that the pool can run at once:
//   goldenEquality.test.js          the derivation arms (browserArm vs simArm) — THIS FILE
//   goldenRealArm.test.js           the real browser arm (raceCore) vs the sim
//   goldenNegative.test.js          both negative controls — the comparison must be able to FAIL
//   goldenCoverage.test.js          the cheap structural assertions, and the union check
//
// The case list lives in `goldenCases.js` so four files cannot drift into running different races
// while claiming the same coverage, and `goldenCoverage.test.js` asserts the union rather than
// trusting it. Coverage is identical: same cases, same assertions, same negative controls.
//
// RUNTIME: each case runs two full races, so the race-running cases carry explicit timeouts.
// Racer counts are kept modest here on purpose — the heavy counts belong to the soak.
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildIdentity, browserArm, simArm } from '../../../../scripts/parity/goldenRunner.mjs';
import { firstDivergence, hashIdentity } from './raceIdentity.js';
import { CASES, RACE_TIMEOUT_MS } from './goldenCases.js';

describe('golden equality — browser and sim derive the same race from one identity', () => {
  for (const c of CASES) {
    const label = `${c.trackId}/${c.racerType}/${c.shape}/n=${c.nRacers}/seed=${c.seed}`;
    it(
      `${label}: outcome hashes are exactly equal`,
      () => {
        const identity = buildIdentity(c);
        const a = browserArm(identity);
        const b = simArm(identity);

        if (a.hash !== b.hash) {
          // Never loosen to a tolerance — name the seed and the first diverging checkpoint.
          const d = firstDivergence(a.outcome, b.outcome);
          throw new Error(
            `GOLDEN MISMATCH ${label}\n` +
              `  identity  ${hashIdentity(identity)}\n` +
              `  browser   ${a.hash}\n` +
              `  sim       ${b.hash}\n` +
              `  first divergence: ${d ? `${d.kind} @ ${d.at} — ${d.detail}` : 'hashes differ but no positional divergence found'}`
          );
        }
        expect(a.hash).toBe(b.hash);
      },
      RACE_TIMEOUT_MS
    );
  }
});
