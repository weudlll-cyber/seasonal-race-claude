// ============================================================
// File:        PlayerGroupsManager.test.jsx
// Path:        client/src/screens/DevScreen/sections/PlayerGroupsManager.test.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Render smoke-tests for PlayerGroupsManager — verifies section
//              subtitle and tooltip texts render correctly after PR-A3.1.
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../modules/storage/useStorage.js', () => ({
  useStorage: vi.fn((_, defaultValue) => [defaultValue, vi.fn()]),
}));

vi.mock('../../../modules/storage/storage.js', () => ({
  KEYS: {
    PLAYER_GROUPS: 'racearena:playerGroups',
    RACE_DEFAULTS: 'racearena:raceDefaults',
  },
  newId: vi.fn(() => 'test-id'),
  storageSet: vi.fn(),
}));

vi.mock('../../../modules/storage/defaults.js', () => ({
  DEFAULT_PLAYER_GROUPS: [],
  DEFAULT_RACE_DEFAULTS: { maxPlayers: 20, maxPlayersClosed: 40, maxPlayersOpen: 100 },
}));

vi.mock('../../../modules/utils/RandomHelper.js', () => ({
  assignRacers: vi.fn((players) => players.map((p) => ({ name: p }))),
}));

import PlayerGroupsManager from './PlayerGroupsManager.jsx';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlayerGroupsManager — tooltip render (PR-A3.1)', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <PlayerGroupsManager />
      </MemoryRouter>
    );
    expect(screen.getByText(/Saved Groups/)).toBeTruthy();
  });

  it('renders the section subtitle', () => {
    render(
      <MemoryRouter>
        <PlayerGroupsManager />
      </MemoryRouter>
    );
    expect(screen.getByText(/Groups of players that you race with regularly/)).toBeTruthy();
  });

  it('renders tooltip texts for form fields when the new-group form is open', () => {
    render(
      <MemoryRouter>
        <PlayerGroupsManager />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('+ New Group'));

    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    const groupNameTip = tooltips.find((el) => el.textContent.includes('recognizable name'));
    const playersTip = tooltips.find((el) => el.textContent.includes('frequently races together'));
    expect(groupNameTip).toBeTruthy();
    expect(playersTip).toBeTruthy();
  });
});
