// ============================================================
// File:        periodPoints.js
// Path:        client/src/modules/periodPoints.js
// Project:     RaceArena — PERIOD-EVALUATION-1 (2026-10-04)
// Description: The period evaluation's POINTS RULE, applied on the client. The server returns, per
//              name, how often each place was reached (`places`), and the rule itself — one for the
//              whole server, off by default with no numbers adopted (server/src/races/pointsRule.js).
// ============================================================

/**
 * Read a typed ladder: comma- or space-separated non-negative numbers. Anything that is not one is
 * dropped rather than read as 0, so a typo cannot silently award a place nothing.
 *
 * @param {string} text  e.g. "10, 8, 6"
 * @returns {number[]}
 */
export function parsePointsLadder(text) {
  return String(text ?? '')
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0);
}

/**
 * Points for one evaluation row under a ladder. Place p scores `ladder[p - 1]`; a place beyond the
 * ladder scores 0.
 *
 * @param {{places: Record<number, number>}} row
 * @param {number[]} ladder
 * @returns {number}
 */
export function pointsFor(row, ladder) {
  let total = 0;
  for (const [place, count] of Object.entries(row.places ?? {})) {
    total += (ladder[Number(place) - 1] ?? 0) * count;
  }
  return total;
}

/**
 * Whether the points rule is ON for this config: switched on AND carrying at least one value. An
 * empty ladder awards nothing, so it is shown as no points rather than as a column of zeros.
 */
export function pointsActive(config) {
  return (
    !!config?.pointsEnabled &&
    Array.isArray(config.pointsPerPlace) &&
    config.pointsPerPlace.length > 0
  );
}
