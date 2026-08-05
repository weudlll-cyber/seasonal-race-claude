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
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { purposeOf } from "./gen-engine-reach-doc.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GEN = join(ROOT, "scripts", "gen-engine-reach-doc.mjs");
const SIM = join(ROOT, "docs", "SIM.md");

const run = (...args) =>
  spawnSync(process.execPath, [GEN, ...args], { cwd: ROOT, encoding: "utf8" });

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

test("--check PASSES on the tree as committed", () => {
  const r = run("--check");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /block is current \(19 files/);
});

test("CONSEQUENCE: --check FAILS once the generated block is edited by hand", () => {
  const before = readFileSync(SIM, "utf8");
  try {
    writeFileSync(
      SIM,
      before.replace(
        "19 files, 1 of them UNKNOWN.",
        "19 files, 0 of them UNKNOWN.",
      ),
    );
    const r = run("--check");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /OUT OF DATE/);
  } finally {
    writeFileSync(SIM, before);
  }
  assert.equal(run("--check").status, 0, "the tree must be restored");
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
  const before = readFileSync(SIM, "utf8");
  try {
    writeFileSync(
      SIM,
      before.replace(
        "| `modules/raceStep.js` |",
        "|   `modules/raceStep.js`    |",
      ),
    );
    assert.equal(run("--check").status, 0, "re-padding a cell must still pass");
  } finally {
    writeFileSync(SIM, before);
  }
});

test("...but a changed PURPOSE is drift, and --check says so", () => {
  const before = readFileSync(SIM, "utf8");
  try {
    writeFileSync(
      SIM,
      before.replace(
        "**UNKNOWN** — the file's header states no purpose",
        "Lap arithmetic for the camera",
      ),
    );
    const r = run("--check");
    assert.equal(r.status, 1, "filling in an UNKNOWN by hand must fail");
    assert.match(r.stderr, /OUT OF DATE/);
  } finally {
    writeFileSync(SIM, before);
  }
  assert.equal(run("--check").status, 0);
});
