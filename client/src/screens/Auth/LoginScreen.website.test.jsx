// ============================================================
// File:        LoginScreen.website.test.jsx
// Path:        client/src/screens/Auth/LoginScreen.website.test.jsx
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3a
// Created:     2026-11-11
// Description: The sign-in page in website mode: ONE button to <base>/auth/website, no password
//              form, and no first-admin check (that route answers 404 there). The page reads the
//              mode from the server's runtime marker at import, so the marker is set before the
//              module is loaded. Standalone is LoginScreen.test.jsx, unchanged. Since
//              GOING-ONLINE-PREP-1 (D3): the footer's legal links open the website's pages.
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';

const mockAuthValue = { user: null, loading: false, login: vi.fn(), getSetupNeeded: vi.fn() };
vi.mock('../../contexts/AuthContext.jsx', () => ({ useAuth: () => mockAuthValue }));
vi.mock('../../modules/legal/useLegalPages.js', () => ({ useLegalPages: () => null }));

async function renderWith(marker) {
  vi.resetModules();
  globalThis.__RA_RUNTIME_CONFIG__ = marker;
  const { default: LoginScreen } = await import('./LoginScreen.jsx');
  render(
    <MemoryRouter>
      <LoginScreen />
    </MemoryRouter>
  );
}

afterEach(() => {
  delete globalThis.__RA_RUNTIME_CONFIG__;
});

describe('LoginScreen in website mode', () => {
  it('shows only "Sign in through Seasonal Entertainment", to <base>/auth/website', async () => {
    await renderWith({ apiBaseUrl: '/games/race', basePath: '/games/race', mode: 'website' });
    const link = screen.getByRole('link', { name: 'Sign in through Seasonal Entertainment' });
    expect(link.getAttribute('href')).toBe('/games/race/auth/website');
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.queryByLabelText(/username/i)).toBeNull();
    expect(mockAuthValue.getSetupNeeded).not.toHaveBeenCalled();
  });

  it('its legal footer opens the website’s legal pages (GOING-ONLINE-PREP-1, D3)', async () => {
    await renderWith({ apiBaseUrl: '/games/race', basePath: '/games/race', mode: 'website' });
    expect(screen.getByRole('link', { name: 'Legal notice' }).getAttribute('href')).toBe(
      '/info/imprint'
    );
    expect(screen.getByRole('link', { name: 'Privacy policy' }).getAttribute('href')).toBe(
      '/info/privacy'
    );
  });

  it('★ without the website marker the password form is drawn, as before', async () => {
    await renderWith({ apiBaseUrl: '' });
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Seasonal Entertainment/ })).toBeNull();
  });
});
