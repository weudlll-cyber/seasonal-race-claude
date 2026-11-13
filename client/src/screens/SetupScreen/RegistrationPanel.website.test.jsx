// ============================================================
// File:        RegistrationPanel.website.test.jsx
// Path:        client/src/screens/SetupScreen/RegistrationPanel.website.test.jsx
// Project:     RaceArena — WEBSITE-EMBED-1 piece 4
// Created:     2026-11-11
// Description: The director's registration panel in website mode (the server's runtime marker
//              says so, set before the panel is imported): the form asks who may join — "Website
//              members only" (the default) or "Anyone with the link" — and sends it; the list marks
//              a member's entry "from the website"; the join link carries the base path; and
//              (piece 6) "Use these players" hands the entries over, so the race knows its members.
//              WEBSITE-EXTRAS-1 piece 7a: "Show on the website" — ON by default on the form and
//              sent (the owner's decision of 2026-11-13), in the "Who may join" choices' own
//              group; on an open registration's detail it toggles; not on a closed one.
//              WEBSITE-EXTRAS-1 piece 7b: the website chat's "Chat" button below the list and below
//              a registration's detail, closed until clicked, and NOT while the full-screen QR
//              stage (shown to an audience) is up.
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
  setShowOnWebsite: vi.fn(),
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
  showOnWebsite: false,
  entries: [
    { id: 'e1', name: 'Mia Member', source: 'website', externalId: 'm-1' },
    { id: 'e2', name: 'Walk-in', source: 'public' },
  ],
  ...over,
});

function renderPanel(onUsePlayers = vi.fn()) {
  render(
    <RegistrationPanel
      tracks={TRACKS}
      raceDefaults={{}}
      selectedTrackId="dirt-oval"
      onUsePlayers={onUsePlayers}
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

  it('★ "Use these players" hands the entries over too, so the race knows its members (piece 6)', async () => {
    const closed = registration({ state: 'closed' });
    api.listRegistrations.mockResolvedValue([closed]);
    api.fetchRegistration.mockResolvedValue(closed);
    const onUsePlayers = vi.fn();
    renderPanel(onUsePlayers);
    // A closed registration is opened from its card, as in the standalone panel test.
    fireEvent.click(await screen.findByRole('button', { name: /^Open registration 1/ }));
    await screen.findByTestId('registration-view');
    fireEvent.click(screen.getByRole('button', { name: 'Use these players' }));
    expect(onUsePlayers.mock.calls[0][0].entries).toEqual(closed.entries);
  });

  it('★ piece 7a: "Show on the website" is ON by default on the form, and is sent', async () => {
    api.createRegistration.mockResolvedValue(registration({ entries: [], taken: 0 }));
    renderPanel();
    await screen.findByText('No registrations yet.');
    const box = screen.getByTestId('registration-show-on-website');
    expect(box.checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Open registration' }));
    await screen.findByTestId('registration-view');
    expect(api.createRegistration.mock.calls[0][0]).toMatchObject({ showOnWebsite: true });
  });

  it('★ piece 7a: drawn as the "Who may join" choices — their group, their label class, a hint', async () => {
    renderPanel();
    await screen.findByText('No registrations yet.');
    const label = screen.getByTestId('registration-show-on-website').closest('label');
    const radio = screen.getByRole('radio', { name: 'Website members only' }).closest('label');
    expect(label.textContent).toBe('Show on the website');
    expect(label.className).toBe(radio.className);
    expect(label.parentElement.className).toBe(radio.parentElement.className);
    expect(
      screen.getByText("The website's home page and games page list it while it is open.")
    ).toBeTruthy();
  });

  it('★ piece 7a: unticked on the form, it is sent as false', async () => {
    api.createRegistration.mockResolvedValue(registration({ entries: [], taken: 0 }));
    renderPanel();
    await screen.findByText('No registrations yet.');
    fireEvent.click(screen.getByTestId('registration-show-on-website'));
    fireEvent.click(screen.getByRole('button', { name: 'Open registration' }));
    await screen.findByTestId('registration-view');
    expect(api.createRegistration.mock.calls[0][0]).toMatchObject({ showOnWebsite: false });
  });

  it('★ piece 7a: on an open registration it toggles through the server', async () => {
    api.listRegistrations.mockResolvedValue([registration()]);
    api.fetchRegistration.mockResolvedValue(registration());
    api.setShowOnWebsite.mockResolvedValue(registration({ showOnWebsite: true }));
    renderPanel();
    await screen.findByTestId('registration-view');
    const box = screen.getByTestId('registration-show-on-website');
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(api.setShowOnWebsite).toHaveBeenCalledWith('r1', true);
    await vi.waitFor(() =>
      expect(screen.getByTestId('registration-show-on-website').checked).toBe(true)
    );
  });

  it('piece 7a: a closed registration shows no such box', async () => {
    const closed = registration({ state: 'closed' });
    api.listRegistrations.mockResolvedValue([closed]);
    api.fetchRegistration.mockResolvedValue(closed);
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /^Open registration 1/ }));
    await screen.findByTestId('registration-view');
    expect(screen.queryByTestId('registration-show-on-website')).toBeNull();
  });

  it('★ piece 7b: the "Chat" button is below the list, after the form, closed until clicked', async () => {
    renderPanel();
    await screen.findByText('No registrations yet.');
    const toggle = screen.getByTestId('website-chat-toggle');
    const form = screen.getByRole('form', { name: 'Open registration' });
    expect(form.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('website-chat')).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByTestId('website-chat').getAttribute('src')).toBe(
      '/embed/chat?room=race&theme=auto'
    );
  });

  it("★ piece 7b: below a registration's detail — and gone while the QR stage is shown", async () => {
    api.listRegistrations.mockResolvedValue([registration()]);
    api.fetchRegistration.mockResolvedValue(registration());
    renderPanel();
    await screen.findByTestId('registration-view');
    fireEvent.click(screen.getByTestId('website-chat-toggle'));
    expect(screen.getByTestId('website-chat')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show QR full screen' }));
    await screen.findByTestId('qr-stage');
    expect(screen.queryByTestId('website-chat')).toBeNull();
    expect(screen.queryByTestId('website-chat-toggle')).toBeNull();
  });
});
