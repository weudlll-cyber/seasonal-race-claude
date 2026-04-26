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

import { HorseRacerType, HORSE_COATS } from './HorseRacerType.js';
import { DuckRacerType, DUCK_COATS } from './DuckRacerType.js';
import { SnailRacerType, SNAIL_COATS } from './SnailRacerType.js';
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

export const RACER_TYPE_EMOJIS = {
  horse: '🐴',
  duck: '🦆',
  snail: '🐌',
  elephant: '🐘',
  giraffe: '🦒',
  snake: '🐍',
  dragon: '🐉',
  f1: '🏎️',
  rocket: '🚀',
  buggy: '🚙',
  motorbike: '🏍️',
  plane: '✈️',
};

/**
 * Returns a racer-type instance for the given typeId.
 * All types are SpriteRacerType instances — returns the shared singleton.
 * Falls back to the horse instance for unknown ids.
 */
export function getRacerType(typeId) {
  return RACER_TYPES[typeId] ?? HorseRacerType;
}

/** Returns all registered racer type IDs. */
export function listRacerTypes() {
  return Object.keys(RACER_TYPES);
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

// Warm up on module import.
warmUpAllRacerTypes();
