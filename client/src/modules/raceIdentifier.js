// ============================================================
// File:        raceIdentifier.js
// Path:        client/src/modules/raceIdentifier.js
// Project:     RaceArena — RACE-IDENTIFIER-1
//
// ONE STRING THAT REPEATS A RACE ON ANOTHER MACHINE.
//
// ── WHY A SEED IS NOT ENOUGH, at source ─────────────────────────────────────────────────────────
//
// `SetupScreen.jsx:677` fixes the plan seed into the race payload, and the race is a pure function
// of what it is given. But `RaceScreen/index.jsx:488` reads the action stage and `:503` gathers the
// whole config world — both from THE HOST'S OWN STORAGE at the moment the race starts. So the same
// seed on two machines is two races, and neither operator changed anything. This module carries
// everything the seed does not.
//
// ── WHAT IS ENCODED: the nine inputs, counted at source rather than carried over ────────────────
//
// RACE-IDENTITY-1 named nine. Counted again on 2026-09-05 by reading every `raceData.` access in
// `RaceScreen/index.jsx` and following each one to where it lands, the nine hold:
//
//   1. `geometryId`         :409, :417 — resolves the track through `getTrack()`
//   2. `racerTypeId`        :406
//   3. the NAME LIST, IN ORDER — :749, copied onto every racer; a name is physics, because
//                                `stablePairBit` hashes it
//   4. field size           :404 — implied exactly by the length of the name list, so it is not
//                                 encoded twice
//   5. `racePlanSeed`       :569
//   6. `raceActionStage`    :488
//   7. `targetLaps` / `targetDurationSec`  :582, :583
//   8. `racePlanEnabled`    :586
//   9. THE WORLD CONFIG     :503 — `buildWorldConfig()`, which reads the host's localStorage through
//                                 the SAME loaders the race path uses
//
// ★ TWO PAYLOAD FIELDS REACH THE PICTURE BUT NOT THE ENGINE, and they are deliberately NOT in the
// list above: `worldWidth`/`worldHeight` (:407, :432) go to the CameraDirector (:610) and
// `renderRaceFrame` (:1542), and `trackSurfaceClasses` (:725) goes only to `r.surfaceEmitter`, which
// no engine file reads. They decide what the race LOOKS like, not who wins. They are named here so
// the omission is a decision on the record rather than an oversight.
//
// ── EXACT, NEVER LOSSY ──────────────────────────────────────────────────────────────────────────
//
// The config travels as a DIFF against the shipped defaults, and that is exact rather than a
// compression: `defaults.js` is IN THE BUILD on both machines, so defaults + diff reconstructs the
// config byte for byte. The build stamp below is what makes that safe — a diff means nothing against
// a different set of defaults, so an identifier from another build is REFUSED rather than silently
// producing a different race. On a machine running shipped defaults the diff is empty and the
// identifier is at its shortest, which is the common case.
//
// No compression library is used: adding a dependency to shorten a string is the wrong trade, and
// `CompressionStream` is not available in every environment this module is tested in.
// ============================================================

import { canonicalJson } from './raceConfigWorld.js';

/**
 * The identifier's own format version. It is NOT the world schema version — this counts changes to
 * the ENCODING, and the world schema travels inside the payload on its own.
 */
export const RACE_IDENTIFIER_VERSION = 1;

/** Every identifier starts with this, which is what makes one recognisable in a seed field. */
export const RACE_IDENTIFIER_PREFIX = 'RA1-';

// ── base64url, both directions, without assuming Node or the browser ──────────────────────────────

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * The difference between a live config world and the shipped one, deep, by value.
 *
 * Returns `undefined` where the two agree, so an all-defaults host produces `{}` and the identifier
 * stays short. Arrays are compared whole and carried whole — an array diffed element-wise cannot be
 * put back together without knowing whether an index was absent or equal.
 */
export function diffFromDefaults(live, base) {
  if (live === base) return undefined;
  if (Array.isArray(live) || Array.isArray(base) || live === null || base === null) {
    return canonicalJson(live) === canonicalJson(base) ? undefined : live;
  }
  if (typeof live !== 'object' || typeof base !== 'object') {
    return live === base ? undefined : live;
  }
  const out = {};
  let any = false;
  for (const k of Object.keys(live)) {
    const d = diffFromDefaults(live[k], base?.[k]);
    if (d !== undefined) {
      out[k] = d;
      any = true;
    }
  }
  // A key the DEFAULTS have and the live config does not is a real difference, and dropping it would
  // make the round-trip lossy: reapplying the diff would restore the default rather than the absence.
  for (const k of Object.keys(base ?? {})) {
    if (!(k in (live ?? {}))) {
      out[k] = null;
      any = true;
    }
  }
  return any ? out : undefined;
}

/** Put a diff produced by `diffFromDefaults` back onto the shipped defaults. The exact inverse. */
export function applyDiff(base, diff) {
  if (diff === undefined) return structuredCloneish(base);
  if (diff === null) return undefined;
  if (Array.isArray(diff) || typeof diff !== 'object' || diff === null) return diff;
  if (typeof base !== 'object' || base === null || Array.isArray(base))
    return structuredCloneish(diff);
  const out = structuredCloneish(base);
  for (const k of Object.keys(diff)) {
    const v = applyDiff(base[k], diff[k]);
    if (v === undefined) delete out[k];
    else out[k] = v;
  }
  return out;
}

/** A deep copy without depending on `structuredClone` being present in every test environment. */
function structuredCloneish(v) {
  if (v === null || typeof v !== 'object') return v;
  return JSON.parse(JSON.stringify(v));
}

/**
 * Encode one race as a single string.
 *
 * @param {object} p
 * @param {string}   p.geometryId
 * @param {string}   p.racerTypeId
 * @param {string[]} p.names               the roster IN ORDER — field size is its length
 * @param {number}   p.racePlanSeed
 * @param {string}   p.raceActionStage
 * @param {number}   [p.targetLaps]        closed tracks
 * @param {number}   [p.targetDurationSec] open tracks
 * @param {boolean}  p.racePlanEnabled
 * @param {object}   p.world               `buildWorldConfig()` — the live config world
 * @param {object}   p.defaultWorldConfigs the shipped `DEFAULT_CONFIG_WORLD`, to diff against
 * @param {string}   p.buildId             refuses an identifier from a different build
 * @returns {string}
 */
export function encodeRaceIdentifier({
  geometryId,
  racerTypeId,
  names,
  racePlanSeed,
  raceActionStage,
  targetLaps,
  targetDurationSec,
  racePlanEnabled,
  world,
  defaultWorldConfigs,
  buildId,
}) {
  const payload = {
    v: RACE_IDENTIFIER_VERSION,
    b: buildId,
    g: geometryId,
    t: racerTypeId,
    n: names,
    s: racePlanSeed,
    a: raceActionStage,
    p: racePlanEnabled ? 1 : 0,
    // Exactly one of these is meaningful per race mode, which is the shape `SetupScreen.jsx:668-669`
    // already writes. The absent one is omitted rather than nulled, so it round-trips as absent.
    ...(targetLaps == null ? {} : { l: targetLaps }),
    ...(targetDurationSec == null ? {} : { d: targetDurationSec }),
    // The world, as its schema version plus what differs from the shipped defaults.
    w: {
      sv: world?.schemaVersion ?? null,
      c: diffFromDefaults(world?.configs ?? {}, defaultWorldConfigs ?? {}) ?? {},
      o: world?.racerTypeOverrides ?? {},
      e: world?.effectiveRacerTypes ?? {},
    },
  };
  return RACE_IDENTIFIER_PREFIX + toBase64Url(canonicalJson(payload));
}

/** True when a string is shaped like an identifier rather than a plain seed. */
export function looksLikeRaceIdentifier(s) {
  return typeof s === 'string' && s.trim().startsWith(RACE_IDENTIFIER_PREFIX);
}

/**
 * Decode an identifier back into the inputs it was made from.
 *
 * REFUSES rather than guesses. A wrong version, a different build, or anything that is not valid
 * base64url of a valid payload throws — because the one thing this must never do is produce a race
 * that is nearly the one the string named.
 *
 * @param {string} text
 * @param {object} opts
 * @param {object} opts.defaultWorldConfigs the shipped defaults the diff is against
 * @param {string} opts.buildId             this build, to compare with the encoded one
 * @returns {object} the inputs, with `world` reconstructed whole
 */
export function decodeRaceIdentifier(text, { defaultWorldConfigs, buildId } = {}) {
  if (!looksLikeRaceIdentifier(text)) {
    throw new Error('That is not a race identifier.');
  }
  let payload;
  try {
    payload = JSON.parse(fromBase64Url(text.trim().slice(RACE_IDENTIFIER_PREFIX.length)));
  } catch {
    throw new Error('This race identifier is damaged and cannot be read.');
  }
  if (payload?.v !== RACE_IDENTIFIER_VERSION) {
    throw new Error(
      `This identifier was written in format ${payload?.v ?? '?'}, and this build reads format ${RACE_IDENTIFIER_VERSION}.`
    );
  }
  // ★ THE BUILD CHECK IS NOT OPTIONAL. The config travels as a diff against the shipped defaults, so
  // against a different set of defaults the same diff describes a DIFFERENT config. Refusing is the
  // only honest answer: the alternative is a race that claims to be the one in the string.
  if (buildId != null && payload.b != null && payload.b !== buildId) {
    throw new Error(
      'This race was recorded on a different build of RaceArena, so it cannot be reproduced exactly here.'
    );
  }
  if (!Array.isArray(payload.n) || payload.n.length === 0) {
    throw new Error('This race identifier carries no racers.');
  }
  return {
    geometryId: payload.g,
    racerTypeId: payload.t,
    names: payload.n,
    fieldSize: payload.n.length,
    racePlanSeed: payload.s,
    raceActionStage: payload.a,
    targetLaps: 'l' in payload ? payload.l : undefined,
    targetDurationSec: 'd' in payload ? payload.d : undefined,
    racePlanEnabled: payload.p === 1,
    world: {
      schemaVersion: payload.w?.sv ?? null,
      configs: applyDiff(defaultWorldConfigs ?? {}, payload.w?.c ?? {}),
      racerTypeOverrides: payload.w?.o ?? {},
      effectiveRacerTypes: payload.w?.e ?? {},
    },
  };
}
