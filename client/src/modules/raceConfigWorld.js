// ============================================================
// raceConfigWorld.js — Stage 0: the SINGLE source of truth for the exported "world" config.
// Imported by BOTH the browser (DevScreen "Export race config") AND the sim (--config). One module,
// one schema, one hash function — so a hash produced in the browser and a hash recomputed in the sim
// match BY CONSTRUCTION. If either side ever re-implements this, the safeguard becomes the next silent
// divergence, so: never copy this logic — import it.
//
// This module changes NO race behaviour. It only serialises, hashes, and classifies config.
// ============================================================

// Bump when the world SHAPE changes (added/removed config key). A result stamped with an old schema
// version does not describe the current world shape and must be re-exported.
export const WORLD_SCHEMA_VERSION = 1;

// The config keys the browser reads on the race path, enumerated ONCE here (index.jsx:424-453). The
// export gathers exactly these; the sim honours exactly these. Adding a race-path config key WITHOUT
// adding it here is the silent-divergence bug this file exists to prevent — keep them in lock-step.
export const WORLD_CONFIG_KEYS = [
  'raceDynamicsConfig',
  'raceBehaviorConfig',
  'rowLayoutConfig',
  'baseSpeedConfig',
  'raceZoneConfig',
  'autoScaleConfig',
  'frameTimingConfig',
  'cameraConfig',
];

// ── Canonical serialisation: stable key order at every depth → identical string on both sides. ──
export function canonicalJson(value) {
  const seen = new WeakSet();
  const norm = (v) => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) throw new Error('canonicalJson: circular reference');
    seen.add(v);
    if (Array.isArray(v)) return v.map(norm);
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
    return out;
  };
  return JSON.stringify(norm(value));
}

// ── Deterministic content hash (FNV-1a 32-bit → 8 hex chars). Pure JS: identical in Node and the
// browser (no crypto dependency, no platform floats). Short form = first 6 chars (the `world:` string). ──
export function hashWorld(world) {
  const str = canonicalJson(world);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return { full: hex, short: hex.slice(0, 6) };
}

// ── SIMULATABILITY: the named reasons the sim CANNOT faithfully run a given world. The sim's t-update
// has no `zoneMult`, so a world with race zones enabled would be silently mis-simulated (the browser
// clamps zoneMult to [0.8, 1.2] = up to ±20 %). Return a list of {code, message}; empty = simulatable.
// This is the ONE place that knowledge lives, so the browser can warn and the sim can ABORT off the
// same list. ──
export function unsimulatableReasons(world) {
  const reasons = [];
  const cfg = world?.configs ?? {};
  if (cfg.raceZoneConfig && cfg.raceZoneConfig.enabled === true) {
    reasons.push({
      code: 'RACE_ZONES_ENABLED',
      message:
        'raceZoneConfig.enabled=true: the browser applies zoneMult (clamped [0.8,1.2], up to ±20%) in ' +
        'its t-update; the sim has NO zoneMult and never imports raceZones. This run would NOT describe ' +
        'that race. Disable race zones (owner decision to delete them) or do not simulate this world.',
    });
  }
  return reasons;
}

// The stamp carried by every sim result / report. `worldHash` is the short hash, or the ASSUMED sentinel.
export const ASSUMED_DEFAULTS_STAMP = 'ASSUMED-DEFAULTS';
export function worldStamp(world) {
  return world
    ? {
        schemaVersion: world.schemaVersion ?? WORLD_SCHEMA_VERSION,
        worldHash: hashWorld(world).short,
        provisional: false,
      }
    : { schemaVersion: WORLD_SCHEMA_VERSION, worldHash: ASSUMED_DEFAULTS_STAMP, provisional: true };
}
