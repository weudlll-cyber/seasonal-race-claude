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

import { shuffle } from './utils/RandomHelper.js';

/**
 * Compute how many racers fit side-by-side in one row.
 * Uses world-pixel coordinates throughout so the result is correct at any world size.
 *
 * Each slot is half a sprite wide (shoulder-to-shoulder packing).
 * Formula: floor(2 × geometricTrackWidthPx / spriteWorldSizePx)
 *
 * @param {number} geometricTrackWidthPx  World-pixel inner-to-outer track width
 * @param {number} spriteWorldSizePx      Sprite display size in world pixels (displaySize × displaySizeScale)
 * @returns {number} at least 1
 */
export function computeRacersPerRow(geometricTrackWidthPx, spriteWorldSizePx) {
  return Math.max(1, Math.floor((2 * geometricTrackWidthPx) / Math.max(1, spriteWorldSizePx)));
}

/**
 * Compute multi-row layout for a race start.
 * Racer indices are shuffled so grid position is random (not rank-ordered).
 *
 * @param {number} racerCount
 * @param {number} racersPerRow  Pre-computed via computeRacersPerRow()
 * @returns {{
 *   racersPerRow: number,
 *   totalRows: number,
 *   assignments: Array<{ racerIndex: number, rowIndex: number, indexInRow: number }>
 * }}
 */
export function computeRowLayout(racerCount, racersPerRow) {
  const perRow = Math.max(1, racersPerRow);
  const totalRows = Math.ceil(racerCount / perRow);

  const indices = Array.from({ length: racerCount }, (_, i) => i);
  shuffle(indices);

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

// Minimum row0Distance below which the speed bonus guard returns 0.
// Prevents division explosion when the assembly area nearly reaches the finish line.
const SPEED_BONUS_EPSILON = 1e-9;

/**
 * Compute speed bonus for a racer in rowIndex to compensate their physical start distance.
 * Row 0 gets no bonus. Rear rows get a finishT-calibrated bonus so every row
 * reaches the finish line in the same expected time.
 *
 * Formula derivation:
 *   tOffset      = rowGapPx / pathLengthPx
 *   row0Distance = finishT                         (closed)
 *                  finishT − totalRows × tOffset   (open — front row already advanced)
 *   bonus_N      = N × tOffset / row0Distance × speedBonusFactor
 *
 * At finishT = 1.0 (closed) the formula reduces to the legacy value N × tOffset,
 * so existing finishT = 1.0 call-sites produce identical results.
 *
 * @param {number}  rowIndex        - 0 = front row (no bonus)
 * @param {number}  rowGapPx        - world-pixel gap between consecutive rows
 * @param {number}  pathLengthPx    - total track path length in world pixels
 * @param {number}  speedBonusFactor - 1.0 = full compensation, 0 = none
 * @param {number}  finishT         - t-space finish line (laps for closed; ≤ 0.95 for open)
 * @param {boolean} isOpen          - true for open tracks (assembly area ahead of t = 0)
 * @param {number}  totalRows       - total start rows in this race layout
 * @returns {number} fractional bonus — apply as effectiveBaseSpeed = baseSpeed × (1 + bonus)
 */
export function computeSpeedBonus(
  rowIndex,
  rowGapPx,
  pathLengthPx,
  speedBonusFactor,
  finishT,
  isOpen,
  totalRows
) {
  if (rowIndex === 0) return 0;
  if (
    !isFinite(rowGapPx) ||
    !isFinite(pathLengthPx) ||
    !isFinite(speedBonusFactor) ||
    !isFinite(finishT) ||
    !isFinite(totalRows)
  )
    return 0;
  if (pathLengthPx <= 0) return 0;
  const tOffset = rowGapPx / pathLengthPx;
  const row0Distance = isOpen ? finishT - totalRows * tOffset : finishT;
  if (row0Distance < SPEED_BONUS_EPSILON) return 0;
  return ((rowIndex * tOffset) / row0Distance) * speedBonusFactor;
}

/**
 * Compute the auto-default maxRacers for a track.
 * Caps the rearmost row at maxCapacityFactor × pathLengthPx behind the start.
 *
 * @param {number} pathLengthPx
 * @param {number} racersPerRow    Pre-computed via computeRacersPerRow()
 * @param {number} rowGapPx        World-pixel gap between rows (spriteSize × rowGapMultiplier)
 * @param {number} maxCapacityFactor - fraction of path length the rearmost row may use
 * @returns {number}
 */
export function computeMaxRacersDefault(pathLengthPx, racersPerRow, rowGapPx, maxCapacityFactor) {
  const budget = pathLengthPx * maxCapacityFactor;
  const maxRows = Math.max(1, Math.floor(budget / Math.max(1, rowGapPx)));
  return maxRows * Math.max(1, racersPerRow);
}
