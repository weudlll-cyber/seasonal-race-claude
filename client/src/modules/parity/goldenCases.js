// ============================================================
// File:        goldenCases.js
// Path:        client/src/modules/parity/goldenCases.js
// Project:     RaceArena — VERIFY-COST-1
//
// THE GOLDEN CASE LIST, and nothing else. One home for the identities the parity guard runs, so the
// files that run them cannot drift into testing different races while claiming the same coverage.
//
// WHY THIS FILE EXISTS AT ALL. `goldenEquality.test.js` used to be one file holding fourteen tests.
// Measured: **67.6 s when run alone, 244.9 s inside the full suite** — 3.6x slower, because vitest
// parallelises across FILES and one file is one worker, so sixty-five seconds of CPU-bound race
// simulation queued behind itself while thirteen other workers had the machine. Splitting the tests
// across files lets that work spread over the pool.
//
// NOTHING WAS CUT. Every case, every assertion and every negative control that was in the one file
// is in the four that replaced it, and the case list is HERE so that stays checkable — see
// `goldenCoverage.test.js`, which asserts the union rather than trusting it.
//
// This is NOT the routine-subset-vs-full split. That one runs FEWER races and is the owner's
// decision; it is proposed in reports/night/VERIFY-COST-1.md and deliberately not built.
// ============================================================

/**
 * Representative identities for the DERIVATION arms (browserArm vs simArm): both topologies, all
 * three model shapes, a fast and a slow racer type.
 */
export const CASES = [
  { trackId: 'searound', racerType: 'manta', seed: 1, nRacers: 20, shape: 'closed' },
  { trackId: 'dirt-oval', racerType: 'horse', seed: 7, nRacers: 20, shape: 'closed' },
  { trackId: 'river-run', racerType: 'duck', seed: 3, nRacers: 20, shape: 'open-in-range' },
  { trackId: 'seatrack', racerType: 'dolphin', seed: 11, nRacers: 20, shape: 'open-slowdown' },
];

/** The REAL-ARM seeds — searound/manta/40, the shipped defaults. */
export const REAL_ARM_SEEDS = [1, 7, 42];

/**
 * The shipped-default winners for those seeds. `real == sim` is the actual guarantee; these are the
 * concrete anchor. They moved at the 2026-07-29 COMBO15 ship, again at RACER-FLAPPING-2, and again
 * at the night/2026-09-12b merge (2026-09-14): DIRECTION-AUTHORITY-1 holds a staged comebacker to a
 * staging rank and releases him at 0.70 to race the last 30% back, so the finishing order moves by
 * design. Seeds 1 and 7 moved (13 -> 12 and 38 -> 17); seed 42 did not. Read from a measurement, not
 * from the assertion message: `real == sim` was re-checked and holds byte-identically on all three,
 * which is why this is a re-pin and not a parity failure.
 *
 * ★ AND AGAIN AT THE CHASE SHIP (CHASE-SHIP-1, 2026-09-23). The chase now runs past the OUTCOME
 * boundary — `chaseAfterOutcomeEnabled: true`, selection `'gap'`, 5 slots — so the last 30% is raced
 * differently and the finishing order moves by design. ALL THREE seeds moved this time:
 * 12 -> 27, 17 -> 38, 13 -> 7. Read from a measurement as the rule above requires: `realArm().hash`
 * and `simArm().hash` are byte-identical on all three (a855001c / 5422c22c / beca4912) and the
 * finish orders match, so this is a re-pin and not a parity failure.
 * ★★ THAT MEASUREMENT IS THE LICENCE, AND IT MATTERS HERE MORE THAN USUAL: this pin failing was
 * twice mis-read as a parity divergence (see reports/evolution/CHASE-PARITY-DIAG-1.md), which voided
 * a whole block. The failing line is `goldenRealArm.test.js:57` — a pinned SHIPPED OUTCOME. The
 * parity assertions sit ABOVE it and passed throughout.
 */
export const REAL_ARM_WINNERS = { 1: 27, 7: 38, 42: 7 };

/** The cross-topology cases: the plan gate, and the D-ROWCOUNT small-sprite case. */
export const SPREAD_CASES = [
  {
    trackId: 'city-circuit',
    racerType: 'motorbike',
    seed: 1,
    nRacers: 20,
    shape: 'closed',
    laps: 1,
  },
  { trackId: 'river-run', racerType: 'duck', seed: 7, nRacers: 20, shape: 'open-in-range' },
  // D-ROWCOUNT guard: dolphin's small sprite makes RaceScreen's inline rowCount (4) disagree with
  // computeRacerLayout.rowCount (3) on searound — the start grid the sim must share with the browser.
  { trackId: 'searound', racerType: 'dolphin', seed: 42, nRacers: 40, shape: 'closed' },
];

/** searound/manta/40 at a given seed — the real-arm identity shape. */
export const realArmCase = (seed) => ({
  trackId: 'searound',
  racerType: 'manta',
  seed,
  nRacers: 40,
  shape: 'closed',
});

/** Two full races per case; generous ceiling so a slow machine cannot flake the parity guard. */
export const RACE_TIMEOUT_MS = 180_000;

/** Finishing order as a comparable string — the anchor beside the hash. */
export const finishOrder = (results) =>
  [...results]
    .sort((x, y) => x.finalRank - y.finalRank)
    .map((r) => r.racerIndex)
    .join(',');
