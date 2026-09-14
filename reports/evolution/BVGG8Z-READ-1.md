# BVGG8Z-READ-1 — the steering did not make the gap; it was braking him while the gap grew

**Branch** `read/bvgg8z-1` · **READ-ONLY — nothing built, nothing changed, nothing minted, nothing
merged.** One read of `server/data/races.sqlite`, opened `readonly`; nothing created or deleted there.

---

## ★★ THE VERDICT

> **The steering PLACED him and then tried to hold him back. It did not create the breakaway.**
>
> Over the whole race the steering factor accounts for **−296 world px of Thunder's movement — it
> COST him 2.22% of his distance, it did not give him any.** From the moment he took the lead it
> commanded a **5% brake (`trajectoryMult` 0.9501) on 836 of 1335 frames**, and the gap grew from
> **9.8 px to 202.2 px anyway**.
>
> ★★ **What made the gap was that he was pinned at the fast edge of the honest speed band
> (`spreadFactor` 1.08134 = `spreadMax` exactly) while every mechanism that could have pulled him
> back was out of window, under threshold, or too late.** The field did not fail to chase — **it was
> never asked to.**

---

## 1 · THE REPLAY REPRODUCES EXACTLY

| | |
|---|---|
| race | **`BVGG8Z`**, finished 2026-09-14 07:15:45 Z, build `52be3ec4` |
| track / field / seed | **dirt-oval · 40 racers · seed 9 · horse · 2 laps**, stage **`quiet`** |
| ★ **finishing positions** | ★ **40 / 40 match** |
| ★ **finishing times** | ★ **40 / 40 match, to the millisecond** |

The stored world was handed to `buildRace` whole rather than rebuilt from the stage — a stored race
carries its world already staged, and applying the stage again would be a second application of the
same function. **Everything below therefore describes this race and no other.**

---

## 2 · WHO WON, AND WHAT HE WAS

**Thunder (index 5) won at 85 792 ms**, 1 344 ms clear of Flare.

| | |
|---|---|
| role | ★ **`comebacker`** — from `plan._heroRoles`, set at [racePlanner.js:850](../../client/src/modules/racePlanner.js#L850) straight off the generator's cast curves |
| ★ **staged?** | ★ **YES** — `getHeldRelease` ([racePlanner.js:1507](../../client/src/modules/racePlanner.js#L1507)) returns him with **`releaseAt` 0.70**. Only held curves carry it ([racePlanner.js:837-838](../../client/src/modules/racePlanner.js#L837-L838)) |
| **drawn place** | ★ **2nd** (`getTargetRank`, [racePlanner.js:1510](../../client/src/modules/racePlanner.js#L1510)) |
| actual place | ★ **1st** |

### ★★ The claim at `heroCurveGenerator.js:654` — SCOPED DIFFERENTLY THAN IT READS, AND ALSO CONTRADICTED

The exclusion is [heroCurveGenerator.js:654](../../client/src/modules/heroCurveGenerator.js#L654):
`const wantStaged = stagingRank != null && !staged && p.index !== winnerIdx;` — and `winnerIdx` is
the **drawn** rank-1 racer ([heroCurveGenerator.js:562](../../client/src/modules/heroCurveGenerator.js#L562)).

★ **It is about being DRAWN first, not about WINNING.** It worked exactly as written here — Thunder
was drawn 2nd, so staging him was allowed — and it **cannot** stop him finishing first, because after
`releaseAt` he reaches his place by racing rather than by a second authored leg. **He overshot his
drawn place by one and won.** That is not the exclusion failing; it is the exclusion not being about
the thing the shorthand says it is about.

★★ **AND THE PUBLISHED FORM OF THE CLAIM IS CONTRADICTED BY THIS RACE.**
[reports/evolution/INDEX.md:644](INDEX.md) records DRAWN-PLACE-TRUTH-1 as **"0 OF 717 CAST COMEBACKERS
ARE DRAWN FIRST"**. In `BVGG8Z`, **Blitz (index 13) is cast `comebacker` AND drawn 1st** — both read
from the controller. ★ **The address of the hole:**
[heroCurveGenerator.js:672](../../client/src/modules/heroCurveGenerator.js#L672) —
`if (addSolo(p.index, p.rank > cr ? 'comebacker' : 'sovereign-lead', cr, peakRank))` — the fall-back
casting path **carries no `winnerIdx` exclusion at all.** Only the staged path at :654 does. **I am
not explaining this away and I am not auditing that report**: on this one race, on this tree, the
drawn winner is a cast comebacker.

★ **For completeness**: the drawn winner Blitz finished **5th**.

---

## 3 · THE SHAPE OF THUNDER'S RACE

`tm` is `r.trajectoryMult`, the one multiplicative steering factor in the t-update
([racePlanner.js:515](../../client/src/modules/racePlanner.js#L515)); `*` marks a frame where it is
not 1, i.e. the steering is acting. Lead is **P1 over P2** at that step, by the product's own
standings order.

| progress | his rank | tm (steering) | P1 | P2 | lead world px | lead screen w | visibleWorldPx |
|---|---|---|---|---|---|---|---|
| 0.050 | 22 | 1.1000 * | Titan | Flare | 20.9 | 0.077 | 271 |
| 0.150 | 7 | 1.1000 * | Titan | Flare | 57.5 | 0.156 | 369 |
| 0.250 | 8 | 1.0394 * | Flare | Orbit | 12.4 | 0.046 | 270 |
| 0.350 | 8 | 1.0295 * | Titan | Gale | 3.3 | 0.013 | 255 |
| ★ 0.400 | 8 | ★ **0.8502** * | Titan | Blaze | 10.7 | 0.042 | 255 |
| 0.500 | 13 | 0.8668 * | Pixel | Swift | 8.0 | 0.031 | 255 |
| 0.600 | 13 | 0.8834 * | Speedy | Pixel | 13.9 | 0.052 | 270 |
| ★ 0.700 | ★ **15** | 0.8584 * | Comet | Titan | 50.5 | 0.241 | 210 |
| ★ 0.750 | 7 | ★ **1.1000** * | Titan | Comet | 19.2 | 0.071 | 270 |
| 0.800 | 5 | 1.0875 * | Blitz | Flare | 15.3 | 0.057 | 270 |
| ★ 0.850 | ★ **1** | ★ **0.9501** * | **Thunder** | Blitz | 25.5 | 0.100 | 255 |
| 0.900 | 1 | 0.9501 * | **Thunder** | Blitz | 91.6 | 0.204 | 450 |
| 0.950 | 1 | 0.9501 * | **Thunder** | Blitz | 157.7 | 0.183 | 863 |
| 1.000 | 1 | 1.0006 * | **Thunder** | Flare | 4.5 | 0.010 | 450 |

**The three moments asked for:**

- **Deepest rank 36, at progress 0.010.** He climbs to 7th by 0.15 on `tm` 1.10 — the authored curve.
- ★ **The held leg**: from ~0.40 the steering brakes him to **0.85** (`minMult`) and he falls back to
  **15th by 0.700** — which is `releaseAt` to the digit.
- ★ **He starts moving forward for the last time at progress 0.700**, the release. `tm` returns to
  1.10 and he goes 15th → 7th → 5th.
- ★ **He takes the lead at progress 0.838 (72 208 ms).**
- ★ **Maximum lead he ever held: 202.2 world px = 0.627 screen widths, at progress 0.987.**

★ **One reading not to take from the screen column**: at progress 0.950 the lead is **157.7 px but
only 0.183 screen widths**, because the camera is wide there (`visibleWorldPx` 863). The same gap
reads 0.204 at 0.900 on a 450 px view. **The world column is the one that describes the race.**

---

## 4 · ★★ DID THE STEERING MAKE THE GAP? — NO, IT WAS FIGHTING IT

### 4.1 · The split, measured

The t-update is `r.t += r.baseSpeed * boost * brake * r.trajectoryMult * r.areaBonusMult * dt`
([racePlanner.js:515](../../client/src/modules/racePlanner.js#L515)), so the steering is **one
multiplicative factor** and the split is arithmetic, not a model: a realized step `d` would have been
`d / tm` with the steering neutral, so the steering's share of that step is `d · (tm − 1) / tm` —
base speed and the boost/brake product cancel.

| | |
|---|---|
| Thunder's total advance | 2.036002 path-lengths = **13 318 world px** |
| ★ **of which the steering factor** | ★ **−0.045258 = −296 world px = −2.22%** |

★★ **The steering took distance OFF him over the race.** For scale, the most-boosted racer in the
field is **Falcon at +683 px (+5.13%), who was drawn 9th and finished 18th** — the steering's biggest
push went to a racer who lost places.

★ **WHAT THIS IS NOT, stated rather than glossed.** It is an **instantaneous** decomposition holding
every other factor at the value the real race produced. It is **not** a counterfactual: a race
actually run without the steering would diverge from the first frame — different positions, so
different drafting, avoidance and pulk terms — so this says *how much of the movement he did make was
the steering's factor*, never *where he would have finished without it*. That second question needs a
second race, which this block is not allowed to build.

### 4.2 · What the steering did while his lead grew

| over the 1 335 frames he led | |
|---|---|
| `tm` **< 1** (braked) | ★ **836 frames** |
| `tm` > 1 | 499 |
| `tm` == 1 | 0 |
| min / mean / max | **0.9501** / **0.9719** / 1.0300 |

★ **He was braked because he was ABOVE his drawn place.**
[racePlanner.js:1017](../../client/src/modules/racePlanner.js#L1017) —
`let rankError = currentRank - targetRank;` — at rank 1 with a drawn 2 that is **−1**, and the servo
answers with a brake. **0.9501 is that brake, held for most of the endgame while the gap grew from
9.8 px to 202.2 px.**

★★ **AND THE CHASER BEHIND HIM WAS BRAKED HARDER.** Over the same frames P2's `tm` averaged
**0.9579 against the leader's 0.9719**, reaching **0.8500**. The steering was serving drawn places on
both ends, and the racer chasing him happened to be further above his own drawn place than the
leader was above his.

### 4.3 · The pursuit terms — out of window, under threshold, or too late

**`pulkChallengerBoost` (0.06) and `pulkLeaderBrake` (0.1): NEVER IN PLAY.**
[raceGovernor.js:181-187](../../client/src/modules/raceGovernor.js#L181-L187) gates them on
`progress >= pulkStartFrac && progress < pulkEndFrac`, and this race's fractions are
**pulkStart 0.15, pulkEnd 0.60**. ★ **He took the lead at 0.838 — 0.24 of the race after that window
shut**, and [raceGovernor.js:190-192](../../client/src/modules/raceGovernor.js#L190-L192) slews
everyone to 1.0 outside it. **They never fired against him, and could not have.**

**The gap correction (`computeGapBiasedTarget`,
[racePlanner.js:1266](../../client/src/modules/racePlanner.js#L1266)): the schedule decided it.**
From [raceCore.js:158-163](../../client/src/modules/raceCore.js#L158-L163) this race's own clock gives
`rollCount = max(2, floor(87.22 / 10)) = 8` rolls at `rollInterval = (95% × 87.22 s) / 8 = 10.36 s`.
The threshold is `gapRerollThresholdLengths` 0.5 × `drawnBodyLengthPx` 38.32 = **19.16 world px**.

| roll | fires | settles (+3 s blend) | lead at fire | |
|---|---|---|---|---|
| 6 | 62 144 ms | 65 144 | 23.0 px | before he led |
| ★ 7 | **72 502 ms** | 75 502 | ★ **9.8 px** | ★ **in time — but UNDER the 19.16 px threshold** |
| ★ 8 | **82 859 ms** | ★ **85 859** | ★ **177.5 px** | ★★ **he crossed at 85 792 — it settles 67 ms AFTER HE HAD WON** |

★★ **THAT IS THE TIMING ANSWER.** The first correction reached the field **294 ms after he took the
lead** — remarkably quick — **but the gap was only 9.8 px then, half the threshold, so there was
nothing for it to correct.** The roll that would have seen a 177 px gap is **the last roll of the
race**, and its 3 s `easeInOutCubic` blend finishes **67 milliseconds after he had already crossed
the line.** With eight rolls 10.36 s apart, the window in which the gap was both large enough to
trigger and early enough to matter **did not contain a roll at all.**

---

## 5 · THE OTHER CANDIDATES IN THIS RACE

★ **No `sovereign-lead` was cast.** The six cast roles are three `comebacker` (Thunder, Blitz, Comet)
and three `attacker-b2` (Storm, Orbit, Nitro).

Every racer who held P1, with the largest lead he had while leading:

| racer | role | drawn → actual | frames led | max lead while leading |
|---|---|---|---|---|
| ★ **Thunder** | comebacker | 2 → **1** | 1 335 | ★ **202.2 px** at p=0.987 |
| Comet | comebacker | 3 → 3 | 552 | **69.5 px** at p=0.682 |
| Titan | — | 5 → 4 | 1 703 | 57.6 px at p=0.144 |
| Flare | — | 4 → 2 | 703 | 41.8 px at p=0.235 |
| Pixel | — | 16 → 20 | 179 | 28.4 px |
| Gale | — | 8 → 6 | 126 | 23.3 px |
| Blitz | comebacker | **1** → 5 | 297 | 22.5 px |
| Orbit | attacker-b2 | 12 → 14 | 161 | 14.1 px |
| Speedy | — | 30 → 32 | 418 | 13.9 px |
| Storm | attacker-b2 | 15 → 8 | 138 | 8.1 px |
| Swift | — | 6 → 7 | 55 | 4.4 px |

★ **No racer other than the winner produced a large lead at any point.** The next biggest is Comet's
**69.5 px at p=0.682** — a third of Thunder's, and it was closed. ★ **Titan led for MORE frames than
Thunder (1 703 to 1 335) and never got beyond 57.6 px**: leading was common in this race, leading
*away* was not.

---

## 6 · THE MEASUREMENT CAVEAT — MY NUMBERS DO NOT CARRY IT

BREAKAWAY-FREQUENCY-1's canvas-width column divides by `finishT` once too often. ★ **The tool used
here does not.** It computes `leadWorldPx = (t_P1 − t_P2) × pathLengthPx` — `t` is measured in path
lengths ([durationModel.js:22](../../client/src/modules/durationModel.js#L22)), so that multiplication
is the whole conversion — and then `leadScreen = leadWorldPx / visibleWorldPx`. **No `finishT` appears
in either expression.**

★ **So none of the screen-width numbers above are affected.** This race has `finishT = 2` (two laps),
so had the error been present every screen figure would read **half** what it does — the 0.627 would
have printed as 0.314. **It does not.** (Not fixed, not audited elsewhere, as instructed.)

---

## 7 · NOTICED, AND DELIBERATELY LEFT ALONE

- ★ **`getDiag()` returns `null` on the controller.** `racePlanner.js:1364` builds
  `planBiasDeltaMean` / `pulkBiasEventCount`, but nothing I could reach exposes them on a replay, so
  **I could not count gap-bias EVENTS directly** and measured the re-roll's effect through
  `spreadFactor` instead (which is what a re-roll actually writes). Reported rather than worked around.
- ★ **The biggest single steering push in this race went to a racer who lost nine places** — Falcon,
  +683 px, drawn 9th, finished 18th. Not pursued here; it is not this race's question.
- The drawn winner being cast `comebacker` (§2) is a finding, **not a repair** — I have not touched
  `heroCurveGenerator.js` and propose no change to it in this block.

---

## 8 · THE LEVER, IN ONE SENTENCE, AND THEN I STOP

**The only mechanism that could have closed this gap is the gap-biased re-roll, and in this race it
had no roll available between the moment the gap passed 19.16 px and the moment he crossed** — so the
lever is the re-roll's cadence or its 3 s settle, not the comebacker's speed and not the steering.

---

## 9 · PROOF THE STORE WAS OPENED READ-ONLY

Every connection was `new Database(path, { readonly: true })`. No server was started or stopped.

| | before | after |
|---|---|---|
| races | **14** | **14** |
| size | **221 184 B** | **221 184 B** |
| mtime (UTC) | **2026-09-14T07:15:45.2733297Z** | **2026-09-14T07:15:45.2733297Z** |
| MD5 | **`fb51751688f74577fff4d83b67313ab2`** | **`fb51751688f74577fff4d83b67313ab2`** |
