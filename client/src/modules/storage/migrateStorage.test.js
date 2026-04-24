import { describe, it, expect, beforeEach } from 'vitest';
import { storageGet, storageSet, storageRemove, KEYS } from './storage.js';
import { DEFAULT_TRACKS } from './defaults.js';

// Re-implements the App.jsx migration logic so we can test its invariants in isolation.
// If the migration logic in App.jsx changes, update this helper to match.
const CURRENT_DATA_VERSION = 1;

function runMigration() {
  if (storageGet(KEYS.DATA_VERSION, 0) < CURRENT_DATA_VERSION) {
    const existing = storageGet(KEYS.TRACKS, null);
    if (!Array.isArray(existing) || existing.length === 0) {
      storageSet(KEYS.TRACKS, DEFAULT_TRACKS);
    }
    storageSet(KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
  }
}

beforeEach(() => {
  localStorage.clear();
});

describe('migrateStorage — default seeding', () => {
  it('seeds DEFAULT_TRACKS when no tracks exist (fresh install)', () => {
    runMigration();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks).toHaveLength(DEFAULT_TRACKS.length);
    expect(tracks[0].id).toBe('dirt-oval');
  });

  it('seeds DEFAULT_TRACKS when tracks key holds an empty array', () => {
    storageSet(KEYS.TRACKS, []);
    runMigration();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks).toHaveLength(DEFAULT_TRACKS.length);
  });

  it('preserves existing tracks — does NOT overwrite when tracks are present', () => {
    const custom = [{ id: 'custom-1', name: 'My Track', icon: '🧪' }];
    storageSet(KEYS.TRACKS, custom);
    runMigration();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('My Track');
  });

  it('preserves user presets that were added before DATA_VERSION was set', () => {
    // Simulate: user had 5 defaults + 1 custom, but dataVersion was never written
    const withCustom = [...DEFAULT_TRACKS, { id: 'custom-2', name: 'DIAG_TEST', icon: '🧪' }];
    storageSet(KEYS.TRACKS, withCustom);
    // dataVersion absent → migration fires
    runMigration();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks.some((t) => t.name === 'DIAG_TEST')).toBe(true);
    expect(tracks).toHaveLength(6);
  });

  it('sets DATA_VERSION to CURRENT after migration runs', () => {
    runMigration();
    expect(storageGet(KEYS.DATA_VERSION, 0)).toBe(CURRENT_DATA_VERSION);
  });

  it('does not re-seed when DATA_VERSION is already current', () => {
    storageSet(KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
    storageSet(KEYS.TRACKS, [{ id: 'solo', name: 'Solo Track', icon: '🏁' }]);
    runMigration();
    const tracks = storageGet(KEYS.TRACKS, null);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('Solo Track');
  });
});
