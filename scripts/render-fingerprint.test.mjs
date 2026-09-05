// ============================================================
// render-fingerprint.test.mjs — the instrument's own inputs (HARNESS-NAMES-1)
//
// Run: node --test scripts/render-fingerprint.test.mjs
//
// WHAT THIS GUARDS: that the render harness gives its racers real names, from the one home, the same
// way on every run.
//
// WHY AN INSTRUMENT NEEDS ITS OWN TEST. A measuring instrument that varies between runs is not an
// instrument, and one whose inputs are unrepresentative reports confidently about a picture the game
// never draws — which is precisely the defect this block fixed. The properties below are what make
// its numbers mean anything.
//
// R7's two questions are answered at each test.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, "render-fingerprint.mjs"), "utf8");
const { QUICK_TEST_NAMES_MIXED, QUICK_TEST_NAMES, QUICK_TEST_NAMES_LONG } =
  await import(
    pathToFileURL(join(HERE, "..", "client/src/modules/racerNames.js")).href
  );

// What breaks if deleted: the assignment could be dropped and the harness would silently return to
// nameless racers.
// What goes unnoticed: everything. The hash would still be produced, still be stable, and still be
// treated as authoritative — while measuring 8px label boxes the game cannot produce. A broken
// instrument that keeps answering is worse than one that stops.
test("the harness assigns a name to every racer", () => {
  assert.match(SRC, /r\.name = HARNESS_NAMES/);
});

// What breaks if deleted: the assignment could become non-deterministic.
// What goes unnoticed: a fingerprint that differs between two runs of the same commit — which reads
// as "something changed" and sends the next person hunting a change that never happened.
test("it assigns by INDEX, so every run and every track gets the same names", () => {
  assert.match(SRC, /HARNESS_NAMES\[i % HARNESS_NAMES\.length\]/);
  assert.doesNotMatch(SRC, /Math\.random\(\)/);
});

// What breaks if deleted: someone could paste a roster into the harness.
// What goes unnoticed: a divergent copy of a name list. In this project a racer's NAME is an engine
// input, so that is not a tidiness problem — it is the silent-divergence bug racerNames.js's own
// header was written about.
test("it takes the roster from the ONE home rather than restating it", () => {
  assert.match(SRC, /racerNames\.js/);
  assert.match(SRC, /QUICK_TEST_NAMES_MIXED: HARNESS_NAMES/);
  assert.doesNotMatch(SRC, /const HARNESS_NAMES\s*=\s*\[/);
});

// What breaks if deleted: the roster could be swapped for a narrower one.
// What goes unnoticed: the instrument quietly losing the width variety it exists to exercise —
// still stable, still deterministic, and blind to exactly the pairings that matter.
test("it uses MIXED, which spans wider than either alternative", () => {
  assert.match(SRC, /QUICK_TEST_NAMES_MIXED/);
  const span = (a) =>
    Math.max(...a.map((n) => n.length)) - Math.min(...a.map((n) => n.length));
  assert.ok(span(QUICK_TEST_NAMES_MIXED) > span(QUICK_TEST_NAMES));
  assert.ok(span(QUICK_TEST_NAMES_MIXED) > span(QUICK_TEST_NAMES_LONG));
});

// What breaks if deleted: nothing today.
// What goes unnoticed: a roster shorter than the field. Modulo means it never crashes — it just
// repeats names and halves the variety, invisibly.
test("the roster is long enough for the field the harness runs", () => {
  assert.ok(QUICK_TEST_NAMES_MIXED.length >= 40);
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// THE FRAME CAMERA — THE INSTRUMENT NOW BUILDS IT THROUGH THE ONE HOME (RENDER-CAMERA-FIELDS-1)
//
// WHAT WAS TRUE UNTIL 2026-09-05, and what this test used to pin: `render-fingerprint.mjs` built
// the frame's `camera` as a HAND-WRITTEN LITERAL with three members — `hudState`,
// `comebackLockedRacerIndex`, `detectBattleGroup` — while
// `client/src/screens/RaceScreen/frameCameraInputs.js` declares FIVE fields plus that method. So
// `state`, `anchorRacerIndex` and `runInArrived` were `undefined` on every frame the instrument
// drew. The old test recorded that gap and said the repair "MOVES THE RENDER HASH … it is a mint".
//
// ★ THE REPAIR LANDED AND THE PREDICTION WAS RIGHT. The instrument now calls
// `frameCameraInputs(cd)`, and THE RENDER HASH MOVED. Bisected one field at a time, with a control,
// the mover is EXACTLY ONE FIELD — `runInArrived`, which decides whether a label draws a NAME or a
// NUMBER and so changes the call stream. Adding `state` alone and `anchorRacerIndex` alone each
// reproduced the recorded hash unchanged. **THE MINT IS THE OWNER'S AND HAS NOT BEEN GIVEN**; the
// record still carries the pre-repair value. Both values are in the report, which is where a
// superseded hash may be written down — `docs/fingerprints.json` is the record's one home.
//
// ── WHAT THIS TEST GUARDS NOW ───────────────────────────────────────────────────────────────────
// Not "the gap is exactly these three" — there is no gap. The property is stronger and cheaper to
// keep: the instrument does not have its own list at all. It cannot drift, because there is nothing
// to drift from. What can still go wrong is somebody re-introducing a literal, which is precisely
// how this defect was born twice — once in `RaceScreen/index.jsx` and once here.
const FCI = await import(
  pathToFileURL(
    join(HERE, "..", "client/src/screens/RaceScreen/frameCameraInputs.js"),
  ).href
);

// What breaks if deleted: the instrument can go back to listing camera fields by hand, and the
// render fingerprint resumes hashing a frame drawn with the wrong labels while reporting
// confidently about a picture it does not draw.
test("the instrument builds its frame camera through the ONE HOME, not a literal", () => {
  // 1 — IT GOES THROUGH THE FUNCTION. This is the whole repair in one line.
  assert.match(
    SRC,
    /camera: frameCameraInputs\(cd\),/,
    "render-fingerprint must build its frame camera with `frameCameraInputs(cd)`",
  );

  // 2 — AND THERE IS NO HAND-WRITTEN LITERAL LEFT. The `camera: {` shape is the defect itself.
  assert.ok(
    !new RegExp(String.raw`
\s{4}camera: \{`).test(SRC),
    "render-fingerprint has a hand-written `camera: {` literal again — that is the defect this " +
      "repair removed; build it with frameCameraInputs(cd) instead",
  );

  // 3 — IT IMPORTS THE ONE HOME rather than re-implementing it.
  assert.match(
    SRC,
    /frameCameraInputs \} = await import\(/,
    "render-fingerprint must import frameCameraInputs, not define its own",
  );

  // 4 — AND THE ONE HOME REALLY YIELDS EVERY DECLARED MEMBER, so 1-3 are worth something. A stub
  // director is enough: the builder reads each declared key off it and attaches the method.
  const canonical = [...FCI.FRAME_CAMERA_FIELDS, "detectBattleGroup"].sort();
  const built = FCI.frameCameraInputs({ detectBattleGroup: () => null });
  assert.deepEqual(
    Object.keys(built).sort(),
    canonical,
    "frameCameraInputs no longer yields every member it declares",
  );
});

// The dynamic import above is only inside this guard's dependency set because the guard DECLARES it.
// A dynamically imported path is invisible to the static closure walk, so without this the render
// fingerprint would silently stop being selected when the frame-camera contract changed.
test("render-fingerprint DECLARES the frame-camera contract it now imports", () => {
  // Read off the SOURCE, not by importing the module — importing it would run the whole
  // fingerprint, which is minutes of work to answer a question about a string.
  assert.match(
    SRC,
    /reach: \[[^\]]*"client\/src\/screens\/RaceScreen\/frameCameraInputs\.js"/s,
    "frameCameraInputs.js is imported by the instrument and must be in its declared `reach`",
  );
});
