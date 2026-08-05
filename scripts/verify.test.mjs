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

const pick = (files, id) => plan(files).find((t) => t.id === id);
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

test("an empty diff runs nothing, and says so for all six", () => {
  const p = plan([]);
  assert.equal(p.filter((t) => t.run).length, 0);
  assert.equal(p.length, 6);
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
    const selected = plan([f])
      .filter((t) => t.run)
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
