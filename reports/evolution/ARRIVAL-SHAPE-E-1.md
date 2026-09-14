# ARRIVAL-SHAPE-E-1 — his arrival shape, built and measured; the distance is not the lever

**Branch** `night/2026-09-12b` · **not merged** · **nothing minted** · world fingerprint with no
variant selected is `bdf4a3c8ce6e0316`, bit-identical to the instrument run on the commit before
this work — **the shipped race is unchanged by default**.

---

## 1 · WHAT WAS BUILT

The owner described the arrival on 2026-09-13: two ranks before his assigned place he begins to slow,
he is at normal speed **before** he arrives, and from then on he is unsteered unless he falls out of
his block. That shape had never been tried. It is variant **E**, selected by the same one key as A–D:
`localStorage['racearena:arrivalVariant']` in the browser, `RA_ARRIVAL_VARIANT` in node, values
`E2`/`E3`/`E4`/`E5` — the digit is the taper distance in ranks.

**(a) The taper.** `approachDrive` is a smoothstep reaching exactly zero one rank short of his place,
which is what variant C did not do: C scaled by `e/span`, so one rank out it still commanded 1.02 at
twenty racers.

**(c) The net was already in the tree, and he guessed it.** He thought "unsteered until he falls out
of his block" was a rule the project already had. The **expression** exists exactly as he described —
`bandError` is zero inside a racer's band and the signed distance outside it, so steering on it means
*left alone inside, corrected at the edge*. **What did not exist is any comebacker reaching it:**
heroes are pinned to `strictness = 1.0`, so

> **a racer sitting comfortably 3rd inside his own top-5 block is steered today — to his exact drawn
> rank.** Being inside his block changes nothing. Nobody had asked this before.

So E builds **no new mechanism**; it is one assignment. Nothing releases the net (`bandError` returns
to zero by itself), and it **cannot** fire while he is ahead of his block: his band is `[1,5]` and
the "ahead" arm would need a rank better than 1st. A racer drawn 2nd who wins is fair and is untouched.

---

## 2 · METHOD

`sim-fairness.mjs --arrival-shape` (a read-only observer added for this), driven by
`scripts/exp-arrival-shape.mjs`: **5 arms × 10 tracks (each at its OWN `defaultRacerTypeId`) × field
sizes {20, 40, 60, 100} × 10 races = 2 000 races**, `--seed=1`, `--track-defaults`. 228 held
comebackers per arm — one per race that casts one, ~57% of races. Order is **`finishRank`**
(`raceCore.js`, crossing order), never a post-race sort by `t`.

The observation is recorded by the **controller itself**, identically under every arm, so A's baseline
and E's arms come from the same instrument. It is read-only: the world fingerprint is unchanged.

**Not measured here:** canvas widths. The sim has no camera, and the earlier `visibleWorldPx` reading
needs a live director. The gap is therefore reported in **race distance** (% of the race), which is
the column directly comparable across arms. Stated rather than substituted.

---

## 3 · ★ THE RESULT — NO RANK DISTANCE DELIVERS 1.0 AT ARRIVAL

Pooled over all four field sizes, 228 comebackers per arm:

| arm | block (base 83.3%) | arrival pace | at 1.0 | gap med (base 0.292%) | gap p90 | gap max |
|---|---|---|---|---|---|---|
| **A — today** | 83.3% | 1.084 | 8.8% | ★ **0.292** | ★ 0.924 | 2.549 |
| E2 | 84.6% | 1.070 | 19.7% | 0.412 | 1.227 | 2.697 |
| E3 | ★ **87.3%** | 1.052 | 19.7% | 0.367 | 1.181 | 2.634 |
| E4 | 86.8% | 1.042 | 19.7% | 0.352 | 1.227 | ★ **2.033** |
| E5 | 82.5% | ★ **1.030** | ★ **24.1%** | 0.388 | 1.162 | 2.280 |

★★ **CONDITION 1 IS NOT MET BY ANY DISTANCE.** Longer is monotonically better — 1.084 → 1.070 →
1.052 → 1.042 → 1.030 — and it never reaches 1.0. At best **24% of comebackers** arrive at pace.

★ **CONDITION 2 IS NOT MET EITHER.** Every arm's *median* peak gap is worse than today's: removing
the brake is what opens the gap, and the taper claws back part of it without beating A. E4 is the
only arm that beats A anywhere — on the **worst case**, 2.033% against 2.549%.

★ **THE BLOCK RATE IS NOT THE CASUALTY.** It rises for E2–E4 (83.3% → 87.3%). The failure the
owner's original 2→1→0 fallback order was written to guard against did not happen; the order ran the
wrong way, and he corrected it to 2→3→4→5 on the evidence.

---

## 4 · ★★ WHY — THE SERVO HAS NO GRADATION NEAR THE TARGET

`racePlanner.js:1173` computes `clamp(1.0 + gain * (error / nActive) + noise, minMult, maxMult)` with
`gain 2.0`, `maxMult 1.1`. **The drive saturates at `(maxMult-1)·n/gain = 0.05·n` ranks of error.**

| field | ranks of error that already saturate the ceiling | baseline arrival pace |
|---|---|---|
| 20 | **1.0** | **1.100** |
| 40 | 2.0 | 1.092 |
| 60 | 3.0 | 1.070 |
| 100 | 5.0 | 1.050 |

★★ **THE TWO COLUMNS TRACK EACH OTHER WITH NO EXCEPTION.** Where the servo has one rank of gradation
he arrives at *exactly* the ceiling; where it has five, he arrives at 1.05. **At twenty racers there
is no gradation at all** — one rank out is full drive, so the commanded multiplier is pinned at 1.100
for the whole approach and must fall the entire 0.10 in the last instant.

It cannot. `_setTarget` restarts a 1.0 s `easeInOutCubic` every frame the target moves, so the
multiplier chases with a ~1 s time constant. Binned by how long the taper actually ran:

| taper window | E2 arrival pace | E3 arrival pace |
|---|---|---|
| under 500 ms | 1.0978 | 1.0991 |
| 0.5–1 s | 1.0778 | 1.0914 |
| 1–2 s | 1.0549 | 1.0703 |
| 2–4 s | 1.0523 | 1.0447 |
| **over 4 s** | **1.0024** (48% at 1.0) | **1.0168** (36%) |

**Four seconds of taper arrives at pace; half a second arrives at the ceiling.** The taper distance
buys time only indirectly — median window 864 ms (E2) → 1 792 ms (E3) → 2 480 ms (E4) — which is why
longer helps and none of them is enough.

**How many ranks four seconds is**, read off the recorded approach trail:

| field | 1 s | 2 s | 3 s | 4 s | had 4 s of approach at all |
|---|---|---|---|---|---|
| 20 | 2 | 2 | 3 | **3** | **47%** |
| 40 | 2 | 3 | 4 | **4** | 78% |
| 60 | 2 | 3 | 4 | **6** | 100% |
| 100 | 2 | 3 | 5 | **5** | 100% |

One second is a flat **2 ranks** at every field size — which is why E2 never had a chance.

---

## 5 · TWO LIMITS NO DISTANCE REMOVES

★ **THE FRONT-CONTEST RELEASE ENDS THE TAPER'S WINDOW.** From `choreoReleaseProgress` **0.97** the
servo already targets a B1 hero's *current* rank, so his rank error is zero and there is nothing left
to scale. The taper's window is `[held release 0.70, 0.97]`. Arrivals landing past it:

| field | A | E2 | E3 | E4 | E5 |
|---|---|---|---|---|---|
| 20 | 9.3% | 11.1% | 11.1% | 13.0% | 13.0% |
| 100 | 39.3% | 39.3% | 41.0% | **45.9%** | 44.3% |

At a hundred racers **two arrivals in five are out of reach of any taper**.

★ **AND AT TWENTY RACERS THE LONGER DISTANCES ARE UNREACHABLE.** His median drawn place is **3**, so
five ranks before it is rank 8 — often ahead of where he is when handed back. The share of
comebackers already inside the taper span at the hand-back, so the drive is never at full power to
ease off *from*:

| field | E2 | E3 | E4 | E5 |
|---|---|---|---|---|
| 20 | 22.2% | 38.9% | **53.7%** | **75.9%** |
| 40 | 0.0% | 1.4% | 1.4% | 4.3% |

**A distance that is unreachable for three comebackers in four is not a distance for him.**

---

## 6 · SABOTAGE

Both bite, on `client/src/modules/arrivalShape.test.js` (16 tests):

- **Remove the taper** (`approachDrive` returns 1): **6 tests red**, including the end-to-end
  assertion that he is at natural speed when he reaches his place, and the recorded arrival pace.
- **Let the net fire while he is ahead of his block** (band low edge set to his drawn rank):
  **exactly the two** assertions that say he is left alone inside and ahead of his block go red.

A third — removing the net and watching the drift worsen — is **not claimed**: the drift is already
0 median / 5–6 worst in every arm, so the measurement could not have shown it. Reported as not
established rather than as a pass.

---

## 7 · WHAT THIS MEANS

★★ **THE DISTANCE IS NOT THE LEVER, AND THE NEXT CHANGE IS TO THE SERVO, NOT TO THE COMEBACKER.**
The taper is a second mechanism compensating for a first one that has no gradation near its target.
The evidence says to fix the response itself — one steering for every racer — and then ask whether a
taper is needed at all.

**Left in the tree:** variant E with all four distances still selectable, default **A** (today's
race, unchanged and fingerprint-proven). Nothing is selected as a winner, because **no distance met
both conditions**. The owner's `2 → 3 → 4 → 5` order is what the evidence supports, and E4 is the
closest of the four — best worst-case gap, block rate +3.5 points, arrival pace 1.042 — but it does
not deliver 1.0 and is unreachable for over half of twenty-racer comebackers.

**Owner decisions this leaves open** (named, not built):
1. Whether the taper should be expressed in **time** rather than ranks. One second is 2 ranks at
   every field size but four seconds is 3–6 ranks depending on it, so no single rank number is right
   everywhere.
2. Whether the **front-contest release at 0.97** should stay where it is, given it closes the window
   on two arrivals in five at a hundred racers.
