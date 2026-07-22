# Handover Budget Re-Analysis — two-sided authority (owner's counter-argument)

Analysis only. No code changed, no sim behaviour touched, no sweep run. All inputs are measured
values from committed diagnostics; the calc is a deterministic script reproduced at the end.

---

## 1. The plain answer: yes, the brake was already in it

**The 0.91 L/s figure already had the yielder at the brake floor.** It is the third row of the
review's table — *"full saturation (+2 vs −3) | 1.10 / 0.85 | 29.4% | 0.91 l/s"* — and it is the row
the 2.7-handover ceiling was computed from. The two-sided regime was the ceiling case, not the
excluded case. The counter-argument does not add authority that was left out.

Two corrections do apply, and they pull in **opposite directions**:

| | review used | correct | effect |
|---|---|---|---|
| differential at equal draws | 0.91 L/s (ratio 1.10/0.85 − 1 = 29.4%, applied to mean speed) | **0.79 L/s** (difference 1.10 − 0.85 = 0.25, applied to mean speed) | review was ~15% **too generous** |
| slew cost per handover | 1.0 s | **0.5 s** (`easeInOutCubic` is symmetric, mean 0.5 over the transition; [mathUtils via sim-fairness.mjs:496-498](../../scripts/sim-fairness.mjs#L496-L498)) | review was **too pessimistic** |

They very nearly cancel: the old arithmetic gave 2.25/0.91 + 1.0 = 3.47 s per handover, the corrected
gives 2.25/0.79 + 0.5 = 3.35 s. **The 2.7-handover ceiling survives the correction unchanged** — but,
per §4 below, it was resting on the wrong displacement term, and that is where the number actually moves.

---

## 2. Revised seconds per handover

Inputs, all measured, all committed:

| quantity | value | source |
|---|---|---|
| field speed (final window) | 3.11 L/s | p1-contest measurement race, `lenScale` 212.744 |
| spreadFactor, P1 median (non-runaway) | 1.066455 | [speed-source/SUMMARY.md](../../exp-runaway-leader-results/speed-source/SUMMARY.md) |
| spreadFactor, P2–P15 median (non-runaway) | 1.034590 | same |
| trajectoryMult, P2–P15 median (non-runaway) | 0.950200 | same |
| spreadFactor band | [0.9187, 1.0813] | [defaults.js:28-31](../../client/src/modules/storage/defaults.js#L28-L31) |
| servo clamps | 1.10 / 0.85 | [racePlanner.js:78-81](../../client/src/modules/racePlanner.js#L78-L81) |
| authority window | 9.5 s | [choreoResolveB2 0.8, choreoReleaseProgress 0.97] |

Speed decomposes as `spreadFactor × trajectoryMult` (every other factor measured at exactly 1.000 in
the non-runaway table), so the calibration is `vUnit = 3.11 / (1.034590 × 0.950200) = 3.1636 L/s`.

**Closing rate, attacker at 1.10 against yielder at 0.85:**

| draw regime | attacker s | yielder s | closing rate |
|---|---|---|---|
| equal draws (both 1.0) | 1.0000 | 1.0000 | **0.791 L/s** |
| **measured medians** | 1.0346 | 1.0665 | **0.733 L/s** |
| favorable | 1.0813 (max) | 0.9187 (min) | **1.292 L/s** |
| unfavorable | 0.9187 (min) | 1.0813 (max) | **0.289 L/s** |

The measured case is *worse* than equal draws because the racer currently leading is
disproportionately the one that drew fast — P1's median spread is 1.0665 against the field's 1.0346.
Braking it to 0.85 must first cancel a ~3% natural advantage.

**Seconds per counted lead change**, as a function of the distance the incoming leader must cover
(see §4 for why this is the trio span, not one adjacent gap). Cell = seconds / handovers in 9.5 s:

| distance | equal | **measured** | favorable | unfavorable |
|---|---|---|---|---|
| 1.0 L | 1.76 s / 5.4 | **1.87 s / 5.1** | 1.27 s / 7.5 | 3.96 s / 2.4 |
| 1.5 L | 2.40 s / 4.0 | **2.55 s / 3.7** | 1.66 s / 5.7 | 5.68 s / 1.7 |
| 2.0 L | 3.03 s / 3.1 | **3.23 s / 2.9** | 2.05 s / 4.6 | 7.41 s / 1.3 |
| 2.5 L | 3.66 s / 2.6 | **3.91 s / 2.4** | 2.43 s / 3.9 | 9.14 s / 1.0 |
| 3.0 L | 4.29 s / 2.2 | **4.60 s / 2.1** | 2.82 s / 3.4 | 10.87 s / 0.9 |

**Slot-holders cost nothing — confirmed from the formula.** A racer sitting at its target rank has
`rankError` 0, so `rawTarget = clamp(1.0 + 2.0×(0/40) + noise, 0.85, 1.10) = 1.0 + noise`
([racePlanner.js:780](../../client/src/modules/racePlanner.js#L780)). No clamp residency, no
saturation, no naturalness cost. Only the two principals in an exchange are ever at a clamp.

---

## 3. Revised ceiling: ~34.5%, and 60% is outside it

**[measured]** The front-trio span (rank 1 → rank 3, at the leader-crossing instant, n=400 per arm),
extracted from the sweep's raw records and committed as
[front-spans.csv](../../exp-runaway-leader-results/p1-contest-baseline/front-spans.csv):

| arm | p25 | median | p75 |
|---|---|---|---|
| V0 | 1.53 L | 3.26 L | 5.92 L |
| **R97-ON** | **1.45 L** | **2.48 L** | **4.00 L** |

Feeding **each race's own measured span** through the handover model (3 exchanges, independent
per-handover spread re-rolls, leader-selection bias applied to the yielder):

| arm | modelled p1ContestRate ceiling | per track |
|---|---|---|
| V0 | **29.7%** | luger-hill 32.6 / mountainstreet 33.4 / searound 23.3 / dirt-oval 29.6 |
| **R97-ON** | **34.5%** | luger-hill 36.3 / mountainstreet 34.1 / searound 27.2 / dirt-oval 40.6 |

The ~8.3% structurally-unreachable runaway class needs no separate subtraction — those races carry
very wide spans and the model scores them at ~0 on their own.

**60% is outside the reachable range without a speed-model change.** It is not marginally outside: it
needs the closing budget to roughly double. The break-even points, computed over the same measured
span distribution:

| lever | value needed for ~60% | current |
|---|---|---|
| tighten front trio | median span **1.49 L** (×0.60) | 2.48 L |
| raise `maxMult` | **1.25** | 1.10 |
| lower `minMult` | **0.70** | 0.85 |

Full sensitivity:

| trio span ×  | rate | | `maxMult` | rate | | `minMult` | rate |
|---|---|---|---|---|---|---|---|
| ×1.00 (2.48 L) | 34.4% | | 1.10 | 34.4% | | 0.85 | 34.4% |
| ×0.90 (2.23 L) | 39.2% | | 1.15 | 44.4% | | 0.80 | 44.9% |
| ×0.80 (1.98 L) | 44.8% | | 1.20 | 53.7% | | 0.75 | 54.6% |
| ×0.70 (1.74 L) | 51.6% | | 1.25 | 61.7% | | 0.70 | 62.7% |
| ×0.60 (1.49 L) | 59.6% | | 1.30 | 68.5% | | | |
| ×0.50 (1.24 L) | 69.2% | | | | | | |

The response is a **cliff, not a slope**. At a fixed span the probability of clearing 3 handovers
goes 93% (1.5 L) → 28% (2.0 L) → 2% (2.5 L). The measured median sits at 2.48 L — just past the edge.
That is why the ceiling is ~34%: roughly the tightest quarter of races clear, and almost nothing else does.

---

## 4. Pack wall and re-climb: the budget is per-**rotation**, not per-pass

**The pack wall is not binding.** A yielder at the brake floor loses ground to the field at only
`3.1636 × (1.0665 × 0.85) − 3.11 = **−0.242 L/s**` (the field itself runs at trajectoryMult 0.950,
not 1.0 — measured — so the brake buys less separation than the raw 0.85 suggests). The measured
rank 1 → rank 5 span under R97-ON is 4.24 L median, so a yielder holding the floor **continuously**
needs ~17 s to fall out of B1 — nearly double the entire 9.5 s window. In a real exchange it brakes
for only ~2.5–4 s and gives up ~0.6–1.0 L. It never reaches rank 6, so no transient dip below B1 is
required, and the endpoint-only band-reach permission
([heroCurveGenerator.js:9-11](../../client/src/modules/heroCurveGenerator.js#L9-L11)) is not needed
for this mechanism. Collision with rank 6+ is not the constraint.

**The re-climb debt is the constraint, and it converts the budget from per-pass to per-rotation.**
The classifier requires `distinctLeaders >= 3` as well as `leadChangeCount >= 3`, so a two-racer
A→B→A→B exchange is worthless: it yields 3 lead changes but only 2 distinct leaders and fails. Every
counted lead change must therefore be delivered by a *different* racer arriving at rank 1, which
means the incoming leader has to traverse the **whole front-trio span** (rank 3 → rank 1), not the
single adjacent gap between P1 and P2. That is why §2's distance column is the trio span (median
2.48 L) rather than the P1→P2 gap (median 1.24 L) — and it is the single change that moves the
answer, worth about a factor of two in time per handover. The braked yielder simultaneously drifts
to the back of the trio, which is exactly the re-climb debt it must repay when its own turn to attack
comes round; in a steady 3-way rotation that debt is already priced in, because each racer's
traverse *is* one counted handover. The consequence is that a rotation cannot be made cheaper by
adding participants: a 4-way rotation lengthens the span each attacker must cross, and the per-race
budget stays roughly flat at 9.5 s ÷ (trio span ÷ closing rate).

---

## Reproducing the calc

`front-spans.csv` is committed next to the baseline. The model:

```js
const V_FIELD=3.11, S_CH=1.034590, TRAJ=0.950200;      // measured (speed-source, non-runaway)
const S_MIN=0.9187, S_MAX=1.0813, UP=1.10, DOWN=0.85;  // defaults.js / racePlanner.js
const SLEW=0.5, WIN=9.5;                                // easeInOutCubic mean; authority window
const vUnit = V_FIELD/(S_CH*TRAJ);                      // 3.1636 L/s per unit (spread x traj)
// per race: span = span13 from front-spans.csv; 3 exchanges must fit in WIN
//   yielder draw = max(U,U) (leader-selection bias), attacker draw = U
//   t += span / (vUnit*(sA*UP - sY*DOWN)) + SLEW
```

Caveat on the span data: `front-spans.csv` records gaps at the **leader-crossing instant**, the
tightest moment of the race. Spans earlier in W are wider, so the ceilings in §3 are, if anything,
optimistic.
