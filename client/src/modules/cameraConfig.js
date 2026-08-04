// ============================================================
// File:        cameraConfig.js
// Path:        client/src/modules/cameraConfig.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: Storage CRUD for camera tuning config.
//
//              NO SCHEMA. NO VERSION. NO MIGRATIONS. The owner's standing instruction, given four
//              times: he is the only person testing, so there is nothing to migrate from and nobody
//              to migrate for. A config key is changed like any other code — renamed, added, deleted.
//
//              WHAT REPLACES IT IS NOT MACHINERY, it is just sane loading:
//                DEFAULTS UNDERNEATH · STORED VALUES ON TOP · UNKNOWN OR RETIRED KEYS IGNORED
//              A new key therefore always arrives from the defaults, because a stored config can only
//              ever override a key that already exists in DEFAULT_CAMERA_CONFIG. That is the Lesson
//              193 protection ("the flag never reaches the live config") with no versioning at all,
//              and it is strictly stronger than the version check it replaces: the old rule threw the
//              WHOLE config away on a version mismatch, so every schema bump wiped his settings and he
//              retyped them. Schema v20 and v21 each cost him exactly that.
//
//              WHAT WAS DELETED HERE, in order: a fourteen-step migration chain (v5->v19) plus a
//              per-version ladder in the loader — ~400 lines of module and ~700 of test, maintained
//              for a population of one who did not want it (CAMERA-FRAMING-1) — and then the
//              `schemaVersion` field itself with its equality check and its save-time stamp
//              (CAMERA-NO-SCHEMA-1).
//
//              THE ONE HONEST CASE, stated rather than engineered around: when a value changes
//              MEANING rather than shape — as the zoom unit did, track widths -> standard corridors —
//              a stored number is silently reinterpreted. LEADER 2 meant "two track widths" and now
//              means "two standard corridors". The owner sees that in the picture immediately and
//              retypes that one value. He prefers that to machinery, and so the code does nothing
//              about it on purpose.
//
//              Note for anyone grepping `schemaVersion`: `raceConfigWorld.js` has one and it STAYS.
//              That is a different thing — a browser<->sim handshake on the exported world, where a
//              mismatch must abort loudly rather than be half-honoured. It versions a wire format
//              between two programs, never the owner's settings, and it cannot wipe anything.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';

export { DEFAULT_CAMERA_CONFIG };

/** Per-state profiles: default profile underneath, stored fields on top, unknown fields ignored. */
function mergeStateProfiles(storedProfiles) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const out = {};
  for (const state of Object.keys(defProfiles)) {
    const def = defProfiles[state];
    const stored = storedProfiles?.[state];
    const profile = { ...def };
    if (stored && typeof stored === 'object') {
      for (const key of Object.keys(def)) {
        if (Object.prototype.hasOwnProperty.call(stored, key)) profile[key] = stored[key];
      }
    }
    out[state] = profile;
  }
  return out;
}

/**
 * The live camera config: defaults underneath, stored values on top, unknown or retired keys ignored.
 *
 * Iterating the DEFAULT keys rather than the stored ones is the whole rule. It means a key deleted
 * from the defaults disappears from the live config even if it is still sitting in his storage, and a
 * key added to the defaults is present from the first launch after the change. No version, no
 * migration, no reset.
 */
export function loadCameraConfig() {
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  const storedObj = stored && typeof stored === 'object' ? stored : {};
  const out = {};
  for (const key of Object.keys(DEFAULT_CAMERA_CONFIG)) {
    out[key] = Object.prototype.hasOwnProperty.call(storedObj, key)
      ? storedObj[key]
      : DEFAULT_CAMERA_CONFIG[key];
  }
  out.cameraStateProfiles = mergeStateProfiles(storedObj.cameraStateProfiles);
  return out;
}

/**
 * CAMERA-FOCUS-4 LIVE TRUTH — read-only provenance of the resolved camera config. For each top-level
 * key it reports whether the resolved value came from the STORED config or from DEFAULT. Lets the
 * race-start console line prove — in one glance — that a persisted config did NOT silently omit new
 * machinery (e.g. cameraTransitionGrammar). No behaviour change.
 *
 * @returns {{ resolved: object, sources: Record<string,'stored'|'default'>, hadStored: boolean }}
 */
export function cameraConfigProvenance() {
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  const storedObj = stored && typeof stored === 'object' ? stored : {};
  const resolved = loadCameraConfig();
  const sources = {};
  for (const key of Object.keys(DEFAULT_CAMERA_CONFIG)) {
    sources[key] = Object.prototype.hasOwnProperty.call(storedObj, key) ? 'stored' : 'default';
  }
  return { resolved, sources, hadStored: !!stored && typeof stored === 'object' };
}

export function saveCameraConfig(config) {
  return storageSet(KEYS.CAMERA_CONFIG, { ...config });
}
