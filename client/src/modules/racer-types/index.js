// ============================================================
// File:        index.js
// Path:        client/src/modules/racer-types/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Racer type definitions — stats, sprites, and unlock conditions
// ============================================================

export const RACER_TYPES = {
  SPEED_DEMON: {
    id: 'SPEED_DEMON',
    label: 'Speed Demon',
    topSpeed: 10,
    handling: 5,
    accel: 8,
  },
  TANK: {
    id: 'TANK',
    label: 'Tank',
    topSpeed: 6,
    handling: 7,
    accel: 5,
  },
  ALL_ROUNDER: {
    id: 'ALL_ROUNDER',
    label: 'All-Rounder',
    topSpeed: 7,
    handling: 7,
    accel: 7,
  },
};

export function getRacerType(id) {
  return RACER_TYPES[id] ?? RACER_TYPES.ALL_ROUNDER;
}
