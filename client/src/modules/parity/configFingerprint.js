// ============================================================
// File:        configFingerprint.js
// Path:        client/src/modules/parity/configFingerprint.js
// Project:     RaceArena
// Description: The count logic behind the HUD config-fingerprint badge (fix-plan step 4). Given the
//              CURRENT race-config world and the shipped DEFAULTS world, it counts how many config
//              leaf keys differ — so an eye-tester can see at a glance "this race is on defaults" vs
//              "N knobs are off default (and it is not comparable to a default-config sim run)".
//              Pure and side-effect free: this module hashes/diffs config, it changes no behaviour.
// ============================================================

import { WORLD_CONFIG_KEYS, canonicalJson, hashWorld } from '../raceConfigWorld.js';

/**
 * Count the config LEAF keys that differ between the current world and the defaults world.
 * Compares each of the WORLD_CONFIG_KEYS blocks (raceDynamicsConfig, raceBehaviorConfig, …) key by key
 * with a canonical-JSON value compare (so nested objects / arrays / key order never cause a false diff).
 *
 * @param {object} current  { <block>: {<key>: value, …}, … } — e.g. from the load*Config loaders
 * @param {object} defaults { <block>: {<key>: value, …}, … } — e.g. the DEFAULT_* config objects
 * @returns {{ count: number, keys: string[] }} count of differing leaf keys + their `block.key` names
 */
export function countConfigDiffs(current, defaults) {
  const keys = [];
  for (const block of WORLD_CONFIG_KEYS) {
    const cur = current?.[block] ?? {};
    const def = defaults?.[block] ?? {};
    const names = new Set([...Object.keys(cur), ...Object.keys(def)]);
    for (const k of [...names].sort()) {
      if (canonicalJson(cur[k]) !== canonicalJson(def[k])) keys.push(`${block}.${k}`);
    }
  }
  return { count: keys.length, keys };
}

/**
 * Build the short config-fingerprint summary for the HUD badge from the current + defaults worlds and
 * the race's track/roster content hashes.
 *
 * @param {object} p
 * @param {object} p.currentWorld   the 7 loaded config blocks
 * @param {object} p.defaultsWorld  the 7 default config blocks
 * @param {string} [p.trackGeometryHash]
 * @param {string} [p.rosterHash]
 * @returns {{ worldHash: string, identityHash: string, diffCount: number, diffKeys: string[],
 *            onDefaults: boolean }}
 */
export function configFingerprintSummary({
  currentWorld,
  defaultsWorld,
  trackGeometryHash,
  rosterHash,
}) {
  const worldHash = hashWorld(currentWorld).short;
  const { count, keys } = countConfigDiffs(currentWorld, defaultsWorld);
  const identityHash = hashWorld({
    worldHash,
    trackGeometryHash: trackGeometryHash ?? null,
    rosterHash: rosterHash ?? null,
  }).short;
  return { worldHash, identityHash, diffCount: count, diffKeys: keys, onDefaults: count === 0 };
}
