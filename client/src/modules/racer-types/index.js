// ============================================================
// File:        index.js
// Path:        client/src/modules/racer-types/index.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Factory + registry for all racer-type modules.
//              getRacerType(typeId) returns the correct instance.
//              Also preserves the legacy RACER_TYPES export so
//              existing code that imports it keeps working.
// ============================================================

export { HorseRacerType } from './HorseRacerType.js';
export { DuckRacerType } from './DuckRacerType.js';
export { RocketRacerType } from './RocketRacerType.js';
export { SnailRacerType } from './SnailRacerType.js';
export { CarRacerType } from './CarRacerType.js';

import { HorseRacerType } from './HorseRacerType.js';
import { DuckRacerType } from './DuckRacerType.js';
import { RocketRacerType } from './RocketRacerType.js';
import { SnailRacerType } from './SnailRacerType.js';
import { CarRacerType } from './CarRacerType.js';

const TYPE_MAP = {
  horse: HorseRacerType,
  duck: DuckRacerType,
  rocket: RocketRacerType,
  snail: SnailRacerType,
  car: CarRacerType,
};

export const RACER_TYPE_IDS = Object.keys(TYPE_MAP);

export const RACER_TYPE_LABELS = {
  horse: 'Horse 🐴',
  duck: 'Duck 🦆',
  rocket: 'Rocket 🚀',
  snail: 'Snail 🐌',
  car: 'Car 🚗',
};

export const RACER_TYPE_EMOJIS = {
  horse: '🐴',
  duck: '🦆',
  rocket: '🚀',
  snail: '🐌',
  car: '🚗',
};

/**
 * Returns a racer-type instance for the given typeId.
 * Falls back to HorseRacerType for unknown ids.
 */
export function getRacerType(typeId) {
  const Cls = TYPE_MAP[typeId] ?? HorseRacerType;
  return new Cls();
}

// ── Legacy exports (kept so existing imports don't break) ──────────────────
export const RACER_TYPES = {
  SPEED_DEMON: { id: 'SPEED_DEMON', label: 'Speed Demon', topSpeed: 10, handling: 5, accel: 8 },
  TANK: { id: 'TANK', label: 'Tank', topSpeed: 6, handling: 7, accel: 5 },
  ALL_ROUNDER: { id: 'ALL_ROUNDER', label: 'All-Rounder', topSpeed: 7, handling: 7, accel: 7 },
};
