// ============================================================
// File:        scripts/phys-bench.mjs
// Project:     RaceArena — PHYS-BENCH-1
//
// THE QUESTION: what does ONE physics step cost, and what moves that cost?
//
// It exists because the owner has two browser recordings — 3 ms and 7.7 ms per step — taken from
// different moments of different races. Two numbers measured under two unknown conditions are not a
// comparison; they are a confound. This harness fixes every condition that is not the one under
// test, so a difference it reports is a difference in the thing named.
//
// WHAT IT DELIBERATELY DOES NOT DO. It does not touch the engine. Not one file under
// `scripts/engine-reach.mjs`'s closure is edited by this block, and none is imported for any purpose
// other than running the race the game runs. A diagnostic that instruments the engine measures a
// different engine — the number would be honest about a race nobody plays. `stepRacePhysics` is
// timed FROM THE OUTSIDE, which is the only place a timer can stand without changing the thing.
//
// HEADLESS. No camera update, no rendering, no label layout. `buildRace` constructs a
// `CameraDirector` because it is the shared boot path (ONE-DRIVER-1) and this harness will not fork
// a second way to start a race — but that director is never updated, and construction happens before
// the first timer starts. What is timed is exactly `stepRacePhysics(st, cfg)` and nothing else.
//
// MEDIAN AND p90, NEVER THE MEAN. One GC pause in three thousand steps moves a mean and moves no
// percentile. The mean is not reported at all, so it cannot be quoted.
//
// A RACER'S NAME IS PHYSICS. `stablePairBit` hashes `r.name` into the avoidance tie-break, so
// `--roster=long` at the same seed is a DIFFERENT RACE with a different density, not the same race
// with longer strings. This harness therefore measures what a roster's RACE costs. It cannot measure
// "the cost of the letters" and does not claim to. Racers built by `createRaceFromIdentity` carry no
// name at all — the browser assigns them afterwards, and so does this script, by the same rule
// (`ROSTER[index % ROSTER.length]`) the label harnesses use.
//
// THE WARM-UP RUNS ON A THROWAWAY RACE. V8 needs a few hundred steps before `stepRacePhysics` is
// optimised, and warming up on the measured race would consume exactly the bunched opening that Q3
// is about. So a second race with identical parameters is built, stepped, and discarded.
//
// Usage:
//   node scripts/phys-bench.mjs --track=searound --seed=5601 --racers=100 --roster=current
//   node scripts/phys-bench.mjs --racers=30 --steps=3000 --out=reports/perf/phys-bench-1/x.json
// ============================================================

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
} from "./lib/raceDriver.mjs";
import { DEFAULT_CAMERA_CONFIG } from "../client/src/modules/storage/defaults.js";
import { stepRacePhysics, FIXED_DT } from "../client/src/modules/raceCore.js";
import {
  QUICK_TEST_NAME_SETS,
  resolveNameSet,
} from "../client/src/modules/racerNames.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const TRACK = arg("track", "searound");
const SEED = Number(arg("seed", "5601"));
const RACERS = Number(arg("racers", "40"));
const STEPS = Number(arg("steps", "3000"));
const WARMUP = Number(arg("warmup", "300"));
const SECONDS = Number(arg("seconds", "60"));
// `none` is a real arm, not a missing value: it is the race `createRaceFromIdentity` produces on its
// own, where `stablePairBit` falls back to the racer INDEX. Every browser race has names, so `none`
// is not the shipped race — it is the control that says how much of a roster difference is the
// tie-break changing hands at all.
const ROSTER = arg("roster", "current");
const LABEL = arg("label", "");
const OUT = arg("out", "");
const QUIET = process.argv.includes("--quiet");

if (ROSTER !== "none" && !Object.hasOwn(QUICK_TEST_NAME_SETS, ROSTER)) {
  console.error(
    `FAIL: unknown roster "${ROSTER}". Known: none, ${Object.keys(QUICK_TEST_NAME_SETS).join(", ")}.\n` +
      "       Refusing rather than silently falling back — `resolveNameSet` resolves anything\n" +
      "       unrecognised to the DEFAULT roster, which would report a typo's run as a real arm.",
  );
  process.exit(2);
}
if (!(STEPS > 0) || !(RACERS > 0)) {
  console.error("FAIL: --steps and --racers must both be positive.");
  process.exit(2);
}

/** Build one race under the fixed identity, with names applied. Untimed. */
function makeRace(geo) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: SEED,
    racerType: "track-default",
    seconds: SECONDS,
    note: `PHYS-BENCH-1 roster=${ROSTER}`,
  });
  const cameraConfig = structuredClone(DEFAULT_CAMERA_CONFIG);
  const race = buildRace(geo, identity, cameraConfig);
  if (ROSTER !== "none") {
    const names = resolveNameSet(ROSTER);
    for (const r of race.st.racers) r.name = names[r.index % names.length];
  }
  return { race, identity };
}

const geo = loadTracks({ only: TRACK })[0];
if (!geo) {
  console.error(`FAIL: no such track: ${TRACK}`);
  process.exit(2);
}

// ── WARM-UP, on a race that is then thrown away. See the header. ──
{
  const { race } = makeRace(geo);
  for (let i = 0; i < WARMUP; i++) stepRacePhysics(race.st, race.raceCfg);
}

// ── THE MEASUREMENT ──
const { race, identity } = makeRace(geo);
const { st, raceCfg } = race;
const ns = new Float64Array(STEPS);
let firstFinishStep = -1;
let stepped = 0;
for (let i = 0; i < STEPS; i++) {
  const t0 = process.hrtime.bigint();
  stepRacePhysics(st, raceCfg);
  ns[i] = Number(process.hrtime.bigint() - t0);
  stepped++;
  if (firstFinishStep < 0 && st.finishedCount > 0) firstFinishStep = i;
  // A finished field costs nothing to step, and averaging that into a percentile would understate
  // every number here. Stop, and report how far we got — the caller compares `stepped`, not STEPS.
  if (st.finishedCount >= RACERS) break;
}

const msOf = (v) => v / 1e6;
const pct = (sorted, p) =>
  sorted[
    Math.min(sorted.length - 1, Math.floor(((sorted.length - 1) * p) / 100))
  ];

/** Median / p90 over a slice of the raw per-step nanosecond samples, in ms. */
function summarize(from, to) {
  const slice = Array.from(ns.slice(from, to)).sort((a, b) => a - b);
  if (slice.length === 0) return { n: 0, p50: 0, p90: 0, min: 0, max: 0 };
  return {
    n: slice.length,
    p50: +msOf(pct(slice, 50)).toFixed(4),
    p90: +msOf(pct(slice, 90)).toFixed(4),
    min: +msOf(slice[0]).toFixed(4),
    max: +msOf(slice[slice.length - 1]).toFixed(4),
  };
}

const fifth = Math.max(1, Math.floor(stepped / 5));
const overall = summarize(0, stepped);
const firstFifth = summarize(0, fifth);
const lastFifth = summarize(stepped - fifth, stepped);

const result = {
  tool: "phys-bench.mjs",
  version: "PHYS-BENCH-1",
  label: LABEL,
  identity: {
    track: TRACK,
    isOpen: race.shape.isOpen,
    racerType: race.racerTypeId,
    raceSeed: SEED,
    racers: RACERS,
    seconds: SECONDS,
    roster: ROSTER,
    rosterSize: ROSTER === "none" ? 0 : resolveNameSet(ROSTER).length,
    fixedDtMs: FIXED_DT,
    steps: STEPS,
    warmup: WARMUP,
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
  },
  run: {
    stepped,
    finishedCount: st.finishedCount,
    firstFinishStep,
    physicsTsMs: st.physicsTs,
  },
  overall,
  firstFifth,
  lastFifth,
  // Every raw sample, in NANOSECONDS, in step order. This is the point of the file: a later question
  // about a different percentile, a different window or a different outlier rule is answered by
  // recomputing from here rather than by measuring the machine again on a different day.
  rawStepNs: Array.from(ns.slice(0, stepped)).map((v) => Math.round(v)),
};

if (OUT) {
  const path = isAbsolute(OUT) ? OUT : join(ROOT, OUT);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(result, null, 1));
}

if (!QUIET) {
  console.log(formatIdentity(identity));
  console.log(
    `track=${TRACK}(${race.shape.isOpen ? "open" : "closed"}/${race.racerTypeId}) ` +
      `roster=${ROSTER} steps=${stepped}/${STEPS} finished=${st.finishedCount}`,
  );
  console.log(
    `  OVERALL      p50=${overall.p50.toFixed(4)} ms  p90=${overall.p90.toFixed(4)} ms  (n=${overall.n})`,
  );
  console.log(
    `  FIRST FIFTH  p50=${firstFifth.p50.toFixed(4)} ms  p90=${firstFifth.p90.toFixed(4)} ms  (bunched)`,
  );
  console.log(
    `  LAST FIFTH   p50=${lastFifth.p50.toFixed(4)} ms  p90=${lastFifth.p90.toFixed(4)} ms  (spread)`,
  );
  if (OUT) console.log(`  raw -> ${OUT}`);
}

// A machine-readable last line, so the matrix runner parses ONE token rather than the prose above.
console.log(
  `[phys-bench ${JSON.stringify({
    label: LABEL,
    racers: RACERS,
    roster: ROSTER,
    stepped,
    p50: overall.p50,
    p90: overall.p90,
    firstFifthP50: firstFifth.p50,
    lastFifthP50: lastFifth.p50,
  })}]`,
);
