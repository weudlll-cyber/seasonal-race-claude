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
// v2: raceZoneConfig removed (race-zones feature deleted). An old v1 world.json carries raceZoneConfig;
// the sim rejects it loudly (schemaVersion mismatch → STAGE-0 ABORT) so it can never be half-honoured.
export const WORLD_SCHEMA_VERSION = 2;

// The config keys the browser reads on the race path, enumerated ONCE here (index.jsx:424-453). The
// export gathers exactly these; the sim honours exactly these. Adding a race-path config key WITHOUT
// adding it here is the silent-divergence bug this file exists to prevent — keep them in lock-step.
export const WORLD_CONFIG_KEYS = [
  'raceDynamicsConfig',
  'raceBehaviorConfig',
  'rowLayoutConfig',
  'baseSpeedConfig',
  'autoScaleConfig',
  'frameTimingConfig',
  'cameraConfig',
];

// ── THE ENGINE-INPUT MODULE LIST — CAMERA-HYGIENE-1, stage 2 of the mint tripwire ─────────────
// WHY THIS EXISTS. `WORLD_CONFIG_KEYS` above stops a race-path CONFIG key going unnoticed. This is
// its twin for MODULES, and it exists because the folder test failed: our rule for presentation work
// was "no simulation file in the diff", which is a test of FOLDERS — and the engine's inputs are not
// confined to one. `drawnBodyWidthRefPx` is computed in a SCREEN file and consumed by
// `raceBehavior.js` as the avoidance body size, so a value that moves the race can sit in a camera
// diff and pass every check. That is not hypothetical: `autoSpriteScale.js` — which also exports the
// auto-scale config the start-grid packing reads — sat in the CAMERA-PICTURE-FIXES-1 diff and nobody
// noticed until the owner asked why overtaking looked easier. The fingerprint had NOT moved, but
// nothing in the regime had established that.
//
// THE RULE THIS DRIVES ([../../../docs/SHIP-CEREMONY.md] → THE MINT TRIPWIRE): a block that touches a
// file under client/src/modules/ outside camera/ mints once. That rule works when someone remembers
// it. THIS list works when nobody does — the test beside it fails the moment `raceCore.js` imports a
// module that is not named here, so adding an engine input forces a decision instead of a silence.
//
// KEEP IN LOCK-STEP with raceCore.js's own imports. Adding an entry is a claim that the module's
// values reach `createRaceFromIdentity` / `stepRacePhysics` — which is exactly the claim that means
// "a change here moves the world, mint before you ship it".
export const ENGINE_INPUT_MODULES = [
  './durationModel.js',
  './rowLayout.js',
  './raceBehaviorConfig.js',
  './raceBehavior.js',
  './raceStep.js',
  './raceGovernor.js',
  './raceLengths.js',
  './racePlanner.js',
  './raceDynamicsConfig.js',
  './camera/lapUtils.js',
  '../utils/mathUtils.js',
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

// ── SIMULATABILITY: the named reasons the sim CANNOT faithfully run a given world. Return a list of
// {code, message}; empty = simulatable. This is the ONE place that knowledge lives, so the browser can
// warn and the sim can ABORT off the same list. Currently EMPTY: the only reason ever registered here
// was RACE_ZONES_ENABLED, removed when the race-zones feature was deleted (the browser and sim t-updates
// are now factor-for-factor aligned). Kept as the extension point for the next unsimulatable config. ──
export function unsimulatableReasons(world) {
  const reasons = [];
  void world;
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
