// ============================================================
// File:        RegistrationPanel.test.jsx
// Path:        client/src/screens/SetupScreen/RegistrationPanel.test.jsx
// Project:     RaceArena — REGISTRATION-1
// Description: The director's "Open registration" panel with the server calls mocked: the place
//              count is the Players tab's own limit for the chosen track (closed and open), the
//              chosen duration becomes the deadline sent, the shown registration has its link, its QR
//              code and its names with a remove button each, Close now and Extend send what they say,
//              "Use these players" hands over exactly the registered names and the track, Delete asks
//              first, and the full-screen QR stage opens and closes.
// ============================================================

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';

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
// Two tracks with known geometry: one closed (laps), one open.
vi.mock('../../modules/track-editor/trackStorage.js', () => ({
  getTrack: (id) => ({ 'geo-closed': { closed: true }, 'geo-open': { closed: false } })[id] ?? null,
}));

const { default: RegistrationPanel } = await import('./RegistrationPanel.jsx');

const TRACKS = [
  { id: 'dirt-oval', name: 'Dirt Oval', geometryId: 'geo-closed' },
  { id: 'river-run', name: 'River Run', geometryId: 'geo-open' },
  { id: 'unloaded', name: 'Not loaded', geometryId: 'geo-missing' },
];
const inMinutes = (m) => new Date(Date.now() + m * 60 * 1000).toISOString();
const registration = (over = {}) => ({
  id: 'r1',
  code: 'Ab3_-xYz0123456789AbCd',
  trackId: 'dirt-oval',
  trackName: 'Dirt Oval',
  capacity: 40,
  eventName: 'Friday cup',
  state: 'open',
  closesAt: inMinutes(15),
  taken: 2,
  placesLeft: 38,
  entries: [
    { id: 'e1', name: 'Ada', source: 'public' },
    { id: 'e2', name: 'Bob', source: 'public' },
  ],
  ...over,
});

function renderPanel(props = {}) {
  const onUsePlayers = vi.fn();
  render(
    <RegistrationPanel
      tracks={TRACKS}
      raceDefaults={{}}
      selectedTrackId="dirt-oval"
      onUsePlayers={onUsePlayers}
      {...props}
    />
  );
  return { onUsePlayers };
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.listRegistrations.mockResolvedValue([]);
});

describe('opening a registration', () => {
  it('the place count is the Players tab limit of the chosen track, closed and open', async () => {
    renderPanel();
    expect(screen.getByTestId('registration-capacity').textContent).toMatch(
      new RegExp(`^${DEFAULT_RACE_DEFAULTS.maxPlayersClosed} places`)
    );
    fireEvent.change(screen.getByLabelText('Track'), { target: { value: 'river-run' } });
    expect(screen.getByTestId('registration-capacity').textContent).toMatch(
      new RegExp(`^${DEFAULT_RACE_DEFAULTS.maxPlayersOpen} places`)
    );
    await screen.findByText('No registrations yet.');
  });

  it('a track whose geometry is not loaded cannot be opened', async () => {
    renderPanel({ selectedTrackId: 'unloaded' });
    expect(screen.getByTestId('registration-capacity').textContent).toMatch(/not loaded yet/);
    expect(screen.getByRole('button', { name: 'Open registration' }).disabled).toBe(true);
    await screen.findByText('No registrations yet.');
  });

  it('sends the track, its limit, the event name and the deadline of the chosen duration', async () => {
    api.createRegistration.mockResolvedValue(registration({ entries: [], taken: 0 }));
    renderPanel({ raceDefaults: { maxPlayersClosed: 12 } });
    fireEvent.click(screen.getByLabelText('1 hour'));
    fireEvent.change(screen.getByLabelText('Event name (optional)'), {
      target: { value: ' Friday cup ' },
    });
    const before = Date.now();
    fireEvent.click(screen.getByRole('button', { name: 'Open registration' }));
    await screen.findByTestId('registration-view');
    const sent = api.createRegistration.mock.calls[0][0];
    expect(sent).toMatchObject({ trackId: 'dirt-oval', capacity: 12, eventName: 'Friday cup' });
    const ms = Date.parse(sent.closesAt) - before;
    expect(ms).toBeGreaterThan(59 * 60 * 1000);
    expect(ms).toBeLessThan(61 * 60 * 1000);
  });
});

describe('one registration', () => {
  async function showOne(over) {
    api.listRegistrations.mockResolvedValue([registration(over)]);
    api.fetchRegistration.mockResolvedValue(registration(over));
    const handles = renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Friday cup' }));
    await screen.findByTestId('registration-view');
    return handles;
  }

  it('shows the link, a QR code, the counts, the time left and the names', async () => {
    await showOne();
    expect(screen.getByTestId('registration-link').textContent).toBe(
      `${window.location.origin}/join/Ab3_-xYz0123456789AbCd`
    );
    expect(screen.getByTestId('qr-code').querySelector('path').getAttribute('d')).toMatch(
      /^M4 4h1/
    );
    expect(screen.getByTestId('registration-places').textContent).toBe('2 taken · 38 left of 40');
    expect(screen.getByTestId('registration-time-left').textContent).toMatch(/min \d\d s$/);
    const names = within(screen.getByTestId('registration-names')).getAllByRole('listitem');
    expect(names.map((li) => li.textContent.replace('✕', ''))).toEqual(['Ada', 'Bob']);
  });

  it('removes a name, closes now and extends by the chosen amount', async () => {
    const r = registration();
    api.removeRegistrationEntry.mockResolvedValue(registration({ entries: [r.entries[1]] }));
    api.extendRegistration.mockResolvedValue(registration());
    api.closeRegistration.mockResolvedValue(registration({ state: 'closed' }));
    await showOne();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ada' }));
    await waitFor(() => expect(api.removeRegistrationEntry).toHaveBeenCalledWith('r1', 'e1'));
    fireEvent.click(screen.getByRole('button', { name: '+1 hour' }));
    await waitFor(() => expect(api.extendRegistration).toHaveBeenCalled());
    const [, closesAt] = api.extendRegistration.mock.calls[0];
    expect(Date.parse(closesAt) - Date.parse(r.closesAt)).toBe(60 * 60 * 1000);
    fireEvent.click(screen.getByRole('button', { name: 'Close now' }));
    expect(await screen.findByText('Registration is closed.')).toBeTruthy();
  });

  it('"Use these players" hands over exactly the registered names and the track', async () => {
    const { onUsePlayers } = await showOne({ state: 'closed' });
    fireEvent.click(screen.getByRole('button', { name: 'Use these players' }));
    expect(onUsePlayers).toHaveBeenCalledWith({ names: ['Ada', 'Bob'], trackId: 'dirt-oval' });
  });

  it('Delete asks first, and deletes only when confirmed', async () => {
    api.deleteRegistration.mockResolvedValue(undefined);
    await showOne();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Delete registration' }));
    expect(api.deleteRegistration).not.toHaveBeenCalled();
    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete registration' }));
    await waitFor(() => expect(api.deleteRegistration).toHaveBeenCalledWith('r1'));
    await waitFor(() => expect(screen.queryByTestId('registration-view')).toBeNull());
    confirm.mockRestore();
  });

  it('the QR stage opens full screen and closes with Escape', async () => {
    await showOne();
    fireEvent.click(screen.getByRole('button', { name: 'Show QR full screen' }));
    const stage = screen.getByTestId('qr-stage');
    expect(within(stage).getByTestId('qr-code')).toBeTruthy();
    expect(within(stage).getByText('Friday cup')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('qr-stage')).toBeNull();
  });
});
