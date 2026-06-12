// ============================================================
// File:        ResultScreen.test.jsx
// Path:        client/src/screens/ResultScreen/ResultScreen.test.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Regression test — verifies that one race-end produces exactly
//              one history entry, even under React 18 StrictMode double-mount.
// ============================================================

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

// Stable navigate reference across renders — required so [navigate] dependency
// does not change between StrictMode mount cycles (which would cause a second
// effect run unrelated to StrictMode's own double-fire behaviour).
vi.mock('../../contexts/TransitionContext.jsx', () => {
  const nav = vi.fn();
  return { useFadeNavigate: () => nav };
});

vi.mock('../../modules/storage/storage', () => ({
  storageGet: vi.fn(() => []),
  storageSet: vi.fn(),
  KEYS: { RACE_HISTORY: 'racearena:raceHistory' },
  newId: vi.fn(() => 'test-id-001'),
}));

import ResultScreen from './index.jsx';
import { storageSet } from '../../modules/storage/storage';
import { DEFAULT_TRACKS } from '../../modules/storage/defaults.js';

const DIRT_OVAL = DEFAULT_TRACKS.find((t) => t.name === 'Dirt Oval');

const VALID_RACE_RESULTS = JSON.stringify({
  finishOrder: [
    { name: 'Alice', icon: '🐎', color: '#f00', index: 0, lap: 1, progress: 100 },
    { name: 'Bob', icon: '🐎', color: '#00f', index: 1, lap: 1, progress: 95 },
  ],
  elapsedTime: 62,
  race: { trackId: DIRT_OVAL.id, trackName: DIRT_OVAL.name, winners: 3, duration: 60 },
});

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.setItem('raceResults', VALID_RACE_RESULTS);
});

afterEach(() => {
  sessionStorage.removeItem('raceResults');
});

describe('ResultScreen — double-save regression', () => {
  it('saves to history exactly once, even inside React.StrictMode', () => {
    // StrictMode fires every useEffect twice (mount → simulated unmount → remount).
    // Without the useRef guard this produced two identical history entries.
    render(
      <React.StrictMode>
        <ResultScreen />
      </React.StrictMode>
    );

    const historyWrites = storageSet.mock.calls.filter(([key]) => key === 'racearena:raceHistory');
    expect(historyWrites).toHaveLength(1);
  });

  it('saves the correct schema fields on the history entry', () => {
    render(<ResultScreen />);

    const historyWrite = storageSet.mock.calls.find(([key]) => key === 'racearena:raceHistory');
    expect(historyWrite).toBeTruthy();
    const saved = historyWrite[1]; // storageSet(key, value)
    const entry = saved[0]; // history.unshift → entry is at index 0
    expect(entry).toMatchObject({
      id: 'test-id-001',
      trackId: DIRT_OVAL.id,
      duration: 62,
      playerCount: 2,
      winners: ['Alice', 'Bob'],
    });
    expect(typeof entry.date).toBe('string');
  });

  it('renders sponsor strip when race.sponsorText is present', () => {
    const withSponsor = JSON.stringify({
      ...JSON.parse(VALID_RACE_RESULTS),
      race: {
        trackId: DIRT_OVAL.id,
        trackName: DIRT_OVAL.name,
        winners: 3,
        duration: 60,
        sponsorText: 'Sponsored by Acme',
      },
    });
    sessionStorage.setItem('raceResults', withSponsor);
    render(<ResultScreen />);
    expect(screen.getByText('Sponsored by Acme')).toBeTruthy();
  });

  it('renders no sponsor strip when race.sponsorText is absent', () => {
    render(<ResultScreen />);
    expect(screen.queryByText(/Sponsored by/i)).toBeNull();
  });
});
