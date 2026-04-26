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
//              D3.5 part 2: Horse/Duck/Snail are now SpriteRacerType
//              instances (not classes). Rocket/Car remain classes.
//              getRacerType handles both. warmUpAllRacerTypes() centralises
//              sprite cache warm-up; called once at module load.
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

export { HorseRacerType, HORSE_COATS } from './HorseRacerType.js';
export { DuckRacerType, DUCK_COATS } from './DuckRacerType.js';
export { RocketRacerType } from './RocketRacerType.js';
export { SnailRacerType, SNAIL_COATS } from './SnailRacerType.js';
export { CarRacerType } from './CarRacerType.js';
export { SpriteRacerType } from './SpriteRacerType.js';

import { HorseRacerType, HORSE_COATS } from './HorseRacerType.js';
import { DuckRacerType, DUCK_COATS } from './DuckRacerType.js';
import { RocketRacerType } from './RocketRacerType.js';
import { SnailRacerType, SNAIL_COATS } from './SnailRacerType.js';
import { CarRacerType } from './CarRacerType.js';
import { getCoatVariants } from './spriteTinter.js';

// Horse / Duck / Snail are SpriteRacerType instances.
// Rocket / Car remain class constructors.
export const RACER_TYPES = {
  horse: HorseRacerType,
  duck: DuckRacerType,
  rocket: RocketRacerType,
  snail: SnailRacerType,
  car: CarRacerType,
};

export const RACER_TYPE_IDS = Object.keys(RACER_TYPES);

export const COATS_BY_TYPE = { horse: HORSE_COATS, duck: DUCK_COATS, snail: SNAIL_COATS };

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
 * For SpriteRacerType-based types (horse, duck, snail) returns the shared
 * singleton instance. For class-based types (rocket, car) returns a new instance.
 * Falls back to the horse instance for unknown ids.
 */
export function getRacerType(typeId) {
  const rt = RACER_TYPES[typeId] ?? HorseRacerType;
  if (typeof rt === 'function') return new rt();
  return rt;
}

/** Returns all registered racer type IDs. */
export function listRacerTypes() {
  return Object.keys(RACER_TYPES);
}

let _warmedUp = false;

/**
 * Warm up sprite caches for all SpriteRacerType-based racer types.
 * Idempotent — safe to call multiple times.
 * Called automatically at module load; can also be called manually for testing.
 */
export function warmUpAllRacerTypes() {
  if (_warmedUp) return;
  _warmedUp = true;
  for (const rt of Object.values(RACER_TYPES)) {
    if (typeof rt === 'function') continue; // skip class-based types (rocket, car)
    getCoatVariants(rt.config.spriteUrl, rt.config.coats).catch(() => {});
  }
}

/** Reset warm-up flag. Only use in tests. */
export function _resetWarmUpForTesting() {
  _warmedUp = false;
}

// Warm up on module import — same behaviour as the previous per-type top-level calls.
warmUpAllRacerTypes();
