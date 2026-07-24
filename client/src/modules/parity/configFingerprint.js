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

// The world config blocks split by whether they can change the RACE OUTCOME. The 5 RACE-RELEVANT blocks
// are the ones the sim consumes and that move finishing order (see reports/parity/DIVERGENCE-AUDIT.md
// §2e). The 2 COSMETIC blocks are camera framing + render pacing — the sim never reads them, and the
// race is camera / frame-rate independent since D-STREAM, so a tweak there does NOT make a browser race
// incomparable to a canonical-defaults sim run. Together they partition WORLD_CONFIG_KEYS exactly.
export const RACE_RELEVANT_CONFIG_KEYS = [
  'raceDynamicsConfig',
  'raceBehaviorConfig',
  'rowLayoutConfig',
  'baseSpeedConfig',
  'autoScaleConfig',
];
export const COSMETIC_CONFIG_KEYS = ['cameraConfig', 'frameTimingConfig'];

/**
 * Count the config LEAF keys that differ between the current world and the defaults world, over a chosen
 * set of blocks. Canonical-JSON value compare (nested objects / arrays / key order never false-positive).
 *
 * @param {object} current  { <block>: {<key>: value, …}, … } — e.g. from the load*Config loaders
 * @param {object} defaults { <block>: {<key>: value, …}, … } — e.g. the DEFAULT_* config objects
 * @param {string[]} [blocks] which blocks to compare (default: all of WORLD_CONFIG_KEYS)
 * @returns {{ count: number, keys: string[] }} count of differing leaf keys + their `block.key` names
 */
export function countConfigDiffs(current, defaults, blocks = WORLD_CONFIG_KEYS) {
  const keys = [];
  for (const block of blocks) {
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
 * Split the off-default diff into RACE-relevant and COSMETIC. Red means "not apples-to-apples with a
 * default-config sim run" — that is exactly `race.count > 0`; cosmetic drift is reported but never red.
 *
 * @returns {{ race: {count:number, keys:string[]}, cosmetic: {count:number, keys:string[]} }}
 */
export function splitConfigDiffs(current, defaults) {
  return {
    race: countConfigDiffs(current, defaults, RACE_RELEVANT_CONFIG_KEYS),
    cosmetic: countConfigDiffs(current, defaults, COSMETIC_CONFIG_KEYS),
  };
}

/**
 * The RACE-relevant world hash — a content hash of ONLY the race-determining config blocks. Stable across
 * cosmetic (camera / frame-timing) tweaks, so the badge's hash is the one that scopes browser↔sim parity:
 * a sim invocation on the same race config computes the same value.
 */
export function raceRelevantWorldHash(currentWorld) {
  const w = {};
  for (const b of RACE_RELEVANT_CONFIG_KEYS) w[b] = currentWorld?.[b] ?? {};
  return hashWorld(w).short;
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
