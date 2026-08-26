// ============================================================
// engine-reach.test.mjs — proof-of-live for the mint tripwire's trigger (VERIFY-COST-1)
//
// Run: node --test scripts/engine-reach.test.mjs
//
// The tripwire now triggers on a COMPUTED set rather than a folder, which is only an improvement if
// the computation cannot quietly shrink. These tests are the sabotage: they feed the walker a race
// core with a NEW import and require the closure to grow, because a trigger that stops growing is a
// trigger that stops firing.
//
// ONE TEST PER PROPERTY, not per file. Asserting the nineteen members by name would fail on every
// honest refactor and teach the next person to re-bless the list without reading it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  engineReach,
  importSpecifiers,
  hasDynamicImport,
} from "./engine-reach.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "engine-reach.mjs");

/** Run the script as a CLI and hand back its exit code and both streams. */
function runCli(...args) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    cwd: join(HERE, ".."),
  });
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
}

test("the real closure reaches the engine, and reaches it THROUGH a dependency", () => {
  const { files } = engineReach();
  // A direct import of raceCore: if this is missing the walk is not reading the real file.
  assert.ok(
    files.includes("client/src/modules/raceBehavior.js"),
    "raceBehavior.js",
  );
  // NOT a direct import — reached only via another engine input. This is the property the old
  // ENGINE_INPUT_MODULES list does not have, and the whole reason for computing a closure.
  assert.ok(
    files.includes("client/src/modules/autoSpriteScale.js"),
    "autoSpriteScale.js",
  );
  assert.ok(files.length > 10, `closure suspiciously small: ${files.length}`);
});

test("the closure EXCLUDES presentation code — otherwise it saves nothing", () => {
  const { files } = engineReach();
  const camera = files.filter((f) => f.includes("/modules/camera/"));
  // lapUtils is the one camera file the engine genuinely reads; anything else would mean the
  // closure has swallowed the camera and the trigger is the blunt one again under a new name.
  assert.deepEqual(camera, ["client/src/modules/camera/lapUtils.js"]);
  assert.ok(
    !files.some((f) => f.includes("/screens/")),
    "no screen code should be reachable",
  );
});

test("SABOTAGE: a new engine import makes the closure GROW", () => {
  const dir = mkdtempSync(join(tmpdir(), "reach-"));
  try {
    mkdirSync(join(dir, "sub"), { recursive: true });
    writeFileSync(join(dir, "leaf.js"), "export const a = 1;\n");
    writeFileSync(join(dir, "sub", "added.js"), "export const b = 2;\n");
    writeFileSync(join(dir, "core.js"), "import { a } from './leaf.js';\n");
    const before = engineReach(join(dir, "core.js")).files;
    writeFileSync(
      join(dir, "core.js"),
      "import { a } from './leaf.js';\nimport { b } from './sub/added.js';\n",
    );
    const after = engineReach(join(dir, "core.js")).files;
    assert.equal(
      after.length,
      before.length + 1,
      "the new import must appear in the closure",
    );
    assert.ok(after.some((f) => f.endsWith("sub/added.js")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SABOTAGE: a TRANSITIVE import is followed, not just the direct one", () => {
  const dir = mkdtempSync(join(tmpdir(), "reach-"));
  try {
    writeFileSync(join(dir, "deep.js"), "export const c = 3;\n");
    writeFileSync(join(dir, "mid.js"), "import { c } from './deep.js';\n");
    writeFileSync(
      join(dir, "core.js"),
      "import './mid.js';\nimport { c } from './mid.js';\n",
    );
    const { files } = engineReach(join(dir, "core.js"));
    assert.ok(
      files.some((f) => f.endsWith("deep.js")),
      "two hops must be followed",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the dynamic-import detector can fire — the completeness claim is checkable", () => {
  assert.equal(hasDynamicImport("const m = await import('./x.js');"), true);
  assert.equal(hasDynamicImport("import { a } from './x.js';"), false);
  // ...and the real closure currently contains none, which is what makes a static walk complete.
  assert.deepEqual(engineReach().dynamic, []);
});

test("the specifier parser ignores bare package imports", () => {
  const specs = importSpecifiers(
    "import a from 'react';\nimport b from './local.js';\n",
  );
  assert.deepEqual(specs, ["./local.js"]);
});


// ── REACH-REFUSES-1: A TOOL THAT CANNOT SEE THE DIFF MUST REFUSE, NOT ANSWER ZERO ───────────────
//
// These four are the guard on the exit-code CONTRACT, which is the part a caller acts on:
//   0 = at least one path carries a reaching change
//   1 = a real negative answer
//   2 = REFUSED, nothing was examined
//
// IF DELETED: exit 2 can silently become exit 1 again — the whole defect, restored, and invisible
// because both are "non-zero" to a shell `if`. WHAT WOULD GO UNNOTICED: a caller that substituted
// an empty path list being told "nothing can reach the engine" and skipping a mint on that basis.

test("REFUSES when --check is given no paths at all", () => {
  const r = runCli("--check");
  assert.equal(r.code, 2, "an empty path list must REFUSE (2), not answer no (1)");
  assert.match(r.err, /REFUSED/);
  assert.match(r.err, /no paths/i);
  // AND IT MUST NOT ANSWER. The old clearance sentence went to stdout with exit 1; a refusal
  // writes to stderr and leaves stdout empty, so there is nothing for a caller to parse as a
  // verdict. (The message QUOTES that sentence in order to explain it — hence stdout, not both.)
  assert.equal(r.out.trim(), "", "a refusal must print no answer on stdout");
});

test("REFUSES when --check is followed only by flags — the same empty list, wearing a hat", () => {
  const r = runCli("--check", "--base=master");
  assert.equal(r.code, 2);
  assert.match(r.err, /REFUSED/);
});

test("REFUSES when the --base ref does not resolve, instead of counting every path as a hit", () => {
  const r = runCli(
    "--check",
    "client/src/modules/raceCore.js",
    "--base=definitely-not-a-ref-fbb01d",
  );
  assert.equal(r.code, 2, "an unresolvable base must REFUSE");
  assert.match(r.err, /REFUSED/);
  assert.match(r.err, /does not resolve/);
});

test("a path OUTSIDE the hull still gets a real answer (1), not a refusal", () => {
  // THE OTHER DIRECTION, and it is the one that matters: making the tool refuse is only an
  // improvement if it still ANSWERS every question it can actually answer. A doc has no path to
  // the engine, and saying so is a legitimate negative — exit 1, not exit 2.
  const r = runCli("--check", "docs/BACKLOG.md");
  assert.equal(r.code, 1, "an honest negative must stay exit 1");
  assert.match(r.out, /outside the hull/);
});

test("the negative message separates NOT-IN-THE-HULL from IN-THE-HULL-BUT-UNCHANGED", () => {
  // These are different facts and used to print as one sentence: "none of N path(s) can reach the
  // race engine" was said about `defaults.js`, which can reach the engine from anywhere. That
  // sentence is what taught a reader the tool was doing something other than what it does.
  // `--base=HEAD` IS LOAD-BEARING, and it is here because this test failed for a reason that had
  // nothing to do with what it asserts. Without a base, `--check` reads the WORKING TREE against the
  // branch point, so `defaults.js` counts as CHANGED on any branch that legitimately edits a default
  // — the tool then answers 0 (a real positive) and the assertion below reads it as a regression.
  // LEADER-LATERAL-BUILD-1 added two camera keys and turned this red without touching engine-reach at
  // all. The scenario the test wants is IN-THE-HULL-BUT-UNCHANGED, so it has to PIN the comparison to
  // a tree in which that path is unchanged; against HEAD it always is, whatever the branch is doing.
  const r = runCli(
    "--check",
    "--base=HEAD",
    "docs/BACKLOG.md",
    "client/src/modules/storage/defaults.js",
  );
  assert.equal(r.code, 1);
  assert.match(r.out, /carry a change that can reach/);
  assert.doesNotMatch(
    r.out,
    /none of \d+ path\(s\) can reach the race engine/,
    "the old conflated sentence is back",
  );
});
