// ============================================================
// File:        ResultScreen.raceAction.test.jsx
// Path:        client/src/screens/ResultScreen/ResultScreen.raceAction.test.jsx
// Project:     RaceArena — RACE-ACTION-CONTROL-1
//
// WHAT THIS IS FOR: "the stage visible on the race afterwards so he can tell which one ran" is one
// of the things the owner said he would look at. The result screen is where he already reads the
// seed after every race, so it is where the stage goes. These tests hold that it is shown, that it
// is the stage the RACE ran rather than the current setting, and that it lands in the history entry
// beside the seed. Sabotages in reports/evolution/RACE-ACTION-CONTROL-1.md:
//
//   1. the stage is on screen           — sabotage: render it only when the stage is not quiet
//   2. a pre-change race reads quiet    — sabotage: render the raw payload value
//   3. the history entry carries it     — sabotage: drop the key from the entry
// ============================================================

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../contexts/TransitionContext.jsx', () => {
  const nav = vi.fn();
  return { useFadeNavigate: () => nav };
});

vi.mock('../../modules/storage/storage', () => ({
  storageGet: vi.fn(() => []),
  storageSet: vi.fn(),
  KEYS: {
    RACE_HISTORY: 'racearena:raceHistory',
    BRANDING: 'racearena:branding',
    ACTIVE_SESSION: 'racearena:activeSession',
  },
  newId: vi.fn(() => 'test-id-001'),
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

import ResultScreen from './index.jsx';
import { storageGet, storageSet } from '../../modules/storage/storage';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';
import { RACE_ACTION_STAGE_IDS } from '../../modules/storage/defaults.js';

const DIRT_OVAL = SAMPLE_TRACKS.find((t) => t.name === 'Dirt Oval');

/** A finished race whose payload is `race`. `undefined` stage = a race from before this change. */
function resultsFor(race) {
  return JSON.stringify({
    finishOrder: [
      { name: 'Alice', icon: '🐎', color: '#f00', index: 0, progress: 100, finishTimeMs: 29_340 },
      { name: 'Bob', icon: '🐎', color: '#00f', index: 1, progress: 95, finishTimeMs: 31_200 },
    ],
    elapsedTime: 62,
    race: { trackId: DIRT_OVAL.id, trackName: DIRT_OVAL.name, winners: 3, duration: 60, ...race },
  });
}

const historyEntry = () => {
  const write = storageSet.mock.calls.find(([key]) => key === 'racearena:raceHistory');
  return write?.[1]?.[0];
};

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockImplementation(() => []);
});
afterEach(() => sessionStorage.removeItem('raceResults'));

describe('RACE-ACTION-CONTROL-1 — the stage is visible on the race afterwards', () => {
  // PROPERTY 1 — shown for EVERY stage including quiet. A pill that appeared only on the loud
  // stages would leave a quiet race ambiguous between "it was quiet" and "this build has no stages",
  // which is exactly the question the owner is asking the screen.
  it.each(RACE_ACTION_STAGE_IDS)('a race that ran %s says so on screen', (stage) => {
    sessionStorage.setItem('raceResults', resultsFor({ raceActionStage: stage }));
    render(<ResultScreen />);
    const el = screen.getByTestId('result-race-action-stage');
    expect(el.textContent.toLowerCase()).toContain(stage);
  });

  // PROPERTY 2 — the compatibility property on the read side.
  it('a race from before this change reads as quiet rather than as blank', () => {
    sessionStorage.setItem('raceResults', resultsFor({}));
    render(<ResultScreen />);
    expect(screen.getByTestId('result-race-action-stage').textContent.toLowerCase()).toContain(
      'quiet'
    );
  });

  it('an unrecognised stage from a future build reads as quiet rather than being echoed', () => {
    sessionStorage.setItem('raceResults', resultsFor({ raceActionStage: 'feral' }));
    render(<ResultScreen />);
    const text = screen.getByTestId('result-race-action-stage').textContent.toLowerCase();
    expect(text).toContain('quiet');
    expect(text).not.toContain('feral');
  });
});

describe('RACE-ACTION-CONTROL-1 — the history entry carries the stage', () => {
  // PROPERTY 3 — stored beside the seed, because the two together are what makes an entry
  // reproducible: the seed says WHICH race, the stage says at which action configuration.
  it.each(RACE_ACTION_STAGE_IDS)('an entry for a %s race records that stage', (stage) => {
    sessionStorage.setItem(
      'raceResults',
      resultsFor({ raceActionStage: stage, racePlanSeed: 4242 })
    );
    render(<ResultScreen />);
    expect(historyEntry()).toMatchObject({ raceActionStage: stage, seed: 4242 });
  });

  it('an entry for a race from before this change records quiet', () => {
    sessionStorage.setItem('raceResults', resultsFor({}));
    render(<ResultScreen />);
    expect(historyEntry().raceActionStage).toBe('quiet');
  });
});
