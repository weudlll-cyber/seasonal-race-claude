// ============================================================
// File:        storage.js
// Path:        client/src/modules/storage/storage.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: localStorage key registry and low-level read/write helpers
// ============================================================

export const KEYS = {
  PLAYER_GROUPS: 'racearena:playerGroups',
  RACERS: 'racearena:racers',
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
