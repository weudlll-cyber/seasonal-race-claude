// ============================================================
// File:        client/src/modules/racer-types/serverRacerTypes.js
// Project:     RaceArena — RACER-TYPES-SPLIT-1
//
// WHAT THIS OWNS: the SERVER CONVERSATION about user-created racer types — loading them, creating
// and updating them, deleting them. Every call to `services/racerApi.js` and every use of
// `API_BASE_URL` that concerns racer types lives here and nowhere else.
//
// ── ★ WHY IT IS A SEPARATE FILE, AND WHAT LEAVING IT WHERE IT WAS COST ─────────────────────────
//
// These functions used to sit in `racer-types/index.js`, which is the RACER TYPE REGISTRY — the
// thing the race engine reads for speeds and sizes. A static import walker cannot tell one half of a
// module from the other, so `services/racerApi.js`, `services/api.js` and `services/apiClient.js`
// were inside the race hull. HULL-FIX-1 measured them there: LOADED on the shipped path and INERT
// for the outcome — `API_BASE_URL` pointed at an invalid host and `fetchRacers` made to throw both
// left all three golden-race seeds byte-identical.
//
// That report stopped at naming it, because the fix was product code and not its to make: "the
// racer-type registry is a genuine engine input ... but the registry also carries the network path
// for editing racer types from the UI, and a static import walker cannot tell the two halves apart."
// This file is that split.
//
// ── ★ WHAT IT DELIBERATELY DOES NOT DO ─────────────────────────────────────────────────────────
//
//   · It does not decide what a racer type IS. `index.js` owns the registry, the built-in types, the
//     tunable overrides and the warm-up. This file hands it configs and asks it to ingest them.
//   · It is NOT re-exported from `index.js`, and must never be. A re-export would put these imports
//     straight back into the registry's closure and undo the split while looking tidy — the point is
//     that an importer NAMES the half it needs.
//   · It copies nothing. The functions below are the ones that were in `index.js`, moved.
//
// THE DEPENDENCY RUNS ONE WAY: editing needs the registry; the registry does not need the network.
// ============================================================

import {
  fetchRacers,
  createRacer,
  updateRacer,
  deleteRacer,
  uploadRacerSprite,
} from '../../services/racerApi.js';
import { API_BASE_URL } from '../../services/api.js';
import {
  RACER_TYPE_IDS,
  _ingestServerRacerConfigs,
  _markRacersReadyFromLoader,
  _hasLoadedRacerType,
} from './index.js';

/** Single-flight guard for `loadServerRacerTypes` — moved with it. */
let _inFlightLoad = null;

// ── User-created type management ─────────────────────────────────────────────

function _dataUrlToFile(dataUrl, filename) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

/**
 * Fetch user-created racer configs from the server and register them as
 * SpriteRacerType instances. Called once after auth by RacerSyncOnAuth.
 *
 * Single-flight: concurrent calls (e.g. React StrictMode double-mount) share
 * the same in-flight Promise and issue only one fetchRacers(). The guard is
 * cleared after completion so a later re-auth can trigger a fresh load.
 *
 * Per-racer errors are logged loudly but never abort the batch.
 * On server/auth failure the ready signal is still set so the app is never
 * permanently blocked — user racers are simply absent in that session.
 */
export function loadServerRacerTypes() {
  if (_inFlightLoad) return _inFlightLoad;
  _inFlightLoad = _runLoad().finally(() => {
    _inFlightLoad = null;
  });
  return _inFlightLoad;
}

async function _runLoad() {
  let configs;
  try {
    configs = await fetchRacers();
  } catch (err) {
    console.error('[RaceArena] loadServerRacerTypes: failed to fetch from server —', err.message);
    _markRacersReadyFromLoader();
    return;
  }
  // The sprite URL is built HERE because it is a server address — see the registry's seam comment.
  _ingestServerRacerConfigs(
    configs.map((cfg) => ({
      ...cfg,
      spriteUrl: `${API_BASE_URL}/api/racers/${cfg.id}/sprite`,
    }))
  );
}

/**
 * Create or update a user-created racer type on the server and reload the live registry.
 * New id → createRacer; existing id in _loadedRacerTypes → updateRacer.
 * spriteDataUrl (base64 data URL) is converted to a File and uploaded separately;
 * if spriteDataUrl is already a server URL (edit mode, sprite unchanged), upload is skipped.
 *
 * @param {object} config  Config including optional spriteDataUrl (base64 data URL).
 * @throws {Error} If id collides with a built-in type or the server rejects the request.
 */
export async function registerRacerType(config) {
  if (RACER_TYPE_IDS.includes(config.id)) {
    throw new Error(
      `registerRacerType: "${config.id}" is a built-in type and cannot be overridden`
    );
  }

  const isUpdate = _hasLoadedRacerType(config.id);
  const { spriteDataUrl, ...serverRecord } = config;

  if (isUpdate) {
    await updateRacer(config.id, serverRecord);
  } else {
    await createRacer(serverRecord);
  }

  if (spriteDataUrl && spriteDataUrl.startsWith('data:')) {
    const ext = spriteDataUrl.match(/data:image\/(\w+);/)?.[1] ?? 'png';
    const file = _dataUrlToFile(spriteDataUrl, `${config.id}.${ext}`);
    await uploadRacerSprite(config.id, file);
  }

  await loadServerRacerTypes();
}

/**
 * Delete a user-created racer type from the server and reload the live registry.
 * Rejects built-in type IDs — those cannot be removed.
 *
 * @param {string} id  The type id to remove.
 * @throws {Error} If id is a built-in type or the server rejects the request.
 */
export async function removeRacerType(id) {
  if (RACER_TYPE_IDS.includes(id)) {
    throw new Error(`removeRacerType: "${id}" is a built-in type and cannot be removed`);
  }
  await deleteRacer(id);
  await loadServerRacerTypes();
}
