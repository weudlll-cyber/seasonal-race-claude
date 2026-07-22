# CONCEPT REVIEW (CC) — C1 "B1 Lead Carousel"

Independent review of [C1-LEAD-CAROUSEL-CONCEPT.md](C1-LEAD-CAROUSEL-CONCEPT.md). Every
architecture claim below is verified at source with file:line (GRUNDREGEL #0); nothing is inferred
from memory or from prior reports. The Copilot review in this directory was not read. Review only —
no code was changed.

Quantities marked **[measured]** come from the committed p1-contest and release-sweep data in
`exp-runaway-leader-results/`; quantities marked **[derived]** are computed from source constants
and are shown with their arithmetic so they can be checked.

---

## Verdict

**Build modified — but first accept that the 60% target is not reachable with this mechanism.**

The mechanism is architecturally sound, correctly scoped, and its fairness claim holds by
construction. It will raise `leadChangeCount`. It will not raise it to 3+ in most races, because the
servo does not have the speed authority to complete three passes in the 9.5 seconds the metric
window actually leaves it. My estimate of the reachable ceiling is **~25–40% `p1ContestRate`, not
60%** — and reaching even that requires the servo to sit pinned at its clamps for most of the
window, which is the concept's own kill condition (§7) and the primary naturalness risk (§6 Q5).

The concept should be built, because 25–40% is a 5–8× improvement on the measured 5.3% and is worth
having. It should not be built against a 60% gate, because that gate will fail for reasons that have
nothing to do with the quality of the implementation.

---

## 0. The number that governs everything: the servo saturates at 2 ranks of error

This is the single most important fact for this concept and it is not in the concept document.

The controller is a proportional servo whose error is normalised by the **field size**
([racePlanner.js:780](../../client/src/modules/racePlanner.js#L780)):

```js
const rawTarget = clamp(1.0 + gain * (error / nActive) + noise, minMult, maxMult);
```

with `gain: 2.0, maxMult: 1.1, minMult: 0.85`
([racePlanner.js:78-81](../../client/src/modules/racePlanner.js#L78-L81)) and `nActive` ≈ 40
(`BAND_EDGES = [5, 15, 25, 40]`, [racePlanner.js:38](../../client/src/modules/racePlanner.js#L38)).

**[derived]** Solving for the clamps:

| rank error | trajectoryMult | state |
|---|---|---|
| +1 | 1.000 + 2.0×(1/40) = **1.050** | proportional |
| **+2** | 1.000 + 2.0×(2/40) = **1.100** | **boost ceiling reached** |
| −2 | 1.000 − 2.0×(2/40) = **0.900** | proportional |
| **−3** | 1.000 − 2.0×(3/40) = **0.850** | **brake floor reached** |

B1 is five ranks wide. **A carousel that swings a racer between rank 1 and rank 5 spends its entire
life in saturation.** Three consequences follow immediately, and they answer three of the eight open
questions:

1. Above ±2 ranks of error the servo is a **bang-bang controller, not a tracking controller**. The
   authored curve stops being a trajectory and becomes a sign bit.
2. The generator already knows this. `speedBudgetFrac: 0.1` is documented as calibrated to exactly
   this authority — *"the trajectoryMult servo gives ≈+10% over the field — so the generator never
   hands a hero a curve steeper than its servo can track"*
   ([heroCurveGenerator.js:42-45](../../client/src/modules/heroCurveGenerator.js#L42-L45)).
3. The carousel is asking the generator to author precisely the curve it was built to refuse.

---

## 1. Q1 — Handover count and cadence: **~2.2–2.7 in W, against a requirement of 3**

Two independent derivations, both landing in the same place.

### Route A — distance and closing speed

**[measured]** Field speed at the front, from a live 60 s luger-hill race: mean final-window speed
0.014607 t/s × `lenScale` 212.744 = **3.11 racer-lengths/second**.

**[measured]** W duration: `windowFrames` 703 at 60 fps, and `p1LongestMultiSec` up to 11.23 s in the
same race → **W ≈ 11.2 s** (0.2 progress ≈ 56 s per progress unit).

**[derived]** But the carousel's *authority* window is shorter than W. B1 heroes stop being steered
at `choreoReleaseProgress` — the target is set to the current rank, so rankError is 0 and the servo
returns to 1.0 ([racePlanner.js:673-681](../../client/src/modules/racePlanner.js#L673-L681)). At the
shipped 0.97 that leaves:

> authority window = [0.80, 0.97] = 0.17 progress ≈ **9.5 s**

**[measured]** Displacement required per handover, from the committed release-sweep per-seed data
(leader→P2 gap at progress 0.90, R97-ON arm, n=400):

| percentile | p25 | median | p75 | p90 |
|---|---|---|---|---|
| gap (lengths) | 0.64 | 1.24 | 1.99 | 3.23 |

A pass from P3 costs roughly *close the gap + clear it* ≈ 2.25 lengths at the median.

**[derived]** Closing speed available:

| opposition | ratio | differential | closing rate |
|---|---|---|---|
| boost only (+2 err vs neutral) | 1.10 / 1.00 | 10.0% | 0.31 l/s |
| carousel swap (+2 vs −2) | 1.10 / 0.90 | 22.2% | 0.69 l/s |
| full saturation (+2 vs −3) | 1.10 / 0.85 | 29.4% | 0.91 l/s |

**[derived]** Add the slew. Every target change eases over `trajectoryTransitionDuration: 1.0` s
([defaults.js:262](../../client/src/modules/storage/defaults.js#L262)), applied identically in
browser ([index.jsx:1051-1060](../../client/src/screens/RaceScreen/index.jsx#L1051-L1060)) and sim
([sim-fairness.mjs:1196-1204](../../scripts/sim-fairness.mjs#L1196-L1204)). Each handover is a
direction reversal, so it pays this once:

> median gap, full saturation: 2.25 / 0.91 = 2.5 s + 1.0 s slew = **3.5 s/handover → 9.5 / 3.5 = 2.7 handovers**
> median gap, carousel swap:   2.25 / 0.69 = 3.3 s + 1.0 s slew = **4.3 s/handover → 9.5 / 4.3 = 2.2 handovers**

### Route B — the generator's own feasibility ceiling

`racerFeasibility` ([heroCurveGenerator.js:116-132](../../client/src/modules/heroCurveGenerator.js#L116-L132))
derives `maxRankRate = (ahead + behind) / remaining`, counting racers within
`shift = speedBudgetFrac × remaining × finishT`. **[derived]** With `anchorProgress` = live
`pulkStart` = 0.25 ([racePlanner.js:63-64](../../client/src/modules/racePlanner.js#L63-L64)),
`remaining` = 0.75, and `finishT × lenScale` ≈ 186 lengths (3.11 l/s × 60 s):

> shift = 0.1 × 0.75 × 186 ≈ **14 lengths**

**[measured]** The front is dense — consecutive at-the-line gaps in the sampled race were
`[0.75, 0.75, 0.03, 0.04, 0.01, 0.13, 0.36, 0.25]`, i.e. nine racers inside 2.3 lengths — so
`ahead + behind` within 14 lengths is on the order of 25, giving `maxRankRate ≈ 25 / 0.75 ≈ 33`
ranks per progress unit.

**[derived]** Three 2-rank handovers spread over 0.17 progress demand
`2 / (0.17/3) ≈ 35` ranks/progress *on average*, and `checkFeasible`
([heroCurveGenerator.js:306-316](../../client/src/modules/heroCurveGenerator.js#L306-L316)) tests the
**sampled instantaneous** slope, which for a min-jerk segment peaks at ~1.7× the average
(`minJerkPeakFactor`, [heroCurveGenerator.js:70-72](../../client/src/modules/heroCurveGenerator.js#L70-L72)):

> peak demand ≈ 35 × 1.7 ≈ **60 vs a ceiling of ≈33 — rejected by ~1.8×**

A full-amplitude oscillation (±4 ranks, 3 cycles) demands ~141 ranks/progress average — **~4× over**.

**Both routes agree: three completed handovers inside W is at or just beyond the edge of the
mechanism's authority.** Two is comfortable, three is a coin-flip, four is out of reach.

### What this means for the 60% target

**[measured]** ~8.3% of races are runaways under the confirmed gap-reroll, and in the runaway class
the median `frontContestFraction` is 0.000 and `p1LongestMultiSec` is 0.00 — there is no front group
for a carousel to rotate. Those races are structurally unreachable.

Of the remaining ~92%, hitting 60% overall requires **65% of them to convert**. With the handover
budget sitting exactly on the 3-handover boundary, races will split roughly evenly between 2 and 3+,
so **~50% conversion of the tight-field class is the optimistic ceiling → ~40–45% overall**, before
any naturalness constraint claws back amplitude. My honest estimate after those constraints is
**25–40%**.

### The window mismatch — real, but not the free lever it looks like

OUTCOME begins at `choreoOutcomeStart`, default **0.60**
([defaults.js:329](../../client/src/modules/storage/defaults.js#L329),
[racePlanner.js:148-150](../../client/src/modules/racePlanner.js#L148-L150) where
`corridorStart := choreoPulkEnd`). So the servo actually has:

> [0.60, 0.97] = 0.37 progress ≈ **20.7 s — 2.2× the runway inside W**

At 3.5–4.3 s/handover that is 4.8–5.9 handovers: comfortably ≥3. **But spending it there does not
serve the goal.** Handovers at progress 0.65 followed by an 11-second procession is not a sustained
*endgame* battle, and W was chosen to measure the endgame. I flag the mismatch because it is the
largest single number in this analysis, but I do **not** recommend widening W to manufacture a pass.
The real levers are servo authority and front-group tightness — see §9.

---

## 2. Q2 — Curve shape: **the question is moot above ±2 ranks**

`sampleHeroCurve` handles arbitrary waypoint counts via min-jerk quintic Hermite
([heroChoreography.js:146-159](../../client/src/modules/heroChoreography.js#L146-L159)), and
`makeHeroCurve` accepts any validated waypoint list
([heroChoreography.js:109-112](../../client/src/modules/heroChoreography.js#L109-L112)). So both
shapes are *supported* — `soloWaypoints` is merely a 2–3-point convenience builder
([heroCurveGenerator.js:236-254](../../client/src/modules/heroCurveGenerator.js#L236-L254)), not a
structural limit.

But per §0, at any amplitude ≥2 ranks the servo output is clamped, so **continuous oscillation and
discrete baton segments produce the same physical behaviour**: full boost, full brake, switch. The
min-jerk shaping is cosmetic — it shapes a target the actuator cannot follow.

**Recommendation:** discrete baton segments, at amplitude **≤2 ranks**. Two reasons: it is the only
regime where the servo is proportional and the authored shape actually reaches the track; and a
2-rank swing (rank 1 ↔ rank 3) is exactly one handover, which makes the curve legible and the
telemetry interpretable. Choose `carouselCadenceMode: segment` and drop `continuous` unless a
measurement later justifies it.

---

## 3. Q3 — Participation: **3–4, and the classifier forces ≥3 distinct**

A constraint the concept does not state: the classifier requires `distinctLeaders >= 3` **and**
`leadChangeCount >= 3`. A two-racer carousel ping-ponging A→B→A→B produces 3 lead changes but only
**2 distinct leaders** and fails. **The phase offsets must rotate through at least three distinct
racers.** This should be written into the concept as a hard invariant, not left to the offset policy.

Cast size is the constraint: `nHeroes = round(minHeroes + (maxHeroes − minHeroes) × intensity)`
([heroCurveGenerator.js:148-156](../../client/src/modules/heroCurveGenerator.js#L148-L156)) with
`minHeroes: 2, maxHeroes: 4` and shipped `choreoIntensity` 0.6 → `round(2 + 2×0.6)` = **3**. And not
every cast hero is B1. So at defaults the carousel has *exactly* the minimum participants, with no
margin for a feasibility rejection.

**Recommendation:** `carouselParticipants: feasibleTopK` with `carouselMinParticipants: 3`, and if
fewer than 3 are feasible, **do not cast the carousel at all** — fall through to shipped behaviour
rather than emit a degenerate 2-racer version that cannot pass the classifier but still pays the
naturalness cost. The concept should also raise the effective B1 cast independently of
`choreoIntensity`, or the mechanism is hostage to an unrelated slider.

**On the assigned winner:** verified — `targetRank` 1 is *"used for reporting, not for steering"*
([racePlanner.js:190](../../client/src/modules/racePlanner.js#L190)), and the generator deliberately
assigns the winner to cluster rank **2**, never 1
([heroCurveGenerator.js:412-424](../../client/src/modules/heroCurveGenerator.js#L412-L424)). The
carousel therefore needs **no relation whatsoever** to the assignment, and must not acquire one:
steering the assigned winner to rank 1 would convert the emergent finish into an authored one and
destroy the property the release exists to protect. The winner stays emergent from the run-out.

---

## 4. Q4 — Gap-reroll interaction: **no carve-out needed; they barely meet**

The two levers are **independent multiplicative factors**, not competitors for one output. The
gap-reroll biases `spreadFactor` at re-roll instants
([racePlanner.js:925-983](../../client/src/modules/racePlanner.js#L925-L983)); the servo sets
`trajectoryMult` continuously; the step multiplies both
([racePlanner.js:359](../../client/src/modules/racePlanner.js#L359)). Neither "wins" — they compose.

The decisive detail: the down-tilt fires only when `gapBehind > G` = 1.5 lengths
([racePlanner.js:961-975](../../client/src/modules/racePlanner.js#L961-L975)). **The carousel's
target state is a tight front group with sub-1.5-length gaps — which is the gap-reroll's dead
zone.** In the intended regime the two never interact.

**[derived]** When they do (carousel leader overshoots to a 2.0-length gap, strength 1.0):
`frac = min(1, 1.0 × (2.0 − 1.5)) = 0.5` → `spreadFactor` moves halfway to `spreadMin` 0.9187, i.e.
**−4.1%** against the carousel's +10%. The servo dominates, and the tilt acts as a mild
anti-overshoot damper — arguably helpful.

**Recommendation:** no carve-out. Joint sweeps remain mandatory (I agree with the concept), but for
confirmation, not because a conflict is expected.

---

## 5. Q5 — Naturalness at high duty: **the central risk, and it is quantifiable now**

**[derived]** `spreadFactor` ∈ [0.9187, 1.0813] (±8.13%, from
`DEFAULT_BASE_SPEED_CONFIG {min: 0.00096, max: 0.00113}`,
[defaults.js:28-31](../../client/src/modules/storage/defaults.js#L28-L31)). The existing naturalness
telemetry flags a racer whose `spreadFactor × tool mults` exceeds **1.08** — "faster than the fastest
natural racer". A carousel racer at the boost ceiling reaches `1.0813 × 1.10 = 1.19` — **~10 points
past the flag**, and by §0 it sits there for most of the window.

So the carousel does not merely risk tripping the naturalness metric; at ≥2-rank amplitude it trips
it **by construction, on every participant, for most of W**. At the ~60% duty the owner wants, that
is a large fraction of all races.

**Recommendation — make saturation share a first-class reported metric, not a kill condition
discovered late.** Add to the sweep: *share of carousel-racer OUTCOME frames with
`trajectoryMult` at either clamp*. My kill line: **>50% saturated frames is a fail regardless of
`p1ContestRate`** — that is a servo running out of authority, and the concept's §7 rule already says
what that means. Seeded jitter on handover timing (`carouselJitterPct`) helps the *pattern* read less
mechanical but does nothing about saturation; it is not a mitigation for this risk.

---

## 6. Q6 — Window alignment: **correct as specified, but W is keyed to the wrong config**

The concept's requirement (derive all timing from `choreoOutcomeStart` / `choreoResolveB2` /
`choreoReleaseProgress`, no literals) is right and is already how the codebase works — the observer
reads live `choreoResolveB2` and the generator receives live `pulkStart`, `releaseProgress` and
`bandResolve` from the plan
([racePlanner.js:607-620](../../client/src/modules/racePlanner.js#L607-L620)).

**But I want to flag a smell I introduced and should own.** W starts at `choreoResolveB2`, which is
*B2's resolve checkpoint* ([racePlanner.js:283-289](../../client/src/modules/racePlanner.js#L283-L289)).
It happens to equal 0.8, which is a sensible front-act boundary — but its *meaning* is "when B2 must
be in band", and it is tuned for B2 reasons. If the owner ever moves `choreoResolveB2` to fix a B2
problem, the front-battle measurement window silently moves with it, and every baseline in
`p1-contest-baseline/` becomes incomparable.

**Recommendation:** give the front act its own config key (`contestWindowStart`, defaulting to the
current `choreoResolveB2` value so today's baseline is preserved), and key **both** the observer and
the carousel to it. This is a small change and it removes a coupling that will otherwise bite
silently.

---

## 7. Q7 — Runaway guard: **adequate, but it needs its own metric**

Can a carousel leader escape? Yes in principle: it is authored to rank 1 and boosted to +10% while
its rivals are braked. Three things stand against it:

1. Its own curve steers it **back down** on the next segment — the escape is self-limiting by design.
2. The gap-reroll down-tilt engages at 1.5 lengths, **half** the observer's 3.0-length runaway
   threshold — it is already positioned as the guard, and (§4) that is exactly the overshoot regime
   where it fires.
3. Waypoints are clamped to `[1, BAND_EDGES[0]]`, so no carousel racer is ever authored *out* of the
   front.

The residual risk is the **last** segment: a racer authored to rank 1 near `choreoReleaseProgress`
is released while leading and clear, and then simply runs out the remaining ~1.7 s unchallenged.
That is a runaway created by the release timing, not by the curve.

**Recommendation:** require the carousel's final authored handover to complete at least one
handover-duration (~4 s ≈ 0.07 progress) **before** `choreoReleaseProgress`, so the field is level
at release. And report `runawayWinnerRate` split by *whether the runaway leader was a carousel
participant* — without that split, an 8.3% → 10% regression is uninterpretable.

---

## 8. Q8 — C2 amplifier: **strictly defer; the hook already exists**

No pre-wiring is needed, because the machinery is already shipped. The B2-attacker feature climbs a
B2 finisher to `b2AttackPeakRank` and then steers it back down
([heroCurveGenerator.js:461-502](../../client/src/modules/heroCurveGenerator.js#L461-L502)), cast as
*additional* heroes beyond the `nHeroes` budget, default OFF via `b2AttackHeroes: 0`
([heroCurveGenerator.js:83-87](../../client/src/modules/heroCurveGenerator.js#L83-L87)). "B2 raiders
peaking at rank 1–2" is that feature with `b2AttackPeakRank` set to 1 or 2.

**Recommendation:** defer entirely. Pre-defining a hook for a mechanism that already has one adds
parameters with no measurement behind them, and C1's own amplitude budget (§1) is already the
binding constraint — adding raiders spends the same scarce servo authority.

---

## 9. What the concept misses

1. **The saturation ceiling (§0).** The concept treats servo authority as a parameter to tune. It is
   a wall at ±2 ranks, and every amplitude question is downstream of it. This belongs in §2 of the
   concept, not in a review.
2. **`distinctLeaders >= 3` forces ≥3-way rotation (§3).** A 2-racer carousel is a valid reading of
   the current mechanism text and cannot pass the classifier.
3. **The release boundary truncates W by 15% (§1).** The concept says the release "remains
   unchanged", which is right, but does not note that this makes the *authority* window 9.5 s while
   the *measurement* window is 11.2 s.
4. **`checkFeasible` will reject carousel curves (§1 Route B).** This is a concrete implementation
   blocker: either the carousel curves bypass `checkFeasible` (and then the servo silently fails to
   track them, degrading to bang-bang with the actual passes decided by `spreadFactor` luck — a
   lottery again, which is the thing we are trying to remove), or `maxRankRate` must be recomputed
   for carousel segments. The concept's §5 integration list should name this explicitly.
5. **No naturalness metric is specified (§5),** though naturalness is named as the central risk.
   "Servo saturation share" is the missing number.
6. **The 60% target has never been tested for reachability.** It was set from the eye, which is
   legitimate, but §1 says the mechanism tops out well below it. Better to discover that here than
   after a 50-minute sweep.

---

## 10. Recommendation

**Build modified.** Concretely:

| # | change | why |
|---|---|---|
| 1 | Amplitude cap **≤2 ranks**; `carouselCadenceMode: segment` only | §0/§2 — the only regime where the servo tracks rather than clamps |
| 2 | **≥3 distinct participants** as a hard invariant; don't cast below 3 | §3 — `distinctLeaders >= 3` is otherwise unpassable |
| 3 | Decouple B1 cast size from `choreoIntensity` | §3 — 3 heroes at defaults leaves zero margin |
| 4 | Final handover completes ≥0.07 progress before the release | §7 — level the field before the run-out |
| 5 | Add `contestWindowStart` config; key observer **and** carousel to it | §6 — stop the front metric riding on B2's checkpoint |
| 6 | Report **servo-saturation share**; kill at >50% | §5 — the real naturalness failure mode |
| 7 | Resolve the `checkFeasible` question before implementation | §9.4 — otherwise the curve is a fiction |
| 8 | **Re-baseline the target to 25–40%**, or treat 60% as a stretch goal | §1 — 60% is not reachable at current servo authority |

**On the kill-the-line rule:** the concept says that if feasible amplitudes cannot exceed ~2 distinct
leaders without saturation, the speed model is the limit and it becomes an owner decision about the
model. My analysis says we are **already at that line before writing any code** — 2.2–2.7 handovers,
achieved only under sustained clamp saturation. I do not think that means "reject": 2–3 handovers is
still a large gain over the measured 0–1. But the owner should decide *now*, not after the sweep,
whether the answer to "3 handovers in 9.5 seconds" is a bigger servo (raise `maxMult`/`gain`, with
fairness re-validation across every band) or a tighter front (which the gap-reroll already improved:
p75 gap 1.99 vs V0's 2.89 **[measured]**).

That is a model question, and it is the owner's.
