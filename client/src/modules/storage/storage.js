// ============================================================
// File:        storage.js
// Path:        client/src/modules/storage/storage.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: localStorage key registry and low-level read/write helpers
// ============================================================

export const KEYS = {
  PLAYER_GROUPS: 'racearena:playerGroups',
  RACER_TYPES: 'racearena:racerTypes',
  TRACKS: 'racearena:tracks',
  BRANDING: 'racearena:branding',
  RACE_DEFAULTS: 'racearena:raceDefaults',
  RACE_HISTORY: 'racearena:raceHistory',
  SETTINGS: 'racearena:settings',
  ACTIVE_GROUP: 'racearena:activeGroup',
  DATA_VERSION: 'racearena:dataVersion',
};

export function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[RaceArena] localStorage write failed:', err);
  }
}

export function storageRemove(key) {
  localStorage.removeItem(key);
}

/** Export all racearena:* keys as a plain object (for backup). */
export function exportAllStorage() {
  const out = {};
  for (const key of Object.values(KEYS)) {
    const val = storageGet(key);
    if (val !== null) out[key] = val;
  }
  return out;
}

/** Restore a full backup object (from importAllStorage). */
export function importAllStorage(data) {
  for (const [key, val] of Object.entries(data)) {
    if (key.startsWith('racearena:')) storageSet(key, val);
  }
}

/** Wipe all racearena:* keys. */
export function clearAllStorage() {
  for (const key of Object.values(KEYS)) {
    storageRemove(key);
  }
}

/** Simple unique ID: timestamp + random suffix. */
export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// One-time migration: flush old-format track presets (shapeId/environmentId → geometryId model).
// Runs at module-load time; safe to call multiple times — exits immediately if no old data exists.
(function migrateTracksIfNeeded() {
  try {
    const raw = localStorage.getItem('racearena:tracks');
    if (!raw) return;
    const tracks = JSON.parse(raw);
    if (Array.isArray(tracks) && tracks.length > 0 && 'shapeId' in tracks[0]) {
      localStorage.removeItem('racearena:tracks');
      console.warn(
        '[RaceArena] Flushed racearena:tracks: migrated from shapeId/environmentId to geometryId-based preset model.'
      );
    }
  } catch {
    // ignore parse errors — key will be re-seeded from defaults on next read
  }
})();

// One-time migration: racearena:racers → racearena:racerTypes (W2 field renames).
// Renames icon→emoji, enabled→isActive, drops trackId. Safe to call multiple times.
(function migrateRacersIfNeeded() {
  try {
    const raw = localStorage.getItem('racearena:racers');
    if (!raw) return;
    const old = JSON.parse(raw);
    if (!Array.isArray(old)) return;
    const migrated = old.map(({ icon, enabled, trackId: _trackId, ...rest }) => ({
      ...rest,
      emoji: icon ?? '',
      isActive: enabled ?? true,
    }));
    localStorage.setItem('racearena:racerTypes', JSON.stringify(migrated));
    localStorage.removeItem('racearena:racers');
    console.warn('[RaceArena] Migrated racearena:racers → racearena:racerTypes (W2 rename).');
  } catch {
    // ignore parse errors — key will be re-seeded from defaults on next read
  }
})();
