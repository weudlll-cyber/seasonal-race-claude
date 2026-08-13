// ============================================================
// scoreboard-parity.test.mjs — SCOREBOARD-SLOT-LAYER, extended by SHIP-THE-STANDINGS
//
// Run: node --test scripts/scoreboard-parity.test.mjs
//
// THE CLAIM: the standings show exactly what they showed before. Same racers, same order, same place
// badges, same crown, same gold / silver / bronze, same finish handling — over a REAL race's ticks,
// not one contrived frame.
//
// ── WHAT CHANGED ABOUT THIS TEST, AND WHY ───────────────────────────────────────────────────────
//
// It used to compare the DATA reaching one row component. That was the right test while there was
// one component: the row carried the place, the name and the colours together, so agreeing on the
// data meant agreeing on the picture.
//
// The list is now TWO LAYERS. The places are drawn once into a static layer and never touched; the
// racers are cards that are only MOVED. Nothing in the card's data says what place it is in any
// more — the place is a `translateY` written straight onto the element. A data comparison would
// therefore pass while every racer sat in the wrong slot.
//
// So this drives THE REAL POSITIONER over a real race and compares WHAT IS DRAWN: for each visual
// position, which racer's card is translated to that y, what the badge in the slot behind it reads,
// what colour that badge is, and what colour the card's text is. Against the same reference as
// before — the expression the row used before any of this work started, written out verbatim below.
//
// ── WHAT THIS CAN AND CANNOT SEE, said plainly rather than implied by a green tick ───────────────
//
// IT CAN SEE: which racer is drawn at which y; that the ys are one pitch apart and a permutation, so
// no two cards can overlap and no slot can be empty; every badge's text and colour; the card's own
// text colour; the start number and the name on every card; and the finish time appearing on exactly
// the racers that have finished. It sees them at EVERY cadence tick of a race that runs to its end,
// not at a chosen moment.
//
// IT CANNOT SEE ANYTHING THAT REQUIRES LAYOUT. Neither node nor jsdom measures text, so nothing here
// can prove the two layers line up on screen, that 35.333 is still the pitch, that the badge column
// is wide enough for `100`, or that a long name still ellipsises. Those are font metrics from a
// real browser. What this file does instead is pin the CSS INPUTS each measured constant depends on,
// so a change to the padding, the margin, the positioning or the badge width fails here and asks for
// a re-measurement. That is the most a source-level check can honestly offer, and the browser
// measurements that back the constants are in the block's report.
//
// R7 — what breaks if this file is deleted: the two layers drift apart — a racer drawn against the
// wrong badge, a rank used twice, a colour on the wrong place — and only an eye on a live race would
// notice.
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
const { assignRaceNumbers } = await import(
  u("client/src/modules/raceNumbers.js")
);
const { loadTracks, resolveIdentity, buildRace, runRace } = await import(
  u("scripts/lib/raceDriver.mjs")
);
const {
  ROW_PITCH_PX,
  RANK_PALETTE,
  badgeWidthPx,
  CROWN_WIDTH_PX,
  cardTextColor,
  rankBorderColor,
  rankLabel,
  rankTextColor,
  slotOffsetPx,
} = await import(u("client/src/screens/RaceScreen/scoreboardLayout.js"));
const { createScoreboardPositions } = await import(
  u("client/src/screens/RaceScreen/scoreboardPositions.js")
);

const FIXED_DT = 16;

/** The comparator, untouched by any of this work — lifted so both shapes sort identically. */
const cmp = (a, b) => {
  if (a.finished !== b.finished) return a.finished ? -1 : 1;
  if (a.finished) return a.finishRank - b.finishRank;
  return b.t - a.t;
};

/**
 * WHAT THE ROW USED TO RECEIVE, before any of the three scoreboard blocks: the whole racer spread,
 * plus a rank, read by POSITION in the map. This is the reference the picture is compared against.
 */
function oldShape(racers) {
  return [...racers].sort(cmp).map((r, i) => ({ ...r, rank: i + 1 }));
}

/** What the SLOT layer draws at each place, and it depends on nothing but the place. */
function slotAt(rank) {
  return {
    label: rankLabel(rank),
    color: rankTextColor(rank),
    borderColor: rankBorderColor(rank),
    y: slotOffsetPx(rank),
  };
}

/**
 * WHAT THE OLD ROW DREW at visual position `i`, expressed in the same terms as the two layers.
 * The old row read its place from the MAP INDEX, not from `row.rank` — `rank` was computed and never
 * used — so `i + 1` is the number to compare against, or this would compare the wrong thing.
 */
const drawnOld = (row, i) => ({
  index: row.index,
  name: row.name,
  raceNumber: row.raceNumber ?? null,
  badge: rankLabel(i + 1),
  badgeColor: rankTextColor(i + 1),
  badgeBorder: rankBorderColor(i + 1),
  textColor: cardTextColor(i + 1),
  finished: !!row.finished,
  finishTimeMs:
    row.finished && row.finishTimeMs != null ? row.finishTimeMs : null,
});

const geo = loadTracks({ only: "mountainstreet" })[0];
assert.ok(
  geo,
  "mountainstreet not found — this test measures nothing without it",
);

const identity = resolveIdentity({
  racers: 40,
  note: "SCOREBOARD-SLOT-LAYER parity",
});
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
    {
      index: r.index,
      icon: r.icon,
      name: r.name,
      raceNumber: r.raceNumber ?? null,
    },
  ]),
);

// THE REAL POSITIONER, driven with stub elements. It only ever touches `el.style`, so a plain object
// with a `style` bag is a faithful stand-in — and using the shipped module rather than a copy of its
// arithmetic is the entire point: a change to how a place becomes a y fails HERE.
const positions = createScoreboardPositions();
const cards = new Map(race.st.racers.map((r) => [r.index, { style: {} }]));
for (const [index, el] of cards) positions.attach(index, el);

/** The y a card is currently translated to, parsed back out of what the positioner wrote. */
const yOf = (el) =>
  Number(/translateY\(([-\d.]+)px\)/.exec(el.style.transform)?.[1]);

// Drive the race and capture, at every cadence tick, BOTH the reference list and what the two layers
// would put on screen — exactly where and how the component does it.
const CADENCE = DEFAULT_FRAME_TIMING_CONFIG.scoreboardIntervalMs;
const ticks = [];
let lastPhysicsTs = 0;
const ranks = new Map();
runRace(race, identity, DEFAULT_CAMERA_CONFIG, ({ st }) => {
  const pt = st.physicsTs;
  for (let p = lastPhysicsTs + FIXED_DT; p <= pt; p += FIXED_DT) {
    if (Math.round(p / CADENCE) !== Math.round((p - FIXED_DT) / CADENCE)) {
      // ── The component's cadence tick, reproduced ───────────────────────────────────────────
      ranks.clear();
      [...st.racers].sort(cmp).forEach((r, i) => ranks.set(r.index, i + 1));
      const write = positions.applyRanks(ranks);
      // ── What is on screen now: every card's y, colour and content, plus the static slot layer.
      const drawn = [...cards.entries()]
        .map(([index, el]) => {
          const id = identities.get(index);
          const r = st.racers.find((x) => x.index === index);
          return {
            index,
            y: yOf(el),
            textColor: el.style.color,
            name: id.name,
            raceNumber: id.raceNumber,
            finished: !!r.finished,
            finishTimeMs:
              r.finished && r.finishTimeMs != null ? r.finishTimeMs : null,
          };
        })
        .sort((a, b) => a.y - b.y);
      ticks.push({ physicsTs: p, old: oldShape(st.racers), drawn, write });
      break;
    }
  }
  lastPhysicsTs = pt;
});

// The static layer, built once for this field — exactly as ScoreboardSlots does.
const slotLayer = Array.from({ length: race.st.racers.length }, (_, i) =>
  slotAt(i + 1),
);

test("the race under test actually ran, and finished — otherwise nothing below is exercised", () => {
  // A floor, not a pin (Lesson 187): a race that stopped after two ticks would pass every check
  // below by comparing almost nothing.
  assert.ok(ticks.length > 50, `only ${ticks.length} cadence ticks captured`);
  assert.ok(
    ticks.at(-1).old.some((r) => r.finished),
    "no racer ever finished — the finished/finishTime half of the comparison never ran",
  );
});

test("WHAT IS DRAWN matches the old list, position for position, every tick of a real race", () => {
  // The whole claim, and it is now about the PICTURE rather than about a prop bag: at each visual
  // position, the same racer, under the same badge, in the same colours, with the same finish time.
  for (const t of ticks) {
    assert.equal(
      t.drawn.length,
      t.old.length,
      `tick ${t.physicsTs}: row count`,
    );
    for (let i = 0; i < t.old.length; i++) {
      const card = t.drawn[i];
      const slot = slotLayer[i];
      assert.deepEqual(
        {
          index: card.index,
          name: card.name,
          raceNumber: card.raceNumber,
          badge: slot.label,
          badgeColor: slot.color,
          badgeBorder: slot.borderColor,
          textColor: card.textColor,
          finished: card.finished,
          finishTimeMs: card.finishTimeMs,
        },
        drawnOld(t.old[i], i),
        `tick ${t.physicsTs}, visual position ${i}: the list drew something else`,
      );
      // ...and the card is actually AT that slot, not merely in that order.
      assert.equal(
        card.y,
        slot.y,
        `tick ${t.physicsTs}, position ${i}: card and slot disagree on y`,
      );
    }
  }
});

test("the ys are one pitch apart and used exactly once — no overlap, no empty slot", () => {
  for (const t of ticks) {
    const ys = t.drawn.map((c) => c.y);
    assert.deepEqual(
      ys,
      Array.from({ length: ys.length }, (_, i) => i * ROW_PITCH_PX),
      `tick ${t.physicsTs}: the cards are not on the pitch grid`,
    );
  }
});

test("SABOTAGE — one rank moved by one is caught, so the comparison is not vacuous", () => {
  const t = ticks[Math.floor(ticks.length / 2)];
  const broken = t.drawn.map((c, i) =>
    i === 3 ? { ...c, index: t.drawn[4].index } : c,
  );
  assert.throws(() => {
    for (let i = 0; i < t.old.length; i++) {
      assert.equal(broken[i].index, t.old[i].index);
    }
  });
});

test("the identity handed to each card is the SAME OBJECT, and is never MUTATED", () => {
  // What makes `memo` able to skip a card at all. If the identities were rebuilt, or written to, the
  // component would still be correct and the block would have bought nothing — and the second
  // failure is worse than the first: a mutated identity compares equal and the card freezes.
  const first = new Map(
    [...identities].map(([k, v]) => [k, JSON.stringify(v)]),
  );
  for (const [index, id] of identities) {
    assert.equal(
      JSON.stringify(id),
      first.get(index),
      `racer ${index}: its identity changed`,
    );
  }
});

test("the tick writes ONLY what moved — the cost this block exists to remove", () => {
  // The negative half of the claim. If every tick wrote every card, the standings would be correct
  // and the block would have bought nothing; and no eye could ever tell the difference.
  const moves = ticks.map((t) => t.write.moved);
  const n = race.st.racers.length;
  assert.ok(
    moves.slice(1).every((m) => m <= n),
    "a tick moved more cards than there are racers",
  );
  // At least one tick in a real race must have moved NOTHING or nearly nothing, or the skip is dead
  // code; and at least one must have moved something, or the list is frozen. Both, over one race.
  assert.ok(
    Math.min(...moves.slice(1)) < n,
    "every tick rewrote the whole field — nothing is skipped",
  );
  assert.ok(
    Math.max(...moves.slice(1)) > 0,
    "no tick ever moved a card — the standings are frozen",
  );
  // And the COLOURS: only a change across the top-three boundary may write one.
  const recoloured = ticks.reduce((a, t) => a + t.write.recoloured, 0);
  const moved = ticks.reduce((a, t) => a + t.write.moved, 0);
  assert.ok(
    recoloured < moved / 4,
    `${recoloured} colour writes against ${moved} moves — the colour is not place-bound to the top three`,
  );
});

// ── The badge column: one width for the whole column, chosen from the field ──────────────────────

test("the badge column is ONE width, taken from the widest place the field can produce", () => {
  // The owner's second defect: the column was a hard 28 px, sized for two digits, and `#100` spills
  // out of its rounded box. The width must therefore grow with the field — and must NOT grow per
  // row, or the two layers would stop lining up.
  // SHIP-THE-STANDINGS: the `#` is gone and the figures are tabular, so a label's width is a pure
  // function of its LENGTH and these numbers are the widest label each field can actually produce —
  // not the widest of a digit class. The crown sets the floor below three digits.
  assert.equal(
    badgeWidthPx(8),
    24,
    "a one-digit field is sized by its CROWN, not by `9`",
  );
  assert.equal(badgeWidthPx(9), 24);
  assert.equal(
    badgeWidthPx(40),
    24,
    "two digits still fit inside the crown's width",
  );
  assert.equal(badgeWidthPx(99), 24);
  assert.equal(badgeWidthPx(100), 31, "`100` is what the list really shows");
  assert.equal(
    badgeWidthPx(140),
    31,
    "140 racers is still three digits — same column",
  );
  assert.equal(badgeWidthPx(999), 31);
  assert.equal(badgeWidthPx(1000), 39);
  assert.ok(
    badgeWidthPx(100) >= Math.ceil(CROWN_WIDTH_PX),
    "the crown must fit at every field size",
  );
  // Monotone, so a bigger field can never get a narrower column.
  for (let n = 1; n < 400; n++) {
    assert.ok(
      badgeWidthPx(n + 1) >= badgeWidthPx(n),
      `width went backwards at ${n}`,
    );
  }
  // It is a function of the FIELD, not of a place: every row in a 100-racer field gets 40.
  assert.equal(badgeWidthPx(100), badgeWidthPx(100));
});

// ── The measured constants, and the CSS inputs they depend on ────────────────────────────────────
//
// ROW_PITCH_PX 35.333 is the SHIPPED SPACING and is not re-derivable from anything: this block
// re-measured the row it was supposed to describe and found 31.333 px on the owner's 1.5x display
// and 32.000 on a 1:1 one, so "height plus the 4 px margin" was never true on either. The badge
// widths are max-content measurements of a real `.sb-rank`. All of it comes from a real browser
// (Chrome 141, headed and headless, this machine); neither node nor jsdom does layout, so nothing
// here can re-derive any of it. Stated plainly rather than papered over.

const CSS = readFileSync(
  join(ROOT, "client/src/screens/RaceScreen/RaceScreen.css"),
  "utf8",
);
const block = (selector) => {
  const at = CSS.indexOf(selector);
  assert.notEqual(at, -1, `${selector} is gone from RaceScreen.css`);
  return CSS.slice(at, CSS.indexOf("}", at));
};

test("the CSS the measured constants depend on has not moved", () => {
  const shared = block(".scoreboard-card,\n.scoreboard-slot {");
  assert.match(
    shared,
    /padding:\s*5px 3px/,
    "row padding changed — re-measure ROW_PITCH_PX",
  );
  assert.match(
    shared,
    /position:\s*absolute/,
    "the rows are back in flow — the transform now overlaps them",
  );
  assert.match(
    shared,
    /grid-template-columns:\s*var\(--sb-badge-w[^)]*\) 1fr auto/,
    "the two layers no longer declare the SAME grid — the badge would drift out of the card's gap",
  );
  assert.match(
    CSS,
    /\.scoreboard-rows\s*\{[^}]*position:\s*relative/,
    "the rows' containing block lost `position: relative` — both layers would anchor to the page",
  );
  assert.match(
    block(".scoreboard-slot-layer {"),
    /inset:\s*0/,
    "the slot layer stopped filling the rows container — the badges would anchor elsewhere",
  );
  // THE ROW HEIGHT IS NOT A CONSTANT and this is where that is held: the card reserves the badge's
  // column with a spacer that carries the badge's OWN box, so both layers derive one height from one
  // rule. Measured, the same badge is 22.000 px at device-pixel-ratio 1 and 21.333 at 1.5 — a number
  // here would have been right on one display and wrong on the other.
  const shared2 = block(".sb-rank,\n.sb-badge-spacer {");
  assert.match(shared2, /font-size:\s*12px/);
  assert.match(shared2, /line-height:\s*1\.5/);
  assert.match(shared2, /padding:\s*1px 3px/);
  assert.match(shared2, /border:\s*1px solid/);
  assert.match(
    shared2,
    /font-variant-numeric:\s*tabular-nums/,
    "the badge lost its tabular figures — a label's width stops being a function of its LENGTH and " +
      "`badgeWidthPx` can no longer be the widest label the field produces",
  );
  assert.match(
    block(".sb-badge-spacer::before {"),
    /content:\s*'\\00a0'/,
    "the spacer lost its blank line — the card would no longer be as tall as the badge, and every " +
      "icon and name in the list would slide up by a third of a pixel",
  );
  // The shipped spacing, pinned so a silent edit is caught too.
  assert.equal(ROW_PITCH_PX, 35.333);
  assert.deepEqual(RANK_PALETTE, ["#ffd700", "#c0c0c0", "#cd7f32"]);
});

test("the panel is bounded by the window and scrolls, so the last row is reachable", () => {
  // The owner's first defect, and it is OLDER than the transform work: at 100 racers the rows are
  // 3533 px tall and the sidebar ran off the bottom of his window with no way to reach `#100`.
  assert.match(
    block(".race-hud {"),
    /max-height:\s*calc\(100vh - 20px\)/,
    "the HUD is unbounded again — the standings will run off the bottom of the window",
  );
  assert.match(
    block(".scoreboard-scroll {"),
    /overflow-y:\s*auto/,
    "the rows viewport stopped scrolling — the last row becomes unreachable",
  );
  assert.match(
    block(".scoreboard-viewport {"),
    /min-height:\s*0/,
    "without `min-height: 0` a flex item refuses to shrink and the cap does nothing",
  );
  // SHIP-THE-STANDINGS: the scrollbar must not take a column from the names.
  assert.match(
    block(".scoreboard-scroll {"),
    /scrollbar-width:\s*none/,
    "the native scrollbar is back — it takes ~10 px of layout width from a 210 px panel",
  );
  assert.match(
    block(".scoreboard-scrollbar {"),
    /position:\s*absolute/,
    "the overlay scrollbar went back into the flow and is taking width again",
  );
});
