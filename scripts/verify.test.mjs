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
import { plan, ROUTES } from "./verify.mjs";

// THE ROUTING TESTS ASSERT HULL MEMBERSHIP, so they stub the inert splitter. The paths they pass
// are synthetic — byte-identical to the base — which the REAL splitter correctly reports as inert;
// without this stub these tests would quietly become tests of the INERT rule while claiming to
// test the route table. The inert rule has its own tests on real content
// (scripts/lib/inertChange.test.mjs) plus the two both-direction cases at the end of this file.
const NOTHING_INERT = (paths) => ({ hit: paths, inert: [] });
const pick = (files, id) => plan(files, "master", NOTHING_INERT).find((t) => t.id === id);
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
