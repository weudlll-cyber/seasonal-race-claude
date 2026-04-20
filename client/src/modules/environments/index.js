// ============================================================
// File:        index.js
// Path:        client/src/modules/environments/index.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Factory + registry for all environment modules.
//              getEnvironment(envId, cw, ch) returns the correct
//              environment instance for a given track configuration.
// ============================================================

export { DirtOvalEnvironment } from './DirtOvalEnvironment.js';
export { RiverEnvironment } from './RiverEnvironment.js';
export { SpaceEnvironment } from './SpaceEnvironment.js';
export { GardenEnvironment } from './GardenEnvironment.js';
export { CityEnvironment } from './CityEnvironment.js';

import { DirtOvalEnvironment } from './DirtOvalEnvironment.js';
import { RiverEnvironment } from './RiverEnvironment.js';
import { SpaceEnvironment } from './SpaceEnvironment.js';
import { GardenEnvironment } from './GardenEnvironment.js';
import { CityEnvironment } from './CityEnvironment.js';

const ENV_MAP = {
  dirt: DirtOvalEnvironment,
  river: RiverEnvironment,
  space: SpaceEnvironment,
  garden: GardenEnvironment,
  city: CityEnvironment,
};

export const ENV_IDS = Object.keys(ENV_MAP);

export const ENV_LABELS = {
  dirt: 'Dirt Oval',
  river: 'River',
  space: 'Space',
  garden: 'Garden',
  city: 'City',
};

/**
 * Returns an environment instance for the given envId.
 * Falls back to DirtOvalEnvironment for unknown ids.
 */
export function getEnvironment(envId, cw, ch) {
  const Cls = ENV_MAP[envId] ?? DirtOvalEnvironment;
  return new Cls(cw, ch);
}
