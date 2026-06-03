// ============================================================
// File:        RaceHistory.test.jsx
// Path:        client/src/screens/DevScreen/sections/RaceHistory.test.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Regression tests for RaceHistory — covers the crash introduced
//              by the schema mismatch between ResultScreen (saves) and
//              RaceHistory (reads) that surfaced during PR-A3 browser testing.
// ============================================================

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../modules/storage/useStorage.js', () => ({
  useStorage: vi.fn((_, defaultValue) => [defaultValue, vi.fn()]),
}));

vi.mock('../../../modules/storage/useServerTracks.js', () => ({
  useServerTracks: vi.fn(() => []),
}));

import RaceHistory from './RaceHistory.jsx';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { DEFAULT_TRACKS } from '../../../modules/storage/defaults.js';

const DIRT_OVAL = DEFAULT_TRACKS.find((t) => t.name === 'Dirt Oval');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RaceHistory — section subtitle and tooltips (PR-A3.1)', () => {
  it('renders the section subtitle', () => {
    render(<RaceHistory />);
    expect(screen.getByText(/Browse all past races/)).toBeTruthy();
  });

  it('renders filter label tooltips', () => {
    render(<RaceHistory />);
    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    const trackTip = tooltips.find((el) => el.textContent.includes('regardless of track'));
    const dateTip = tooltips.find((el) => el.textContent.includes('specific event day'));
    expect(trackTip).toBeTruthy();
    expect(dateTip).toBeTruthy();
  });
});

describe('RaceHistory — empty state', () => {
  it('renders without crash when there is no history (empty localStorage state)', () => {
    render(<RaceHistory />);
    expect(screen.getByText(/No races recorded yet/)).toBeTruthy();
  });
});

describe('RaceHistory — crash regression (winners: undefined)', () => {
  it('renders without crash when a history entry is missing the winners field', () => {
    // This reproduces the original crash:
    //   ResultScreen was saving { winner: string, players: number, timestamp, elapsedTime }
    //   RaceHistory was reading entry.winners.join(', ') → TypeError on undefined
    // The fix: (entry.winners ?? []).join(', ')
    useStorage.mockImplementation((key, defaultValue) => {
      if (key === 'racearena:raceHistory') {
        return [
          [
            {
              id: 'crash-repro-1',
              date: '2026-05-04T10:00:00.000Z',
              trackId: DIRT_OVAL.id,
              duration: 60,
              playerCount: 5,
              // winners intentionally absent → undefined, triggers the original crash
            },
          ],
          vi.fn(),
        ];
      }
      return [defaultValue, vi.fn()];
    });

    expect(() => render(<RaceHistory />)).not.toThrow();
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('shows an empty winners cell instead of crashing for entries without winners', () => {
    useStorage.mockImplementation((key, defaultValue) => {
      if (key === 'racearena:raceHistory') {
        return [
          [
            {
              id: 'crash-repro-2',
              date: '2026-05-04T10:00:00.000Z',
              trackId: DIRT_OVAL.id,
              duration: 60,
              playerCount: 3,
            },
          ],
          vi.fn(),
        ];
      }
      return [defaultValue, vi.fn()];
    });

    render(<RaceHistory />);
    const rows = screen.getAllByRole('row');
    // header + 1 data row
    expect(rows.length).toBe(2);
  });

  it('renders winners correctly when the field is a proper array', () => {
    useStorage.mockImplementation((key, defaultValue) => {
      if (key === 'racearena:raceHistory') {
        return [
          [
            {
              id: 'correct-entry',
              date: '2026-05-04T10:00:00.000Z',
              trackId: DIRT_OVAL.id,
              duration: 60,
              playerCount: 5,
              winners: ['Alice', 'Bob', 'Charlie'],
            },
          ],
          vi.fn(),
        ];
      }
      return [defaultValue, vi.fn()];
    });

    render(<RaceHistory />);
    expect(screen.getByText('Alice, Bob, Charlie')).toBeTruthy();
  });
});
