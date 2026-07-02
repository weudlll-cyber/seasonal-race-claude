// ============================================================
// File:        registry.js
// Path:        client/src/modules/surface-effects/registry.js
// Project:     RaceArena
// Description: Surface-class registry.
//              Merges code-default classes with backend-stored custom classes
//              and default-class overrides. Used by Dev-Screen (VRE-2), the
//              Setup filter (VRE-3), and the race trail dispatcher (VRE-4).
// ============================================================

import { DEFAULT_SURFACE_CLASSES } from './defaults.js';
import particleGenerator from './generators/particle.js';
import cloudGenerator from './generators/cloud.js';
import splashGenerator from './generators/splash.js';
import lineGenerator from './generators/line.js';

/** Map of all available generators keyed by id. */
export const GENERATORS = {
  particle: particleGenerator,
  cloud: cloudGenerator,
  splash: splashGenerator,
  line: lineGenerator,
};

// Internal mutable list — seeded from code defaults, updated by loadServerClasses().
let _classes = [...DEFAULT_SURFACE_CLASSES];

/**
 * Load (or reload) the class list by merging code defaults with backend entries.
 * Backend entries:
 *   - isOverride: true  → replace the matching default class
 *   - isDefault: false  → append as custom class
 *
 * Call this once on startup after fetching from the backend (see surfaceClassLoader.js).
 * @param {object[]} serverClasses  — array from GET /api/surface-classes
 */
export function loadServerClasses(serverClasses) {
  const base = DEFAULT_SURFACE_CLASSES.map((c) => ({ ...c }));
  const overrideMap = new Map(serverClasses.filter((c) => c.isOverride).map((c) => [c.id, c]));
  const custom = serverClasses.filter((c) => !c.isOverride && !c.isDefault);

  _classes = [...base.map((c) => overrideMap.get(c.id) ?? c), ...custom];
}

/** Reset the registry back to code defaults. Useful in tests. */
export function resetToDefaults() {
  _classes = [...DEFAULT_SURFACE_CLASSES];
}

/**
 * Returns a snapshot of all surface classes (defaults + custom + overrides applied).
 * @returns {object[]}
 */
export function listAllSurfaceClasses() {
  return [..._classes];
}

/**
 * Returns a single surface class by id, or undefined if not found.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getSurfaceClass(id) {
  return _classes.find((c) => c.id === id);
}

/**
 * Returns the generator module for a given surface class id.
 * Returns undefined if the class or generator is unknown.
 * @param {string} classId
 * @returns {object|undefined}
 */
export function getGeneratorForClass(classId) {
  const cls = getSurfaceClass(classId);
  if (!cls) return undefined;
  return GENERATORS[cls.generatorId];
}

/**
 * Resolve the active surface class for a racer on a given track.
 * Returns the first class id that appears in both lists, or null if no match.
 *
 * @param {string[]} racerClasses  — surfaceClasses from the racer type config
 * @param {string[]} trackClasses  — surfaceClasses from the track preset
 * @returns {object|null}          — resolved SurfaceClass or null (→ native trail)
 */
export function resolveActiveSurfaceClass(racerClasses, trackClasses) {
  if (!Array.isArray(racerClasses) || !Array.isArray(trackClasses)) return null;
  const trackSet = new Set(trackClasses);
  for (const id of racerClasses) {
    if (trackSet.has(id)) {
      const cls = getSurfaceClass(id);
      if (cls) return cls;
    }
  }
  return null;
}

/**
 * Filter racer types to only those compatible with a given track's surface classes.
 *
 * A racer is compatible when it has ≥1 class overlapping with the track's classes.
 * Racers with an empty surfaceClasses array are never filtered — they always show up
 * (backwards-compatible: they always use their native trail).
 *
 * Edge-case: if trackSurfaceClasses is empty or missing, all racers are returned
 * (legacy tracks without the field remain fully compatible with all racers).
 *
 * @param {object[]} racerTypes         — array from listAllRacerTypes() with id field
 * @param {string[]} trackSurfaceClasses — surfaceClasses from the track preset
 * @param {function} getRacerClassesFn  — (id) => string[], retrieves surfaceClasses for a type
 * @returns {object[]} filtered racer types
 */
export function filterRacerTypesForTrack(racerTypes, trackSurfaceClasses, getRacerClassesFn) {
  if (!Array.isArray(trackSurfaceClasses) || trackSurfaceClasses.length === 0) {
    return racerTypes;
  }
  const trackSet = new Set(trackSurfaceClasses);
  return racerTypes.filter((rt) => {
    const classes = getRacerClassesFn(rt.id);
    if (!Array.isArray(classes) || classes.length === 0) return true;
    return classes.some((c) => trackSet.has(c));
  });
}
