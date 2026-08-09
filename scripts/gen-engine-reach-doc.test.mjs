// ============================================================
// File:        scripts/gen-engine-reach-doc.test.mjs
// Project:     RaceArena — ONE-TRUTH-1 stage 5
//
// The extractor is tested against the THREE header styles that actually exist in this repository,
// and `--check` is tested by proving its two positions differ (Lesson 203): it passes on the tree
// as committed, and fails once the block is edited by hand.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { purposeOf } from "./gen-engine-reach-doc.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GEN = join(ROOT, "scripts", "gen-engine-reach-doc.mjs");
const SIM = join(ROOT, "docs", "SIM.md");

const run = (...args) =>
  spawnSync(process.execPath, [GEN, ...args], { cwd: ROOT, encoding: "utf8" });

/**
 * A TEST NEVER WRITES THE TRACKED DOCUMENT. It sabotages a COPY and runs the generator against it
 * with `--doc=`.
 *
 * These three tests used to write `docs/SIM.md` directly and restore it in a `finally`. Two things
 * were wrong with that, both observed rather than imagined:
 *   - `npm run verify` runs the doc guards and the script suite CONCURRENTLY. On Windows,
 *     `check-fingerprints.mjs` reading SIM.md while this wrote it produced `UNKNOWN: -4094` and
 *     failed the suite — 1 run in 8 under load, 0 in 25 idle, which is exactly the shape that gets
 *     called "flaky" and re-run instead of fixed. The suite has NO retries by design (ONE-TRUTH-2
 *     stage 2), so it fails the build.
 *   - Worse than the flake: a crash between the sabotage and the `finally` leaves the TRACKED file
 *     corrupted in the working tree, with no test failing to say so.
 * Same fix, same reason, as `check-measured-stamps.test.mjs` (ONE-TRUTH-2).
 */
const withCopy = (fn) => {
  const d = mkdtempSync(join(tmpdir(), "ra-sim-"));
  const copy = join(d, "SIM.md");
  copyFileSync(SIM, copy);
  try {
    return fn(copy, readFileSync(copy, "utf8"));
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
};

test("STYLE 1 — the house `Description:` header, joined across continuation lines", () => {
  const src = [
    "// ============================================================",
    "// File:        thing.js",
    "// Description: Pure racer-behavior logic for D7b: lane-free avoidance",
    "//              and drafting on continuous physicalY. Second sentence ignored.",
    "// ============================================================",
  ].join("\n");
  assert.equal(
    purposeOf(src),
    "Pure racer-behavior logic for D7b: lane-free avoidance and drafting on continuous physicalY.",
  );
});

test("STYLE 2 — the summary on the filename line", () => {
  const src =
    "// raceStep.js — the ONE per-frame t-update, imported by BOTH\n// the browser and the sim.\n";
  assert.equal(
    purposeOf(src),
    "the ONE per-frame t-update, imported by BOTH the browser and the sim.",
  );
});

test("STYLE 3 — the summary riding on the Project line (this is raceCore.js's only one)", () => {
  const src = [
    "// File:        client/src/modules/raceCore.js",
    "// Project:     RaceArena — the REAL race init + per-step advance, extracted",
    "//              from index.jsx so it is importable WITHOUT the DOM.",
  ].join("\n");
  assert.match(purposeOf(src), /^the REAL race init \+ per-step advance/);
  assert.match(purposeOf(src), /WITHOUT the DOM\.$/);
});

test("A FILE WITH NO STATED PURPOSE returns null — the table prints UNKNOWN, it does not invent one", () => {
  // This is the whole point of the UNKNOWN column: a plausible sentence written by the generator
  // would be indistinguishable from a fact, and nobody would ever go and fix the file's header.
  assert.equal(purposeOf("const x = 1;\nexport default x;\n"), null);
  assert.equal(
    purposeOf("// just a note, no filename and no Description field\n"),
    null,
  );
});

test("A NEW HEADER FIELD ends the paragraph — the next field is not swallowed as prose", () => {
  const src = [
    "// Description: Storage CRUD for race-behavior tuning config (D7b)",
    "// Created:     2026-04-19",
  ].join("\n");
  assert.equal(
    purposeOf(src),
    "Storage CRUD for race-behavior tuning config (D7b)",
  );
});

// THE COUNT IS DERIVED, NEVER TYPED. This test said `19 files` in three places, and the day the hull
// grew to 20 (CONFIG-DIFF-2 added storage/configDiff.js) it turned CI red on master — not because the
// document was wrong, but because the TEST carried a copy of a number the generator computes. That is
// the copied-default defect (LESSONS L207) wearing a test's clothes, and it is worse here: it fails
// only on the commit that makes the document CORRECT, so the cheapest way out is to un-fix the doc.
const hullSize = () => {
  const m = /block is current \((\d+) files/.exec(run("--check").stdout);
  assert.ok(m, "could not read the closure size from --check");
  return Number(m[1]);
};

test("--check PASSES on the tree as committed", () => {
  const r = run("--check");
  assert.equal(r.status, 0, r.stderr);
  // The count itself is asserted against the CLOSURE, not against a literal: engine-reach.mjs is the
  // one home for how many files can change the race.
  assert.match(r.stdout, /block is current \(\d+ files/);
});

test("CONSEQUENCE: --check FAILS once the generated block is edited by hand", () => {
  const n = hullSize();
  withCopy((copy, before) => {
    writeFileSync(
      copy,
      before.replace(
        `${n} files, 1 of them UNKNOWN.`,
        `${n} files, 0 of them UNKNOWN.`,
      ),
    );
    const r = run("--check", `--doc=${copy}`);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /OUT OF DATE/);
  });
  assert.equal(
    run("--check").status,
    0,
    "the TRACKED document was never touched",
  );
});

test("--dry WRITES NOTHING", () => {
  const before = readFileSync(SIM, "utf8");
  const r = run("--dry");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /BEGIN GENERATED: engine reach/);
  assert.equal(readFileSync(SIM, "utf8"), before);
});

test("PRETTIER'S FORMATTING IS NOT DRIFT — column padding must not fail --check", () => {
  // The repo formats markdown on every commit and prettier pads table columns and expands the
  // `|---|---|` separator. A byte comparison called that a stale block the moment the generator
  // first ran, which would have taught everyone to ignore this guard. Content is compared; layout
  // is not. The generated table's own separator row is used as the sabotage because it is the exact
  // shape prettier rewrites.
  withCopy((copy, before) => {
    writeFileSync(
      copy,
      before.replace(
        "| `modules/raceStep.js` |",
        "|   `modules/raceStep.js`    |",
      ),
    );
    assert.equal(
      run("--check", `--doc=${copy}`).status,
      0,
      "re-padding a cell must still pass",
    );
  });
});

test("...but a changed PURPOSE is drift, and --check says so", () => {
  withCopy((copy, before) => {
    writeFileSync(
      copy,
      before.replace(
        "**UNKNOWN** — the file's header states no purpose",
        "Lap arithmetic for the camera",
      ),
    );
    const r = run("--check", `--doc=${copy}`);
    assert.equal(r.status, 1, "filling in an UNKNOWN by hand must fail");
    assert.match(r.stderr, /OUT OF DATE/);
  });
  assert.equal(run("--check").status, 0);
});
