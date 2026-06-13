// ============================================================
// File:        migrateStorage.js
// Path:        client/src/modules/storage/migrateStorage.js
// Project:     RaceArena
// Description: One-time storage migration — run once at app entry before render.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage.js';
import { DEFAULT_TRACKS } from './defaults.js';

export const CURRENT_DATA_VERSION = 5;

// Removes localStorage track entries whose name case-insensitively matches a
// DEFAULT_TRACKS entry but whose id is a legacy hash (track was promoted to default).
function removeStalePromotedDefaults() {
  const defaultNames = new Map(DEFAULT_TRACKS.map((t) => [t.name.toLowerCase(), t.id]));
  const existing = storageGet(KEYS.TRACKS, []);
  if (!Array.isArray(existing)) return;
  const cleaned = existing.filter((t) => {
    const canonicalId = defaultNames.get((t.name ?? '').toLowerCase());
    return !(canonicalId && t.id !== canonicalId);
  });
  if (cleaned.length !== existing.length) {
    storageSet(KEYS.TRACKS, cleaned);
  }
}

export function migrateStorage() {
  const version = storageGet(KEYS.DATA_VERSION, 0);
  if (version >= CURRENT_DATA_VERSION) return;

  if (version < 1) {
    // v0 → v1: seed defaults on first install — never overwrite existing tracks.
    const existing = storageGet(KEYS.TRACKS, null);
    if (!Array.isArray(existing) || existing.length === 0) {
      storageSet(KEYS.TRACKS, DEFAULT_TRACKS);
    }
  }

  if (version < 3) {
    // v1/v2 → v3: remove stale promoted-default entries (Mountainstreet).
    removeStalePromotedDefaults();
  }

  if (version < 4) {
    // v3 → v4: remove stale promoted-default entries (Ice Track).
    removeStalePromotedDefaults();
  }

  if (version < 5) {
    // v4 → v5: remove stale promoted-default entries (Seatrack, Searound).
    removeStalePromotedDefaults();
  }

  storageSet(KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
  console.warn('[RaceArena] Storage migrated to v' + CURRENT_DATA_VERSION);
}
