// ============================================================
// raceDriverWorld.test.mjs — the harness races the world it is GIVEN (HARNESS-WORLD-1)
//
// Run: node --test scripts/lib/raceDriverWorld.test.mjs
//
// WHAT BREAKS IF THIS IS DELETED: `buildRace`'s world parameter goes back to being a thing that
// compiles. The defect it closed did not look like a bug — `const W = DEFAULT_CONFIG_WORLD` is a
// perfectly reasonable line — and it survived for as long as it did precisely because nothing ever
// asserted that a harness CAN race anything else. Two of the properties below would have caught it
// on the day it was written.
//
// THE PROPERTIES, and why each is the one worth pinning:
//
//   1. THE DEFAULT IS STILL THE DEFAULT. A caller that says nothing races the shipped world, to the
//      millisecond. This is the fingerprints' claim expressed cheaply enough to run every time.
//   2. THE PARAMETER IS LOAD-BEARING. A world with different values races a DIFFERENT race. Without
//      this, property 1 is satisfied by a driver that ignores the parameter entirely — which is
//      exactly the state this piece found the file in.
//   3. THE STAGE IS NOT RE-IMPLEMENTED HERE. `worldForActionStage` is asserted against
//      `applyRaceActionStage` itself rather than against a copy of the stage table, so a fourth
//      stage, or a changed value, needs no edit here and a SECOND application of the stage in the
//      driver would fail this test rather than pass it quietly.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  worldForActionStage,
  TRACK_DEFAULT_RACER,
  DEFAULT_CONFIG_WORLD,
} from "./raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { applyRaceActionStage, RACE_ACTION_STAGE_IDS } = await (async () => {
  const stage = await import(u("client/src/modules/raceActionStage.js"));
  const defaults = await import(u("client/src/modules/storage/defaults.js"));
  return { ...stage, RACE_ACTION_STAGE_IDS: defaults.RACE_ACTION_STAGE_IDS };
})();

// One small closed track and a field big enough for the plan to cast its roles. A race is the only
// honest assertion here — the whole defect was about what a race COMES OUT as.
const GEO = loadTracks({ only: "city-circuit" })[0];
const N = 20;

function finishOf(world) {
  const identity = resolveIdentity({
    racers: N,
    raceSeed: 7,
    racerType: TRACK_DEFAULT_RACER,
    note: "HARNESS-WORLD-1 test",
  });
  const cam = DEFAULT_CONFIG_WORLD.cameraConfig;
  const race = buildRace(GEO, identity, cam, world);
  runRace(race, identity, cam, () => true);
  return race.st.racers
    .filter((r) => r.finishRank != null)
    .sort((a, b) => a.finishRank - b.finishRank)
    .map((r) => `${r.name ?? r.index}@${r.finishTimeMs}`);
}

test("a caller that names no world races the shipped one, to the millisecond", () => {
  const implicit = finishOf(undefined);
  const explicit = finishOf(DEFAULT_CONFIG_WORLD);
  assert.ok(implicit.length === N, "every racer finished");
  assert.deepEqual(implicit, explicit);
});

test("the world parameter is load-bearing: a different world is a different race", () => {
  const shipped = finishOf(DEFAULT_CONFIG_WORLD);
  const wild = finishOf(worldForActionStage("wild"));
  assert.notDeepEqual(
    shipped,
    wild,
    "racing `wild` produced the `quiet` result — the world parameter is being ignored, which is " +
      "the HARNESS-WORLD-1 defect back again"
  );
});

test("the stage comes from raceActionStage.js and is applied exactly once", () => {
  for (const id of RACE_ACTION_STAGE_IDS) {
    const w = worldForActionStage(id);
    assert.deepEqual(
      w.raceDynamicsConfig,
      applyRaceActionStage(DEFAULT_CONFIG_WORLD.raceDynamicsConfig, id),
      `stage "${id}" does not match the one home's own application`
    );
    // Applying it again must change nothing — the driver hands stored worlds over whole, and a
    // second application anywhere in that path has to be a provable no-op.
    assert.deepEqual(worldForActionStage(id, w).raceDynamicsConfig, w.raceDynamicsConfig);
  }
});

test("every other block is carried through untouched, and the base is never mutated", () => {
  const before = JSON.stringify(DEFAULT_CONFIG_WORLD);
  const w = worldForActionStage("wild");
  for (const k of Object.keys(DEFAULT_CONFIG_WORLD)) {
    if (k === "raceDynamicsConfig") continue;
    assert.equal(w[k], DEFAULT_CONFIG_WORLD[k], `${k} was replaced rather than carried through`);
  }
  assert.equal(JSON.stringify(DEFAULT_CONFIG_WORLD), before, "the base world was mutated");
});
