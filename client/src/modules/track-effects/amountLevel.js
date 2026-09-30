// ============================================================
// File:        amountLevel.js
// Path:        client/src/modules/track-effects/amountLevel.js
// Project:     RaceArena — PARTICLES-VISIBILITY-8
// Description: The one conversion between a track effect's amount LEVEL (0–100, what the Track
//              Editor shows) and its NATIVE amount (what is stored and what the race reads).
//              The owner's decision of 2026-09-28: every effect's amount control shows 0–100,
//              0 is off, 100 is the effect's configSchema maximum, linear in between.
//              Storage is unchanged — tracks keep native values; only the control converts.
// ============================================================

/** The configSchema key that holds an effect's amount, the same key in all seven effects. */
export const AMOUNT_KEY = 'count';

/** The top of the level scale. */
export const LEVEL_MAX = 100;

/**
 * The level a stored native amount shows: round(native / max × 100), clamped to 0–100.
 * A non-zero amount never shows 0 — it shows at least 1, so an effect that is on never looks off
 * (Seatrack's bubbles at 100 per minute of a 240000 maximum are 0.04, and show 1).
 * @param {number} native — the stored amount, in the effect's own unit
 * @param {number} max — the effect's configSchema maximum for the amount
 * @returns {number} an integer 0–100
 */
export function levelFromNative(native, max) {
  if (!(native > 0)) return 0;
  const level = Math.round((native / max) * LEVEL_MAX);
  return Math.min(LEVEL_MAX, Math.max(1, level));
}

/**
 * The native amount a level writes: level × max / 100, rounded to a whole number because the
 * server accepts whole amounts only (server/src/routes/tracks.js validateEffects). For every
 * maximum but fireflies' the product is already whole; fireflies' 250 gives 2.5 per level.
 * @param {number} level — 0–100
 * @param {number} max — the effect's configSchema maximum for the amount
 * @returns {number} a whole native amount, 0–max
 */
export function nativeFromLevel(level, max) {
  return Math.round((level * max) / LEVEL_MAX);
}
