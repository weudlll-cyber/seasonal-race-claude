// ============================================================
// File:        raceZones.js
// Path:        client/src/modules/raceZones.js
// Project:     RaceArena
// Created:     2026-06-19
// Description: Pure zone logic shared by the browser race loop and the headless
//              simulator — single source of truth for zone membership and mult lookup.
// ============================================================

/**
 * Build the active zone list from a validated config.
 * Returns an empty array when disabled (caller sees no-op without branching).
 * tStart/tEnd are in course-fraction (cf) space: 0 = start, 1 = finish/lap.
 *
 * @param {object}  config       Validated raceZoneConfig (from loadRaceZoneConfig).
 * @param {boolean} isOpenTrack  True for open tracks (clamp to [0,1], no wrap).
 * @returns {{ tStart: number, tEnd: number, mult: number }[]}
 */
export function resolveZones(config, isOpenTrack) {
  if (!config || !config.enabled) return [];
  const half = config.width / 2;
  let tStart, tEnd;
  if (isOpenTrack) {
    // Open tracks: course-fraction is bounded [0,1]; clamp so the zone never wraps.
    tStart = Math.max(0, config.position - half);
    tEnd = Math.min(1, config.position + half);
  } else {
    // Closed tracks: normalize to [0,1) so seam zones wrap correctly at the start/finish line.
    tStart = (((config.position - half) % 1) + 1) % 1;
    tEnd = (((config.position + half) % 1) + 1) % 1;
  }
  return [{ tStart, tEnd, mult: config.brakeStrength }];
}

/**
 * Return the speed multiplier for a lap-local position zt in [0,1].
 * Handles both normal zones (tStart <= tEnd) and seam-straddling zones (tStart > tEnd).
 * Result is safety-clamped to [0.80, 1.20].
 *
 * @param {number} zt    Lap-local racer position in [0,1].
 * @param {Array}  zones Output of resolveZones().
 * @returns {number}
 */
export function zoneMultAt(zt, zones) {
  for (const z of zones) {
    const inside =
      z.tStart <= z.tEnd ? zt >= z.tStart && zt < z.tEnd : zt >= z.tStart || zt < z.tEnd; // seam-straddling: wraps past 1/0 boundary
    if (inside) return Math.max(0.8, Math.min(1.2, z.mult));
  }
  return 1.0;
}
