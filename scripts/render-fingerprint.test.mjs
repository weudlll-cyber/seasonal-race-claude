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
