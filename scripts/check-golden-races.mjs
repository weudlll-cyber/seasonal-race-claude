// ============================================================
// File:        scripts/check-golden-races.mjs
// Project:     RaceArena — GOLDEN-RACES-1
//
// TWO FIXED RACES WITH KNOWN RESULTS. If a change moved either outcome, this says WHICH RACER moved
// and BY HOW MUCH.
//
// ── ★ WHAT IT OWNS ──────────────────────────────────────────────────────────────────────────────
// Running the two pinned races and comparing each result against the recorded expectation. That is
// all. It does not run a race loop of its own (`scripts/golden/goldenRace.mjs` reuses the real
// engine core), and it does not run the sim, a browser, or anything that draws.
//
// ── ★ WHAT IT DELIBERATELY DOES NOT DO: WRITE ───────────────────────────────────────────────────
// This command can only ever REPORT. It has no flag that updates an expectation and must never grow
// one. A red golden race is a FINDING, and the default reading of a finding is "the change is
// wrong", not "the fixture is stale". Re-recording is a separate command
// (`scripts/record-golden-races.mjs`), it refuses unless it is told the change was intended, and
// **it needs the owner's word per occurrence** — this piece grants no standing permission.
//
// A check that can bless what it is checking is not a check.
//
// ── ★ WHY THE EXPECTATION IS A RESULT LIST AND NOT A HASH ───────────────────────────────────────
// A hash answers "something moved" and then leaves a person with nothing. The recorded fixture is
// the finishing order and each racer's finishing time, so a failure can say
// "Nitro finished 2nd at 36.624 s, now 3rd at 36.688 s" — which is the difference between a
// diagnosis and an alarm. The message names the FIRST racer that differs, in finishing order, so
// the report is stable rather than a wall of every downstream shift.
//
// ── ★ THE DECLARATION, AND WHY IT IS DERIVED ────────────────────────────────────────────────────
// `reach: ["client/src/modules/raceCore.js"]` is not a list of files — it is an ENTRY POINT, and
// `scripts/lib/routing.mjs:383` expands it through `engine-reach.mjs`'s import closure
// (`closureOf`). So the declared set IS whatever can reach the race engine today, computed on every
// run, and a new module that the engine starts importing joins it without anybody remembering.
//
// A hand-written list would be a second home for that fact, and this project has paid for that
// shape more than once — most recently in the instrument this check exists beside
// (`fingerprint-default.mjs` carried a literal table of ten track/racer pairs and raced a snail on a
// track the product had raced with a beetle for eight days).
//
// The cost of being narrow and the cost of being wide are not symmetric, and the declaration is
// widened on purpose: a documentation, server, history or interface change does NOT select this,
// because none of them is inside `raceCore.js`'s closure — while anything that IS reaches it
// indirectly and selects it.
// ============================================================

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runGoldenRace } from "./golden/goldenRace.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const GUARD = {
  id: "golden-races",
  covers:
    "two fixed races with recorded outcomes: the finishing order and every finishing time, run through the real engine core",
  blind: [
    "the SHIPPED world. Every input is pinned in the fixture, so a change to defaults.js, to a track seed or to a racer's shipped values cannot move these races — that is what `fingerprint-default.mjs` covers, and neither instrument replaces the other",
    "everything the CAMERA decides and everything DRAWN — these races have no picture at all",
    "any track, racer, field size, seed, stage or duration other than the two combinations recorded. Two races cannot cover a game; what they cover is that THESE two did not move",
    "timing and frame pacing: it compares outcomes, not how long they took to compute",
  ],
  dirs: [],
  files: ["scripts/golden/fixtures/races.json", "scripts/golden/fixtures/expected.json"],
  // DERIVED, not listed — see the header. The closure of the engine's own entry point.
  reach: ["client/src/modules/raceCore.js"],
};

// ★ DECLARED BEFORE ANY WORK. `routing.declarationOf` RUNS this file with `--declare` and reads
// the first line of stdout, so the answer must come out before a single race is built — asking a
// guard what it covers must never be the same act as running it.
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const FIXTURES = join(ROOT, "scripts/golden/fixtures");
export const RACES_PATH = join(FIXTURES, "races.json");
export const EXPECTED_PATH = join(FIXTURES, "expected.json");

export const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/** Run every golden race and return `{id, results, realizedDurationSec, frames}` for each. */
export function runAllGoldenRaces(definitions = readJson(RACES_PATH)) {
  return definitions.races.map((race) => ({
    id: race.id,
    ...runGoldenRace(race, definitions.configs),
  }));
}

/**
 * Compare one race's outcome with what was recorded.
 *
 * @returns {{ok: true} | {ok: false, message: string}}
 */
export function compareRace(id, actual, expected) {
  if (!expected) {
    return {
      ok: false,
      message: `golden race "${id}" has no recorded expectation. Record one with:\n    node scripts/record-golden-races.mjs`,
    };
  }
  if (actual.length !== expected.length) {
    return {
      ok: false,
      message: `golden race "${id}": ${expected.length} racers were recorded, ${actual.length} finished.`,
    };
  }

  // FIRST difference in finishing order — one named racer, not a wall of consequences.
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i];
    const a = actual[i];
    if (a.name !== e.name) {
      const movedTo = actual.findIndex((x) => x.name === e.name);
      return {
        ok: false,
        message:
          `golden race "${id}" — THE ORDER MOVED.\n` +
          `    position ${e.rank}: expected ${e.name}, got ${a.name}\n` +
          `    ${e.name} is now at position ${movedTo === -1 ? "(not finished)" : actual[movedTo].rank}\n` +
          `    expected finish: ${fmt(e.finishTimeSec)}   actual finish at this position: ${fmt(a.finishTimeSec)}`,
      };
    }
    if (a.finishTimeSec !== e.finishTimeSec) {
      const d = a.finishTimeSec == null || e.finishTimeSec == null ? null : a.finishTimeSec - e.finishTimeSec;
      return {
        ok: false,
        message:
          `golden race "${id}" — A FINISHING TIME MOVED.\n` +
          `    ${e.name} (position ${e.rank}): expected ${fmt(e.finishTimeSec)}, got ${fmt(a.finishTimeSec)}` +
          (d === null ? "" : `  (${d > 0 ? "+" : ""}${d.toFixed(3)} s)`),
      };
    }
  }
  return { ok: true };
}

const fmt = (t) => (t == null ? "did not finish" : `${t.toFixed(3)} s`);

/**
 * Run both races and compare. Pure: returns the failures rather than printing or exiting, so the
 * script suite can assert on it without capturing output.
 *
 * @returns {{failures: string[], ran: Array}}
 */
export function checkGoldenRaces() {
  const definitions = readJson(RACES_PATH);
  let expected;
  try {
    expected = readJson(EXPECTED_PATH);
  } catch {
    expected = { races: {} };
  }
  const ran = runAllGoldenRaces(definitions);
  const failures = [];
  for (const r of ran) {
    const v = compareRace(r.id, r.results, expected.races?.[r.id]?.results);
    if (!v.ok) failures.push(v.message);
  }
  return { failures, ran };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("check-golden-races.mjs")) {
  const started = Date.now();
  const { failures, ran } = checkGoldenRaces();
  const ms = Date.now() - started;

  for (const r of ran) {
    process.stdout.write(
      `check-golden-races: ${r.id} — ${r.results.length} racers, ` +
        `${r.realizedDurationSec.toFixed(2)} s of racing in ${r.frames} frames\n`,
    );
  }

  if (failures.length === 0) {
    process.stdout.write(
      `check-golden-races: ${ran.length} race(s), every finishing position and time as recorded (${ms} ms).\n`,
    );
    process.exit(0);
  }

  process.stderr.write(`\nFAIL: ${failures.length} golden race(s) no longer match what was recorded.\n\n`);
  for (const f of failures) process.stderr.write(`  ${f}\n\n`);
  process.stderr.write(
    "  ★ A RED GOLDEN RACE IS A FINDING FIRST. It means a change moved how a race runs.\n" +
      "  If that was NOT intended, the change is the thing to fix — not this fixture.\n" +
      "  If it WAS intended, re-recording needs the owner's word, and then:\n" +
      '      node scripts/record-golden-races.mjs --intended="what changed and why"\n',
  );
  process.exit(1);
}
