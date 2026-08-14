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
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
} from "node:fs";
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

// ── STAMP-COMPLETE-1: the guard answers about EVERYTHING it is responsible for ──────────────────
//
// The defect: run bare, this guard scanned `docs/CAMERA_DIRECTOR.md` alone while printing a
// confident green line, so a stale stamp in any other living document was invisible. Proven by
// sabotage before the fix: on a tree with a stale stamp appended to `docs/ENDING-PHASES.md`, the old
// guard exited 0 reporting "1 stamp(s) across 1 document(s), 0 stale" and the new one exits 1 and
// names it. That proof mutates a tracked file and so CANNOT live here — see this file's header — so
// these tests assert the two PROPERTIES that make it true, on copies.

test("THE DEFAULT SET IS THE LIVING-DOC SET, not one named file", () => {
  // The property, not the number: whatever `git ls-files` says the living docs are, that is what a
  // bare run opens. Pinning "57" would need re-blessing on every added document, which is exactly
  // the habit R7 warns turns a suite into paperwork.
  const expected = git("ls-files", "*.md")
    .split(String.fromCharCode(10))
    .map((f) => f.trim())
    .filter(Boolean)
    .filter(
      (f) =>
        !f.includes("node_modules/") &&
        !f.includes("/dist/") &&
        (f.startsWith("docs/") || !f.includes("/")),
    ).length;
  assert.ok(expected > 1, "the repository must have more than one living doc");
  const r = spawnSync(process.execPath, [GUARD], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(r.status, 0);
  assert.ok(
    r.stdout.includes(`of ${expected} living document`),
    `a bare run must open all ${expected} living docs, not a subset — got: ${r.stdout.trim()}`,
  );
});

test("A STALE STAMP IN THE SECOND DOCUMENT IS CAUGHT — the set is scanned, not just its head", () => {
  // Two copies: the first fresh, the second stale. The old guard could not fail this by
  // construction, because it only ever opened one document.
  const dir = mkdtempSync(join(tmpdir(), "ra-stamp-multi-"));
  try {
    const text = readFileSync(DOC, "utf8");
    const fresh = join(dir, "FRESH.md");
    const stale = join(dir, "STALE.md");
    writeFileSync(fresh, text);
    // An ancestor of the newest camera commit: measured before the dependency last moved.
    const old = git(
      "log",
      "--format=%h",
      "--skip=40",
      "-1",
      "--",
      "client/src/modules/camera/",
    );
    writeFileSync(stale, text.replace(/@ [0-9a-f]{7,40} /, `@ ${old} `));
    const r = spawnSync(
      process.execPath,
      [GUARD, `--doc=${fresh}`, `--doc=${stale}`],
      { cwd: ROOT, encoding: "utf8" },
    );
    assert.equal(
      r.status,
      1,
      "the stale stamp in the SECOND document must fail the run",
    );
    assert.match(r.stderr, /STALE\.md/, "it must name which document is stale");
    assert.ok(r.stdout.includes("of 2 living document"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("A FENCED EXAMPLE OF THE FORMAT IS NOT A STAMP — R11, the guard yields to a true sentence", () => {
  // Now that every living doc is scanned, a document EXPLAINING the stamp format would have its
  // example parsed as a real stamp and go red for being correct. Fenced blocks are stripped.
  const r = onCopy(
    (t) =>
      t +
      String.fromCharCode(10) +
      "```" +
      String.fromCharCode(10) +
      "<!-- MEASURED: an example @ deadbee 2020-01-01 depends=no/such/path/ -->" +
      String.fromCharCode(10) +
      "```" +
      String.fromCharCode(10),
  );
  assert.equal(
    r.code,
    0,
    "a fenced example must not be parsed as a live stamp",
  );
});

// ── --staged: THE PRE-COMMIT POSITION (STAMP-TRAP-1) ────────────────────────────────────────────
//
// These run against a TEMPORARY REPOSITORY rather than this one, and that is not a preference. The
// mode reasons about the INDEX, so testing it here would mean staging files in the real repository —
// global state that `npm run verify` reads concurrently, which is the same collision this file's
// header records from its first version. A temp repo has its own index and can be staged freely.
//
// The guard is COPIED into the fixture because its ROOT is derived from its own file location, which
// is also how it finds git. Same technique as buildIdentityWorktree.test.js, same reason.

/** A throwaway repository with one stamped doc and one dependency directory. */
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "ra-staged-"));
  const g = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "docs"), { recursive: true });
  mkdirSync(join(dir, "src", "cam"), { recursive: true });
  writeFileSync(
    join(dir, "scripts", "check-measured-stamps.mjs"),
    readFileSync(GUARD, "utf8"),
  );
  writeFileSync(join(dir, "src", "cam", "a.js"), "x\n");
  writeFileSync(
    join(dir, "docs", "D.md"),
    "# Doc\n\n<!-- MEASURED: thing @ PLACE 2026-01-01 depends=src/cam/ -->\n\nbody\n",
  );
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
  g("config", "user.email", "t@example.invalid");
  g("config", "user.name", "T");
  g("add", "-A");
  g("commit", "-q", "-m", "first");
  // Stamp it at a commit that DOES touch the dependency, so the fixture starts fresh.
  const head = g("rev-parse", "--short", "HEAD").trim();
  const doc = join(dir, "docs", "D.md");
  writeFileSync(doc, readFileSync(doc, "utf8").replace("PLACE", head));
  g("add", "-A");
  g("commit", "-q", "-m", "stamp");
  return { dir, g, doc };
}

const runStaged = (dir) =>
  spawnSync(
    process.execPath,
    [
      join(dir, "scripts", "check-measured-stamps.mjs"),
      "--doc=docs/D.md",
      "--staged",
    ],
    { cwd: dir, encoding: "utf8" },
  );

test("--staged BASELINE: nothing staged under the dependency, nothing to say", () => {
  const { dir } = fixture();
  try {
    const r = runStaged(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /0 would go stale/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--staged: a staged dependency change with NO re-stamp FAILS — the trap that put master red", () => {
  const { dir, g } = fixture();
  try {
    writeFileSync(join(dir, "src", "cam", "a.js"), "x\nchanged\n");
    g("add", "src/cam/a.js");
    const r = runStaged(dir);
    assert.equal(
      r.status,
      1,
      "a staged dependency with no re-stamp must FAIL, not report",
    );
    assert.match(r.stderr, /will be STALE the moment this commit lands/);
    assert.match(r.stderr, /src[\/]cam[\/]a\.js/);
    assert.match(r.stdout, /1 would go stale/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--staged: staging the dependency AND the re-stamp together PASSES", () => {
  // L203 for the case above: without this, the failure could be "any staged change fails", which
  // would make the mode unusable rather than correct.
  const { dir, g, doc } = fixture();
  try {
    writeFileSync(join(dir, "src", "cam", "a.js"), "x\nchanged\n");
    g("add", "src/cam/a.js");
    // Re-stamped at a REAL commit. An invented sha satisfies `--staged` and then fails the ordinary
    // freshness check underneath it, so the test would be reporting on the wrong thing — which is
    // exactly what it did on its first run.
    const head = g("rev-parse", "--short", "HEAD").trim();
    writeFileSync(
      doc,
      readFileSync(doc, "utf8").replace(
        /@ [0-9a-f]+ 2026-01-01/,
        `@ ${head} 2026-01-02`,
      ),
    );
    g("add", "docs/D.md");
    const r = runStaged(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /re-stamped in the same commit/);
    assert.match(r.stdout, /0 would go stale/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--staged is OPT-IN: the same fixture reports PENDING and PASSES without the flag", () => {
  // The mode must not change the ordinary answer. An ad-hoc run mid-edit has to stay runnable, which
  // is the whole reason PENDING is a report in the first place.
  const { dir, g } = fixture();
  try {
    writeFileSync(join(dir, "src", "cam", "a.js"), "x\nchanged\n");
    g("add", "src/cam/a.js");
    const r = spawnSync(
      process.execPath,
      [join(dir, "scripts", "check-measured-stamps.mjs"), "--doc=docs/D.md"],
      { cwd: dir, encoding: "utf8" },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /PENDING/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
