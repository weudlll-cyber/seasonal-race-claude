// ============================================================
// verify.test.mjs — the verifier picks the right work, and SAYS what it skipped (VERIFY-FAST-1)
//
// Run: node --test scripts/verify.test.mjs
//
// WHAT BREAKS IF THIS IS DELETED: a verifier that quietly stops choosing a guard is indistinguishable
// from one that is passing. That is the failure this project has already paid for twice — an
// instrument whose coverage had silently shrunk (the render window) and one whose failure carried no
// information (the build badge). The routing is the whole product here, so the routing is what is
// tested.
//
// PROPERTIES, NOT INSTANCES (R7). These assert "a diff of kind X selects guard Y and gives a reason",
// not the exact wording of any reason — wording changes on every honest edit and would teach the next
// person to re-bless assertions without reading them.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  plan,
  ROUTES,
  cheapArgs,
  describeEmptyRun,
  EXIT_REFUSED,
} from "./verify.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

// THE ROUTING TESTS ASSERT HULL MEMBERSHIP, so they stub the inert splitter. The paths they pass
// are synthetic — byte-identical to the base — which the REAL splitter correctly reports as inert;
// without this stub these tests would quietly become tests of the INERT rule while claiming to
// test the route table. The inert rule has its own tests on real content
// (scripts/lib/inertChange.test.mjs) plus the two both-direction cases at the end of this file.
const NOTHING_INERT = (paths) => ({ hit: paths, inert: [] });
const pick = (files, id) =>
  plan(files, "master", NOTHING_INERT).find((t) => t.id === id);
const runs = (files, id) => pick(files, id).run;

test("a docs-only diff selects the doc guards and NOTHING expensive", () => {
  const files = ["docs/VERIFY-RULES.md", "reports/evolution/X.md"];
  assert.equal(runs(files, "doc-guards"), true);
  for (const id of [
    "client-suite",
    "world-fingerprint",
    "camera-fingerprint",
    "render-fingerprint",
  ])
    assert.equal(runs(files, id), false, id);
});

test("a scripts diff selects the script suite, and does not drag in the client suite", () => {
  const files = ["scripts/verify.mjs"];
  assert.equal(runs(files, "script-suite"), true);
  assert.equal(runs(files, "client-suite"), false);
});

test("THE ENGINE GATE: a client file inside the closure selects the world fingerprint", () => {
  // raceBehavior.js is inside engine-reach's closure — this is the case the mint tripwire exists for.
  assert.equal(
    runs(["client/src/modules/raceBehavior.js"], "world-fingerprint"),
    true,
  );
});

test("...and a client file OUTSIDE the closure does not — the saving, and its L203 pair", () => {
  // A camera file cannot be read by the race, so the world fingerprint has no question to answer.
  const files = ["client/src/modules/camera/finishPhase.js"];
  assert.equal(runs(files, "world-fingerprint"), false);
  // The pair: the SAME kind of path inside the closure does select it, so this is not just "the
  // world fingerprint never runs".
  assert.equal(
    runs(["client/src/modules/raceStep.js"], "world-fingerprint"),
    true,
  );
});

test("a camera diff selects the camera fingerprint and the client suite", () => {
  const files = ["client/src/modules/camera/CameraDirector.js"];
  assert.equal(runs(files, "camera-fingerprint"), true);
  assert.equal(runs(files, "client-suite"), true);
});

test("a drawing-path diff selects the render fingerprint; a non-drawing client diff does not", () => {
  assert.equal(
    runs(
      ["client/src/screens/RaceScreen/renderRaceFrame.js"],
      "render-fingerprint",
    ),
    true,
  );
  assert.equal(
    runs(["client/src/modules/storage/storage.js"], "render-fingerprint"),
    false,
  );
});

test("EVERY guard carries a reason, whether it runs or not — a skip is a decision", () => {
  for (const files of [[], ["docs/a.md"], ["client/src/modules/raceCore.js"]]) {
    for (const t of plan(files)) {
      assert.equal(typeof t.reason, "string", t.id);
      assert.ok(t.reason.length > 0, `${t.id} has an empty reason`);
    }
  }
});

test("an EMPTY diff runs nothing at all — including containment, which matches paths, not runs", () => {
  // Worth pinning precisely, because I got it wrong first: `fingerprint-containment` matches EVERY
  // path, but matching is applied to the changed-file list, so an empty diff selects it too. That
  // is coherent — nothing changed, so nothing can have introduced a stray copy — but it means the
  // guard is "runs whenever anything changed", not "always runs". The distinction is the whole
  // difference between a claim that is true and one that sounds true.
  const p = plan([]);
  assert.deepEqual(
    p.filter((t) => t.run).map((t) => t.id),
    [],
  );
  assert.equal(
    p.length,
    ROUTES.length,
    "the plan must list every route, run or not",
  );
});

test("ANY single changed file, of any kind, selects containment", () => {
  // The pair to the test above, and the one that carries the guarantee: one touched file anywhere
  // is enough. Together they say exactly when it runs.
  assert.equal(runs(["README.md"], "fingerprint-containment"), true);
  assert.equal(runs(["server/index.js"], "fingerprint-containment"), true);
});

// ── THE ROUTE TABLE, BOTH DIRECTIONS (ONE-TRUTH-1 stage 3) ────────────────────────────────────
//
// Three representative paths, each asserted in BOTH directions: the path that MUST select a guard,
// and a sibling path that must NOT. A one-direction test would pass against a matcher that selects
// everything, which is the failure mode opposite to the three we actually had.

test("CONFIG FILE: client/vitest.config.js selects the client suite — and reports/ does not", () => {
  // THE THIRD MISS. It is in no source directory, and it decides how the entire suite runs.
  assert.equal(runs(["client/vitest.config.js"], "client-suite"), true);
  assert.equal(runs(["reports/evolution/X.md"], "client-suite"), false);
});

test("CAMERA: a camera file selects camera AND render — and a storage file selects neither", () => {
  const cam = ["client/src/modules/camera/CameraDirector.js"];
  assert.equal(runs(cam, "camera-fingerprint"), true);
  assert.equal(runs(cam, "render-fingerprint"), true);
  const storage = ["client/src/modules/storage/storage.js"];
  assert.equal(runs(storage, "camera-fingerprint"), false);
  assert.equal(runs(storage, "render-fingerprint"), false);
});

test("ENGINE: a file in the reach hull selects the world fingerprint — a camera file does not", () => {
  assert.equal(
    runs(["client/src/modules/raceStep.js"], "world-fingerprint"),
    true,
  );
  assert.equal(
    runs(["client/src/modules/camera/finishPhase.js"], "world-fingerprint"),
    false,
  );
});

test("ROUTED NOWHERE: the paths the table deliberately ignores select nothing at all", () => {
  for (const f of [
    "server/index.js",
    ".github/workflows/ci.yml",
    "client/e2e/smoke.spec.js",
    "package-lock.json",
  ]) {
    // `fingerprint-containment` is excluded: it is deliberately always-on, so "routes nowhere"
    // means "selects no guard that CAN be skipped". Excluding it here rather than weakening the
    // assertion keeps the test able to catch a matcher that has quietly widened.
    const selected = plan([f])
      .filter((t) => t.run && t.id !== "fingerprint-containment")
      .map((t) => t.id);
    assert.deepEqual(
      selected,
      [],
      `${f} should route nowhere, got ${selected.join(",")}`,
    );
  }
});

test("THE MAP IS ONE TABLE, and every rule states what it covers", () => {
  // If a guard is ever added to the runner without a route, this fails — which is the whole point
  // of having one table rather than five predicates.
  assert.ok(ROUTES.length >= 6);
  for (const r of ROUTES) {
    assert.equal(typeof r.guard, "string");
    assert.ok(
      r.what && r.what.length > 10,
      `${r.guard} must say what it covers`,
    );
    assert.equal(typeof r.match, "function");
  }
  const ids = plan([]).map((t) => t.id);
  assert.deepEqual(
    ids,
    ROUTES.map((r) => r.guard),
    "plan() must come from the table, in order",
  );
});

test("A SKIP NAMES THE RULE, so the map is visible without reading the code", () => {
  for (const t of plan([])) {
    assert.match(t.reason, /nothing matched — this guard covers:/);
    assert.ok(
      t.reason.length > 40,
      `${t.id}'s skip reason must name what it covers`,
    );
  }
});

// ── THE FINGERPRINT RECORD ROUTES ITSELF (ONE-TRUTH-1 stage 4) ─────────────────────────────────

test("THE RECORD selects the doc guards; a husky hook no longer does (ONE-TRUTH-2)", () => {
  // ONE-TRUTH-1 routed `.husky/pre-commit` here because it CARRIED a fingerprint. ONE-TRUTH-2
  // deleted that copy, so the reason is gone and so is the route. The record itself still selects
  // the doc guards, because editing it is a documentation act.
  assert.equal(runs(["docs/fingerprints.json"], "doc-guards"), true);
  assert.equal(runs([".husky/pre-commit"], "doc-guards"), false);
});

test("FINGERPRINT CONTAINMENT runs for EVERYTHING, including paths routed nowhere else", () => {
  // The one guard with no skip condition. A stray copy can be pasted into any file at all, so any
  // path that selected nothing would be a hole. Asserted against paths the table deliberately
  // ignores everywhere else — if those select it, the always-on rule is genuinely always on.
  for (const f of [
    "server/index.js",
    ".github/workflows/ci.yml",
    "client/e2e/smoke.spec.js",
    "package-lock.json",
    "reports/evolution/X.md",
  ]) {
    assert.equal(
      runs([f], "fingerprint-containment"),
      true,
      `${f} must select containment`,
    );
  }
});

// ── THE INERT RULE, BOTH DIRECTIONS (VERIFY-COST-2) ────────────────────────────────────────────
//
// The world fingerprint is 229 s and it ran, on the night this was added, for a paragraph of prose
// in a hull file. A hull change whose tokens are identical cannot move it. These two are the pair:
// a rule that only ever says "skip" would be worse than no rule at all.

test("a hull file whose edit is COMMENTS ONLY does not select the world fingerprint", () => {
  const inertOne = (paths) => ({
    hit: [],
    inert: paths.map((p) => ({ path: p, reason: "comments only" })),
  });
  const p = plan(["client/src/modules/raceStep.js"], "master", inertOne);
  const wf = p.find((t) => t.id === "world-fingerprint");
  assert.equal(wf.run, false);
  // …and the skip NAMES the file and the reason, so it can never be a silent saving.
  assert.match(wf.reason, /INERT/);
  assert.match(wf.reason, /raceStep\.js/);
});

test("…and the SAME file with a real edit still selects it — the pair that makes the rule a rule", () => {
  const nothingInert = (paths) => ({ hit: paths, inert: [] });
  const p = plan(["client/src/modules/raceStep.js"], "master", nothingInert);
  assert.equal(p.find((t) => t.id === "world-fingerprint").run, true);
});

// ── VERIFY-COST-3: THE FLAGS ────────────────────────────────────────────────────────────────────
// Two defects, one shape. `--cheap` was read by this script and never forwarded to the jobs it
// spawns, so it silently ran the full thing; and an argument the script did not understand was
// accepted and ignored, which is why nobody noticed for weeks. The second is the general one — three
// instruments in this project have now been caught accepting an argument they do nothing with.

test("--cheap reaches the fingerprint jobs, which is what it never did", () => {
  assert.deepEqual(
    cheapArgs(false, null),
    [],
    "off means nothing is forwarded",
  );
  assert.deepEqual(cheapArgs(true, null), ["--cheap"]);
  assert.deepEqual(cheapArgs(true, "city-circuit"), [
    "--cheap",
    "--cheap-track=city-circuit",
  ]);
});

test("an unknown flag is REFUSED, not ignored", () => {
  const argv = ["--cheap", "--chpea"];
  const known = {
    value: ["base", "jobs", "cheap-track"],
    bare: ["dry", "no-format", "cheap"],
  };
  // The same predicate the script applies, asserted on the case that actually happened: a typo.
  const bad = argv.filter((a) => {
    const eq = a.indexOf("=");
    const name = eq === -1 ? a.slice(2) : a.slice(2, eq);
    return eq === -1 ? !known.bare.includes(name) : !known.value.includes(name);
  });
  assert.deepEqual(
    bad,
    ["--chpea"],
    "the typo is caught and the real flag is not",
  );
});

// ── VERIFY-BASE-1: A RUN THAT VERIFIED NOTHING MUST NOT EXIT 0 ──────────────────────────────────
//
// WHAT BREAKS IF THESE ARE DELETED: `npm run verify` on master goes back to printing
// PASS 0 / FAIL 0 / SKIP 7 and exiting 0 — a green tick over seven guards that were each correctly
// told they had nothing to look at. It is stated in CONSEQUENCE form deliberately: the property is
// not "describeEmptyRun returns a string", it is "a routing that selects zero guards is a failure".

test("CONSEQUENCE: a routing that selects zero guards means nothing will run", () => {
  // The empty diff is the case that shipped green. `plan([])` is what the main block acts on, so
  // this asserts the fact the refusal is derived from rather than the refusal's own wording.
  const tasks = plan([], "master", NOTHING_INERT);
  const chosen = tasks.filter((t) => t.run);
  assert.equal(chosen.length, 0, "an empty diff selects no guard");
  assert.ok(
    tasks.length > 0,
    "…yet every guard is present and accounted for as a SKIP",
  );
  // And the inverse, so the test cannot pass by plan() being broken into always-empty.
  const one = plan(["docs/X.md"], "master", NOTHING_INERT).filter((t) => t.run);
  assert.ok(
    one.length > 0,
    "a single changed file must still select something",
  );
});

test("CONSEQUENCE: being ON the base is diagnosed as such, not as 'nothing changed'", () => {
  // The SHIP-THE-LINE case exactly: on master, base and HEAD are one commit.
  const r = describeEmptyRun({
    base: "master",
    baseExists: true,
    hasMergeBase: true,
    baseSha: "1ea3a6bbdeadbeef",
    headSha: "1ea3a6bbdeadbeef",
    fileCount: 0,
    suggest: "c5099b3a",
  });
  assert.match(r.headline, /same commit/i, "it names the real cause");
  // The remedy must be runnable, not advice: a concrete ref the caller can paste.
  assert.ok(
    r.remedy.some((x) => x.includes("--base=c5099b3a")),
    "it offers the actual command with a real ref",
  );
});

test("each empty-run cause gets its OWN diagnosis — they are not one message", () => {
  const base = {
    base: "nope",
    baseExists: true,
    hasMergeBase: true,
    baseSha: "a",
    headSha: "b",
    fileCount: 0,
  };
  const unresolved = describeEmptyRun({ ...base, baseExists: false });
  const unrelated = describeEmptyRun({ ...base, hasMergeBase: false });
  const nothing = describeEmptyRun(base);
  const heads = [unresolved.headline, unrelated.headline, nothing.headline];
  assert.equal(new Set(heads).size, 3, "three causes, three headlines");
  assert.match(unresolved.headline, /does not resolve/i);
  assert.match(unrelated.headline, /no history/i);
  assert.match(nothing.headline, /nothing has changed/i);
});

test("a NON-empty run is never described as empty — the refusal cannot fire on honest work", () => {
  // The safety direction. If this ever fails, the refusal has started rejecting real runs, which
  // would be a worse defect than the one it was built to fix.
  for (const files of [
    ["docs/X.md"],
    ["client/src/a.js"],
    ["scripts/x.mjs"],
    ["server/y.js"],
  ]) {
    const chosen = plan(files, "master", NOTHING_INERT).filter((t) => t.run);
    assert.ok(chosen.length > 0, `${files[0]} must select at least one guard`);
  }
});

test("END TO END: verify itself exits non-zero when its plan is empty", () => {
  // The unit tests above assert the DECISION. This asserts the CONSEQUENCE — the exit code, which is
  // the thing that was wrong: seven correct skips and a green tick.
  //
  // IT BUILDS A THROWAWAY REPO, and that is not ceremony. The first version of this test asked the
  // REAL repo about `--base=HEAD` and asserted "exit 2 if the tree is clean, exit 0 if it is dirty".
  // That is honest but useless: during development the tree is always dirty, so the branch that
  // matters was never taken, and TWO sabotages — deleting the refusal, and making it exit 0 —
  // both passed green locally. A test whose important direction only runs in CI is a test that
  // teaches you to trust a local green.
  //
  // git reads GIT_DIR/GIT_WORK_TREE ahead of the cwd, so verify can be pointed at a clean one-commit
  // repository while still running from this one. Its plan is then empty BY CONSTRUCTION, whatever
  // the developer's tree looks like. `engineReach()` reads source through the filesystem, not git,
  // so the route table is still the real one.
  const tmp = mkdtempSync(join(tmpdir(), "ra-verify-base-"));
  try {
    const git = (...a) =>
      execFileSync("git", a, { cwd: tmp, encoding: "utf8" }).trim();
    git("init", "--quiet");
    git("config", "user.email", "t@example.invalid");
    git("config", "user.name", "t");
    writeFileSync(join(tmp, "seed.txt"), "one commit so HEAD resolves");
    git("add", "-A");
    git("commit", "--quiet", "-m", "seed");
    const head = git("rev-parse", "HEAD");
    const env = {
      ...process.env,
      GIT_DIR: join(tmp, ".git"),
      GIT_WORK_TREE: tmp,
    };

    // Both readings of "nothing to do": only-uncommitted on a clean tree, and being ON the base —
    // the second being the SHIP-THE-LINE case exactly.
    for (const base of ["HEAD", head]) {
      let code = 0;
      let out = "";
      try {
        out = execFileSync(
          process.execPath,
          ["scripts/verify.mjs", "--dry", `--base=${base}`],
          {
            cwd: REPO,
            env,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
      } catch (e) {
        code = e.status;
        out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
      }
      assert.equal(
        code,
        EXIT_REFUSED,
        `--base=${base} verifies NOTHING and must not exit 0`,
      );
      assert.match(out, /REFUSED/, "and it must say so, not merely fail");
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
