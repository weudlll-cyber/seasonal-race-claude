// ============================================================
// cohesion.test.mjs — the lap-seam golden for the Stage-0 link observer.
// Run: node --test scripts/sim/observers/cohesion.test.mjs
//
// A prior cohesion attempt died on a multi-lap normalisation bug: a racer crossing the 0/1 seam made
// its gap to the car behind JUMP from ~0 to ~a-full-lap. `arcT` (raceLengths.js) fixes this — closed
// tracks measure the SHORT arc, lap-count independent. This proves the observer's link is continuous
// across the seam, and that open tracks use the raw monotonic difference.
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { consecutiveLinks, makeCohesionObserver } from "./cohesion.mjs";

const LEN = 100; // lenScale: 100 lengths per lap-fraction (pathLengthPx 3000 / meanBody 30)
const R = (index, t) => ({
  index,
  t,
  finished: false,
  isHeroChoreographed: false,
  trajectoryMult: 1.0,
});

test("CLOSED: link is the SHORT arc and is CONTINUOUS across the 0/1 lap seam", () => {
  // Leader approaches, crosses, and passes the seam; the chaser sits just behind at t=0.97.
  // The link (leader→chaser) must stay small and continuous — never jump to ~a full lap.
  const chaser = 0.97;
  const leaderTs = [0.98, 0.99, 1.0, 1.01, 1.02, 1.05]; // crossing the seam mid-sequence
  let prev = null;
  for (const lt of leaderTs) {
    const { links } = consecutiveLinks(
      [R(0, lt), R(1, chaser)],
      /*isOpen*/ false,
      LEN,
    );
    const len = links[0].len; // leader→chaser, racer lengths
    // The true short-arc gap grows smoothly 0.01→0.08 lap = 1→8 lengths; it must NEVER be ~92 lengths.
    assert.ok(len < 10, `seam link jumped to ${len} lengths (multi-lap bug)`);
    // A seam bug shows a ~90-length jump; legitimate growth here is ≤ 3 lengths/step. 20 separates them.
    if (prev != null)
      assert.ok(
        Math.abs(len - prev) < 20,
        `discontinuity across the seam: ${prev} → ${len}`,
      );
    prev = len;
  }
});

test("CLOSED: arcT picks the short way round (0.98 vs 0.02 = 0.04 lap, not 0.96)", () => {
  const { links } = consecutiveLinks([R(0, 1.02), R(1, 0.98)], false, LEN); // 0.02 and 0.98 within-lap
  assert.ok(
    Math.abs(links[0].len - 4.0) < 1e-6,
    `expected 4 lengths (short arc), got ${links[0].len}`,
  );
});

test("OPEN: link is the raw monotonic difference (no wrap)", () => {
  const { links } = consecutiveLinks(
    [R(0, 0.6), R(1, 0.5)],
    /*isOpen*/ true,
    LEN,
  );
  assert.ok(
    Math.abs(links[0].len - 10.0) < 1e-6,
    `expected 10 lengths, got ${links[0].len}`,
  );
});

test("observer reads-only and produces per-cap duty + hero adjacency", () => {
  // A lone leader 8 lengths clear of a tight 3-car pack (links: 8, 0.5, 0.5).
  const field = [R(0, 0.5), R(1, 0.42), R(2, 0.415), R(3, 0.41)];
  field[0].isHeroChoreographed = true; // leader is a hero
  field[1].isHeroChoreographed = true; // P2 is a hero → frontmost over-cap link is hero→hero
  const obs = makeCohesionObserver({
    isOpen: false,
    lenScale: LEN,
    finishT: 1.0,
  });
  const before = field.map((r) => ({ ...r }));
  obs.onFrame(field, 0.5);
  // READ-ONLY: the observer must not mutate any racer field.
  for (let i = 0; i < field.length; i++)
    assert.deepEqual(
      { index: field[i].index, t: field[i].t, finished: field[i].finished },
      { index: before[i].index, t: before[i].t, finished: before[i].finished },
    );
  const res = obs.result();
  const cap3 = res.perCap.find((p) => p.cap === 3);
  assert.equal(
    cap3.dutyMaxCandidates,
    1,
    "exactly one over-3L link (the 8L front gap)",
  );
  assert.equal(
    res.heroFrontmost.heroHero,
    1,
    "the frontmost over-3L link is hero→hero",
  );
});
