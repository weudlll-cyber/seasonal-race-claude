// ============================================================
// File:        storage.js
// Path:        client/src/modules/storage/storage.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: localStorage key registry and low-level read/write helpers
// ============================================================

export const KEYS = {
  PLAYER_GROUPS: 'racearena:playerGroups',
  RACER_TYPE_OVERRIDES: 'racearena:racerTypeOverrides',
  BRANDING: 'racearena:branding',
  LAST_USER: 'racearena:lastUser',
  ACTIVE_SESSION: 'racearena:activeSession',
  RACE_DEFAULTS: 'racearena:raceDefaults',
  RACE_HISTORY: 'racearena:raceHistory',
  ACTIVE_GROUP: 'racearena:activeGroup',
  AUTO_SCALE_CONFIG: 'racearena:autoScaleConfig',
  BASE_SPEED_CONFIG: 'racearena:baseSpeedConfig',
  RACE_BEHAVIOR_CONFIG: 'racearena:raceBehaviorConfig',
  ROW_LAYOUT_CONFIG: 'racearena:rowLayoutConfig',
  RACE_DYNAMICS_CONFIG: 'racearena:raceDynamicsConfig',
  CAMERA_CONFIG: 'racearena:cameraConfig',
  FRAME_TIMING_CONFIG: 'racearena:frameTimingConfig',
  DEV_PANEL_VIEW: 'racearena:devPanelView',
  SURFACE_CLASSES_CACHE: 'racearena:cache:surfaceClasses',
};

export function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** Fired by storageSet after every successful write so useStorage hooks can react. */
export const STORAGE_CHANGE_EVENT = 'racearena:storage-change';

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
    return true;
  } catch (err) {
    console.warn('[RaceArena] localStorage write failed:', err);
    return false;
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

/**
 * Export every racearena:* key in localStorage as a diagnostic snapshot.
 * Unlike exportAllStorage(), this iterates ALL localStorage entries so it
 * captures dynamic keys such as racearena:trackGeometries:* that are not
 * listed in the KEYS enum.
 */
export function exportDiagnosticSnapshot() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('racearena:')) continue;
    try {
      data[key] = JSON.parse(localStorage.getItem(key));
    } catch {
      data[key] = localStorage.getItem(key);
    }
  }
  return {
    _meta: {
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    },
    data,
  };
}

/** Restore a full backup object (from exportAllStorage). */
export function importAllStorage(data) {
  for (const [key, val] of Object.entries(data)) {
    if (!key.startsWith('racearena:')) continue;
    storageSet(key, val);
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
