// ============================================================
// File:        raceNumbers.js
// Path:        client/src/modules/raceNumbers.js
// Project:     RaceArena — RACE-NUMBERS-1
//
// WHAT THIS IS FOR: the start number a racer wears on the track. One per racer, no two alike, drawn
// fresh for every race and reproducible from the race's seed.
//
// ── THE ONE RULE THIS FILE EXISTS TO OBEY ────────────────────────────────────────────────────────
// THE DRAW MUST NOT CONSUME FROM THE RACE'S RANDOM STREAM. In this project the race is a sequence of
// draws off one seeded generator, so a single extra call anywhere upstream shifts every later draw —
// the spread factors, the roll jitter, the plan. The numbering would then decide who wins, which is
// absurd for a display label and would be almost impossible to notice: the race would still be
// deterministic, still reproducible, just a DIFFERENT race than the same seed produced yesterday.
//
// HOW IT IS OBEYED, and it is stronger than "we used a different stream": this function TOUCHES NO
// SHARED STREAM AT ALL. It builds its own generator, inside itself, from its own arguments, and
// throws it away. There is no path by which it can advance anything else — not the race's generator,
// and not `Math.random` either.
//
// THAT LAST PART MATTERS MORE THAN IT LOOKS. An unseeded race (`racePlanSeed <= 0`) runs off
// `Math.random` directly. So an implementation that "falls back to Math.random when there is no
// seed" would consume from the race's stream in exactly the case it thought it was being safe. The
// fallback here is a CONSTANT instead: an unseeded race gets the same permutation every time, which
// is harmless because the numbers are display-only and that race is already irreproducible.
//
// ── DISPLAY ONLY ─────────────────────────────────────────────────────────────────────────────────
// Nothing the engine reads may ever see a number. The racer keeps its NAME in the data: the name
// still feeds `stablePairBit`'s tie-break and the coat assignment, and none of that changes. This
// module is not imported by `raceCore.js` and is outside the engine-reach closure; the world
// fingerprint being unchanged is the proof rather than this paragraph.
// ============================================================

import { mulberry32 } from './racePlanner.js';

/**
 * Decorrelation salt. The number stream is derived from the race seed rather than being the race
 * seed, so that two things seeded "from 5601" do not produce correlated sequences. The value is the
 * golden-ratio constant used for this everywhere; nothing depends on the specific bits.
 */
const NUMBER_SEED_SALT = 0x9e3779b9;

/** What an unseeded race gets. A constant, deliberately — see the file header. */
const UNSEEDED_FALLBACK = 1;

/**
 * Draw one start number per racer: a permutation of 1..count.
 *
 * A permutation rather than independent draws, because "no two alike" is then a property of the
 * construction instead of a retry loop that could in principle not terminate.
 *
 * @param {number} count       how many racers
 * @param {number} racePlanSeed  the race's seed; <= 0 means the race is unseeded
 * @returns {number[]} `numbers[i]` is racer i's start number
 */
export function assignRaceNumbers(count, racePlanSeed) {
  const n = Math.max(0, Math.floor(count) || 0);
  if (n === 0) return [];

  // Its OWN generator, built here and discarded here. Nothing outside this function advances.
  const seed = racePlanSeed > 0 ? (racePlanSeed ^ NUMBER_SEED_SALT) >>> 0 : UNSEEDED_FALLBACK;
  const rng = mulberry32(seed);

  const numbers = Array.from({ length: n }, (_, i) => i + 1);
  // Fisher-Yates on the local generator.
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = numbers[i];
    numbers[i] = numbers[j];
    numbers[j] = t;
  }
  return numbers;
}

/**
 * The text drawn on the track for a racer.
 *
 * AT MOST THREE CHARACTERS, which is the point of the whole design: a label about one racer wide
 * points at the racer under it, and a label 170 px wide points at nothing a viewer can check
 * (ROLL-CALL-PAIRING-1). Fields are capped at 100 racers, so a number is 1-3 digits and the cap is
 * never reached in practice — it is here so that the promise holds by construction rather than by
 * arithmetic that happens to be true today.
 *
 * @param {number|null|undefined} raceNumber
 * @returns {string}
 */
export function raceNumberLabel(raceNumber) {
  if (raceNumber == null || !Number.isFinite(raceNumber)) return '';
  return String(Math.trunc(raceNumber)).slice(0, 3);
}
