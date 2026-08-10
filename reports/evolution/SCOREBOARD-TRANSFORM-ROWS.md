# SCOREBOARD-TRANSFORM-ROWS — the staircase is flattened to zero

**Branch** `feat/scoreboard-transform-rows`, cut from `feat/scoreboard-stable-rows` (`afdf130a`).
**NOT merged — a visible surface, and it waits for the owner's eye.** All four fingerprints unchanged.

**THE STAIRCASE — the quantity this block existed to flatten — GOES TO ZERO.** Idle, six rotated
batches, 5400 measured frames per arm: the flow layout drifts at a mean **0.73–0.76 ms per frame**
with episodes up to **4.41**, while the transform layout sits at **−0.01 and 0.08**, i.e. no drift at
all. Missed frames follow: **1.204 % → 0.056 %** at the shipped cadence, a **21×** reduction.

**And the cadence question answers itself as a side effect:** with the transform, 250 ms and 500 ms
are *identical* — 3 missed frames in 5400 for both. The lively list becomes free.

---

## What the layout actually was, and what I chose

**Established before building, in a real browser, because the approach depends on it.**

The rows were in **normal flow**: `.scoreboard-row` is a `display: grid` block with `padding: 5px 3px`
and `margin-bottom: 4px`, stacked inside `.scoreboard`. A `translateY` alone would have slid a row
over its neighbours without moving them, so the rows had to come out of flow.

**Row height is uniform — measured, not assumed.** Seven shapes that could plausibly differ were
rendered and measured: crown vs `#5` vs `#100`, race number present vs absent, finished with a time,
finished without one, and a name long enough to ellipsise. **All seven: 31.333 px.** The reason is
`.sb-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }` — a name can never wrap
to a second line. With the 4 px margin that gives a **pitch of 35.333 px**. Had this come back
non-uniform the approach would have been dead, which is why it was checked first.

**The shape chosen:**

- rows keep a **stable place in the document — racer order, never re-sorted**;
- the sort now only assigns **ranks**;
- each row carries `transform: translateY((rank − 1) × 35.333px)` and `position: absolute`;
- a new inner **`.scoreboard-rows`** element is the containing block, with an explicit height of
  `rows × pitch`. It is separate from `.scoreboard` **because the header is a flow child of the
  scoreboard** — absolute rows anchored to `.scoreboard` itself would have drawn straight over it.

`ROW_PITCH_PX` lives in its own plain module (`scoreboardLayout.js`) so the component, the container,
the component test and the **node-side parity test** — which cannot import a `.jsx` file at all — all
read one copy.

**Verified in the browser at 100 rows with shuffled ranks:** every adjacent-rank gap exactly 35.333,
**zero overlapping pairs**, rank 1 flush at the container top, the last row inside the container, and
document order ≠ drawn order — the transform is doing the work.

## What this does NOT remove, said before the numbers

A transform is compositor-only **only if nothing else in the row changes**. A rank change also
changes the row's **text** (`#5` → `#4`) and, across the top three, its inline `color` and
`borderColor`. **Those repaint the row regardless of how it is positioned.** So the honest claim was
always: this removes the **re-layout of the whole list**, not the **per-changed-row repaint**.

The measurement below says the re-layout was the expensive half.

## The measurement

Production bundle, real React, 100 racers mid-race, large window, 900 frames per arm, **arm order
rotated every batch**. `flow` reproduces `feat/scoreboard-stable-rows` exactly — memoised row, sorted
array, rows in normal flow — via a bench-only class that undoes the new CSS.

### Idle machine — 6 batches, 5400 frames per arm

| arm | missed | rate | `rafLate` p50 / p90 (mean) | **staircase, ms/frame** |
| --- | --- | --- | --- | --- |
| flow, 500 ms | 65 | **1.204 %** | 0.43 / 1.92 | **0.73** |
| **transform, 500 ms** | **3** | **0.056 %** | 0.43 / **0.65** | **−0.01** |
| flow, 250 ms | 17 | 0.315 % | 0.40 / 0.73 | **0.76** |
| **transform, 250 ms** | **3** | **0.056 %** | 0.40 / **0.60** | **0.08** |

`total` p50 is 16.7 and p90 16.8 in every arm — as always, the misses are a tail.

**The per-batch pattern is the real result.** The transform arms read `stair = 0` in nine batches out
of ten. The flow arms are *usually* zero too — and then have an episode: one batch at **4.41 ms/frame
with 65 missed frames**, another at **3.20 with 13**, another at **1.49**. **The flow layout does not
drift constantly; it drifts sometimes, and the transform layout does not drift at all.** That is
exactly the shape of the owner's log, where the staircase appears and resets rather than running
continuously.

**Do not read flow-500 as worse than flow-250** on this data: the 1.204 % is one bad batch out of six
dominating the pool, and six batches cannot separate two conditions that are usually both zero.

### Loaded machine — 4 batches, recorded with its caveat

Taken earlier while something else was running on the machine, so it is an **uncontrolled** condition
and is reported as an observation, not a result. Every arm degraded — 9 % to 38 % missed — and the
transform kept a consistent but **modest** edge: pooled **19.9 % → 15.9 %** at 500 ms and
**15.7 % → 12.7 %** at 250 ms, about a fifth fewer drops. **The staircase did NOT separate in that
condition** (1.52 vs 1.44, 1.53 vs 1.49) — under real contention the browser is behind for reasons
this change cannot touch. Worth knowing, because the owner's machine is sometimes in that regime: the
transform helps most when the deficit is the list's own layout, and least when something else owns
the CPU.

## Content and order

`scripts/scoreboard-row-parity.test.mjs` was extended rather than replaced, and now compares the row
**as drawn** — sorted by the y each row is translated to — because array position stopped being
visual position. Nine tests over a real seeded race: same racers, same visual order, same ranks, same
finish handling at every tick; the DOM order is stable and is **not** the ranking (asserted on a tick
where the field has moved, or the claim would be untestable); every rank is used exactly once, so no
two rows can land on the same y; and the sabotage arm still fails when one rank moves by one.

`ScoreboardRow.test.jsx` gains the position tests: rank 1 → `translateY(0px)`, rank 4 → 3 pitches,
rank 7 → 6 pitches, and two rows keep their document order whatever their ranks.

**One honest limit, stated rather than papered over:** the pitch is font metrics from a real browser,
and **neither node nor jsdom does layout**, so no test here can re-derive 35.333. The guard instead
pins the CSS inputs it depends on — the row's padding and margin, `position: absolute` on the row,
`position: relative` on the container — and the constant itself. A change to any of them fails and
asks for a re-measurement. That is the most a source-level check can honestly offer.

## What is left

The per-changed-row repaint, as predicted — a rank change still rewrites `#5` to `#4` and repaints
that row. Removing it would mean not showing the rank as text, which is a product change, not a
performance one. And under genuine CPU contention this buys about a fifth, not everything.
