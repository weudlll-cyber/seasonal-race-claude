// ============================================================
// File:        DevScreen.website.test.jsx
// Path:        client/src/screens/DevScreen/DevScreen.website.test.jsx
// Project:     RaceArena — WEBSITE-EMBED-1 piece 5
// Created:     2026-11-11
// Description: The Dev Screen in website mode leaves out "Your password" (ChangePasswordSection)
//              and "Race directors" (UserManagementSection) — the owner's decision of 2026-11-11;
//              the website owns accounts there and both server routes answer 404. Standalone shows
//              both, as before. The screen reads the mode from the server's runtime marker at
//              import (modules/runtimeMarker.js), so the marker is set before the module is loaded,
//              as in LoginScreen.website.test.jsx.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { username: 'admin', role: 'admin' }, logout: vi.fn() }),
}));
// Every section is a stub named after its file, so the test reads placement, not the sections.
const stub = (id) => ({ default: () => <div data-testid={id} /> });
vi.mock('./sections/ChangePasswordSection.jsx', () => stub('section-changepassword'));
vi.mock('./sections/UserManagementSection.jsx', () => stub('section-usermanagement'));
vi.mock('./sections/SystemSettings.jsx', () => stub('section-system'));
vi.mock('./sections/AdminStatusSection.jsx', () => stub('section-admin-status'));
vi.mock('./sections/LegalPagesSection.jsx', () => stub('section-legal'));

async function renderAccounts(marker) {
  vi.resetModules();
  localStorage.clear();
  if (marker) globalThis.__RA_RUNTIME_CONFIG__ = marker;
  const { default: DevScreen } = await import('./DevScreen.jsx');
  render(
    <MemoryRouter>
      <DevScreen />
    </MemoryRouter>
  );
  fireEvent.click(
    screen.getByRole('button', { name: (name) => name.includes('Accounts and system') })
  );
}

// Each test imports the whole Dev Screen afresh (the mode is read at import): 2.8 s alone, past
// vitest's 5 s under a loaded machine (verify, 2026-11-11). The 60 s the Dev Screen's other heavy
// tests got on 2026-10-18 (fix/devscreen-test-timeouts), for the same reason.
const IMPORT_BUDGET_MS = 60_000;

const WEBSITE = { apiBaseUrl: '/games/race', basePath: '/games/race', mode: 'website' };

afterEach(() => {
  delete globalThis.__RA_RUNTIME_CONFIG__;
});

describe('DevScreen in website mode', () => {
  it(
    'hides "Your password" and "Race directors"; the rest of the chapter stays',
    async () => {
      await renderAccounts(WEBSITE);
      expect(screen.queryByTestId('section-changepassword')).toBeNull();
      expect(screen.queryByTestId('section-usermanagement')).toBeNull();
      expect(screen.queryByText('Your password')).toBeNull();
      expect(screen.queryByText('Race directors')).toBeNull();
      expect(screen.getByTestId('section-system')).toBeTruthy();
      expect(screen.getByTestId('section-legal')).toBeTruthy();
    },
    IMPORT_BUDGET_MS
  );

  it(
    '★ standalone (no marker) shows both, as before',
    async () => {
      await renderAccounts(null);
      expect(screen.getByTestId('section-changepassword')).toBeTruthy();
      expect(screen.getByTestId('section-usermanagement')).toBeTruthy();
    },
    IMPORT_BUDGET_MS
  );
});
