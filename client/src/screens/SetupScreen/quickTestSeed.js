// ============================================================
// File:        quickTestSeed.js
// Path:        client/src/screens/SetupScreen/quickTestSeed.js
// Project:     RaceArena
// Created:     2026-07-22
// Description: Quick-Test seed field semantics. Empty field = draw a fresh random seed per
//              race (every race differs, but each one is replayable by typing the seed the
//              HUD shows). Typed number = fixed seed. Seed 0 (the legacy unseeded path) is
//              not reachable from Quick-Test.
// ============================================================

// The field's accepted range. Kept small enough that a seed shown in the HUD is easy to
// read off the screen and type back in — that round-trip IS the replay workflow.
export const QUICK_TEST_SEED_MIN = 1;
export const QUICK_TEST_SEED_MAX = 9999;

/**
 * Normalize what the user typed into the seed field.
 * Returns '' for an empty field (= "random"), otherwise a clamped integer string.
 * 0 is clamped up to QUICK_TEST_SEED_MIN: the unseeded legacy path is deliberately
 * unreachable from Quick-Test, so there is no way to type your way back into it.
 *
 * @param {string|number} raw the raw input value
 * @returns {string} '' or a decimal integer string within [MIN, MAX]
 */
export function sanitizeQuickTestSeedInput(raw) {
  const digits = String(raw ?? '').replace(/[^0-9]/g, '');
  if (digits === '') return '';
  const n = Number(digits);
  return String(Math.max(QUICK_TEST_SEED_MIN, Math.min(QUICK_TEST_SEED_MAX, n)));
}

/**
 * Draw a fresh random seed for one Quick-Test race.
 * This is the ONLY random draw in the seed path, and it happens here — before the race
 * starts and outside the deterministic swap in RaceScreen. The race itself stays a pure
 * function of the value returned here.
 *
 * @param {() => number} rng injectable for tests; defaults to the native generator
 * @returns {number} integer in [QUICK_TEST_SEED_MIN, QUICK_TEST_SEED_MAX]
 */
export function drawQuickTestSeed(rng = Math.random) {
  const span = QUICK_TEST_SEED_MAX - QUICK_TEST_SEED_MIN + 1;
  return QUICK_TEST_SEED_MIN + Math.floor(rng() * span);
}

/**
 * Resolve the seed a Quick-Test race should actually run with.
 *
 * @param {string} fieldValue current seed-field value ('' = random)
 * @param {() => number} rng injectable for tests
 * @returns {{ seed: number, drawn: boolean }} seed to run with; drawn=true if auto-drawn
 *          (the caller must NOT write a drawn seed back into the field — the field stays
 *          empty so the next race draws again)
 */
export function resolveQuickTestSeed(fieldValue, rng = Math.random) {
  const typed = sanitizeQuickTestSeedInput(fieldValue);
  if (typed === '') return { seed: drawQuickTestSeed(rng), drawn: true };
  return { seed: Number(typed), drawn: false };
}
