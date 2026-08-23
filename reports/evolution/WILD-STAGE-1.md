# WILD-STAGE-1 — the candidates for the top stage, turned UP rather than off

**Branch:** `diag/wild-stage-1` off master `498fe4e6`. **Measurement only.** No default moved, no key
wired to anything, no dial designed, no mapping proposed.

BRAKE-CURVE-1 established that `pulkLeaderBrake` is exhausted at 0.15: past it the leading-group
fights fall while only changes of first place keep rising. So the top stage needs a **second lever
beside the brake**. Every candidate had so far been measured only **switched off**. This block
measures them **turned up**.

---

## 1. The answer

**THE TWO-LEVER IDEA WORKS — AND THE ONE THAT WORKS IS THE ONE THE OWNER NAMED.**

- **`pulkLeaderBrake=0.15` + `pulkChallengerBoost=0.12` delivers MORE leading-group action than the
  brake alone, significantly, on both tracks.** Held top-5 overtakes **+40.5%** on dirt-oval and
  **+23.8%** on river-run, against the brake's own **+22.5% / +17.6%**. Measured against brake-alone
  rather than baseline: **+4.90 ±2.50** and **+2.27 ±2.21** overtakes per race — **both outside their
  intervals.**
- **The two levers ADD UP. They do not interfere.** The interaction contrast
  (`combined − brake − boost + baseline`) is **inside its interval in all four arm×track×cut cells**,
  and in the other combination too — **8 of 8 additive**. The point estimates lean very slightly
  sub-additive (−0.17 to −2.37) but not one is separable from zero.
- **`chaosSteerGain` turned up is INERT, and its inertness was predicted from source before it was
  measured.** Alone it moves nothing on either cut on either track (−4.2% to −0.6%, every cell inside
  its interval). Beside the brake it is **indistinguishable from the brake alone on dirt-oval
  (+0.57 ±2.63)** and **significantly WORSE on river-run (−3.17 ±2.28)**. **The fallback for this slot
  fails.**
- **AND THE COMBINATION BREACHES THE NATURALNESS ENVELOPE WHERE NEITHER PART DOES — exactly the
  hazard the brief named.** Mean of per-race minimum realised speed factor **0.7928 ±0.0071** (dirt)
  and **0.7908 ±0.0055** (river) against a floor of **0.80** — **the whole interval below the line on
  both tracks**, and significantly deeper than the brake alone. Neither `brake=0.15` nor `boost=0.12`
  breaches on that statistic by itself.
- **No arm loses several points of band arrival.** **All ten arm×track cells are UNDECIDED** at N=30;
  the largest movement is **+2.00pp**. **This is NOT "fairness never binds on these keys" — and the
  distinction matters.** ACTION-FAIRNESS-1 resolved real movement on two of these very levers at
  N=300, switching them OFF: `chaosSteerGain=0` **−1.33pp (WEAKENS)** and `pulkChallengerBoost=0`
  **+1.58pp (improves)** on dirt-oval. **Effects of that size are invisible at this N by
  construction.** What this run establishes is that turning them UP costs nothing LARGE — which is
  what a screen is for — not that it costs nothing.

**THE FINDING THAT WAS NOT ASKED FOR, AND MAY MATTER MOST.** **`pulkChallengerBoost=0.12` ALONE buys
the SAME leading-group action as `pulkLeaderBrake=0.15` alone — and costs nothing on the slow side.**
Held top-5 overtakes are **indistinguishable between the two on both tracks** (+0.03 ±3.10 dirt,
−1.77 ±2.44 river). But the brake puts **15/30 and 16/30 races below the 0.80 floor**, while the boost
puts **0/30 and 0/30** there. **Two levers, the same leading-group action, and only one of them spends
the naturalness budget.**

---

## 2. The "up" values, chosen from source

The brake's own step is **shipped → its documented ceiling**: `pulkLeaderBrake` 0.10 → 0.15, where
0.15 is the ceiling in all three places the key is declared (`defaults.js:958` comment `(≤ 0.15)`,
`sim-fairness.mjs:41` `<0..0.15>`, DevScreen slider `max: 0.15`). **The same rule was applied to each
candidate**, and where a key had no declared ceiling the governing clamp was read instead.

| key | shipped | chosen "up" | step | why that value |
| --- | --- | --- | --- | --- |
| `pulkLeaderBrake` | 0.10 | **0.15** | +0.05, ×1.5 | The brief's value; also the documented ceiling in all three declarations. |
| `pulkChallengerBoost` | 0.06 | **0.12** | +0.06, ×2.0 | **The documented ceiling** (`<0..0.12>`, DevScreen `max: 0.12`) **and an ENFORCED one** — see below. |
| `chaosSteerGain` | 0.06 | **0.12** | +0.06, ×2.0 | **No declared ceiling exists** — it is a PINNED key. Matched to the boost arm's relative step so arms 3 and 4 are comparable; the source analysis below shows this already exhausts the key's graded range. |

**`pulkChallengerBoost`'s ceiling is not merely documented — the envelope enforces it.**
`raceGovernor.js:375` computes `target = clamp(1 + w * director, loBound, 1 + maxEffect)`, where
`director = challengerBoost` for a boosting racer and `maxEffect` is `pulkEnvelopeMaxEffect` = **0.12**.
So a boost above 0.12 is eaten by the clamp and **0.12 is the largest value with any effect at all**.
The documented range and the realism envelope are the same number. `directorReachable` says it a
second time at `raceGovernor.js:125` — `effBoost = Math.min(challengerBoost, maxEffect)`.

**AND THAT IS THE EXACT MIRROR OF BRAKE-CURVE-1'S FINDING, READ THE OTHER WAY.** That block showed the
±12% envelope **never binds the brake by construction**, because `brakeLoBound = 1 − max(maxEffect,
leaderBrake)` **expands** with the brake. The boost's ceiling is a flat `1 + maxEffect` and **does not
expand**. **The same envelope binds one lever absolutely and the other not at all.** Nothing was
measured to establish this; it is read off the two expressions.

**`chaosSteerGain` has no ceiling to read, so the clamp was read instead** — and it predicted the
arm's result. `racePlanner.js:779` computes
`csTarget = clamp(1.0 + gain * clamp(csErr, −5, 5), minMult, maxMult)` with `minMult = 0.85`,
`maxMult = 1.1`. **The magnitude of the pull is bounded by the clamp, not by the gain.** The high side
— the side that does the fair-arrival work, pulling a lagging racer up to its band — saturates when
`gain × csErr ≥ 0.10`:

- at **shipped 0.06**, every racer **≥ 2 ranks** out of band already receives the maximum pull;
- at **0.12**, every racer **≥ 1 rank** out does;
- **above 0.10 the high side is a pure step function** and further increases buy nothing.

So raising the gain **cannot raise the maximum steer** — it can only widen the set of racers already
getting it, and only for the single rank-band `csErr = 1`. **This is why arm 4 was expected to be
near-inert, and it is.** Unlike `pulkEnvelopeMaxEffect` — which ACTION-KEYS-1 found had *no headroom
at all* and which would have been dropped — this key does have headroom in behaviour, so the arm was
run rather than dropped. **The measurement confirms the source reading rather than discovering it.**

**No arm was dropped.** All six ran.

---

## 3. What the N could not support

- **Every band-arrival cell is UNDECIDED, and that is a result, not a null.** N=30 gives ±2.2 to
  ±3.0pp on the difference, so a 1–2pp cost is invisible here. **What this run establishes is that no
  arm loses SEVERAL points** — which is what the owner's screen-first instruction asks a first pass to
  decide. **And a 1–2pp cost on these keys is not hypothetical: ACTION-FAIRNESS-1 measured exactly
  that at N=300** (`chaosSteerGain=0` −1.33pp, `pulkChallengerBoost=0` +1.58pp, both dirt-oval).
  **So "UNDECIDED" here should be read as "smaller than this instrument can see", not as "zero".**
- **One cell sits close enough to its interval edge to be worth naming.** `brake15+steer12` on
  dirt-oval (+2.00 ±2.65pp) would be worth re-reading at N=300 **if that arm mattered — and it does
  not, because it fails on action.**
- **The start-row watchdog cannot speak on dirt-oval at all.** The shipped baseline itself trips
  (`unfair=true`, minPHolm 0.02) — the pre-existing Layer-1 gradient FAIRNESS.md documented and
  shelved. **Every arm cell on that track is therefore uninformative**, including the four that read
  `false`. Treat them as underpowered noise, not as a brake that fixes a standing gradient. On
  river-run the baseline is clean and every arm stays clean.
- **Two tracks, one seed batch, N=30.** Nothing here establishes any of this on the other eight
  tracks. The two were chosen as contrasting topologies (closed oval / open river), not as a sample.
- **The naturalness breach is established on the mean of per-race minima with an interval; it is NOT
  established as a per-frame guarantee.** See §4c for what the per-race distribution shows and §4c's
  qualification of BRAKE-CURVE-1.

---

## 4. The measurements

**N=30 throughout, seed 1, `--dur=60`, 40 racers, tracks at their own `defaultRacerTypeId`
(dirt-oval → horse, river-run → duck). Every arm compared ONLY against the baseline measured at the
SAME N.**

### a) Band arrival — READ from `computeZoneSuccessRate` via `--hero-map`, never re-derived

| arm | track | **N** | band arrival | shipped, same N | Δ | 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `brake 0.15` | dirt-oval | **30** | 88.50% | 88.17% | +0.33pp | ±2.45pp | **UNDECIDED** |
| `boost 0.12` | dirt-oval | **30** | 88.92% | 88.17% | +0.75pp | ±2.37pp | **UNDECIDED** |
| `steer 0.12` | dirt-oval | **30** | 88.92% | 88.17% | +0.75pp | ±2.36pp | **UNDECIDED** |
| `brake 0.15 + boost 0.12` | dirt-oval | **30** | 88.25% | 88.17% | +0.08pp | ±2.22pp | **UNDECIDED** |
| `brake 0.15 + steer 0.12` | dirt-oval | **30** | 90.17% | 88.17% | +2.00pp | ±2.65pp | **UNDECIDED** |
| `brake 0.15` | river-run | **30** | 88.67% | 89.42% | −0.75pp | ±2.93pp | **UNDECIDED** |
| `boost 0.12` | river-run | **30** | 89.83% | 89.42% | +0.42pp | ±2.87pp | **UNDECIDED** |
| `steer 0.12` | river-run | **30** | 89.58% | 89.42% | +0.17pp | ±2.93pp | **UNDECIDED** |
| `brake 0.15 + boost 0.12` | river-run | **30** | 88.67% | 89.42% | −0.75pp | ±2.94pp | **UNDECIDED** |
| `brake 0.15 + steer 0.12` | river-run | **30** | 88.83% | 89.42% | −0.58pp | ±3.04pp | **UNDECIDED** |

### b) Action — BOTH cuts. The owner has not fixed which defines his leading group.

**The stage question is decided by the leading-group column**, because BRAKE-CURVE-1 showed the two
measures diverging in sign. Both are shown; neither is chosen for him.

| arm | track | n=1 · leader changes | **top 5 · pair swaps** | whole field · swaps/frame |
| --- | --- | --- | --- | --- |
| `brake 0.15` | dirt-oval | +32.6% | **+22.5%** | +4.4% (ns) |
| `boost 0.12` | dirt-oval | +27.5% | **+22.6%** | +6.8% (ns) |
| `steer 0.12` | dirt-oval | −1.7% (ns) | **−4.2% (ns)** | −1.7% (ns) |
| `brake 0.15 + boost 0.12` | dirt-oval | **+49.2%** | **+40.5%** | +12.8% |
| `brake 0.15 + steer 0.12` | dirt-oval | +35.6% | **+24.5%** | +3.5% (ns) |
| `brake 0.15` | river-run | +36.6% | **+17.6%** | +9.6% |
| `boost 0.12` | river-run | +18.6% | **+12.7%** | +10.0% |
| `steer 0.12` | river-run | −0.6% (ns) | **−1.9% (ns)** | −0.8% (ns) |
| `brake 0.15 + boost 0.12` | river-run | **+53.8%** | **+23.8%** | +25.2% |
| `brake 0.15 + steer 0.12` | river-run | +30.3% | **+8.9%** | +12.5% |

`(ns)` = inside its interval. Everything unmarked is outside it.

**Absolute counts, so the percentages can be checked:**

| arm | dirt leadΔ / top5ovt | river leadΔ / top5ovt |
| --- | --- | --- |
| `BASELINE (shipped)` | 7.867 / 27.167 | 11.100 / 36.433 |
| `brake 0.15` | 10.433 / 33.267 | 15.167 / 42.833 |
| `boost 0.12` | 10.033 / 33.300 | 13.167 / 41.067 |
| `steer 0.12` | 7.733 / 26.033 | 11.033 / 35.733 |
| `brake 0.15 + boost 0.12` | 11.733 / 38.167 | 17.067 / 45.100 |
| `brake 0.15 + steer 0.12` | 10.667 / 33.833 | 14.467 / 39.667 |

### c) Naturalness — the ±20% envelope, BOTH sides

The slow side is measured with `--brake-depth` (BRAKE-CURVE-1's observer, carried onto this branch);
the fast side with the pre-existing `maxSpeedFactor`. `meanMin` is the mean over races of each race's
**minimum** realised speed factor — **the statistic BRAKE-CURVE-1 reported**, carried forward so the
two blocks compare.

| arm | track | brake floor | meanMin ±95% | vs the 0.80 floor | races < 0.80 | frames at floor | meanMax (ceiling 1.20) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `BASELINE` | dirt-oval | 0.88 | 0.8602 ±0.0115 | inside | **0/30** | 0.0% | 1.1458 |
| `brake 0.15` | dirt-oval | 0.85 | 0.8061 ±0.0099 | **STRADDLES** | **15/30** | 9.6% | 1.1462 |
| `boost 0.12` | dirt-oval | 0.88 | 0.8466 ±0.0102 | inside | **0/30** | 0.0% | **1.1816** |
| `steer 0.12` | dirt-oval | 0.88 | 0.8572 ±0.0104 | inside | **0/30** | 0.0% | 1.1459 |
| `brake+boost` | dirt-oval | 0.85 | **0.7928 ±0.0071** | **BREACH** | **22/30** | 10.7% | **1.1817** |
| `brake+steer` | dirt-oval | 0.85 | 0.8030 ±0.0097 | **STRADDLES** | 18/30 | 9.4% | 1.1462 |
| `BASELINE` | river-run | 0.88 | 0.8685 ±0.0119 | inside | **0/30** | 0.0% | 1.1462 |
| `brake 0.15` | river-run | 0.85 | 0.8014 ±0.0080 | **STRADDLES** | **16/30** | 11.2% | 1.1462 |
| `boost 0.12` | river-run | 0.88 | 0.8416 ±0.0079 | inside | **0/30** | 0.0% | **1.1817** |
| `steer 0.12` | river-run | 0.88 | 0.8612 ±0.0112 | inside | **0/30** | 0.0% | 1.1462 |
| `brake+boost` | river-run | 0.85 | **0.7908 ±0.0055** | **BREACH** | **22/30** | 12.6% | **1.1818** |
| `brake+steer` | river-run | 0.85 | 0.8033 ±0.0090 | **STRADDLES** | 16/30 | 11.0% | 1.1462 |

**BREACH** = the whole interval sits below 0.80. **STRADDLES** = the interval contains 0.80.

**THE COMBINED ARM BREACHES WHERE NEITHER PART DOES — the brief's hypothesis, confirmed.**
`brake+boost` is significantly deeper than the brake alone on both tracks (−0.0133 ±0.0121 dirt,
−0.0106 ±0.0097 river) and pushes races below the floor from 15–16 to **22 of 30**.

**A QUALIFICATION OF BRAKE-CURVE-1, on a number this block reproduces exactly.** That report placed
`brake=0.15` **"inside"** the envelope at 0.806 / 0.801. **The arithmetic is right and reproduces to
four decimals here — but that mean STRADDLES the floor, and half the individual races are already
below it (15/30 and 16/30).** "Inside" describes the mean, not the race. **Nothing in BRAKE-CURVE-1 is
withdrawn; its headline that 0.15 is the last value inside the envelope should be read as *the last
value whose mean is inside*.** The shipped game remains clean by either reading: **0 of 30 races dip
below 0.80 at the shipped 0.1, on both tracks.**

**The fast side is hard-clamped and it holds.** `boost=0.12` drives the peak speed factor to
**1.1817**, against a `NATURALNESS_CEILING` of 1.20 that `computeDirectorCeiling` enforces
absolutely — about **0.018 of headroom left**, and no arm crosses it. **This is direct evidence for
BRAKE-CURVE-1's P2**: the envelope is enforced on the fast side and merely described on the slow one.
**The two boost arms load the ceiling and stop; the two deepest brake arms walk through the floor and
nothing objects.**

### d) The start-row watchdog

| arm | dirt-oval | river-run |
| --- | --- | --- |
| `BASELINE (shipped)` | **unfair=true (0.02) — the baseline itself trips** | unfair=false (1.00) |
| `brake 0.15` | unfair=false (0.10) — no information | unfair=false (1.00) |
| `boost 0.12` | unfair=false (0.12) — no information | unfair=false (0.44) |
| `steer 0.12` | unfair=true (0.04) — no information | unfair=false (1.00) |
| `brake 0.15 + boost 0.12` | unfair=false (0.06) — no information | unfair=false (0.94) |
| `brake 0.15 + steer 0.12` | unfair=true (0.04) — no information | unfair=false (1.00) |

**On dirt-oval the watchdog can say nothing about any arm**, because the shipped world already trips
there. **On river-run it can, and every arm is clean.**

---

## 5. Add up, or interfere?

**They ADD UP. 8 of 8 interaction contrasts are inside their intervals.**

Interaction = `Δcombined − ΔpartA − ΔpartB`, measured against the same baseline; its interval is built
from all four arms' per-race variances.

| combination | track | cut | Δ combined | Δ brake | Δ other | sum of parts | **interaction** | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| brake+boost | dirt-oval | top 5 | 11.00 | 6.10 | 6.13 | 12.23 | **−1.23 ±4.52** | **ADDITIVE** |
| brake+boost | dirt-oval | leader | 3.87 | 2.57 | 2.17 | 4.73 | **−0.87 ±1.92** | **ADDITIVE** |
| brake+boost | river-run | top 5 | 8.67 | 6.40 | 4.63 | 11.03 | **−2.37 ±3.76** | **ADDITIVE** |
| brake+boost | river-run | leader | 5.97 | 4.07 | 2.07 | 6.13 | **−0.17 ±1.48** | **ADDITIVE** |
| brake+steer | dirt-oval | top 5 | 6.67 | 6.10 | −1.13 | 4.97 | **+1.70 ±4.65** | **ADDITIVE** |
| brake+steer | dirt-oval | leader | 2.80 | 2.57 | −0.13 | 2.43 | **+0.37 ±1.83** | **ADDITIVE** |
| brake+steer | river-run | top 5 | 3.23 | 6.40 | −0.70 | 5.70 | **−2.47 ±3.85** | **ADDITIVE** |
| brake+steer | river-run | leader | 3.37 | 4.07 | −0.07 | 4.00 | **−0.63 ±1.61** | **ADDITIVE** |

**And the question the combined arms exist to answer — do they beat the brake alone?**

| combination | track | leading-group action vs `brake 0.15` alone | verdict |
| --- | --- | --- | --- |
| `brake 0.15 + boost 0.12` | dirt-oval | **+4.90 ±2.50** overtakes/race | **YES — outside its interval** |
| `brake 0.15 + boost 0.12` | river-run | **+2.27 ±2.21** overtakes/race | **YES — outside its interval** |
| `brake 0.15 + steer 0.12` | dirt-oval | +0.57 ±2.63 | **NO — inside its interval** |
| `brake 0.15 + steer 0.12` | river-run | **−3.17 ±2.28** | **NO — significantly WORSE** |

**Stated plainly: the two-lever route succeeds with `pulkChallengerBoost` and fails with
`chaosSteerGain`.** The owner's candidate is the one that works; the fallback for the slot does not
exist on this route. **And the success is bought at the naturalness floor, not for free** — §4c.

**The very slight sub-additivity of brake+boost is not a finding.** All four cells contain zero. If it
is real it is small, and the mechanism would be obvious — brake and boost both close the same gap at
the front, so some of what each buys, the other has already bought.

---

## 6. Source hygiene

**Band arrival is READ, never re-derived** — `--hero-map`'s `fairness.bandReach`, which resolves
through `computeZoneSuccessRate` (`scripts/sim/observers/fairness-stats.mjs`), the function
`FAIRNESS.md` names as the operational gate. **Only the INTERVALS are computed here**, from per-race
rates produced **by importing that same function** and feeding it one race at a time — not by a second
implementation of the zone rule. The per-race mean reproduces the read value to two decimals on both
baselines (88.17% / 89.42%), which is the check that the interval and the headline describe the same
quantity.

**The action cuts are FRONT-ACTION-TRUTH-1's**, unchanged: `leadChangesPulk` (n=1),
`heldTop5Overtakes` (top-5 pair swaps, hold-guarded), `rankChurn/frames` (whole field), all three from
the `--action-metrics` window `[pulkStart, pulkEnd)`, so there is no window mismatch between them.

**THE PROTOCOL MATCH WITH BRAKE-CURVE-1 IS PROVED, NOT ASSERTED.** The brief allowed arm 2 to be
re-used if its protocol matched. Rather than assert a match, both the **baseline and the `brake=0.15`
arm were re-run and compared to BRAKE-CURVE-1's own stored per-race dumps race by race**:

```
BASELINE dirt-oval:    30 races x 6 fields — IDENTICAL
BASELINE river-run:    30 races x 6 fields — IDENTICAL
brake 0.15 dirt-oval:  30 races x 6 fields — IDENTICAL
brake 0.15 river-run:  30 races x 6 fields — IDENTICAL
```

**120 races, six fields each, not one differing value.** So arm 2's numbers here *are* BRAKE-CURVE-1's
numbers — it is a genuine re-use — and the per-race data needed for the interaction intervals exists
alongside them. The reconstructed invocation is
`--races=30 --dur=60 --seed=1 --track=<t> --racer=<default> --action-metrics --hero-map --brake-depth`.

**The observer was carried, not rebuilt.** `--brake-depth` was cherry-picked from
`diag/brake-curve-1` (`7e8b8dda`), where it was written and left unmerged, **used to take these
measurements, and then dropped again** — so the branch that carries this report has **no source
change against master at all**, and `diag/brake-curve-1` remains the observer's only home. **No new
instrument was added by this block.**

**Proved inert:** with no flag given the world fingerprint is **`dc4647be0f55ebdb`**, unmoved against
`docs/fingerprints.json`. **Run while the cherry-picked observer was present in the tree** — which is
the state the measurements were taken in, and the only state in which the proof means anything.

**Flag guard:** every flag used was checked by name against the harness source before the first race
— the ten `argVal` names and three `argv.includes` names extracted from `sim-fairness.mjs` itself.
All 13 present. **`--diagLabel` was made unique per arm**, because it defaults to `run` and twelve
parallel arms would otherwise have silently overwritten one file.

**Machine read before launching:** 14 logical cores, 10 node processes already resident → **5
workers**, nine cores left free. Twelve runs, **477 s wall clock**.

---

## 7. Build-vs-spec conformity

**Four deviations, stated rather than discovered later.**

1. **Arm 2 was RE-RUN although the brief invited re-use.** The brief said to re-use the existing
   result "and say so rather than re-running it". I re-ran it, for two reasons: the interaction
   contrast in §5 needs arm 2's **per-race** values and the published table carries only means; and
   re-running turns "the protocol matches" from a claim into the proof quoted in §6. **The cost was
   two runs inside a parallel batch — no wall clock at all.** The reported figures are identical to
   BRAKE-CURVE-1's, so nothing in the comparison rests on a re-measurement.
2. **The fast side of the envelope is reported although part (c) asked only for the slow side.** The
   brief specified the minimum realised speed factor and the floor-touch share. **Two of six arms
   raise a lever that loads the FAST side**, and reporting only the slow side would have let
   `boost=0.12` look free of naturalness cost when it is running at 1.1817 against a 1.20 ceiling.
   The figure was already in the dump (`maxSpeedFactor`); **no instrument was added.**
3. **A merged report is qualified.** §4c reads BRAKE-CURVE-1's "inside" verdict at brake 0.15 against
   the per-race distribution and finds the mean straddling the floor with half the races below it.
   **Its numbers reproduce exactly and none is withdrawn** — the qualification is to the label, not
   the arithmetic. It is flagged here rather than filed as a CORRECTION in the INDEX **because no
   number in that report is invalidated**.
4. **No gate was run beyond the fingerprint, and "read-only" is not the whole reason.** No default
   moved and no product code changed. **The merged diff is two report files and nothing else** — the
   observer was dropped from the branch after the measurements were taken (§6). **The fingerprint was
   run anyway, while the observer was still in the tree**, because `sim-fairness.mjs` is inside the
   engine's declared reach — read-only describes the measurement, not the file. **No browser gate and
   no client suite were run: neither can be reached by a diff of two markdown files, and neither has
   an opinion about a sim observer.** **Nothing was minted.**

---

## 8. What would need the definitive N — and what it would cost

**Every band-arrival cell is UNDECIDED**, so on fairness every arm is nominally a candidate. **Only
two are worth the definitive N**, and both for the same reason: they are the only arms a top stage
could actually use.

| arm | why it earns N=300 | cells |
| --- | --- | --- |
| `brake 0.15 + boost 0.12` | **The only combination that beats the brake alone.** Its action verdict is secure at N=30; what is not secure is its band-arrival cost, currently ±2.2–2.9pp — and it is the arm that would ship. | 2 |
| `boost 0.12` alone | The naturalness-cheap alternative §1 turned up. Its equality with the brake on the leading-group cut is an **inside-interval** result, and "indistinguishable at N=30" is exactly the claim N=300 exists to settle. | 2 |

**Cost.** A single N=30 run took **94 s** unloaded and ~155–190 s under five-way parallelism. N=300 is
ten times the races, so **≈16 min unloaded and ≈30 min per run under load**. **Four cells on five
workers ≈ one wave ≈ 30–35 minutes wall clock.** The N=300 baselines already exist from
ACTION-FAIRNESS-1 (87.93% dirt-oval, 89.91% river-run) and would not need re-running **provided the
protocol is proved identical the same way it was proved here** — that block used the same seed and
duration, and its N=300 is races 1–300 where this run took 1–30, a superset.

**`chaosSteerGain` needs no N=300 in either arm.** It is inert at N=30 and the source analysis in §2
says why: above 0.10 the mechanism's high side is a step function. **Spending half an hour to
establish that a saturated clamp is still saturated would be measuring nothing.**

**NOT STARTED. It waits for the owner's word.**

---

## 9. Proposals

**P1 — SUPERSEDED BY §10 (2026-08-23). Its request was already satisfied by arm 3 and its claim that
the arm was unmeasured is FALSE; the numbers it cites are correct. Read §10 instead.** The text is
left standing rather than edited, because the record is what it is.

**P1 — MEASURE `pulkChallengerBoost` ALONE AS THE TOP STAGE, because it may already be one.** The
result nobody asked for is that at its ceiling the boost buys **the same leading-group action as the
brake at its ceiling** (+22.6% vs +22.5% on dirt; indistinguishable on both tracks) while leaving the
slow side of the envelope **completely untouched** — 0 of 30 races below 0.80 against the brake's 15.
**If the leading-group cut is the one the owner means, a stage of `brake 0.10 (shipped) + boost 0.12`
may deliver medium-stage action at zero naturalness cost**, and the two-lever combination would only
be needed above that. **This block did not measure that arm** — every combined arm here carries
brake 0.15 — **and it is the cheapest unmeasured cell in the design.** Two tracks, N=30, ~4 minutes.

**P2 — THE TOP STAGE'S REAL CONSTRAINT IS A BUDGET SHARED BETWEEN TWO LEVERS, AND NOTHING ENFORCES
IT.** §4c shows brake and boost each sitting just inside the envelope alone and breaching together,
additively. **The naturalness cost adds up exactly as the action does** — that is the same finding
seen from the other side, and it means **no per-key range check can catch it**: `pulkLeaderBrake=0.15`
is legal, `pulkChallengerBoost=0.12` is legal, and the pair is not. Every ceiling in the code is
per-key (`≤0.15`, `≤0.12`, `1 + maxEffect`, `NATURALNESS_CEILING`). **A stage-acceptance check would
have to read the realised envelope of the combination, which is what `--brake-depth` measures and
what no shipped guard does.** This is an observation about what the guards can see, not a proposal to
add one.

**P3 — CLOSE THE SLOW SIDE, OR CORRECT THE DOCUMENT — BRAKE-CURVE-1'S P2, NOW WITH EVIDENCE FROM BOTH
SIDES.** That proposal was made from source alone. This run supplies the measurement: the fast side is
hard-clamped and **holds at 1.1817 against 1.20**, while the slow side has **22 of 30 races below the
documented floor in the arm that works**. `RACE-ACTION.md` §2 states the promise as ±20% symmetric.
**The asymmetry is no longer hypothetical — a shippable-looking configuration crosses the undefended
side.** Whether the code gains a floor or the document loses a claim is the owner's call.

**P4 — `chaosSteerGain` IS PINNED, AND A STAGE BUILT ON IT COULD NOT BE SHIPPED TODAY ANYWAY.**
`DEVSCREEN-INVENTORY.md` lists it under *"config keys that EXIST but have NO DevScreen control —
pinned to their tuned defaults, intentional, not oversights."* The project principle is that
everything is UI-configurable without code edits. **So arm 4 and arm 6 were measuring a lever the
owner cannot currently move**, and had either won, building the control would have been part of the
cost. **They lost, so nothing is owed** — but the next candidate for this slot should be checked for a
control before it is measured, not after. **Recording it so the check is cheap next time.**

**P5 — INSTRUMENT THE BRAKE SET (carried forward from BRAKE-CURVE-1's P1, still unbuilt and now more
load-bearing).** That block explained its leading-group collapse past 0.15 as ex-leaders being dumped
out of the top five rather than back into it, and flagged the account as a story rather than a
measurement. **This block's result makes it matter more**: brake+boost adds a mechanism that pushes a
*challenger* into the same front group the brake is ejecting the leader from, and whether those two
compose or fight is precisely a question about set membership. **If the reading is right, the depth
lever (`pulkLeadRotationDropDepthLengths`) is a third candidate for this slot that has never been
turned up** — and it does not touch the speed envelope at all.

---

## 10. ADDENDUM, 2026-08-23 — the cell P1 called unmeasured had already been measured

**P1 above is WRONG, and this section is the correction.** It asked for a measurement of
`brake 0.10 (shipped) + boost 0.12` and asserted *"This block did not measure that arm — every
combined arm here carries brake 0.15."* **The second half of that sentence is true of the arms named
`brake15-*`. The first half is false.** **Arm 3, reported throughout as `boost 0.12`, IS that cell.**

**Why it is that cell, established twice and then proved.**

1. **At source.** Arm 3 was run as `--pulkChallengerBoost=0.12` with **no `--pulkLeaderBrake` flag**,
   and `sim-fairness.mjs:619` resolves the key as
   `Number(argVal("pulkLeaderBrake", String(DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeaderBrake)))` — **an
   absent flag falls back to the shipped 0.10.**
2. **In the data already published.** §4c records arm 3's brake floor as **0.88**, which is
   `1 − max(0.12, 0.10)` — **the same floor as the shipped baseline**, where the two `brake 0.15`
   arms read **0.85**. **The table on the record already said the brake was at its shipped value; I
   did not read my own column.**
3. **Proved by re-running it with the brake stated explicitly.** `--pulkLeaderBrake=0.10
   --pulkChallengerBoost=0.12`, same seed, same protocol, compared field by field against arm 3's
   stored dump:

```
dirt-oval: 30 races x 8 fields — IDENTICAL      band 88.92% / watchdog 0.12 — IDENTICAL
river-run: 30 races x 8 fields — IDENTICAL      band 89.83% / watchdog 0.44 — IDENTICAL
```

**So no new measurement was owed and none is reported below.** What follows is arm 3's already-taken
figures, restated under the cell's true name so it sits beside the other arms without a reader having
to make the substitution.

### The cell: `pulkLeaderBrake` 0.10 (shipped) + `pulkChallengerBoost` 0.12

**a) Band arrival** — READ from `computeZoneSuccessRate` via `--hero-map`, against the same-N baseline.

| track | **N** | band arrival | shipped, same N | Δ | 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| dirt-oval | **30** | 88.92% | 88.17% | +0.75pp | ±2.37pp | **UNDECIDED** |
| river-run | **30** | 89.83% | 89.42% | +0.42pp | ±2.87pp | **UNDECIDED** |

**b) Action — all three cuts FRONT-ACTION-TRUTH-1 uses**, against baseline and against `brake 0.15`.

| track | cut | this cell | vs baseline | vs `brake 0.15` alone |
| --- | --- | --- | --- | --- |
| dirt-oval | n=1 · leader changes | 10.033 | **+27.5%** | −0.40 ±1.37 — **indistinguishable** |
| dirt-oval | **top 5 · pair swaps** | **33.300** | **+22.6%** | **+0.03 ±3.10 — indistinguishable** |
| dirt-oval | whole field · swaps/frame | 0.7690 | +6.8% (ns) | — |
| river-run | n=1 · leader changes | 13.167 | **+18.6%** | **−2.00 ±0.93 — brake AHEAD** |
| river-run | **top 5 · pair swaps** | **41.067** | **+12.7%** | **−1.77 ±2.44 — indistinguishable** |
| river-run | whole field · swaps/frame | 0.6814 | +10.0% | — |

**c) Naturalness — per-race minimum speed factor and the count below the 0.80 floor.**

| track | brake floor | meanMin ±95% | vs the 0.80 floor | **races < 0.80** | frames at floor | meanMax (ceiling 1.20) |
| --- | --- | --- | --- | --- | --- | --- |
| dirt-oval | 0.88 | 0.8466 ±0.0102 | **inside — whole interval above** | **0/30** | 0.0% | 1.1816 |
| river-run | 0.88 | 0.8416 ±0.0079 | **inside — whole interval above** | **0/30** | 0.0% | 1.1817 |

Against `brake 0.15` alone the cell is **significantly shallower on both tracks** — **+0.0405 ±0.0142**
(dirt) and **+0.0402 ±0.0113** (river) — and the brake's **15/30 and 16/30 races below the floor
become 0/30 and 0/30.**

**d) The start-row watchdog, and whether it can speak.**

| track | can it speak? | this cell |
| --- | --- | --- |
| dirt-oval | **NO** — the shipped baseline itself trips (`unfair=true`, minPHolm 0.02) | unfair=false (0.12) — **no information** |
| river-run | **YES** — the baseline is clean (minPHolm 1.00) | unfair=false (**0.44**) — **clean** |

### The plain answer

**YES on both halves of the question, with one caveat that belongs in the answer rather than under it.**

- **It reaches the leading-group action of `brake 0.15` alone.** On the top-5 cut — **the cut that
  decides the stage question, because BRAKE-CURVE-1 showed the two measures diverging in sign** — the
  cell is **indistinguishable from the brake on both tracks** (+0.03 ±3.10, −1.77 ±2.44).
- **And it stays clean on naturalness.** **0 of 30 races below the 0.80 floor on both tracks**, whole
  interval above the line, **0.0% of racer-frames at the brake's floor** — against the brake's 15/30
  and 16/30. On the fast side it runs at 1.1817 against a hard 1.20, which is where any boost at 0.12
  sits and is enforced.
- **THE CAVEAT: the two cuts disagree again, and on river-run they disagree about this cell.** On
  leader changes it is indistinguishable from the brake on dirt-oval but **trails it significantly on
  river-run (−2.00 ±0.93)**. **So "reaches brake 0.15" is TRUE on the leading-group cut on both
  tracks, and NOT true on the leader-change cut on the open track.** Which cut defines his leading
  group remains his open question, and it changes this answer on one of the two tracks.

**Nothing is proposed here.** No default moved, no key wired, no dial designed, no mapping suggested.

### What this addendum cost, and what it did not buy

**Two runs, ~95 s wall clock, and they produced no new information by design** — they exist to turn
"arm 3 is that cell" from an argument into the identity proof quoted above. **The reproduction ran
against the branch as merged, i.e. WITHOUT `--brake-depth`**, so its dumps carry no `brakeDepth`
field; that is why the naturalness figures above are arm 3's, taken when the observer was present,
and why the identity check covers the eight action fields rather than ten. **It also re-proves the
observer inert from the other side: the same config with the flag absent reproduces the same races.**

**The lesson worth keeping is not about this cell.** **A harness default made an arm's identity
implicit, the published table recorded the consequence (`loBound` 0.88), and a proposal was still
written asking for the arm that had just been run.** **The column that would have caught it was
already in the report.**
