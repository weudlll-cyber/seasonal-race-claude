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

/**
 * @typedef {Object} RacerStyle
 * @property {string} primaryColor     - Hex colour for the racer body
 * @property {string} accentColor      - Hex colour for mane, tail, details
 * @property {number} silhouetteScale  - Multiplier applied to getDimensions()
 * @property {object} [sprite]         - Sprite sheet config (url, frame dims, animation period, rotation offset)
 * @property {Array<{id:string,name:string,tint:string|null}>} [coats] - Available coat colour variants
 * @property {string} [defaultCoatId]  - Coat id to use when racer.coatId is unset
 */

/**
 * @typedef {Object} RacerRender
 * @property {(ctx: CanvasRenderingContext2D, racer: object, frame: number) => void} drawBody
 *   Draw the racer body centred on (0,0). Caller handles translate + rotate.
 * @property {() => { width: number, height: number }} getDimensions
 *   Bounding box at silhouetteScale 1.0 — used for camera zoom + collision bounds.
 */

/**
 * @typedef {Object} RacerAnimation
 * @property {(frame: number, speed: number) => number} getFrameIndex
 *   Pure function returning the sprite animation frame index (0..frameCount-1).
 *   Deterministic for any (frame, speed) pair; period scales with speed.
 */

/**
 * @typedef {Object} RacerTrail
 * @property {(racer: object) => {
 *   spawn(racer: object, dt: number): void,
 *   update(dt: number): void,
 *   render(ctx: CanvasRenderingContext2D): void
 * }} createTrail
 *   Factory that returns a per-racer particle system. All state is encapsulated
 *   inside the returned object's closure — no shared global pool.
 */

/**
 * Extended racer-type manifest shape.
 *
 * All four sections (render / animation / trail / style) are OPTIONAL.
 * Racers that omit them fall back to the legacy emoji rendering via drawRacer()
 * and getTrailParticles().  The horse (HorseRacerType) implements all four
 * as the D1 pilot; the remaining four racers will be upgraded in D3.
 *
 * @typedef {Object} RacerManifest
 * @property {() => string}  getEmoji           - Emoji fallback (always present)
 * @property {() => number}  getSpeedMultiplier - Physics speed factor (always present)
 * @property {Function}      drawRacer          - Legacy draw call (always present)
 * @property {Function}      getTrailParticles  - Legacy particle API (always present)
 * @property {RacerStyle}    [style]            - Colour palette + scale
 * @property {RacerRender}   [render]           - Canvas draw body + dimensions
 * @property {RacerAnimation}[animation]        - Deterministic phase offsets
 * @property {RacerTrail}    [trail]            - Per-racer particle factory
 */

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
