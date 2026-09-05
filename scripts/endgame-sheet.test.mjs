// ============================================================
// endgame-sheet.test.mjs — the sheet tells an ACCEPTED failure from a finding (GATE-WIRED-AND-CAUSED-1)
//
// Run: node --test scripts/endgame-sheet.test.mjs
//
// WHAT BREAKS IF THIS IS DELETED. The distinction these tests hold is the only thing standing
// between "the picture the owner asked for" and "a defect", on two of the twelve items. Get it
// wrong in one direction and every failure on items 2 and 9 reads as accepted — the items are
// disarmed while still printing, which is the exact shape this project has paid for four times.
// Get it wrong in the other and the accepted case goes back to reading as a regression, which is
// the state the sheet was in before and which sends somebody chasing a picture that is finished.
//
// PROPERTIES, NOT INSTANCES (R7). Every probe below is SYNTHETIC and names no track and no seed,
// which is itself the point: the cause is computed from two fields of the crossing frame, so a
// test that needed a real race to exercise it would be testing something else.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeRace, printSheet, acceptedCause, verdictOf } from "./endgame-sheet.mjs";

// The two shipped zoom endpoints, in the ratio the defaults produce: PHOTO_FINISH is the tightest
// setting in the race, so its zoom is the LARGER number and "short of it" is on the wide side.
const LEADER = 9.0977;
const PHOTO = 17.0583;

/** Ten window frames that pass every item this test is not about. */
const frames = () =>
  Array.from({ length: 10 }, (_, i) => ({
    lnW: 1 - i * 0.01,
    band: 12,
    corr: 1.5 - i * 0.01,
    p: 0.95 + i * 0.005,
    contOff: 0,
    contOffOld: 0,
    dropFallback: 0,
    dropWeight: 0,
    leadFrac: 0.4, // < 0.5, so item 10 passes and cannot be what a failure below is about
    courseIn: true,
  }));

/**
 * A whole probe, with the crossing frame dictated by the caller.
 * @param {object} at  overrides for the crossing row
 */
const probe = (at = {}) => ({
  sheet: {
    win: frames(),
    deadline: { leaderOn: true, band: 9 },
    pre: 0,
  },
  crossing: {
    at: {
      fx: 0.5,
      fy: 0.5,
      state: "PHOTO_FINISH",
      binding: "level",
      camZoom: LEADER,
      leaderZoom: LEADER,
      photoFinishZoom: PHOTO,
      ms: 0,
      ...at,
    },
    after: [],
  },
});

const grade = (at) =>
  gradeRace(probe(at), { track: "synthetic", seed: 0, arm: "shipped", n: 40 });

// The shot on its way in: away from BOTH named factors, so item 2 fails on its own terms.
const IN_FLIGHT = { camZoom: LEADER * 1.1 };
// The shot arrived and settled: at the photo-finish factor, decided by the state's own setting.
const SETTLED = { camZoom: PHOTO, binding: "state" };
// The winner outside his own inner region — `innerFramePct` is 0.7, so the band is 0.15 … 0.85.
const CUT = { fx: 0.95 };

test("THE ACCEPTED CAUSE NEEDS BOTH CONDITIONS, and neither alone", () => {
  // Both: the closing zoom has not arrived AND the level guarantee is deciding the width.
  assert.equal(acceptedCause(probe(IN_FLIGHT).crossing.at).accepted, true);
  // The zoom in flight but the width decided by the state — not the accepted shape.
  assert.equal(
    acceptedCause(probe({ ...IN_FLIGHT, binding: "state" }).crossing.at).accepted,
    false,
  );
  // The level binding but the zoom ARRIVED. This is the case the sheet's own note calls "still a
  // finding" in as many words: the shot is settled and the picture is wrong anyway.
  assert.equal(
    acceptedCause(probe({ camZoom: PHOTO, binding: "level" }).crossing.at).accepted,
    false,
  );
  // Nothing to read: no crossing, or a director that reported no zoom values.
  assert.equal(acceptedCause(null), null);
  assert.equal(acceptedCause({ binding: "level", camZoom: 0, photoFinishZoom: 0 }), null);
});

test("SABOTAGE (b) CATCHER: the accepted case must NOT read as a regression", () => {
  // Force the cause test false and this is the test that goes red. It is the whole reason the
  // block exists: item 9 objects to a picture the owner considered and kept.
  const r = grade({ ...IN_FLIGHT, ...CUT });
  assert.equal(r.i2, false, "the MEASUREMENT still fails — nothing is muted");
  assert.equal(r.i9, false, "the MEASUREMENT still fails — nothing is muted");
  assert.equal(r.i2_verdict, "accepted");
  assert.equal(r.i9_verdict, "accepted");
});

test("SABOTAGE (a) CATCHER: a failure from ANY OTHER cause still fails", () => {
  // Force the cause test true and both of these go red. A settled shot that still loses the winner
  // is the case nothing has been accepted about.
  const settledAndCut = grade({ ...SETTLED, ...CUT, camZoom: PHOTO * 1.001 });
  assert.equal(settledAndCut.i9, false);
  assert.equal(settledAndCut.i9_verdict, "FAIL", "a settled shot that cuts the winner is a finding");

  const settledOffFactor = grade({ camZoom: LEADER * 1.1, binding: "corridor-cap" });
  assert.equal(settledOffFactor.i2, false);
  assert.equal(settledOffFactor.i2_verdict, "FAIL", "a fail with the level guarantee not binding is a finding");
});

test("A PASSING ITEM IS NEVER RELABELLED, and an ungradeable one stays ungradeable", () => {
  // The direction that would hide a green row behind a cause it never needed.
  const pass = grade({ camZoom: PHOTO });
  assert.equal(pass.i2, true);
  assert.equal(pass.i2_verdict, "ok");
  assert.equal(pass.i9, true);
  assert.equal(pass.i9_verdict, "ok");
  // No crossing at all: both items already report `—`, and a verdict must not invent an answer.
  const noCross = gradeRace(
    { sheet: probe().sheet, crossing: null },
    { track: "synthetic", seed: 0, arm: "shipped", n: 40 },
  );
  assert.equal(noCross.i2, null);
  assert.equal(noCross.i2_verdict, null);
  assert.equal(noCross.i9, null);
  assert.equal(noCross.i9_verdict, null);
  assert.deepEqual(
    [verdictOf(null, null), verdictOf(true, null), verdictOf(false, null)],
    [null, "ok", "FAIL"],
  );
});

test("★ ITEM 10 IS OUT OF SCOPE AND MUST STAY OUT — no verdict, no cause, a plain FAIL", () => {
  // Its supposed accepted cause was a sentence stripped of its attribution on 2026-09-05: what is
  // established about a BATTLE_ZOOM in the window is a MEASUREMENT, not an accepted behaviour. A
  // verdict column here would re-assert exactly the attribution that was withdrawn. This test
  // fails the moment somebody adds one "for symmetry", which is the likeliest way it comes back.
  const p = probe(IN_FLIGHT);
  for (const f of p.sheet.win) f.leadFrac = 0.9; // never behind centre: item 10 fails
  const r = gradeRace(p, { track: "synthetic", seed: 0, arm: "shipped", n: 40 });
  assert.equal(r.i10, false, "the item must still fail");
  assert.equal(r.i10_verdict, undefined, "item 10 must carry NO verdict — it is deliberately plain");
  // And the accepted cause IS present on this row, so the assertion above is not passing by luck.
  assert.equal(r.cause_accepted, true);
});

test("THE CAUSE IS COMPUTED FROM THE FRAMES — no track name, no seed, no list", () => {
  // A hard-coded exception list is the thing this replaces. Two runs with identical frames and
  // different identities must grade identically; one run whose identity is a known-failing race
  // must still read FAIL when its frames say so.
  const a = gradeRace(probe({ ...IN_FLIGHT, ...CUT }), { track: "garden-path", seed: 9, arm: "shipped", n: 100 });
  const b = gradeRace(probe({ ...IN_FLIGHT, ...CUT }), { track: "space-sprint", seed: 1, arm: "his", n: 40 });
  assert.equal(a.i9_verdict, b.i9_verdict);
  const listed = gradeRace(probe({ ...SETTLED, ...CUT, camZoom: PHOTO * 1.001 }), {
    track: "garden-path",
    seed: 9,
    arm: "shipped",
    n: 100,
  });
  assert.equal(listed.i9_verdict, "FAIL", "a known-failing race is not excused by its name");
});

test("THE PRINTED SHEET NAMES THE OUTCOME — a reader sees it without opening a document", () => {
  // The distinction has to reach the terminal. It lived only in this file's prose before, which is
  // the defect: nobody reads four paragraphs of a script to interpret a row.
  const said = [];
  const real = console.log;
  console.log = (...a) => said.push(a.join(" "));
  try {
    printSheet(
      [grade({ ...IN_FLIGHT, ...CUT }), grade({ ...SETTLED, ...CUT, camZoom: PHOTO * 1.001 })],
      "test",
    );
  } finally {
    console.log = real;
  }
  const out = said.join("\n");
  assert.match(out, /ACC/, "the accepted outcome must be visible on the row");
  assert.match(out, /FAIL/, "and so must the finding");
  // The summary counts them apart, and says both, so neither can be read off as the whole story.
  assert.match(out, /item 2 — ACC \d+, FAIL \d+/);
  assert.match(out, /item 9 — ACC \d+, FAIL \d+/);
  // The per-item failing counts are UNCHANGED in meaning: they count what the item measured.
  assert.match(out, /FAILING RACES per item/);
});
