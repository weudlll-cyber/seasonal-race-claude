// ============================================================
// File:        scripts/check-measured-stamps.test.mjs
// Project:     RaceArena — ONE-TRUTH-2 stage 4
//
// Driven as a real process against the real repository, because what the guard reasons about is git
// history and a fixture would have to fake exactly the thing under test. Each case edits the doc,
// runs the guard, and restores the file from a copy — never with `git checkout`, which would also
// discard uncommitted work in the same file (a mistake made earlier in this block).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = join(ROOT, "scripts", "check-measured-stamps.mjs");
const DOC = join(ROOT, "docs", "CAMERA_DIRECTOR.md");

const run = () =>
  spawnSync(process.execPath, [GUARD], { cwd: ROOT, encoding: "utf8" });
const git = (...a) =>
  execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();

/** Edit the doc, run the guard, always put the file back byte-for-byte. */
function withDoc(transform, fn) {
  const before = readFileSync(DOC, "utf8");
  try {
    writeFileSync(DOC, transform(before));
    return fn();
  } finally {
    writeFileSync(DOC, before);
  }
}

test("BASELINE: the repository's own stamp is fresh", () => {
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /0 stale/);
});

test("SABOTAGE: a stamp that PREDATES a camera change fails, and names the offending commit", () => {
  // The second-newest commit touching the camera is, by definition, older than the newest one.
  const older = git(
    "log",
    "-2",
    "--format=%h",
    "--",
    "client/src/modules/camera/",
  ).split("\n")[1];
  const newest = git(
    "log",
    "-1",
    "--format=%h",
    "--",
    "client/src/modules/camera/",
  );
  assert.ok(
    older && older !== newest,
    "precondition: two distinct camera commits exist",
  );

  const r = withDoc(
    (t) => t.replace(/@ [0-9a-f]{7,40} (\d{4}-\d{2}-\d{2})/, `@ ${older} $1`),
    run,
  );
  assert.equal(r.status, 1);
  assert.match(r.stderr, /changed AFTER/);
  assert.match(
    r.stderr,
    new RegExp(newest),
    "must name the commit that invalidated the stamp",
  );
  assert.equal(run().status, 0, "the doc must be restored");
});

test("SABOTAGE: a stamp naming a commit that does not exist fails — a typo cannot disable the check", () => {
  const r = withDoc((t) => t.replace(/@ [0-9a-f]{7,40} /, "@ deadbee "), run);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /does not exist/);
});

test("SABOTAGE: a `depends` path git knows nothing about fails, rather than passing vacuously", () => {
  // A dependency that can never change would make the stamp permanently, silently fresh.
  const r = withDoc(
    (t) => t.replace(/depends=[^\s]+/, "depends=client/src/no/such/dir/"),
    run,
  );
  assert.equal(r.status, 1);
  assert.match(r.stderr, /NO commits touching those/);
});

test("LOUD FAILURE: a document with NO stamp at all fails — checking nothing is not a pass", () => {
  const r = withDoc((t) => t.replace(/<!--\s*MEASURED:[\s\S]*?-->/, ""), run);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ZERO measured-number stamps/);
});

test("THE GUARD STATES ITS OWN LIMIT in what it prints, not only in its header", () => {
  // It checks freshness and never re-measures. Someone reading only the passing line must still
  // learn that, or they will read a green run as "the numbers are right".
  assert.match(
    run().stdout,
    /Freshness only — the numbers themselves are never re-measured/,
  );
});
