<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-12, after piece 2 of the second 2026-09-12 chain.

**Where the code is.** Master is `b6d77637`. `night/2026-09-12b` is branched off it and is **NOT
merged**. **Nothing is minted and the shipped race is unchanged by default.**

---

## ★★ THE ARRIVAL: FOUR VARIANTS ARE IN THE TREE AND THE CHOICE IS YOURS

You asked for the best arrival to be FOUND. It was measured four ways on the same 80 races, ten
tracks, four field sizes.

★★ **YOUR PROPOSAL WORKS AS DESCRIBED — AND MAKES THE ONE FAULT YOU NAMED WORSE.** Free on arrival
gives exactly the feel you wanted: the multiplier sits at **1.0000** while he leads, braked in **1%**
of frames instead of today's **72%**. But the gap on screen becomes **2.7× bigger** (0.179 canvas
widths against 0.066). **Today's brake is what has been containing the runaway.**

| | buys | costs |
|---|---|---|
| **A — today** | the smallest gap: 0.066 widths median, 0.597 worst | **braked in 72%** of the frames he leads |
| **B — free on arrival** | **your feel exactly** (1.0000, 1% braked), best block fairness 82% | **gap 2.7× bigger** on screen |
| **C — free + stop pushing early** | the feel, arrives at pace, a third of B's extra gap gone | **four points of block fairness** |
| **D — C + runaway guard** | ★ **the feel AND most of the containment** (0.089 widths) | the same four points |

★ **D's fairness gates hold**: zero Holm-unfair tracks, band-reach 83–96%. The four points are a
comebacker-specific cost, not a field-wide one.

★ **WATCH ANY OF THEM WITHOUT A REBUILD**: set `localStorage['racearena:arrivalVariant']` to `'B'`,
`'C'` or `'D'` and run a race. Remove the key for today's behaviour. **The default is still A**, and
the world fingerprint proves it: unset, it is `bdf4a3c8ce6e0316`, bit for bit what it was.

★ **AND SOMETHING NOBODY HAD MEASURED: every racer DRIFTS back after arriving, in every variant,
including today's** — a median 5 places today, 8 under B, worst case 54. **That is larger than the
peak gap in every arm.** You have not said whether it is acceptable; it is a number, not a verdict.

---

## What else happened

- **Yesterday's lead-in is OUT.** It bought nothing measurable and cost arrival, so it was removed and
  the removal proved: `racePlanner.js` is byte-identical to its pre-taper state and the before
  fingerprints came back. Its findings are kept in the report — above all that **the drive sits at
  `maxMult` right up to his drawn place**, which is what variants C and D act on.

---

## Where the night stopped

Pieces **1** and **2** are done and pushed. **Pieces 3, 4 and 5 were not started** — piece 2's four
arms and two fairness sweeps took the night. The fall order was 5, then 4, then 3:

- **PIECE 3** — why a racer never finishes, and the browser race having no end. **Not started.**
  Carried: `RaceScreen/index.jsx` ends only at `finishedCount >= nRacers`; `raceOverrunMs` and the
  banner exist and end nothing.
- **PIECE 4** — `BAND_EDGES` is a 40-racer table. **Not started.**
- **PIECE 5** — `/api/health`'s unknown build, `check-runin-frame` on luger-hill at 100 racers,
  `check-image-starts` in CI. **Not started.**

<!-- END CHAIN STATUS -->

## Reports from this chain

- [DIRECTION-AUTHORITY-1](../reports/evolution/DIRECTION-AUTHORITY-1.md) — piece 2: the build and its
  measurements.
- [COMEBACK-CONSTANT-DEFICIT-1](../reports/evolution/COMEBACK-CONSTANT-DEFICIT-1.md) — why the
  min-jerk premium was never the wall, which is what sent piece 2 at the shape instead.
- [COMEBACK-STAGED-1](../reports/evolution/COMEBACK-STAGED-1.md) — the round trip, and the scissors.
- [PACE-DEFICIT-1](../reports/evolution/PACE-DEFICIT-1.md) — the window, and the climb that the
  release at 0.70 relies on.
