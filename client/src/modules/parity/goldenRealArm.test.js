// ============================================================
// File:        goldenRealArm.test.js
// Path:        client/src/modules/parity/goldenRealArm.test.js
// Project:     RaceArena — split out of goldenEquality.test.js by VERIFY-COST-1
//
// THE REAL BROWSER ARM (client/src/modules/raceCore.js) vs the SIM — EQUAL BY CONSTRUCTION.
//
// `realArm` runs RaceScreen's OWN init + per-step advance (raceCore). Since the step-order
// alignment, the SIM's runSingleRace executes that SAME stepRacePhysics, and the golden harness
// hands both arms the browser's roster names (the avoidance symmetry tiebreak keys on r.name), so
// realArm and simArm are byte-identical. This closes D-INIT (per-step order), D-RUNOUT
// (finished-racer runout) and D-NAME (roster-name tiebreak) — see
// reports/parity/DIVERGENCE-AUDIT.md §2f. The residual the extraction task located is now
// DISSOLVED, not merely monitored.
//
// SPLIT, NOT REDUCED: these are the same tests that lived in goldenEquality.test.js, moved so the
// worker pool can run them beside the derivation arms instead of behind them. The case list is in
// goldenCases.js and goldenCoverage.test.js asserts the union.
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildIdentity, realArm, simArm } from '../../../../scripts/parity/goldenRunner.mjs';
import { firstDivergence } from './raceIdentity.js';
import {
  REAL_ARM_SEEDS,
  REAL_ARM_WINNERS,
  SPREAD_CASES,
  realArmCase,
  RACE_TIMEOUT_MS,
  finishOrder,
} from './goldenCases.js';

describe('real browser arm (raceCore) == sim — the step-order-alignment parity guard', () => {
  // searound / manta / 40 — the shipped-default winners. real core == sim on all three (the hash +
  // order equality below is the parity guarantee; the winner index is just the concrete anchor).
  // These moved at the 2026-07-29 COMBO15 ship (MERGE-SHIP-1) and again at RACER-FLAPPING-2
  // (margin hysteresis). real == sim byte-identity is the actual guarantee; the winners are the
  // shipped outcomes and live in goldenCases.js.
  for (const seed of REAL_ARM_SEEDS) {
    it(
      `searound/manta/40/seed=${seed}: real browser arm and sim are byte-identical`,
      () => {
        const identity = buildIdentity(realArmCase(seed));
        expect(identity.racePlanEnabled).toBe(true);
        const a = realArm(identity);
        const b = simArm(identity);
        if (a.hash !== b.hash) {
          const d = firstDivergence(a.outcome, b.outcome);
          throw new Error(
            `REAL-ARM MISMATCH seed=${seed}: real ${a.hash} sim ${b.hash} — ` +
              `${d ? `${d.kind} @ ${d.at} — ${d.detail}` : 'no positional divergence located'}`
          );
        }
        expect(a.hash).toBe(b.hash);
        expect(finishOrder(a.results)).toBe(finishOrder(b.results));
        // the winner matches the shipped-default (150 px/s) outcome — real == sim above is the guarantee
        expect(a.results.find((r) => r.finalRank === 1).racerIndex).toBe(REAL_ARM_WINNERS[seed]);
      },
      RACE_TIMEOUT_MS
    );
  }

  it(
    'holds across topologies, the plan gate, and the D-ROWCOUNT small-sprite case',
    () => {
      for (const c of SPREAD_CASES) {
        const identity = buildIdentity(c);
        const a = realArm(identity);
        const b = simArm(identity);
        expect(a.hash).toBe(b.hash);
      }
    },
    RACE_TIMEOUT_MS
  );
});
