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
  // CONFIG-DIFF-1: normalise what is already stored, once, before reading it. Idempotent and
  // write-free unless there is something to drop — see `pruneStoredCameraConfig`. The resolved
  // config below is identical either way; pruning only changes what STORAGE holds, so that keys
  // equal to their default go back to following the default.
  pruneStoredCameraConfig();
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

/**
 * Value equality for config values. Scalars by `Object.is`, arrays and plain objects structurally.
 *
 * Structural rather than `===` because several camera values are arrays (and the state profiles are
 * objects): a reference comparison would report every array as "differs from the default" and store
 * it, which is the freeze this block removes, just narrower.
 */
export function valuesEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => valuesEqual(v, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && valuesEqual(a[k], b[k]));
  }
  return false;
}

/** The per-state profile fields that differ from their default. Undefined when none do. */
function profilesDiff(profiles) {
  if (!profiles || typeof profiles !== 'object') return undefined;
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const out = {};
  for (const state of Object.keys(defProfiles)) {
    const def = defProfiles[state];
    const cur = profiles[state];
    if (!cur || typeof cur !== 'object') continue;
    const fields = {};
    for (const key of Object.keys(def)) {
      if (!Object.prototype.hasOwnProperty.call(cur, key)) continue;
      if (!valuesEqual(cur[key], def[key])) fields[key] = cur[key];
    }
    if (Object.keys(fields).length) out[state] = fields;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * WHAT HE CHOSE: the subset of a resolved config that differs from the defaults.
 *
 * Keys equal to their default are OMITTED, which is the whole point — an omitted key follows the
 * default forever, so a default that changes later reaches him. Unknown keys are dropped too: the
 * loader already ignores them, so writing them back would only preserve litter.
 *
 * Exported for the tests, which must be able to ask "what would be written" without a storage layer.
 */
export function diffFromDefaults(config) {
  const out = {};
  if (!config || typeof config !== 'object') return out;
  for (const key of Object.keys(DEFAULT_CAMERA_CONFIG)) {
    if (key === 'cameraStateProfiles') continue;
    if (!Object.prototype.hasOwnProperty.call(config, key)) continue;
    if (!valuesEqual(config[key], DEFAULT_CAMERA_CONFIG[key])) out[key] = config[key];
  }
  const profiles = profilesDiff(config.cameraStateProfiles);
  if (profiles) out.cameraStateProfiles = profiles;
  return out;
}

/**
 * THE ONE-TIME PRUNE of what is already in his browser.
 *
 * Drops every stored key whose value equals the current default. What survives is exactly his real
 * deviations — which is why this is a prune and NOT a reset. He offered to reset; a reset throws
 * away weeks of tuning that this keeps.
 *
 * IT RUNS FROM `loadCameraConfig`, not from an app-start hook someone has to remember to call, and
 * it WRITES ONLY WHEN IT ACTUALLY DROPS SOMETHING. It is idempotent — the second run finds nothing
 * to drop and writes nothing — so it needs no marker key and cannot half-run. A migration that
 * depends on a call site is a migration that will one day not have been called.
 *
 * @returns {{changed: boolean, dropped: string[]}}
 */
export function pruneStoredCameraConfig() {
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  if (!stored || typeof stored !== 'object') return { changed: false, dropped: [] };
  const pruned = diffFromDefaults({
    ...stored,
    // The profiles are diffed against the FULL default profile, so hand the merge in rather than the
    // raw stored fragment — otherwise a stored profile missing a field would look like a deviation.
    cameraStateProfiles: mergeStateProfiles(stored.cameraStateProfiles),
  });
  const dropped = Object.keys(stored).filter(
    (k) => !Object.prototype.hasOwnProperty.call(pruned, k)
  );
  const profilesChanged = !valuesEqual(stored.cameraStateProfiles, pruned.cameraStateProfiles);
  if (!dropped.length && !profilesChanged) return { changed: false, dropped: [] };
  storageSet(KEYS.CAMERA_CONFIG, pruned);
  return { changed: true, dropped };
}

/** Store ONLY what differs from the defaults. See the header for why, and for the one edge case. */
export function saveCameraConfig(config) {
  return storageSet(KEYS.CAMERA_CONFIG, diffFromDefaults(config));
}
