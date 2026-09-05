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
// THE FRAME CAMERA — THE INSTRUMENT AND THE GAME MUST NOT DRIFT FURTHER APART (night of 2026-09-04)
//
// WHAT IS TRUE TODAY, read at source rather than taken from the backlog:
//
//   `client/src/screens/RaceScreen/frameCameraInputs.js` is the ONE home of the frame's `camera`
//   object. It declares FIVE fields (`state`, `anchorRacerIndex`, `comebackLockedRacerIndex`,
//   `hudState`, `runInArrived`) and adds the `detectBattleGroup` method — SIX members. The game
//   builds its camera through it (`RaceScreen/index.jsx:1546`).
//
//   `render-fingerprint.mjs` builds the same object as a HAND-WRITTEN LITERAL with THREE members:
//   `hudState`, `comebackLockedRacerIndex`, `detectBattleGroup`. So `state`, `anchorRacerIndex` and
//   `runInArrived` are `undefined` on every frame this instrument draws.
//
// ★ WHAT THAT ACTUALLY COSTS IS TWO FIELDS, NOT THREE, AND THE DIFFERENCE IS WORTH RECORDING.
//   `renderRaceFrame.js` reads `anchorRacerIndex` (:212 — who keeps their name) and `runInArrived`
//   (:220 — names from the arrival, numbers before it), so the instrument draws the labels wrongly
//   on both counts. It does NOT read `camera.state` in live code any more: the only surviving
//   occurrence is inside the comment at :284 recording that LABEL-OVERLAP-FIX-1 removed that read.
//   `state` therefore stays on the declared contract and costs the instrument nothing today.
//   (It also means `frameCameraInputs.test.js`'s greps of the renderer source count a mention in a
//   COMMENT as a read — harmless there, since it only ever adds fields to the required set.)
//
// ── WHY THIS TEST PINS THE GAP INSTEAD OF FAILING ON IT ─────────────────────────────────────────
// The repair is one line — `camera: frameCameraInputs(cd)` — and IT MOVES THE RENDER HASH, which
// makes it a mint and the owner's to order. It is not done here. What is done here is that the gap
// can no longer widen or change SILENTLY: this records exactly which members are missing today, and
// goes red if a field is added to the contract that the instrument does not get, if the instrument
// starts supplying something the contract does not declare, or if the repair lands (at which point
// the expected set below is what has to be updated, deliberately, alongside the mint).
const FCI = await import(
  pathToFileURL(
    join(HERE, "..", "client/src/screens/RaceScreen/frameCameraInputs.js"),
  ).href
);

/** The keys of the `camera:` object literal the instrument hands `renderRaceFrame`. */
function instrumentCameraMembers(src) {
  const at = src.indexOf("\n    camera: {");
  assert.ok(at >= 0, "the instrument's `camera:` literal was not found — this guard is blind");
  const open = src.indexOf("{", at);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  assert.ok(end > open, "the `camera:` literal is unbalanced");
  const body = src.slice(open + 1, end);
  // Top-level keys only: skip anything nested inside a deeper brace or paren.
  const keys = [];
  let d = 0;
  for (const line of body.split("\n")) {
    const m = d === 0 && line.match(/^\s{6}([A-Za-z_$][\w$]*)\s*:/);
    if (m) keys.push(m[1]);
    for (const ch of line) {
      if (ch === "{" || ch === "(" || ch === "[") d++;
      else if (ch === "}" || ch === ")" || ch === "]") d--;
    }
  }
  return new Set(keys);
}

// What breaks if deleted: a sixth camera field could be added to the game and the instrument would
// keep drawing without it.
// What goes unnoticed: the render fingerprint's coverage narrowing while the hash stays stable and
// authoritative — the instrument reporting confidently about a picture it no longer draws. That is
// the same defect this file's first test was written about, one level up.
test("the instrument's frame camera differs from the game's by EXACTLY the known gap", () => {
  const canonical = new Set([...FCI.FRAME_CAMERA_FIELDS, "detectBattleGroup"]);
  const supplied = instrumentCameraMembers(SRC);

  // The instrument must never invent a member the one home does not declare.
  const invented = [...supplied].filter((k) => !canonical.has(k)).sort();
  assert.deepEqual(
    invented,
    [],
    `render-fingerprint supplies camera member(s) frameCameraInputs does not declare: ${invented.join(", ")}`,
  );

  // And the members it is MISSING are exactly the three recorded above — no more, no fewer.
  const missing = [...canonical].filter((k) => !supplied.has(k)).sort();
  assert.deepEqual(
    missing,
    ["anchorRacerIndex", "runInArrived", "state"],
    `the instrument's frame-camera blind spot CHANGED (missing: ${missing.join(", ") || "nothing"}). ` +
      `If a field was added to FRAME_CAMERA_FIELDS, the instrument needs it too. If the instrument ` +
      `was repaired, that MOVES THE RENDER HASH — it is a mint, and this list is updated with it.`,
  );
});
