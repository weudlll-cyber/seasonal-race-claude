// ============================================================
// File:        playerGroupMigration.test.js
// Path:        client/src/modules/storage/playerGroupMigration.test.js
// Project:     RaceArena
// Description: Unit tests for localStorage-to-server migration (D2).
//              Includes the HONESTY PROOF: migration test is RED without the
//              createPlayerGroup call, GREEN with it.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getLocalPlayerGroups,
  migrateLocalPlayerGroupsToServer,
  MIGRATION_MARKER_KEY,
} from './playerGroupMigration.js';
import { storageGet, storageSet, KEYS } from './storage.js';

// Mock the server API — migration calls createPlayerGroup
vi.mock('../../services/playerGroupApi.js', () => ({
  createPlayerGroup: vi.fn(),
}));

import { createPlayerGroup } from '../../services/playerGroupApi.js';

const GROUP_A = { id: 'group-a', name: 'Group A', players: ['Alice', 'Bob'] };
const GROUP_B = { id: 'group-b', name: 'Group B', players: ['Carol'] };

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  createPlayerGroup.mockResolvedValue({
    id: 'group-a',
    name: 'Group A',
    players: ['Alice', 'Bob'],
    isDefault: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── getLocalPlayerGroups ──────────────────────────────────────────────────────

describe('getLocalPlayerGroups', () => {
  it('returns empty array when localStorage has no groups', () => {
    expect(getLocalPlayerGroups()).toEqual([]);
  });

  it('returns all groups when serverGroupIds is empty', () => {
    storageSet(KEYS.PLAYER_GROUPS, [GROUP_A, GROUP_B]);
    const result = getLocalPlayerGroups();
    expect(result).toHaveLength(2);
  });

  it('excludes groups already on the server', () => {
    storageSet(KEYS.PLAYER_GROUPS, [GROUP_A, GROUP_B]);
    const result = getLocalPlayerGroups(new Set(['group-a']));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('group-b');
  });

  it('returns empty when all local groups are already on server', () => {
    storageSet(KEYS.PLAYER_GROUPS, [GROUP_A]);
    const result = getLocalPlayerGroups(new Set(['group-a']));
    expect(result).toHaveLength(0);
  });
});

// ── migrateLocalPlayerGroupsToServer ─────────────────────────────────────────

describe('migrateLocalPlayerGroupsToServer — idempotency', () => {
  it('skips migration and returns true when marker is already set', async () => {
    storageSet(MIGRATION_MARKER_KEY, true);
    storageSet(KEYS.PLAYER_GROUPS, [GROUP_A]);

    const result = await migrateLocalPlayerGroupsToServer();
    expect(result).toBe(true);
    expect(createPlayerGroup).not.toHaveBeenCalled();
  });

  it('sets marker and returns true when nothing needs to migrate', async () => {
    storageSet(KEYS.PLAYER_GROUPS, [GROUP_A]);
    // All groups already on server
    const result = await migrateLocalPlayerGroupsToServer(new Set(['group-a']));
    expect(result).toBe(true);
    expect(storageGet(MIGRATION_MARKER_KEY, false)).toBe(true);
    expect(createPlayerGroup).not.toHaveBeenCalled();
  });
});

// ── HONESTY PROOF — RED without createPlayerGroup call, GREEN with it ─────────
//
// The test below sends local groups to the server via createPlayerGroup.
// WITHOUT the actual createPlayerGroup call inside migrateLocalPlayerGroupsToServer:
//   → createPlayerGroup would not be called → assertion fails (RED)
//   → marker would not be set on "success" → second assertion also fails
// WITH the call: both assertions pass (GREEN).

describe('Honesty proof — migration calls createPlayerGroup + sets marker on success', () => {
  it('[PROOF] createPlayerGroup is called for each unsynced local group', async () => {
    storageSet(KEYS.PLAYER_GROUPS, [GROUP_A, GROUP_B]);

    await migrateLocalPlayerGroupsToServer(new Set());

    // Without the createPlayerGroup call in migration: RED (not called)
    // With the call: GREEN
    expect(createPlayerGroup).toHaveBeenCalledTimes(2);
    expect(createPlayerGroup).toHaveBeenCalledWith({
      id: GROUP_A.id,
      name: GROUP_A.name,
      players: GROUP_A.players,
    });
    expect(createPlayerGroup).toHaveBeenCalledWith({
      id: GROUP_B.id,
      name: GROUP_B.name,
      players: GROUP_B.players,
    });
  });

  it('[PROOF] migration marker is set only after full success', async () => {
    storageSet(KEYS.PLAYER_GROUPS, [GROUP_A]);
    createPlayerGroup.mockResolvedValue({
      id: 'group-a',
      name: 'Group A',
      players: [],
      isDefault: false,
    });

    const result = await migrateLocalPlayerGroupsToServer(new Set());

    // Without the marker write in migration: RED (marker stays false)
    // With the write: GREEN
    expect(result).toBe(true);
    expect(storageGet(MIGRATION_MARKER_KEY, false)).toBe(true);
  });
});

// ── Partial failure — marker NOT set ─────────────────────────────────────────

describe('migrateLocalPlayerGroupsToServer — partial failure', () => {
  it('does NOT set marker when createPlayerGroup fails for any group', async () => {
    storageSet(KEYS.PLAYER_GROUPS, [GROUP_A, GROUP_B]);
    // First group fails, second succeeds
    createPlayerGroup
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ id: 'group-b', name: 'Group B', players: [], isDefault: false });

    const result = await migrateLocalPlayerGroupsToServer(new Set());

    expect(result).toBe(false);
    // Marker must NOT be set — will retry on next load
    expect(storageGet(MIGRATION_MARKER_KEY, false)).toBe(false);
    // Both groups were attempted
    expect(createPlayerGroup).toHaveBeenCalledTimes(2);
  });

  it('returns false and leaves marker unset when ALL groups fail', async () => {
    storageSet(KEYS.PLAYER_GROUPS, [GROUP_A]);
    createPlayerGroup.mockRejectedValue(new Error('Server down'));

    const result = await migrateLocalPlayerGroupsToServer(new Set());
    expect(result).toBe(false);
    expect(storageGet(MIGRATION_MARKER_KEY, false)).toBe(false);
  });
});

// ── localStorage groups not deleted after migration ───────────────────────────

describe('migrateLocalPlayerGroupsToServer — local groups preserved', () => {
  it('does NOT remove groups from localStorage after successful migration', async () => {
    storageSet(KEYS.PLAYER_GROUPS, [GROUP_A]);
    createPlayerGroup.mockResolvedValue({ ...GROUP_A, isDefault: false });

    await migrateLocalPlayerGroupsToServer(new Set());

    const remaining = storageGet(KEYS.PLAYER_GROUPS, []);
    expect(remaining.some((g) => g.id === 'group-a')).toBe(true);
  });
});
