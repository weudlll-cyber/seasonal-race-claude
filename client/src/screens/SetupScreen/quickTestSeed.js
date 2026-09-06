// ============================================================
// File:        quickTestSeed.js
// Path:        client/src/screens/SetupScreen/quickTestSeed.js
// Project:     RaceArena
// Created:     2026-07-22
// Description: Race seed field semantics. Empty field = draw a fresh random seed per
//              race (every race differs, but each one is replayable by typing the seed the
//              HUD shows). Typed number = fixed seed. Seed 0 (the legacy unseeded path) is
//              not reachable from either seed field.
//
// IT SERVES BOTH START PATHS SINCE 2026-08-23 (SEED-REAL-RACE-1), and the file keeps its
// Quick-Test name deliberately. "Start Race" used to hardcode racePlanSeed: 0, so no race the
// owner watched was reproducible — including the ones he judged. It now resolves its seed through
// the SAME functions, because the alternative was a second set of semantics for the same idea and
// the two would have drifted the first time one of them was fixed.
//
// WHY NOT RENAME IT to raceSeed.js, which is what the names now describe. The path is quoted as an
// ADDRESS in the append-only lab journal — reports/parity/DIVERGENCE-AUDIT.md and
// reports/parity/STEP-ORDER-ARC.md both cite `quickTestSeed.js` with line numbers — and those
// reports are never rewritten. A rename would leave them pointing at nothing, which trades a stale
// name here for a broken address there. Conservative option at a fork, stated rather than assumed.
// ============================================================

import { looksLikeRaceIdentifier } from '../../modules/raceIdentifier.js';
import { looksLikeShortKey } from '../../modules/raceShortKey.js';

// The minimum typed/drawn seed (0 = the unseeded legacy path, deliberately unreachable from Quick-Test).
export const QUICK_TEST_SEED_MIN = 1;
// The AUTO-DRAW ceiling only: a randomly-drawn seed stays small enough to read off the HUD and type
// back in. TYPED seeds are NOT capped by this — a sim replay seed like `(G−1)·N + i + 1` can exceed it,
// and must be typable for the replay round-trip (fix-plan step 3 / D-SEED).
export const QUICK_TEST_SEED_MAX = 9999;
// The upper bound a TYPED seed is clamped to — kept at MAX_SAFE_INTEGER so the value survives as an
// exact integer for mulberry32 (any larger and Number() would round it).
const QUICK_TEST_SEED_TYPED_MAX = Number.MAX_SAFE_INTEGER;

/**
 * Normalize what the user typed into the seed field.
 * Returns '' for an empty field (= "random"), otherwise a positive integer string. Typed seeds accept
 * ANY positive integer (clamped only to [MIN, MAX_SAFE_INTEGER]) so a sim seed is typable for replay;
 * 0 is clamped up to QUICK_TEST_SEED_MIN so the unseeded legacy path stays unreachable.
 *
 * @param {string|number} raw the raw input value
 * @returns {string} '' or a decimal integer string in [MIN, MAX_SAFE_INTEGER]
 */
export function sanitizeQuickTestSeedInput(raw) {
  // RACE-IDENTIFIER-1: the field takes a RACE IDENTIFIER as well as a seed, and an identifier is
  // base64url — so the digits-only filter below would silently shred one into a nonsense number.
  // It is passed through whole; whether it is VALID is `raceIdentifier.js`'s question, asked at
  // start time where a refusal can be shown, not here on every keystroke.
  const asText = String(raw ?? '').trim();
  if (looksLikeRaceIdentifier(asText)) return asText;
  // RACE-HISTORY-4: and a SHORT KEY is the third form, for exactly the reason the identifier is the
  // second — the digits filter below would shred "ABC234" to "234" and start a race with a seed
  // nobody typed. It is passed through as typed; whether it NAMES a race is the server's question,
  // asked when the person asks for it, not here on every keystroke.
  if (looksLikeShortKey(asText)) return asText;
  const digits = String(raw ?? '').replace(/[^0-9]/g, '');
  if (digits === '') return '';
  const n = Math.min(QUICK_TEST_SEED_TYPED_MAX, Math.max(QUICK_TEST_SEED_MIN, Number(digits)));
  return String(n);
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
  // RACE-IDENTIFIER-1: an identifier carries its own seed among the other eight inputs, and the
  // caller decodes it before reaching here. Drawing a random seed for one would throw that away, so
  // this refuses rather than guesses — reaching this line with an identifier is a caller bug.
  if (looksLikeRaceIdentifier(fieldValue)) {
    throw new Error(
      'resolveQuickTestSeed was given a race identifier. Decode it first — its seed travels inside it.'
    );
  }
  const typed = sanitizeQuickTestSeedInput(fieldValue);
  if (typed === '') return { seed: drawQuickTestSeed(rng), drawn: true };
  return { seed: Number(typed), drawn: false };
}
