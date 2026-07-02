// ============================================================
// File:        trailResolver.js
// Path:        client/src/modules/surface-effects/trailResolver.js
// Project:     RaceArena
// Description: Resolves the active surface-class trail emitter for a racer.
//              Used by RaceScreen at race-init time (once per racer per race).
// ============================================================

import { resolveActiveSurfaceClass, getGeneratorForClass } from './registry.js';

/**
 * Resolve a surface-class trail emitter for a racer on a given track.
 *
 * Returns a generator emitter { spawn, update, render } when the racer type
 * has at least one surface class matching the track's surface classes.
 * Returns null when no class matches — caller should fall back to the
 * racer type's trailFactory (native trail).
 *
 * Each call creates a fresh emitter instance. This is intentional: stateful
 * generators (line.js) close over internal position state and must not be
 * shared between racers or re-created mid-race.
 *
 * @param {object}   racerType          — SpriteRacerType instance
 * @param {string[]} trackSurfaceClasses — from raceData.trackSurfaceClasses
 * @returns {{ spawn, update, render }|null}
 */
export function resolveTrailEmitter(racerType, trackSurfaceClasses) {
  const racerClasses = racerType.getSurfaceClasses?.() ?? [];
  const trackClasses = Array.isArray(trackSurfaceClasses) ? trackSurfaceClasses : [];

  const activeClass = resolveActiveSurfaceClass(racerClasses, trackClasses);
  if (!activeClass) return null;

  const generatorModule = getGeneratorForClass(activeClass.id);
  if (!generatorModule) return null;

  // Per-racer-type effect overrides (set via DevScreen tuning modal).
  // Stored as { spawnProbability, endSize, lifetimeFrames } on the racer type config.
  // Missing or null → use class defaults as-is.
  const effectOverrides = racerType.config?.surfaceEffectOverrides;
  const effectConfig = effectOverrides
    ? { ...activeClass.config, ...effectOverrides }
    : activeClass.config;

  return generatorModule.create(effectConfig);
}
