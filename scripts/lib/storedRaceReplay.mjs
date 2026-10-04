// ============================================================
// File:        scripts/lib/storedRaceReplay.mjs
// Path:        scripts/lib/storedRaceReplay.mjs
// Project:     RaceArena — VERIFY-ON-DEMAND-1 (2026-10-04), moved out of HARNESS-WORLD-1's script
//
// WHAT THIS OWNS: racing a STORED race again from the inputs its own record carries, and putting the
// result beside what the record says happened — position by position and millisecond by millisecond.
//
// It was the body of `scripts/diag/replay-stored-race.mjs` until VERIFY-ON-DEMAND-1 needed the same
// engine path on the server (`POST /api/races/:shortKey/verify`). It moved here so that there is ONE
// copy: the diagnostic script and the route both call `replayStoredRace`, and neither re-derives it.
//
// ── WHAT IT USES, AND WHAT IT REFUSES TO GUESS ─────────────────────────────────────────────────
//
// From the stored record: `racePlanSeed`, `fieldSize`, `names` (index-for-index — a racer's NAME is
// physics, `stablePairBit` hashes it), `racerTypeId`, `geometryId`, `targetLaps`, and the
// `worldConfigs` blocks, handed to `buildRace` WHOLE. The Race Action stage is NOT re-applied: the
// browser bakes it into the world before storing, so applying it again would be a silent divergence
// the day the stage stops being the last word.
//
// ★ IT REFUSES RATHER THAN SUBSTITUTES. A record whose track cannot be found, whose lap count
// disagrees with the track record, or whose world is missing a block it would have to invent cannot
// be replayed honestly — `replayStoredRace` throws a `StoredRaceRefusal` naming what is missing, and
// a replay that quietly filled in a default would be exactly the defect it was built to expose.
//
// ── THE TWO DIAGNOSTIC ARMS (both make the replay WRONG on purpose; the route never uses them) ──
//   worldArm "default" — race under DEFAULT_CONFIG_WORLD instead of the record's own world
//   stageArm "<id>"    — apply that Race Action stage on top of the world being raced
// ============================================================

import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  worldForActionStage,
  normalizeRaceActionStage,
  DEFAULT_CONFIG_WORLD,
} from "./raceDriver.mjs";

/** A record that cannot be replayed honestly. The message says what it lacks. */
export class StoredRaceRefusal extends Error {}

// The five blocks `buildRace` actually reads. `frameTimingConfig` and `cameraConfig` are carried by
// the record too, but the frame clock is `runRace`'s own and the camera config is its own parameter,
// so demanding them would refuse a record that can in fact be replayed.
const WORLD_KEYS_READ = [
  "raceDynamicsConfig",
  "raceBehaviorConfig",
  "rowLayoutConfig",
  "baseSpeedConfig",
  "autoScaleConfig",
];

const need = (v, what) => {
  if (v === undefined || v === null) {
    throw new StoredRaceRefusal(
      `the record does not say ${what}. Refusing to substitute a default — a replay that filled ` +
        `this in would be a different race wearing this one's key.`,
    );
  }
  return v;
};

/**
 * Race the stored record again and compare.
 *
 * @param {object} stored  the record, as `GET /api/races/:shortKey` returns it
 * @param {{worldArm?: "stored"|"default", stageArm?: string|null, tracks?: object[]|null}} [arms]
 *   `worldArm`/`stageArm` are diagnostics only. `tracks` is the set of track records to find this
 *   race's track in; omitted, it is read from the repository (`loadTracks`). The server passes its
 *   OWN data directory's records, because an installation's tracks live there and the Docker image
 *   has no repository layout to read them from.
 * @returns {{ key: string, track: string, laps: number, racers: number, worldLabel: string,
 *   posMatch: number, timeMatch: number, n: number, firstDiff: string|null, rows: object[] }}
 */
export function replayStoredRace(
  stored,
  { worldArm = "stored", stageArm = null, tracks = null } = {},
) {
  const geo =
    (tracks ?? loadTracks()).find((g) => g.geometryId === stored.geometryId) ??
    null;
  if (!geo) {
    throw new StoredRaceRefusal(
      `no track record carries geometryId ${stored.geometryId}. The track this race ran on is not ` +
        `in this tree; replaying it on another track would be a different race.`,
    );
  }
  // LAPS ARE A CLOSED-TRACK FACT. An open track has none, and the browser stores none for it
  // (`SetupScreen.jsx`, `targetLaps: trackIsOpen ? undefined : …`), so demanding one refused EVERY
  // open-track race (found by VERIFY-ON-DEMAND-1). Nothing is substituted: an open-track record
  // that DOES claim laps is refused, and a closed-track record without them still is.
  if (!geo.closed) {
    if (stored.targetLaps != null) {
      throw new StoredRaceRefusal(
        `the record says it ran ${stored.targetLaps} laps, but track "${geo.id}" is open and has ` +
          `no laps. That record does not describe a race this track can run.`,
      );
    }
  }
  const laps = geo.closed
    ? need(stored.targetLaps, "how many laps it ran (targetLaps)")
    : null;
  if (geo.closed && geo.defaultLaps !== laps) {
    throw new StoredRaceRefusal(
      `the record ran ${laps} laps but track "${geo.id}" declares defaultLaps=${geo.defaultLaps}. ` +
        `The driver reads the lap count from the track record, so this race cannot be reproduced on ` +
        `this tree without changing that record.`,
    );
  }
  const storedWorld = need(
    stored.worldConfigs,
    "what world it ran (worldConfigs)",
  );
  for (const k of WORLD_KEYS_READ) need(storedWorld[k], `its ${k}`);

  let world = storedWorld;
  let worldLabel = "STORED — the record's own blocks, handed over whole";
  if (worldArm === "default") {
    world = DEFAULT_CONFIG_WORLD;
    worldLabel =
      "★ SABOTAGE ARM: DEFAULT_CONFIG_WORLD — the harness as it was before HARNESS-WORLD-1";
  } else if (worldArm !== "stored") {
    throw new Error(`worldArm must be "stored" or "default", not ${worldArm}`);
  }
  if (stageArm != null) {
    const s = normalizeRaceActionStage(stageArm);
    if (s !== stageArm) {
      throw new Error(
        `stage "${stageArm}" is not a stage id (it would read as "${s}"). Naming a stage that does ` +
          `not exist and silently racing another one is the failure mode.`,
      );
    }
    world = worldForActionStage(s, world);
    worldLabel = `${worldLabel}  +  stage "${s}" APPLIED ON TOP (record says "${stored.raceActionStage}")`;
  }

  // The camera config is never physics, but it is the one he watched, so the stored one is used.
  const cameraConfig =
    world.cameraConfig ??
    storedWorld.cameraConfig ??
    DEFAULT_CONFIG_WORLD.cameraConfig;
  const identity = resolveIdentity({
    racers: need(stored.fieldSize, "how many raced (fieldSize)"),
    raceSeed: need(stored.racePlanSeed, "its seed (racePlanSeed)"),
    racerType: need(stored.racerTypeId, "which racer type ran (racerTypeId)"),
    roster: need(stored.names, "who raced (names)"),
    note: `replay ${stored.shortKey ?? "?"}`,
  });
  const race = buildRace(geo, identity, cameraConfig, world);
  runRace(race, identity, cameraConfig, () => true);

  // ORDER comes from `finishRank` on the replay side, and from the stored `results` array's own order
  // on the record's — that array is written in finishing order, which keeps a TIE (two racers on one
  // millisecond) in the order it was stored rather than letting a re-sort break it either way.
  const replayRows = race.st.racers
    .filter((r) => r.finishRank != null)
    .sort((a, b) => a.finishRank - b.finishRank)
    .map((r) => ({
      name: r.name,
      finishTimeMs: r.finishTimeMs,
      index: r.index,
    }));
  const storedRows = need(stored.results, "its results").map((r) => ({
    name: r.name,
    finishTimeMs: r.finishTimeMs,
    index: r.index,
  }));

  const n = Math.max(storedRows.length, replayRows.length);
  let firstDiff = null;
  let posMatch = 0;
  let timeMatch = 0;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const a = storedRows[i] ?? null;
    const b = replayRows[i] ?? null;
    const samePos = !!a && !!b && a.name === b.name;
    const sameTime = !!a && !!b && a.finishTimeMs === b.finishTimeMs;
    if (samePos) posMatch++;
    if (sameTime) timeMatch++;
    if (firstDiff === null && !samePos) {
      firstDiff = `position ${i + 1}: stored "${a?.name}", replay "${b?.name}"`;
    }
    if (firstDiff === null && !sameTime) {
      firstDiff =
        `finishTimeMs at position ${i + 1} (${a?.name}): stored ${a?.finishTimeMs}, ` +
        `replay ${b?.finishTimeMs}`;
    }
    rows.push({ pos: i + 1, stored: a, replay: b, samePos, sameTime });
  }
  return {
    key: stored.shortKey ?? "(no key)",
    track: geo.id,
    laps,
    racers: identity.racers,
    worldLabel,
    posMatch,
    timeMatch,
    n,
    firstDiff,
    rows,
  };
}
