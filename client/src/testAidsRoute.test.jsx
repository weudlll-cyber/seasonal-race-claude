// ============================================================
// File:        testAidsRoute.test.jsx
// Path:        client/src/testAidsRoute.test.jsx
// Project:     RaceArena — TEST-AIDS-1
// Description: Item 27 — `/diagnose-distribution` exists only while the test-aids switch is ON (it is
//              admin-only as well; `ProtectedRoute` keeps that and is passed through here, as in
//              App.test.jsx). While the server's answer is on its way the page waits rather than
//              turning an admin away. The path was /diagnose-verteilung until 2026-11-13; the
//              owner had it put into English with no alias (WEBSITE-EXTRAS-1), so the old path
//              reaches nothing and no code links it.
// ============================================================

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
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

describe('item 27 — /diagnose-distribution follows the switch', () => {
  it('OFF: the address leads back to the setup screen', async () => {
    openAt('/diagnose-distribution', false);
    expect(await screen.findByText('setup screen')).toBeInTheDocument();
    expect(screen.queryByText('distribution page')).toBeNull();
  });

  it('ON: the page is there', async () => {
    openAt('/diagnose-distribution', true);
    expect(await screen.findByText('distribution page')).toBeInTheDocument();
  });

  it('not known yet: it waits, then follows the answer', async () => {
    openAt('/diagnose-distribution', 'unknown');
    expect(screen.queryByText('distribution page')).toBeNull();
    expect(screen.queryByText('setup screen')).toBeNull();
    act(() => _setTestAidsForTests(true));
    expect(await screen.findByText('distribution page')).toBeInTheDocument();
  });
});

describe('the old German path is gone (2026-11-13)', () => {
  const OLD = '/diagnose-' + 'verteilung';

  it('★ with the switch ON, the old path does not reach the page (no alias)', async () => {
    openAt(OLD, true);
    // The route table has no catch-all, so nothing renders; give the router its tick.
    await act(async () => {});
    expect(screen.queryByText('distribution page')).toBeNull();
  });

  it('★ no code, test or script links the old path as a string', () => {
    const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
    // A quoted, back-ticked or regex-escaped occurrence is a link; prose in a comment is not.
    const forms = [`'${OLD}`, `"${OLD}`, `\`${OLD}`, '\\/diagnose-' + 'verteilung'];
    // git grep reads the working tree through the index: a walk of the folders takes ~30 s on
    // OneDrive. Exit status 1 is "no match".
    let hits = '';
    try {
      hits = execFileSync(
        'git',
        [
          'grep',
          '-l',
          '-F',
          ...forms.flatMap((f) => ['-e', f]),
          '--',
          'client',
          'server',
          'scripts',
        ],
        { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (e) {
      if (e.status !== 1) throw e;
    }
    expect(hits.trim().split('\n').filter(Boolean)).toEqual([]);
  });
});
