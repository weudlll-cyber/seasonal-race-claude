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
//
//              ── CONFIG-DIFF-1: WHAT IS STORED IS WHAT HE CHOSE ───────────────────────────────
//
//              THE DEFECT, and it is the SAVE side rather than the load side. `loadCameraConfig`
//              was already right: it walks the DEFAULT keys and takes a stored value only where the
//              stored object HAS that key, so a NEW key always arrives at its default. But
//              `saveCameraConfig` wrote `{...config}` — the WHOLE resolved object. One slider move
//              therefore FROZE every key, including the hundreds he never touched, and a default
//              that changed afterwards could never reach him again. That is why his start board sat
//              at 3000/80 for days after 6000/120 shipped: he had moved some unrelated slider once.
//
//              NOW: only keys whose value DIFFERS from the default are written. A key equal to its
//              default is absent from storage, so it keeps following the default forever. Plus a
//              one-time prune of what is already in his browser, so the fix reaches the config he
//              has rather than only the ones he saves from now on.
//
//              ⚠ THE EDGE, stated here because it is the one thing this design cannot distinguish:
//              A VALUE HE DELIBERATELY SET TO TODAY'S DEFAULT LOOKS EXACTLY LIKE ONE HE NEVER
//              TOUCHED. Both are absent from storage, so both will follow a future change of that
//              default. If he sets `minRacersVisible` to 5 while the default is 5, and the default
//              later becomes 7, he gets 7. There is no way to tell the two apart without storing
//              intent, which would mean a schema — and the schema is what this file exists without.
//              The alternative (store everything) is the bug above, and it is worse: it silently
//              freezes hundreds of keys to buy certainty about a handful.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';
import {
  resolveFromDefaults,
  diffFromDefaults as diffAgainst,
  pruneStored,
  valuesEqual as valuesEqualShared,
} from './storage/configDiff.js';

export { DEFAULT_CAMERA_CONFIG };

/**
 * The live camera config: defaults underneath, stored values on top, unknown or retired keys ignored.
 *
 * Iterating the DEFAULT keys rather than the stored ones is the whole rule. It means a key deleted
 * from the defaults disappears from the live config even if it is still sitting in his storage, and a
 * key added to the defaults is present from the first launch after the change. No version, no
 * migration, no reset.
 */
export function loadCameraConfig() {
  // CONFIG-DIFF-1: normalise what is already stored, once, before reading it. Idempotent and
  // write-free unless there is something to drop — see `pruneStoredCameraConfig`. The resolved
  // config below is identical either way; pruning only changes what STORAGE holds, so that keys
  // equal to their default go back to following the default.
  pruneStoredCameraConfig();
  return resolveFromDefaults(storageGet(KEYS.CAMERA_CONFIG), DEFAULT_CAMERA_CONFIG);
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
  // RESOLVE FIRST, THEN READ STORAGE (CONFIG-DIFF-1). `loadCameraConfig` prunes, and this function
  // is a TRUTH instrument: reading storage before the prune would report `stored` for keys that no
  // longer are, on exactly the one run where the answer matters most — the first after the upgrade.
  const resolved = loadCameraConfig();
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  const storedObj = stored && typeof stored === 'object' ? stored : {};
  const sources = {};
  for (const key of Object.keys(DEFAULT_CAMERA_CONFIG)) {
    sources[key] = Object.prototype.hasOwnProperty.call(storedObj, key) ? 'stored' : 'default';
  }
  return { resolved, sources, hadStored: !!stored && typeof stored === 'object' };
}

// CONFIG-DIFF-2: the rule moved to storage/configDiff.js, the ONE home shared by all seven stores.
// These re-exports keep this module's public surface unchanged for its existing callers and tests —
// the camera is now a CONSUMER of the rule rather than the place it lives.
export const valuesEqual = valuesEqualShared;
export const diffFromDefaults = (config) => diffAgainst(config, DEFAULT_CAMERA_CONFIG);

/**
 * The one-time prune of the stored camera config. See storage/configDiff.js for the rule; the only
 * thing that lives here is which storage key it belongs to.
 *
 * @returns {{changed: boolean, dropped: string[]}}
 */
export function pruneStoredCameraConfig() {
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  const { pruned, dropped, changed } = pruneStored(stored, DEFAULT_CAMERA_CONFIG);
  if (changed) storageSet(KEYS.CAMERA_CONFIG, pruned);
  return { changed, dropped };
}

/** Store ONLY what differs from the defaults. See the header for why, and for the one edge case. */
export function saveCameraConfig(config) {
  return storageSet(KEYS.CAMERA_CONFIG, diffAgainst(config, DEFAULT_CAMERA_CONFIG));
}
