// ============================================================
// File:        fieldCap.js
// Path:        client/src/screens/SetupScreen/fieldCap.js
// Project:     RaceArena — QUICKTEST-CAP-1
// Description: How many racers ONE RACE may hold, and how big a field a given start path would
//              build — the two questions both start paths on this screen have to ask.
//
// ── WHICH LIMIT THIS READS, AND WHY IT IS THE ONLY ONE ───────────────────────────────────────────
// `maxPlayersOpen` / `maxPlayersClosed`, from `DEFAULT_RACE_DEFAULTS` under the operator's stored
// race defaults. MAX-FIELD-1 (2026-09-04) established that the four maxima this screen's
// neighbourhood carries are THREE DIFFERENT LIMITS AND ONE DEAD KEY, and that this pair is the only
// one that governs a FIELD:
//
//   maxPlayersClosed / maxPlayersOpen  how many racers ONE RACE may hold. HARD. Two values, because
//                                     a closed track's lap geometry holds fewer than an open one.
//   SAVED_GROUP_MAX_NAMES (server)     how many names a SAVED GROUP may hold — a STORAGE limit.
//   track.maxRacers                    a per-track RECOMMENDATION. SOFT, and null on every shipped
//                                      track, so it has never fired.
//   maxPlayers                         nothing. Deleted by MAX-FIELD-1.
//
// So this file is not a new opinion about the cap. It is the ONE EXPRESSION of the existing one:
// `SetupScreen` computed the `??` chain inline for the selected track, and Quick Test needed the
// same answer for a DIFFERENT track. Two copies of a `??` chain is how they come apart.
// ============================================================

import { DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';

/**
 * The hard field cap for a track, in racers.
 *
 * @param {boolean} isOpen        true for an open track, false for a closed one
 * @param {object}  raceDefaults  the operator's stored race defaults
 * @returns {number}
 */
export function fieldCapFor(isOpen, raceDefaults) {
  const d = raceDefaults ?? {};
  return isOpen
    ? (d.maxPlayersOpen ?? DEFAULT_RACE_DEFAULTS.maxPlayersOpen)
    : (d.maxPlayersClosed ?? DEFAULT_RACE_DEFAULTS.maxPlayersClosed);
}

/**
 * HOW MANY RACERS QUICK TEST WOULD ACTUALLY START — the field it builds, not the number typed in.
 *
 * It exists because the two are not the same, in both directions, and a refusal that reasoned about
 * the typed number would be wrong in both:
 *
 *   · THE ROSTER CAN EXCEED N. Quick Test appends fill names to the players already on the screen,
 *     so a roster of 60 with N=20 starts 60. The typed number is a FLOOR, never a ceiling.
 *   · THE FILL CAN FALL SHORT OF N. Fill names that already appear in the roster are skipped, and
 *     the roster is finite, so N=100 against a 100-name set that shares two names with the field
 *     starts 100 — but N=100 against a shorter set starts fewer.
 *
 * Written once and read by both the notice and the start handler, so what the screen refuses and
 * what the race would run cannot disagree.
 *
 * @param {Array<{name?: string}>} players    the roster on screen
 * @param {number}                 count      the Quick Test N
 * @param {string[]}               fillRoster the resolved fill-name list
 * @returns {number}
 */
export function quickTestFieldSize(players, count, fillRoster) {
  const roster = players ?? [];
  const needed = Math.max(0, (count ?? 0) - roster.length);
  if (needed === 0) return roster.length;
  const existing = new Set(roster.map((p) => p.name));
  const available = (fillRoster ?? []).filter((n) => !existing.has(n)).length;
  return roster.length + Math.min(needed, available);
}
