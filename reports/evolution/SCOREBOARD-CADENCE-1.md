# SCOREBOARD-CADENCE-1 — one number, and the rate falls at least proportionally

**Branch** `feat/scoreboard-cadence-1`, cut from master `570a8505`. **NOT merged — this is a visible
change and it waits for the owner's eye.** All four fingerprints unchanged.

**THE ANSWER TO THE QUESTION THE BRIEF ASKED: the missed-frame rate falls AT LEAST proportionally,
and better than proportionally at the long end.** Over 9 order-randomised batches, 8100 measured
frames per arm: **250 ms → 0.185 %, 500 ms → 0.086 %, 1000 ms → 0.012 %.** Halving the cadence from
250 to 500 cuts the rate 2.1× (proportional would be 2×); halving again to 1000 cuts it a further
**7×**. **So the per-tick cost is NOT the dominant term — the frequency is — and the memoisation
priced in FRAME-GAP-3 is NOT indicated by this data.** That is the opposite of the answer the brief
flagged as "interesting", and it is the cheaper one.

---

## What changed

**The cadence is read in exactly ONE place** — `RaceScreen/index.jsx`, the `Math.round(physicsTs /
250) !== Math.round((physicsTs - FIXED_DT) / 250)` bucket test. The only other `setScoreboard` is a
one-shot seed at race init and has no cadence. So there was no second copy to reconcile, and this is
recorded because the brief asked to hear about it before anything was changed.

- **`scoreboardIntervalMs: 500`** in `DEFAULT_FRAME_TIMING_CONFIG`, with `SCOREBOARD_INTERVAL_MIN_MS`
  / `MAX_MS` (100–2000) as one home for the band, and loader validation that falls back to the
  default rather than letting an out-of-band value reach the race.
- **A Dev Screen control** in the Frame Timing card: a number box plus one-click 250 / 500 / 1000
  buttons — the three the owner is choosing between — and a line reading the choice back as updates
  per race second.
- **The call site** now reads the setting. **The bucket stays in PHYSICS time, deliberately and
  unchanged**: the list then ticks with the race even through BATTLE slow-motion instead of running
  ahead of the picture it describes.

**Nothing else.** React untouched, no memoisation, the scoreboard's contents and sort identical.

## The measurement

Production bundle, 100 racers, mountainstreet, mid-race, large window (canvas 1023×575), 900 measured
frames per arm after a 90-frame warm-up — **the same shape as FRAME-GAP-3 so the numbers are
comparable**. Nine batches, and **the arm order rotates every batch**, because the first attempt
produced one batch in which all three arms were bad at once (250 → 6.78 %, 500 → 6.56 %, **1000 →
0.78 %**) — ambient machine noise, not cadence, and with a fixed order it would have been read as
"250 is worst". That batch is excluded and the rotation is why.

| cadence | missed vsync | rate | `rafLate` p50 / p90 (median of 9) | total p50 / p90 | list updates per 15 s |
| --- | --- | --- | --- | --- | --- |
| **250 ms** (the old behaviour) | 15 / 8100 | **0.185 %** | 0.4 / **4.3** | 16.7 / 16.8 | 66 |
| **500 ms** (shipped here) | 7 / 8100 | **0.086 %** | 0.4 / **1.6** | 16.7 / 16.8 | 33 |
| **1000 ms** | 1 / 8100 | **0.012 %** | 0.4 / **0.7** | 16.7 / 16.8 | 16–17 |

Pace is 1001 in every arm — the race keeps real time throughout. `total` p90 is 16.8 everywhere
because the misses are a tail, not a shift; `max` is 33.2–33.6 wherever one occurs. Update counts
confirm the arithmetic: 66 / 33 / 16 for 250 / 500 / 1000 over a 15-second window.

**`rafLate` p90 is the cleanest signal**: **4.3 → 1.6 → 0.7 ms**. Each halving of the cadence roughly
halves the browser's lateness, and at 1000 ms it is within noise of the 0.6 ms floor FRAME-GAP-3
measured with the list hidden entirely.

### Proportional, or better

| step | cadence cut | rate cut | verdict |
| --- | --- | --- | --- |
| 250 → 500 | 2× | 2.1× | **proportional** |
| 500 → 1000 | 2× | **7×** | **better than proportional** |
| 250 → 1000 | 4× | **15×** | better than proportional |

**Stated plainly, as asked: the rate does not fall LESS than proportionally anywhere in this range.**
The argument for memoisation — that the per-tick cost matters more than the frequency — **is not made
by this data.** If the per-tick cost dominated, cutting the frequency would have bought less than
proportionally; it bought more.

### One honest caveat about absolute numbers

FRAME-GAP-3 measured **0.78 %** pooled for the same arm at 250 ms; this session measures **0.185 %**
for that arm. Same machine, same harness shape, different day — and FRAME-GAP-3's figure was itself
dominated by one batch of 48. **The absolute rates are not comparable across sessions; the RATIO
within this session is the measurement**, and the ratio is what the table above reports. That
volatility is also why the owner's own log matters more than any of this.

## What stopping the hundred-new-objects-per-tick would cost — priced, not built

The line is `[...st.racers].sort(...).map((r, i) => ({ ...r, rank: i + 1 }))`. Every tick spreads
every racer into a **new object**, so every row's props are new by identity and React re-renders all
hundred even where nothing displayed changed.

**Can it be done without touching the row component's shape? Yes — and that is the important part of
the answer.** The row reads exactly six things: `r.index` (the key), `r.finished`, `r.icon`,
`r.raceNumber`, `r.name`, and `r.finishTimeMs`. Of those, **four never change during a race** and only
`finished` and `finishTimeMs` do, once each, at the moment that racer crosses. So:

1. **Emit a narrow record instead of a spread** — `{ index, icon, name, raceNumber, finished,
   finishTimeMs }` — and the row's JSX does not change at all, because it already reads only those
   fields. **Small: one `map` body.**
2. **Memoise the row** (`React.memo`) so an unchanged record skips its render. This requires the row
   to become its own component — today it is an inline arrow inside the `.map`. **Moderate: extract
   ~20 lines of JSX, no change to what it renders.**
3. Together these mean a tick where only the ORDER changed re-renders nothing and only reorders keyed
   DOM nodes — which is the cheap half of what the browser does today.

**Estimate: under an hour, no change to the row's markup or the list's contents, and it is orthogonal
to the cadence** — the two compose. **But this measurement does not call for it.** It would be
justified if the owner picks 250 ms for feel and still sees dropped frames; at 500 or 1000 the
frequency has already done the work.

## What is NOT established

- **The owner's 40 %.** This harness's worst arm is 0.185 %. The mode is reproduced, the rate never
  has been, across four blocks. His own log at his chosen cadence is the only thing that settles
  whether the list was the whole story.
- **Whether 500 ms feels right.** That is the eye test this branch exists for, and it is his call.
