// ============================================================
// File:        PlayerGroupsManager.test.jsx
// Path:        client/src/screens/DevScreen/sections/PlayerGroupsManager.test.jsx
// Project:     RaceArena
// Description: Tests for PlayerGroupsManager after D2 (server-backed).
//              Covers: initial load from server, CRUD → API calls, loading/error
//              states, default-group 403 shown as visible error, migration trigger,
//              and ACTIVE_GROUP still written locally on Load-to-Setup.
// ============================================================

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../services/playerGroupApi.js', () => ({
  fetchPlayerGroups: vi.fn(),
  createPlayerGroup: vi.fn(),
  updatePlayerGroup: vi.fn(),
  deletePlayerGroup: vi.fn(),
  setPlayerGroupDefault: vi.fn().mockResolvedValue({}),
  clearPlayerGroupDefault: vi.fn().mockResolvedValue({}),
  exportPlayerGroupSeed: vi.fn().mockResolvedValue({ id: 'group-a' }),
}));

vi.mock('../../../contexts/AuthContext.jsx', () => ({
  useAuth: vi.fn(() => ({ user: { role: 'admin' } })),
}));

vi.mock('../../../modules/storage/playerGroupMigration.js', () => ({
  migrateLocalPlayerGroupsToServer: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../modules/storage/useStorage.js', () => ({
  useStorage: vi.fn((_, defaultValue) => [defaultValue, vi.fn()]),
}));

vi.mock('../../../modules/storage/storage.js', () => ({
  KEYS: {
    RACE_DEFAULTS: 'racearena:raceDefaults',
    ACTIVE_GROUP: 'racearena:activeGroup',
  },
  storageSet: vi.fn(),
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

vi.mock('../../../modules/storage/defaults.js', () => ({
  DEFAULT_RACE_DEFAULTS: { maxPlayersClosed: 40, maxPlayersOpen: 100 },
}));

// DROP-RACER-NUMBER-1: the RandomHelper mock was removed with `assignRacers`. This component no
// longer imports that module — Load-to-Setup writes plain `{ name }` objects.

import PlayerGroupsManager from './PlayerGroupsManager.jsx';
import {
  fetchPlayerGroups,
  createPlayerGroup,
  updatePlayerGroup,
  deletePlayerGroup,
} from '../../../services/playerGroupApi.js';
import { migrateLocalPlayerGroupsToServer } from '../../../modules/storage/playerGroupMigration.js';
import { storageSet } from '../../../modules/storage/storage.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CUSTOM_GROUP = {
  id: 'group-a',
  name: 'Friday Crew',
  players: ['Alice', 'Bob'],
  isDefault: false,
};

const DEFAULT_GROUP = {
  id: 'default-example-group',
  name: 'Example Group',
  players: ['Alice', 'Bob', 'Charlie'],
  isDefault: true,
};

function renderManager() {
  return render(
    <MemoryRouter>
      <PlayerGroupsManager />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: server returns one custom group
  fetchPlayerGroups.mockResolvedValue([CUSTOM_GROUP]);
  migrateLocalPlayerGroupsToServer.mockResolvedValue(true);
});

// ── Initial load from server ──────────────────────────────────────────────────

describe('PlayerGroupsManager — initial load from server', () => {
  it('renders the loading state before data arrives', async () => {
    fetchPlayerGroups.mockReturnValue(new Promise(() => {})); // never resolves
    renderManager();
    expect(screen.getByText(/Loading groups/i)).toBeTruthy();
  });

  it('renders group name from server after load', async () => {
    renderManager();
    await waitFor(() => expect(screen.getByText('Friday Crew')).toBeTruthy());
  });

  it('calls fetchPlayerGroups on mount', async () => {
    renderManager();
    await waitFor(() => expect(fetchPlayerGroups).toHaveBeenCalled());
  });

  it('triggers migration after initial fetch', async () => {
    renderManager();
    await waitFor(() => expect(migrateLocalPlayerGroupsToServer).toHaveBeenCalled());
  });

  it('renders section header', async () => {
    renderManager();
    await waitFor(() => expect(screen.getByText(/Saved Groups/)).toBeTruthy());
  });

  it('shows empty state when server returns no groups', async () => {
    fetchPlayerGroups.mockResolvedValue([]);
    renderManager();
    await waitFor(() => expect(screen.getByText(/No groups yet/i)).toBeTruthy());
  });
});

// ── Load error state ──────────────────────────────────────────────────────────

describe('PlayerGroupsManager — server load error', () => {
  it('shows role=alert error message when fetchPlayerGroups fails', async () => {
    fetchPlayerGroups.mockRejectedValue(new Error('Server not reachable'));
    renderManager();
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toMatch(/Server not reachable/i);
    });
  });

  it('does not show the group list when load fails', async () => {
    fetchPlayerGroups.mockRejectedValue(new Error('Network error'));
    renderManager();
    await waitFor(() => screen.getByRole('alert'));
    expect(screen.queryByText('Friday Crew')).toBeNull();
  });
});

// ── CRUD — create ─────────────────────────────────────────────────────────────

describe('PlayerGroupsManager — create group', () => {
  it('Create Group calls createPlayerGroup with name and players', async () => {
    createPlayerGroup.mockResolvedValue({
      id: 'new-id',
      name: 'New Team',
      players: ['X'],
      isDefault: false,
    });
    renderManager();
    await waitFor(() => screen.getByText('Friday Crew'));

    fireEvent.click(screen.getByText('+ New Group'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Friday Team'), {
      target: { value: 'New Team' },
    });
    fireEvent.change(screen.getByPlaceholderText('Alice, Bob, Carol, Dave…'), {
      target: { value: 'X' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Group'));
    });

    expect(createPlayerGroup).toHaveBeenCalledWith({ name: 'New Team', players: ['X'] });
  });

  it('calls fetchPlayerGroups again after create (refresh)', async () => {
    createPlayerGroup.mockResolvedValue({
      id: 'new-id',
      name: 'New Team',
      players: ['X'],
      isDefault: false,
    });
    renderManager();
    await waitFor(() => screen.getByText('Friday Crew'));
    const callsBefore = fetchPlayerGroups.mock.calls.length;

    fireEvent.click(screen.getByText('+ New Group'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Friday Team'), {
      target: { value: 'New Team' },
    });
    fireEvent.change(screen.getByPlaceholderText('Alice, Bob, Carol, Dave…'), {
      target: { value: 'X' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Group'));
    });

    expect(fetchPlayerGroups.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('shows actionError when createPlayerGroup throws', async () => {
    createPlayerGroup.mockRejectedValue(new Error('name is required'));
    renderManager();
    await waitFor(() => screen.getByText('Friday Crew'));

    fireEvent.click(screen.getByText('+ New Group'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Friday Team'), { target: { value: 'X' } });
    fireEvent.change(screen.getByPlaceholderText('Alice, Bob, Carol, Dave…'), {
      target: { value: 'Y' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Group'));
    });

    expect(screen.getByRole('alert').textContent).toMatch(/name is required/i);
  });
});

// ── CRUD — update ─────────────────────────────────────────────────────────────

describe('PlayerGroupsManager — update group', () => {
  it('Edit → Save Changes calls updatePlayerGroup', async () => {
    updatePlayerGroup.mockResolvedValue({ ...CUSTOM_GROUP, name: 'Updated' });
    renderManager();
    await waitFor(() => screen.getByText('Friday Crew'));

    // Click edit (pencil icon)
    const editBtn = screen.getAllByTitle('Edit')[0];
    fireEvent.click(editBtn);

    // Change name
    const nameInput = screen.getByPlaceholderText('e.g. Friday Team');
    fireEvent.change(nameInput, { target: { value: 'Updated' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    expect(updatePlayerGroup).toHaveBeenCalledWith(
      'group-a',
      expect.objectContaining({ name: 'Updated' })
    );
  });
});

// ── CRUD — delete ─────────────────────────────────────────────────────────────

describe('PlayerGroupsManager — delete group', () => {
  it('Delete calls deletePlayerGroup after confirm', async () => {
    deletePlayerGroup.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderManager();
    await waitFor(() => screen.getByText('Friday Crew'));

    await act(async () => {
      fireEvent.click(screen.getAllByTitle('Delete')[0]);
    });

    expect(deletePlayerGroup).toHaveBeenCalledWith('group-a');
  });

  it('Delete does nothing when user cancels confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderManager();
    await waitFor(() => screen.getByText('Friday Crew'));

    await act(async () => {
      fireEvent.click(screen.getAllByTitle('Delete')[0]);
    });

    expect(deletePlayerGroup).not.toHaveBeenCalled();
  });
});

// ── Default group: client-side guard shows error immediately ─────────────────
// (Previously tested server-side 403; now the client guard fires first so the
//  API is never called and confirm never shown.)

describe('PlayerGroupsManager — default group: client-side guard', () => {
  it('shows German error immediately without calling confirm or deletePlayerGroup', async () => {
    fetchPlayerGroups.mockResolvedValue([DEFAULT_GROUP]);
    const confirmSpy = vi.spyOn(window, 'confirm');

    renderManager();
    await waitFor(() => screen.getByText('Example Group'));

    await act(async () => {
      fireEvent.click(screen.getByTitle('Delete'));
    });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/Eine Default-Gruppe kann nicht gelöscht werden/i);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(deletePlayerGroup).not.toHaveBeenCalled();
  });
});

// ── ACTIVE_GROUP stays local (Invariant 2) ────────────────────────────────────

describe('PlayerGroupsManager — ACTIVE_GROUP written locally on Load', () => {
  it('Load to Setup writes KEYS.ACTIVE_GROUP via storageSet (not the server)', async () => {
    renderManager();
    await waitFor(() => screen.getByText('Friday Crew'));

    fireEvent.click(screen.getByTitle('Load this group into the Setup Screen'));

    // DROP-RACER-NUMBER-1: the SHAPE is asserted, not just "an array". The hand-off used to run the
    // names through `assignRacers` for a `racerNumber`; it now carries names only, and a saved group
    // must still load. The server stores `players` as plain strings, so this is the whole contract.
    expect(storageSet).toHaveBeenCalledWith('racearena:activeGroup', expect.any(Array));
    const [, handedOff] = storageSet.mock.calls.find((c) => c[0] === 'racearena:activeGroup');
    expect(handedOff.length).toBeGreaterThan(0);
    for (const p of handedOff) {
      expect(Object.keys(p)).toEqual(['name']);
      expect(typeof p.name).toBe('string');
    }
  });
});

// ── Tooltip render (preserved from pre-D2 tests) ─────────────────────────────

describe('PlayerGroupsManager — tooltip render (pre-D2 parity)', () => {
  it('renders without crashing', async () => {
    renderManager();
    await waitFor(() => expect(screen.getByText(/Saved Groups/)).toBeTruthy());
  });

  it('renders tooltip texts when new-group form is open', async () => {
    renderManager();
    await waitFor(() => screen.getByText('+ New Group'));
    fireEvent.click(screen.getByText('+ New Group'));
    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    expect(tooltips.some((el) => el.textContent.includes('recognizable name'))).toBe(true);
    expect(tooltips.some((el) => el.textContent.includes('frequently races together'))).toBe(true);
  });
});

// ── L126: Default-Lösch-Guard ─────────────────────────────────────────────────
// OHNE isDefault-Check: confirm + API werden aufgerufen → ROT
// MIT isDefault-Check:  Fehlermeldung sofort, kein confirm, kein API-Call → GRÜN

describe('PlayerGroupsManager — handleDelete: Default-Gruppe wird sofort abgelehnt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPlayerGroups.mockResolvedValue([DEFAULT_GROUP]); // isDefault: true
    migrateLocalPlayerGroupsToServer.mockResolvedValue(true);
  });

  it('zeigt sofort Fehlermeldung, ruft weder confirm noch deletePlayerGroup auf', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    renderManager();
    await waitFor(() => screen.getByText('Example Group'));

    await act(async () => {
      fireEvent.click(screen.getByTitle('Delete'));
    });

    expect(screen.getByText(/Eine Default-Gruppe kann nicht gelöscht werden/i)).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(deletePlayerGroup).not.toHaveBeenCalled();
  });

  it('normaler (nicht-default) Eintrag zeigt confirm und ruft API auf', async () => {
    fetchPlayerGroups.mockResolvedValue([CUSTOM_GROUP]); // isDefault: false
    deletePlayerGroup.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderManager();
    await waitFor(() => screen.getByText('Friday Crew'));

    await act(async () => {
      fireEvent.click(screen.getAllByTitle('Delete')[0]);
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(deletePlayerGroup).toHaveBeenCalledWith(CUSTOM_GROUP.id);
  });
});

// ── DefaultControls smoke test ────────────────────────────────────────────────

describe('PlayerGroupsManager — DefaultControls smoke test', () => {
  it('renders DefaultControls buttons per group row for admin user', async () => {
    renderManager();
    await waitFor(() => screen.getByText('Friday Crew'));
    expect(screen.getByText('Als Default setzen')).toBeInTheDocument();
    expect(screen.getByText('Als Seed exportieren')).toBeInTheDocument();
  });

  it('renders "Default entfernen" for group with isDefault=true', async () => {
    fetchPlayerGroups.mockResolvedValue([DEFAULT_GROUP]);
    renderManager();
    await waitFor(() => screen.getByText('Example Group'));
    expect(screen.getByText('Default entfernen')).toBeInTheDocument();
    expect(screen.getByText('Als Seed exportieren')).toBeInTheDocument();
  });
});
