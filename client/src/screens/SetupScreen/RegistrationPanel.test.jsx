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
    // One OPEN registration is shown directly on the panel's first load; a closed one is opened
    // from its card.
    if (over?.state === 'closed') {
      fireEvent.click(
        await screen.findByRole('button', { name: 'Open registration 1: Friday cup' })
      );
    }
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
    expect(within(stage).getByRole('button', { name: 'Copy QR code' })).toBeTruthy();
    expect(within(stage).getByRole('button', { name: 'Download QR' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('qr-stage')).toBeNull();
  });

  it('has a visible "Back to all registrations" at the top', async () => {
    await showOne();
    const back = screen.getByRole('button', { name: '← Back to all registrations' });
    expect(screen.getByTestId('registration-view').firstElementChild).toBe(back);
    fireEvent.click(back);
    expect(await screen.findByTestId('registration-list')).toBeTruthy();
  });

  it('"Copy QR code" and "Download QR" are beside "Copy link"', async () => {
    await showOne();
    const row = screen.getByRole('button', { name: 'Copy link' }).parentElement;
    expect(within(row).getByRole('button', { name: 'Copy QR code' })).toBeTruthy();
    expect(within(row).getByRole('button', { name: 'Download QR' })).toBeTruthy();
  });
});

// ── Follow-up 1 (the owner's requests of 2026-10-21) ─────────────────────────────────────────────

describe('item 1 — a 1-minute registration', () => {
  it('"1 min" is the first preset, and it sends a deadline at least a minute ahead', async () => {
    api.createRegistration.mockResolvedValue(registration({ entries: [], taken: 0 }));
    renderPanel();
    const presets = within(screen.getByRole('group', { name: 'Open for' })).getAllByRole('radio');
    expect(presets[0].value).toBe('1m');
    fireEvent.click(screen.getByLabelText('1 min'));
    const before = Date.now();
    fireEvent.click(screen.getByRole('button', { name: 'Open registration' }));
    await screen.findByTestId('registration-view');
    const ms = Date.parse(api.createRegistration.mock.calls[0][0].closesAt) - before;
    // At least the server's minimum, with the travel-time allowance on top.
    expect(ms).toBeGreaterThanOrEqual(60 * 1000);
    expect(ms).toBeLessThan(70 * 1000);
  });
});

describe('item 2 — the "Until…" and "Extend until" fields', () => {
  const localIn = (minutes) => {
    const d = new Date(Date.now() + minutes * 60 * 1000);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  it('says what will happen, and refuses a past or too-distant time before submitting', async () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText('Until…'));
    const field = screen.getByLabelText('Registration closes at');
    const open = screen.getByRole('button', { name: 'Open registration' });
    expect(field.className).toMatch(/dateInput/);
    fireEvent.change(field, { target: { value: localIn(2 * 24 * 60 + 5) } });
    expect(screen.getByTestId('registration-until-hint').textContent).toMatch(
      /^Closes .+ \(in 2 days 0 h\)$/
    );
    expect(open.disabled).toBe(false);
    fireEvent.change(field, { target: { value: localIn(-10) } });
    expect(screen.getByTestId('registration-until-hint').textContent).toBe(
      'This time is in the past.'
    );
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(open.disabled).toBe(true);
    fireEvent.change(field, { target: { value: localIn(31 * 24 * 60) } });
    expect(screen.getByTestId('registration-until-hint').textContent).toMatch(/at most 30 days/);
    expect(open.disabled).toBe(true);
    await screen.findByText('No registrations yet.');
  });

  it('an extension must be later than the current deadline', async () => {
    api.listRegistrations.mockResolvedValue([
      registration({ createdAt: new Date().toISOString() }),
    ]);
    api.fetchRegistration.mockResolvedValue(registration({ createdAt: new Date().toISOString() }));
    renderPanel();
    await screen.findByTestId('registration-view');
    const field = screen.getByLabelText('Extend until');
    const extend = screen.getByRole('button', { name: 'Extend until' });
    fireEvent.change(field, { target: { value: localIn(10) } }); // before the 15-minute deadline
    expect(screen.getByTestId('registration-extend-hint').textContent).toBe(
      'Choose a time later than the current deadline.'
    );
    expect(extend.disabled).toBe(true);
    fireEvent.change(field, { target: { value: localIn(90) } });
    expect(screen.getByTestId('registration-extend-hint').textContent).toMatch(
      /^Closes .+\(in 1 h/
    );
    expect(extend.disabled).toBe(false);
  });
});

describe('item 4 and 5 — the list of registrations', () => {
  const list = [
    registration({ id: 'c1', state: 'closed', eventName: 'Old cup', closesAt: inMinutes(-60) }),
    registration({ id: 'o1', eventName: 'Morning cup' }),
    registration({ id: 'o2', eventName: null, trackName: 'River Run', taken: 3, capacity: 100 }),
  ];

  it('numbered cards: open ones first and highlighted, then closed; the list is above the form', async () => {
    api.listRegistrations.mockResolvedValue(list);
    renderPanel();
    const cards = await screen.findAllByTestId('registration-card');
    expect(cards.map((c) => [c.textContent.slice(0, 1), c.dataset.state])).toEqual([
      ['1', 'open'],
      ['2', 'open'],
      ['3', 'closed'],
    ]);
    expect(cards[0].className).toMatch(/cardOpen/);
    expect(cards[2].className).not.toMatch(/cardOpen/);
    expect(within(cards[0]).getByText('Open', { selector: 'span' })).toBeTruthy();
    expect(within(cards[2]).getByText('Closed')).toBeTruthy();
    expect(cards[1].textContent).toMatch(/River Run.*3 of 100 places.*left/);
    expect(cards[2].textContent).toMatch(/closed /);
    // Above the form, because something is open.
    const listEl = screen.getByTestId('registration-list');
    const form = screen.getByRole('form', { name: 'Open registration' });
    expect(listEl.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('each card opens its registration, by a click anywhere on it or by its button', async () => {
    api.listRegistrations.mockResolvedValue(list);
    api.fetchRegistration.mockImplementation(async (id) =>
      registration({ id, eventName: id === 'o2' ? null : 'Morning cup' })
    );
    renderPanel();
    const cards = await screen.findAllByTestId('registration-card');
    fireEvent.click(cards[1]);
    await screen.findByTestId('registration-view');
    expect(api.fetchRegistration).toHaveBeenLastCalledWith('o2');
    fireEvent.click(screen.getByRole('button', { name: '← Back to all registrations' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open registration 1: Morning cup' })
    );
    await waitFor(() => expect(api.fetchRegistration).toHaveBeenLastCalledWith('o1'));
  });

  it('with exactly one open registration, it is shown directly', async () => {
    api.listRegistrations.mockResolvedValue([list[0], list[1]]);
    api.fetchRegistration.mockResolvedValue(list[1]);
    renderPanel();
    await screen.findByTestId('registration-view');
    expect(api.fetchRegistration).toHaveBeenCalledWith('o1');
  });

  it('with none open, the form comes first and the closed ones follow it', async () => {
    api.listRegistrations.mockResolvedValue([list[0]]);
    renderPanel();
    const listEl = await screen.findByTestId('registration-list');
    const form = screen.getByRole('form', { name: 'Open registration' });
    expect(form.compareDocumentPosition(listEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('registration-view')).toBeNull();
  });
});
