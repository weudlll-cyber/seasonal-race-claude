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
  TRACKS: 'racearena:tracks',
  BRANDING: 'racearena:branding',
  RACE_DEFAULTS: 'racearena:raceDefaults',
  RACE_HISTORY: 'racearena:raceHistory',
  ACTIVE_GROUP: 'racearena:activeGroup',
  DATA_VERSION: 'racearena:dataVersion',
  AUTO_SCALE_CONFIG: 'racearena:autoScaleConfig',
  BASE_SPEED_CONFIG: 'racearena:baseSpeedConfig',
  RACE_BEHAVIOR_CONFIG: 'racearena:raceBehaviorConfig',
  ROW_LAYOUT_CONFIG: 'racearena:rowLayoutConfig',
  RACE_DYNAMICS_CONFIG: 'racearena:raceDynamicsConfig',
  PLANNER_TUNING_CONFIG: 'racearena:plannerTuningConfig',
  CAMERA_CONFIG: 'racearena:cameraConfig',
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

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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

// One-time migration: copy worldWidth/worldHeight from the linked geometry into each
// track preset that has a geometryId but stale 1280×720 defaults (pre-fix/list-tracks bug).
// Safe to call multiple times — only writes when a mismatch is found.
(function migrateTracksWorldDimensionsFromGeometry() {
  try {
    const raw = localStorage.getItem('racearena:tracks');
    if (!raw) return;
    const tracks = JSON.parse(raw);
    if (!Array.isArray(tracks)) return;
    let changed = false;
    for (const track of tracks) {
      if (!track.geometryId) continue;
      const geoRaw = localStorage.getItem(`racearena:trackGeometries:${track.geometryId}`);
      if (!geoRaw) continue;
      const geo = JSON.parse(geoRaw);
      const geoW = geo.worldWidth ?? 1280;
      const geoH = geo.worldHeight ?? 720;
      if (track.worldWidth !== geoW || track.worldHeight !== geoH) {
        track.worldWidth = geoW;
        track.worldHeight = geoH;
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem('racearena:tracks', JSON.stringify(tracks));
      console.warn(
        '[RaceArena] Synced worldWidth/worldHeight on track presets from linked geometry.'
      );
    }
  } catch {
    // Best-effort — migration failure must not break the app.
  }
})();

// One-time migration: backfill worldHeight: 720 on track presets that predate D10.
// Safe to call multiple times — exits immediately if all tracks already have the field.
(function migrateTracksAddWorldHeight() {
  try {
    const raw = localStorage.getItem('racearena:tracks');
    if (!raw) return;
    const tracks = JSON.parse(raw);
    if (!Array.isArray(tracks)) return;
    let changed = false;
    for (const track of tracks) {
      if (track.worldHeight == null) {
        track.worldHeight = 720;
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem('racearena:tracks', JSON.stringify(tracks));
      console.warn('[RaceArena] Backfilled worldHeight: 720 on track presets (D10).');
    }
  } catch {
    // Best-effort — migration failure must not break the app.
  }
})();
