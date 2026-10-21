// ============================================================
// File:        playersModeOnLoad.test.jsx
// Path:        client/src/screens/SetupScreen/playersModeOnLoad.test.jsx
// Project:     RaceArena — REGISTRATION-1 (follow-up 1, the owner's request of 2026-10-21)
// Description: Coming back after a reload: the Setup screen's Players tab opens on "Player
//              registration" when the team has an OPEN registration — even if "Enter names" was the
//              last choice — and shows a single open one directly; with none open it opens on the
//              names as before, or on the mode last chosen in this session. The server is replaced at
//              the service, as in SetupScreen.test.jsx (TEARDOWN-INFLIGHT-1).
// ============================================================

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { forbidNetwork } from '../../test/mockServerTracks.js';

vi.mock('../../contexts/AuthContext.jsx', async () =>
  (await import('../../test/mockAuth.js')).authMock('admin')
);
vi.mock('../../modules/legal/useLegalPages.js', () => ({ useLegalPages: () => null }));
vi.mock('../../modules/storage/useServerTracks.js', async () => {
  const { serverTracksMock } = await import('../../test/mockServerTracks.js');
  return serverTracksMock();
});
vi.mock('../../services/seedNoticeApi.js', () => ({
  fetchSeedNotices: () => Promise.resolve([]),
  dismissSeedNotices: () => Promise.resolve(0),
}));
vi.mock('../../services/playerGroupApi.js', () => ({
  fetchPlayerGroups: vi.fn().mockResolvedValue([]),
}));
const api = { listRegistrations: vi.fn(), fetchRegistration: vi.fn() };
vi.mock('../../services/registrationApi.js', () => ({
  listRegistrations: (...a) => api.listRegistrations(...a),
  fetchRegistration: (...a) => api.fetchRegistration(...a),
}));

forbidNetwork();

const { default: SetupScreen } = await import('./SetupScreen.jsx');

const open = (id, eventName) => ({
  id,
  code: 'Ab3_-xYz0123456789AbCd',
  trackId: 'dirt-oval',
  trackName: 'Dirt Oval',
  capacity: 40,
  eventName,
  state: 'open',
  closesAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  taken: 0,
  placesLeft: 40,
  entries: [],
});

function renderSetup() {
  render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>
  );
}
const pressed = (name) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

beforeEach(() => {
  api.listRegistrations.mockReset();
  api.fetchRegistration.mockReset();
});
afterEach(() => window.sessionStorage.clear());

describe('the Players tab after a reload', () => {
  it('with no open registration it opens on the names, as before', async () => {
    api.listRegistrations.mockResolvedValue([]);
    renderSetup();
    await waitFor(() => expect(api.listRegistrations).toHaveBeenCalled());
    expect(pressed('Enter names')).toBe('true');
    expect(screen.queryByTestId('registration-list')).toBeNull();
  });

  it('with exactly one open registration it opens on it directly', async () => {
    api.listRegistrations.mockResolvedValue([open('r1', 'Friday cup')]);
    api.fetchRegistration.mockResolvedValue(open('r1', 'Friday cup'));
    renderSetup();
    expect(await screen.findByTestId('registration-view')).toBeTruthy();
    expect(pressed('Player registration')).toBe('true');
  });

  it('with several open, the numbered list comes first', async () => {
    api.listRegistrations.mockResolvedValue([open('r1', 'Friday cup'), open('r2', 'Night cup')]);
    renderSetup();
    const cards = await screen.findAllByTestId('registration-card');
    expect(cards).toHaveLength(2);
    expect(pressed('Player registration')).toBe('true');
  });

  it('an open registration wins over "Enter names" chosen earlier in the session', async () => {
    window.sessionStorage.setItem('racearena:playersMode', 'names');
    api.listRegistrations.mockResolvedValue([open('r1', 'Friday cup'), open('r2', 'Night cup')]);
    renderSetup();
    await screen.findAllByTestId('registration-card');
    expect(pressed('Player registration')).toBe('true');
  });

  it('with none open, the mode chosen earlier in the session is kept', async () => {
    window.sessionStorage.setItem('racearena:playersMode', 'registration');
    api.listRegistrations.mockResolvedValue([]);
    renderSetup();
    await screen.findByText('No registrations yet.');
    expect(pressed('Player registration')).toBe('true');
  });
});
