// ============================================================
// File:        rowLayout.js
// Path:        client/src/modules/rowLayout.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: D7c row-start layout logic: racer-to-row assignment (shuffled),
//              physicalY distribution within a row, speed-bonus compensation
//              for rear rows, and track-capacity auto-default.
//              Pure functions — no React or DOM deps.
// ============================================================

/**
 * Fisher-Yates in-place shuffle.
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Compute how many racers fit in one row.
 * @param {number} trackWidthPx
 * @param {number} pixelsPerRacer
 * @returns {number} at least 1
 */
function racersPerRowCount(trackWidthPx, pixelsPerRacer) {
  return Math.max(1, Math.floor(trackWidthPx / pixelsPerRacer));
}

/**
 * Compute multi-row layout for a race start.
 * Racer indices are shuffled so grid position is random (not rank-ordered).
 *
 * @param {number} racerCount
 * @param {number} trackWidthPx
 * @param {number} pixelsPerRacer
 * @returns {{
 *   racersPerRow: number,
 *   totalRows: number,
 *   assignments: Array<{ racerIndex: number, rowIndex: number, indexInRow: number }>
 * }}
 */
export function computeRowLayout(racerCount, trackWidthPx, pixelsPerRacer) {
  const perRow = racersPerRowCount(trackWidthPx, pixelsPerRacer);
  const totalRows = Math.ceil(racerCount / perRow);

  const indices = Array.from({ length: racerCount }, (_, i) => i);
  shuffleInPlace(indices);

  const assignments = indices.map((racerIndex, position) => ({
    racerIndex,
    rowIndex: Math.floor(position / perRow),
    indexInRow: position % perRow,
  }));

  return { racersPerRow: perRow, totalRows, assignments };
}

/**
 * Compute physicalY for a racer at indexInRow within a row of rowSize racers.
 * Spreads evenly across [-spreadRange, +spreadRange]. Works for partial last rows —
 * racers distribute over the full spread rather than clustering at one end.
 *
 * @param {number} indexInRow - 0-based position within the row
 * @param {number} rowSize - racers in this specific row (may be < racersPerRow for last row)
 * @param {number} spreadRange - half-width ∈ (0, 1]
 * @returns {number}
 */
export function computeRowPhysicalY(indexInRow, rowSize, spreadRange) {
  if (rowSize <= 1) return 0;
  return -spreadRange + (2 * spreadRange * indexInRow) / (rowSize - 1);
}

/**
 * Compute speed bonus for a racer in rowIndex to compensate their physical start distance.
 * Row 0 gets no bonus. Rear rows get a bonus proportional to their t-space offset.
 *
 * @param {number} rowIndex - 0 = front row (no bonus)
 * @param {number} rowGapPx - world-pixel gap between consecutive rows
 * @param {number} pathLengthPx - total track path length in world pixels
 * @param {number} speedBonusFactor - 1.0 = full compensation, 0 = none
 * @returns {number} fractional bonus — apply as effectiveBaseSpeed = baseSpeed × (1 + bonus)
 */
export function computeSpeedBonus(rowIndex, rowGapPx, pathLengthPx, speedBonusFactor) {
  if (rowIndex === 0 || pathLengthPx <= 0) return 0;
  return ((rowIndex * rowGapPx) / pathLengthPx) * speedBonusFactor;
}

/**
 * Compute the auto-default maxRacers for a track.
 * Caps the rearmost row at maxCapacityFactor × pathLengthPx behind the start.
 * Uses pixelsPerRacer as the row-spacing proxy (no sprite-size dependency).
 *
 * @param {number} pathLengthPx
 * @param {number} trackWidthPx
 * @param {number} pixelsPerRacer
 * @param {number} maxCapacityFactor - fraction of path length the rearmost row may use
 * @returns {number}
 */
export function computeMaxRacersDefault(
  pathLengthPx,
  trackWidthPx,
  pixelsPerRacer,
  maxCapacityFactor
) {
  const perRow = racersPerRowCount(trackWidthPx, pixelsPerRacer);
  const budget = pathLengthPx * maxCapacityFactor;
  const maxRows = Math.max(1, Math.floor(budget / pixelsPerRacer));
  return maxRows * perRow;
}
