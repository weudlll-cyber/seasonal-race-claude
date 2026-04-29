// ============================================================
// File:        raceSession.js
// Path:        client/src/screens/RaceScreen/raceSession.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Pure helpers for sessionStorage-based race handoff.
//              Separated from the component so they can be unit-tested
//              without a DOM or React context.
// ============================================================

/**
 * Validates the structure of an activeRace object parsed from sessionStorage.
 * Throws an Error with a human-readable message if required fields are missing
 * or have wrong types. Called before setRaceData() in RaceScreen.
 *
 * @param {unknown} data
 * @returns {object} the validated data (same reference)
 * @throws {Error} if validation fails
 */
export function validateActiveRace(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Race data is invalid: expected an object.');
  }
  if (!Array.isArray(data.racers) || data.racers.length === 0) {
    throw new Error('Race data is invalid: no racers.');
  }
  if (typeof data.geometryId !== 'string' || !data.geometryId) {
    throw new Error('Race data is invalid: missing track geometry.');
  }
  return data;
}
