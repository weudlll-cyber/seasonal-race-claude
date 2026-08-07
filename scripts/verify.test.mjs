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
//
// WHERE THE OTHER HALF WENT (VERIFY-ROUTING-1). The tests that asserted the SHAPE of the old
// hand-maintained `ROUTES` table — that it is one array, that every rule states what it covers, that
// a skip reason names the rule — moved to `scripts/lib/routing.test.mjs`, together with the four
// routing misses that are now tests rather than examples. There is no table in verify.mjs to assert
// the shape of any more: each guard declares its own dependencies and routing.mjs collects them.
// This file keeps what is still verify's own job — that the PLAN it builds from those declarations
// is complete, reasoned, and both-directional.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, guards } from "./verify.mjs";

const GUARDS = guards();
const pick = (files, id) => plan(files, GUARDS).find((t) => t.id === id);
const runs = (files, id) => {
  const t = pick(files, id);
  assert.ok(t, `no guard called ${id}`);
  return t.run;
};

test("a docs-only diff selects the document guards and NOTHING expensive", () => {
  const files = ["docs/VERIFY-RULES.md", "reports/evolution/X.md"];
  assert.equal(runs(files, "doc-links"), true);
  for (const id of [
    "client-suite",
    "world-fingerprint",
    "camera-fingerprint",
    "render-fingerprint",
  ])
    assert.equal(runs(files, id), false, id);
});

test("a scripts diff selects the script suite, and does not drag in the client suite", () => {
  const files = ["scripts/sim-fairness.mjs"];
  assert.equal(runs(files, "script-suite"), true);
  assert.equal(runs(files, "client-suite"), false);
});

test("THE ENGINE GATE: a client file inside the closure selects the world fingerprint", () => {
  // raceBehavior.js is inside the engine closure — this is the case the mint tripwire exists for.
  assert.equal(runs(["client/src/modules/raceBehavior.js"], "world-fingerprint"), true);
});

test("...and a client file OUTSIDE the closure does not — the saving, and its L203 pair", () => {
  const files = ["client/src/modules/camera/finishPhase.js"];
  assert.equal(runs(files, "world-fingerprint"), false);
  // The pair: the SAME kind of path inside the closure does select it, so this is not just "the
  // world fingerprint never runs".
  assert.equal(runs(["client/src/modules/raceStep.js"], "world-fingerprint"), true);
});

test("a camera diff selects the camera fingerprint and the client suite", () => {
  const files = ["client/src/modules/camera/CameraDirector.js"];
  assert.equal(runs(files, "camera-fingerprint"), true);
  assert.equal(runs(files, "client-suite"), true);
});

test("a drawing-path diff selects the render fingerprint; a Dev Screen diff does not", () => {
  assert.equal(
    runs(["client/src/screens/RaceScreen/renderRaceFrame.js"], "render-fingerprint"),
    true,
  );
  assert.equal(
    runs(["client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx"], "render-fingerprint"),
    false,
  );
});

test("EVERY guard carries a reason, whether it runs or not — a skip is a decision", () => {
  for (const files of [[], ["docs/a.md"], ["client/src/modules/raceCore.js"]]) {
    for (const t of plan(files, GUARDS)) {
      assert.equal(typeof t.reason, "string", t.id);
      assert.ok(t.reason.length > 0, `${t.id} has an empty reason`);
      // And every guard carries what it does NOT cover, into the plan, so verify can print it.
      assert.ok(Array.isArray(t.blind) && t.blind.length > 0, `${t.id} carries no blind list`);
    }
  }
});

test("an EMPTY diff runs nothing at all — including the always-on guards", () => {
  // Worth pinning precisely: `fingerprint-containment` matches EVERY path, but matching is applied
  // to the changed-file LIST, so an empty diff selects it too. That is coherent — nothing changed,
  // so nothing can have introduced a stray copy — but it means the guard is "runs whenever anything
  // changed", not "always runs". The distinction is the whole difference between a claim that is
  // true and one that sounds true.
  const p = plan([], GUARDS);
  assert.deepEqual(
    p.filter((t) => t.run).map((t) => t.id),
    [],
  );
  assert.equal(p.length, GUARDS.length, "the plan must list every guard, run or not");
});

test("ANY single changed file, of any kind, selects the always-on pair", () => {
  for (const id of ["fingerprint-containment", "writable"]) {
    assert.equal(runs(["README.md"], id), true, id);
    assert.equal(runs(["server/index.js"], id), true, id);
  }
});

test("THE RECORD selects the document guards; a husky hook no longer does (ONE-TRUTH-2)", () => {
  // ONE-TRUTH-1 routed `.husky/pre-commit` at the doc guards because it CARRIED a fingerprint.
  // ONE-TRUTH-2 deleted that copy, so the reason is gone and so is the route.
  assert.equal(runs(["docs/fingerprints.json"], "fingerprint-containment"), true);
  assert.equal(runs([".husky/pre-commit"], "doc-links"), false);
});

test("ROUTED NOWHERE: the paths no guard declares select only the always-on pair", () => {
  const ALWAYS_ON = new Set(["fingerprint-containment", "writable"]);
  for (const f of [
    "server/index.js",
    ".github/workflows/ci.yml",
    "client/e2e/smoke.spec.js",
    "package-lock.json",
  ]) {
    const selected = plan([f], GUARDS)
      .filter((t) => t.run && !ALWAYS_ON.has(t.id))
      .map((t) => t.id);
    assert.deepEqual(selected, [], `${f} should route nowhere, got ${selected.join(",")}`);
  }
});

test("EVERY guard the plan lists has a command it could actually run", () => {
  // A guard that declares and routes but has no `cmd` would be counted in the plan and silently do
  // nothing — a skip wearing a run's clothes.
  for (const t of plan(["README.md"], GUARDS)) {
    assert.ok(Array.isArray(t.cmd) && t.cmd.length >= 2, `${t.id} has no runnable cmd`);
  }
});
