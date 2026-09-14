// ============================================================
// File:        scripts/diag/replay-stored-race.mjs
// Path:        scripts/diag/replay-stored-race.mjs
// Project:     RaceArena — HARNESS-WORLD-1
//
// WHAT THIS OWNS: racing a race the OWNER actually finished, from the inputs his own stored record
// carries, and putting the result beside what that record says happened — position by position and
// millisecond by millisecond.
//
// ── ★ WHY IT EXISTS ────────────────────────────────────────────────────────────────────────────
//
// Until HARNESS-WORLD-1 no instrument in this repository could race any world but the shipped
// defaults: `buildRace` hardcoded `const W = DEFAULT_CONFIG_WORLD`. Measured 2026-09-13
// (STORED-RACE-PARITY-1) on the owner's stored race `QN3HDP`: he raced the `wild` Race Action stage,
// the harness raced the effective `quiet`, and with the SAME seed, roster, track and build the two
// agreed on 10 of 40 finishing positions. A harness that cannot be told the world cannot check
// itself against the product, and every number it takes describes a world nobody watches.
//
// This is the check that was missing. It is not a fingerprint and not a gate: it is the one place
// that can answer "does the engine still reproduce a race the owner has on his screen".
//
// ── WHAT IT USES, AND WHAT IT REFUSES TO GUESS ─────────────────────────────────────────────────
//
// From the stored record: `racePlanSeed`, `fieldSize`, `names` (index-for-index — a racer's NAME is
// physics, `stablePairBit` hashes it), `racerTypeId`, `geometryId`, `targetLaps`, and the
// `worldConfigs` blocks, handed to `buildRace` WHOLE.
//
// ★ THE STAGE IS NOT RE-APPLIED, and that is deliberate. The browser bakes it into the world BEFORE
// storing (`exportRaceConfig.buildWorldConfig`), so `worldConfigs.raceDynamicsConfig` already holds
// the stage's two values — on `QN3HDP`, `pulkChallengerBoost` 0.12 and `pulkLeaderBrake` 0.15, which
// are `wild`'s. Applying it a second time would be a no-op today and a silent divergence the day the
// stage stops being the last word. `--stage=` exists for the opposite question (see below).
//
// ★ IT REFUSES RATHER THAN SUBSTITUTES. A record whose track cannot be found, whose lap count
// disagrees with the track record, or whose world is missing a block it would have to invent, is a
// record this instrument cannot honestly replay — and a replay that quietly filled in a default
// would be exactly the defect it was built to expose.
//
// ── THE TWO DIAGNOSTIC ARMS (both make the replay WRONG on purpose) ────────────────────────────
//
//   --world=default   race the stored record under DEFAULT_CONFIG_WORLD — i.e. the harness as it was
//                     before this piece. This is what "10 of 40" was.
//   --stage=<id>      apply stage <id> on top of the world this arm is racing, through
//                     `worldForActionStage`. Combined with `--world=default` it asks the cleanest
//                     version of the question: the SHIPPED world at one named stage. At the record's
//                     own stage that must reproduce it exactly on an untuned install; at any other
//                     stage it must not.
//
// Neither arm changes any code. They exist so the claim "the world is what made the difference" can
// be demonstrated rather than asserted.
//
// USAGE
//   node scripts/diag/replay-stored-race.mjs --race=<stored-race.json> [--json=<out>] [--limit=40]
//                                            [--world=stored|default] [--stage=quiet|medium|wild]
//
// The input is the payload of `GET /api/races/<shortKey>`, saved to a file. This instrument never
// talks to the store: reading the owner's races is an authenticated act performed by whoever runs
// it, and an instrument that carried a credential would be a second, worse door.
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  worldForActionStage,
  normalizeRaceActionStage,
  DEFAULT_CONFIG_WORLD,
} from "../lib/raceDriver.mjs";

const argv = process.argv.slice(2);
const argVal = (k, d = null) => {
  const p = argv.find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const RACE_FILE = argVal("race");
const JSON_OUT = argVal("json");
const LIMIT = Number(argVal("limit", "40"));
const WORLD_ARM = argVal("world", "stored");
const STAGE_ARM = argVal("stage");

if (!RACE_FILE) {
  console.error(
    "replay-stored-race: --race=<stored-race.json> is required (the payload of GET /api/races/<key>)."
  );
  process.exit(2);
}

const stored = JSON.parse(readFileSync(RACE_FILE, "utf8"));

// ── The inputs, read from the record and never guessed ────────────────────────────────────────
const need = (v, what) => {
  if (v === undefined || v === null) {
    throw new Error(
      `replay-stored-race: the record does not say ${what}. Refusing to substitute a default — a ` +
        `replay that filled this in would be a different race wearing this one's key.`
    );
  }
  return v;
};

const geos = loadTracks();
const geo = geos.find((g) => g.geometryId === stored.geometryId) ?? null;
if (!geo) {
  throw new Error(
    `replay-stored-race: no track record carries geometryId ${stored.geometryId}. The track this ` +
      `race ran on is not in this tree; replaying it on another track would be a different race.`
  );
}
const laps = need(stored.targetLaps, "how many laps it ran (targetLaps)");
if (geo.defaultLaps !== laps) {
  throw new Error(
    `replay-stored-race: the record ran ${laps} laps but track "${geo.id}" declares ` +
      `defaultLaps=${geo.defaultLaps}. The driver reads the lap count from the track record, so this ` +
      `race cannot be reproduced on this tree without changing that record.`
  );
}

// The five blocks `buildRace` actually reads. `frameTimingConfig` and `cameraConfig` are carried by
// the record too, but the frame clock is `runRace`'s own and the camera config is its own parameter
// — so they are NOT checked for here, because demanding a block nobody reads would refuse a record
// this instrument could in fact replay.
const WORLD_KEYS_READ = [
  "raceDynamicsConfig",
  "raceBehaviorConfig",
  "rowLayoutConfig",
  "baseSpeedConfig",
  "autoScaleConfig",
];
const storedWorld = need(stored.worldConfigs, "what world it ran (worldConfigs)");
for (const k of WORLD_KEYS_READ) need(storedWorld[k], `its ${k}`);

// ── Which world this arm races ────────────────────────────────────────────────────────────────
let world = storedWorld;
let worldLabel = "STORED — the record's own blocks, handed over whole";
if (WORLD_ARM === "default") {
  world = DEFAULT_CONFIG_WORLD;
  worldLabel = "★ SABOTAGE ARM: DEFAULT_CONFIG_WORLD — the harness as it was before HARNESS-WORLD-1";
} else if (WORLD_ARM !== "stored") {
  throw new Error(`replay-stored-race: --world must be "stored" or "default", not ${WORLD_ARM}`);
}
if (STAGE_ARM != null) {
  const s = normalizeRaceActionStage(STAGE_ARM);
  if (s !== STAGE_ARM) {
    throw new Error(
      `replay-stored-race: --stage=${STAGE_ARM} is not a stage id (it would read as "${s}"). ` +
        `Naming a stage that does not exist and silently racing another one is the failure mode.`
    );
  }
  world = worldForActionStage(s, world);
  worldLabel = `${worldLabel}  +  stage "${s}" APPLIED ON TOP (record says "${stored.raceActionStage}")`;
}

// The camera config is its own parameter and is never physics — but it is the one he watched, so the
// stored one is used when the record carries it. That the finishing order does not depend on it is
// not an assumption here: the `--world=default` arm keeps this same camera and diverges anyway.
const cameraConfig =
  world.cameraConfig ?? storedWorld.cameraConfig ?? DEFAULT_CONFIG_WORLD.cameraConfig;

const identity = resolveIdentity({
  racers: need(stored.fieldSize, "how many raced (fieldSize)"),
  raceSeed: need(stored.racePlanSeed, "its seed (racePlanSeed)"),
  racerType: need(stored.racerTypeId, "which racer type ran (racerTypeId)"),
  roster: need(stored.names, "who raced (names)"),
  note: `replay ${stored.shortKey ?? "?"}`,
});

const race = buildRace(geo, identity, cameraConfig, world);
runRace(race, identity, cameraConfig, () => true);

// ── The comparison ────────────────────────────────────────────────────────────────────────────
//
// ORDER COMES FROM `finishRank` on the replay side (raceCore.js:705), and from the stored `results`
// array's own order on his — that array is written in finishing order and its times are monotonic,
// which matters because `QN3HDP` carries a TIE (two racers at 83 088 ms) that a re-sort by time
// would be free to break either way.
const replayRows = race.st.racers
  .filter((r) => r.finishRank != null)
  .sort((a, b) => a.finishRank - b.finishRank)
  .map((r) => ({ name: r.name, finishTimeMs: r.finishTimeMs, index: r.index }));
const storedRows = stored.results.map((r) => ({
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

const key = stored.shortKey ?? "(no key)";
console.log(
  `REPLAY OF ${key} — ${geo.id} · seed ${stored.racePlanSeed} · ${identity.racers} racers · ` +
    `${stored.racerTypeId} · ${laps} laps · stage "${stored.raceActionStage}" · build ${stored.buildId}`
);
console.log(`world: ${worldLabel}`);
console.log("");
console.log("| # | STORED | ms | REPLAY | ms | pos | time |");
console.log("|---|---|---|---|---|---|---|");
for (const r of rows.slice(0, LIMIT)) {
  console.log(
    `| ${r.pos} | ${r.stored?.name ?? "—"} | ${r.stored?.finishTimeMs ?? "—"} | ` +
      `${r.replay?.name ?? "—"} | ${r.replay?.finishTimeMs ?? "—"} | ` +
      `${r.samePos ? "=" : "DIFF"} | ${r.sameTime ? "=" : "DIFF"} |`
  );
}
console.log("");
console.log(`POSITIONS IDENTICAL:     ${posMatch} of ${n}`);
console.log(`FINISH TIMES IDENTICAL:  ${timeMatch} of ${n}`);
console.log(
  firstDiff === null
    ? "★ IDENTICAL — every position and every finishing time in milliseconds."
    : `★ FIRST FIELD THAT DIFFERS: ${firstDiff}`
);

if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    JSON.stringify(
      {
        key,
        track: geo.id,
        worldArm: WORLD_ARM,
        stageArm: STAGE_ARM,
        posMatch,
        timeMatch,
        n,
        firstDiff,
        rows,
      },
      null,
      2
    )
  );
}
process.exitCode = firstDiff === null ? 0 : 1;
