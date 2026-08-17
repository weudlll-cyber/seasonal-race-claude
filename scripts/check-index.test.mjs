// ============================================================
// check-index.test.mjs — proof-of-live for the check-index guard (Lesson 187).
//
// Run: node --test scripts/check-index.test.mjs
//
// A guard nobody has ever seen fail is indistinguishable from a guard that cannot fail. These
// tests feed the guard a synthetic reports dir with a KNOWN unindexed report and assert it exits
// non-zero and names the offender, a clean dir asserting exit zero, and an empty dir asserting the
// loud-failure rule (zero reports must FAIL, never silently pass).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "check-index.mjs");

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "check-index-"));
  for (const [name, content] of Object.entries(files))
    writeFileSync(join(dir, name), content);
  return dir;
}

const runGuard = (dir) =>
  spawnSync(process.execPath, [GUARD, `--dir=${dir}`], { encoding: "utf8" });

test("check-index FAILS and names the offender when a report is unindexed", () => {
  const dir = fixture({
    "INDEX.md": "# Index\n- [R1.md](R1.md) — indexed\n",
    "R1.md": "# R1",
    "R2.md": "# R2 — deliberately NOT linked",
  });
  const r = runGuard(dir);
  assert.notEqual(
    r.status,
    0,
    "guard must exit non-zero on an unindexed report",
  );
  assert.match(r.stderr, /R2\.md/, "guard must name the unindexed report");
  assert.doesNotMatch(
    r.stderr,
    /^R1\.md$/m,
    "the indexed report must NOT be flagged",
  );
});

test("check-index PASSES when every report is indexed", () => {
  const dir = fixture({
    "INDEX.md": "# Index\n- [R1.md](R1.md)\n- [R2.md](R2.md)\n",
    "R1.md": "# R1",
    "R2.md": "# R2",
  });
  const r = runGuard(dir);
  assert.equal(
    r.status,
    0,
    `guard must exit zero when all indexed; stderr: ${r.stderr}`,
  );
  assert.match(r.stdout, /0 unindexed/);
});

test("check-index FAILS LOUDLY on an empty reports dir (no silent no-op, Lesson 187)", () => {
  const dir = fixture({ "INDEX.md": "# Index (nothing to point at)\n" });
  const r = runGuard(dir);
  assert.notEqual(r.status, 0, "zero reports must FAIL, never silently pass");
  assert.match(r.stderr, /zero reports/i);
});

// ── DIRECTION 2: INDEX -> FILE (NIGHT-TOOLS-1) ────────────────────────────────────────────────
//
// WHAT BREAKS IF THESE ARE DELETED: an INDEX entry can point at a report that was renamed or
// deleted and no guard anywhere would see it. `check-doc-links` scans docs/ and the repo-root *.md
// only, so reports/evolution/INDEX.md is outside its set entirely — this was verified in the source
// before the direction was built, not assumed.
//
// WHAT GOES UNNOTICED IF THEY ARE MISSING: exactly that. A reader follows the index to a 404 and
// concludes the report was never written.

test("DIRECTION 2: check-index FAILS when the index links a report that does not exist", () => {
  const dir = fixture({
    "INDEX.md":
      "# Index\n- [R1.md](R1.md)\n- [GHOST.md](GHOST.md) — renamed away\n",
    "R1.md": "# R1",
  });
  const r = runGuard(dir);
  assert.notEqual(
    r.status,
    0,
    "guard must exit non-zero on a dangling index entry",
  );
  assert.match(r.stderr, /GHOST\.md/, "guard must name the missing report");
});

test("DIRECTION 2: a healthy index passes BOTH directions, and says so", () => {
  // The consequence pair for the test above: the same shape with the ghost removed must pass, so
  // the failure above is attributable to the dangling entry and not to the fixture in general.
  const dir = fixture({
    "INDEX.md": "# Index\n- [R1.md](R1.md)\n",
    "R1.md": "# R1",
  });
  const r = runGuard(dir);
  assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  assert.match(r.stdout, /0 unindexed/);
  assert.match(r.stdout, /0 pointing at a missing file/);
});

test("DIRECTION 2 is INDEPENDENT of direction 1 — each fails on its own", () => {
  // Both directions in one fixture would pass if only one of them worked, because the exit code is
  // shared. These two prove the halves separately.
  const orphanOnly = fixture({ "INDEX.md": "# Index\n", "R1.md": "# R1" });
  const a = runGuard(orphanOnly);
  assert.notEqual(a.status, 0);
  assert.match(a.stderr, /not referenced from/);
  assert.doesNotMatch(a.stderr, /point at a report that does not exist/);

  const danglingOnly = fixture({
    "INDEX.md": "# Index\n- [R1.md](R1.md)\n- [GHOST.md](GHOST.md)\n",
    "R1.md": "# R1",
  });
  const b = runGuard(danglingOnly);
  assert.notEqual(b.status, 0);
  assert.match(b.stderr, /point at a report that does not exist/);
  assert.doesNotMatch(b.stderr, /not referenced from/);
});

test("DIRECTION 2 ignores PATHED links — those belong to check-doc-links, not here", () => {
  // A link into another directory is not this guard's relationship. Counting it would create a
  // second home for something check-doc-links already owns.
  const dir = fixture({
    "INDEX.md":
      "# Index\n- [R1.md](R1.md)\n- [elsewhere](../parity/REBASELINE.md)\n",
    "R1.md": "# R1",
  });
  const r = runGuard(dir);
  assert.equal(
    r.status,
    0,
    `pathed links must not be checked here; stderr: ${r.stderr}`,
  );
});

// ── DIRECTION 3 (INDEX-COVERAGE-1): every directory is accounted for ─────────────────────────────
//
// WHAT BREAKS IF THESE TWO TESTS ARE DELETED: the `reports/audit/` incident becomes possible again,
// silently. That directory held the ONLY copy of the finding that first-admin setup could not
// succeed, while `check-index` printed "0 unindexed" about three directories elsewhere. Direction 3
// is the rule that a NEW directory must be decided about rather than merely unwatched, and it is
// the one direction the `--dir` fixture form cannot exercise — so without these it is checked by
// nothing at all.
//
// They run the guard BARE inside a synthetic repo, because that is the only invocation direction 3
// takes: with `--dir` it is skipped, which is what lets the fixture tests above stay hermetic.
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

function repoFixture(files) {
  const root = mkdtempSync(join(tmpdir(), "check-index-repo-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(join(root, dirname(rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  }
  execFileSync("git", ["add", "-A"], { cwd: root });
  return root;
}

const runBare = (root) =>
  spawnSync(process.execPath, [GUARD], { cwd: root, encoding: "utf8" });

test("DIRECTION 3 REFUSES a directory that is in neither list — the reports/audit case", () => {
  const root = repoFixture({
    "reports/evolution/INDEX.md": "# Index\n- [R1.md](R1.md)\n",
    "reports/evolution/R1.md": "# R1",
    "reports/night/INDEX.md": "# Index\n- [N1.md](N1.md)\n",
    "reports/night/N1.md": "# N1",
    "reports/parity/INDEX.md": "# Index\n- [P1.md](P1.md)\n",
    "reports/parity/P1.md": "# P1",
    "reports/proposals/INDEX.md": "# Index\n- [Q1.md](Q1.md)\n",
    "reports/proposals/Q1.md": "# Q1",
    // The offender: tracked reports in a directory nobody decided about.
    "reports/audit/CRITICAL.md": "# a finding with nothing watching it",
  });
  const r = runBare(root);
  assert.notEqual(r.status, 0, "an undeclared directory must FAIL");
  assert.match(r.stderr, /reports\/audit\//, "it must name the directory");
  assert.match(
    r.stderr,
    /NEITHER list/,
    "it must say why, not merely that something is wrong",
  );
});

test("DIRECTION 3 ACCEPTS a declared archive — a reason is a decision, and it is honoured", () => {
  const root = repoFixture({
    "reports/evolution/INDEX.md": "# Index\n- [R1.md](R1.md)\n",
    "reports/evolution/R1.md": "# R1",
    "reports/night/INDEX.md": "# Index\n- [N1.md](N1.md)\n",
    "reports/night/N1.md": "# N1",
    "reports/parity/INDEX.md": "# Index\n- [P1.md](P1.md)\n",
    "reports/parity/P1.md": "# P1",
    "reports/proposals/INDEX.md": "# Index\n- [Q1.md](Q1.md)\n",
    "reports/proposals/Q1.md": "# Q1",
    // `perf` is named in ARCHIVED with a reason, so an unindexed file here is EXPECTED.
    "reports/perf/frame-trace-2026-01.md": "# raw capture",
  });
  const r = runBare(root);
  assert.equal(
    r.status,
    0,
    `a declared archive must not fail; stderr: ${r.stderr}`,
  );
  assert.match(r.stdout, /declared ARCHIVE/, "the roll-up must count it as one");
});
