// ============================================================
// File:        RaceHistory.verify.test.jsx
// Path:        client/src/screens/DevScreen/sections/RaceHistory.verify.test.jsx
// Project:     RaceArena — VERIFY-ON-DEMAND-1 (2026-10-04)
// Description: The admin-only "Verify race" button in Race History: who sees it, on which rows,
//              and what the row says for a match, a mismatch and a refusal.
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let role = 'admin';
vi.mock('../../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { username: 'u', role } }),
}));

const LOCAL_ENTRY = {
  id: 'l1',
  date: '2026-10-01T10:00:00.000Z',
  trackId: 'dirt-oval',
  duration: 60,
  playerCount: 20,
  winners: ['A'],
  sync: { state: 'pending' },
};
vi.mock('../../../modules/storage/useStorage.js', () => ({
  useStorage: vi.fn(() => [[LOCAL_ENTRY], vi.fn()]),
}));
vi.mock('../../../modules/storage/useServerTracks.js', () => ({
  useServerTracks: vi.fn(() => []),
}));

const STORED = {
  id: 's1',
  shortKey: 'ABC123',
  finishedAt: '2026-10-02T10:00:00.000Z',
  geometryId: 'g1',
  elapsedSec: 61,
  names: ['A', 'B'],
  racePlanSeed: 7,
  winners: ['A'],
};
vi.mock('../../../services/racesApi.js', () => ({
  fetchRacesPage: vi.fn(async () => ({
    races: [STORED],
    hasMore: false,
    offset: 0,
    limit: 20,
    team: 'T',
  })),
  verifyRace: vi.fn(),
}));

import RaceHistory from './RaceHistory.jsx';
import { verifyRace } from '../../../services/racesApi.js';

const show = async () => {
  render(
    <MemoryRouter>
      <RaceHistory />
    </MemoryRouter>
  );
  await screen.findByText('ABC123');
};

beforeEach(() => {
  role = 'admin';
  vi.mocked(verifyRace).mockReset();
});

describe('Race History — Verify race (VERIFY-ON-DEMAND-1)', () => {
  it('an admin sees it on the STORED race only, not on the race still on this device', async () => {
    await show();
    expect(screen.getAllByTestId('verify-race')).toHaveLength(1);
    expect(screen.getAllByTestId('run-again')).toHaveLength(2);
  });

  it('an operator does not see it', async () => {
    role = 'operator';
    await show();
    expect(screen.queryByTestId('verify-race')).toBeNull();
  });

  it('says "match" when every position and time agrees', async () => {
    vi.mocked(verifyRace).mockResolvedValue({
      shortKey: 'ABC123',
      identical: true,
      positions: { match: 20, of: 20 },
      finishTimes: { match: 20, of: 20 },
      firstDiff: null,
    });
    await show();
    fireEvent.click(screen.getByTestId('verify-race'));
    const out = await screen.findByTestId('verify-result');
    expect(verifyRace).toHaveBeenCalledWith('ABC123');
    expect(out.textContent).toMatch(/^match/);
    expect(out.textContent).toContain('positions 20/20');
  });

  it('says "no match" and names the first difference', async () => {
    vi.mocked(verifyRace).mockResolvedValue({
      shortKey: 'ABC123',
      identical: false,
      positions: { match: 18, of: 20 },
      finishTimes: { match: 18, of: 20 },
      firstDiff: 'position 1: stored "B", replay "A"',
    });
    await show();
    fireEvent.click(screen.getByTestId('verify-race'));
    const out = await screen.findByTestId('verify-result');
    expect(out.textContent).toMatch(/^no match/);
    expect(out.textContent).toContain('first difference: position 1: stored "B", replay "A"');
  });

  it("shows the server's refusal instead of a result", async () => {
    vi.mocked(verifyRace).mockRejectedValue(new Error('the record does not say its seed'));
    await show();
    fireEvent.click(screen.getByTestId('verify-race'));
    await waitFor(() =>
      expect(screen.getByTestId('verify-error').textContent).toContain('does not say its seed')
    );
    expect(screen.queryByTestId('verify-result')).toBeNull();
  });
});
