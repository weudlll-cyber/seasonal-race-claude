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
import { readFileSync } from "node:fs";
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
const { ROW_PITCH_PX } = await import(
  u("client/src/screens/RaceScreen/scoreboardLayout.js")
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

/**
 * WHAT THE ROW RECEIVES NOW: four values and a stable identity reference — and, since
 * SCOREBOARD-TRANSFORM-ROWS, emitted in RACER ORDER, not rank order. The sort only assigns ranks;
 * the ranking travels to the screen as a transform. This mirrors RaceScreen exactly.
 */
function newShape(racers, identities) {
  const ranks = new Map();
  [...racers].sort(cmp).forEach((r, i) => ranks.set(r.index, i + 1));
  return racers.map((r) => ({
    index: r.index,
    identity: identities.get(r.index),
    rank: ranks.get(r.index),
    finished: !!r.finished,
    finishTimeMs: r.finishTimeMs ?? null,
  }));
}

/** The rows in the order a viewer SEES them: sorted by the y each one is translated to. */
const asDrawn = (rows) => [...rows].sort((a, b) => a.rank - b.rank);

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
  // Compared AS DRAWN, because the array position stopped being the visual position when the
  // ranking moved into the transform. Same claim as before; the y is now what carries it.
  for (const t of ticks) {
    assert.equal(t.next.length, t.old.length, `tick ${t.physicsTs}: row count`);
    const drawn = asDrawn(t.next);
    for (let i = 0; i < t.old.length; i++) {
      assert.deepEqual(
        displayedNew(drawn[i]),
        displayedOld(t.old[i], i),
        `tick ${t.physicsTs}, visual position ${i}: the row data drifted`,
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
  const broken = asDrawn(t.next).map((r, i) => (i === 3 ? { ...r, rank: r.rank + 1 } : r));
  assert.throws(() => {
    for (let i = 0; i < t.old.length; i++) {
      assert.deepEqual(displayedNew(broken[i]), displayedOld(t.old[i], i));
    }
  });
});


// ── SCOREBOARD-TRANSFORM-ROWS: position now carries the ranking, so position is compared too ──────

test("VISUAL ORDER matches the old DOM order — the transform reproduces the sort", () => {
  // The old list carried the ranking in the DOM: first child = first place. The new one keeps the
  // DOM in racer order and moves rows with translateY. So the fair comparison is: sort the new rows
  // by the y they are translated to, and that must be the old array, position for position.
  for (const t of ticks) {
    const byY = [...t.next].sort(
      (a, b) => (a.rank - 1) * ROW_PITCH_PX - (b.rank - 1) * ROW_PITCH_PX,
    );
    for (let i = 0; i < t.old.length; i++) {
      assert.equal(
        byY[i].index,
        t.old[i].index,
        `tick ${t.physicsTs}, visual position ${i}: a different racer is drawn there`,
      );
      assert.deepEqual(
        displayedNew(byY[i]),
        displayedOld(t.old[i], i),
        `tick ${t.physicsTs}, visual position ${i}: the row drawn there shows something else`,
      );
    }
  }
});

test("the DOM order is STABLE — it is racer order and never the ranking", () => {
  // If a future change went back to emitting the sorted array, the transform would fight the DOM
  // order and the list would look right by accident until it did not.
  const first = ticks[0].next.map((r) => r.index);
  for (const t of ticks) {
    assert.deepEqual(
      t.next.map((r) => r.index),
      first,
      `tick ${t.physicsTs}: the rows changed places in the document`,
    );
  }
  // ...and that order is NOT the ranking, on at least one tick, or the claim is untestable.
  const mid = ticks[Math.floor(ticks.length / 2)];
  assert.notDeepEqual(
    mid.next.map((r) => r.index),
    mid.old.map((r) => r.index),
    "document order equals rank order on the sampled tick — pick a tick where the field has moved",
  );
});

test("every rank is used exactly once — no two rows can land on the same y", () => {
  for (const t of ticks) {
    const ranks = t.next.map((r) => r.rank).sort((a, b) => a - b);
    assert.deepEqual(
      ranks,
      Array.from({ length: t.next.length }, (_, i) => i + 1),
      `tick ${t.physicsTs}: ranks are not a permutation — rows would overlap or leave a gap`,
    );
  }
});

// ── The pitch, and the one thing this test suite CANNOT do ───────────────────────────────────────
//
// ROW_PITCH_PX is 35.333 because a rendered `.scoreboard-row` measures 31.333 px plus a 4 px
// `margin-bottom`. That 31.333 came from a REAL BROWSER (Chrome 151, this machine): it is font
// metrics, and neither node nor jsdom does layout, so nothing here can re-derive it. Stated plainly
// rather than papered over — this guard cannot prove the number, only that the CSS inputs it depends
// on have not moved. If one of them does, the test fails and asks for a re-measurement, which is the
// most a source-level check can honestly offer.
const CSS = readFileSync(
  join(ROOT, "client/src/screens/RaceScreen/RaceScreen.css"),
  "utf8",
);
const rowBlock = CSS.slice(
  CSS.indexOf(".scoreboard-row {"),
  CSS.indexOf("}", CSS.indexOf(".scoreboard-row {")),
);

test("the CSS the pitch depends on has not moved", () => {
  assert.match(rowBlock, /padding:\s*5px 3px/, "row padding changed — re-measure ROW_PITCH_PX");
  assert.match(rowBlock, /margin-bottom:\s*4px/, "row margin changed — re-measure ROW_PITCH_PX");
  assert.match(rowBlock, /position:\s*absolute/, "the rows are back in flow — the transform now overlaps them");
  assert.match(CSS, /\.scoreboard-rows\s*\{[^}]*position:\s*relative/,
    "the rows' containing block lost `position: relative` — they would anchor to the page");
  // The measured value, pinned so a silent edit of the constant is caught too.
  assert.equal(ROW_PITCH_PX, 35.333);
});
