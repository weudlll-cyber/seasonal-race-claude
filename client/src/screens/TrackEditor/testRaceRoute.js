// ============================================================
// File:        testRaceRoute.js
// Path:        client/src/screens/TrackEditor/testRaceRoute.js
// Project:     RaceArena — PARTICLES-VISIBILITY-12
// Description: Where a test race returns to. Its own import-free module because the race screen
//              reads it: importing it from testRace.js would pull the Quick Test builder and the
//              Setup modules into the race screen's import graph for one string.
// ============================================================

/** Where a test race goes when it finishes or is cancelled: the Track Editor it came from. */
export const TEST_RACE_RETURN_ROUTE = '/track-editor';
