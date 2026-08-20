// ============================================================
// File:        scripts/camera-seed-determinism.test.mjs
// Project:     RaceArena — CAMERA-SEED-AND-LINE-1
//
// THE PROMISE, ON A REAL RACE: the same race seed gives the same camera trajectory; a different one
// does not.
//
// ── WHY THIS IS HERE AND NOT IN THE CLIENT SUITE ─────────────────────────────────────────────
//
// It was written there first, on a synthetic fixture, and the fixture was BLIND: measured, the
// director rolled its dice ONCE in 600 frames, and that one draw was against a weight of 1, where
// the value cannot change the outcome. Two different seeds produced byte-identical trajectories and
// the test "passed" while proving nothing. The state machine only reaches its random choices on a
// race with real geometry — pulk detection, comeback detection and the lead-change latch all read
// fields a hand-built racer does not have.
//
// So the promise is proved where it lives: on `raceDriver`, with a real track and a real field.
// `cameraSeed.test.js` keeps the pure-function half (the derivation itself).
//
// ── THE TWO HALVES SABOTAGE-PROVE EACH OTHER ─────────────────────────────────────────────────
//
// "Two runs of one seed are identical" is the assertion that passes when the recorder sees nothing.
// "Two different seeds differ" is the assertion that fails in exactly that case. Neither is
// meaningful alone; together, the first cannot pass vacuously — and the second is checked to differ
// in the STATE SEQUENCE, not merely in some float, because a state difference is what the owner
// sees as "the camera behaved differently".
// ============================================================

import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "./lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { cameraSeedForRace } = await import(u("client/src/modules/camera/cameraSeed.js"));

const TRACK = "ice-track";
const RACERS = 40;
const RACE_SEED = 9;
const STEP_LIMIT = 1600; // physics steps; enough to pass the start window and take several shots

const geo = loadTracks({ only: TRACK })[0];

/** Drive one race with a given CAMERA seed; return the camera per frame and the states it used. */
function trajectory(cameraSeed) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: RACE_SEED,
    cameraSeed,
    racerType: TRACK_DEFAULT_RACER,
    canvasW: 1280,
    canvasH: 720,
  });
  const cfg = structuredClone(DEFAULT_CAMERA_CONFIG);
  const race = buildRace(geo, identity, cfg);
  const rows = [];
  const states = [];
  let lastState = null;
  runRace(race, identity, cfg, ({ cd, physicsSteps }) => {
    rows.push(
      `${cd.zoom.toFixed(9)}|${cd.offsetX.toFixed(6)}|${cd.offsetY.toFixed(6)}|${cd.state}`
    );
    if (cd.state !== lastState) {
      states.push(cd.state);
      lastState = cd.state;
    }
    if (physicsSteps > STEP_LIMIT) return false;
  });
  return { trace: rows.join("\n"), states: states.join(">"), frames: rows.length };
}

describe("CAMERA-SEED-AND-LINE-1 — the same race seed gives the same camera", () => {
  // IF DELETED: the block's whole promise goes unguarded and a return to a drawn seed would be
  // invisible until the owner again reported a picture nobody could stand in again.
  it("two runs of one race seed produce an IDENTICAL camera trajectory", () => {
    const a = trajectory(cameraSeedForRace(RACE_SEED));
    const b = trajectory(cameraSeedForRace(RACE_SEED));
    expect(a.frames).toBeGreaterThan(500);
    expect(b.trace).toBe(a.trace);
    // A real race on the real driver; vitest's 5 s default is not enough for two of them.
  }, 120_000);

  // IF DELETED: the test above could pass on a recorder that captures nothing, which is exactly
  // how the first version of this test passed while proving nothing.
  it("two different race seeds produce a DIFFERENT camera trajectory, including different STATES", () => {
    const a = trajectory(cameraSeedForRace(RACE_SEED));
    const b = trajectory(cameraSeedForRace(RACE_SEED + 1));
    expect(b.trace).not.toBe(a.trace);
    expect(b.states).not.toBe(a.states);
  }, 120_000);
});
