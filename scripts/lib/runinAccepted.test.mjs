// ============================================================
// File:        scripts/lib/runinAccepted.test.mjs
// Project:     RaceArena — RUNIN-ACCEPTED-1
//
// THE POINT OF THIS FILE IS THAT THE ACCEPTED LIST CANNOT QUIETLY GROW. An exception that stops a
// guard failing is worth exactly as much as the thing that stops it widening, and this project has
// twice found a guard that had been made green by broadening what it forgave rather than by fixing
// what it caught.
//
// So the list is asserted ELEMENT BY ELEMENT — not by length, not by "contains dirt-oval". A third
// entry, a changed field, a wildcard, or a match that ignores the seed all turn this file red.
//
// It imports the list rather than the guard: `check-runin-frame.mjs` runs ten races at module load
// and takes about three quarters of a minute, which is why the list has its own home.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { RUNIN_ACCEPTED, isAcceptedRunInCase } from "./runinAccepted.mjs";

/** The accepted case, spelled out here so a change in the module has to be made in two places. */
const DIRT = { track: "dirt-oval", racers: 40, seed: 9, everOnCanvas: true };
const LUGE = { track: "luger-hill", racers: 100, seed: 9, everOnCanvas: true };

test("the list is EXACTLY two named cases, field by field", () => {
  assert.equal(RUNIN_ACCEPTED.length, 2, "the accepted list has grown or shrunk");
  const shape = RUNIN_ACCEPTED.map(({ track, racers, seed }) => ({ track, racers, seed }));
  assert.deepEqual(shape, [
    { track: "dirt-oval", racers: 40, seed: 9 },
    { track: "luger-hill", racers: 100, seed: 9 },
  ]);
  // Every entry carries its own reason, with the date the picture was judged.
  for (const a of RUNIN_ACCEPTED) {
    assert.match(a.why, /2026-09-14/, `entry ${a.track} does not carry the acceptance date`);
    assert.match(a.why, /production build/, `entry ${a.track} does not say what was judged`);
  }
});

test("the two accepted cases are accepted", () => {
  assert.equal(isAcceptedRunInCase(DIRT), true);
  assert.equal(isAcceptedRunInCase(LUGE), true);
});

// ── THE SABOTAGE THIS FILE EXISTS FOR: NOTHING ELSE MAY BE ACCEPTED ────────────────────────────
//
// Each case below is one field away from an accepted one. If the match is ever loosened to a
// wildcard, to "any seed on this track", to "any field size", or to a pattern, at least one of
// these flips to true and this test goes red.
test("a DIFFERENT SEED on the same track and field size is NOT accepted", () => {
  assert.equal(isAcceptedRunInCase({ ...DIRT, seed: 11 }), false, "seed 11 is master's own failing seed — it must not be swallowed");
  assert.equal(isAcceptedRunInCase({ ...DIRT, seed: 1 }), false);
  assert.equal(isAcceptedRunInCase({ ...LUGE, seed: 8 }), false);
});

test("a DIFFERENT FIELD SIZE on the same track and seed is NOT accepted", () => {
  assert.equal(isAcceptedRunInCase({ ...DIRT, racers: 20 }), false);
  assert.equal(isAcceptedRunInCase({ ...DIRT, racers: 100 }), false);
  assert.equal(isAcceptedRunInCase({ ...LUGE, racers: 40 }), false);
});

test("a DIFFERENT TRACK at the same field size and seed is NOT accepted", () => {
  for (const track of [
    "city-circuit", "garden-path", "ice-track", "mountainstreet",
    "river-run", "searound", "seatrack", "space-sprint",
  ]) {
    assert.equal(isAcceptedRunInCase({ ...DIRT, track }), false, `${track} must not be accepted`);
    assert.equal(isAcceptedRunInCase({ ...LUGE, track }), false, `${track} must not be accepted`);
  }
});

test("a band that is NEVER on the canvas is NOT accepted, even on an accepted race", () => {
  // What was judged is a band that leaves and comes back. "It is never there" is a different
  // picture and nobody has looked at it.
  assert.equal(isAcceptedRunInCase({ ...DIRT, everOnCanvas: false }), false);
  assert.equal(isAcceptedRunInCase({ ...LUGE, everOnCanvas: false }), false);
});

test("a missing or malformed case is NOT accepted", () => {
  assert.equal(isAcceptedRunInCase({ track: "dirt-oval", racers: 40, seed: 9, everOnCanvas: undefined }), false);
  assert.equal(isAcceptedRunInCase({ track: "dirt-oval", racers: "40", seed: 9, everOnCanvas: true }), false, "a string field size must not match a number");
  assert.equal(isAcceptedRunInCase({ track: "dirt-oval", racers: 40, seed: "9", everOnCanvas: true }), false, "a string seed must not match a number");
});

test("the list is frozen, so nothing can push onto it at runtime", () => {
  assert.equal(Object.isFrozen(RUNIN_ACCEPTED), true);
  assert.throws(() => RUNIN_ACCEPTED.push({ track: "x", racers: 1, seed: 1 }));
});
