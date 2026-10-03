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
// VERIFY-ON-DEMAND-1 (2026-10-04): the engine path lives in ONE place now, shared with the server's
// `POST /api/races/:shortKey/verify`. This script keeps its command line and its printing.
import { replayStoredRace } from "../lib/storedRaceReplay.mjs";

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
    "replay-stored-race: --race=<stored-race.json> is required (the payload of GET /api/races/<key>).",
  );
  process.exit(2);
}

const stored = JSON.parse(readFileSync(RACE_FILE, "utf8"));
const {
  track,
  laps,
  racers,
  worldLabel,
  posMatch,
  timeMatch,
  n,
  firstDiff,
  rows,
} = replayStoredRace(stored, { worldArm: WORLD_ARM, stageArm: STAGE_ARM });

const key = stored.shortKey ?? "(no key)";
console.log(
  `REPLAY OF ${key} — ${track} · seed ${stored.racePlanSeed} · ${racers} racers · ` +
    `${stored.racerTypeId} · ${laps} laps · stage "${stored.raceActionStage}" · build ${stored.buildId}`,
);
console.log(`world: ${worldLabel}`);
console.log("");
console.log("| # | STORED | ms | REPLAY | ms | pos | time |");
console.log("|---|---|---|---|---|---|---|");
for (const r of rows.slice(0, LIMIT)) {
  console.log(
    `| ${r.pos} | ${r.stored?.name ?? "—"} | ${r.stored?.finishTimeMs ?? "—"} | ` +
      `${r.replay?.name ?? "—"} | ${r.replay?.finishTimeMs ?? "—"} | ` +
      `${r.samePos ? "=" : "DIFF"} | ${r.sameTime ? "=" : "DIFF"} |`,
  );
}
console.log("");
console.log(`POSITIONS IDENTICAL:     ${posMatch} of ${n}`);
console.log(`FINISH TIMES IDENTICAL:  ${timeMatch} of ${n}`);
console.log(
  firstDiff === null
    ? "★ IDENTICAL — every position and every finishing time in milliseconds."
    : `★ FIRST FIELD THAT DIFFERS: ${firstDiff}`,
);

if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    JSON.stringify(
      {
        key,
        track,
        worldArm: WORLD_ARM,
        stageArm: STAGE_ARM,
        posMatch,
        timeMatch,
        n,
        firstDiff,
        rows,
      },
      null,
      2,
    ),
  );
}
process.exitCode = firstDiff === null ? 0 : 1;
