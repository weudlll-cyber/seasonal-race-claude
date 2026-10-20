// ============================================================
// File:        JoinPage.test.jsx
// Path:        client/src/screens/Join/JoinPage.test.jsx
// Project:     RaceArena — REGISTRATION-1
// Description: The public join page renders the server's answer in each state — open with a field,
//              registered ("You're in! …", also on a revisit), full, closed, an unknown code — and
//              shows the server's refusal sentence (a doubled name, already registered on this
//              device) with the page asked again afterwards. The server calls are mocked; the real
//              routes are tested in server/src/routes/joinSecurity.integration.test.js and the page
//              in a phone-sized browser in client/e2e/join-page.spec.js.
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const api = { fetchJoinInfo: vi.fn(), joinRegistration: vi.fn() };
vi.mock('../../services/registrationApi.js', () => ({
  fetchJoinInfo: (...a) => api.fetchJoinInfo(...a),
  joinRegistration: (...a) => api.joinRegistration(...a),
}));
// The footer reads the legal pages from the server; it is not what is tested here.
vi.mock('../../modules/legal/useLegalPages.js', async (importOriginal) => ({
  ...(await importOriginal()),
  useLegalPages: () => null,
}));

const { default: JoinPage } = await import('./JoinPage.jsx');

const CODE = 'Ab3_-xYz0123456789AbCd';
const inMinutes = (m) => new Date(Date.now() + m * 60 * 1000).toISOString();
const info = (over = {}) => ({
  eventName: 'Friday cup',
  trackName: 'Dirt Oval',
  capacity: 20,
  placesLeft: 12,
  state: 'open',
  closesAt: inMinutes(14),
  you: null,
  ...over,
});
const you = (number, name = 'Ada', capacity = 20) => ({
  name,
  number,
  capacity,
  message: `You're in! You are number ${number} of ${capacity}.`,
});
const refusal = (status, message) => Object.assign(new Error(message), { status });

function renderPage() {
  render(
    <MemoryRouter initialEntries={[`/join/${CODE}`]}>
      <Routes>
        <Route path="/join/:code" element={<JoinPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  api.fetchJoinInfo.mockReset();
  api.joinRegistration.mockReset();
});

describe('the states the server reports', () => {
  it('open: the event, the track, places and time left, a name field and Join', async () => {
    api.fetchJoinInfo.mockResolvedValue(info());
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Friday cup' })).toBeTruthy();
    expect(screen.getByText('Dirt Oval')).toBeTruthy();
    expect(screen.getByTestId('join-places-left').textContent).toBe('12 of 20');
    expect(screen.getByTestId('join-time-left').textContent).toMatch(/^1[34] min \d\d s$/);
    expect(screen.getByLabelText('Your name').getAttribute('maxlength')).toBe('32');
    expect(screen.getByRole('button', { name: 'Join' })).toBeTruthy();
    expect(api.fetchJoinInfo).toHaveBeenCalledWith(CODE);
  });

  it('registered on this device: the same sentence on a revisit, and no field', async () => {
    api.fetchJoinInfo.mockResolvedValue(info({ you: you(7) }));
    renderPage();
    expect((await screen.findByTestId('join-success')).textContent).toContain(
      "You're in! You are number 7 of 20."
    );
    expect(screen.queryByLabelText('Your name')).toBeNull();
  });

  it('full', async () => {
    api.fetchJoinInfo.mockResolvedValue(info({ placesLeft: 0 }));
    renderPage();
    expect(await screen.findByText('This race is full.')).toBeTruthy();
  });

  it('closed', async () => {
    api.fetchJoinInfo.mockResolvedValue(info({ state: 'closed' }));
    renderPage();
    expect(await screen.findByText('Registration is closed.')).toBeTruthy();
    expect(screen.getByTestId('join-time-left').textContent).toBe('Closed');
  });

  it('an unknown code', async () => {
    api.fetchJoinInfo.mockRejectedValue(refusal(404, 'There is no registration with this link.'));
    renderPage();
    expect(await screen.findByText('This registration link is not valid.')).toBeTruthy();
    expect(screen.queryByLabelText('Your name')).toBeNull();
  });
});

describe('joining', () => {
  it('sends the name and shows "You\'re in!" with the number', async () => {
    api.fetchJoinInfo.mockResolvedValueOnce(info()).mockResolvedValue(info({ you: you(13) }));
    api.joinRegistration.mockResolvedValue({ you: you(13) });
    renderPage();
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect((await screen.findByTestId('join-success')).textContent).toContain(
      "You're in! You are number 13 of 20."
    );
    expect(api.joinRegistration).toHaveBeenCalledWith(CODE, 'Ada');
  });

  it('a doubled name: the server’s sentence, and the field stays for another try', async () => {
    api.fetchJoinInfo.mockResolvedValue(info());
    api.joinRegistration.mockRejectedValue(
      refusal(
        409,
        'The name "Ada" is already registered for this race. Please choose a different name.'
      )
    );
    renderPage();
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect((await screen.findByTestId('join-refusal')).textContent).toMatch(
      /"Ada" is already registered/
    );
    expect(screen.getByLabelText('Your name')).toBeTruthy();
  });

  it('already registered on this device: the refusal, then the page asks again and shows the entry', async () => {
    api.fetchJoinInfo.mockResolvedValueOnce(info()).mockResolvedValue(info({ you: you(2, 'Bob') }));
    api.joinRegistration.mockRejectedValue(refusal(409, 'You are already registered as Bob.'));
    renderPage();
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'Robert' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect((await screen.findByTestId('join-refusal')).textContent).toBe(
      'You are already registered as Bob.'
    );
    await waitFor(() =>
      expect(screen.getByTestId('join-success').textContent).toContain('number 2')
    );
  });

  it('the server not answering is said plainly, not as the app banner sentence', async () => {
    api.fetchJoinInfo.mockResolvedValue(info());
    api.joinRegistration.mockRejectedValue(new Error('Server not reachable. …banner…'));
    renderPage();
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect((await screen.findByTestId('join-refusal')).textContent).toBe(
      'The server could not be reached. Check your connection and try again.'
    );
  });
});
