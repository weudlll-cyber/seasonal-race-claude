// ============================================================
// File:        scripts/sim-fairness.characterisation.test.mjs
// Project:     RaceArena — SIM-PINNED-1
//
// ★ WHAT THIS OWNS: pinning what `sim-fairness.mjs` DOES TODAY, so a future edit that changes its
// behaviour goes red instead of quietly producing different numbers.
//
// `sim-fairness.mjs` is 6,195 lines and had no test of any kind. It is also a declared reach entry
// of the WORLD fingerprint, so it is one of the few files where a silent behaviour change would
// invalidate measurements this project has already acted on — and nothing would have said so.
//
// ── ★ THESE ARE CHARACTERISATION TESTS, NOT SPECIFICATIONS ──────────────────────────────────────
//
// They assert what the code PRODUCES, not what anybody thinks it should produce. If one fails, the
// right first question is "did I mean to change this?", not "is the expectation wrong". Every
// number below is a record of behaviour on the day it was written and carries no opinion.
//
// ── WHAT IS COVERED, AND WHY THESE TWO ──────────────────────────────────────────────────────────
//
//   · `makePRNG` — an exported seeded stream, pinned to exact draws.
//     ★ CORRECTED BY THE SABOTAGE: this note first claimed it was "the stream everything else is
//     downstream of". IT IS NOT. Offsetting its seed reddened only its own test and left every race
//     assertion green — because `runSingleRace` draws from `makeRaceRng(seed).physics` (:1058), a
//     DIFFERENT stream. Worth knowing: a change to `makePRNG` does not move a race, and a reader who
//     assumed otherwise would mis-read a red here.
//   · `runSingleRace` — ★ BOTH the main entry path AND the longest function in the file (2,777
//     lines, from :1029). One target satisfies both halves of what was asked, because they are the
//     same function. It is pinned by OUTCOME — the finishing order and the finishing times of a
//     fixed seed on a fixed track — which is what every caller actually reads.
//
// ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────────────────────────
//
//   · It does NOT refactor, split or shorten `sim-fairness.mjs`. Not one line of it was touched.
//   · It does not test the CLI, flag parsing or the report writers — pinning those here would make
//     this file about argument handling instead of about the race.
//   · It does not judge whether the behaviour is RIGHT. That is the fairness gate's question.
//   · It pins ONE identity. A change that moves only some other track or field size is outside it,
//     and that limit is real rather than hidden.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => new URL("file:///" + join(ROOT, p).replace(/\\/g, "/"));

const SIM = await import(u("scripts/sim-fairness.mjs"));
const { EditorShape } = await import(u("client/src/modules/track-editor/EditorShape.js"));

// ── makePRNG ────────────────────────────────────────────────────────────────────────────────────

test("makePRNG is deterministic for a seed, and its draws are in [0,1)", () => {
  const a = SIM.makePRNG(12345);
  const b = SIM.makePRNG(12345);
  const first = [a(), a(), a(), a(), a()];
  const second = [b(), b(), b(), b(), b()];
  assert.deepEqual(first, second, "the same seed must produce the same stream");
  for (const v of first) assert.ok(v >= 0 && v < 1, `a draw must be in [0,1): got ${v}`);
});

test("makePRNG separates seeds", () => {
  assert.notEqual(SIM.makePRNG(1)(), SIM.makePRNG(2)(), "two seeds must not agree on the first draw");
});

// NOT the race's stream — see the correction in the header. This pins makePRNG for its own sake.
test("★ makePRNG's stream is PINNED", () => {
  const r = SIM.makePRNG(42);
  assert.deepEqual(
    [r(), r(), r()].map((x) => x.toFixed(12)),
    ["0.601103751920", "0.448290558998", "0.852465793490"]
  );
});

// ── runSingleRace — the main entry path AND the longest function ────────────────────────────────

const N = 12;

/** The one identity these tests characterise: dirt-oval, seed 4242, twelve racers. */
function fixture() {
  const geo = JSON.parse(readFileSync(join(ROOT, "server/seeds/tracks/dirt-oval.json"), "utf8"));
  const shape = new EditorShape(geo);
  return {
    shape,
    pathLengthPx: geo.pathLengthPx,
    geometricTrackWidth: geo.width,
    isOpen: shape.isOpen,
    speedMultiplier: 1.0,
    displaySize: 47,
    laps: geo.defaultLaps ?? 2,
    requestedSeconds: 60,
    seed: 4242,
    nRacers: N,
  };
}

/** The finishers, in finishing order. `runSingleRace` returns racers keyed 0..N-1. */
const finishers = (out) =>
  Array.from({ length: N }, (_, i) => out[i]).sort((a, b) => a.finalRank - b.finalRank);

test("runSingleRace places every racer exactly once, ranks 1..N with no gaps", () => {
  const out = SIM.runSingleRace(fixture());
  assert.ok(out, "a race must come back");
  const rows = finishers(out);
  assert.deepEqual(
    rows.map((r) => r.finalRank),
    Array.from({ length: N }, (_, i) => i + 1)
  );
  assert.equal(new Set(rows.map((r) => r.racerIndex)).size, N, "every racer appears exactly once");
});

test("★ runSingleRace is DETERMINISTIC for a seed — the same race twice", () => {
  const a = finishers(SIM.runSingleRace(fixture())).map((r) => r.racerIndex);
  const b = finishers(SIM.runSingleRace(fixture())).map((r) => r.racerIndex);
  assert.deepEqual(a, b, "the same seed must produce the same finishing order");
});

test("★ THE CHARACTERISATION: runSingleRace's finishing ORDER is pinned", () => {
  // Recorded behaviour for dirt-oval / seed 4242 / N=12. A change to how the race runs changes this
  // line. That is the point of the file, not a defect in it.
  const order = finishers(SIM.runSingleRace(fixture())).map((r) => r.racerIndex);
  assert.deepEqual(order, [11, 1, 8, 2, 7, 9, 0, 6, 10, 4, 5, 3]);
});

test("★ THE CHARACTERISATION: runSingleRace's finishing TIMES are pinned", () => {
  // The order can survive a change that still moves every clock, so the times are pinned too.
  const times = finishers(SIM.runSingleRace(fixture())).map((r) => r.finishTime);
  assert.deepEqual(
    times,
    [82.912, 85.056, 85.712, 85.936, 86, 86.56, 87.392, 89.008, 90.24, 90.464, 91.28, 92.112]
  );
});

test("★ THE CHARACTERISATION: the race reaches OUTCOME and its duration is pinned", () => {
  const out = SIM.runSingleRace(fixture());
  assert.equal(out.outcomeReached, true, "this identity reaches the OUTCOME phase");
  assert.equal(out.physicalDurationS, 92.112);
});

test("a different seed produces a different race", () => {
  const a = finishers(SIM.runSingleRace(fixture())).map((r) => r.racerIndex).join(",");
  const b = finishers(SIM.runSingleRace({ ...fixture(), seed: 9999 }))
    .map((r) => r.racerIndex)
    .join(",");
  assert.notEqual(a, b, "two seeds must not run the same race");
});
