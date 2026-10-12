// ============================================================
// File:        scripts/lib/measuredGate.test.mjs
// Project:     RaceArena — GATE-MEASURES-1 (fix/viewer-invariants-gate, 2026-10-12)
//
// The measured-nothing refusal is the half of `measuredGate.mjs` that decides whether a gate may
// say PASS, so it is tested on the exact shape that slipped through on 2026-10-12: two races,
// `0 frames`, no window, no crossing, probe off. The browser half (`enterWithTestAidsOn`) needs a
// running app and is proved by the gate run itself and by `--sabotage-unmeasured`.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { unmeasured, refuseUnmeasured } from "./measuredGate.mjs";

const NEED = { "probe runs": 1, frames: 2, "in-window frames": 2, crossings: 1 };

test("the 2026-10-12 run — 0 frames on both races — is NOT measured, on every count", () => {
  const zero = { "probe runs": 0, frames: 0, "in-window frames": 0, crossings: 0 };
  const out = unmeasured([
    { label: "shipped/city-circuit seed 9", have: zero, need: NEED },
    { label: "shipped/space-sprint seed 9", have: zero, need: NEED },
  ]);
  assert.equal(out.length, 8);
  assert.match(out[0], /^shipped\/city-circuit seed 9: 0 probe runs, needs at least 1/);
});

test("a measured race passes, and one short count alone still fails", () => {
  const full = { "probe runs": 1, frames: 6128, "in-window frames": 368, crossings: 1 };
  assert.deepEqual(unmeasured([{ label: "a", have: full, need: NEED }]), []);
  const oneFrame = { ...full, frames: 1 };
  const out = unmeasured([{ label: "a", have: oneFrame, need: NEED }], {
    frames: "a step needs two",
  });
  assert.deepEqual(out, ["a: 1 frames, needs at least 2 — a step needs two"]);
});

test("a count the case does not report is zero, and no cases at all is a shortfall", () => {
  assert.equal(unmeasured([{ label: "a", have: {}, need: { frames: 1 } }]).length, 1);
  assert.deepEqual(unmeasured([]), ["no case ran at all"]);
});

test("refuseUnmeasured says FAIL exactly when there is a shortfall", () => {
  const log = console.log;
  const lines = [];
  console.log = (s) => lines.push(String(s));
  try {
    assert.equal(refuseUnmeasured("t", []), false);
    assert.equal(lines.length, 0);
    assert.equal(refuseUnmeasured("t", ["a: 0 frames, needs at least 2"]), true);
  } finally {
    console.log = log;
  }
  assert.match(lines.join("\n"), /NOT MEASURED/);
  assert.match(lines.join("\n"), /a: 0 frames, needs at least 2/);
});
