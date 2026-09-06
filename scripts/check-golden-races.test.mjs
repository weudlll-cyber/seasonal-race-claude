// ============================================================
// File:        scripts/check-golden-races.test.mjs
// Project:     RaceArena — GOLDEN-RACES-1
//
// WHAT THESE TEST: the properties that make the golden races worth having — that they are
// deterministic, that they are PINNED (nothing outside the fixture can move them), that a moved
// outcome is NAMED rather than merely flagged, and that the declaration selects the engine and
// nothing else.
//
// WHAT THEY DELIBERATELY DO NOT TEST: whether the recorded outcome is the RIGHT one. Nothing can
// answer that from inside — it is what the owner's eye and the re-record decision are for.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GUARD,
  runAllGoldenRaces,
  compareRace,
  checkGoldenRaces,
  RACES_PATH,
  readJson,
} from "./check-golden-races.mjs";
import { collect } from "./lib/routing.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── The races themselves ──────────────────────────────────────────────────────

test("both golden races reproduce their recorded outcome", () => {
  const { failures } = checkGoldenRaces();
  assert.deepEqual(failures, [], failures.join("\n"));
});

test("★ DETERMINISTIC: two runs of the same race agree exactly", () => {
  // A check that is itself non-deterministic is worse than none — it would teach whoever reads it
  // to ignore a red.
  const a = runAllGoldenRaces();
  const b = runAllGoldenRaces();
  assert.deepEqual(b, a);
});

test("the two races are a CLOSED one and an OPEN one, with different field sizes", () => {
  const { races } = readJson(RACES_PATH);
  assert.equal(races.length, 2, "the owner asked for two; a third needs his word, not a commit");
  const open = races.filter((r) => r.track.isOpen);
  assert.equal(open.length, 1, "exactly one open track");
  assert.notEqual(
    races[0].field.names.length,
    races[1].field.names.length,
    "different field sizes — start-row packing is a function of the count",
  );
});

test("★ at least one race is decided by a CLOSE finish", () => {
  const ran = runAllGoldenRaces();
  const gaps = ran.map((r) => {
    const t = r.results.map((x) => x.finishTimeSec).filter((x) => x != null);
    return t.length > 1 ? t[1] - t[0] : Infinity;
  });
  // Within five physics frames (FIXED_DT = 16 ms). A close finish is what makes the FINISHING
  // ORDER, not just the times, sensitive to a change.
  assert.ok(
    Math.min(...gaps) <= 5 * 0.016 + 1e-9,
    `no close finish: gaps between 1st and 2nd were ${gaps.map((g) => g.toFixed(3)).join(", ")} s`,
  );
});

// ── ★ THE PINNING RULE ────────────────────────────────────────────────────────

test("★ PINNED: the fixture carries every input, so nothing outside it can move a race", () => {
  const { configs, races } = readJson(RACES_PATH);
  for (const key of ["baseSpeed", "behavior", "rowLayout", "dynamics", "autoScale"]) {
    assert.ok(configs[key] && typeof configs[key] === "object", `configs.${key} must be pinned`);
  }
  for (const r of races) {
    assert.ok(r.track.centerPoints?.length >= 3, `${r.id}: the geometry itself is pinned`);
    assert.ok(Number.isFinite(r.track.pathLengthPx), `${r.id}: path length pinned`);
    assert.ok(Number.isFinite(r.track.trackWidthPx), `${r.id}: track width pinned`);
    assert.ok(Number.isFinite(r.racer.speedMultiplier), `${r.id}: the racer's tuned values pinned`);
    assert.ok(r.field.names.length > 0, `${r.id}: the roster is pinned BY NAME — a name is physics`);
    assert.ok(Number.isFinite(r.plan.seed), `${r.id}: seed pinned`);
    assert.ok(typeof r.plan.raceActionStage === "string", `${r.id}: action stage pinned`);
    assert.equal(typeof r.plan.racePlanEnabled, "boolean", `${r.id}: race plan on/off pinned`);
  }
});

test("★ the runner reads NO seed file, config file, default or environment", () => {
  // The strongest statement this can make without running the tree twice: the module that builds a
  // golden race imports only the ENGINE, and reads nothing.
  //
  // ★ COMMENTS ARE STRIPPED FIRST, and that is not a loosening. This file's header EXPLAINS why the
  // world fingerprint is unsuitable, and doing so names `server/seeds/tracks/*.json` — a raw-text
  // scan matched its own explanation and failed. A guard that cannot tell code from prose reports
  // the documentation as the defect, which is how a true check teaches people to ignore it.
  const raw = readFileSync(join(ROOT, "scripts/golden/goldenRace.mjs"), "utf8");
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  assert.ok(
    !/readFileSync|readdirSync|process\.env|Date\.now\(\)|Math\.random\(\)/.test(code),
    "goldenRace.mjs must not read a file, the environment, the clock or an unseeded random",
  );
  for (const forbidden of ["server/seeds", "storage/defaults.js", "loadRaceDynamicsConfig", "loadBaseSpeedConfig"]) {
    assert.ok(!code.includes(forbidden), `goldenRace.mjs must not reach for ${forbidden}`);
  }
  // And every import it DOES have is engine code.
  const imports = [...code.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  for (const spec of imports) {
    assert.ok(
      spec.startsWith("../../client/src/modules/"),
      `goldenRace.mjs imports ${spec}, which is not engine code`,
    );
  }
});

// ── The failure message ───────────────────────────────────────────────────────

test("★ a moved FINISHING TIME names the racer and both values", () => {
  const expected = [
    { name: "Flash", rank: 1, finishTimeSec: 36.592 },
    { name: "Nitro", rank: 2, finishTimeSec: 36.624 },
  ];
  const actual = [
    { name: "Flash", rank: 1, finishTimeSec: 36.592 },
    { name: "Nitro", rank: 2, finishTimeSec: 36.688 },
  ];
  const v = compareRace("x", actual, expected);
  assert.equal(v.ok, false);
  assert.match(v.message, /Nitro/);
  assert.match(v.message, /36\.624/);
  assert.match(v.message, /36\.688/);
});

test("★ a moved ORDER names who was expected, who arrived, and where the expected racer went", () => {
  const expected = [
    { name: "Flash", rank: 1, finishTimeSec: 36.592 },
    { name: "Nitro", rank: 2, finishTimeSec: 36.624 },
  ];
  const actual = [
    { name: "Nitro", rank: 1, finishTimeSec: 36.6 },
    { name: "Flash", rank: 2, finishTimeSec: 36.61 },
  ];
  const v = compareRace("x", actual, expected);
  assert.equal(v.ok, false);
  assert.match(v.message, /THE ORDER MOVED/);
  assert.match(v.message, /expected Flash, got Nitro/);
});

test("a race with no recorded expectation is a failure, not a silent pass", () => {
  const v = compareRace("x", [{ name: "A", rank: 1, finishTimeSec: 1 }], undefined);
  assert.equal(v.ok, false);
  assert.match(v.message, /no recorded expectation/);
});

// ── ★ THE DECLARATION, IN BOTH DIRECTIONS ─────────────────────────────────────

test("★ the declaration is DERIVED from engine-reach, not hand-written", () => {
  // A list of files would be a second home for "what can reach the engine" and would drift. The
  // declaration names an ENTRY POINT; routing expands its import closure on every run.
  assert.deepEqual(GUARD.reach, ["client/src/modules/raceCore.js"]);
  assert.deepEqual(GUARD.dirs, [], "no directory wildcards — the closure is the answer");
  // The only plainly-named files are the guard's OWN fixtures, which no import can reach.
  assert.deepEqual(
    [...GUARD.files].sort(),
    ["scripts/golden/fixtures/expected.json", "scripts/golden/fixtures/races.json"],
  );
});

test("★ (e) a documentation, report, server or interface change does NOT select the golden races", () => {
  const g = collect().guards.find((x) => x.id === "golden-races");
  assert.ok(g, "the guard must be collected by routing");
  for (const f of [
    "docs/README.md",
    "reports/evolution/INDEX.md",
    "server/src/routes/tracks.js",
    "client/src/screens/DevScreen/DevScreen.jsx",
  ]) {
    assert.equal(g.matches(f), false, `${f} must NOT select the golden races`);
  }
});

test("★ (f) a change that reaches the engine DOES select them — including one reached INDIRECTLY", () => {
  const g = collect().guards.find((x) => x.id === "golden-races");
  for (const f of [
    "client/src/modules/raceCore.js", // the entry point itself
    "client/src/modules/raceStep.js", // imported by it
    "client/src/utils/mathUtils.js", // ★ reached only through the closure, named nowhere
    "client/src/modules/storage/defaults.js", // likewise indirect
  ]) {
    assert.equal(g.matches(f), true, `${f} MUST select the golden races`);
  }
});

// ── The guard's own honesty ───────────────────────────────────────────────────

test("the guard declares what it is blind to, and the shipped world is on that list", () => {
  assert.ok(GUARD.blind.length >= 3);
  assert.ok(
    GUARD.blind.some((b) => /SHIPPED world/i.test(b)),
    "being pinned means being blind to the shipped world — that has to be written down",
  );
});
