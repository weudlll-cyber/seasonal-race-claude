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
  // SEED-REAL-RACE-1. Two keys, and they answer two different questions — which is why one would
  // not have done.
  //   RACE_SEED       what the operator TYPED into the Race Settings seed field. Empty means
  //                   "draw a fresh one per race", which is a real and meaningful state, so this
  //                   key is REMOVED rather than set to '' when the field is cleared.
  //   LAST_RACE_SEED  the seed the last race actually RAN with, drawn or typed. Written by the
  //                   start path, never by the field.
  // They are here, in localStorage, and not in sessionStorage, because the owner's case is
  // explicitly "watch a race, close the browser, come back and re-run it". A session store cannot
  // serve that, and the drawn seed is the one a session store would lose — the field stays empty
  // by design so the next race draws again.
  //   LAST_RACE_IDENTIFIER
  //                   the RACE IDENTIFIER of the last race that actually ran — the whole race, not
  //                   just its seed. Added by RUN-IT-AGAIN-1 BESIDE `LAST_RACE_SEED`, never instead
  //                   of it: the seed stays the short human name the operator reads off the race
  //                   screen, and remains the record that a race really ran.
  //   ★ WHY BOTH. `run it again` used to put the SEED back in the field, and a seed does not
  //   reproduce a race: the config comes from whatever this machine is set to NOW, so changing one
  //   setting between the race and the click ran a DIFFERENT race under the old race's number. The
  //   identifier carries the whole race, so it is what the button fills in. It can legitimately be
  //   absent — a race from before this key existed, or a screen state that could not be encoded —
  //   and the panel then falls back to the seed AND SAYS SO, rather than offering the weaker thing
  //   as though it were the stronger.
  RACE_SEED: 'racearena:raceSeed',
  LAST_RACE_SEED: 'racearena:lastRaceSeed',
  LAST_RACE_IDENTIFIER: 'racearena:lastRaceIdentifier',
};

// QUIET-FAILURES-1: which keys have already announced a failed read. NOT app state and not a UI
// concept — a module-local de-duplicator, because `storageGet` runs on nearly every render and a
// browser with storage blocked would otherwise fill the console with the same line forever. One
// line per key is enough to name the cause; a thousand is just a different kind of silence.
const _reported = new Set();

export function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (err) {
    // Until now a corrupt or unreadable value was indistinguishable from an absent one: every
    // loader in this app resolves through here, so one malformed byte in `racearena:cameraConfig`
    // silently replaced the owner's entire camera tuning with the shipped defaults, with nothing
    // on screen and nothing in the console.
    //
    // NO `localStorage` AT ALL IS NOT A FAILURE — it is node. The sim and all three fingerprint
    // harnesses import this module and have no storage API, so warning there would print on every
    // run about a value nobody ever stored. FOUND BY MEASURING: the first version of this warning
    // did exactly that, once per harness. A guard that cries wolf in the one place it is read most
    // is the failure mode this project already has a name for, so the headless case stays silent
    // and the browser case — storage present, read or parse failed — is the one that speaks.
    if (typeof localStorage === 'undefined') return fallback;
    if (!_reported.has(key)) {
      _reported.add(key);
      console.warn(
        `[storage] "${key}" could not be read — ${err?.message ?? 'unreadable'}; falling back to the default, so anything you had stored under it is NOT in effect`
      );
    }
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
