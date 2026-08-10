// ============================================================
// ceremonySamples.test.mjs — the render sampler follows the ceremony (RENDER-SAMPLER-CEREMONY)
//
// Run: node --test scripts/lib/ceremonySamples.test.mjs
//
// WHAT BREAKS IF THIS IS DELETED: the sampler goes back to being a set of numbers that happen to be
// right today. The whole point of deriving them is that a future beat change cannot silently blind
// the instrument — so the property under test is not "these are the points", it is "a point lands
// inside every beat, whatever the beats are".
//
// It is asserted against the REAL schedule builder, not a fixture, because the two are only useful
// together: a sampler that satisfies its own idea of a schedule proves nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ceremonySamplePoints, CEREMONY_SAMPLE_BEATS } from "./ceremonySamples.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { ceremonyScheduleFor, ceremonyAt, boardAlphaAt, BOARD_FADE_MS, CEREMONY_BEAT } =
  await import(u("client/src/modules/camera/startCeremony.js"));
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));

const CFG = DEFAULT_CAMERA_CONFIG;
/** Field sizes that span what the board's length actually does — it scales with the roster. */
const FIELDS = [4, 8, 40, 100, 140];

test("EVERY beat of the ceremony gets a sample, at every field size, branded or not", () => {
  // THE PROPERTY, and it is the only one that matters: whatever the schedule turns out to be, no
  // beat is left without a frame. This is the assertion the five typed milliseconds could not make.
  for (const n of FIELDS) {
    for (const hasBrand of [false, true]) {
      const s = ceremonyScheduleFor(CFG, n, hasBrand);
      const pts = ceremonySamplePoints(s, BOARD_FADE_MS);
      const beats = new Set(pts.map((p) => ceremonyAt(p.ms, s).beat));
      const want = [CEREMONY_BEAT.VENUE, CEREMONY_BEAT.PUSH, CEREMONY_BEAT.BOARD];
      for (const b of want) {
        assert.ok(beats.has(b), `n=${n} brand=${hasBrand}: nothing sampled the ${b} beat`);
      }
      if (hasBrand) {
        assert.ok(beats.has(CEREMONY_BEAT.BRAND), `n=${n}: the brand beat went unsampled`);
      }
      // SETTLED covers both the settled beat and the digits, which `ceremonyAt` does not separate —
      // it stops at the board. They are separated by `countdownStartMs`, so that is what is asked.
      assert.ok(
        pts.some((p) => p.ms >= s.boardEndMs && p.ms < s.countdownStartMs),
        `n=${n} brand=${hasBrand}: nothing sampled the settled beat`,
      );
      assert.ok(
        pts.some((p) => p.ms >= s.countdownStartMs && p.ms < s.totalMs),
        `n=${n} brand=${hasBrand}: nothing sampled the countdown digits`,
      );
    }
  }
});

test("a ZERO-LENGTH beat contributes NO point — the brand when no brand is opening", () => {
  // The failure this prevents is a degenerate sample: a beat of no length would otherwise be hashed
  // at its start, which is another beat's frame under a label that lies about it.
  const s = ceremonyScheduleFor(CFG, 40, false);
  assert.equal(s.brandMs, 0);
  const pts = ceremonySamplePoints(s, BOARD_FADE_MS);
  assert.ok(!pts.some((p) => p.beat === "brand"), "a brand point exists with no brand beat");
  // …and with a brand it is there, so the absence above is a decision rather than an oversight.
  const branded = ceremonySamplePoints(ceremonyScheduleFor(CFG, 40, true), BOARD_FADE_MS);
  assert.ok(branded.some((p) => p.beat === "brand"));
});

test("every point is STRICTLY inside its beat, never on a boundary", () => {
  // A point on a boundary belongs to whichever beat a rounding puts it in, which is how a sample
  // silently changes meaning. The midpoint rule exists for this and it is checked, not assumed.
  const bounds = (s) => ({
    brand: [0, s.brandEndMs],
    venue: [s.brandEndMs, s.venueEndMs],
    push: [s.venueEndMs, s.pushEndMs],
    "board-fade": [s.boardStartMs, s.boardEndMs],
    board: [s.boardStartMs, s.boardEndMs],
    settled: [s.boardEndMs, s.countdownStartMs],
    digits: [s.countdownStartMs, s.totalMs],
  });
  for (const n of FIELDS) {
    for (const hasBrand of [false, true]) {
      const s = ceremonyScheduleFor(CFG, n, hasBrand);
      const b = bounds(s);
      for (const p of ceremonySamplePoints(s, BOARD_FADE_MS)) {
        const [from, to] = b[p.beat];
        assert.ok(p.ms > from && p.ms < to, `n=${n}: ${p.beat}@${p.ms} is not inside [${from},${to})`);
      }
    }
  }
});

test("the board gets TWO points, and they see DIFFERENT alphas — the ramp and the hold", () => {
  // If both landed at full opacity, the fade would be unmeasured and the second frame would be
  // paying for nothing.
  for (const n of FIELDS) {
    const s = ceremonyScheduleFor(CFG, n, true);
    const pts = ceremonySamplePoints(s, BOARD_FADE_MS);
    const fade = pts.find((p) => p.beat === "board-fade");
    const hold = pts.find((p) => p.beat === "board");
    assert.ok(fade && hold, `n=${n}: the board is missing one of its two points`);
    const aFade = boardAlphaAt(fade.ms, s);
    const aHold = boardAlphaAt(hold.ms, s);
    assert.ok(aFade > 0 && aFade < 1, `n=${n}: the fade point is at alpha ${aFade}, not on the ramp`);
    assert.equal(aHold, 1, `n=${n}: the hold point is not at full opacity`);
  }
});

test("the points are ASCENDING — the harness walks them once, in order, and would skip any that are not", () => {
  for (const n of FIELDS) {
    const pts = ceremonySamplePoints(ceremonyScheduleFor(CFG, n, true), BOARD_FADE_MS);
    for (let i = 1; i < pts.length; i++) {
      assert.ok(pts[i].ms > pts[i - 1].ms, `n=${n}: ${pts[i].beat} does not follow ${pts[i - 1].beat}`);
    }
  }
});

test("A BEAT THAT MOVES TAKES ITS SAMPLE WITH IT — the defect this replaced, stated as a test", () => {
  // The five typed milliseconds topped out at 4900 while the board had moved to 5000-11000. Lengthen
  // any earlier beat and the board moves again; the derived points must move with it and a FIXED
  // list must not. Both halves are asserted, because only the pair says the mechanism works.
  const base = ceremonyScheduleFor(CFG, 40, false);
  const later = ceremonyScheduleFor({ ...CFG, ceremonyVenueMs: CFG.ceremonyVenueMs + 9000 }, 40, false);
  assert.ok(later.boardStartMs > base.boardStartMs, "the fixture did not actually move the board");
  const boardOf = (s) => ceremonySamplePoints(s, BOARD_FADE_MS).find((p) => p.beat === "board").ms;
  assert.ok(boardOf(later) > boardOf(base), "the board sample did not follow the board");
  assert.ok(
    boardOf(later) > later.boardStartMs && boardOf(later) < later.boardEndMs,
    "the board sample followed, but not into the board",
  );
  // And the old list, for contrast: every one of its points is now outside the board.
  const OLD = [0, 1500, 2400, 3800, 4900];
  assert.ok(
    OLD.every((ms) => ms < base.boardStartMs),
    "the fixed list is no longer outside the board — this test's premise has expired",
  );
});

test("the declared beat labels are the ones the sampler actually produces", () => {
  // One home for the label set. A label added to the sampler and not to the list (or the reverse)
  // would make the summary line and the hash markers disagree about what was measured.
  const produced = new Set(
    FIELDS.flatMap((n) =>
      [false, true].flatMap((b) =>
        ceremonySamplePoints(ceremonyScheduleFor(CFG, n, b), BOARD_FADE_MS).map((p) => p.beat),
      ),
    ),
  );
  assert.deepEqual([...produced].sort(), [...CEREMONY_SAMPLE_BEATS].sort());
});
