// ============================================================
// File:        trackMigration.test.js
// Path:        client/src/modules/storage/trackMigration.test.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: Unit tests for localStorage-to-server migration
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getLocalCustomTracks,
  migrateLocalTracksToServer,
  MIGRATION_MARKER_KEY,
} from './trackMigration.js';
import { storageGet, storageSet, KEYS } from './storage.js';
import { DEFAULT_TRACKS } from './defaults.js';

// Mock the server API functions — migration calls these
vi.mock('../../services/trackApi.js', () => ({
  createTrackOnServer: vi.fn(),
  uploadTrackBackground: vi.fn(),
}));

import { createTrackOnServer, uploadTrackBackground } from '../../services/trackApi.js';

const DEFAULT_IDS = new Set(DEFAULT_TRACKS.map((t) => t.id));

const CUSTOM_TRACK = {
  id: 'my-custom-track',
  name: 'My Custom Track',
  icon: '🏁',
  geometryId: 'custom-geo-abc',
  color: '#ff0000',
  defaultDuration: 60,
  defaultWinners: 3,
  isDefault: false,
};

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  createTrackOnServer.mockResolvedValue({ id: 'server-new-id', geometryId: 'custom-geo-abc' });
  uploadTrackBackground.mockResolvedValue({ backgroundImageFile: 'server-new-id.jpg' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getLocalCustomTracks', () => {
  it('returns empty array when no tracks in localStorage', () => {
    expect(getLocalCustomTracks()).toEqual([]);
  });

  it('excludes DEFAULT_TRACKS', () => {
    storageSet(KEYS.TRACKS, DEFAULT_TRACKS);
    const result = getLocalCustomTracks();
    const defaultIds = new Set(result.map((t) => t.id));
    for (const id of DEFAULT_IDS) {
      expect(defaultIds.has(id)).toBe(false);
    }
  });

  it('includes non-default tracks', () => {
    storageSet(KEYS.TRACKS, [...DEFAULT_TRACKS, CUSTOM_TRACK]);
    const result = getLocalCustomTracks();
    expect(result.some((t) => t.id === CUSTOM_TRACK.id)).toBe(true);
  });

  it('excludes tracks already on server', () => {
    storageSet(KEYS.TRACKS, [...DEFAULT_TRACKS, CUSTOM_TRACK]);
    const serverIds = new Set([CUSTOM_TRACK.id]);
    const result = getLocalCustomTracks(serverIds);
    expect(result.some((t) => t.id === CUSTOM_TRACK.id)).toBe(false);
  });
});

describe('migrateLocalTracksToServer', () => {
  it('skips migration when marker is already set', async () => {
    storageSet(MIGRATION_MARKER_KEY, true);
    storageSet(KEYS.TRACKS, [...DEFAULT_TRACKS, CUSTOM_TRACK]);

    const result = await migrateLocalTracksToServer();
    expect(result).toBe(true);
    expect(createTrackOnServer).not.toHaveBeenCalled();
  });

  it('sets marker and returns true when nothing to migrate', async () => {
    storageSet(KEYS.TRACKS, DEFAULT_TRACKS);

    const result = await migrateLocalTracksToServer();
    expect(result).toBe(true);
    expect(storageGet(MIGRATION_MARKER_KEY, false)).toBe(true);
  });

  it('calls createTrackOnServer for each custom track', async () => {
    storageSet(KEYS.TRACKS, [...DEFAULT_TRACKS, CUSTOM_TRACK]);

    await migrateLocalTracksToServer();
    expect(createTrackOnServer).toHaveBeenCalledOnce();
    const callArg = createTrackOnServer.mock.calls[0][0];
    expect(callArg.name).toBe(CUSTOM_TRACK.name);
  });

  it('sets migration marker on full success', async () => {
    storageSet(KEYS.TRACKS, [...DEFAULT_TRACKS, CUSTOM_TRACK]);

    await migrateLocalTracksToServer();
    expect(storageGet(MIGRATION_MARKER_KEY, false)).toBe(true);
  });

  it('does NOT set marker when createTrackOnServer fails', async () => {
    createTrackOnServer.mockRejectedValue(new Error('Network error'));
    storageSet(KEYS.TRACKS, [...DEFAULT_TRACKS, CUSTOM_TRACK]);

    const result = await migrateLocalTracksToServer();
    expect(result).toBe(false);
    expect(storageGet(MIGRATION_MARKER_KEY, false)).toBe(false);
  });

  it('removes migrated track from KEYS.TRACKS on success', async () => {
    storageSet(KEYS.TRACKS, [...DEFAULT_TRACKS, CUSTOM_TRACK]);

    await migrateLocalTracksToServer();

    const remaining = storageGet(KEYS.TRACKS, []);
    expect(remaining.some((t) => t.id === CUSTOM_TRACK.id)).toBe(false);
  });
});
