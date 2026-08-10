# SCOREBOARD-STABLE-ROWS — his shape, built. 101 rows rebuilt per tick becomes 36.

**Branch** `feat/scoreboard-stable-rows`, cut from `feat/scoreboard-cadence-1` (`024b58c3`), with
`feat/frame-gap-1` merged in so **one log measures everything at once**. **NOT merged — a visible
surface awaiting his eye.** All four fingerprints unchanged.

**THE MECHANISM WORKS AND IS MEASURED EXACTLY: 101.4 row bodies executed per update becomes 36.1 —
a 2.8× cut — and 7000 row renders per 15 seconds becomes 2519, down 64 %.** That number is a count,
not a timing, so no amount of ambient machine noise can move it.

**AND THE HONEST OTHER HALF: the frame-time arms do NOT separate.** In a quiet run all three arms
were **0 missed frames in 7200 each**, `rafLate` p90 0.5 ms flat; in a loaded run all three were bad
together. **This harness cannot show the fix reducing the missed-frame rate, because on this machine
the rate is either zero for everything or dominated by something else.** So: the work is provably
cut; the payoff in dropped frames is not demonstrated here, and his own log is what would show it.

---

## What was built — the owner's shape

> "the racer object with its start number and name should be generated once and then only moved to
> its place — it does not all have to be regenerated every time."

- **Four fields never change during a race** — `index`, `icon`, `name`, `raceNumber`. They live in one
  `identity` object per racer, created **once** at race start, never re-created and **never mutated**.
- **The two that change** (`finished`, `finishTimeMs`) and the one that changes constantly (`rank`)
  are passed to the row as **primitives**.
- **`ScoreboardRow` is `memo`ised**, so a row whose values did not change is skipped.

**WHY A CHANGED RANK CANNOT BE SKIPPED — the trap, in one sentence:** `rank` is a primitive prop and
is never written onto the shared identity object, so a racer moving from 5th to 4th changes a value
`memo`'s shallow comparison actually compares and the row must re-render — whereas storing the rank
on the identity would have left the reference equal, skipped the row, and frozen the standings
silently while the rest of the screen kept moving.

**The cadence setting is untouched**, still shipped at 500 ms. Which number ships is his call once he
has seen both.

## The tests

- **`ScoreboardRow.test.jsx`** — the trap in both directions, and the "skip" half is **behavioural**,
  not structural: the identity carries a counting getter on `icon`, which fires only when the
  component body actually runs (shallow comparison touches the reference, never the property). Same
  props → the body does **not** run again; changed rank → it does. Without that second direction the
  first test would pass just as happily against a component that is not memoised at all.
- **`scripts/scoreboard-row-parity.test.mjs`** — drives a **real seeded race to completion** and, at
  every cadence tick, computes BOTH the old shape (`{ ...r, rank: i + 1 }`, written out verbatim as
  the reference) and the new one from the same racer array, then compares **what the row displays**,
  field by field, position by position. Also asserts the identity is the same object every tick (or
  memo could not skip and the block bought nothing) and that it is never mutated (the trap again, at
  the data level). A sabotage arm moves one rank by one and must fail.

**A subtlety the old row hid, and the parity test had to get right:** the old markup read its rank
from the **map index**, not from the `rank` field it was given — `rank` was computed and never used.
The comparison is against the map index, or it would have been comparing the wrong number.

**On the sort's stability, since the brief asked rather than assumed:** the comparator has **no
tiebreak** for two unfinished racers on equal `t` — it returns `b.t - a.t`, i.e. 0 — so their relative
order comes from `Array.prototype.sort` being stable (guaranteed since ES2019) over the input order,
which is racer index. **That was true before this block and is true after: the sort is untouched.** It
is written down because "stable by language guarantee over racer index" is a real property of the
displayed order that no comment stated.

## The measurement

Production bundle, **real React** — every earlier bench in this line used hand-rolled DOM, which
cannot answer a question about the reconciler. 100 racers, mountainstreet, mid-race, large window,
900 frames per arm, **arm order rotated** per batch. Arm 1 reimplements the pre-block code verbatim.

### What it cost React — the count, which noise cannot move

| arm | row bodies per update | rows rendered per 15 s | updates per 15 s |
| --- | --- | --- | --- |
| **1 — 250 ms, no fix** | **101.4** | **7000** | 69–70 |
| **2 — 250 ms, with fix** | **36.1–38.2** | **2519–2568** | 69–71 |
| **3 — 500 ms, with fix** | 56.7–56.9 | 1928–1993 | 34–35 |

**Arm 2 does 64 % less row-rendering work than arm 1 at the same cadence.** Arm 3's higher
per-update count is expected and not a regression: twice as long between ticks means more racers have
changed position by the time one arrives — 57 of 100 instead of 36 — but at half the ticks, so its
total is lower still.

**Does arm 2 reach arm 3's rate or better?** On work done: **no, but close** — 2519 rows per 15 s
against 1928, about 30 % more, while arm 1 is 7000. **On missed frames: the question cannot be
answered from this harness**, because the arms do not separate at all (below). So the honest headline
is not "the lively list is free" — it is "the lively list now costs about a third of what it did,
and whether that buys back frames on his machine is his log to tell us."

### Frame time — and this is where the harness fails

| condition | arm 1 | arm 2 | arm 3 |
| --- | --- | --- | --- |
| quiet run, 8 rotated batches, 7200 frames/arm | **0 missed**, `rafLate` p90 0.5 | **0 missed**, 0.5 | **0 missed**, 0.5 |
| loaded run, 5 rotated batches | 40–51 missed (one batch 432) | 43–66 | 26–44 |

`total` p50 is 16.7 in every arm of every condition. **In the quiet condition there is nothing to
improve — all three are already perfect. In the loaded condition all three degrade together and no
ordering survives.** One early unrotated arm did show arm 1 at 5.89 % missed with `rafLate` p90 13.5
against arm 2's zero; **that did not reproduce**, and a targeted test of the obvious explanation
(first arm after a fresh React mount) **refuted it too** — eight arms, both shapes, both positions,
all clean. It goes in the record as one observation, not a result.

**`commitMs` was captured and is deliberately not quoted as React's cost**: it measures
`setScoreboard` → the commit that followed, and under React 18's concurrent scheduler most of that
~7–8 ms is waiting for a scheduler slot, not work. It reads the same in every arm, which is what gave
it away.

## What is LEFT after this

**Reordering still costs.** Even a perfectly memoised list moves keyed DOM nodes when the order
changes, and at 100 rows with ranks churning several times a second that is real browser work —
style, layout and paint on the sidebar — that no amount of memoisation removes. **That is the floor
this block leaves behind**, and it is why arm 2 does not reach the "list hidden entirely" floor
FRAME-GAP-3 measured (`rafLate` p90 0.6). Removing it would mean not reordering at all — a
fixed-position list with the rank as a value rather than a position — which is a different product,
and not something to do on a performance argument.

**Also unfinished:** the owner's 40 %. Five blocks in, this line has reproduced the *mode* several
times and never the *rate*. His log at his chosen cadence, on this branch, with `rafLate` beside
`other`, is the measurement that has never been taken.
