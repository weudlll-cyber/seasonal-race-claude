// ============================================================
// File:        pauseDeterminismOpen.test.jsx
// Path:        client/src/screens/RaceScreen/pauseDeterminismOpen.test.jsx
// Project:     RaceArena — PAUSE-RESUME-1
//
// A PAUSED RACE IS THE SAME RACE — open tracks. Each race is run on the real race screen twice, never
// paused and paused four times (countdown, early, mid-race, near the finish), and must give the same
// finish order, finish times, elapsed time, result payload and stored history entry. The harness and
// why it mounts the screen: client/src/test/pauseRaceHarness.jsx. Split from its closed-track twin
// only so the suite runs the two side by side.
// ============================================================

import { describe, it } from 'vitest';
import { checkPausedRaceIsSameRace, installPauseHarness } from '../../test/pauseRaceHarness.jsx';

installPauseHarness();

describe('PAUSE-RESUME-1 — a paused race is the same race (open tracks)', () => {
  it.each([
    ['luger-hill', 7707],
    ['mountainstreet', 8808],
    ['river-run', 9909],
    ['seatrack', 1110],
    ['space-sprint', 1211],
    ['river-run', 1312],
  ])(
    '%s seed %i: same finish order, finish times, elapsed time and stored record',
    (trackId, seed) => checkPausedRaceIsSameRace(trackId, seed),
    120000
  );
});
