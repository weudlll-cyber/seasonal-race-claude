// ============================================================
// File:        playerGroupMigration.js
// Path:        client/src/modules/storage/playerGroupMigration.js
// Project:     RaceArena
// Description: One-time migration: localStorage player groups → server.
//              Triggered at PlayerGroupsManager mount, after first server fetch.
//              Marker racearena:migration:player-groups-to-server-v1 prevents re-runs.
//              localStorage groups are NOT removed after migration (marker protects against retry).
// ============================================================

import { storageGet, storageSet, KEYS } from './storage.js';
import { createPlayerGroup } from '../../services/playerGroupApi.js';

export const MIGRATION_MARKER_KEY = 'racearena:migration:player-groups-to-server-v1';

/**
 * Returns localStorage player groups that need migration:
 * those not already present on the server (by id).
 *
 * @param {Set<string>} serverGroupIds — IDs already on the server (to skip)
 * @returns {object[]}
 */
export function getLocalPlayerGroups(serverGroupIds = new Set()) {
  const all = storageGet(KEYS.PLAYER_GROUPS, []);
  return all.filter((g) => !serverGroupIds.has(g.id));
}

/**
 * Migrate all localStorage player groups to the server.
 *
 * Safe to call multiple times — the MIGRATION_MARKER_KEY prevents re-runs.
 * Does NOT set the marker if any individual group fails (so it retries next time).
 * Does NOT remove groups from localStorage after migration.
 *
 * @param {Set<string>} serverGroupIds — IDs already on server (to skip)
 * @returns {Promise<boolean>} true if all groups migrated (or nothing to migrate / already done)
 */
export async function migrateLocalPlayerGroupsToServer(serverGroupIds = new Set()) {
  if (storageGet(MIGRATION_MARKER_KEY, false)) return true;

  const local = getLocalPlayerGroups(serverGroupIds);
  if (local.length === 0) {
    storageSet(MIGRATION_MARKER_KEY, true);
    return true;
  }

  console.warn(`[RaceArena] Migrating ${local.length} local player group(s) to server…`);

  let allSucceeded = true;

  for (const group of local) {
    try {
      await createPlayerGroup({ id: group.id, name: group.name, players: group.players });
      console.warn(`[RaceArena] Migrated player group "${group.name}"`);
    } catch (err) {
      console.warn(`[RaceArena] Migration failed for group "${group.name}":`, err.message);
      allSucceeded = false;
    }
  }

  if (allSucceeded) {
    storageSet(MIGRATION_MARKER_KEY, true);
    console.warn('[RaceArena] Player group migration complete.');
  } else {
    console.warn('[RaceArena] Player group migration incomplete — will retry on next load.');
  }

  return allSucceeded;
}
