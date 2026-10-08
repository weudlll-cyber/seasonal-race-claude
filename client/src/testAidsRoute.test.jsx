// ============================================================
// File:        testAidsRoute.test.jsx
// Path:        client/src/testAidsRoute.test.jsx
// Project:     RaceArena — TEST-AIDS-1
// Description: Item 27 — `/diagnose-verteilung` exists only while the test-aids switch is ON (it is
//              admin-only as well; `ProtectedRoute` keeps that and is passed through here, as in
//              App.test.jsx). While the server's answer is on its way the page waits rather than
//              turning an admin away.
// ============================================================

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _setTestAidsForTests } from './modules/testAids.js';

// The screens are stand-ins — this is about which one the route reaches.
vi.mock('./screens/SetupScreen/SetupScreen.jsx', () => ({ default: () => <p>setup screen</p> }));
vi.mock('./screens/DistributionDiagnostics/DistributionDiagnostics.jsx', () => ({
  default: () => <p>distribution page</p>,
}));
vi.mock('./screens/DevScreen/DevScreen.jsx', () => ({ default: () => null }));
vi.mock('./screens/RaceScreen/index.jsx', () => ({ default: () => null }));
vi.mock('./screens/ResultScreen/index.jsx', () => ({ default: () => null }));
vi.mock('./screens/TrackEditor/TrackEditor.jsx', () => ({ default: () => null }));
vi.mock('./screens/RacerEditor/RacerEditor.jsx', () => ({ default: () => null }));
vi.mock('./screens/Auth/LoginScreen.jsx', () => ({ default: () => null }));
vi.mock('./screens/Auth/SetupAdminScreen.jsx', () => ({ default: () => null }));
vi.mock('./components/ProtectedRoute.jsx', () => ({ default: ({ children }) => children }));
vi.mock('./components/BrandingSyncOnAuth.jsx', () => ({ default: () => null }));
vi.mock('./components/RacerSyncOnAuth.jsx', () => ({ default: () => null }));
vi.mock('./components/TestAidsSyncOnAuth.jsx', () => ({ default: () => null }));
vi.mock('./components/RacersReadyGate.jsx', () => ({ default: ({ children }) => children }));
vi.mock('./contexts/AuthContext.jsx', () => ({ AuthProvider: ({ children }) => children }));
vi.mock('./contexts/TransitionContext.jsx', () => ({
  TransitionProvider: ({ children }) => children,
  useFadeNavigate: () => () => {},
}));

const { default: App } = await import('./App.jsx');

function openAt(path, aids) {
  _setTestAidsForTests(aids);
  window.history.pushState({}, '', path);
  render(<App />);
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  _setTestAidsForTests('unknown');
  window.history.pushState({}, '', '/');
});

describe('item 27 — /diagnose-verteilung follows the switch', () => {
  it('OFF: the address leads back to the setup screen', async () => {
    openAt('/diagnose-verteilung', false);
    expect(await screen.findByText('setup screen')).toBeInTheDocument();
    expect(screen.queryByText('distribution page')).toBeNull();
  });

  it('ON: the page is there', async () => {
    openAt('/diagnose-verteilung', true);
    expect(await screen.findByText('distribution page')).toBeInTheDocument();
  });

  it('not known yet: it waits, then follows the answer', async () => {
    openAt('/diagnose-verteilung', 'unknown');
    expect(screen.queryByText('distribution page')).toBeNull();
    expect(screen.queryByText('setup screen')).toBeNull();
    act(() => _setTestAidsForTests(true));
    expect(await screen.findByText('distribution page')).toBeInTheDocument();
  });
});
