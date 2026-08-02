// ============================================================
// File:        cameraMarker.js
// Path:        client/src/modules/camera/cameraMarker.js
// Project:     RaceArena
// Description: CAMERA-REPRO-1 — the MARKER: one copyable line that names a single moment of a
//              single race precisely enough to stand in it again.
//
//              Pure and side-effect free. It reads nothing and writes nothing; the caller hands it
//              plain data and gets a plain object plus its one-line encoding back. That is why the
//              browser (RaceScreen) and the replay script (scripts/camera-replay.mjs) can both
//              import it — ONE definition of what a marker is, so a marker can never mean one
//              thing on the emitting side and another on the reading side.
//
//              The line is `RA-MARK1 <compact JSON>`. JSON, not a bespoke key=value grammar,
//              because the replay path must parse it exactly and a hand-rolled parser is one more
//              instrument that can be silently wrong.
// ============================================================

import { countConfigDiffs } from '../parity/configFingerprint.js';
import { WORLD_CONFIG_KEYS } from '../raceConfigWorld.js';

/** Token that opens every marker line. Version it — a future field change gets RA-MARK2. */
export const MARKER_PREFIX = 'RA-MARK1';

/**
 * Longest marker line we will emit with the roster included. Above this the racer NAMES are
 * dropped (everything else always survives) and `race.namesOmitted` is set, so a 200-racer field
 * cannot silently produce a line the owner's terminal mangles.
 */
export const MARKER_MAX_CHARS = 4000;

const r3 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1e3) / 1e3 : null);
const r6 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : null);

/**
 * The off-default config, key by key WITH VALUES — not just the count the HUD badge shows.
 * A hash says "his settings are not yours"; this says WHICH, so the replay can rebuild his world
 * from the shipped defaults without him exporting anything.
 *
 * Reuses countConfigDiffs (the same comparison the fingerprint badge runs) rather than
 * re-implementing the compare — a second diff definition is how the two would drift apart.
 *
 * @param {object} currentWorld  the 7 loaded config blocks (see WORLD_CONFIG_KEYS)
 * @param {object} defaultsWorld the 7 shipped default blocks
 * @returns {object} { '<block>': { '<key>': value, … }, … } — empty object when all defaults
 */
export function configDiffWithValues(currentWorld, defaultsWorld) {
  const { keys } = countConfigDiffs(currentWorld, defaultsWorld, WORLD_CONFIG_KEYS);
  const out = {};
  for (const path of keys) {
    const dot = path.indexOf('.');
    const block = path.slice(0, dot);
    const key = path.slice(dot + 1);
    if (!out[block]) out[block] = {};
    // undefined would vanish through JSON; null records "this key is absent in his config".
    out[block][key] = currentWorld?.[block]?.[key] ?? null;
  }
  return out;
}

/**
 * Rebuild a config world from the shipped defaults plus a marker's diff. The inverse of
 * configDiffWithValues: applyConfigDiff(defaults, configDiffWithValues(cur, defaults)) reproduces
 * `cur` for every key the diff names. Returns fresh objects; neither input is mutated.
 *
 * @param {object} defaultsWorld the 7 shipped default blocks
 * @param {object} diff          a marker's cfg.diff
 * @returns {object} the reconstructed world
 */
export function applyConfigDiff(defaultsWorld, diff) {
  const out = {};
  for (const block of WORLD_CONFIG_KEYS) {
    out[block] = { ...(defaultsWorld?.[block] ?? {}) };
  }
  for (const block of Object.keys(diff ?? {})) {
    if (!out[block]) out[block] = {};
    for (const [key, value] of Object.entries(diff[block] ?? {})) {
      if (value === null) delete out[block][key];
      else out[block][key] = value;
    }
  }
  return out;
}

/**
 * Assemble a marker from live race + camera data. Pure: every input is passed in.
 *
 * Every field earns its place by being needed to STAND IN the moment — see the report for the
 * per-field justification. Nothing here is decorative except `at` and `track`, which exist so the
 * owner can recognise his own marker in a chat log.
 *
 * @param {object} p
 * @param {object} p.raceData     the sessionStorage activeRace payload
 * @param {object} p.raceState    the live physics state (g.current)
 * @param {object} p.shot         camera values AS RENDERED this frame
 * @param {object} p.cfg          { fingerprint, diff, racerTypeOverrides }
 * @param {number} p.cameraSeed   the camera RNG seed drawn at race start
 * @param {number} p.physicsTs    deterministic race clock in ms — THE replay anchor
 * @param {number} p.camMs        camera wall clock since race start in ms
 * @param {object} p.logs         { frame: boolean, detour: boolean }
 * @param {number} p.frameLogIdx  frame-log frame index, or null when the frame log is off
 * @param {string} p.build        short commit of the running bundle
 * @param {string} p.at           ISO timestamp (human context only)
 * @returns {object} the marker
 */
export function buildCameraMarker(p) {
  const rd = p.raceData ?? {};
  const st = p.raceState ?? {};
  const racers = Array.isArray(st.racers) ? st.racers : [];
  // The WITNESS: the replay is only standing in the same race if it reproduces these. Leader by t
  // (the same ordering the scoreboard and the camera use) plus the whole field's t-sum, which no
  // single-racer coincidence can match.
  let leader = null;
  let tSum = 0;
  for (const r of racers) {
    tSum += typeof r.t === 'number' ? r.t : 0;
    if (!leader || r.t > leader.t) leader = r;
  }

  const marker = {
    v: 1,
    at: p.at ?? null,
    build: p.build ?? null,
    race: {
      geo: rd.geometryId ?? null,
      track: rd.trackName ?? null,
      n: racers.length,
      type: rd.racerTypeId ?? null,
      laps: rd.targetLaps ?? null,
      durSec: rd.targetDurationSec ?? null,
      ww: rd.worldWidth ?? null,
      wh: rd.worldHeight ?? null,
      // seed 0 means the race drew from an unseeded Math.random and CANNOT be reproduced.
      seed: rd.racePlanSeed ?? 0,
      plan: !!rd.racePlanEnabled,
      sfc: rd.trackSurfaceClasses ?? [],
      names: racers.map((r) => r.name ?? r.id ?? '?'),
    },
    cam: { seed: p.cameraSeed ?? 0 },
    moment: {
      pts: r3(p.physicsTs),
      cms: r3(p.camMs),
      prog: r6(st.raceProgress),
      finishT: r6(st.finishT),
      fi: p.frameLogIdx ?? null,
      log: { frame: !!p.logs?.frame, detour: !!p.logs?.detour },
    },
    shot: {
      st: p.shot?.state ?? null,
      lp: p.shot?.lerpPhase ?? null,
      op: p.shot?.observerPhase ?? null,
      z: r6(p.shot?.zoom),
      ox: r3(p.shot?.offsetX),
      oy: r3(p.shot?.offsetY),
      tz: r6(p.shot?.targetZoom),
      tox: r3(p.shot?.targetOffsetX),
      toy: r3(p.shot?.targetOffsetY),
      ct: r6(p.shot?.camT),
      // The world→screen scales the RENDERER actually used this frame — BOTH axes. Without them a
      // reader has to re-derive the projection to read ox/oy, and a re-derived expectation proves
      // nothing. Two values, not one: a closed track scales X by zoom×bsX and Y by zoom×bsY, and
      // those differ whenever the world is not 16:9. Carrying one and assuming the other is the
      // scale confusion this camera work has already been bitten by once.
      ezx: r6(p.shot?.effZoomX),
      ezy: r6(p.shot?.effZoomY),
      anchor: p.shot?.anchor ?? null,
    },
    world: {
      leader: leader?.name ?? leader?.id ?? null,
      lt: r6(leader?.t),
      lx: r3(leader?.x),
      ly: r3(leader?.y),
      tsum: r6(tSum),
      // Per-racer t, in racer-index order. The leader alone is a weak witness: an authored plan
      // pins the front-runner, so the leader can match to six decimals while the field behind it
      // does not. This vector is what turns "REPRODUCTION FAILED" into "racers 4 and 11 differ".
      tvec: racers.map((r) => (typeof r.t === 'number' ? Math.round(r.t * 1e5) / 1e5 : null)),
    },
    cfg: {
      fp: p.cfg?.fingerprint ?? null,
      diff: p.cfg?.diff ?? {},
      types: p.cfg?.racerTypeOverrides ?? {},
    },
  };
  return marker;
}

/** True when the marked race can be reproduced exactly (i.e. it ran on a seeded physics stream). */
export function isReplayable(marker) {
  return (marker?.race?.seed ?? 0) > 0;
}

/**
 * Encode a marker as THE one line. Guaranteed newline-free, so it survives any copy path.
 *
 * If the line would exceed MARKER_MAX_CHARS it sheds, in this order: the roster NAMES (cosmetic —
 * the replay renames placeholders), then the per-racer t VECTOR (a weaker witness remains in
 * tsum). What is needed to REBUILD the race is never dropped.
 *
 * @param {object} marker
 * @returns {string}
 */
export function formatMarkerLine(marker) {
  const encode = (m) => `${MARKER_PREFIX} ${JSON.stringify(m)}`;
  let line = encode(marker);
  if (line.length > MARKER_MAX_CHARS && marker?.race?.names) {
    marker = {
      ...marker,
      race: { ...marker.race, names: undefined, namesOmitted: marker.race.names.length },
    };
    line = encode(marker);
  }
  if (line.length > MARKER_MAX_CHARS && marker?.world?.tvec) {
    marker = {
      ...marker,
      world: { ...marker.world, tvec: undefined, tvecOmitted: marker.world.tvec.length },
    };
    line = encode(marker);
  }
  return line.replace(/[\r\n]+/g, ' ');
}

/**
 * Parse a marker line back into a marker. Tolerant of what a copy/paste round-trip does to it:
 * leading and trailing whitespace, surrounding quotes, a shell prompt or log prefix before the
 * token. Throws with a readable message rather than returning a half-marker.
 * @param {string} line
 * @returns {object} the marker
 */
export function parseMarkerLine(line) {
  if (typeof line !== 'string' || !line.trim()) throw new Error('marker line is empty');
  const at = line.indexOf(MARKER_PREFIX);
  if (at === -1) throw new Error(`not a marker line — no ${MARKER_PREFIX} token found`);
  const rest = line.slice(at + MARKER_PREFIX.length).trim();
  const start = rest.indexOf('{');
  if (start === -1) throw new Error('marker line carries no JSON payload');
  // Trailing quote/comma from a paste out of a JSON log or a shell — cut back to the last brace.
  const end = rest.lastIndexOf('}');
  let marker;
  try {
    marker = JSON.parse(rest.slice(start, end + 1));
  } catch (e) {
    throw new Error(`marker payload is not valid JSON: ${e.message}`);
  }
  if (marker?.v !== 1) throw new Error(`unsupported marker version: ${marker?.v}`);
  return marker;
}

/**
 * A short human line for the console, next to (not instead of) the copyable one. This is the
 * owner's own eye check that he marked the moment he meant to.
 * @param {object} marker
 * @returns {string}
 */
export function formatMarkerSummary(marker) {
  const m = marker?.moment ?? {};
  const s = marker?.shot ?? {};
  const race = marker?.race ?? {};
  const pct = m.prog != null ? `${Math.round(m.prog * 100)}%` : '?';
  const seed = race.seed > 0 ? `seed ${race.seed}` : 'UNSEEDED (not replayable)';
  return (
    `${race.track ?? '?'} · ${race.n ?? '?'} ${race.type ?? '?'} · ${seed} · ` +
    `t=${((m.pts ?? 0) / 1000).toFixed(2)}s (${pct}) · ${s.st ?? '?'}/${s.lp ?? '?'} ` +
    `zoom=${s.z ?? '?'} off=${s.ox ?? '?'},${s.oy ?? '?'} · leader ${marker?.world?.leader ?? '?'}`
  );
}
