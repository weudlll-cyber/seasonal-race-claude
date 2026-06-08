// ============================================================
// File:        defaults.js
// Path:        client/src/modules/surface-effects/defaults.js
// Project:     RaceArena
// Description: Default Surface Class definitions — single source of truth.
//              These 9 classes are code constants; custom classes and
//              default-class parameter overrides are stored in the backend.
// ============================================================

/**
 * DEFAULT_SURFACE_CLASSES — the 9 built-in surface types.
 *
 * Each class references one of the four generator IDs:
 *   'particle' | 'cloud' | 'splash' | 'line'
 *
 * Config values must match the referenced generator's configSchema.
 * IDs are stable lowercase strings used as foreign keys in racer/track data.
 */
export const DEFAULT_SURFACE_CLASSES = [
  {
    id: 'asphalt',
    label: 'Asphalt',
    generatorId: 'line',
    config: {
      color: '#555555', // dark grey tire marks
      thickness: 1.5,
      lifetimeFrames: 120, // long-lasting tread marks
    },
    isDefault: true,
  },
  {
    id: 'sand',
    label: 'Sand',
    generatorId: 'cloud',
    config: {
      color: '#d4b483', // warm tan
      startSize: 4,
      endSize: 10,
      lifetimeFrames: 22,
      spawnProbability: 0.2,
      driftDirection: 'back',
    },
    isDefault: true,
  },
  {
    id: 'earth',
    label: 'Earth',
    generatorId: 'cloud',
    config: {
      color: '#8b5e3c', // rich brown dirt
      startSize: 3,
      endSize: 8,
      lifetimeFrames: 20,
      spawnProbability: 0.22,
      driftDirection: 'back',
    },
    isDefault: true,
  },
  {
    id: 'mud',
    label: 'Mud',
    generatorId: 'splash',
    config: {
      color: '#5c3a1e', // dark muddy brown
      count: 4,
      sizeMin: 2,
      sizeMax: 5,
      lifetimeFrames: 30,
      spawnProbability: 0.5,
      gravity: 0.15,
      spreadAngle: 1.4,
    },
    isDefault: true,
  },
  {
    id: 'grass',
    label: 'Grass',
    generatorId: 'particle',
    config: {
      color: '#4a7c3f', // mid-green flecks
      sizeMin: 1,
      sizeMax: 2.5,
      lifetimeFrames: 20,
      spawnProbability: 0.35,
      drift: 0.6,
      gravity: 0.04,
    },
    isDefault: true,
  },
  {
    id: 'snow',
    label: 'Snow',
    generatorId: 'cloud',
    config: {
      color: '#e8f4fd', // near-white, slight blue tint
      startSize: 3,
      endSize: 9,
      lifetimeFrames: 25,
      spawnProbability: 0.15,
      driftDirection: 'random',
    },
    isDefault: true,
  },
  {
    id: 'ice',
    label: 'Ice',
    generatorId: 'line',
    config: {
      color: '#a8d4e8', // light blue-white scratches
      thickness: 1,
      lifetimeFrames: 150, // very persistent ice scratches
    },
    isDefault: true,
  },
  {
    id: 'water',
    label: 'Water',
    generatorId: 'splash',
    config: {
      color: '#2196f3', // clear blue
      count: 5,
      sizeMin: 1.5,
      sizeMax: 4,
      lifetimeFrames: 22,
      spawnProbability: 0.55,
      gravity: 0.18,
      spreadAngle: 1.8,
    },
    isDefault: true,
  },
  {
    id: 'air',
    label: 'Air',
    generatorId: 'cloud',
    config: {
      color: '#c8d8e8', // very pale grey-blue contrail
      startSize: 5,
      endSize: 12,
      lifetimeFrames: 28,
      spawnProbability: 0.12,
      driftDirection: 'back',
    },
    isDefault: true,
  },
];

/** Set of default class IDs — used for guard checks (cannot delete a raw default). */
export const DEFAULT_CLASS_IDS = new Set(DEFAULT_SURFACE_CLASSES.map((c) => c.id));
