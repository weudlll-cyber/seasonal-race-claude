// ============================================================
// check-tags.test.mjs — proof-of-live for the check-tags guard (Lesson 187).
//
// Run: node --test scripts/check-tags.test.mjs
//
// Feeds the guard a synthetic `git ls-remote --tags` payload (via --tags-file, so no network) and a
// synthetic TAGS.md: a fixture with a KNOWN unregistered tag asserts non-zero exit naming the tag +
// commit; a clean fixture asserts exit zero (and that dereferenced "^{}" lines are ignored); an
// empty tag list asserts the loud-failure rule (a checkout without tags must FAIL, never bless).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "check-tags.mjs");
const REPO = join(HERE, "..");
import { KEPT_BRANCHES } from "./check-tags.mjs";

// Synthetic `git ls-remote --tags origin` output; the "^{}" line is a dereferenced annotated tag
// the guard must skip (so this is TWO tags, not three).
const LS_REMOTE =
  [
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\trefs/tags/pre/alpha",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\trefs/tags/pre/beta",
    "cccccccccccccccccccccccccccccccccccccccc\trefs/tags/pre/beta^{}",
  ].join("\n") + "\n";

// One head, master, resolved from this repository so its TREE is real. Used by every test that is
// not about Rule B, so those tests keep asking exactly the question they were written to ask.
const DEFAULT_HEADS = (() => {
  const dir = mkdtempSync(join(tmpdir(), "check-tags-heads-"));
  const sha = execSync("git rev-parse master", {
    cwd: REPO,
    encoding: "utf8",
  }).trim();
  const p = join(dir, "heads.txt");
  writeFileSync(p, `${sha}	refs/heads/master
`);
  return p;
})();

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "check-tags-"));
  const paths = {};
  for (const [name, content] of Object.entries(files)) {
    const p = join(dir, name);
    writeFileSync(p, content);
    paths[name] = p;
  }
  return paths;
}

// RULE B made this guard ask origin for BRANCHES as well as tags, so every test now pins the head
// list too. Without it the tag tests would silently depend on whatever branches happen to stand at
// origin while they run — green today by luck, and a network call inside a unit test either way.
const runGuard = (tagsFile, tagsMd, headsFile = DEFAULT_HEADS) =>
  spawnSync(
    process.execPath,
    [
      GUARD,
      `--tags-file=${tagsFile}`,
      `--tags-md=${tagsMd}`,
      `--heads-file=${headsFile}`,
    ],
    {
      encoding: "utf8",
    },
  );

test("check-tags FAILS and names the tag + commit when a tag is unregistered", () => {
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md": "# Tags\n- `pre/alpha` registered\n", // pre/beta deliberately missing
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"]);
  assert.notEqual(
    r.status,
    0,
    "guard must exit non-zero on an unregistered tag",
  );
  assert.match(
    r.stderr,
    /pre\/beta -> bbbbbbb/,
    "guard must name the tag and its short commit",
  );
  assert.doesNotMatch(
    r.stderr,
    /pre\/alpha ->/,
    "the registered tag must NOT be flagged",
  );
});

test("check-tags PASSES when every origin tag is registered (^{} lines ignored)", () => {
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md": "# Tags\n- `pre/alpha`\n- `pre/beta`\n",
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"]);
  assert.equal(
    r.status,
    0,
    `guard must exit zero when all registered; stderr: ${r.stderr}`,
  );
  assert.match(r.stdout, /2 origin tags checked, 0 unregistered/);
});

test("check-tags requires an EXACT token — a longer tag in the register does not satisfy a shorter one", () => {
  // Origin has `pre/motion`; the register names only `pre/motion-2`. Substring matching would wrongly
  // pass; whole-token matching must FAIL and name pre/motion.
  const p = fixture({
    "ls-remote.txt":
      "dddddddddddddddddddddddddddddddddddddddd\trefs/tags/pre/motion\n",
    "TAGS.md": "# Tags\n- `pre/motion-2` (a different, longer tag)\n",
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"]);
  assert.notEqual(r.status, 0, "a longer tag must not satisfy the shorter one");
  assert.match(
    r.stderr,
    /pre\/motion -> ddddddd/,
    "the shorter tag must be reported unregistered",
  );
});

test("check-tags FAILS LOUDLY when the tag list is empty (a checkout without tags, Lesson 187)", () => {
  const p = fixture({ "empty.txt": "", "TAGS.md": "# Tags\n" });
  const r = runGuard(p["empty.txt"], p["TAGS.md"]);
  assert.notEqual(r.status, 0, "empty tag list must FAIL, never bless");
  assert.match(r.stderr, /EMPTY/i);
});

// ── DIRECTION 2: REGISTER -> ORIGIN (TAG-GUARD-2) ────────────────────────────────────────────────
// Per Lesson 187 the FAILING case is proved first: a guard that cannot fail is not a guard, and this
// direction was blind for weeks precisely because it was green the whole time.

test("check-tags FAILS and names the entry when a DECLARED tag does not exist at origin", () => {
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    // pre/ghost is declared in the register's own registration form but exists on no machine —
    // the exact incident this direction was added for.
    "TAGS.md":
      "# Tags\n" +
      "- `pre/alpha`\n" +
      "- `pre/beta`\n" +
      "- `pre/ghost` (`deadbee`, 2026-08-05) — a return point that was never pushed\n",
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"]);
  assert.notEqual(
    r.status,
    0,
    "guard must exit non-zero on a declared-but-absent tag",
  );
  assert.match(
    r.stderr,
    /pre\/ghost -> declared at/,
    "guard must name the phantom tag",
  );
  assert.match(r.stderr, /do NOT exist at origin/);
  assert.doesNotMatch(
    r.stderr,
    /pre\/alpha -> declared/,
    "a real tag must not be flagged",
  );
});

test("a declaration under a RETIRED heading does NOT fail — collapsed tags are history, explicitly", () => {
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md":
      "# Tags\n" +
      "- `pre/alpha`\n" +
      "- `pre/beta`\n" +
      "## Retired tags (collapsed onto the phase endpoint)\n" +
      "- `pre/ghost` (`deadbee`, 2026-07-01) — collapsed by owner-approved keep-list\n",
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"]);
  assert.equal(
    r.status,
    0,
    `a retired declaration must not fail; stderr: ${r.stderr}`,
  );
});

test("the same exclusion applies to a COLLAPSED heading, and it is the HEADING that decides", () => {
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md":
      "# Tags\n" +
      "- `pre/alpha`\n" +
      "- `pre/beta`\n" +
      "### Parity phase — COLLAPSED (2026-07-25)\n" +
      "- `pre/ghost` (`deadbee`, 2026-07-25) — collapsed\n" +
      "## Permanent anchors\n" +
      "- `pre/second-ghost` (`f00ba12`, 2026-08-05) — NOT under a retired heading, so it must fail\n",
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"]);
  assert.notEqual(
    r.status,
    0,
    "leaving the retired section must re-arm the check",
  );
  assert.match(r.stderr, /pre\/second-ghost -> declared at/);
  assert.doesNotMatch(
    r.stderr,
    /pre\/ghost -> declared/,
    "the collapsed one must stay excluded",
  );
});

test("PROSE MENTIONS ARE NOT DECLARATIONS — a branch name in running text must not fail the build", () => {
  // The whole reason this is not a name scan: a tag name and a BRANCH name are indistinguishable.
  // `exp/company-only` is a branch the register discusses at length; it must never be mistaken for a
  // registered tag. Measured on the real register, a name-shaped scan is 77% false positives.
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md":
      "# Tags\n" +
      "- `pre/alpha`\n" +
      "- `pre/beta`\n" +
      "The branch `exp/company-only` was archived before deletion, and `pre/greenfield-proto`\n" +
      "was handled the same way. See also `backup/never-existed` in the prose above.\n",
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"]);
  assert.equal(
    r.status,
    0,
    `prose mentions must not fail; stderr: ${r.stderr}`,
  );
  assert.match(r.stdout, /0 declared in the register/);
});

test("a declaration without a backticked SHA is not a declaration — the sha is what makes it one", () => {
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md":
      "# Tags\n- `pre/alpha`\n- `pre/beta`\n- `pre/ghost` — mentioned, never declared\n",
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"]);
  assert.equal(
    r.status,
    0,
    `a bare list mention must not fail; stderr: ${r.stderr}`,
  );
});

// ══ RULE B ══════════════════════════════════════════════════════════════════════════════════════
//
// The heads fixture feeds real SHAs, because Rule B judges TREES and a fake sha has no tree. The
// shas below are resolved from this repository at run time: `master` (whose tree is trivially its
// own) and a commit built for the test. That keeps the test hermetic in the only sense that matters
// here — no network — while still exercising the real `git ls-tree` comparison.

const sh = (cmd) => execSync(cmd, { cwd: REPO, encoding: "utf8" }).trim();
const headsFixture = (entries) =>
  entries.map(([sha, name]) => `${sha}\trefs/heads/${name}`).join("\n") + "\n";

test("RULE B: a branch whose TREE master already holds FAILS the guard", () => {
  const master = sh("git rev-parse master");
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md": "# Tags\n- `pre/alpha`\n- `pre/beta`\n",
    // A branch pointing AT master has, by definition, a tree master holds.
    "heads.txt": headsFixture([
      [master, "master"],
      [master, "leftover/merged-and-not-deleted"],
    ]),
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"], p["heads.txt"]);
  assert.notEqual(r.status, 0, "a contained branch must fail the build");
  assert.match(r.stderr, /leftover\/merged-and-not-deleted/);
  assert.match(r.stderr, /TREE master already holds/);
});

test("RULE B: a branch whose tree holds a path master lacks is NOT reported", () => {
  const master = sh("git rev-parse master");
  // Built with plumbing so no working tree or index is touched.
  const blob = sh('echo probe | git hash-object -w --stdin');
  const idx = join(tmpdir(), `rb-idx-${process.pid}`);
  execSync(`git read-tree ${master}`, { cwd: REPO, env: { ...process.env, GIT_INDEX_FILE: idx } });
  execSync(`git update-index --add --cacheinfo 100644,${blob},RULE-B-PROBE.md`, {
    cwd: REPO,
    env: { ...process.env, GIT_INDEX_FILE: idx },
  });
  const tree = execSync("git write-tree", {
    cwd: REPO,
    encoding: "utf8",
    env: { ...process.env, GIT_INDEX_FILE: idx },
  }).trim();
  const commit = sh(`git commit-tree ${tree} -p ${master} -m probe`);
  rmSync(idx, { force: true });

  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md": "# Tags\n- `pre/alpha`\n- `pre/beta`\n",
    "heads.txt": headsFixture([
      [master, "master"],
      [commit, "feat/live-work"],
    ]),
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"], p["heads.txt"]);
  assert.equal(r.status, 0, "live work must not be reported as deletable");
  assert.doesNotMatch(r.stderr, /feat\/live-work/);
  assert.match(r.stdout, /RULE B: 2 head\(s\) at origin; 0 whose TREE/);
});

test("RULE B: a KEPT branch is exempt, and the exemption is PRINTED when granted", () => {
  const master = sh("git rev-parse master");
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md": "# Tags\n- `pre/alpha`\n- `pre/beta`\n",
    "heads.txt": headsFixture([[master, "master"]]),
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"], p["heads.txt"]);
  // The shipped list is EMPTY, which is the state this rule ships in. The assertion is that the
  // mechanism prints rather than that any entry exists — an exemption nobody sees is the failure
  // mode R11 names.
  assert.equal(KEPT_BRANCHES.length, 0, "the keep list ships empty");
  assert.match(r.stdout, /RULE B: 1 head\(s\) at origin/);
  assert.equal(r.status, 0);
});

test("RULE B: an empty head list FAILS rather than blessing (Lesson 187)", () => {
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md": "# Tags\n- `pre/alpha`\n- `pre/beta`\n",
    "heads.txt": "\n",
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"], p["heads.txt"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /cannot see the branches must break the build/);
});

test("RULE B: a branch whose tree is unavailable is UNJUDGED, not a failure", () => {
  const master = sh("git rev-parse master");
  const p = fixture({
    "ls-remote.txt": LS_REMOTE,
    "TAGS.md": "# Tags\n- `pre/alpha`\n- `pre/beta`\n",
    // A sha this repository does not have: it cannot be judged, and crying wolf at a run that has
    // simply not fetched is the failure mode this avoids.
    "heads.txt": headsFixture([
      [master, "master"],
      ["0".repeat(40), "someone-elses/branch"],
    ]),
  });
  const r = runGuard(p["ls-remote.txt"], p["TAGS.md"], p["heads.txt"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /UNJUDGED someone-elses\/branch/);
});
