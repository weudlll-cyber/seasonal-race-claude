// ============================================================
// File:        RegistrationPanel.website.test.jsx
// Path:        client/src/screens/SetupScreen/RegistrationPanel.website.test.jsx
// Project:     RaceArena — WEBSITE-EMBED-1 piece 4
// Created:     2026-11-11
// Description: The director's registration panel in website mode (the server's runtime marker
//              says so, set before the panel is imported): the form asks who may join — "Website
//              members only" (the default) or "Anyone with the link" — and sends it; the list marks
//              a member's entry "from the website"; the join link carries the base path.
//              Standalone is RegistrationPanel.test.jsx, which runs unchanged and never sees the
//              choice.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

globalThis.__RA_RUNTIME_CONFIG__ = {
  apiBaseUrl: '/games/race',
  basePath: '/games/race',
  mode: 'website',
};

const api = {
  listRegistrations: vi.fn(),
  createRegistration: vi.fn(),
  fetchRegistration: vi.fn(),
  closeRegistration: vi.fn(),
  extendRegistration: vi.fn(),
  removeRegistrationEntry: vi.fn(),
  deleteRegistration: vi.fn(),
};
vi.mock('../../services/registrationApi.js', () =>
  Object.fromEntries(Object.keys(api).map((k) => [k, (...a) => api[k](...a)]))
);
vi.mock('../../modules/track-editor/trackStorage.js', () => ({
  getTrack: (id) => ({ 'geo-closed': { closed: true } })[id] ?? null,
}));

const { default: RegistrationPanel } = await import('./RegistrationPanel.jsx');

const TRACKS = [{ id: 'dirt-oval', name: 'Dirt Oval', geometryId: 'geo-closed' }];
const registration = (over = {}) => ({
  id: 'r1',
  code: 'Ab3_-xYz0123456789AbCd',
  trackId: 'dirt-oval',
  trackName: 'Dirt Oval',
  capacity: 40,
  eventName: null,
  state: 'open',
  closesAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  taken: 2,
  placesLeft: 38,
  websiteAccess: 'members',
  entries: [
    { id: 'e1', name: 'Mia Member', source: 'website', externalId: 'm-1' },
    { id: 'e2', name: 'Walk-in', source: 'public' },
  ],
  ...over,
});

function renderPanel() {
  render(
    <RegistrationPanel
      tracks={TRACKS}
      raceDefaults={{}}
      selectedTrackId="dirt-oval"
      onUsePlayers={vi.fn()}
    />
  );
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.listRegistrations.mockResolvedValue([]);
});

describe('RegistrationPanel in website mode', () => {
  it('★ asks who may join, "Website members only" by default, and sends the choice', async () => {
    api.createRegistration.mockResolvedValue(registration({ entries: [], taken: 0 }));
    renderPanel();
    await screen.findByText('No registrations yet.');
    expect(screen.getByLabelText('Website members only').checked).toBe(true);
    expect(screen.getByLabelText('Anyone with the link').checked).toBe(false);
    fireEvent.click(screen.getByLabelText('Anyone with the link'));
    fireEvent.click(screen.getByRole('button', { name: 'Open registration' }));
    await screen.findByTestId('registration-view');
    expect(api.createRegistration.mock.calls[0][0]).toMatchObject({ websiteAccess: 'anyone' });
  });

  it('marks a member’s entry "from the website", and the link carries the base path', async () => {
    api.listRegistrations.mockResolvedValue([registration()]);
    api.fetchRegistration.mockResolvedValue(registration());
    renderPanel();
    await screen.findByTestId('registration-view');
    const names = screen.getByTestId('registration-names');
    expect(names.textContent).toContain('Mia Member (from the website)');
    expect(names.textContent).not.toContain('Walk-in (from the website)');
    expect(screen.getByTestId('registration-link').textContent).toMatch(
      /\/games\/race\/join\/Ab3_-xYz0123456789AbCd$/
    );
  });
});
