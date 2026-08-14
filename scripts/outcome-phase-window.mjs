// ============================================================
// File:        scripts/outcome-phase-window.mjs
// Project:     RaceArena — OUTCOME-PHASE-75
//
// WHEN DOES THE DECISIVE PHASE BEGIN, AND HOW MUCH RACE IS LEFT WHEN IT DOES?
//
// `outcomePhaseThreshold` is a leader-PROGRESS number, and the owner's question was a TIME question:
// from what point should the camera treat the race as its decisive phase? Those are not the same
// axis, and the conversion is not linear — the leader does not cover progress at a constant rate,
// so moving the threshold from 0.65 to 0.75 does not move the moment by 10 % of the race. This tool
// does the conversion by running the race.
//
// WHAT IT MEASURES, per track, per threshold:
//   - the race time at which the leader's progress first exceeds the threshold — when the decisive
//     phase BEGINS;
//   - the time from there until the winner crosses — the WINDOW inside which the COMEBACK shot can
//     be chosen at all. That window is the thing a viewer feels: it is how long the camera is
//     allowed to leave the leader for a climb.
//
// WHAT IT IS NOT. It does not run the CameraDirector and makes no claim about which shot actually
// wins the weighted contest — `comebackWeight` still loses to `battleWeight` during PULK, and that
// is a separate knob (docs/BACKLOG.md). This answers only "how much room does the gate leave", not
// "what does the camera choose inside it". The camera fingerprint is the instrument for the second.
//
// READ-ONLY. It builds a race with the shared driver and steps it; it writes nothing and edits
// nothing. The threshold is passed in, never read from a stored config, so the two arms differ by
// exactly the number under test.
//
// Usage:
//   node scripts/outcome-phase-window.mjs
//   node scripts/outcome-phase-window.mjs --tracks=mountainstreet,city-circuit --at=0.65,0.75
// ============================================================

const started = Date.now();

import { resolveIdentity, loadTracks, buildRace } from "./lib/raceDriver.mjs";
import { DEFAULT_CAMERA_CONFIG } from "../client/src/modules/storage/defaults.js";
import { stepRacePhysics, FIXED_DT } from "../client/src/modules/raceCore.js";

const arg = (k, d) => {
  const p = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return p ? p.slice(k.length + 3) : d;
};

const TRACKS = (arg("tracks", "mountainstreet,city-circuit") || "")
  .split(",")
  .filter(Boolean);
const AT = (arg("at", "0.65,0.75") || "")
  .split(",")
  .map(Number)
  .filter(Number.isFinite);
const SEED = Number(arg("seed", "5601"));
const RACERS = Number(arg("racers", "40"));
const SECONDS = Number(arg("seconds", "60"));
const MAX_STEPS = Number(arg("maxSteps", "12000"));

if (!TRACKS.length || !AT.length) {
  console.error("FAIL: --tracks and --at must each name at least one value.");
  process.exit(2);
}

/**
 * Step one race to the finish, sampling the leader's progress every step.
 *
 * Progress is `leader.t / finishT`, the SAME expression CameraDirector caches as
 * `_diagLeaderProgress` and compares against the threshold — so the crossing this finds is the
 * crossing the director would see, not a re-derivation of it.
 */
function traceLeaderProgress(geo) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: SEED,
    racerType: "track-default",
    seconds: SECONDS,
    note: "OUTCOME-PHASE-75 window",
  });
  const race = buildRace(geo, identity, structuredClone(DEFAULT_CAMERA_CONFIG));
  const { st, raceCfg } = race;
  const finishT = st.finishT ?? 1;
  const progress = [];
  let winnerStep = -1;
  for (let i = 0; i < MAX_STEPS; i++) {
    stepRacePhysics(st, raceCfg);
    let maxT = 0;
    for (const r of st.racers) if (r.t > maxT) maxT = r.t;
    progress.push(maxT / finishT);
    if (winnerStep < 0 && st.finishedCount > 0) {
      winnerStep = i;
      break; // the window closes at the FIRST finish — after that the outcome is decided
    }
  }
  return { progress, winnerStep, racerType: race.racerTypeId };
}

const ms = (steps) => steps * FIXED_DT;
const fmt = (v) => `${(v / 1000).toFixed(1)}s`;

console.log(
  `OUTCOME-PHASE-75 — when the decisive phase begins (seed=${SEED}, racers=${RACERS}, ${SECONDS}s target)\n`,
);
console.log(
  "track            racerType     winner at   | threshold  begins at   % of race   WINDOW to the finish",
);
console.log("-".repeat(108));

for (const name of TRACKS) {
  const geo = loadTracks({ only: name })[0];
  if (!geo) {
    console.error(`FAIL: no such track: ${name}`);
    process.exit(2);
  }
  const { progress, winnerStep, racerType } = traceLeaderProgress(geo);
  if (winnerStep < 0) {
    console.error(`FAIL: ${name} did not finish within ${MAX_STEPS} steps.`);
    process.exit(2);
  }
  const winMs = ms(winnerStep);
  let first = true;
  for (const threshold of AT) {
    const idx = progress.findIndex((p) => p > threshold);
    const head = first
      ? `${name.padEnd(16)} ${racerType.padEnd(13)} ${fmt(winMs).padStart(8)}   |`
      : `${" ".repeat(16)} ${" ".repeat(13)} ${" ".repeat(8)}   |`;
    first = false;
    if (idx < 0) {
      console.log(`${head} ${String(threshold).padEnd(10)} never reached`);
      continue;
    }
    const beginMs = ms(idx);
    const windowMs = winMs - beginMs;
    console.log(
      `${head} ${String(threshold).padEnd(10)} ${fmt(beginMs).padStart(8)}   ` +
        `${((100 * beginMs) / winMs).toFixed(1).padStart(7)}%   ` +
        `${fmt(windowMs).padStart(8)}  (${((100 * windowMs) / winMs).toFixed(1)}% of the race)`,
    );
  }
}

console.log(
  `\nThe WINDOW column is what moves: it is how long the COMEBACK gate is open before the race is decided.`,
);
console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
