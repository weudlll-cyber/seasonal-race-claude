# BRAKE-WINDOW-1 — 200 ms wins on all ten tracks for nothing, and the fairness instrument cannot see the brake at all

Branch `feat/gap-leader-brake`. **Read-only on shipped code: no shipped source changed, no shipped
default moved, nothing minted, nothing merged.** Date: 2026-09-15.

---

## ★ THE ONE SENTENCE

**The gap brake's rate window should be 200 ms, and it costs nothing to make it so.** At his settings
(90 px, 0.95, 10%, rate law) the 200 ms window gives the smallest worst race on **all ten tracks**,
takes the pooled in-window maximum from **244.4 px (brake off) to 208.3 px** against the shipped
derivation's 227.6, and does it at **exactly today's largest single-step multiplier move (ratio
1.000)** with the **rank error against the drawn plan unmoved** (t = 0.06). **It carries no new
number of its own** — but it is not derived from one either, and that is the catch (below).

---

## PIECE 3 — THE RATE WINDOW

Ten tracks, seeds 1–30, 40 racers, the owner's roster, `wild`, gap brake **ON** at 90 px / 0.95 /
10%, **servo unmodified**. N = 300 races per arm. The window is set by a probe hook in the
instrumented copy; the shipped derivation (`trajectoryTransitionDuration` × 1000 = 1000 ms) is the
"1000 ms" row.

### The in-window maximum (window start → 0.95), WORLD PX

| arm | median | p90 | **MAX** | MAX in canvas widths | vs brake OFF |
|---|---|---|---|---|---|
| brake OFF (**today's shipped behaviour**) | 81.4 | 159.3 | **244.4** | 1.086 | — |
| **200 ms window** | 81.4 | **152.6** | **208.3** | **0.926** | **−36.1** |
| 400 ms window | 81.4 | 154.1 | 214.8 | 0.954 | −29.6 |
| 1000 ms (the shipped derivation) | 81.4 | 156.1 | 227.6 | 1.012 | −16.8 |

Canvas widths against the **SETTLED `LEADER_ZOOM` value of 225 px per width** (ZOOM-PER-STATE-1) —
never a frame zoom.

### Per track — the worst race on each

| track | brake OFF | 1000 ms | 400 ms | **200 ms** |
|---|---|---|---|---|
| city-circuit | 208.1 | 201.5 | 197.3 | **195.9** |
| dirt-oval | 242.9 | 211.9 | 207.9 | **206.6** |
| garden-path | 182.3 | 178.9 | 175.9 | **174.1** |
| ice-track | 206.3 | 193.5 | 181.0 | **176.0** |
| luger-hill | 244.4 | 227.6 | 214.8 | **208.3** |
| mountainstreet | 147.2 | 147.2 | 147.1 | **146.5** |
| river-run | 157.5 | 156.8 | 155.4 | **154.8** |
| searound | 216.4 | 182.2 | 175.8 | **173.7** |
| seatrack | 207.1 | 201.9 | 190.7 | **189.6** |
| space-sprint | 196.5 | 178.0 | 171.8 | **170.3** |

★ **200 ms is best on 10 of 10 tracks; 400 ms on 0; 1000 ms on 0.** It is monotone — every track
improves as the window shortens. Races improved against brake-OFF: **63** (200 ms), 61 (400 ms),
50 (1000 ms); races made worse: **1**, 1, 2.

### What it costs — firing, depth, oscillation, visibility

| arm | fires in | median s | max s | deepest S | worst 1 s direction changes | largest single-step move |
|---|---|---|---|---|---|---|
| 200 ms | 137/300 | 9.07 | 23.12 | 0.1000 | median 0 / **max 43** | **0.011762** |
| 400 ms | 137/300 | 9.12 | 23.34 | 0.1000 | median 0 / max 38 | 0.011762 |
| 1000 ms | 137/300 | 9.18 | 22.32 | 0.1000 | median 0 / **max 14** | 0.011762 |
| brake OFF | — | — | — | — | — | 0.011762 |

★★ **The visibility is IDENTICAL on every arm, to six decimals, including brake OFF.** The rate
window changes what the brake asks for, never how fast the multiplier is allowed to move — that is
still the ease. **There is nothing here the owner could see as abrupt.**

★ **The one real cost is oscillation, and it is honest to name it.** The median race has **zero**
strength direction changes in its worst second on every window, but the worst second in 300 races has
**43 at 200 ms against 14 at 1000 ms** — a shorter window chases the gap more closely and therefore
turns more often. It is confined to the tail: the median is 0 either way.

### The engage gate holds on every window

Smallest gap at which the brake ever **engaged**: **90.001 px** at 200 ms, 400 ms and 1000 ms alike,
against a 90 px allowance. Shortening the window does not let it in early.

### Does it carry a new number?

**★ Yes, in the sense that matters, and this is the catch.** 1000 ms is *derived* — it is
`trajectoryTransitionDuration`, the ease the brake's own command already travels on. **200 ms is
not derived from anything.** It is the interval below which this project measured physics jitter to
dominate, which is a measurement, not a quantity the engine holds. The nearest existing 200 ms is
`laneTargetEaseMs`, which belongs to lateral steering and would couple two unrelated mechanisms.

**So: 200 ms measures better on every track at no visible cost, and adopting it means accepting a
number with no home yet.** That is his call, and the shipped default is untouched.

---

## PIECE 4 — THE GATE, AND WHY HALF OF IT CANNOT BE ANSWERED

### The gate, applied literally

> *Run Piece 4 only if Piece 2 or Piece 3 produced a configuration that beats today's shipped
> behaviour on the in-window maximum WITHOUT worsening the rank error against the drawn plan and
> WITHOUT exceeding today's largest single-step multiplier move.*

Measured paired, brake OFF against brake ON at 90 px / 0.95 / 10% / **200 ms**, N = 300 races:

| gate condition | measured | verdict |
|---|---|---|
| beats today on the in-window maximum | 244.4 → **208.3 px** (−36.1, −14.8%) | ★ **PASSES** |
| without worsening the rank error vs the drawn plan | 2.595 → **2.595**; paired +0.0003, SE 0.0057, **t = 0.06**; 245 of 300 races exactly equal; exact-place hits 1558 → **1560** | ★ **PASSES** |
| without exceeding today's largest single-step move | 0.011762 → 0.011762, **ratio 1.000** | ★ **PASSES** |

**★ THE GATE OPENS.** (For completeness: **no Piece 2 servo variant opened it** — see
[SERVO-NARROW-1](SERVO-NARROW-1.md). The candidate is the rate window alone.)
Byte-identical 234/300; winner changes 22/300.

### ★★ The fairness half CANNOT be run, and the reason is structural

The project's instrument is **`scripts/sim-fairness.mjs`** (start-row fairness via
`scripts/sim/observers/fairness-stats.mjs`). **It is blind to the gap brake.** Checked in the current
tree rather than assumed:

- the string `gapBrake` appears **0 times** in `scripts/sim-fairness.mjs`;
- its `createRacePlan(...)` call at
  [sim-fairness.mjs:4436](../../scripts/sim-fairness.mjs#L4436) passes **no `pathLengthPx`**;
- so `_computeGapLeaderBrake` returns at its `!(pathPx > 0)` guard
  ([racePlanner.js:881](../../client/src/modules/racePlanner.js#L881)) **before it reads anything**.

**Running it on both arms would compare two identical races and report "no difference" — a result
about the instrument, not the brake.** The chain forbids inventing a fairness definition or relaxing
one, and forbids modifying the instrument, so **the fairness verdict on this candidate is NOT
PRODUCED.** It is a genuine gap in the record and it is named rather than papered over.

*(Separately: a run at `--races=5 --racers=40 --track-defaults` was attempted earlier in the night and
killed after **925 s of CPU with zero output written**. Even had the instrument been able to see the
brake, the pinned methodology of 300 races per track was not reachable in the time available.)*

**What this means for the decision:** the candidate has **no fairness clearance**. It also does not
have a fairness *objection* — nothing was measured either way. Since the brake ships OFF and this is a
knob rather than a default change, that is survivable; it would not be, for a shipped default.

### The race shape — the half that CAN be answered

The owner asked whether it also looks natural and good, which is not the fairness question. Paired,
N = 300, brake OFF against the candidate. A lead spell counts only if it lasts at least
**750 ms** — `pulkLeadRotationMinHoldMs`, an existing shipped quantity (the smart camera's own
hold), reused so no new number decides what a lead change is.

| | today (brake OFF) | candidate | paired difference | |
|---|---|---|---|---|
| lead changes per race | 19.43 | 19.44 | +0.003, t = 0.13 | not distinguishable |
| distinct leaders per race | 15.92 | 15.92 | 0.000, t = 0.00 | not distinguishable |
| longest single hold, fraction of race | 0.20 | 0.20 | −0.001, t = **−2.61** | distinguishable, **−0.1 pp** |
| winning margin at the line, world px | 46.57 | 45.80 | −0.778, t = −0.72 | not distinguishable |
| field spread at the line, world px | 692.09 | 688.18 | −3.91, t = **−3.36** | distinguishable, **−0.6%** |
| first-to-last finish spread, ms | 5248 | 5225 | −23.5, t = **−2.76** | distinguishable, **−0.4%** |

| | today | candidate |
|---|---|---|
| races won **clear** (margin at the line above 90 px) | 39/300 | **38/300** |
| races won **contested** (margin ≤ 90 px) | 261/300 | **262/300** |
| winning margin: median / p90 / max | 38.5 / 108.2 / 191.3 | 37.7 / 105.0 / **207.3** |

★ **Plainly: neither more processional nor more contested.** Three of the six measures are
statistically distinguishable at N = 300 — and all three move by **0.1% to 0.6%**, all in the
"very slightly tighter" direction. **Nothing here is a change a viewer could see.** The clear/contested
split moves by one race in three hundred.

★ One honest asterisk: the **maximum** winning margin goes **up**, 191.3 → 207.3 px, while the median
and p90 go down. The brake acts inside its window and the window ends at 0.95; a margin that opens
after that is past it.

---

## WHAT THIS DOES NOT SETTLE

- **No fairness verdict exists for this candidate**, for the structural reason above. That is the
  single biggest hole in this report.
- The oscillation figure is the **worst second in 300 races**; the median race shows none. No eye-test
  has been done on a 200 ms window — the numbers say it is not abrupt, but he has not seen it.
- The race-shape metrics and the 750 ms spell rule are **my construction from existing quantities**,
  not the project's own instrument; there is no pinned methodology for "does it look good".
- Every figure is N = 300 races, servo unmodified, gap brake at 90 px / 0.95 / 10%.
- **No shipped default was changed. The rate window remains derived from
  `trajectoryTransitionDuration` in the shipped tree.**
