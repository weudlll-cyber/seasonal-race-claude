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

export { HorseRacerType, HORSE_COATS } from './HorseRacerType.js';
export { DuckRacerType, DUCK_COATS } from './DuckRacerType.js';
export { SnailRacerType, SNAIL_COATS } from './SnailRacerType.js';
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
export { SpriteRacerType } from './SpriteRacerType.js';

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
import { getCoatVariants } from './spriteTinter.js';
import { loadSprite } from './spriteLoader.js';
import { storageGet, storageSet, KEYS } from '../storage/storage.js';
import { getTrailFactory } from './trailStyles.js';
import {
  fetchRacers,
  createRacer,
  updateRacer,
  deleteRacer,
  uploadRacerSprite,
} from '../../services/racerApi.js';
import { API_BASE_URL } from '../../services/api.js';

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

function _warmUpRacerType(racerType) {
  const cfg = racerType.config;
  if (!cfg) return;
  if (cfg.tintMode === 'mask') {
    loadSprite(cfg.spriteUrl).catch((e) =>
      console.error(`[warmup] ${cfg.id} FAILED: ${e.message}`)
    );
    if (cfg.maskUrl)
      loadSprite(cfg.maskUrl).catch((e) =>
        console.error(`[warmup] ${cfg.id} mask FAILED: ${e.message}`)
      );
    // Preload per-coat pattern masks and dual-mask border masks.
    const coatMasks = new Set([
      ...(cfg.coats?.map((c) => c.patternMask).filter(Boolean) ?? []),
      ...(cfg.coats?.map((c) => c.borderMask).filter(Boolean) ?? []),
    ]);
    for (const url of coatMasks)
      loadSprite(url).catch((e) =>
        console.error(`[warmup] ${cfg.id} coatMask FAILED: ${e.message}`)
      );
  } else {
    const blendMode = cfg.tintMode && cfg.tintMode !== 'mask' ? cfg.tintMode : 'multiply';
    getCoatVariants(cfg.spriteUrl, cfg.coats, blendMode).catch((e) =>
      console.error(`[warmup] ${cfg.id} FAILED: ${e.message}`)
    );
  }
}

/**
 * Warm up sprite caches for all racer types — built-in and user-created.
 * - multiply-mode types: pre-tint all coat variants via getCoatVariants.
 * - mask-mode types: preload base sprite + mask sprite; tinting is on-demand.
 * Idempotent — safe to call multiple times.
 */
export function warmUpAllRacerTypes() {
  if (_warmedUp) return;
  _warmedUp = true;
  const allTypes = [...Object.values(RACER_TYPES), ...Object.values(_loadedRacerTypes)];
  for (const racerType of allTypes) {
    _warmUpRacerType(racerType);
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
    _markRacersReady();
    return;
  }

  // Clear stale entries only after a successful fetch (stale-on-error).
  for (const id of Object.keys(_loadedRacerTypes)) {
    delete _loadedRacerTypes[id];
  }

  for (const cfg of configs) {
    try {
      const instance = new SpriteRacerType({
        ...cfg,
        spriteUrl: `${API_BASE_URL}/api/racers/${cfg.id}/sprite`,
        trailFactory: getTrailFactory(cfg.trailStyle),
      });
      _loadedRacerTypes[cfg.id] = instance;
      _warmUpRacerType(instance);
    } catch (err) {
      console.error(
        `[RaceArena] loadServerRacerTypes: skipping racer "${cfg.id}" — ${err.message}`
      );
    }
  }
  _markRacersReady();
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

  const isUpdate = config.id in _loadedRacerTypes;
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

// ── Boot sequence ────────────────────────────────────────────────────────────
// User-created types are loaded async via loadServerRacerTypes() after auth.
// Built-in overrides and warm-up run immediately at module load.
_applyStoredTunableOverrides();
warmUpAllRacerTypes();
