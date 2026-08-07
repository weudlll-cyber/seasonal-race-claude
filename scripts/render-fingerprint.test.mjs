// ============================================================
// File:        scripts/render-fingerprint.test.mjs
// Project:     RaceArena — HARNESS-NAMES-1
//
// WHAT THIS GUARDS: that the render harness gives its racers real names, from the one home, the same
// way on every run.
//
// WHY IT IS WORTH A TEST AT ALL. This is an INSTRUMENT. A measuring instrument that varies between
// runs is not an instrument, and one whose inputs are unrepresentative reports confidently about a
// picture the game never draws — which is exactly the defect this block fixed. The properties below
// are what make its numbers mean anything.
//
// R7's two questions are answered at each test.
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, "render-fingerprint.mjs"), "utf8");
const { QUICK_TEST_NAMES_MIXED, QUICK_TEST_NAMES, QUICK_TEST_NAMES_LONG } =
  await import(
    pathToFileURL(join(HERE, "..", "client/src/modules/racerNames.js")).href
  );

describe("the harness names its racers (HARNESS-NAMES-1)", () => {
  // What breaks if deleted: the assignment could be dropped and the harness would silently go back
  // to nameless racers.
  // What goes unnoticed: everything. The hash would still be produced, still be stable, and still be
  // reported as authoritative — while measuring 8px-wide label boxes the game cannot produce. A
  // broken instrument that keeps answering is worse than one that stops.
  it("assigns a name to every racer", () => {
    expect(SRC).toMatch(
      /st\.racers\.forEach\(\(r, i\) => \{\s*r\.name = HARNESS_NAMES/,
    );
  });

  it("assigns them BY INDEX, so the same racer gets the same name on every run and every track", () => {
    // Determinism is the property; modulo-by-index is how it is obtained. Anything reaching for a
    // random source, a clock, or the track id would break the instrument without breaking a test
    // that only checked "has a name".
    expect(SRC).toMatch(/HARNESS_NAMES\[i % HARNESS_NAMES\.length\]/);
    expect(SRC).not.toMatch(/Math\.random\(\)/);
  });

  it("takes the roster from its ONE home rather than a list typed here", () => {
    // A racer's NAME is an engine input in this project, so a second copy of a name list is not a
    // tidiness problem — it is the silent-divergence bug racerNames.js's own header was written
    // about. The harness must import, never restate.
    expect(SRC).toMatch(/from the ONE home|racerNames\.js/);
    expect(SRC).toMatch(/QUICK_TEST_NAMES_MIXED: HARNESS_NAMES/);
    // no inline roster smuggled in beside it
    expect(SRC).not.toMatch(/const HARNESS_NAMES\s*=\s*\[/);
  });

  it("uses MIXED specifically, because a label instrument wants both extremes", () => {
    expect(SRC).toMatch(/QUICK_TEST_NAMES_MIXED/);
    // The property that makes MIXED the right choice, asserted rather than assumed: it spans a far
    // wider range than the other two, so it exercises the widest AND the narrowest pairings.
    const span = (a) =>
      Math.max(...a.map((n) => n.length)) - Math.min(...a.map((n) => n.length));
    expect(span(QUICK_TEST_NAMES_MIXED)).toBeGreaterThan(
      span(QUICK_TEST_NAMES),
    );
    expect(span(QUICK_TEST_NAMES_MIXED)).toBeGreaterThan(
      span(QUICK_TEST_NAMES_LONG),
    );
  });

  it("has enough names to cover the field it runs", () => {
    // The harness runs 40 racers. Modulo means it never crashes, but a roster shorter than the field
    // would repeat names and quietly halve the width variety the instrument exists to exercise.
    expect(QUICK_TEST_NAMES_MIXED.length).toBeGreaterThanOrEqual(40);
  });
});
