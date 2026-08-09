// ============================================================
// File:        scripts/check-measured-stamps.test.mjs
// Project:     RaceArena — ONE-TRUTH-2 stage 4
//
// Driven as a real process against the real repository's git history, because that history is what
// the guard reasons about and a fixture would have to fake the thing under test.
//
// NO TEST HERE WRITES A TRACKED FILE, and that is not fastidiousness — the first version did, and it
// broke `npm run verify`. It sabotaged `docs/CAMERA_DIRECTOR.md` and restored it in a `finally`,
// which is safe when run alone. verify runs the doc guards and the script suite CONCURRENTLY, so the
// guard read the document inside the window this file had it mutated and failed reporting a
// `depends` path that exists in no commit. A test that mutates a tracked file cannot coexist with a
// guard that reads it. Every case below copies the document to a temp file and points the guard at
// the copy with `--doc=`.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { TEST_FILE_EXCLUDE } from "./check-measured-stamps.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = join(ROOT, "scripts", "check-measured-stamps.mjs");
const DOC = join(ROOT, "docs", "CAMERA_DIRECTOR.md");

const git = (...a) =>
  execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();

/** Run the guard against a TEMP COPY of the document, transformed. Never touches the original. */
function onCopy(transform) {
  const dir = mkdtempSync(join(tmpdir(), "ra-stamp-"));
  const copy = join(dir, "DOC.md");
  try {
    writeFileSync(copy, transform(readFileSync(DOC, "utf8")));
    const r = spawnSync(process.execPath, [GUARD, `--doc=${copy}`], {
      cwd: ROOT,
      encoding: "utf8",
    });
    return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const unchanged = (t) => t;

test("BASELINE: the repository's own stamp is fresh", () => {
  const r = spawnSync(process.execPath, [GUARD], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /0 stale/);
});

test("BASELINE via --doc: an untransformed copy behaves identically to the original", () => {
  // Pins the override itself. Without this, every sabotage below could be passing because `--doc`
  // silently checks nothing rather than because the sabotage was detected.
  const r = onCopy(unchanged);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /1 stamp\(s\)/);
  assert.match(r.out, /0 stale/);
});

test("SABOTAGE: a stamp that PREDATES a camera change fails, and names the offending commit", () => {
  // THE SAME QUESTION THE GUARD ASKS, including the test-file exclusion — imported, not re-typed.
  // CI caught the alternative: with the fixture chosen by a DIFFERENT rule, a run whose newest
  // camera commit was a test-file commit stamped a commit the guard no longer considers, so the
  // guard correctly said fresh and this test demanded stale. It was testing a rule nobody has.
  const commits = git(
    "log",
    "-2",
    "--format=%h",
    "--",
    "client/src/modules/camera/",
    TEST_FILE_EXCLUDE,
  ).split("\n");
  const [newest, older] = commits;
  assert.ok(
    older && older !== newest,
    "precondition: two distinct camera commits exist",
  );

  const r = onCopy((t) =>
    t.replace(/@ [0-9a-f]{7,40} (\d{4}-\d{2}-\d{2})/, `@ ${older} $1`),
  );
  assert.equal(r.code, 1);
  assert.match(r.err, /changed AFTER/);
  assert.match(
    r.err,
    new RegExp(newest),
    "must name the commit that invalidated the stamp",
  );
});

test("SABOTAGE: a stamp naming a commit that does not exist fails — a typo cannot disable the check", () => {
  const r = onCopy((t) => t.replace(/@ [0-9a-f]{7,40} /, "@ deadbee "));
  assert.equal(r.code, 1);
  assert.match(r.err, /does not exist/);
});

test("SABOTAGE: a `depends` path git knows nothing about fails, rather than passing vacuously", () => {
  // A dependency that can never change would make the stamp permanently, silently fresh.
  const r = onCopy((t) =>
    t.replace(/depends=[^\s]+/, "depends=client/src/no/such/dir/"),
  );
  assert.equal(r.code, 1);
  assert.match(r.err, /NO commits touching those/);
});

test("LOUD FAILURE: a document with NO stamp at all fails — checking nothing is not a pass", () => {
  const r = onCopy((t) => t.replace(/<!--\s*MEASURED:[\s\S]*?-->/, ""));
  assert.equal(r.code, 1);
  assert.match(r.err, /ZERO measured-number stamps/);
});

test("THE GUARD STATES ITS OWN LIMIT in what it prints, not only in its header", () => {
  // Someone reading only the passing line must still learn that freshness is not accuracy, or they
  // will read a green run as "the numbers are right".
  assert.match(
    onCopy(unchanged).out,
    /Freshness only — the numbers themselves are never re-measured/,
  );
});

test("THE REAL DOCUMENT IS NEVER WRITTEN BY THIS FILE", () => {
  // The guarantee this file's header is about, asserted rather than promised: the document's bytes
  // are identical before and after a full sabotage round-trip.
  const before = readFileSync(DOC, "utf8");
  onCopy((t) => t.replace(/depends=[^\s]+/, "depends=client/src/no/such/dir/"));
  onCopy((t) => t.replace(/<!--\s*MEASURED:[\s\S]*?-->/, ""));
  assert.equal(readFileSync(DOC, "utf8"), before);
});
