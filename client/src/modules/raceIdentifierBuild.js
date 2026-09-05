// ============================================================
// File:        raceIdentifierBuild.js
// Path:        client/src/modules/raceIdentifierBuild.js
// Project:     RaceArena — RACE-IDENTIFIER-1
//
// WHICH BUILD AN IDENTIFIER WAS RECORDED ON.
//
// Split from `raceIdentifier.js` so that module stays pure and testable: this one imports the
// `virtual:ra-build` module, which only exists inside a Vite build, and a unit test that had to
// stub a virtual module in order to check a round trip would be testing the bundler.
//
// ★ WHY THE BUILD IS PART OF THE IDENTIFIER AT ALL. The config travels as a DIFF against the
// shipped defaults in `defaults.js`. Against a different build's defaults the same diff describes a
// DIFFERENT config — so an identifier from another build has to be refused rather than applied.
//
// THE DIRTY MARK IS CARRIED, and it is a real limit rather than decoration: a dirty tree is not
// described by any commit, so two dirty builds on the same commit can differ and this cannot tell.
// Carrying `+dirty` at least stops a dirty build's identifier from being accepted by a clean one.
// `buildInfo.js` states the same reasoning for the HUD badge.
// ============================================================

import RA_BUILD from 'virtual:ra-build';

/** @returns {string} the build stamp an identifier is recorded with and checked against. */
export function raceIdentifierBuildId() {
  const commit = RA_BUILD?.commit || 'unknown';
  return RA_BUILD?.dirty ? `${commit}+dirty` : commit;
}
