// ============================================================
// routing.test.mjs — THE FOUR MISSES ARE THE TESTS (VERIFY-ROUTING-1)
//
// Run: node --test scripts/lib/routing.test.mjs
//
// `npm run verify` chose the wrong guards four times, and each was found by accident. These are not
// examples of the four; they ARE the four, one test each, each asserted in both directions. A
// routing rule that only ever says yes is not a rule.
//
//   1. the matcher looked only at `client/src/`
//   2. it skipped the client suite when `client/vitest.config.js` changed
//   3. it did not run the render guard when `scripts/render-fingerprint.mjs` changed
//   4. `check-measured-stamps` was routed by "markdown changed", not by what its stamps depend on
//
// Plus the two properties that stop a FIFTH: every guard script must declare (nothing may be
// silently unrouted), and every declaration must agree with its own script's source.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { collect, guardScripts, declarationOf, resolveGuard, reasonFor } from "./routing.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { guards, undeclared } = collect();
const byId = (id) => guards.find((g) => g.id === id);
const routes = (id, file) => {
  const g = byId(id);
  assert.ok(g, `no guard called ${id}`);
  return g.matches(file);
};

// ── THE FOUR ─────────────────────────────────────────────────────────────────────────────────────

test("MISS 1 — a client file OUTSIDE client/src/ selects the client suite", () => {
  // The matcher was `client/src/`. Three of these are in the project and in no source directory.
  for (const f of ["client/package.json", "client/vite.config.js", "client/index.html"])
    assert.equal(routes("client-suite", f), true, f);
  // The other direction, which is what stops a matcher that has quietly widened to everything.
  assert.equal(routes("client-suite", "server/src/index.js"), false);
  assert.equal(routes("client-suite", "reports/night/INDEX.md"), false);
});

test("MISS 2 — client/vitest.config.js selects the client suite; client/e2e/ does not", () => {
  // A config file is in no source directory, and it decides how the entire suite RUNS.
  assert.equal(routes("client-suite", "client/vitest.config.js"), true);
  // The deliberate exclusion, in the same test so widening the rule cannot pass unnoticed.
  assert.equal(routes("client-suite", "client/e2e/smoke.spec.js"), false);
});

test("MISS 3 — a guard's OWN INSTRUMENT selects it, for every guard, by construction", () => {
  // The named case: the render fingerprint did not run when render-fingerprint.mjs changed, so a
  // block that altered the instrument was verified without it.
  assert.equal(routes("render-fingerprint", "scripts/render-fingerprint.mjs"), true);
  // And the property, which is what stops the next one: EVERY guard routes on its own source. This
  // is not an entry anyone maintains — `resolveGuard` adds the closure of the declaring file.
  for (const g of guards) {
    assert.ok(
      g.matches(g.source),
      `${g.id} does not route on its own source (${g.source})`,
    );
  }
  // The other direction: a different guard's instrument must NOT select this one.
  assert.equal(routes("render-fingerprint", "scripts/check-tags.mjs"), false);
});

test("MISS 4 — the stamp guard routes on what its STAMPS depend on, not on 'markdown changed'", () => {
  // docs/CAMERA_DIRECTOR.md carries `depends=client/src/modules/camera/`. Under the old table the
  // guard was selected by markdown only, so a camera-only commit — exactly the commit that
  // invalidates the stamp — never ran it.
  assert.equal(routes("measured-stamps", "client/src/modules/camera/CameraDirector.js"), true);
  assert.equal(routes("measured-stamps", "docs/CAMERA_DIRECTOR.md"), true);
  // Both directions: an unrelated client file must not select it, or the rule says nothing.
  assert.equal(routes("measured-stamps", "client/src/modules/storage/storage.js"), false);
});

test("MISS 4, the reporting half — the guard states the limit in its own blind list", () => {
  const g = byId("measured-stamps");
  assert.ok(
    g.blind.some((b) => /does not exist yet/i.test(b)),
    "the guard must say IN ITSELF that it cannot check the commit being made",
  );
});

// ── THE TWO PROPERTIES THAT STOP A FIFTH ─────────────────────────────────────────────────────────

test("NOTHING IS SILENTLY UNROUTED: every guard script on disk declares", () => {
  assert.deepEqual(
    undeclared,
    [],
    `these guard scripts declare no GUARD and route nowhere: ${undeclared.join(", ")}`,
  );
  // And the discovery finds a plausible number of them — a glob that matched nothing would make
  // the assertion above vacuously true, which is the failure mode this whole block is about.
  assert.ok(guardScripts().length >= 10, `found only ${guardScripts().length} guard scripts`);
});

test("A DECLARATION CANNOT DRIFT FROM ITS SCRIPT: every client path a guard imports is in its set", () => {
  // The harnesses reach into client/ through `await import(u("client/..."))`, which a static walk
  // of `from "..."` cannot follow, so those entry points are DECLARED. This is what stops the
  // declaration falling behind the script: the script is read, and every literal it names must be
  // inside the resolved dependency set.
  let checked = 0;
  for (const g of guards) {
    // The two SUITES declare in routing.mjs, whose header shows the `u("client/...")` idiom as an
    // EXAMPLE. A suite imports nothing at runtime, so there is nothing to cross-check, and matching
    // a comment would make this assertion about documentation instead of about code.
    if (g.source === "scripts/lib/routing.mjs") continue;
    const src = readFileSync(join(ROOT, g.source), "utf8");
    for (const m of src.matchAll(/\bu\(\s*"(client\/[^"]+)"\s*\)/g)) {
      checked++;
      assert.ok(
        g.matches(m[1]),
        `${g.id} imports ${m[1]} at runtime but does not depend on it — add it to \`reach\``,
      );
    }
  }
  // The cross-check must actually have something to check, or it proves nothing.
  assert.ok(checked >= 10, `only ${checked} runtime imports were cross-checked`);
});

test("EVERY GUARD STATES WHAT IT DOES NOT COVER, and it is not boilerplate", () => {
  for (const g of guards) {
    assert.ok(Array.isArray(g.blind) && g.blind.length > 0, `${g.id} declares no blind spots`);
    for (const b of g.blind)
      assert.ok(b.length > 25, `${g.id} has a blind entry too short to mean anything: "${b}"`);
    assert.ok(g.covers && g.covers.length > 20, `${g.id} does not say what it covers`);
  }
});

// ── THE ROUTING ITSELF ───────────────────────────────────────────────────────────────────────────

test("THE ENGINE GATE still holds: a file in the engine closure selects the world fingerprint", () => {
  assert.equal(routes("world-fingerprint", "client/src/modules/raceStep.js"), true);
  // A camera file cannot be read by the race, so the world fingerprint has no question to answer.
  assert.equal(routes("world-fingerprint", "client/src/modules/camera/finishPhase.js"), false);
});

test("a camera file selects camera AND render; a storage file selects neither", () => {
  const cam = "client/src/modules/camera/CameraDirector.js";
  assert.equal(routes("camera-fingerprint", cam), true);
  assert.equal(routes("render-fingerprint", cam), true);
  // storage.js IS inside the render closure (defaults.js reaches it), so the honest negative here
  // is a file neither instrument can load at all.
  const off = "client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx";
  assert.equal(routes("camera-fingerprint", off), false);
  assert.equal(routes("render-fingerprint", off), false);
});

test("the always-on pair is always on, and an empty diff still selects nothing", () => {
  for (const id of ["fingerprint-containment", "writable"]) {
    assert.equal(routes(id, "README.md"), true);
    assert.equal(routes(id, "server/index.js"), true);
  }
  // Matching is applied to the CHANGED-FILE LIST, so an empty diff selects nothing at all — which
  // is coherent: nothing changed, so nothing can have introduced a stray copy.
  for (const g of guards) assert.equal([].filter((f) => g.matches(f)).length, 0, g.id);
});

test("THE REASON IS CHECKABLE, not prose: it names counts and the declaration's shape", () => {
  const g = byId("render-fingerprint");
  const ran = reasonFor(g, ["scripts/render-fingerprint.mjs"]);
  const skipped = reasonFor(g, []);
  assert.match(ran, /^1 changed \(/);
  assert.match(ran, /declares \d+ file\(s\) by import closure/);
  assert.match(skipped, /^nothing changed/);
  assert.match(skipped, /declares \d+ file\(s\)/);
  // A number a reader can check against the tree, rather than a sentence a reader must trust.
  assert.ok(g.files.length > 20, "the render closure resolved to implausibly few files");
});

test("resolveGuard: notDirs beats everything else, and dirs are prefixes not globs", () => {
  const g = resolveGuard({
    id: "x",
    source: "scripts/lib/routing.mjs",
    dirs: ["a/"],
    notDirs: ["a/b/"],
    files: ["a/b/kept.txt"],
    reach: [],
    blind: ["nothing"],
  });
  assert.equal(g.matches("a/c.txt"), true);
  assert.equal(g.matches("a/b/c.txt"), false);
  // An explicit file inside an excluded directory is STILL excluded — the exclusion is the stronger
  // statement, and a rule where the answer depends on which list you look at first is not a rule.
  assert.equal(g.matches("a/b/kept.txt"), false);
});

test("declarationOf returns null for a script that declares nothing — it does not invent a route", () => {
  assert.equal(declarationOf("scripts/engine-reach.mjs"), null);
});
