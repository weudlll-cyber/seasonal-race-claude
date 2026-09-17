# SERVO-ARRIVAL-1 — the premise is wrong: the servo does arrive, on 69.3% of the steps it commands

Branch `feat/gap-leader-brake`. **Read-only: no source changed, nothing minted, nothing merged.**
Date: 2026-09-14. The owner's store was not opened.

---

## ★ THE ANSWER, AT THE TOP, BECAUSE THE DECISION RULE FIRES

**The placement servo arrives. The premise this task was built on is wrong as a general statement,
and Steps 3 and 4 were therefore NOT run** — per the decision rule in Step 1, which says not to build
a what-if on a fault that is not there.

Measured across the sweep fixture — ten tracks, seeds 1–30, 40 racers, the owner's roster, `wild`,
brake OFF — **N = 300 races, 19,464,218 commanded racer-steps**:

| | |
|---|---|
| commanded steps where the racer gets **≥90%** of what was asked | **69.3%** |
| **median delivered fraction** of the commanded deviation | **1.000** |
| racer-slots whose commands **never** arrive (<20% of their steps) | **0.57%** — **68 of 12,000** |
| racer-slots fully served (≥80% of steps) | 25.1% (3,015) |
| racer-slots partly served (20–80%) | 74.3% (8,917) |
| commanded steps landing on the **wrong side** of natural speed | 10.2% |

**The held multiplier tracks the command on most steps.** That is the decision rule's own test, and it
passes.

### But the reading that prompted this task was not wrong — it was narrow

GAP-BRAKE-HANDOVER-1's follow-up measured one racer (Flare) in one slice (in-window, while leading)
of one race. **That slice is real, and it is the worst slice in the fixture.** Same race, same racer,
four slices — this is the reconciliation, and it is the substance of this report:

| slice (ice-track seed 3, Flare, brake OFF) | N steps | median &#124;formed−held&#124; | median delivered | arrived ≥0.9 | wrong side |
|---|---|---|---|---|---|
| **whole race** | 3958 | **0.00030** | **0.997** | **67.0%** | 19.4% |
| in the brake window (0.600–0.95) | 1635 | 0.01577 | 0.731 | 43.3% | 37.7% |
| **in-window AND leading** | 925 | **0.06718** | **−0.355** | **3.7%** | **64.1%** |
| everything else in his race | 3033 | 0.00030 | **1.000** | **89.5%** | 3.6% |

**Over his whole race the servo delivers essentially all of what it asks (median 0.997). In the 925
steps he spends leading inside the window, it delivers a NEGATIVE fraction — he runs the wrong way
on 64.1% of them.** Both are true. The error was mine, in the previous block's framing: I described a
1-in-5 slice of one racer's race as a property of the servo.

**So the fault is real, it is small, and it is LOCALISED — on the leader.** That is not the premise
this task was asked to test, and it is not enough to justify the what-if. Sections 1 and 2 give the
numbers; the report stops there, as instructed.

---

## STEP 1 — WHERE THE SERVO FORMS, WRITES AND DELIVERS ITS TARGET

**It forms it** at [racePlanner.js:1372](../../client/src/modules/racePlanner.js#L1372) —
`const rawTarget = clamp(1.0 + gain * (error / nActive) + noise, minMult, ceilFor)` — where `gain` is
2.0 ([racePlanner.js:101](../../client/src/modules/racePlanner.js#L101)), so **one rank of steering
error is worth exactly `2.0 / 40 = 0.05`**, and `noise` is
`(rng() - 0.5) * 2 * plan._stochasticNoise` at
[racePlanner.js:1360](../../client/src/modules/racePlanner.js#L1360), with `_stochasticNoise`
resolving to `DEFAULT_STOCHASTIC_NOISE` = 0.0008
([racePlanner.js:286](../../client/src/modules/racePlanner.js#L286) ←
[racePlanner.js:108](../../client/src/modules/racePlanner.js#L108)) because no config sets it.

**It writes it** at [racePlanner.js:1391](../../client/src/modules/racePlanner.js#L1391) through
`_setTarget` ([racePlanner.js:733-739](../../client/src/modules/racePlanner.js#L733-L739)), which
acts only if the move exceeds `TARGET_EPSILON` = 0.001
([racePlanner.js:704](../../client/src/modules/racePlanner.js#L704)) and, when it does, resets
`trajectoryMultPrev` to the value held right now
([racePlanner.js:735](../../client/src/modules/racePlanner.js#L735)) and `trajectoryMultTransStart`
to now ([racePlanner.js:737](../../client/src/modules/racePlanner.js#L737)).

**The ease delivers it** at
[raceCore.js:584-591](../../client/src/modules/raceCore.js#L584-L591) —
`prev + (target - prev) * easeInOutCubic(elapsed / TT_DUR_MS)` while `elapsed < TT_DUR_MS`, and the
target itself after that — with `TT_DUR_MS = trajectoryTransitionDurationMs`
([raceCore.js:583](../../client/src/modules/raceCore.js#L583)), 1000 ms on the shipped config.

### The instrument, and its inertness proof

The shipped build never exposes the target the servo **formed** — only the one it **wrote**, which
the epsilon can make stale. So the measurement runs on an instrumented copy of the tree
(`C:/tmp/srv`, a worktree of `1cab1b08`) carrying **two flag-gated lines, both default off**: one
records `rawTarget` onto the racer, one substitutes `_retargetInFlight` for `_setTarget` at the servo
write. **Proven inert before any number was read from it**, on five races × two brake arms:

| | flags off | observer ON | (counterfactual ON) |
|---|---|---|---|
| ice-track #3, dirt-oval #7, searound #20, space-sprint #2, luger-hill #1, brake OFF **and** brake ON | **IDENTICAL** (10/10) | **IDENTICAL** (10/10) | DIFFERS, as it must |

"Identical" is the full finishing order and all 40 finish times to the millisecond. **Every figure in
this report comes from the observer arm, which is byte-identical to the shipped tree.** The
counterfactual was built and proved live, and then **not used**, because the decision rule fired.

### The three witness races

ice-track seed 3 (his own), plus **dirt-oval seed 7** and **searound seed 20** from the sweep fixture
— the two races GAP-BRAKE-RATE-1 named as its biggest movers. Brake OFF, whole race, all 40 racers.

| | ice-track 3 | dirt-oval 7 | searound 20 | **pooled** |
|---|---|---|---|---|
| racer-steps | 94,904 | 110,611 | 81,312 | **286,827** |
| held == the **written** target | 36.5% | 37.2% | 43.1% | **38.6%** |
| held == the target the servo **formed** | 27.4% | 23.5% | 29.6% | **26.5%** |
| median &#124;formed − held&#124; | 0.01006 | 0.00528 | 0.00080 | **0.00427** |
| **delivered fraction — median** | **1.000** | **1.000** | **1.000** | **1.000** |
| arrived (≥0.9) | 69.0% | 68.1% | 74.1% | **70.1%** |
| under a tenth (<0.1) | 15.1% | 13.4% | 10.8% | **13.2%** |
| wrong side (<0) | 12.0% | 9.7% | 7.6% | **9.9%** |
| commanded slower, ran faster | 19.4% | 17.2% | 18.3% | **18.2%** |
| commanded faster, ran slower | 18.5% | 18.2% | 13.7% | **17.0%** |

**The "delivered fraction"** is `(held − 1) / (formed − 1)` — of the deviation from natural speed the
servo asked for, how much the racer actually got. 1.0 = arrived, 0 = nothing, negative = wrong side.
Restricted to asks of at least half a rank (0.025), N = 217,979 racer-steps pooled.

★ **Exact equality and arrival are different questions, and the difference is the whole point.** The
held value equals the *formed* target on only 26.5% of steps — but the median delivered fraction is
1.000. Both are right: the ease completes **to the written target**, and the written target is never
more than `TARGET_EPSILON` = 0.001 stale, which is **2% of a one-rank command**. The epsilon gate
does not block arrival; it makes the delivered value track a very slightly stale command.

### The restart churn is real, and it is not fatal

| | ice-track 3 | dirt-oval 7 | searound 20 | pooled |
|---|---|---|---|---|
| ease restarts | one every **10.0** steps | 10.1 | 11.8 | **10.5** |
| median elapsed the ease reached before being restarted | **48 ms** of 1000 | 48 ms | 48 ms | **48 ms (4.8%)** |

At 4.8% of the transition, `easeInOutCubic` is `4t³` ≈ 0.00044 — **the multiplier travels 0.04% of the
distance before the clock goes back to zero.** That is exactly the mechanism GAP-BRAKE-PARADOX-1
described. What the sweep shows is that it **does not matter for most commands**, because most
commands stop moving: once the target settles for one second the ease completes and the held value
sits on it. It matters only where the command keeps moving — section 2.

### Is the noise alone enough to cross the epsilon? Yes — and the instrument cannot fully prove it alone

For a racer whose target is **not** clamped, the noise is two independent draws from
U(−0.0008, +0.0008); their difference is triangular on [−0.0016, +0.0016], so
**P(&#124;Δ&#124; > 0.001) = (1 − 0.001/0.0016)² = 14.1%** — about one step in seven, from the noise
and nothing else. Measured, on steps where the racer's own **rank did not change**: median
&#124;Δ formed target&#124; **0.000210**, crossing the epsilon on **10.1%** (N = 279,069 racer-steps).
Measured restart rate: **9.5%** of steps. The three numbers bracket each other.

★ **But "rank unchanged" does not mean "noise only":** the steering term blends `rankError` with
`bandError` and divides by `nActive`, so the formed target can move without this racer's rank moving.
**The instrument cannot separate the noise from that movement, and I am not choosing between them** —
what it does establish is that the noise is of the right size to do it on its own, and that the
measured crossing rate and restart rate agree with that arithmetic to within four points. The
measured median (0.000210) is *below* the unclamped prediction (≈0.00047) because a racer saturated at
`minMult` or at `ceilFor` has his noise clipped away entirely and contributes Δ = 0.

---

## STEP 2 — HOW WIDE IS IT

Sweep fixture: ten tracks, seeds 1–30, 40 racers, the owner's roster, `wild`, **brake OFF so only the
servo is in play**. N = 300 races, 12,000 racer-slots, 19,464,218 commanded racer-steps.

### Share of racers

"Served" = ≥80% of his commanded steps arrive; "partly" = 20–80%; "never" = <20%.

| track | served | partly | never | never, per race (median / max of 40) |
|---|---|---|---|---|
| city-circuit | 26.7% | 73.0% | 0.3% | 0 / 1 |
| dirt-oval | 28.3% | 71.4% | 0.3% | 0 / 1 |
| garden-path | 28.3% | 71.2% | 0.6% | 0 / 2 |
| ice-track | 29.5% | 70.1% | 0.4% | 0 / 1 |
| luger-hill | 26.8% | 72.6% | 0.6% | 0 / 2 |
| mountainstreet | 19.0% | 80.3% | 0.8% | 0 / 2 |
| river-run | 24.8% | 74.3% | 0.8% | 0 / 2 |
| searound | 26.7% | 72.8% | 0.5% | 0 / 1 |
| seatrack | 21.8% | 77.3% | 0.9% | 0 / 2 |
| space-sprint | 19.3% | 80.2% | 0.5% | 0 / 1 |
| **POOLED** | **25.1%** (3,015) | **74.3%** (8,917) | **0.57%** (68) | **median 0, max 2 of 40** |

**In the median race, not one racer of the forty is unserved.** The worst race in 300 has two.

### Share of steps

| track | commanded steps | arrived | wrong side |
|---|---|---|---|
| city-circuit | 2,267,422 | 71.0% | 9.2% |
| dirt-oval | 2,511,288 | 71.4% | 8.7% |
| garden-path | 2,091,950 | 71.1% | 9.5% |
| ice-track | 2,149,912 | 71.0% | 9.4% |
| luger-hill | 1,735,852 | 69.1% | 10.7% |
| mountainstreet | 1,690,747 | 65.6% | 12.0% |
| river-run | 1,746,017 | 68.4% | 10.9% |
| searound | 1,874,319 | 69.9% | 9.9% |
| seatrack | 1,691,939 | 66.4% | 11.6% |
| space-sprint | 1,704,772 | 66.8% | 11.2% |
| **POOLED** | **19,464,218** | **69.3%** | **10.2%** |

**Remarkably flat across tracks** — 65.6% to 71.4%, a 5.8-point spread. This is a property of the
controller, not of any track.

### ★ Is it worse for some racers? Yes — for the LEADER, and for a racer near his place

**By live rank** (N = commanded steps in each slice):

| slice | commanded steps | arrived | wrong side |
|---|---|---|---|
| **live rank 1** | 564,346 | **55.8%** | **15.6%** |
| live rank 2 | 434,676 | 61.0% | 12.7% |
| live rank 3 | 567,170 | 62.1% | 13.0% |
| live rank 4–10 | 4,028,832 | 67.4% | 10.6% |
| live rank 11–30 | 9,831,084 | **71.4%** | 10.0% |
| live rank 31–40 | 4,038,110 | 69.9% | 8.7% |

**The leader is the worst-served racer on the track**, by 15.6 points against the midfield. That is
the finding GAP-BRAKE-HANDOVER-1 stumbled into, now with a population behind it — and it is why it
matters to the gap brake specifically: **the one racer the gap brake acts on is the one racer whose
servo command is least likely to arrive.**

**By distance from his drawn place** — the sharpest gradient in the whole measurement:

| slice | commanded steps | arrived |
|---|---|---|
| at his place (0 off) | 293,097 | 59.0% |
| **1–2 off** | 5,549,768 | **57.8%** |
| 3–5 off | 5,837,662 | 62.4% |
| 6–15 off | 5,360,716 | 78.4% |
| **16+ off** | 2,422,975 | **93.3%** |

★ **This is the opposite of the feared failure, and it is reassuring.** The servo delivers **93.3%**
of a big correction and **57.8%** of a one-to-two-rank nudge. The commands that do not arrive are the
small ones — a fine adjustment of 0.05–0.10 that the ±0.0008 noise keeps re-triggering before it can
travel. **The corrections that decide the race are delivered; the dithering near the target is not.**

**By cast role:**

| role | racers | commanded steps | arrived | wrong side |
|---|---|---|---|---|
| none | 10,361 | 15,882,959 | 70.5% | 9.2% |
| sovereign-lead | 102 | 295,222 | **77.5%** | 7.4% |
| comebacker | 516 | 1,482,615 | 63.9% | **20.0%** |
| faller | 141 | 431,124 | 63.1% | **18.6%** |
| attacker-b2 | 880 | 1,372,298 | **61.5%** | 8.6% |

Cast racers are served worse than uncast ones, and comebackers and fallers are twice as likely to run
the wrong way — consistent with the distance gradient, since a curve-steered racer is repeatedly
re-aimed at a moving target rather than a settled one.

**By finishing position:** essentially flat (68.1%–71.7% across the five bands, N = 12,000 racers).
**The non-arrival is a property of where a racer IS at the moment, not of where he ends up.**

**By phase:** PULK 64.4% (N = 2,119,513), OUTCOME 69.9% (N = 17,344,705). The other three phases issue
no command as large as half a rank. The difference is 5.5 points — **the phase is not the driver.**

---

## WHY THIS STOPS HERE

Step 1's decision rule: *"if the held value tracks the command on most steps, the premise is wrong —
say so plainly at the top and stop after Step 2."* It tracks on **69.3%** of commanded steps with a
**median delivered fraction of 1.000**, and **68 of 12,000** racer-slots (0.57%) are unserved. **The premise is
wrong, and Steps 3 and 4 were not run.**

**What the owner would need to ask to reopen it** is a narrower question than the one asked here,
because a narrower fault is what the numbers show: *the leader, near his drawn place, inside the
outcome phase* — 55.8% arrival, 15.6% wrong side, and on his own ice-track seed 3 that collapses to
3.7% arrival and 64.1% wrong side across 925 steps. The instrumented counterfactual for exactly that
already exists and is proved inert; **it was not run, and no result from it is implied here.**

## WHAT IS TRUE, WITH ITS ADDRESS — AND NOTHING IS PROPOSED

1. **The servo arrives on most of what it commands** — 69.3% of 19,464,218 commanded racer-steps,
   median delivered fraction 1.000.
2. **It fails where the correction is small**: 57.8% arrival at 1–2 ranks off his place against 93.3%
   at 16+ off. The mechanism is `_setTarget`'s restart
   ([racePlanner.js:735-737](../../client/src/modules/racePlanner.js#L735-L737)) firing before the
   ease at [raceCore.js:584-591](../../client/src/modules/raceCore.js#L584-L591) can travel — median
   48 ms of a 1000 ms transition, where `easeInOutCubic` has moved 0.04% of the distance.
3. **The noise is of the right size to cause it on its own**: `DEFAULT_STOCHASTIC_NOISE` 0.0008
   ([racePlanner.js:108](../../client/src/modules/racePlanner.js#L108)) against `TARGET_EPSILON`
   0.001 ([racePlanner.js:704](../../client/src/modules/racePlanner.js#L704)) gives a 14.1% crossing
   rate for an unclamped racer; measured 10.1%, restart rate 9.5%. **The instrument cannot separate
   the noise from blended-error movement and this report does not choose between them.**
4. **The leader is the worst-served racer on the track** — 55.8% arrival against the field's 69.3%.

**No repair was made. `TARGET_EPSILON`, the noise, the ease and the servo are untouched; no source
file changed; nothing was minted; nothing was merged.**

## LIMITS OF THIS MEASUREMENT

- "Arrived" is `delivered ≥ 0.9` and commands below **half a rank (0.025)** are excluded, because the
  ratio is unstable for a near-zero ask. Both thresholds are mine. **The median delivered fraction of
  1.000 is threshold-free** and is the claim to lean on.
- The p90 delivered fraction is **1.359** — the held value **overshoots** the command by a third at
  p90, because the target moves back while the multiplier is still travelling. The servo is noisy in
  both directions, not merely slow.
- Every figure is the **brake-OFF** arm. Nothing here measures the gap brake.
- N = 300 races for the sweep, N = 3 races for the per-step tables, N = 1 race for the Flare slices.
