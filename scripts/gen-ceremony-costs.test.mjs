// ============================================================
// File:        scripts/gen-ceremony-costs.test.mjs
// Project:     RaceArena — CEREMONY-COUNTS-GENERATED
//
// WHAT THIS GUARDS: that the three engine-reach counts in docs/SHIP-CEREMONY.md are CHECKED and not
// merely written. A generator that only ever writes is a formatter; what makes a generated number
// trustworthy is that something fails when the document and the repository disagree.
//
// `--check-counts` is tested in BOTH positions (Lesson 203): it passes on the tree as committed, and
// it fails once a count is edited by hand. A check that has only ever been seen to pass has not been
// tested — it has been watched.
//
// A TEST NEVER WRITES THE TRACKED DOCUMENT. It sabotages a COPY and points the script at it with
// `--doc=`, the same seam and the same reason as `gen-engine-reach-doc.test.mjs`: `npm run verify`
// runs the doc guards and the script suite CONCURRENTLY, and a test that rewrote SHIP-CEREMONY.md
// while another guard was reading it produced exactly the intermittent failure that gets called
// flaky and re-run instead of fixed.
//
// WHAT THIS DOES NOT COVER, deliberately: the guard COST table. Its numbers are measurements and
// cannot be recomputed without spending the five minutes they measure, so nothing here asserts them.
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
import { ceremonyCounts, countsBlock, GUARD } from "./gen-ceremony-costs.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GEN = join(ROOT, "scripts", "gen-ceremony-costs.mjs");
const CEREMONY = join(ROOT, "docs", "SHIP-CEREMONY.md");

const run = (...args) =>
  spawnSync(process.execPath, [GEN, ...args], { cwd: ROOT, encoding: "utf8" });

const withCopy = (fn) => {
  const d = mkdtempSync(join(tmpdir(), "ra-ceremony-"));
  const copy = join(d, "SHIP-CEREMONY.md");
  copyFileSync(CEREMONY, copy);
  try {
    return fn(copy, readFileSync(copy, "utf8"));
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
};

test("the counts are DERIVED, and the third is not the difference of the first two", () => {
  const c = ceremonyCounts();
  assert.ok(
    c.closure > 0,
    "an empty closure means engine-reach returned nothing",
  );
  assert.ok(
    c.folder > c.closure,
    "the folder rule fired on more files than the closure holds",
  );
  // THE WHOLE POINT of computing rather than subtracting: the closure is not a subset of the folder,
  // so `folder - closure` is wrong by however many closure members sit outside it. If this ever
  // becomes an empty list the subtraction would be correct — and this assertion would say so.
  assert.equal(
    c.unreachable,
    c.folder - (c.closure - c.outside.length),
    "unreachable must exclude only the closure members that are actually IN the folder set",
  );
  assert.ok(
    c.outside.length > 0,
    "no closure member outside the folder set — the document's warning about the subtraction " +
      "would now be describing something that cannot happen, and should be re-read",
  );
});

test("--check-counts PASSES on the tree as committed", () => {
  const r = run("--check-counts");
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /agrees with the repository/);
});

test("--check-counts FAILS when a count is edited by hand", () => {
  withCopy((copy, text) => {
    const c = ceremonyCounts();
    const sabotaged = text.replace(
      `| of those, files that CANNOT reach the engine | ${c.unreachable} |`,
      `| of those, files that CANNOT reach the engine | ${c.unreachable + 1} |`,
    );
    assert.notEqual(
      sabotaged,
      text,
      "the sabotage did not match — the row wording moved",
    );
    writeFileSync(copy, sabotaged);
    const r = run("--check-counts", `--doc=${copy}`);
    assert.equal(r.status, 1, "a wrong count must fail the check");
    assert.match(r.stderr, /do not match the repository/);
  });
});

test("--check-counts FAILS when the block is missing entirely", () => {
  withCopy((copy, text) => {
    const stripped = text.replace(
      /<!-- BEGIN GENERATED: engine-reach counts[\s\S]*?<!-- END GENERATED: engine-reach counts -->/,
      "",
    );
    assert.notEqual(
      stripped,
      text,
      "the markers were not found — they have been renamed",
    );
    writeFileSync(copy, stripped);
    const r = run("--check-counts", `--doc=${copy}`);
    assert.equal(r.status, 1, "a missing block must fail the check");
    assert.match(r.stderr, /no generated engine-reach counts block/);
  });
});

test("--counts REPAIRS a sabotaged block, and repairing it is idempotent", () => {
  withCopy((copy, text) => {
    // THE SABOTAGE IS DERIVED, NOT TYPED. This used to look for the literal `| 20 |`, and the moment
    // the engine-reach hull grew (FP-HULL-1: 19 files to 36) that cell held a different number. A
    // `replace` whose needle is absent is a NO-OP, so the copy stayed VALID, --check-counts passed,
    // and the test failed while reporting that the generator was broken. It now finds whatever
    // numeric cell is actually there and corrupts that.
    const cell = /\| (\d+) \|/.exec(text);
    assert.ok(
      cell,
      "no numeric cell found in the generated counts block to sabotage",
    );
    writeFileSync(copy, text.replace(cell[0], "| 999999 |"));
    assert.equal(run("--check-counts", `--doc=${copy}`).status, 1);
    assert.equal(run("--counts", `--doc=${copy}`).status, 0);
    assert.equal(run("--check-counts", `--doc=${copy}`).status, 0);
    const once = readFileSync(copy, "utf8");
    run("--counts", `--doc=${copy}`);
    assert.equal(
      readFileSync(copy, "utf8"),
      once,
      "a second write changed the document",
    );
  });
});

test("the block is PURE ARITHMETIC — the argument stays outside the markers", () => {
  // The reason this block exists at all is that a generator must not own a sentence. If prose ever
  // creeps inside the markers, the next person to regenerate silently rewrites an argument.
  const block = countsBlock();
  const body = block
    .split("\n")
    .filter(
      (l) =>
        l.startsWith("|") && !l.startsWith("| count") && !/^\|\s*-/.test(l),
    );
  assert.ok(body.length >= 3, "fewer than three count rows");
  for (const line of body) {
    const value = line.split("|").at(-2).trim();
    assert.ok(
      /^\d+$/.test(value) || /^`|^none$/.test(value),
      `generated cell "${value}" is neither a number nor a file list — prose has entered the block`,
    );
  }
});

test("the guard declares itself, and declares what it is blind to", () => {
  assert.equal(GUARD.id, "ceremony-counts");
  assert.ok(GUARD.blind.length > 0, "blind is required and non-empty");
  assert.ok(
    GUARD.blind.some((b) => /cost/i.test(b)),
    "the cost table is the obvious thing a reader would assume this guard covers; it must say it does not",
  );
  const r = run("--declare");
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).id, "ceremony-counts");
});
