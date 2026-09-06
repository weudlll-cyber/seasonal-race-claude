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
  cheapArgs,
  commandFor,
  describeEmptyRun,
  premergeDecision,
  EXIT_REFUSED,
} from "./verify.mjs";
import { collect } from "./lib/routing.mjs";
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
  // `doc-guards` was a BUNDLE and is gone (VERIFY-ROUTING-2). Its members are separate tasks now,
  // each selected on its own declaration.
  assert.equal(runs(files, "check-doc-links"), true);
  assert.equal(runs(files, "check-doc-facts"), true);
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
  // CHANGED BY VERIFY-ROUTING-2, and NOT loosened to get green: `storage/storage.js` is IN the
  // engine hull, so it can change the race, so it can change what the camera sees and therefore
  // what is drawn. The old table said render only cares about camera/ and the drawing path — that
  // was the sixth miss. A file genuinely outside both is the honest negative case.
  assert.equal(
    runs(
      ["client/src/screens/SetupScreen/SetupScreen.jsx"],
      "render-fingerprint",
    ),
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
  assert.ok(
    p.length >= 13,
    "the plan must list every guard, run or not — thirteen scripts plus the two suites",
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
  // The negative half moved for a reason (VERIFY-ROUTING-2): `storage/storage.js` is in the engine
  // hull and now correctly selects both, because a change to the race changes the camera's inputs.
  // SetupScreen is outside the hull and outside the drawing path, so it selects neither.
  const outside = ["client/src/screens/SetupScreen/SetupScreen.jsx"];
  assert.equal(runs(outside, "camera-fingerprint"), false);
  assert.equal(runs(outside, "render-fingerprint"), false);
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

// LANG-CLOSED-1 SPLIT THIS TEST, and the split is the finding rather than an accommodation.
// `check-language-closed` covers the LANGUAGE RULE, which applies to every line of source and every
// document in the repository — so `server/index.js` and `client/e2e/*` genuinely stopped routing
// nowhere the moment it shipped. Two paths still route nowhere and are asserted below; the two that
// now route to exactly ONE guard are asserted to route to exactly THAT one, so a matcher that
// quietly widens is still caught for every guard that is supposed to be narrow.
test("ROUTED NOWHERE: the paths no narrow guard covers select nothing at all", () => {
  for (const f of [".github/workflows/ci.yml", "package-lock.json"]) {
    // ALWAYS-ON guards are excluded BY THEIR DECLARATION rather than by name, so "routes
    // nowhere" means "selects no guard that CAN be skipped". It was a hand-written list of two and
    // needed editing BOTH times an always-on guard was added (check-language-closed, then
    // check-hooks-installed) -- a second statement of something the declaration already says, and
    // it fell behind exactly as VERIFY-ROUTING-2 predicts. Reading `everything` keeps the test
    // able to catch a matcher that has quietly widened, without breaking on a legitimate new one.
    const selected = plan([f])
      .filter(
        (t) =>
          t.run && !t.everything,
      )
      .map((t) => t.id);
    assert.deepEqual(
      selected,
      [],
      `${f} should route nowhere, got ${selected.join(",")}`,
    );
  }
});

/** Every guard a path selects, excluding the always-on ones, sorted. */
const routesTo = (f) =>
  plan([f])
    .filter((t) => t.run && !t.everything)
    .map((t) => t.id)
    .sort();

// WIRE-SUITES-1 SPLIT THIS TEST AGAIN, and again the split is the finding. It used to assert that
// `server/index.js` selects the language guard and NOTHING else — true only while 19 server test
// files and 615 tests were wired to no invoker at all. They are wired now, so the sentence had to
// change; the test catching it is the routing declaration doing its job.
test("ROUTED TO THE SERVER SUITE: a change under server/ selects the suite that tests it", () => {
  // Delete this and the whole point of WIRE-SUITES-1 is unguarded: the server suite could quietly
  // stop being selected and go back to being 615 tests nobody runs, which is the state it was found
  // in and which looks exactly like coverage.
  // SERVER-LINT-1 (2026-09-06) GREW THIS SET, and the test catching it is the same routing
  // declaration doing the same job a third time. The server had no linter and no format check at
  // all, so a `server/` change selected the language guard and its suite and nothing else. It now
  // selects the two guards that read the code as well. The expected set follows the behaviour
  // rather than pinning the smaller one — a set that stopped growing when a guard was added would
  // be asserting that the guard is not wired.
  assert.deepEqual(routesTo("server/index.js"), [
    "check-language-closed",
    "server-format-check",
    "server-lint",
    "server-suite",
  ]);
  // `server/`, not `server/src/` — the package manifest decides how the suite RUNS, and naming the
  // source subdirectory is the miss client-suite already paid for twice.
  assert.deepEqual(routesTo("server/package.json"), [
    "check-language-closed",
    "server-format-check",
    "server-lint",
    "server-suite",
  ]);
});

test("NOT ROUTED: the e2e suite is NIGHT WORK, and that is deliberate", () => {
  // THIS IS A DECISION, NOT AN OVERSIGHT, and the distinction is the reason the comment exists.
  //
  // E2E-LOGIN-1 fixed the login gate that had killed the suite for two months, so "it is broken" is
  // no longer why it is absent from the per-push path. The owner decided on 2026-08-16 that it runs
  // during NIGHT WORK: it is about ten minutes, roughly five times the whole per-push CI run, and a
  // ten-minute browser suite gating every merge trains people to re-run red builds.
  //
  //   the invoker:  npm run test:e2e      (one home: docs/NIGHT-RUN.md)
  //   the rule:     docs/VERIFY-RULES.md R12a, which points there rather than repeating it
  //
  // Delete this and the decision becomes invisible; wire the suite into the ordinary path and this
  // fails, which is the point — whoever does it has to justify it rather than slip it in.
  assert.deepEqual(routesTo("client/e2e/smoke.spec.js"), ["check-language-closed"]);
  // The fixture files live beside the specs and must not change that answer either.
  assert.deepEqual(routesTo("client/e2e/auth.setup.js"), ["check-language-closed"]);
});

test("EVERY GUARD DECLARES ITSELF — there is no table left to fall behind", () => {
  // The property that replaces "one table": every guard script on disk answers `--declare`, and
  // none is routed by something written elsewhere. An undeclared guard is REPORTED, never given an
  // invented route — that is what makes a new guard's absence loud instead of silent.
  const { guards, undeclared } = collect();
  assert.deepEqual(undeclared, [], "every guard script must declare itself");
  assert.ok(guards.length >= 13);
  for (const g of guards) {
    assert.equal(typeof g.id, "string");
    assert.ok(
      g.covers && g.covers.length > 10,
      `${g.id} must say what it covers`,
    );
    // REQUIRED and non-empty: the hole is written down by whoever knows it.
    assert.ok(
      Array.isArray(g.blind) && g.blind.length > 0,
      `${g.id} must state what it is BLIND to`,
    );
    assert.equal(typeof g.matches, "function");
  }
  assert.deepEqual(
    plan([]).map((t) => t.id),
    guards.map((g) => g.id),
    "plan() must come from the collected declarations, in order",
  );
});

test("A SKIP NAMES THE RULE, so the map is visible without reading the code", () => {
  for (const t of plan([])) {
    // The reason is now MACHINE-CHECKABLE rather than a sentence someone wrote: it prints the
    // declaration — how many files the set resolved to and where they came from.
    assert.match(t.reason, /nothing changed  ·  declares /);
    assert.ok(
      t.reason.length > 30,
      `${t.id}'s skip reason must name its declaration`,
    );
  }
});

// ── THE FINGERPRINT RECORD ROUTES ITSELF (ONE-TRUTH-1 stage 4) ─────────────────────────────────

test("THE RECORD selects the doc guards; a husky hook no longer does (ONE-TRUTH-2)", () => {
  // ONE-TRUTH-1 routed `.husky/pre-commit` here because it CARRIED a fingerprint. ONE-TRUTH-2
  // deleted that copy, so the reason is gone and so is the route. The record itself still selects
  // the doc guards, because editing it is a documentation act.
  assert.equal(
    runs(["docs/fingerprints.json"], "fingerprint-containment"),
    true,
  );
  assert.equal(runs([".husky/pre-commit"], "check-doc-facts"), false);
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
  // `--base=HEAD` gets its OWN reading: it means "only uncommitted work", so the useful thing to
  // say is that there is none — not that the caller is standing where they know they are standing.
  const onlyUncommitted = describeEmptyRun({ ...base, base: "HEAD" });
  assert.match(onlyUncommitted.headline, /uncommitted/i);
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

// ── VERIFY-ROUTING-2: THE GAP FOUND AT THE SHIP, AND THE ONES THE OLD TABLE LEFT ────────────────

test("THE SHIP GAP: a pure JS change runs the config guards", () => {
  // The defect this block was opened for. `check-config-keys` and `check-fallback-agreement` were
  // bundled into `doc-guards`, which only markdown selected — so a change to a JS file that those
  // two guards read never ran either of them under verify. They fired in the hook and in CI, which
  // is where they caught things, but verify was quietly blind.
  const js = ["client/src/modules/camera/framingConfig.js"];
  assert.equal(runs(js, "check-config-keys"), true);
  assert.equal(runs(js, "check-fallback-agreement"), true);
  // …and the pair, so this is not "those guards now run on everything": a report cannot select them.
  const report = ["reports/night/X.md"];
  assert.equal(runs(report, "check-config-keys"), false);
  assert.equal(runs(report, "check-fallback-agreement"), false);
});

test("SELF-COVERAGE: changing a guard's own source runs THAT guard, not just its tests", () => {
  // Miss 3 in routing.mjs's list, and it is closed for every guard at once by construction: a
  // guard's dependency set always contains the import closure of the file its declaration lives in.
  // Nothing is declared for this and nothing can forget it.
  assert.equal(
    runs(["scripts/check-fallback-agreement.mjs"], "check-fallback-agreement"),
    true,
  );
  assert.equal(
    runs(["scripts/render-fingerprint.mjs"], "render-fingerprint"),
    true,
  );
  assert.equal(runs(["scripts/check-index.mjs"], "check-index"), true);
});

test("MISS 4: a camera-only change runs check-measured-stamps", () => {
  // Its stamps say `depends=client/src/modules/camera/`, but it used to be routed by "markdown
  // changed", so a camera-only commit never ran it. It declares the camera directory now.
  assert.equal(
    runs(
      ["client/src/modules/camera/CameraDirector.js"],
      "check-measured-stamps",
    ),
    true,
  );
});

test("MISS 6: an ENGINE change runs the camera and render fingerprints", () => {
  // Found by this block. The old table said camera/render only care about camera/ and the drawing
  // path — but both harnesses run a real seeded race, so a change to the RACE changes what the
  // director decides and therefore what is drawn. It costs two fingerprints on engine blocks; the
  // alternative is a fingerprint that cannot notice the thing that moved it.
  const engine = ["client/src/modules/raceBehavior.js"];
  assert.equal(runs(engine, "world-fingerprint"), true);
  assert.equal(runs(engine, "camera-fingerprint"), true);
  assert.equal(runs(engine, "render-fingerprint"), true);
});

test("THE SUITES keep their containment, including the two misses that produced it", () => {
  assert.equal(
    runs(["client/vitest.config.js"], "client-suite"),
    true,
    "miss 2",
  );
  assert.equal(
    runs(["client/e2e/smoke.spec.js"], "client-suite"),
    false,
    "notDirs",
  );
  assert.equal(runs(["scripts/lib/routing.mjs"], "script-suite"), true);
});

test("AN UNDECLARED GUARD IS REPORTED, never given an invented route", () => {
  // The failure mode of a declaration-based router: a guard that answers nothing must not silently
  // become a guard that covers nothing. `collect` returns it in `undeclared` instead.
  const { guards, undeclared } = collect(
    (rel) =>
      rel.includes("silent")
        ? null
        : { id: rel, covers: "x".repeat(20), blind: ["y"] },
    ["scripts/check-silent.mjs", "scripts/check-loud.mjs"],
  );
  assert.deepEqual(undeclared, ["scripts/check-silent.mjs"]);
  assert.ok(guards.some((g) => g.id === "scripts/check-loud.mjs"));
});

// DOC-AUDIT-2 B: THE ROUTING MISS THAT TURNED MASTER RED.
//
// `docs/SIM.md` carries a GENERATED block listing the engine-reach hull. A `client/src` change that
// adds or removes a file from that hull invalidates it — and nothing routed on that. The guard was
// this generator's own test, which lives in the script suite, and the script suite is selected by
// changes under `scripts/`. CONFIG-DIFF-2 changed only `client/src`, so the suite was correctly not
// selected, verify passed, and CI went red on the stale block minutes later.
//
// Both directions, because a one-direction test passes against a guard that selects everything.
test("HULL -> SIM.md: a change to a hull file selects the engine-reach-doc guard", () => {
  // The exact shape of the incident: a file INSIDE raceCore.js's import closure, under client/src,
  // with no script touched at all.
  assert.equal(
    runs(["client/src/modules/raceBehavior.js"], "engine-reach-doc"),
    true,
    "a hull file must select the guard on the generated block it can invalidate",
  );
  assert.equal(
    runs(["client/src/modules/storage/configDiff.js"], "engine-reach-doc"),
    true,
    "the file CONFIG-DIFF-2 actually added to the hull — the incident itself",
  );
  // ...and it must not become a guard that runs on everything: a client file OUTSIDE the hull
  // cannot change the closure, so it must not select this.
  assert.equal(
    runs(["client/src/modules/camera/finishPhase.js"], "engine-reach-doc"),
    false,
    "a non-hull client file cannot change the closure and must not select the guard",
  );
});

test("engine-reach-doc is invoked READ-ONLY — verify may not rewrite a tracked document", () => {
  // With no argv this generator REWRITES docs/SIM.md. `commandFor` supplies `--check`; without it
  // verify would "pass" by making the document agree with itself, which is the opposite of a guard.
  const cmd = commandFor({
    id: "engine-reach-doc",
    source: "scripts/gen-engine-reach-doc.mjs",
  }).cmd;
  assert.ok(
    cmd.includes("--check"),
    `expected --check in ${JSON.stringify(cmd)}`,
  );
});

test("engine-reach-doc still routes on its OWN source, via the closure nobody declares", () => {
  // SELF is computed, never declared. Editing the generator must select it too.
  assert.equal(
    runs(["scripts/gen-engine-reach-doc.mjs"], "engine-reach-doc"),
    true,
  );
  assert.equal(runs(["docs/SIM.md"], "engine-reach-doc"), true);
});

// CEREMONY-COUNTS-GENERATED: the same three questions for the ceremony's own generated counts. They
// are asked here rather than trusted because the incident above was a ROUTING miss, not a guard
// that did not work — the guard was fine and nothing selected it.
test("MODULES -> SHIP-CEREMONY.md: a file appearing under modules/ selects ceremony-counts", () => {
  // The counts include "tracked non-test files under client/src/modules/ outside camera/", so ANY
  // change under modules/ can move them — including one nowhere near the engine's closure. That is
  // the difference from engine-reach-doc, which routes on the hull alone.
  assert.equal(
    runs(["client/src/modules/raceBehavior.js"], "ceremony-counts"),
    true,
  );
  assert.equal(
    runs(["client/src/modules/rAFProbe.js"], "ceremony-counts"),
    true,
  );
  assert.equal(
    runs(["client/src/screens/RaceScreen/index.jsx"], "ceremony-counts"),
    false,
    "a file outside modules/ and outside the hull cannot move either count",
  );
});

test("ceremony-counts is invoked READ-ONLY — verify may not rewrite a tracked document", () => {
  // With no argv this generator runs six guards for FIVE MINUTES and rewrites SHIP-CEREMONY.md.
  // `--check-counts` and not `--check`: plain `--check` also fails on a cost table older than 40
  // commits, which is a re-measure-soon warning and not a reason to fail somebody's build.
  const cmd = commandFor({
    id: "ceremony-counts",
    source: "scripts/gen-ceremony-costs.mjs",
  }).cmd;
  assert.ok(
    cmd.includes("--check-counts"),
    `expected --check-counts in ${JSON.stringify(cmd)}`,
  );
  assert.ok(
    !cmd.includes("--check"),
    "plain --check would fail the build on a stale COST table",
  );
});

test("ceremony-counts routes on its own source and on the document it writes", () => {
  assert.equal(
    runs(["scripts/gen-ceremony-costs.mjs"], "ceremony-counts"),
    true,
  );
  assert.equal(runs(["docs/SHIP-CEREMONY.md"], "ceremony-counts"), true);
});

// ── REACH-CONTRACT-1: the declaration is a contract ──────────────────────────────────────────────
//
// `closureOf` returns [] for a path that does not exist, so a `reach` entry naming a renamed file
// contributes NOTHING and the guard silently stops selecting on everything that file imports. These
// three tests are the both-directions proof: the tree as it stands, a sabotage, and the shape of the
// refusal.

test("CONTRACT: every path every guard declares resolves on the tree as it stands", () => {
  // Delete this and the contract has no baseline: a declaration could rot to a missing path and
  // only the sabotage test below — which uses synthetic declarations — would still pass.
  const { invalid } = collect();
  assert.deepEqual(
    invalid,
    [],
    `declared paths that do not resolve:\n${invalid
      .map((p) => `  ${p.id} ${p.kind}: ${p.path} — ${p.why}`)
      .join("\n")}`,
  );
});

test("SABOTAGE: a reach entry naming a file that does not exist is reported, not absorbed", () => {
  // Delete this and the whole piece is unguarded — this is the exact silent failure it exists for.
  // The declaration is injected rather than written to disk, so the test never edits a real guard.
  const fake = () => ({
    id: "fake-guard",
    covers: "x",
    blind: ["y"],
    reach: ["client/src/modules/raceCoreRENAMED.js"],
    files: [],
    dirs: [],
  });
  const { invalid } = collect(fake, ["scripts/check-doc-facts.mjs"]);
  assert.equal(invalid.length, 1, "a missing reach entry must be reported");
  assert.equal(invalid[0].kind, "reach");
  assert.match(invalid[0].why, /resolves to NOTHING/);
});

test("SABOTAGE: a declared path of the WRONG KIND is reported too", () => {
  // Delete this and `files: ["docs/"]` would pass while matching nothing — the same silent narrowing
  // through a different door, because a directory can never equal a file path in the match set.
  const fake = () => ({
    id: "fake-guard",
    covers: "x",
    blind: ["y"],
    files: ["docs/"],
    dirs: ["scripts/verify.mjs"],
  });
  const { invalid } = collect(fake, ["scripts/check-doc-facts.mjs"]);
  const kinds = invalid.map((p) => `${p.kind}:${p.path}`).sort();
  assert.deepEqual(kinds, ["dirs:scripts/verify.mjs", "files:docs/"]);
});

test("A GUARD THAT SCANS THE REPO ROOT MUST ROUTE ON IT (DECLARED-HOLES-1)", () => {
  // WHAT BREAKS IF THIS IS DELETED: a new repo-root *.md becomes silently unrouted, which is the
  // hole this closed. `check-doc-links` and `check-measured-stamps` both SCAN `docs/ + repo-root
  // *.md` and both used to route on `dirs` alone — and `dirs` matches by PREFIX, so the repo root
  // cannot be expressed there without matching every path in the tree. They name the root documents
  // in `files` instead, and that list is a hand-maintained copy of something git already knows.
  //
  // This is the rule that keeps the copy honest: add `AGENTS.md` at the root tomorrow and this test
  // fails until the two guards are told, instead of the document going unchecked in the local run.
  // Proved by running it: appending one blank line to README.md now selects BOTH guards, where
  // before it selected only the three declared always-on.
  const rootMd = execFileSync("git", ["ls-files", "*.md"], {
    cwd: join(dirname(fileURLToPath(import.meta.url)), ".."),
    encoding: "utf8",
  })
    .split("\n")
    .map((s) => s.trim())
    .filter((f) => f && !f.includes("/"))
    .sort();

  assert.ok(rootMd.length > 0, "the repo must have at least one root *.md");

  const { guards } = collect();
  for (const id of ["check-doc-links", "check-measured-stamps"]) {
    const g = guards.find((x) => x.id === id);
    assert.ok(g, `${id} must be discoverable`);
    for (const f of rootMd) {
      assert.ok(
        g.matches(f),
        `${id} scans the repo-root living docs, so it must ROUTE on ${f}. ` +
          `Add it to that guard's \`files\` list.`,
      );
    }
  }
});

// ── ROUTER-PLAN-1: THE OUTPUT NOBODY ASSERTED WAS THE DATA PATH, NOT THE CLOSURE ────────────────
//
// AUDIT-VERDICT-1 read `closureOf` as the one thing in the tree held by nothing, on the reading that
// this file "tests its INPUTS and never its OUTPUT". THAT READING IS WRONG, and it was checked
// rather than argued: `closureOf` returning `[]` turns TWELVE of the tests above red, and making it
// non-transitive (`return [relPath]`) turns six red. The engine-hull case is already held, by
// THE ENGINE GATE, MISS 6, ENGINE, CAMERA, SELF-COVERAGE and HULL -> SIM.md. Nothing is restated
// here for it — a second assertion of a held property is the redundancy this project keeps deleting.
//
// WHAT IS GENUINELY UNHELD IS NARROWER AND SHARPER: the DATA path.
//
// `resolveGuard` feeds each guard's resolved closure to `dataReach`, so a guard also selects on any
// tracked path its own code NAMES but cannot import. That mechanism IS ENGINE-REACH-DATA-FIX-1,
// and the incident it was built for is on the record: the 2026-08-25 garden-path change broke
// `scripts/track-defaults.test.mjs`, nothing routed on `server/seeds/`, and MASTER WAS RED FOR A DAY
// WHILE THE MERGE REPORTED GREEN. The repair landed. Nothing then asserted the route it created.
//
// Two one-token sabotages of the router delete that route and pass all 44 tests above — `fail 0`,
// both run against this tree:
//
//   · `reached` filtered to `client/` in `resolveGuard` — a track seed loses the world fingerprint,
//     and so does an edit to `scripts/sim-fairness.mjs`, which that guard DECLARES as its reach
//   · `dataReach([...self, ...suiteEntries])` — a track seed loses the world fingerprint
//
// The three tests below turn both red. They assert the PLAN, both directions, and they DISCOVER the
// seeds from git rather than naming them, so an eleventh track cannot arrive silently unrouted.

/**
 * Every guard a path selects, always-on ones excluded, WITH THE INERT SPLITTER STUBBED — the same
 * seam and the same reason as `runs` at the top of this file. These assert set MEMBERSHIP, and the
 * paths they pass are unchanged on disk, which the real splitter correctly calls inert. Without the
 * stub the reach test below silently becomes a test of the inert rule: `scripts/sim-fairness.mjs`
 * is a hull file, so the real splitter drops it from the world fingerprint's hits for being
 * byte-identical to the base, and the assertion fails for a reason that has nothing to do with
 * routing. The inert rule has its own both-direction tests above.
 */
const selects = (f) =>
  plan([f], "master", NOTHING_INERT)
    .filter((t) => t.run && !t.everything)
    .map((t) => t.id)
    .sort();

/** The track seeds as git knows them — never a list, so a new track is routed or this fails. */
const trackSeeds = () =>
  execFileSync("git", ["ls-files", "server/seeds/tracks/*.json"], {
    cwd: REPO,
    encoding: "utf8",
  })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

test("THE DATA PATH: a track seed selects all three fingerprints and the script suite", () => {
  // WHAT BREAKS IF THIS IS DELETED: the exact incident above comes back. A seed is DATA — no import
  // can reach it — so the only thing standing between a track edit and an unverified merge is that
  // each fingerprint's own code names `server/seeds/tracks`. That is discovered, not declared, which
  // makes it silent when it stops happening.
  const seeds = trackSeeds();
  assert.ok(seeds.length >= 10, `expected the ten track seeds, got ${seeds.length}`);
  for (const seed of seeds) {
    const ids = selects(seed);
    for (const id of [
      "world-fingerprint",
      "camera-fingerprint",
      "render-fingerprint",
      // The suite that holds `scripts/track-defaults.test.mjs` — the test the incident broke.
      "script-suite",
    ])
      assert.ok(ids.includes(id), `${seed} must select ${id}, got ${ids.join(",")}`);
  }
});

test("…and the DATA path is not simply 'everything under server/seeds/'", () => {
  // The other direction, without which the test above passes against a router that selects the
  // fingerprints for every path in the tree. `versions.json` is the seed manifest: the seed guard
  // and the server suite read it, no fingerprint harness names it, and none must select on it.
  const ids = selects("server/seeds/versions.json");
  for (const id of ["world-fingerprint", "camera-fingerprint", "render-fingerprint"])
    assert.ok(!ids.includes(id), `server/seeds/versions.json must NOT select ${id}`);
  assert.ok(ids.includes("check-seed-versions"), "the guard that DOES read it must still run");
});

test("A DECLARED REACH ENTRY OUTSIDE client/ still selects its guard", () => {
  // `world-fingerprint` declares `reach: [raceCore.js, scripts/sim-fairness.mjs]`. Every reach test
  // above names the client entry; nothing named the other one, so a router that quietly resolved
  // reach inside `client/` only kept all of them green while the fingerprint stopped noticing edits
  // to the simulator that PRODUCES it.
  const ids = selects("scripts/sim-fairness.mjs");
  assert.ok(ids.includes("world-fingerprint"), `sim-fairness must select the world fingerprint, got ${ids.join(",")}`);
  // The pair: it is that guard's reach, not everyone's. The camera and render harnesses do not run
  // the simulator, and a router that widened to select them here would be wrong in the other way.
  for (const id of ["camera-fingerprint", "render-fingerprint"])
    assert.ok(!ids.includes(id), `sim-fairness must NOT select ${id}`);
});

// ── THE SHIP GATE, AND ITS TWO CONDITIONS (GATE-WIRED-AND-CAUSED-1) ─────────────────────────────
//
// WHAT BREAKS IF THESE ARE DELETED: the state the gate was found in. `viewer-invariants.mjs`
// declared two directories and two files and NOTHING READ THE DECLARATION — the collector picks
// guards by filename pattern and that name matched none of them, so the gate was wired to no
// verify run, no CI job, no hook and no npm script. A guard nothing invokes looks exactly like a
// guard, which is the shape this project has now paid for four times.
//
// The three tests below assert the DECISION in all four combinations, and the fourth asserts the
// COMMAND — because a gate selected correctly and then invoked without `--gate` would drive the
// forty-seed nightly sweep from inside `npm run verify`.

test("THE SHIP GATE IS COLLECTED AT ALL — its own declaration does the routing", () => {
  const ids = plan([]).map((t) => t.id);
  assert.ok(
    ids.includes("viewer-invariants"),
    `the gate must appear in the plan, run or not; got ${ids.join(",")}`,
  );
});

test("THE SHIP GATE NEEDS BOTH CONDITIONS — the flag alone is not enough, nor is the diff", () => {
  const camera = ["client/src/modules/camera/CameraDirector.js"];
  const docs = ["docs/BACKLOG.md"];
  const gate = (files, premerge) =>
    plan(files, "master", NOTHING_INERT, null, premerge).find(
      (t) => t.id === "viewer-invariants",
    );

  // BOTH: the only combination that runs it.
  assert.equal(gate(camera, true).run, true, "camera change + --premerge must run the gate");
  // SABOTAGE (b) CATCHER: a gate wired never to select is caught here and nowhere else — every
  // other verify run in this repository is a run WITHOUT --premerge, where not selecting is right.
  assert.ok(/PRE-MERGE GATE:/.test(gate(camera, true).reason));

  // The flag without the diff. A five-minute browser run on a diff the gate cannot see into is the
  // cost that makes people stop typing the flag.
  assert.equal(gate(docs, true).run, false);
  assert.match(gate(docs, true).reason, /nothing it declares changed/);

  // The diff without the flag — the per-commit case, which is every ordinary run.
  // SABOTAGE (a) CATCHER: a gate selected unconditionally is caught by this line.
  assert.equal(gate(camera, false).run, false);
  assert.match(gate(camera, false).reason, /--premerge was not given/);

  // Neither. The skip line must name BOTH missing conditions, not just the first one it noticed.
  const neither = gate(docs, false).reason;
  assert.match(neither, /--premerge was not given/);
  assert.match(neither, /nothing it declares changed/);
});

test("premergeDecision is the whole rule, and it is pure", () => {
  // The decision is asserted directly as well as through `plan`, so a future refactor cannot move
  // the rule into the plan and leave this passing on a stale copy.
  assert.equal(premergeDecision(true, true).run, true);
  for (const [touched, premerge] of [
    [true, false],
    [false, true],
    [false, false],
  ])
    assert.equal(premergeDecision(touched, premerge).run, false, `${touched}/${premerge}`);
  // A skip that does not say WHICH condition failed breaks verify's own stated constraint — a
  // skipped guard is a visible decision, never an omission (head of verify.mjs).
  assert.match(premergeDecision(true, false).note, /--premerge/);
  assert.match(premergeDecision(false, true).note, /nothing it declares changed/);
});

test("THE SHIP GATE IS INVOKED WITH --gate, ALONE — not as the nightly sweep", () => {
  const cmd = commandFor({
    id: "viewer-invariants",
    source: "scripts/viewer-invariants.mjs",
  });
  assert.deepEqual(cmd.cmd, [
    "node",
    "scripts/viewer-invariants.mjs",
    "--gate",
  ]);
  // Without `--gate` the same script drives ten tracks at forty seeds and both arms — hours, from
  // inside a command people run before a merge.
  assert.ok(cmd.cmd.includes("--gate"), "the two-race mode is the flag, not the default");
  // It builds the client, boots an API and a preview server on fixed ports and drives Chromium.
  assert.equal(cmd.exclusive, true, "the gate owns the machine while it runs");
});
