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
 *
 * @param {object} config  Validated raceZoneConfig (from loadRaceZoneConfig).
 * @returns {{ tStart: number, tEnd: number, mult: number }[]}
 */
export function resolveZones(config) {
  if (!config || !config.enabled) return [];
  const half = config.width / 2;
  // Normalize to [0,1) so seam zones wrap correctly on closed tracks.
  const tStart = (((config.position - half) % 1) + 1) % 1;
  const tEnd = (((config.position + half) % 1) + 1) % 1;
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
