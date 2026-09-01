// ============================================================
// File:        scripts/lib/racerFacts.mjs
// Project:     RaceArena — REGISTRY-LITERALS-1
//
// A RACER'S PHYSICAL FACTS, READ FROM THE ONE AUTHORITY — so a harness cannot carry its own copy.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────────
//
// Four instruments used to carry hardcoded tables of `speedMultiplier`, `displaySize`, `bodyFillX`
// and `bodyFillY`. Nothing compared them to `client/src/modules/racer-types/`, and the class had
// already cost two blocks: `goldenRunner.mjs` disagreed with the registry on five of ten entries
// for 39 days (SPRITE-TABLE-DRIFT-1, GOLDEN-TABLE-REGISTRY-1), and the report correcting it made a
// false absence claim about the other tables because its search was capped at ten results.
//
// The owner's reasoning for removing the copies rather than guarding them: **a golden going red
// when a racer changes is the correct loud signal, where a literal drifting silently is not.**
// REGISTRY-IMPORT-FEASIBILITY-1 established by RUNNING, not reading, that all four files can import
// the registry — plain Node 23-35 ms, vitest jsdom 394 ms, and thirteen instruments already do it.
//
// ── THE ONE RULE, AND WHY IT IS NOT SIMPLY `.config` ───────────────────────────────────────────
//
// `index.js:539` calls `_applyStoredTunableOverrides()` AT MODULE LOAD. It reads storage and
// MUTATES `type.config` in place, and `TUNABLE_FIELDS` includes `speedMultiplier` and `displaySize`.
// In jsdom `localStorage` exists, so a naive `.config.displaySize` would let a developer's Dev-Screen
// tuning silently change what a harness measures. `CONFIG_SNAPSHOT` is frozen at index.js:244,
// BEFORE that call, and is therefore override-immune.
//
// `bodyFillX`/`bodyFillY` are NOT in `TUNABLE_FIELDS`, so they are not in `CONFIG_SNAPSHOT` either —
// reading them from it yields `undefined`. They are also never mutated, so `.config` is already
// override-immune for them.
//
// So the ONE rule below is: **prefer the frozen snapshot; fall back to `.config` for the fields the
// snapshot does not carry.** Every field is read the same way at every call site — one rule rather
// than two — and every field is override-immune, which is the property that actually matters.
//
// UNKNOWN IDS THROW. `getRacerTypeById` falls back to horse with a console.error, which is right for
// a running game and wrong for an instrument: a harness that silently measures a horse where the
// operator asked for a duck produces a confident wrong number. This module refuses instead.
// ============================================================

import {
  CONFIG_SNAPSHOT,
  RACER_TYPES,
  RACER_TYPE_IDS,
} from "../../client/src/modules/racer-types/index.js";

/** The four physical fields the instruments used to hardcode. */
export const PHYSICAL_FIELDS = Object.freeze([
  "speedMultiplier",
  "displaySize",
  "bodyFillX",
  "bodyFillY",
]);

/**
 * One field of one racer type, override-immune.
 * Prefers the frozen CONFIG_SNAPSHOT; falls back to `.config` for non-tunable fields.
 */
export function racerFact(id, field) {
  const type = RACER_TYPES[id];
  if (!type) {
    throw new Error(
      `racerFacts: unknown racer type "${id}" — known ids are ${RACER_TYPE_IDS.join(", ")}`,
    );
  }
  const snap = CONFIG_SNAPSHOT[id];
  if (snap && field in snap) return snap[field];
  const value = type.config[field];
  if (value === undefined) {
    throw new Error(
      `racerFacts: racer type "${id}" carries no field "${field}"`,
    );
  }
  return value;
}

/** All four physical fields of one racer type, as a fresh plain object. */
export function racerFacts(id) {
  return Object.fromEntries(PHYSICAL_FIELDS.map((f) => [f, racerFact(id, f)]));
}
