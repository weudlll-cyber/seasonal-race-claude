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
//              D3.5.3: All 12 racer types are SpriteRacerType instances.
//              No class-based RacerTypes remain. CarRacerType removed,
//              replaced by BuggyRacerType. COATS_BY_TYPE auto-derived
//              from type configs. warmUpAllRacerTypes handles mask types.
//
//              D3.5.5: Override-API extended to support 6 tunable fields
//              (speedMultiplier, displaySize, basePeriodMs, leaderRingColor,
//              leaderEllipseRx, leaderEllipseRy). Storage schema migrated
//              from { id: false } → { id: { isActive: false } }.
//              CONFIG_SNAPSHOT captures code defaults before any override.
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
import { getCoatVariants } from './spriteTinter.js';
import { loadSprite } from './spriteLoader.js';
import { storageGet, storageSet, KEYS } from '../storage/storage.js';

// All 12 racer types are SpriteRacerType instances.
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
};

export const RACER_TYPE_IDS = Object.keys(RACER_TYPES);

// Auto-derived from type configs — no manual maintenance needed.
export const COATS_BY_TYPE = Object.fromEntries(
  Object.entries(RACER_TYPES).map(([id, type]) => [id, type.config.coats])
);

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
};

/**
 * Returns a racer-type instance for the given typeId.
 * All types are SpriteRacerType instances — returns the shared singleton.
 * Falls back to the horse instance for unknown ids.
 */
export function getRacerType(typeId) {
  return RACER_TYPES[typeId] ?? HorseRacerType;
}

/** Alias for getRacerType — preferred in contexts where the id semantics matter. */
export function getRacerTypeById(id) {
  return RACER_TYPES[id] ?? HorseRacerType;
}

/** Returns all registered racer type IDs. */
export function listRacerTypes() {
  return Object.keys(RACER_TYPES);
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
];

/**
 * Snapshot of original code-default values for all tunable fields, captured
 * before any boot-time override is applied. Used by reset-to-default logic.
 */
export const CONFIG_SNAPSHOT = Object.freeze(
  Object.fromEntries(
    RACER_TYPE_IDS.map((id) => [
      id,
      Object.freeze(Object.fromEntries(TUNABLE_FIELDS.map((f) => [f, RACER_TYPES[id].config[f]]))),
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
  if (RACER_TYPES[id] && TUNABLE_FIELDS.includes(fieldName)) {
    RACER_TYPES[id].config[fieldName] = value;
  }
}

/** Restore a tunable field to its code default (no storage write). */
export function restoreTunableDefault(id, fieldName) {
  const snap = CONFIG_SNAPSHOT[id];
  if (RACER_TYPES[id] && snap && fieldName in snap) {
    RACER_TYPES[id].config[fieldName] = snap[fieldName];
  }
}

/** Apply all stored tunable overrides to live configs. Called once at boot. */
function _applyStoredTunableOverrides() {
  const raw = storageGet(KEYS.RACER_TYPE_OVERRIDES);
  if (!raw) return;
  const overrides = normalizeOverrideMap(raw);
  for (const [id, fields] of Object.entries(overrides)) {
    if (!RACER_TYPES[id]) continue;
    for (const field of TUNABLE_FIELDS) {
      if (field in fields) RACER_TYPES[id].config[field] = fields[field];
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Returns an array of all 12 racer types with isActive resolved from the override map.
 * All types are active by default; an operator can disable individual types via
 * setRacerTypeOverride(). The code registry (RACER_TYPES) is always the source of truth.
 */
export function listAllRacerTypes() {
  const raw = storageGet(KEYS.RACER_TYPE_OVERRIDES) ?? {};
  const overrides = normalizeOverrideMap(raw);
  return RACER_TYPE_IDS.map((id) => ({
    id,
    name: RACER_TYPE_LABELS[id] ?? id,
    emoji: RACER_TYPES[id].getEmoji(),
    speedMultiplier: RACER_TYPES[id].getSpeedMultiplier(),
    isActive: (overrides[id]?.isActive ?? true) !== false,
  }));
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
 * Warm up sprite caches for all racer types.
 * - multiply-mode types: pre-tint all coat variants via getCoatVariants.
 * - mask-mode types: preload base sprite + mask sprite; tinting is on-demand.
 * Idempotent — safe to call multiple times.
 */
export function warmUpAllRacerTypes() {
  if (_warmedUp) return;
  _warmedUp = true;
  for (const racerType of Object.values(RACER_TYPES)) {
    const cfg = racerType.config;
    if (!cfg) continue;
    if (cfg.tintMode === 'mask' && cfg.maskUrl) {
      loadSprite(cfg.spriteUrl).catch(() => {});
      loadSprite(cfg.maskUrl).catch(() => {});
    } else {
      getCoatVariants(cfg.spriteUrl, cfg.coats).catch(() => {});
    }
  }
}

/** Reset warm-up flag. Only use in tests. */
export function _resetWarmUpForTesting() {
  _warmedUp = false;
}

// Apply stored tunable overrides and warm up sprites on module import.
_applyStoredTunableOverrides();
warmUpAllRacerTypes();
