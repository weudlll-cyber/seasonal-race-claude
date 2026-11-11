// ============================================================
// File:        ResultScreen.website.test.jsx
// Path:        client/src/screens/ResultScreen/ResultScreen.website.test.jsx
// Project:     RaceArena — WEBSITE-EMBED-1 piece 6 (OWNER-3)
// Created:     2026-11-11
// Description: The result screen shows "Deleted player" for a racer whose website member was
//              deleted — in website mode, for a race that had website members, once the server says
//              so — and keeps the stored name until then. Standalone asks nothing and shows the name.
//              The screen reads the mode from the runtime marker at import, so the marker is set
//              before the module is loaded (as LoginScreen.website.test.jsx does).
// ============================================================

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../contexts/TransitionContext.jsx', () => {
  const nav = vi.fn();
  return { useFadeNavigate: () => nav };
});
vi.mock('../../modules/storage/storage', () => ({
  storageGet: vi.fn(() => []),
  storageSet: vi.fn(() => true),
  KEYS: {
    RACE_HISTORY: 'racearena:raceHistory',
    BRANDING: 'racearena:branding',
    ACTIVE_SESSION: 'racearena:activeSession',
  },
  newId: vi.fn(() => 'race-on-this-device'),
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));
const api = vi.hoisted(() => ({
  fetchDeletedRacers: vi.fn(),
  postRace: vi.fn(async () => ({ ok: true, id: 'server-id', alreadyStored: false })),
}));
vi.mock('../../services/racesApi.js', () => api);

const RESULTS = (websiteRacers) =>
  JSON.stringify({
    finishOrder: [
      {
        name: 'Hugo Host',
        icon: '🐎',
        color: '#f00',
        index: 0,
        progress: 100,
        finishTimeMs: 29_340,
      },
      {
        name: 'Mia Member',
        icon: '🐎',
        color: '#00f',
        index: 1,
        progress: 95,
        finishTimeMs: 31_200,
      },
    ],
    elapsedTime: 62,
    race: { trackId: 'dirt-oval', trackName: 'Dirt Oval', duration: 60, websiteRacers },
  });

async function renderWith(marker, websiteRacers) {
  vi.resetModules();
  if (marker) globalThis.__RA_RUNTIME_CONFIG__ = marker;
  sessionStorage.setItem('raceResults', RESULTS(websiteRacers));
  const { default: ResultScreen } = await import('./index.jsx');
  render(<ResultScreen />);
}

const WEBSITE = { apiBaseUrl: '/games/race', basePath: '/games/race', mode: 'website' };
const MIA = [{ index: 1, websiteUserId: 'mia-1' }];

beforeEach(() => {
  api.fetchDeletedRacers.mockReset();
});
afterEach(() => {
  delete globalThis.__RA_RUNTIME_CONFIG__;
  sessionStorage.clear();
});

describe('ResultScreen — "Deleted player" (website mode)', () => {
  it('★ shows "Deleted player" for the deleted member once the server says so', async () => {
    api.fetchDeletedRacers.mockResolvedValue({ 'race-on-this-device': [1] });
    await renderWith(WEBSITE, MIA);
    await waitFor(() => expect(screen.getByText('Deleted player')).toBeTruthy());
    expect(screen.queryByText('Mia Member')).toBeNull();
    expect(screen.getByText('Hugo Host')).toBeTruthy();
    expect(api.fetchDeletedRacers).toHaveBeenCalledWith(['race-on-this-device']);
  });

  it('without an answer (offline) the stored name stays', async () => {
    api.fetchDeletedRacers.mockRejectedValue(new Error('offline'));
    await renderWith(WEBSITE, MIA);
    await waitFor(() => expect(api.fetchDeletedRacers).toHaveBeenCalled());
    expect(screen.getByText('Mia Member')).toBeTruthy();
    expect(screen.queryByText('Deleted player')).toBeNull();
  });

  it('a race with no website members asks nothing', async () => {
    await renderWith(WEBSITE, undefined);
    expect(screen.getByText('Mia Member')).toBeTruthy();
    expect(api.fetchDeletedRacers).not.toHaveBeenCalled();
  });

  it('★ standalone (no marker) asks nothing and shows the stored name', async () => {
    api.fetchDeletedRacers.mockResolvedValue({ 'race-on-this-device': [1] });
    await renderWith(null, MIA);
    expect(screen.getByText('Mia Member')).toBeTruthy();
    expect(api.fetchDeletedRacers).not.toHaveBeenCalled();
  });
});
