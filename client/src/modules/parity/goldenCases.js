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
 * concrete anchor. They moved at the 2026-07-29 COMBO15 ship and again at RACER-FLAPPING-2.
 */
export const REAL_ARM_WINNERS = { 1: 13, 7: 38, 42: 13 };

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
