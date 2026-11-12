// ============================================================
// File:        JoinPage.website.test.jsx
// Path:        client/src/screens/Join/JoinPage.website.test.jsx
// Project:     RaceArena — WEBSITE-EMBED-1 piece 4
// Created:     2026-11-11
// Description: The join page in website mode (the server's runtime marker says so): a signed-in
//              member sees "Join as <name>" and joins without typing; a guest on a members-only
//              registration sees it read-only with a sign-in link that comes back to this page;
//              a guest on "Anyone with the link" gets today's name form. Standalone is
//              JoinPage.test.jsx, unchanged.
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const api = { fetchJoinInfo: vi.fn(), joinRegistration: vi.fn() };
vi.mock('../../services/registrationApi.js', () => ({
  fetchJoinInfo: (...a) => api.fetchJoinInfo(...a),
  joinRegistration: (...a) => api.joinRegistration(...a),
}));
vi.mock('../../modules/legal/useLegalPages.js', async (importOriginal) => ({
  ...(await importOriginal()),
  useLegalPages: () => null,
}));

const CODE = 'Ab3_-xYz0123456789AbCd';
const info = (over = {}) => ({
  eventName: 'Members cup',
  trackName: 'Dirt Oval',
  capacity: 20,
  placesLeft: 12,
  state: 'open',
  closesAt: new Date(Date.now() + 14 * 60_000).toISOString(),
  you: null,
  websiteAccess: 'members',
  member: null,
  ...over,
});

async function renderPage() {
  vi.resetModules();
  globalThis.__RA_RUNTIME_CONFIG__ = {
    apiBaseUrl: '/games/race',
    basePath: '/games/race',
    mode: 'website',
  };
  const { default: JoinPage } = await import('./JoinPage.jsx');
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
afterEach(() => {
  delete globalThis.__RA_RUNTIME_CONFIG__;
});

describe('JoinPage in website mode', () => {
  it('★ a signed-in member sees "Join as <name>" and joins without typing a name', async () => {
    const mia = {
      name: 'Mia Member',
      number: 1,
      capacity: 20,
      message: "You're in! You are number 1 of 20.",
    };
    // Before joining the server knows her and has no entry; afterwards it answers with her entry.
    api.fetchJoinInfo
      .mockResolvedValueOnce(info({ member: { displayName: 'Mia Member' } }))
      .mockResolvedValue(info({ member: { displayName: 'Mia Member' }, you: mia }));
    api.joinRegistration.mockResolvedValue({ you: mia });
    await renderPage();
    const button = await screen.findByRole('button', { name: 'Join as Mia Member' });
    expect(screen.queryByLabelText('Your name')).toBeNull();
    fireEvent.click(button);
    await waitFor(() => expect(api.joinRegistration).toHaveBeenCalledWith(CODE, undefined));
    expect(await screen.findByTestId('join-success')).toBeTruthy();
  });

  it('★ a guest on a members-only registration sees it read-only, with a sign-in that comes back here', async () => {
    api.fetchJoinInfo.mockResolvedValue(info());
    await renderPage();
    const link = await screen.findByRole('link', {
      name: 'Sign in through Seasonal Entertainment',
    });
    // jsdom's location is "/" here; in the app it is this join page, under the base path.
    expect(link.getAttribute('href')).toBe(
      `/games/race/auth/website?returnTo=${encodeURIComponent(window.location.pathname)}`
    );
    expect(screen.queryByLabelText('Your name')).toBeNull();
    expect(screen.getByText('Dirt Oval')).toBeTruthy();
  });

  it('a guest on "Anyone with the link" gets today\'s name form', async () => {
    api.fetchJoinInfo.mockResolvedValue(info({ websiteAccess: 'anyone' }));
    await renderPage();
    expect(await screen.findByLabelText('Your name')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Seasonal Entertainment/ })).toBeNull();
  });
});
