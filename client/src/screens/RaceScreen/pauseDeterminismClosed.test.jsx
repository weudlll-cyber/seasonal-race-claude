// ============================================================
// File:        pauseDeterminismClosed.test.jsx
// Path:        client/src/screens/RaceScreen/pauseDeterminismClosed.test.jsx
// Project:     RaceArena — PAUSE-RESUME-1
//
// A PAUSED RACE IS THE SAME RACE — closed tracks. Each race is run on the real race screen twice, never
// paused and paused four times (countdown, early, mid-race, near the finish), and must give the same
// finish order, finish times, elapsed time, result payload and stored history entry. The harness and
// why it mounts the screen: client/src/test/pauseRaceHarness.jsx. Split from its open-track twin
// only so the suite runs the two side by side.
// ============================================================

import { describe, it } from 'vitest';
import { checkPausedRaceIsSameRace, installPauseHarness } from '../../test/pauseRaceHarness.jsx';

installPauseHarness();

describe('PAUSE-RESUME-1 — a paused race is the same race (closed tracks)', () => {
  it.each([
    ['dirt-oval', 101],
    ['dirt-oval', 7202],
    ['city-circuit', 3303],
    ['garden-path', 4404],
    ['ice-track', 5505],
    ['searound', 6606],
  ])(
    '%s seed %i: same finish order, finish times, elapsed time and stored record',
    (trackId, seed) => checkPausedRaceIsSameRace(trackId, seed),
    120000
  );
});
