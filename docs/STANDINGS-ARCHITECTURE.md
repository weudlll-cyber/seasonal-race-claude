# The live standings — the two-layer rule

**What this document owns:** the ARCHITECTURE of the live standings panel, as a rule that binds the
next change rather than as a record of the last one. It is short on purpose. Everything about why the
work was done, what it cost and what was measured lives in the reports —
[SCOREBOARD-CADENCE-1](../reports/evolution/SCOREBOARD-CADENCE-1.md),
[SCOREBOARD-STABLE-ROWS](../reports/evolution/SCOREBOARD-STABLE-ROWS.md),
[SCOREBOARD-TRANSFORM-ROWS](../reports/evolution/SCOREBOARD-TRANSFORM-ROWS.md),
[SCOREBOARD-SLOT-LAYER](../reports/evolution/SCOREBOARD-SLOT-LAYER.md) — and this document does not
repeat one number of it.

**Why it exists at all.** The reasoning behind the two layers lived only in those reports and in the
tag register. **A report explains; it does not prevent.** A rebuild in June re-introduced something a
report had already rejected, for exactly this reason: the argument was written down somewhere nobody
had to read before touching the code. So the architecture is stated here as a rule, and a guard
—`scripts/check-standings-invariant.mjs`— goes red when the rule is undone.

---

## The rule

**THE STANDINGS ARE TWO LAYERS, AND NOTHING MAY MERGE THEM.**

1. **The SLOT layer is the places.** `ScoreboardSlots.jsx` draws the place column once per race —
   the crown at slot 1, then the numbers — and is never touched again. It is memoised on the field
   size, which cannot change during a race.

2. **The CARD layer is the racers.** `ScoreboardCard.jsx` draws one racer: start number, name, and
   the finish time. Nothing on it is derived from a place.

**THE PLACE BELONGS TO THE SLOT, NEVER TO THE RACER CARD.** This is the load-bearing half. The card
carries no rank prop, displays no rank text, and imports no rank helper. If the place were on the
card, every card whose place changed would have to re-render to say so — which is the cost the whole
line of work removed.

**THE BADGE COLUMN, INCLUDING ITS GOLD / SILVER / BRONZE, IS SLOT-BOUND.** First is gold because the
FIRST SLOT is gold, not because anything about the racer standing in it changed. The same is true of
the card's own text colour: it is written from the PLACE by `scoreboardPositions.js`, not passed down
as a property of the racer.

**A RANK CHANGE MOVES A CARD AND MUST CHANGE NO TEXT AND NO STRUCTURE ANYWHERE.** A cadence tick may
write `transform` on the cards that moved, and `color` on the cards that crossed the top-three
boundary. It may write nothing else. No `textContent` anywhere, in either layer; no node inserted,
removed or reordered, in either layer.

**The one thing that is allowed to change a card is a FINISH** — one card, once, at the moment that
racer crosses the line. It is priced rather than forbidden: a hundred cards a tick was the problem, a
card an occasional second is not.

### What follows from the rule, and is easy to get wrong

- **The DOM order of the cards is racer order and is never re-sorted.** Array position stopped being
  visual position when the cards left the flow; the ranking is the `transform` on each card. Sorting
  the list would be a structural mutation on every overtake.
- **The two layers must declare the SAME first grid column.** They line up only because both read one
  badge-column width (`--sb-badge-w`) from the container. A width chosen per row would drift them
  apart.
- **The place is not announced with the racer.** The slot layer is `aria-hidden`, and that is a real
  loss, named in `ScoreboardSlots.jsx` rather than hidden. It is the price of the split, and undoing
  it by putting the place back on the card breaks this rule — an accessible standings list has to be
  built some other way.

## What guards the rule, and what it cannot see

`scripts/check-standings-invariant.mjs` — two checks, and they cover different halves:

- **The SOURCE half** reads `ScoreboardCard.jsx` and asks whether the place has moved back onto it:
  a rank-ish prop, a rank helper import, a rank-derived label. Milliseconds, no browser.
- **The MEASURED half** mounts the real standings in jsdom, drives real rank changes through the real
  positioner, and counts what a `MutationObserver` sees. The invariant is a number: zero text
  mutations, zero structural mutations, and every attribute mutation is `style` on a card. It carries
  its own positive control — the cards must actually have moved — because zero mutations is also what
  a frozen list produces.

**What neither can see**, stated here rather than assumed away: anything that requires LAYOUT. jsdom
does not measure text, so nothing here proves the two layers line up on screen or that a badge fits
its box. The CSS inputs those measured constants depend on are pinned by
`scripts/scoreboard-parity.test.mjs`, and the browser measurements behind them are in the
SCOREBOARD-SLOT-LAYER report. It also cannot see React re-rendering a card that produces identical
DOM — wasted work is invisible to a mutation count, and that is what the bench
(`scripts/scoreboard-bench.mjs`) is for.

**Which racer is drawn at which place** is not this guard's question either. That is
`scripts/scoreboard-parity.test.mjs`, which drives a real race and compares the picture against the
list the pre-split code would have drawn. The two are deliberately separate: one asks whether the
standings are RIGHT, this one asks whether they are still CHEAP.
