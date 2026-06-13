import { describe, it, expect, beforeEach } from 'vitest';
import { storageGet, storageSet, KEYS } from './storage.js';
import { DEFAULT_TRACKS } from './defaults.js';
import { migrateStorage, CURRENT_DATA_VERSION } from './migrateStorage.js';

beforeEach(() => {
  localStorage.clear();
});

describe('migrateStorage — default seeding', () => {
  it('seeds DEFAULT_TRACKS when no tracks exist (fresh install)', () => {
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks).toHaveLength(DEFAULT_TRACKS.length);
    expect(tracks[0].id).toBe(DEFAULT_TRACKS[0].id);
  });

  it('seeds DEFAULT_TRACKS when tracks key holds an empty array', () => {
    storageSet(KEYS.TRACKS, []);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks).toHaveLength(DEFAULT_TRACKS.length);
  });

  it('preserves existing tracks — does NOT overwrite when tracks are present', () => {
    const custom = [{ id: 'custom-1', name: 'My Track', icon: '🧪' }];
    storageSet(KEYS.TRACKS, custom);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('My Track');
  });

  it('preserves user presets that were added before DATA_VERSION was set', () => {
    // Simulate: user had all defaults + 1 custom, but dataVersion was never written
    const withCustom = [...DEFAULT_TRACKS, { id: 'custom-2', name: 'DIAG_TEST', icon: '🧪' }];
    storageSet(KEYS.TRACKS, withCustom);
    // dataVersion absent → migration fires
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.name === 'DIAG_TEST')).toBe(true);
    expect(tracks).toHaveLength(DEFAULT_TRACKS.length + 1);
  });

  it('sets DATA_VERSION to CURRENT after migration runs', () => {
    migrateStorage();
    expect(storageGet(KEYS.DATA_VERSION, 0)).toBe(CURRENT_DATA_VERSION);
  });

  it('does not re-seed when DATA_VERSION is already current', () => {
    storageSet(KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
    storageSet(KEYS.TRACKS, [{ id: 'solo', name: 'Solo Track', icon: '🏁' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('Solo Track');
  });
});

describe('migrateStorage — v3: stale promoted-default cleanup (case-insensitive)', () => {
  const MOUNTAINSTREET = DEFAULT_TRACKS.find((t) => t.name === 'Mountainstreet');

  it('removes a stale hash-ID entry — exact-case name match', () => {
    storageSet(KEYS.DATA_VERSION, 2);
    storageSet(KEYS.TRACKS, [
      { id: '41e000001cfcaa', name: 'Mountainstreet', icon: '🏞', color: '#e63946' },
      { id: 'custom-user', name: 'My Custom Track', icon: '🧪' },
    ]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === '41e000001cfcaa')).toBe(false);
    expect(tracks.some((t) => t.id === 'custom-user')).toBe(true);
  });

  it('removes a stale hash-ID entry — different capitalisation (e.g. "mountainstreet")', () => {
    storageSet(KEYS.DATA_VERSION, 2);
    storageSet(KEYS.TRACKS, [{ id: '41e000001cfcaa', name: 'mountainstreet', icon: '🏞' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === '41e000001cfcaa')).toBe(false);
  });

  it('removes a stale hash-ID entry — mixed capitalisation (e.g. "MountainStreet")', () => {
    storageSet(KEYS.DATA_VERSION, 2);
    storageSet(KEYS.TRACKS, [{ id: 'stale-hash-xyz', name: 'MountainStreet', icon: '🏞' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === 'stale-hash-xyz')).toBe(false);
  });

  it('removes stale entry even when coming from v1 (skips straight to v3)', () => {
    storageSet(KEYS.DATA_VERSION, 1);
    storageSet(KEYS.TRACKS, [
      { id: 'stale-v1-hash', name: 'mountainstreet', icon: '🏞' },
      { id: 'keep-me', name: 'User Track', icon: '🧪' },
    ]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === 'stale-v1-hash')).toBe(false);
    expect(tracks.some((t) => t.id === 'keep-me')).toBe(true);
  });

  it('keeps the canonical default-ID entry untouched', () => {
    storageSet(KEYS.DATA_VERSION, 2);
    storageSet(KEYS.TRACKS, [{ id: MOUNTAINSTREET.id, name: 'Mountainstreet', icon: '🏞' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === MOUNTAINSTREET.id)).toBe(true);
  });

  it('preserves user tracks whose names do not match any default', () => {
    storageSet(KEYS.DATA_VERSION, 2);
    storageSet(KEYS.TRACKS, [{ id: 'xyz789', name: 'My Private Track', icon: '🎯' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe('xyz789');
  });

  it('handles entries with missing name field without crashing', () => {
    storageSet(KEYS.DATA_VERSION, 2);
    storageSet(KEYS.TRACKS, [{ id: 'no-name-entry', icon: '🎯' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === 'no-name-entry')).toBe(true);
  });
});

describe('migrateStorage — v4: stale Ice Track cleanup', () => {
  const ICE_TRACK = DEFAULT_TRACKS.find((t) => t.name === 'Ice Track');

  it('removes stale "Ice track" (lowercase t) entry for users at v3', () => {
    storageSet(KEYS.DATA_VERSION, 3);
    storageSet(KEYS.TRACKS, [
      { id: 'd32f38cb89a9', name: 'Ice track', icon: '🎿', color: '#e63946' },
      { id: 'keep-custom', name: 'My Track', icon: '🧪' },
    ]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === 'd32f38cb89a9')).toBe(false);
    expect(tracks.some((t) => t.id === 'keep-custom')).toBe(true);
  });

  it('removes stale "ICE TRACK" (all caps) entry', () => {
    storageSet(KEYS.DATA_VERSION, 3);
    storageSet(KEYS.TRACKS, [{ id: 'hash-ice', name: 'ICE TRACK', icon: '🎿' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === 'hash-ice')).toBe(false);
  });

  it('keeps the canonical ice-track entry untouched', () => {
    storageSet(KEYS.DATA_VERSION, 3);
    storageSet(KEYS.TRACKS, [{ id: ICE_TRACK.id, name: 'Ice Track', icon: '🎿' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === ICE_TRACK.id)).toBe(true);
  });

  it('fires for users at v3 and bumps version to current', () => {
    storageSet(KEYS.DATA_VERSION, 3);
    migrateStorage();
    expect(storageGet(KEYS.DATA_VERSION, 0)).toBe(CURRENT_DATA_VERSION);
  });
});

describe('migrateStorage — v5: stale Seatrack/Searound cleanup', () => {
  const SEATRACK = DEFAULT_TRACKS.find((t) => t.name === 'Seatrack');
  const SEAROUND = DEFAULT_TRACKS.find((t) => t.name === 'Searound');

  it('removes stale hash-ID Seatrack entry for users at v4', () => {
    storageSet(KEYS.DATA_VERSION, 4);
    storageSet(KEYS.TRACKS, [
      { id: 'cdc8780d97a7', name: 'Seatrack', icon: '🐬', color: '#0077b6' },
      { id: 'keep-custom', name: 'My Track', icon: '🧪' },
    ]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === 'cdc8780d97a7')).toBe(false);
    expect(tracks.some((t) => t.id === 'keep-custom')).toBe(true);
  });

  it('removes stale hash-ID Searound entry for users at v4', () => {
    storageSet(KEYS.DATA_VERSION, 4);
    storageSet(KEYS.TRACKS, [
      { id: '5ea647f96360', name: 'Searound', icon: '🌊', color: '#023e8a' },
      { id: 'keep-custom', name: 'My Track', icon: '🧪' },
    ]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === '5ea647f96360')).toBe(false);
    expect(tracks.some((t) => t.id === 'keep-custom')).toBe(true);
  });

  it('removes both stale entries when user has both', () => {
    storageSet(KEYS.DATA_VERSION, 4);
    storageSet(KEYS.TRACKS, [
      { id: 'cdc8780d97a7', name: 'Seatrack', icon: '🐬' },
      { id: '5ea647f96360', name: 'Searound', icon: '🌊' },
      { id: 'custom-keep', name: 'User Track', icon: '🧪' },
    ]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === 'cdc8780d97a7')).toBe(false);
    expect(tracks.some((t) => t.id === '5ea647f96360')).toBe(false);
    expect(tracks.some((t) => t.id === 'custom-keep')).toBe(true);
  });

  it('case-insensitive: removes "SEATRACK" variant', () => {
    storageSet(KEYS.DATA_VERSION, 4);
    storageSet(KEYS.TRACKS, [{ id: 'old-hash-abc', name: 'SEATRACK', icon: '🐬' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === 'old-hash-abc')).toBe(false);
  });

  it('keeps the canonical seatrack entry untouched', () => {
    storageSet(KEYS.DATA_VERSION, 4);
    storageSet(KEYS.TRACKS, [{ id: SEATRACK.id, name: 'Seatrack', icon: '🐬' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === SEATRACK.id)).toBe(true);
  });

  it('keeps the canonical searound entry untouched', () => {
    storageSet(KEYS.DATA_VERSION, 4);
    storageSet(KEYS.TRACKS, [{ id: SEAROUND.id, name: 'Searound', icon: '🌊' }]);
    migrateStorage();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.id === SEAROUND.id)).toBe(true);
  });

  it('fires for users at v4 and bumps version to current', () => {
    storageSet(KEYS.DATA_VERSION, 4);
    migrateStorage();
    expect(storageGet(KEYS.DATA_VERSION, 0)).toBe(CURRENT_DATA_VERSION);
  });
});
