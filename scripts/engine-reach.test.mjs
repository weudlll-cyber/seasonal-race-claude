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
import {
  writeFileSync,
  readFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  engineReach,
  raceHull,
  driversOf,
  entryPoints,
  importSpecifiers,
  dynamicImportLiterals,
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

test("the real hull reaches the engine, and reaches it THROUGH a dependency", () => {
  const { files } = raceHull();
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

// ── ★ REPLACED BY HULL-FIX-1, AND WHAT IT USED TO SAY MATTERS ──────────────────────────────────
//
// This test asserted that the set contained NO `/screens/` file and exactly one camera file. That
// was a true description of `raceCore.js`'s import closure and a FALSE description of what can
// change a race: `client/src/screens/RaceScreen/index.jsx` is the product's own race setup, and it
// computes `raceParams.js`'s sprite geometry and applies `raceActionStage.js`'s brake, handing both
// to the engine as arguments. Breaking either moves both golden races. The old assertion had to be
// deleted to widen the hull — so it is REPLACED here by the property that actually needs guarding,
// rather than by nothing.
//
// WHAT STILL NEEDS GUARDING is the opposite failure: the hull must not become the blunt "everything"
// trigger under a new name. The line it may not cross is the rest of the application — the screens
// and services that never construct a race.
test("the hull stops SHORT of the whole application — it is not the blunt trigger renamed", () => {
  const { files } = raceHull();
  for (const stranger of [
    "client/src/App.jsx",
    "client/src/main.jsx",
    "client/src/screens/SetupScreen/SetupScreen.jsx",
    "client/src/screens/ResultScreen/ResultScreen.jsx",
  ]) {
    assert.ok(
      !files.includes(stranger),
      `${stranger} is in the hull — the up-step has stopped being one step`,
    );
  }
  // And the tracked source tree is much larger than the hull: if these ever meet, the tool has
  // stopped discriminating and every commit pays for a fingerprint.
  assert.ok(
    files.length < 400,
    `hull is ${files.length} files — that is no longer a discrimination`,
  );
});

test("★ the hull CONTAINS the five files that reach a race only as ARGUMENTS", () => {
  const { files } = raceHull();
  // Each was proven by sabotage to move a race while the old import-closure answer called it
  // outside. They are named here — the one place a name list is right — because each is a
  // MEASUREMENT that has been paid for, and a rule change that silently drops one must go red.
  for (const proven of [
    "client/src/modules/raceParams.js", // W_REF_MAX -> both golden races moved
    "client/src/modules/raceActionStage.js", // pulkLeaderBrake -> both golden races moved
    "client/src/modules/baseSpeedConfig.js", // normalSpeedPxPerSec -> shipped-arm outcome moved
    "client/src/modules/rowLayoutConfig.js", // rowGapMultiplier -> shipped-arm outcome moved
    "client/src/modules/racerNames.js", // one renamed racer -> shipped-arm outcome moved
  ]) {
    assert.ok(files.includes(proven), `${proven} must be in the hull`);
  }
});

test("★ every race construction goes through an entry point — the up-step's premise", () => {
  // The up-step finds DRIVERS by asking who imports an entry point. That is complete only while
  // every way of building a race runs through one. If a second engine entry ever appears — a
  // `createRace` somewhere else, a transcribed copy of the init — this fails, and the rule's
  // paragraph in engine-reach.mjs stops being true.
  const tracked = spawnSync("git", ["ls-files"], {
    encoding: "utf8",
    cwd: join(HERE, ".."),
    maxBuffer: 1 << 28,
  })
    .stdout.split("\n")
    .filter((f) => /\.(mjs|cjs|js|jsx)$/.test(f));
  const drivers = new Set(driversOf(entryPoints()).map((d) => resolve(d)));
  const entries = new Set(entryPoints().map((e) => resolve(e)));
  const offenders = [];
  for (const f of tracked) {
    const abs = join(HERE, "..", f);
    let src;
    try {
      src = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    // A CALL, not a mention: the name at a word boundary followed by `(`. A doc line that merely
    // says the name is not a construction, and a comment-only line is dropped first.
    const code = src
      .split("\n")
      .map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? "" : l))
      .join("\n");
    if (!/(^|[^\w.])(createRaceFromIdentity|runRaceHeadless)\s*\(/m.test(code))
      continue;
    if (drivers.has(resolve(abs)) || entries.has(resolve(abs))) continue;
    offenders.push(f);
  }
  assert.deepEqual(
    offenders,
    [],
    `these construct a race without importing an entry point, so the up-step cannot see them: ${offenders.join(", ")}`,
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

test("the UNFOLLOWABLE-import detector can fire — the completeness claim is checkable", () => {
  // A LITERAL specifier is followable however it is wrapped, so it is not the failure case: every
  // instrument in scripts/ reaches the engine through exactly this shape.
  assert.equal(hasDynamicImport("const m = await import('./x.js');"), false);
  assert.equal(hasDynamicImport('const m = await import(u("scripts/a.mjs"));'), false);
  assert.equal(hasDynamicImport("import { a } from './x.js';"), false);
  // A specifier that is NOT a literal cannot be followed at all — that is what must fire.
  assert.equal(hasDynamicImport("const m = await import(whereverThisGoes);"), true);
  assert.deepEqual(
    dynamicImportLiterals('await import(u(join(R, "client/a.js")));').literals,
    ["client/a.js"],
  );
  // ...and the real hull currently contains none, which is what makes a static walk complete.
  assert.deepEqual(raceHull().dynamic, []);
});

test("★ the hull is a SUPERSET of the entry closure — nothing may leave by widening", () => {
  const closure = engineReach(entryPoints()).files;
  const hull = new Set(raceHull().files);
  const lost = closure.filter((f) => !hull.has(f));
  assert.deepEqual(lost, [], `left the hull: ${lost.join(", ")}`);
  assert.ok(hull.size > closure.length, "the up-step found nothing at all");
});

test("★ the up-step finds drivers — a driverless hull is the OLD answer wearing the new name", () => {
  const { drivers } = raceHull();
  assert.ok(drivers.length > 3, `only ${drivers.length} driver(s) found`);
  // The product's own race setup is the one that must never be missing: it is where the shipped
  // race gets every argument it runs on.
  assert.ok(
    drivers.includes("client/src/screens/RaceScreen/index.jsx"),
    "RaceScreen/index.jsx is not a driver — the product path is invisible again",
  );
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

test("★ REFUSES on --check when the HULL itself came back broken, instead of answering 1", () => {
  // FOUND BY SABOTAGING THIS TOOL (HULL-FIX-1). The three floor checks — empty hull, no drivers, an
  // unfollowable dynamic import — sat BELOW the `--check` branch, so the one branch a caller acts on
  // was the one branch with no floor under it. A stubbed-empty hull answered "cannot reach the
  // engine at all" about `raceCore.js`, exit 1, which the pre-commit tripwire reads as "say nothing".
  //
  // REPRODUCED FOR REAL, not with a stub: the up-step reads `git ls-files`, so a run that cannot
  // execute `git` finds no drivers — which is precisely the "tree git cannot list" case the floor's
  // own message names. PATH is emptied and node is invoked by absolute path, the same technique
  // `client/src/modules/buildIdentityReason.test.js` uses for the same reason.
  const r = spawnSync(process.execPath, [CLI, "--check", "client/src/modules/raceCore.js"], {
    encoding: "utf8",
    cwd: join(HERE, ".."),
    env: { ...process.env, PATH: "", Path: "" },
  });
  // 2 is REFUSED. 1 would be a real negative answer about the ENGINE ITSELF, and that is the defect.
  assert.equal(r.status, 2, `expected REFUSED (2), got ${r.status}: ${r.stdout}${r.stderr}`);
  assert.match(r.stderr, /FAIL:/);
});

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

// ── REACH-ADVISORY-1: the advisory must agree with the routing about DATA paths ────────────────
//
// The line a human reads at commit time called every seed record "cannot reach the engine at all",
// because a JSON file has no imports and so can never be in an import closure. It said exactly that
// for a two-line edit to `server/seeds/tracks/garden-path.json` that MOVED ALL FOUR FINGERPRINTS.
// The routing side has been right since ENGINE-REACH-DATA-FIX-1; these assert that the advisory now
// asks it. Both directions can go red — see the report for the sabotage runs.

test("a CHANGED seed track record is reported as reaching, and named as DATA", () => {
  // Pinned to the commit before SEED-SNAPSHOT-1, in which this record demonstrably changed. Pinning
  // matters for the same reason the test above pins: against HEAD it is unchanged on a clean tree.
  const r = runCli(
    "--check",
    "--base=37a67b9c~1",
    "server/seeds/tracks/garden-path.json",
  );
  assert.equal(r.code, 0, "a changed seed record must be a positive answer");
  assert.match(r.out, /can change the race/);
  assert.match(r.out, /DATA — read by/, "it must say HOW it reaches, not merely that it does");
  assert.doesNotMatch(
    r.out,
    /cannot reach the engine at all/,
    "the sentence this repair exists to remove is back",
  );
});

test("an UNCHANGED seed record is neither a hit nor 'cannot reach at all'", () => {
  // The third fact: the engine reads it, and this diff does not touch it. Reporting it as a hit
  // would over-select; reporting it as unreachable is the original defect.
  const r = runCli("--check", "--base=HEAD", "server/seeds/tracks/garden-path.json");
  assert.equal(r.code, 1);
  assert.match(r.out, /DATA read by the engine but unchanged/);
  assert.doesNotMatch(r.out, /cannot reach the engine at all/);
});

test("data reach does NOT over-select: compose and Dockerfile stay outside", () => {
  // The other direction. `dataReach` returns only paths the engine's own closure NAMES, so a file
  // the engine never reads must still be reported as outside the hull however this is wired.
  const r = runCli("--check", "--base=HEAD", "docker-compose.yml", "server/Dockerfile");
  assert.equal(r.code, 1);
  assert.match(r.out, /cannot reach the engine at all/);
  assert.doesNotMatch(r.out, /DATA/, "neither file is data the engine reads");
});
