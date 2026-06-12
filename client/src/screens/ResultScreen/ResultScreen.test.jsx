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
  KEYS: {
    RACE_HISTORY: 'racearena:raceHistory',
    BRANDING: 'racearena:branding',
    ACTIVE_SESSION: 'racearena:activeSession',
  },
  newId: vi.fn(() => 'test-id-001'),
}));

import ResultScreen from './index.jsx';
import { storageGet, storageSet } from '../../modules/storage/storage';
import { DEFAULT_TRACKS } from '../../modules/storage/defaults.js';

const DIRT_OVAL = DEFAULT_TRACKS.find((t) => t.name === 'Dirt Oval');

const VALID_RACE_RESULTS = JSON.stringify({
  finishOrder: [
    {
      name: 'Alice',
      icon: '🐎',
      color: '#f00',
      index: 0,
      lap: 1,
      progress: 100,
      finishTimeMs: 29_340,
    },
    {
      name: 'Bob',
      icon: '🐎',
      color: '#00f',
      index: 1,
      lap: 1,
      progress: 95,
      finishTimeMs: 31_200,
    },
  ],
  elapsedTime: 62,
  race: { trackId: DIRT_OVAL.id, trackName: DIRT_OVAL.name, winners: 3, duration: 60 },
});

const FOUR_FINISHER_RESULTS = JSON.stringify({
  finishOrder: [
    { name: 'Alice', icon: '🐎', color: '#f00', index: 0, progress: 100, finishTimeMs: 29_340 },
    { name: 'Bob', icon: '🐎', color: '#00f', index: 1, progress: 95, finishTimeMs: 31_200 },
    { name: 'Carol', icon: '🐎', color: '#0f0', index: 2, progress: 90, finishTimeMs: 33_500 },
    { name: 'Dave', icon: '🐎', color: '#ff0', index: 3, progress: 85, finishTimeMs: 35_800 },
  ],
  elapsedTime: 62,
  race: { trackId: DIRT_OVAL.id, trackName: DIRT_OVAL.name, winners: 3, duration: 60 },
});

beforeEach(() => {
  vi.clearAllMocks();
  // Explicitly reset storageGet implementation; clearAllMocks does not touch it.
  // Individual tests that need a specific profile call mockImplementation themselves.
  storageGet.mockImplementation(() => []);
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

describe('ResultScreen — brand identity block', () => {
  it('shows brand event name when a profile is active', () => {
    storageGet.mockImplementation((key) => {
      if (key === 'racearena:branding')
        return [
          {
            id: 'bp1',
            eventName: 'Acme Invitational',
            subtitle: 'Spring Series',
            primaryColor: '#e63946',
            secondaryColor: '#f4a261',
          },
        ];
      if (key === 'racearena:activeSession') return { activeBrandingProfileId: 'bp1' };
      return [];
    });
    render(<ResultScreen />);
    expect(screen.getByText('Acme Invitational')).toBeTruthy();
  });

  it('hides brand identity block when no profile is active', () => {
    // Default mock: storageGet returns [] → no active profile
    render(<ResultScreen />);
    expect(screen.queryByText('Acme Invitational')).toBeNull();
  });
});

describe('ResultScreen — rankings scroll panel', () => {
  it('shows rank 4+ in the scroll panel with correct rank numbers', () => {
    sessionStorage.setItem('raceResults', FOUR_FINISHER_RESULTS);
    render(<ResultScreen />);
    expect(screen.getByText('Dave')).toBeTruthy();
    expect(screen.getByText('#4')).toBeTruthy();
  });

  it('does not render rank numbers 1-3 in the scroll panel', () => {
    sessionStorage.setItem('raceResults', FOUR_FINISHER_RESULTS);
    render(<ResultScreen />);
    // Ranks 1–3 belong to the podium only, not in the scroll panel rank numbers
    expect(screen.queryByText('#1')).toBeNull();
    expect(screen.queryByText('#2')).toBeNull();
    expect(screen.queryByText('#3')).toBeNull();
  });

  it('renders no rankings panel when there are 3 or fewer finishers', () => {
    // VALID_RACE_RESULTS has 2 finishers — no panel should appear
    render(<ResultScreen />);
    expect(screen.queryByText('Final Rankings')).toBeNull();
  });
});

describe('ResultScreen — per-racer finish time', () => {
  it('shows formatted finish time in the rank row when finishTimeMs is present', () => {
    sessionStorage.setItem('raceResults', FOUR_FINISHER_RESULTS);
    render(<ResultScreen />);
    // Dave's finishTimeMs is 35_800 → formatRaceTime(35800) = '35.80'
    expect(screen.getByText('35.80')).toBeTruthy();
  });

  it('shows "—" in the rank row when finishTimeMs is null or absent', () => {
    // Ranks 4 (Dave, explicit null) and 5 (Eve, absent) both land in the scroll panel
    const withNull = JSON.stringify({
      finishOrder: [
        { name: 'Alice', icon: '🐎', index: 0, progress: 100, finishTimeMs: 29_000 },
        { name: 'Bob', icon: '🐎', index: 1, progress: 95, finishTimeMs: 31_000 },
        { name: 'Carol', icon: '🐎', index: 2, progress: 90, finishTimeMs: 33_000 },
        { name: 'Dave', icon: '🐎', index: 3, progress: 85, finishTimeMs: null },
        { name: 'Eve', icon: '🐎', index: 4, progress: 80 }, // finishTimeMs absent
      ],
      elapsedTime: 62,
      race: { trackId: DIRT_OVAL.id, trackName: DIRT_OVAL.name, winners: 3, duration: 60 },
    });
    sessionStorage.setItem('raceResults', withNull);
    render(<ResultScreen />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
