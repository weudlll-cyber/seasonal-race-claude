// ============================================================
// File:        podium.mjs
// Path:        shared/podium.mjs
// Project:     RaceArena — REMOVE-WINNERS-SETTING-1
// Description: How many places the podium has: THREE, everywhere.
//
// The owner decided on 2026-10-06 that the number-of-winners setting ("Podium Spots") is removed:
// the result screen's podium has three places, and that is the rule everywhere — the winners a race
// stores in the history, and the podiums the period evaluation counts. One number, in the one place
// both the client and the server read from.
// ============================================================

/** The places on the podium: 1st, 2nd and 3rd. */
export const PODIUM_PLACES = 3;
