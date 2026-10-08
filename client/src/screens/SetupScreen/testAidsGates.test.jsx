// ============================================================
// File:        testAidsGates.test.jsx
// Path:        client/src/screens/SetupScreen/testAidsGates.test.jsx
// Project:     RaceArena — TEST-AIDS-1
// Description: The setup screen's two gates.
//                · Item 9, Quick Test: shown only while the test-aids switch is ON.
//                · Item 11, the seed, key and identifier tools (the field, the copy row, the run-it-
//                  again line, the build-mismatch alert): ADMIN-ONLY whatever the switch says — the
//                  role is the server's, read through AuthContext.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forbidNetwork } from '../../test/mockServerTracks.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';
import { CACHE_KEY } from '../../modules/storage/trackLoader.js';
import { storageSet } from '../../modules/storage/storage.js';
import { _setTestAidsForTests } from '../../modules/testAids.js';

const auth = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('../../contexts/AuthContext.jsx', async () => {
  const { authMock } = await import('../../test/mockAuth.js');
  return {
    useAuth: () => authMock(auth.role).useAuth(),
    AuthProvider: ({ children }) => children,
  };
});
vi.mock('../../modules/storage/useServerTracks.js', async () => {
  const { serverTracksMock } = await import('../../test/mockServerTracks.js');
  return serverTracksMock();
});
vi.mock('../../services/seedNoticeApi.js', () => ({
  fetchSeedNotices: vi.fn().mockResolvedValue([]),
  dismissSeedNotice: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../services/playerGroupApi.js', () => ({
  fetchPlayerGroups: vi.fn().mockResolvedValue([]),
}));
forbidNetwork();

const { default: SetupScreen } = await import('./SetupScreen.jsx');

function renderAs(role, aids) {
  auth.role = role;
  _setTestAidsForTests(aids);
  storageSet(CACHE_KEY, SAMPLE_TRACKS);
  render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>
  );
  // Tabs are [Players, Track, Settings]; the seed tools live on Settings.
  fireEvent.click(screen.getAllByRole('tab')[2]);
}

const quickTest = () => screen.queryByRole('button', { name: /Quick Test/ });
const seedField = () => screen.queryByTestId('race-seed-input');

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => _setTestAidsForTests('unknown'));

describe('item 9 — Quick Test follows the switch', () => {
  it('OFF: there is no Quick Test, not even for an admin', () => {
    renderAs('admin', false);
    expect(quickTest()).toBeNull();
    expect(screen.getByTestId('start-race')).toBeInTheDocument(); // the real start stays
  });

  it('ON: Quick Test is there', () => {
    renderAs('admin', true);
    expect(quickTest()).toBeInTheDocument();
  });

  it('while the answer is not in yet, it is OFF', () => {
    renderAs('admin', 'unknown');
    expect(quickTest()).toBeNull();
  });
});

describe('item 11 — the seed and identifier tools are for admins, whatever the switch', () => {
  it('an admin has them with the switch OFF', () => {
    renderAs('admin', false);
    expect(seedField()).toBeInTheDocument();
  });

  it('an admin has them with the switch ON', () => {
    renderAs('admin', true);
    expect(seedField()).toBeInTheDocument();
  });

  it('an operator has none of them with the switch OFF', () => {
    renderAs('operator', false);
    expect(seedField()).toBeNull();
    expect(screen.queryByText(/Race Seed, Key or Identifier/)).toBeNull();
  });

  it('an operator has none of them with the switch ON either', () => {
    renderAs('operator', true);
    expect(seedField()).toBeNull();
    expect(quickTest()).toBeInTheDocument(); // the switch gives Quick Test, not the seed tools
  });
});
