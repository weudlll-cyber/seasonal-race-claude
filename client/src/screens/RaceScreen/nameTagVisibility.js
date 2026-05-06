// ============================================================
// File:        nameTagVisibility.js
// Path:        client/src/screens/RaceScreen/nameTagVisibility.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: Pure helper: which racers receive a name tag this frame.
//              All tags during COUNTDOWN and FINISHED; top-N by progress
//              (r.t descending) during RACING.
// ============================================================

/**
 * Returns the subset of racers that should display a name tag.
 *
 * @param {Array}   racers              All racers in the race
 * @param {boolean} isRacing            True only during PHASE.RACING (not countdown, not finished)
 * @param {number}  tagVisibleMaxCount  Max tags shown during RACING
 * @returns {Array} Racers that get a name tag (order is not guaranteed)
 */
export function visibleTagRacers(racers, isRacing, tagVisibleMaxCount) {
  if (!isRacing) return racers;
  const sorted = [...racers].sort((a, b) => b.t - a.t);
  return sorted.slice(0, Math.min(sorted.length, tagVisibleMaxCount));
}
