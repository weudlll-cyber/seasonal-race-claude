// ============================================================
// exportRaceConfig.js — Stage 0 (browser side): assemble the "world" blob for `Export race config`.
// Browser-only (reads localStorage via the SAME loaders the race path uses). Changes NO race behaviour.
//
// The hash + schema + simulatability come from the SHARED module raceConfigWorld.js — imported, NEVER
// re-implemented, so a hash produced here matches one the sim recomputes for the same blob by
// construction. The config is gathered by calling the SAME load*Config functions the race reads at
// start (RaceScreen/index.jsx:52-83) — never a hand-maintained key list, which is how the next silent
// divergence would creep in.
// ============================================================
import { loadRaceDynamicsConfig } from './raceDynamicsConfig.js';
import { loadRaceBehaviorConfig } from './raceBehaviorConfig.js';
import { loadRowLayoutConfig } from './rowLayoutConfig.js';
import { loadBaseSpeedConfig } from './baseSpeedConfig.js';
import { loadAutoScaleConfig } from './autoSpriteScale.js';
import { loadFrameTimingConfig } from './frameTimingConfig.js';
import { loadCameraConfig } from './cameraConfig.js';
import { RACER_TYPE_IDS, getRacerType } from './racer-types/index.js';
import { storageGet, KEYS } from './storage/storage.js';
import { DEFAULT_RACE_DYNAMICS_CONFIG, DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';
import {
  WORLD_SCHEMA_VERSION,
  hashWorld,
  unsimulatableReasons,
  canonicalJson,
} from './raceConfigWorld.js';

// The racer-type config fields that affect the SIM (speed + avoidance geometry). getRacerType(id).config
// already reflects any stored per-type overrides (racer-types/index.js:292 applies them at boot).
const SIM_TYPE_FIELDS = [
  'speedMultiplier',
  'displaySize',
  'bodyFillX',
  'bodyFillY',
  'surfaceClasses',
];

function effectiveRacerTypes() {
  const out = {};
  for (const id of RACER_TYPE_IDS) {
    const cfg = getRacerType(id)?.config ?? {};
    const e = {};
    for (const f of SIM_TYPE_FIELDS)
      if (f in cfg) e[f] = Array.isArray(cfg[f]) ? [...cfg[f]] : cfg[f];
    out[id] = e;
  }
  return out;
}

// Build the world blob. Deterministic: NO timestamp inside (a timestamp would change the hash on every
// export and break the flip-and-restore guarantee). Keys mirror raceConfigWorld.WORLD_CONFIG_KEYS.
export function buildWorldConfig() {
  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    configs: {
      raceDynamicsConfig: loadRaceDynamicsConfig(),
      raceBehaviorConfig: loadRaceBehaviorConfig(),
      rowLayoutConfig: loadRowLayoutConfig(),
      baseSpeedConfig: loadBaseSpeedConfig(),
      autoScaleConfig: loadAutoScaleConfig(),
      frameTimingConfig: loadFrameTimingConfig(),
      cameraConfig: loadCameraConfig(),
    },
    racerTypeOverrides: storageGet(KEYS.RACER_TYPE_OVERRIDES) ?? {},
    effectiveRacerTypes: effectiveRacerTypes(),
  };
}

// Short content hash for the DevScreen `world:` chip — from the shared module.
export function worldHashShort(world = buildWorldConfig()) {
  return hashWorld(world).short;
}

// Human-readable deviations from the shipped defaults, for the DevScreen banner. Empty = all defaults.
// Special-cases the owner-relevant traps by name; falls back to "<config> changed" for the rest.
export function describeDeviations(world = buildWorldConfig()) {
  const dev = [];
  const c = world.configs;
  const nOverrides = Object.keys(world.racerTypeOverrides ?? {}).filter((id) =>
    Object.keys(world.racerTypeOverrides[id] ?? {}).some((k) => k !== 'isActive')
  ).length;
  if (nOverrides > 0) dev.push(`${nOverrides} racer override${nOverrides > 1 ? 's' : ''}`);
  if (c.autoScaleConfig && c.autoScaleConfig.enabled === false) dev.push('auto-scale OFF');
  // Generic per-config deviation: load*Config() returns the FULL merged config, so a direct compare to
  // the shipped default flags any change. (autoScale already named above; skip to avoid dupes.)
  const cmp = (cfg, def, name) => {
    if (cfg && canonicalJson(cfg) !== canonicalJson(def)) dev.push(`${name} changed`);
  };
  cmp(c.raceDynamicsConfig, DEFAULT_RACE_DYNAMICS_CONFIG, 'raceDynamicsConfig');
  cmp(c.raceBehaviorConfig, DEFAULT_RACE_BEHAVIOR_CONFIG, 'raceBehaviorConfig');
  return dev;
}

// The full DevScreen status for the export panel: hash, deviations, and whether the sim can run it.
export function worldStatus(world = buildWorldConfig()) {
  return {
    world,
    hashShort: hashWorld(world).short,
    deviations: describeDeviations(world),
    unsimulatable: unsimulatableReasons(world), // currently always [] (see raceConfigWorld.js)
  };
}
