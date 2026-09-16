# BRAKE-GRID-1 — twenty settings, and not one of them reduces the escape: the brake delays the runaway past its own window instead of preventing it

Branch `feat/gap-leader-brake`. Date: 2026-09-16. **No shipped default changed. Nothing minted,
nothing merged, nothing tagged.** V1 (`servoNoiseBlindEnabled`) was OFF in every cell. The owner's
store was not opened.

---

## ★ ONE LINE

**The best trade is 56 px / 13% — the pair his own eye picked — but it does not clear his first goal,
and neither does any other cell: it buys a 24% smaller lead inside the brake's window and costs
nothing measurable, while the number of races won unopposed is statistically unchanged.**

---

## ★★ THE AUTHORITY CEILING — ESTABLISHED AT THE SOURCE FIRST

**`minMult: 0.85`**, in `DEFAULT_CONTROLLER_PARAMS` at
[racePlanner.js:103](../../client/src/modules/racePlanner.js#L103) — the floor every outcome-controller
target is clamped to at
[racePlanner.js:1423](../../client/src/modules/racePlanner.js#L1423). **The engine's own maximum
braking is therefore 1 − 0.85 = 15%, exactly as the owner recalled. There is no discrepancy.** The
grid stops at 15% and **no value had to be dropped**.

---

## THE SCORING IS MY CONSTRUCTION, NOT HIS CRITERION

He named two goals in words. Everything below is how this block turned them into numbers; **every
component is reported separately and never combined into a score.** He decides from the columns.

**The fixture**, identical in every cell: 10 tracks × seeds 1–30 = **300 races per cell**, 40 racers,
the owner's roster, action stage `wild`, window end 0.95 throughout (his value, not searched).
**21 arms × 300 = 6,300 races.**

★ **Run from one tree, not one checkout per cell.** The hazard named was "never two measurements
writing one tree"; nothing here writes. Each cell's settings are passed as a `raceDynamicsConfig`
override to `buildRace`, in process, exactly as the dev screen would supply them — so there is no file
to collide over, and a shared read-only tree cannot go stale the way twenty checkouts can. 10 workers
on 14 logical cores.

---

## ★★ THE NOISE FLOOR IS EXACTLY ZERO

Races in which the brake never issued a command must reproduce SHIPPED to the millisecond.

> **2,275 quiet races across all cells. 2,275 byte-identical to SHIPPED. Zero exceptions.**

**So there is no measurement spread at all, and every difference below is real.** Nothing in this
report is ranked on noise — but note that "real" is not the same as "distinguishable", which is what
the paired test settles.

---

## A — THE ESCAPE, WHICH IS THE NUMBER THE BRAKE EXISTS TO REDUCE

**Definition.** "A racer escapes and then wins without being challenged." Measured as the **unopposed
run-in**: find the **last lead change** of the race — after it, nobody ever took the lead again, so
the leader through that stretch is the winner by construction. The race counts as an escape if his
gap in that stretch ever exceeded a reference. ★ The reference is **fixed at 90 px and 124 px for
every cell**, never the cell's own allowance, or "escaped" would mean something different in each row.

★ A first version asked for *no lead change after the gap first passed 90 px*; with ~38 lead changes
per race that is almost never true and scored every race zero. It measured the wrong thing rather
than nothing, which is worse. Corrected before any cell was read.

### A1 — the count, and what each cell actually changed

The grid is **paired** — every cell runs the same 300 seeds — so the marginal count hides which races
moved. McNemar's exact test on the discordant pairs:

| cell | esc>90px | **fixed** | **caused** | net | **p** | verdict |
|---|---|---|---|---|---|---|
| **SHIPPED (off)** | **42/300** | — | — | — | — | the reference |
| 40 px / 8% | 37 | 10 | 5 | +5 | 0.302 | not distinguishable |
| 40 px / 10% | 41 | 9 | 8 | +1 | 1.000 | not distinguishable |
| **40 px / 13%** | **34** | **12** | 4 | **+8** | **0.077** | **not distinguishable** |
| 40 px / 15% | 35 | 14 | 7 | +7 | 0.189 | not distinguishable |
| 56 px / 8% | 39 | 5 | 2 | +3 | 0.453 | not distinguishable |
| 56 px / 10% | 43 | 5 | 6 | −1 | 1.000 | not distinguishable |
| **56 px / 13%** ← his eye | **36** | **9** | 3 | **+6** | **0.146** | **not distinguishable** |
| 56 px / 15% | 38 | 10 | 6 | +4 | 0.454 | not distinguishable |
| 70 px / 8–15% | 42 / 43 / 39 / 37 | 1 / 1 / 6 / 6 | 1 / 2 / 3 / 1 | +0 / −1 / +3 / +5 | 1.000 / 1.000 / 0.508 / 0.125 | not distinguishable |
| 90 px / 8–15% | 42 / 42 / 43 / 40 | 0 / 0 / 0 / 2 | 0 / 0 / 1 / 0 | +0 / +0 / −1 / +2 | 1.000 / 1.000 / 1.000 / 0.500 | not distinguishable |
| 124 px / 8–15% | 42 / 43 / 41 / 40 | 0 / 0 / 1 / 2 | 0 / 1 / 0 / 0 | +0 / −1 / +1 / +2 | 1.000 / 1.000 / 1.000 / 0.500 | not distinguishable |

★★★ **Not one of the twenty cells is distinguishable from SHIPPED. Every p ≥ 0.077.**

★ **And the brake CAUSES escapes as well as fixing them** — 1 to 8 races per cell that SHIPPED did not
have. Slowing the leader reshuffles who leads, and sometimes the racer who inherits the lead escapes
instead. At 40 px / 10% it causes 8 and fixes 9.

### A2 — ★★ WHY: the brake delays the runaway past its own window

| cell | max lead **to 0.95** | max lead **to the finish** | the difference |
|---|---|---|---|
| **SHIPPED (off)** | **244.4 px** | **279.6 px** | 35.2 |
| 56 px / 13% ← his eye | **187.5** (−23%) | **275.4** (−1.5%) | **87.9** |
| 40 px / 13% | **170.2** (−30%) | 284.3 (**+1.7%**) | **114.0** |
| 40 px / 15% | **160.2** (−34%) | 258.3 (−7.6%) | 98.1 |
| 90 px / 15% | 206.2 | 279.6 (unchanged) | 73.4 |
| 124 px / 8% | 244.4 (unchanged) | 279.6 (unchanged) | 35.2 |

★★ **The in-window maximum falls by up to a third. The maximum to the finish does not fall at all** —
it is unchanged at 279.6 px on 13 of the 20 cells, and at 40 px / 13% it is *larger* than shipped.
★★ **And the gap between the two grows with braking strength**: 35.2 px shipped → 114.0 px at
40 px / 13%. The harder the brake works, the more of the lead re-opens after it lets go.

**Per race, where the biggest lead sits:**

| | biggest lead comes **after 0.95** |
|---|---|
| SHIPPED | **184/300 (61.3%)** |
| 56 px / 13% | 207/300 (69.0%) |
| 40 px / 15% | 219/300 (73.0%) |

★★★ **The runaway the owner is worried about is completed after `gapBrakeWindowEnd` = 0.95, and the
brake pushes more of it there.** That is the mechanism, measured, and it is why no allowance and no
authority up to the engine's own ceiling can reduce the escape.

---

## B — THE MONOTONY, WHICH NO CELL HARMS

### B1 — is it still a race?

| cell | lead changes (med) | distinct leaders (med) | top leader's hold | contested finishes |
|---|---|---|---|---|
| **SHIPPED (off)** | **40** | **37** | **43.1%** | **129/300** |
| 40 px / 13% | 40 | 37 | 39.1% | 124/300 |
| 40 px / 15% | 40 | 37 | 39.1% | 133/300 |
| 56 px / 13% ← his eye | 40 | 37 | 40.6% | 124/300 |
| 90 px / 15% | 40 | 37 | 43.0% | 134/300 |
| 124 px / 15% | 40 | 37 | 43.0% | 133/300 |

★★ **Lead changes are 40 and distinct leaders 37 on every single cell, including shipped.** Contested
finishes range 124–139 against shipped's 129 — the spread is the same either side. **The leader's
hold actually falls** with braking (43.1% → 39.1%), which is *less* monotonous, not more.

★ **On these measures the brake does not make races monotonous at any setting in the grid** — not even
at the smallest allowance and the engine's maximum authority.

### B2 — the field at the line

Spread at the winner's crossing: **695 px** shipped, 664–694 across all cells. Margin to second:
**38.5 px** shipped, 36.0–41.3 across all cells. **Both inside the range the cells span among
themselves.**

### B3 — ★ how much the brake works, and on what

| cell | races it commands in | firing share of in-window frames | **on gaps below 90 px** | below 124 px | deepest strength |
|---|---|---|---|---|---|
| 40 px / 8% | **289/300** | 9.0% | **81%** | 100% | 0.0800 |
| 40 px / 13% | **289/300** | 15.0% | **100%** | 100% | 0.1300 |
| 40 px / 15% | **289/300** | 16.1% | **100%** | 100% | 0.1500 |
| 56 px / 13% ← his eye | 238/300 | 2.1% | **54%** | 100% | 0.1300 |
| 70 px / 13% | 190/300 | 0.0% | 33% | 86% | 0.1300 |
| 90 px / 13% | 137/300 | 0.0% | 15% | 47% | 0.1300 |
| 124 px / 13% | 78/300 | 0.0% | 0% | 3% | 0.1012 |

★★ **This is where the owner's first failure mode actually shows.** At 40 px the brake commands in
**289 of 300 races** and **100% of its work lands on gaps below 90 px** — that is literally "so much
braking that even small gaps are closed", in his words, even though the monotony *metrics* above do
not move. **A cell can violate his intent without my numbers catching it, and this is that case.**

★ At 124 px the brake is nearly idle: 78/300 races, and it cannot reach its own ceiling (deepest
0.1012 of a possible 0.13) because the gap closes before the strength has ramped.

---

## C — VISIBILITY (his standing rule: nothing may be abrupt)

| cell | largest single-step multiplier move | vs shipped | largest one-frame speed change | vs shipped |
|---|---|---|---|---|
| SHIPPED | 0.011762 | 1.000× | 206.62 px/s | 1.000× |
| **19 of 20 cells** | **0.011762** | **1.000×** | **206.62 px/s** | **1.000×** |
| **★ 40 px / 15%** | **0.012216** | **1.039×** | 206.62 px/s | 1.000× |

★★ **Nineteen of twenty cells do not move either abruptness measure at all.** The exception is
**40 px / 15%**, the only cell in the grid that exceeds the shipped maximum single-step move — and it
must not win on any other column without that caveat attached.

---

## ★ WHAT I WOULD PUT IN FRONT OF HIM — AND WHAT IT DOES NOT DO

**56 px / 13%**, which is the pair his own eye picked this morning.

**Why, applying his decision rules rather than my preference:**

1. **No cell clears goal A.** The rule says name the best trade and label it as not clearing both
   goals. **This is that label: 56 px / 13% does not reduce the races won unopposed.**
2. **40 px / 13% has the best point estimate** (+8 against +6) — but the two are **indistinguishable
   from each other and from shipped** (p = 0.077 and 0.146), and his rule for that case is to
   **prefer the one that brakes less**. 56 px commands in 238 races against 289, and puts 54% of its
   work below 90 px against 100%.
3. **40 px / 15% is excluded on visibility** — the one cell that exceeds the shipped maximum.
4. **What it buys, provably:** the in-window maximum lead **244.4 → 187.5 px (−23%)**, and the p90
   **159.3 → 123.6 px**. That is a real and large reduction of the lead *while the race is still
   being watched as a race*.
5. **What it costs:** nothing measurable. Lead changes, distinct leaders, field spread, margin at the
   line and both abruptness measures are all unmoved.

**Where the two goals begin to trade against each other: at 56 px, going down.** Above 56 px the brake
is too rarely obeyed to move anything (70 px fires on 0.0% of in-window frames by the median race);
below 56 px it starts working almost continuously on leads that are not runaways — 100% of its firing
below 90 px at 40 px allowance. **56 px is the last value where it is still selective.**

---

## ★★ WHAT THIS GRID SAYS THAT NOBODY ASKED

**The gap brake cannot deliver the goal it was built for, at any setting, because its window ends at
0.95 and the runaway is completed after that.** 61.3% of shipped races already have their largest lead
after 0.95; braking raises that to 69–73%. The lever that would reach this is
`gapBrakeWindowEnd` — **his value, and explicitly not searched tonight.** I did not search it and I am
not proposing a number for it; I am reporting that the evidence points there and nowhere else in this
grid.

---

## WHAT THIS DOES NOT SETTLE

- N = 300 races per cell (10 tracks × seeds 1–30). The escape counts are small integers — 34 to 43 —
  and no pair of cells is distinguishable from another either.
- The escape definition is mine (above). A different definition of "unopposed" would move the counts,
  though not the A2 finding, which is a property of where the maximum sits in time.
- **Window end 0.95 was held fixed at his value**, so this grid cannot say what a later window would
  do — only that the evidence points at it.
- Racer type is confounded with track: each track ran the fixture's own 40-racer roster, not a
  type sweep.
- Fairness is not measured here; it is the deep test's job.
