# PICK-WINNER-1 — the brake still contributes, but V1 and the brake TOGETHER break the abruptness rule

Branch `feat/gap-leader-brake`. Date: 2026-09-15. **Measured in an instrumented copy; shipped source
untouched in this piece.** Nothing minted, nothing merged.

---

## ★★ THE TWO ANSWERS

**1. Yes — with the servo repaired, the gap brake still contributes.** Against ARM 1 (V1 alone) the
brake takes another **−17.1 px** (1000 ms) or **−23.5 px** (200 ms) off the worst in-window race, and
it is **better on 39 / 48 races and worse on 0**. Paired t = **−3.78** and **−4.45** — distinguishable,
not noise. It fires in **105 of 300** races with the servo repaired, against 137 with it as it is.
**A repaired servo reduces the brake's work; it does not remove the need for it.**

**2. And V1 plus the brake is not shippable, for a reason neither shows alone.** Largest single-step
multiplier move against ARM 0: **ARM 1 = 1.008×**, but **ARM 2 = 7.607×** and **ARM 3 = 7.088×**.
Separately, V1 costs 0.8% and the brake costs nothing (measured last night at 1.000×). **Together they
cost seven times.** The owner's standing rule is that nothing may be abrupt, so ARMS 2 and 3 are out
on that line alone.

**No arm clears the bar. The closest is ARM 1**, which fails only on visibility and only by **0.8%**,
against 600–700% for the other two. It goes into Piece 3 **labelled as not clearing**.

### Why the two combine badly — the mechanism, not a guess

V1 writes the target every step and restarts the ease **only** when the deterministic command moves.
Once the transition clock is older than the transition duration,
[raceCore.js:584-591](../../client/src/modules/raceCore.js#L584-L591) returns the target itself, so
the held multiplier **tracks the written target exactly, step for step**. That is precisely what makes
V1 deliver. But it also means that when some *other* mechanism moves the target discontinuously — the
gap brake engaging, or releasing at its window end — that discontinuity lands **undamped, in one
16 ms step**. The measured jump is **0.0895**, which is the brake's 10% ceiling arriving at once.

**So V1 removes the very churn that was accidentally smoothing the brake's own edges.** The two
changes are safe apart and unsafe together, and only a combined arm could have shown it.

---

## THE ARMS, AND THE INERTNESS PROOF

| arm | what it is |
|---|---|
| **ARM 0** | today's shipped behaviour — the reference every column is read against |
| **ARM 1** | V1 only (the servo's restart decision ignores the noise). Gap brake OFF. |
| **ARM 2** | V1 + the gap brake at 90 px / 0.95 / 10%, rate window **1000 ms** |
| **ARM 3** | the same, rate window **200 ms** |

Proved inert before any arm was measured — 10 races, brake OFF **and** brake ON:

| | result |
|---|---|
| all flags off | **10/10 IDENTICAL** to the shipped tree |
| observer on, arms off | **10/10 IDENTICAL** |
| gap brake ON with V1 off | **10/10 IDENTICAL** to the shipped tree |
| each arm switched on | differs on **10/10**, as it must |

"Identical" = finishing order **and** all 40 finish times to the millisecond.

---

## PIECE 1 — THE NUMBERS

Ten tracks, seeds 1–30, 40 racers, the owner's roster, `wild`. **N = 300 races per arm.** World px is
the primary unit; canvas widths only against the **settled `LEADER_ZOOM` value of 225 px/width**
(ZOOM-PER-STATE-1), never a per-frame zoom.

### The largest lead — WORLD PX

| arm | window→0.95 med / p90 / **MAX** | window→finish med / p90 / max | MAX in widths |
|---|---|---|---|
| ARM 0 shipped today | 81.4 / 159.3 / **244.4** | 121.4 / 178.7 / 279.6 | 1.086 |
| ARM 1 V1, brake OFF | **70.9** / 156.0 / **239.3** | 107.1 / 174.8 / 247.2 | 1.064 |
| ARM 2 V1 + brake 1000 ms | **70.9** / 153.3 / **222.2** | 107.1 / 173.3 / 251.7 | 0.987 |
| **ARM 3** V1 + brake 200 ms | **70.9** / **149.9** / **215.9** | 107.1 / **167.5** / 246.0 | **0.959** |

★ All three arms move the **median** identically (81.4 → 70.9, −12.9%) — that is V1's doing, and the
brake adds nothing to the median. **The brake's entire contribution is in the tail.**

### Servo arrival

| arm | overall | **LEADER** | **small (1–2 off)** | large (16+ off) | wrong side | median del / p90 |
|---|---|---|---|---|---|---|
| ARM 0 | 69.3% | **55.8%** | **57.8%** | 93.3% | 10.2% | 1.000 / 1.340 |
| ARM 1 | 76.7% | **79.7%** | 74.1% | 92.8% | **5.1%** | 1.000 / **1.174** |
| ARM 2 | 76.8% | 79.8% | 74.2% | 92.8% | 5.1% | 1.000 / 1.177 |
| ARM 3 | 76.8% | **79.9%** | 74.2% | 92.8% | 5.1% | 1.000 / 1.177 |

N = 19,464,218 commanded racer-steps on ARM 0. "Arrived" = delivered ≥ 0.9 on an ask ≥ 0.025 —
**both thresholds are mine**; the threshold-free median and p90 sit beside them. **The brake changes
arrival by 0.1–0.2 points, i.e. not at all** — it acts on one racer for a few seconds.

### Rank error against the drawn plan — what the servo exists to reduce

| arm | mean &#124;finish − drawn&#124; | exact hits | paired vs ARM 0 |
|---|---|---|---|
| ARM 0 | 2.595 | 1558/12000 | (reference) |
| ARM 1 | 2.601 | **1600** | +0.0058, **t = 0.19** — indistinguishable (worse 143 / better 138 / equal 19) |
| ARM 2 | 2.601 | 1594 | +0.0058, **t = 0.20** — indistinguishable |
| ARM 3 | 2.599 | **1609** | +0.0038, **t = 0.13** — indistinguishable |

★ **None of the three moves it either way.** The point estimates are a few thousandths worse and all
three t-values are essentially zero, while exact-place hits go **up** on all three. Per the decision
rule this is "indistinguishable", not "worse" and not "better".

### ★ VISIBILITY — the line that decides this

| arm | median | p90 | **MAX** | **vs ARM 0** |
|---|---|---|---|---|
| ARM 0 | 0.011722 | 0.011762 | 0.011762 | 1.000× |
| **ARM 1** | 0.011734 | 0.011762 | **0.011855** | **1.008×** |
| ARM 2 | 0.011734 | 0.011762 | **0.089471** | **7.607×** |
| ARM 3 | 0.011734 | 0.011762 | **0.083363** | **7.088×** |

★★ **This is the night's finding.** The median and p90 are identical on all four arms — the change is
entirely in the worst single step of 300 races, and on the combined arms that step is the brake's
whole 10% ceiling landing at once.

### How much the race moves, and what the brake does

| arm | byte-identical | winner changes |
|---|---|---|
| ARM 1 | **0/300** | 190/300 |
| ARM 2 | 0/300 | 192/300 |
| ARM 3 | 0/300 | 192/300 |

| arm | brake fires in | median s | max s | deepest S | worst 1 s direction changes | smallest ENGAGE gap |
|---|---|---|---|---|---|---|
| ARM 2 | 105/300 | 10.03 | 23.26 | 0.1000 | median 0 / max 48 | 90.002 px |
| ARM 3 | 105/300 | 9.90 | 22.30 | 0.1000 | median 0 / max 53 | 90.002 px |

The engage gate holds (90.002 px against a 90 px allowance) on both.

### ★ Does the brake still contribute? — the direct comparison

| | in-window MAX | vs ARM 1 | races better / worse / unchanged | paired |
|---|---|---|---|---|
| ARM 1 V1 alone | 239.3 | — | — | — |
| ARM 2 + brake 1000 ms | 222.2 | **−17.1** | **39 / 0 / 261** | −1.27 px, **t = −3.78** distinguishable |
| ARM 3 + brake 200 ms | **215.9** | **−23.5** | **48 / 0 / 252** | −1.92 px, **t = −4.45** distinguishable |

Races with a lead above 90 px in-window: **ARM 0 139 → ARM 1/2/3 all 108** of 300. (V1 removes 31 of
them; the brake removes none *additional* by that count — it lowers the peaks of races that still
qualify rather than pulling races under the line.)

**The answer is plain: the brake still does work the repaired servo does not.** It never makes a race
worse, it helps 39–48 of 300, and it is the only thing that touches the tail.

### Per track — the in-window maximum, because the pooled figure hides a mixed picture

| track | ARM 0 | ARM 1 | ARM 2 | ARM 3 | best |
|---|---|---|---|---|---|
| city-circuit | 208.1 | **230.6** | 221.7 | 205.3 | ARM 3 |
| dirt-oval | 242.9 | 239.3 | 207.5 | **201.3** | ARM 3 |
| garden-path | 182.3 | 182.4 | 176.3 | **167.5** | ARM 3 |
| ice-track | 206.3 | 191.3 | 191.3 | 191.3 | ARM 2 |
| luger-hill | 244.4 | 193.0 | 174.2 | **168.8** | ARM 3 |
| **mountainstreet** | **147.2** | **193.0** | 178.2 | 171.9 | **ARM 0** |
| river-run | 157.5 | 161.8 | 154.4 | **148.3** | ARM 3 |
| searound | 216.4 | **231.1** | 222.2 | 215.9 | ARM 3 |
| seatrack | 207.1 | 158.4 | 158.2 | **156.3** | ARM 3 |
| space-sprint | 196.5 | 181.7 | 181.6 | **180.0** | ARM 3 |

★★ **ARM 1 alone is WORSE than today on four tracks** — mountainstreet by **+45.8 px**, searound
+14.7, city-circuit +22.5, river-run +4.3 — and its pooled −5.1 px comes almost entirely from
luger-hill (−51.4) and seatrack (−48.7). **A pooled maximum is a poor summary here and the per-track
table is the honest one.** ARM 3 is best on 8 tracks and beaten by ARM 0 only on mountainstreet.

### Race shape — my construction, not a project instrument

Lead spells count only at ≥ 750 ms (`pulkLeadRotationMinHoldMs`, an existing shipped quantity).

| arm | lead changes | distinct leaders | longest hold | margin at line (px) | spread at line (px) | won clear /300 |
|---|---|---|---|---|---|---|
| ARM 0 | 19.43 | 15.92 | 0.197 | 46.6 | 692.1 | 39 |
| ARM 1 | 19.46 | 15.83 | 0.205 | **39.3** | **609.1** | **24** |
| ARM 2 | 19.50 | 15.83 | 0.203 | 38.6 | 607.6 | 25 |
| ARM 3 | 19.49 | 15.84 | 0.203 | 38.9 | 607.4 | 25 |

★ **Lead changes and distinct leaders are unchanged.** What V1 does change is the **finish**: the
winning margin falls 46.6 → 39.3 px (−16%), the field is **83 px tighter** at the line, and races won
clear drop **39 → 24 of 300**. **More contested at the line, not more processional** — and that is
V1's doing, not the brake's.

---

## PIECE 2 — THE RANKING

Bar: lowers the in-window maximum most **without** worsening the rank error **and without** exceeding
ARM 0's largest single-step multiplier move. A t-value near zero counts as "indistinguishable", not
"worse".

| rank by improvement | arm | in-window MAX | rank error | visibility | verdict |
|---|---|---|---|---|---|
| 1 | ARM 3 V1 + brake 200 ms | **215.9** (−28.5) | t = 0.13 ok | **7.088×** | **does not clear** — visibility |
| 2 | ARM 2 V1 + brake 1000 ms | 222.2 (−22.2) | t = 0.20 ok | **7.607×** | **does not clear** — visibility |
| 3 | ARM 1 V1, brake OFF | 239.3 (−5.1) | t = 0.19 ok | **1.008×** | **does not clear** — visibility, by 0.8% |

**★ NO ARM CLEARS THE BAR.** All three fail on the same condition and only that condition.

**The closest is ARM 1**, and it is not close between them: it exceeds ARM 0's largest single step by
**0.8%**, while ARMS 2 and 3 exceed it by **609%** and **709%**. A 0.8% excess on the worst single
step of 300 races is of the same order as the measurement itself; a 7× excess is a visible jolt.

**ARM 1 therefore goes into Piece 3, labelled as NOT CLEARING THE BAR.** Implementing it means the
gap brake stays at its shipped default of OFF, so ARM 1 is exactly "V1 in the shipped source, nothing
else changed".

★ **What the owner is choosing between, stated once:** ARM 1 buys **+23.9 points of leader arrival**,
a **12.9% lower median** in-window lead and a **16% tighter winning margin**, for a 0.8% visibility
excess, an indistinguishable rank error, and a **full re-baseline** (0/300 byte-identical, 190/300
winner changes, all four fingerprints). It also makes **four tracks worse** at the extreme, one of
them by 45.8 px. None of that is a measurement question any more.

---

## WHAT THIS DOES NOT SETTLE

- **The combined arms are disqualified on visibility, not investigated.** The 7× jump has a named
  mechanism and a measured size; whether it could be damped (by routing the brake's release through
  the same restart V1 keeps for the servo, say) was **not built or measured** — it would be a fourth
  variant and the chain asked for these four.
- Arrival thresholds (≥ 0.9, ask ≥ 0.025) are mine; threshold-free columns are given.
- The race-shape metrics and the 750 ms spell rule are **my construction**; the project has no pinned
  instrument for "does it look good".
- N = 300 races per arm; every figure is `wild`, 40 racers, the owner's roster.
