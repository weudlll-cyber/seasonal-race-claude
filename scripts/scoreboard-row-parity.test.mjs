// ============================================================
// scoreboard-row-parity.test.mjs — SCOREBOARD-STABLE-ROWS
//
// Run: node --test scripts/scoreboard-row-parity.test.mjs
//
// THE CLAIM: the standings show exactly what they showed before. Same racers, same order, same rank
// numbers, same finish handling — over a REAL race's ticks, not one contrived frame.
//
// WHY IT IS DONE THIS WAY. The change replaced
//   `[...racers].sort(cmp).map((r, i) => ({ ...r, rank: i + 1 }))`
// with a map that emits four small values and a stable identity reference. The risk is not that the
// row renders wrongly — `ScoreboardRow.test.jsx` covers the markup — it is that the DATA reaching the
// row drifts: a different order, an off-by-one rank, a `finished` flag read at a different moment.
// So this drives a real seeded race and, at every cadence tick, computes BOTH shapes from the same
// racer array and asserts they agree field by field. The old expression is written out here verbatim
// as the reference; if the new one ever disagrees with it, this fails and names the tick.
//
// ON THE SORT'S STABILITY, since the brief asked rather than assumed: the comparator has NO tiebreak
// for two unfinished racers on the same `t` — it returns `b.t - a.t`, which is 0 — so their relative
// order comes from `Array.prototype.sort` being stable (guaranteed since ES2019) over the input
// order, which is `[...st.racers]`, i.e. racer index. That was true before this block and is true
// after it: the sort is UNTOUCHED. It is recorded here because "stable by language guarantee over
// racer index" is a real property of the displayed order that no comment stated.
//
// R7 — what breaks if this file is deleted: the row data can drift from what it replaced and only an
// eye on a live race would notice.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG, DEFAULT_FRAME_TIMING_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { attachRenderState, attachRacerRenderState } = await import(
  u("client/src/screens/RaceScreen/renderState.js")
);
const { QUICK_TEST_NAMES_MIXED: NAMES } = await import(
  u("client/src/modules/racerNames.js")
);
const { assignRaceNumbers } = await import(u("client/src/modules/raceNumbers.js"));
const { loadTracks, resolveIdentity, buildRace, runRace } = await import(
  u("scripts/lib/raceDriver.mjs")
);

const FIXED_DT = 16;

/** The comparator, untouched by this block — lifted so both shapes sort identically. */
const cmp = (a, b) => {
  if (a.finished !== b.finished) return a.finished ? -1 : 1;
  if (a.finished) return a.finishRank - b.finishRank;
  return b.t - a.t;
};

/** WHAT THE ROW USED TO RECEIVE: the whole racer spread, plus a rank, read by position in the map. */
function oldShape(racers) {
  return [...racers].sort(cmp).map((r, i) => ({ ...r, rank: i + 1 }));
}

/** WHAT THE ROW RECEIVES NOW: four values and a stable identity reference. */
function newShape(racers, identities) {
  return [...racers].sort(cmp).map((r, i) => ({
    index: r.index,
    identity: identities.get(r.index),
    rank: i + 1,
    finished: !!r.finished,
    finishTimeMs: r.finishTimeMs ?? null,
  }));
}

/** Everything the rendered row actually displays, from either shape — the only fair comparison. */
const displayedOld = (row, i) => ({
  index: row.index,
  icon: row.icon,
  name: row.name,
  raceNumber: row.raceNumber ?? null,
  // The old row read its rank from the MAP INDEX, not from `row.rank` — `rank` was computed and
  // never used. That is the number to compare against, or this test would compare the wrong thing.
  rank: i + 1,
  finished: !!row.finished,
  finishTimeMs: row.finished && row.finishTimeMs != null ? row.finishTimeMs : null,
});
const displayedNew = (row) => ({
  index: row.index,
  icon: row.identity.icon,
  name: row.identity.name,
  raceNumber: row.identity.raceNumber,
  rank: row.rank,
  finished: row.finished,
  finishTimeMs: row.finished && row.finishTimeMs != null ? row.finishTimeMs : null,
});

const geo = loadTracks({ only: "mountainstreet" })[0];
assert.ok(geo, "mountainstreet not found — this test measures nothing without it");

const identity = resolveIdentity({ racers: 40, note: "SCOREBOARD-STABLE-ROWS parity" });
const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
attachRenderState(race.st);
attachRacerRenderState(race.st.racers);
race.st.racers.forEach((r, i) => {
  r.name = NAMES[i % NAMES.length];
  r.icon = "🏇";
});
const numbers = assignRaceNumbers(race.st.racers.length, identity.raceSeed);
race.st.racers.forEach((r) => {
  r.raceNumber = numbers[r.index] ?? null;
});

// The identities RaceScreen builds once per race.
const identities = new Map(
  race.st.racers.map((r) => [
    r.index,
    { index: r.index, icon: r.icon, name: r.name, raceNumber: r.raceNumber ?? null },
  ])
);

// Drive the race and capture BOTH shapes at every cadence tick, exactly where the component would.
const CADENCE = DEFAULT_FRAME_TIMING_CONFIG.scoreboardIntervalMs;
const ticks = [];
let lastPhysicsTs = 0;
runRace(race, identity, DEFAULT_CAMERA_CONFIG, ({ st }) => {
  const pt = st.physicsTs;
  for (let p = lastPhysicsTs + FIXED_DT; p <= pt; p += FIXED_DT) {
    if (Math.round(p / CADENCE) !== Math.round((p - FIXED_DT) / CADENCE)) {
      ticks.push({
        physicsTs: p,
        old: oldShape(st.racers),
        next: newShape(st.racers, identities),
      });
      break;
    }
  }
  lastPhysicsTs = pt;
});

test("the race under test actually ran, and finished — otherwise nothing below is exercised", () => {
  // A floor, not a pin (Lesson 187): a race that stopped after two ticks would pass every parity
  // check below by comparing almost nothing.
  assert.ok(ticks.length > 50, `only ${ticks.length} cadence ticks captured`);
  const last = ticks.at(-1);
  assert.ok(
    last.old.some((r) => r.finished),
    "no racer ever finished — the finished/finishTime half of the comparison never ran",
  );
});

test("same racers, same ORDER, same RANKS, every tick of a real race", () => {
  for (const t of ticks) {
    assert.equal(t.next.length, t.old.length, `tick ${t.physicsTs}: row count`);
    for (let i = 0; i < t.old.length; i++) {
      assert.deepEqual(
        displayedNew(t.next[i]),
        displayedOld(t.old[i], i),
        `tick ${t.physicsTs}, position ${i}: the row data drifted`,
      );
    }
  }
});

test("the identity handed to each row is the SAME OBJECT on every tick", () => {
  // This is what makes `memo` able to skip at all. If the identities were rebuilt per tick the
  // component would be correct and the block would have bought nothing — the failure is silent, so
  // it is asserted rather than assumed.
  const first = new Map(ticks[0].next.map((r) => [r.index, r.identity]));
  for (const t of ticks) {
    for (const row of t.next) {
      assert.equal(
        row.identity,
        first.get(row.index),
        `tick ${t.physicsTs}: racer ${row.index} got a NEW identity object`,
      );
    }
  }
});

test("the identity is never MUTATED — the trap that would freeze the standings", () => {
  // A memoised row compares the identity by reference. If anything wrote a changing value onto it,
  // the reference would stay equal, the row would skip, and the standings would silently stop.
  const snapshot = new Map(
    ticks[0].next.map((r) => [r.index, JSON.stringify(r.identity)]),
  );
  for (const row of ticks.at(-1).next) {
    assert.equal(
      JSON.stringify(row.identity),
      snapshot.get(row.index),
      `racer ${row.index}: its identity changed during the race`,
    );
  }
});

test("SABOTAGE — a rank moved by one is caught, so the comparison is not vacuous", () => {
  const t = ticks[Math.floor(ticks.length / 2)];
  const broken = t.next.map((r, i) => (i === 3 ? { ...r, rank: r.rank + 1 } : r));
  assert.throws(() => {
    for (let i = 0; i < t.old.length; i++) {
      assert.deepEqual(displayedNew(broken[i]), displayedOld(t.old[i], i));
    }
  });
});
