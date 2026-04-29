// ============================================================
// File:        trackMigration.js
// Path:        client/src/modules/storage/trackMigration.js
// Project:     RaceArena
// Created:     2026-04-29
// Description: One-time migration: localStorage custom tracks → server.
//              Triggered after first successful server connect.
//              Marker racearena:migration:tracks-to-server-v1 prevents re-runs.
// ============================================================

import { storageGet, storageSet, storageRemove, KEYS } from './storage.js';
import { DEFAULT_TRACKS } from './defaults.js';
import { getTrack, deleteTrack } from '../track-editor/trackStorage.js';
import { createTrackOnServer, uploadTrackBackground } from '../../services/trackApi.js';

export const MIGRATION_MARKER_KEY = 'racearena:migration:tracks-to-server-v1';

const DEFAULT_TRACK_IDS = new Set(DEFAULT_TRACKS.map((t) => t.id));

/**
 * Returns localStorage custom track presets that need migration:
 * those not in DEFAULT_TRACKS and not already on the server.
 */
export function getLocalCustomTracks(serverTrackIds = new Set()) {
  const all = storageGet(KEYS.TRACKS, []);
  return all.filter((t) => !DEFAULT_TRACK_IDS.has(t.id) && !serverTrackIds.has(t.id));
}

/**
 * Convert a data-URL to a Blob.
 * Returns null if the dataUrl is falsy or not a data-URL.
 */
async function dataUrlToBlob(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  try {
    const res = await fetch(dataUrl);
    return res.blob();
  } catch {
    return null;
  }
}

/**
 * Migrate all localStorage custom tracks to the server.
 *
 * Safe to call multiple times — the MIGRATION_MARKER_KEY prevents re-runs.
 * Does NOT set the marker if any individual track fails (so it retries next time).
 *
 * @param {Set<string>} serverTrackIds — IDs already on server (to skip)
 * @returns {Promise<boolean>} true if all tracks migrated (or nothing to migrate)
 */
export async function migrateLocalTracksToServer(serverTrackIds = new Set()) {
  if (storageGet(MIGRATION_MARKER_KEY, false)) return true;

  const customTracks = getLocalCustomTracks(serverTrackIds);
  if (customTracks.length === 0) {
    storageSet(MIGRATION_MARKER_KEY, true);
    return true;
  }

  console.warn(`[RaceArena] Migrating ${customTracks.length} local track(s) to server…`);

  let allSucceeded = true;

  for (const preset of customTracks) {
    try {
      const geometry = preset.geometryId ? getTrack(preset.geometryId) : null;

      // Build combined track object (preset metadata + geometry data)
      const { backgroundImage, ...geoData } = geometry ?? {};
      const trackJson = {
        ...geoData,
        // Preset fields override geometry where they conflict (name, icon, etc.)
        name: preset.name,
        icon: preset.icon,
        description: preset.description ?? '',
        defaultRacerTypeId: preset.defaultRacerTypeId ?? preset.racerTypeId ?? 'horse',
        color: preset.color ?? '#e63946',
        defaultDuration: preset.defaultDuration ?? 60,
        defaultWinners: preset.defaultWinners ?? 3,
        maxRacers: preset.maxRacers ?? null,
        isDefault: false,
      };

      const created = await createTrackOnServer(trackJson);

      // Upload background if present
      if (backgroundImage) {
        const blob = await dataUrlToBlob(backgroundImage);
        if (blob) {
          await uploadTrackBackground(created.id, blob);
        }
      }

      // Remove from localStorage after successful migration
      storageRemove(`racearena:trackGeometries:${preset.geometryId}`);
      deleteTrack(preset.geometryId);
      storageSet(
        KEYS.TRACKS,
        storageGet(KEYS.TRACKS, []).filter((t) => t.id !== preset.id)
      );

      console.warn(`[RaceArena] Migrated track "${preset.name}" → server ID ${created.id}`);
    } catch (err) {
      console.warn(`[RaceArena] Migration failed for track "${preset.name}":`, err.message);
      allSucceeded = false;
    }
  }

  if (allSucceeded) {
    storageSet(MIGRATION_MARKER_KEY, true);
    console.warn('[RaceArena] Track migration complete.');
  } else {
    console.warn('[RaceArena] Track migration incomplete — will retry on next server connect.');
  }

  return allSucceeded;
}
