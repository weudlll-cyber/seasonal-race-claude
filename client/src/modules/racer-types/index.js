// ============================================================
// File:        index.js
// Path:        client/src/modules/racer-types/index.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Factory + registry for all racer-type modules.
//              getRacerType(typeId) returns the correct instance.
//              Also preserves the legacy RACER_TYPES export so
//              existing code that imports it keeps working.
//
//              D3.5.3+: All 20 racer types are SpriteRacerType instances.
//              No class-based RacerTypes remain. CarRacerType removed,
//              replaced by BuggyRacerType. COATS_BY_TYPE auto-derived
//              from type configs. warmUpAllRacerTypes handles mask types.
//              20 types total as of snowmobile addition.
//
//              D3.5.5: Override-API extended to support 6 tunable fields
//              (speedMultiplier, displaySize, basePeriodMs, leaderRingColor,
//              leaderEllipseRx, leaderEllipseRy). Storage schema migrated
//              from { id: false } → { id: { isActive: false } }.
//              CONFIG_SNAPSHOT captures code defaults before any override.
//
//              Racer Editor Phase 1: _loadedRacerTypes internal registry
//              for user-created types stored in localStorage. All public
//              APIs (getRacerType, listAllRacerTypes, getCoatsByType,
//              getRacerTypeLabel) serve both built-in and loaded types
//              from a single flat registry — no "custom" distinction.
//              registerRacerType / removeRacerType manage the lifecycle.
// ============================================================

export { HorseRacerType } from './HorseRacerType.js';
export { DuckRacerType } from './DuckRacerType.js';
export { SnailRacerType } from './SnailRacerType.js';
export { ElephantRacerType } from './ElephantRacerType.js';
export { GiraffeRacerType } from './GiraffeRacerType.js';
export { SnakeRacerType } from './SnakeRacerType.js';
export { DragonRacerType } from './DragonRacerType.js';
export { F1RacerType } from './F1RacerType.js';
export { RocketRacerType } from './RocketRacerType.js';
export { BuggyRacerType } from './BuggyRacerType.js';
export { MotorbikeRacerType } from './MotorbikeRacerType.js';
export { PlaneRacerType } from './PlaneRacerType.js';
export { LugeRacerType } from './LugeRacerType.js';
export { BeetleRacerType } from './BeetleRacerType.js';
export { BoarderRacerType } from './BoarderRacerType.js';
export { KoiRacerType } from './KoiRacerType.js';
export { TurtleRacerType } from './TurtleRacerType.js';
export { MantaRacerType } from './MantaRacerType.js';
export { DolphinRacerType } from './DolphinRacerType.js';
export { SnowmobileRacerType } from './SnowmobileRacerType.js';
import { HorseRacerType } from './HorseRacerType.js';
import { DuckRacerType } from './DuckRacerType.js';
import { SnailRacerType } from './SnailRacerType.js';
import { ElephantRacerType } from './ElephantRacerType.js';
import { GiraffeRacerType } from './GiraffeRacerType.js';
import { SnakeRacerType } from './SnakeRacerType.js';
import { DragonRacerType } from './DragonRacerType.js';
import { F1RacerType } from './F1RacerType.js';
import { RocketRacerType } from './RocketRacerType.js';
import { BuggyRacerType } from './BuggyRacerType.js';
import { MotorbikeRacerType } from './MotorbikeRacerType.js';
import { PlaneRacerType } from './PlaneRacerType.js';
import { LugeRacerType } from './LugeRacerType.js';
import { BeetleRacerType } from './BeetleRacerType.js';
import { BoarderRacerType } from './BoarderRacerType.js';
import { KoiRacerType } from './KoiRacerType.js';
import { TurtleRacerType } from './TurtleRacerType.js';
import { MantaRacerType } from './MantaRacerType.js';
import { DolphinRacerType } from './DolphinRacerType.js';
import { SnowmobileRacerType } from './SnowmobileRacerType.js';
import { SpriteRacerType } from './SpriteRacerType.js';
import { ensureRacerTypeWarm } from './racerWarmup.js';
import { storageGet, storageSet, KEYS } from '../storage/storage.js';
import { getTrailFactory } from './trailStyles.js';
// ── ★ NO HTTP HERE, AND THAT IS THE POINT (RACER-TYPES-SPLIT-1) ────────────────────────────────
//
// This file used to import `fetchRacers`, `createRacer`, `updateRacer`, `deleteRacer`,
// `uploadRacerSprite` and `API_BASE_URL`. The RACE ENGINE reads this module — it needs racer speeds
// and sizes — so those imports dragged `services/racerApi.js`, `services/api.js` and
// `services/apiClient.js` into the race hull, where HULL-FIX-1 measured them: loaded on the shipped
// path, and INERT for the outcome. Three files every fingerprint decision had to account for and
// that no race can reach.
//
// The server conversation lives in `serverRacerTypes.js`, which imports THIS file. The dependency
// runs one way — editing needs the registry, the registry does not need the network — and nothing
// was copied to achieve it.

// All 20 racer types are SpriteRacerType instances.
export const RACER_TYPES = {
  horse: HorseRacerType,
  duck: DuckRacerType,
  snail: SnailRacerType,
  elephant: ElephantRacerType,
  giraffe: GiraffeRacerType,
  snake: SnakeRacerType,
  dragon: DragonRacerType,
  f1: F1RacerType,
  rocket: RocketRacerType,
  buggy: BuggyRacerType,
  motorbike: MotorbikeRacerType,
  plane: PlaneRacerType,
  luge: LugeRacerType,
  beetle: BeetleRacerType,
  boarder: BoarderRacerType,
  koi: KoiRacerType,
  turtle: TurtleRacerType,
  manta: MantaRacerType,
  dolphin: DolphinRacerType,
  snowmobile: SnowmobileRacerType,
};

export const RACER_TYPE_IDS = Object.keys(RACER_TYPES);

// Auto-derived from built-in type configs — kept for backward compat.
// Prefer getCoatsByType(id) which also covers user-created types.
export const COATS_BY_TYPE = Object.fromEntries(
  Object.entries(RACER_TYPES).map(([id, type]) => [id, type.config.coats])
);

// Static labels for built-in types — kept for backward compat.
// Prefer getRacerTypeLabel(id) which also covers user-created types.
export const RACER_TYPE_LABELS = {
  horse: 'Horse 🐴',
  duck: 'Duck 🦆',
  snail: 'Snail 🐌',
  elephant: 'Elephant 🐘',
  giraffe: 'Giraffe 🦒',
  snake: 'Snake 🐍',
  dragon: 'Dragon 🐉',
  f1: 'F1 🏎️',
  rocket: 'Rocket 🚀',
  buggy: 'Buggy 🚙',
  motorbike: 'Motorbike 🏍️',
  plane: 'Plane ✈️',
  luge: 'Luge 🛷',
  beetle: 'Beetle 🪲',
  boarder: 'Boarder 🛹',
  koi: 'Koi 🐟',
  turtle: 'Turtle 🐢',
  manta: 'Manta 🦈',
  dolphin: 'Dolphin 🐬',
  snowmobile: 'Snowmobile 🏂',
};

// ── Loaded racer types (user-created, fetched from server in D6a) ────────────
// Internal registry — populated by loadServerRacerTypes() after auth.
// Not exported — all external access goes through getRacerType / listAllRacerTypes.
const _loadedRacerTypes = {};

// ── Ready signal ──────────────────────────────────────────────────────────────
// Set to true after loadServerRacerTypes() completes (even on error / empty list).
// Pending callbacks fire once; subsequent waitForRacersReady() calls resolve immediately.
let _racersReady = false;
const _racersReadyCallbacks = [];
let _inFlightLoad = null;

function _markRacersReady() {
  if (_racersReady) return;
  _racersReady = true;
  for (const cb of _racersReadyCallbacks.splice(0)) cb();
}

export function areRacersReady() {
  return _racersReady;
}

export function waitForRacersReady() {
  if (_racersReady) return Promise.resolve();
  return new Promise((resolve) => {
    _racersReadyCallbacks.push(resolve);
  });
}

export function _resetRacersReadyForTesting() {
  _racersReady = false;
  _racersReadyCallbacks.length = 0;
  _inFlightLoad = null;
}

/**
 * Returns the coats array for any racer type — built-in or user-created.
 * Returns null for unknown ids.
 */
export function getCoatsByType(id) {
  const type = RACER_TYPES[id] ?? _loadedRacerTypes[id];
  return type?.config.coats ?? null;
}

/**
 * Returns the display label for any racer type — built-in or user-created.
 * Falls back to the raw id string for unknown types.
 */
export function getRacerTypeLabel(id) {
  if (RACER_TYPE_LABELS[id]) return RACER_TYPE_LABELS[id];
  const loaded = _loadedRacerTypes[id];
  if (loaded) {
    const name = loaded.config.name ?? id;
    const emoji = loaded.config.emoji ?? '';
    return emoji ? `${name} ${emoji}` : name;
  }
  return id;
}

/**
 * Returns a racer-type instance for the given typeId.
 * Checks built-in types first, then user-created types loaded from server.
 * Falls back to the horse instance for unknown ids — but logs a loud diagnostic
 * so the failure is never silent (D6a, Inv E7).
 */
export function getRacerType(typeId) {
  if (RACER_TYPES[typeId]) return RACER_TYPES[typeId];
  if (_loadedRacerTypes[typeId]) return _loadedRacerTypes[typeId];
  console.error(
    `[RaceArena] Unknown racer type "${typeId}" — falling back to horse (ready=${_racersReady})`
  );
  return HorseRacerType;
}

/** Alias for getRacerType — preferred in contexts where the id semantics matter. */
export function getRacerTypeById(id) {
  if (RACER_TYPES[id]) return RACER_TYPES[id];
  if (_loadedRacerTypes[id]) return _loadedRacerTypes[id];
  console.error(
    `[RaceArena] Unknown racer type "${id}" — falling back to horse (ready=${_racersReady})`
  );
  return HorseRacerType;
}

// ── D3.5.5 tunable override infrastructure ────────────────────────────────

/** Fields that can be overridden via the Dev-Screen tuning UI. */
export const TUNABLE_FIELDS = [
  'speedMultiplier',
  'displaySize',
  'basePeriodMs',
  'leaderRingColor',
  'leaderEllipseRx',
  'leaderEllipseRy',
  'minTargetScreenPx',
  'surfaceClasses',
  'surfaceEffectOverrides',
];

/**
 * Snapshot of original code-default values for all tunable fields, captured
 * before any boot-time override is applied. Used by reset-to-default logic.
 */
export const CONFIG_SNAPSHOT = Object.freeze(
  Object.fromEntries(
    RACER_TYPE_IDS.map((id) => [
      id,
      Object.freeze(
        Object.fromEntries(
          TUNABLE_FIELDS.map((f) => {
            const v = RACER_TYPES[id].config[f];
            return [f, Array.isArray(v) ? Object.freeze([...v]) : v];
          })
        )
      ),
    ])
  )
);

/**
 * Migrate legacy storage format { id: false } → { id: { isActive: false } }.
 * New entries (already objects) are passed through unchanged.
 */
export function normalizeOverrideMap(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [id, val] of Object.entries(raw)) {
    if (val === false) out[id] = { isActive: false };
    else if (val && typeof val === 'object') out[id] = val;
  }
  return out;
}

/** Apply a single tunable field directly to the live config (no storage write). */
export function applyTunableOverride(id, fieldName, value) {
  const type = RACER_TYPES[id] ?? _loadedRacerTypes[id];
  if (type && TUNABLE_FIELDS.includes(fieldName)) {
    type.config[fieldName] = value;
  }
}

/** Restore a tunable field to its code default (no storage write). */
export function restoreTunableDefault(id, fieldName) {
  const snap = CONFIG_SNAPSHOT[id];
  if (RACER_TYPES[id] && snap && fieldName in snap) {
    const v = snap[fieldName];
    RACER_TYPES[id].config[fieldName] = Array.isArray(v) ? [...v] : v;
  }
}

/** Apply all stored tunable overrides to live configs. Called once at boot. */
function _applyStoredTunableOverrides() {
  const raw = storageGet(KEYS.RACER_TYPE_OVERRIDES);
  if (!raw) return;
  const overrides = normalizeOverrideMap(raw);
  for (const [id, fields] of Object.entries(overrides)) {
    const type = RACER_TYPES[id] ?? _loadedRacerTypes[id];
    if (!type) continue;
    for (const field of TUNABLE_FIELDS) {
      if (field in fields) type.config[field] = fields[field];
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Returns a flat array of all racer types — built-in and user-created — with
 * isActive resolved from the shared override map. No distinction between origins.
 * All types are active by default; an operator can disable any type via
 * setRacerTypeOverride(). Built-in types appear first, then loaded types in
 * insertion order.
 */
export function listAllRacerTypes() {
  const raw = storageGet(KEYS.RACER_TYPE_OVERRIDES) ?? {};
  const overrides = normalizeOverrideMap(raw);
  const toEntry = (id, type) => ({
    id,
    name: getRacerTypeLabel(id),
    emoji: type.getEmoji(),
    speedMultiplier: type.getSpeedMultiplier(),
    isActive: (overrides[id]?.isActive ?? true) !== false,
  });
  const builtIns = RACER_TYPE_IDS.map((id) => toEntry(id, RACER_TYPES[id]));
  const loaded = Object.entries(_loadedRacerTypes).map(([id, type]) => toEntry(id, type));
  return [...builtIns, ...loaded];
}

/**
 * Set a field override for a racer type.
 *
 * setRacerTypeOverride(id, 'isActive', false)       — disable type
 * setRacerTypeOverride(id, 'isActive', true)        — re-enable type
 * setRacerTypeOverride(id, 'speedMultiplier', 1.2)  — tune a config field
 *
 * For tunable (non-isActive) fields the live config is also mutated so the
 * next race picks up the new value without a page reload.
 */
export function setRacerTypeOverride(id, fieldName, value) {
  const all = normalizeOverrideMap(storageGet(KEYS.RACER_TYPE_OVERRIDES) ?? {});
  const typeOverrides = { ...(all[id] ?? {}) };

  if (fieldName === 'isActive' && value === true) {
    delete typeOverrides.isActive;
  } else {
    typeOverrides[fieldName] = value;
  }

  if (Object.keys(typeOverrides).length === 0) {
    delete all[id];
  } else {
    all[id] = typeOverrides;
  }
  storageSet(KEYS.RACER_TYPE_OVERRIDES, all);

  if (TUNABLE_FIELDS.includes(fieldName)) {
    applyTunableOverride(id, fieldName, value);
  }
}

/**
 * Reset overrides for a type.
 *
 * resetRacerTypeOverride(id)             — remove all overrides for id
 * resetRacerTypeOverride(id, fieldName)  — remove one field override
 *
 * Tunable fields are also restored to code defaults in the live config.
 */
export function resetRacerTypeOverride(id, fieldName) {
  const all = normalizeOverrideMap(storageGet(KEYS.RACER_TYPE_OVERRIDES) ?? {});

  if (fieldName === undefined) {
    if (all[id]) {
      for (const f of TUNABLE_FIELDS) {
        if (f in all[id]) restoreTunableDefault(id, f);
      }
      delete all[id];
    }
  } else {
    const typeOverrides = { ...(all[id] ?? {}) };
    if (TUNABLE_FIELDS.includes(fieldName)) restoreTunableDefault(id, fieldName);
    delete typeOverrides[fieldName];
    if (Object.keys(typeOverrides).length === 0) delete all[id];
    else all[id] = typeOverrides;
  }
  storageSet(KEYS.RACER_TYPE_OVERRIDES, all);
}

let _warmedUp = false;

/**
 * Warm up sprite caches for all racer types — built-in and user-created.
 * Delegates to ensureRacerTypeWarm (racerWarmup.js) which handles both
 * mask-mode (loadSprite) and multiply-mode (getCoatVariants) paths.
 * Idempotent — safe to call multiple times.
 */
export function warmUpAllRacerTypes() {
  if (_warmedUp) return;
  _warmedUp = true;
  const allTypes = [...Object.values(RACER_TYPES), ...Object.values(_loadedRacerTypes)];
  for (const racerType of allTypes) {
    ensureRacerTypeWarm(racerType.config);
  }
}

/** Reset warm-up flag. Only use in tests. */
export function _resetWarmUpForTesting() {
  _warmedUp = false;
}

/** Clear all loaded (user-created) types from the live registry. Only use in tests. */
export function _resetLoadedRacerTypesForTesting() {
  for (const id of Object.keys(_loadedRacerTypes)) {
    delete _loadedRacerTypes[id];
  }
}

/** Directly inject a type instance into the registry without going through the server. Only use in tests. */
export function _setLoadedRacerTypeForTesting(id, instance) {
  _loadedRacerTypes[id] = instance;
}

/**
 * ── ★ THE SEAM (RACER-TYPES-SPLIT-1) ──────────────────────────────────────────────────────────
 *
 * Take the server's racer configs and make them live types. `serverRacerTypes.js` fetches them and
 * calls this; nothing else may.
 *
 * ★ THE SPRITE URL ARRIVES ALREADY BUILT, deliberately. It is `API_BASE_URL/api/racers/<id>/sprite`,
 * and building it here would import `services/api.js` back into the registry — exactly the coupling
 * this split removes. The caller owns the network's address; this file owns what a racer type IS.
 *
 * Stale entries are cleared only on a SUCCESSFUL fetch (stale-on-error), which is why the clearing
 * lives here rather than at the fetch site: the caller decides there was an answer, this decides
 * what the answer means.
 *
 * @param {Array<object>} configs  server configs, each already carrying `spriteUrl`
 */
export function _ingestServerRacerConfigs(configs) {
  for (const id of Object.keys(_loadedRacerTypes)) {
    delete _loadedRacerTypes[id];
  }
  for (const cfg of configs) {
    try {
      const instance = new SpriteRacerType({
        ...cfg,
        trailFactory: getTrailFactory(cfg.trailStyle),
      });
      _loadedRacerTypes[cfg.id] = instance;
      ensureRacerTypeWarm(instance.config);
    } catch (err) {
      console.error(
        `[RaceArena] loadServerRacerTypes: skipping racer "${cfg.id}" — ${err.message}`
      );
    }
  }
  _markRacersReady();
}

/** The ready signal, for the loader's failure path — the app must never block on a dead server. */
export function _markRacersReadyFromLoader() {
  _markRacersReady();
}

/** Whether a server-loaded type with this id exists — `registerRacerType`'s create-vs-update test. */
export function _hasLoadedRacerType(id) {
  return id in _loadedRacerTypes;
}

// ── Boot sequence ────────────────────────────────────────────────────────────
// User-created types are loaded async via loadServerRacerTypes() after auth.
// Built-in overrides and warm-up run immediately at module load.
_applyStoredTunableOverrides();
warmUpAllRacerTypes();
