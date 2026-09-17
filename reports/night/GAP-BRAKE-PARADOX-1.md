# GAP-BRAKE-PARADOX-1 — P1 is false: the brake's command never reaches the leader's speed

**Read-only.** No source file was changed, nothing minted, nothing merged. Measured on
`feat/gap-leader-brake` at `fbdfc4a9`. Date: 2026-09-14. **The owner's store was not opened.**

---

## THE VERDICT

**P1 is FALSE.** The brake's command does not reach the leader's actual speed. It reaches the
*target*; the target is then never realised, because the transition that carries `trajectoryMult`
toward it is restarted faster than it can travel.

**P2 is not violated in the way the contradiction states it.** No term in the speed chain is ever
raised by the brake. On the worst step of space-sprint seed 2, every one of `baseSpeed`,
`spreadFactor`, drafting, avoidance, `rawRowBonus`, `areaBonusMult` and `governorMult` is
**bit-identical** between the arms; only `trajectoryMult` differs — and it differs *upward*:
**0.950171 OFF → 1.078698 ON**. The brake did not make that number bigger. It **prevented the servo
from making it smaller**.

**P3 HOLDS.** Both witnesses diverge only *after* the brake's first command, in the leader's own `t`,
and the brake consumes no randomness — so the ON/OFF comparisons in the last two reports are not
void.

**The one-line answer: the braked leader is faster because braking him froze his multiplier at the
boosted value it happened to hold when the brake engaged.**

---

## THE INSTRUMENT, AND ONE CORRECTION TO IT

The first version of this instrument sampled `runRace`'s callback. That was wrong:
[raceDriver.mjs:565-569](../../scripts/lib/raceDriver.mjs#L565-L569) steps physics up to twice per
callback — `while (accum >= FIXED_DT && steps++ < 2)` — because the render frame is 16.667 ms while
`FIXED_DT` is 16 ms ([raceCore.js:51](../../client/src/modules/raceCore.js#L51)). It therefore saw
**568 of the 592 steps** the brake acted on, and read every gap one step late. Both facts were caught
by a control, not by reasoning.

The instrument now drives `stepRacePhysics` directly — exactly one observation per physics step —
and is proved faithful before anything is read out of it:

| control | result |
|---|---|
| this loop vs `runRace`, OFF arm | **40/40 positions, 40/40 times** |
| this loop vs `runRace`, ON arm | **40/40 positions, 40/40 times** |
| steps where the observer saw `firedFrames` advance | **592**, total advance **592** — one per step |
| observer's pre-step gap vs the mechanism's own `gapsAtFire` | **0 disagreements of 592** |

Only after that agreement is the command recomputed from the mechanism's own formula
([racePlanner.js:738-740](../../client/src/modules/racePlanner.js#L738-L740)); its minimum matches
the getter's `minMultCommanded` to 1e-9.

---

## STEP 1 — THE TWO RUNS SIDE BY SIDE (space-sprint seed 2, 40 racers, wild, 124 px / 0.95)

Window as resolved: **0.600 – 0.95**. Brake fired on **592 of 1279** in-window steps.

### The brake's first commands (steps 2744–2750)

| step | p | gap OFF → ON | brake cmd | target OFF → ON | trajectoryMult OFF → ON | advance OFF → ON |
|---|---|---|---|---|---|---|
| 2743 | 0.756 | 124.7 → 124.7 | — did not fire | 0.944593 → 0.944593 | 1.094098 → 1.094098 | 3.60996e-4 → 3.60996e-4 |
| 2744 | 0.756 | 125.6 → 125.6 | **0.998042** | 0.944593 → 0.944593 | 1.094052 → 1.094052 | 3.60986e-4 → 3.60986e-4 |
| 2745 | 0.756 | 126.5 → 126.5 | 0.996920 | 0.944593 → 0.944593 | 1.093961 → 1.093961 | 3.60963e-4 → 3.60963e-4 |
| 2746 | 0.757 | 127.5 → 127.5 | 0.995799 | 0.944593 → 0.944593 | 1.093812 → 1.093812 | 3.60923e-4 → 3.60923e-4 |
| 2750 | 0.758 | 131.2 → 131.2 | 0.991312 | 0.945847 → 0.945847 | 1.093746 → 1.093746 | 3.60885e-4 → 3.60885e-4 |

★ Read the `trajectoryMult` column: the racer is being **told 0.9446** and is **holding 1.0940** —
*on both arms*. The multiplier is already nine per cent above its own target before the brake does
anything. That is the pre-existing condition the brake walks into.

### Around the ON arm's peak (steps 3068–3076)

| step | p | gap OFF → ON | brake cmd | target OFF → ON | trajectoryMult OFF → ON | advance OFF → ON |
|---|---|---|---|---|---|---|
| 3068 | 0.857 | 129.3 → **227.2** | 0.875176 | 0.950164 → 0.875699 | **0.950164 → 1.072225** | 2.95613e-4 → 3.33652e-4 |
| 3070 | 0.858 | 128.6 → 227.2 | 0.875109 | 0.950164 → 0.875699 | 0.950164 → 1.070975 | 2.94328e-4 → 3.31860e-4 |
| 3072 | 0.858 | 127.8 → **227.3** | 0.875087 | 0.950164 → 0.875699 | 0.950164 → 1.069026 | 2.92983e-4 → 3.29799e-4 |
| 3076 | 0.859 | 126.3 → 227.2 | 0.875211 | 0.950164 → 0.875699 | 0.950164 → 1.062407 | 2.90107e-4 → 3.24690e-4 |

**OFF: target 0.950164, held 0.950164 — honoured exactly.
ON: target 0.875699, held 1.069026 — off by 0.193, and on the wrong side of 1.0.**

### The full speed chain at the step where the ON leader gained most (step 2859, p=0.792, racer 20)

| term | OFF | ON | differs? |
|---|---|---|---|
| baseSpeed | 0.00016497294247765724 | 0.00016497294247765724 | |
|   of which spreadFactor | 1.081339701114832 | 1.081339701114832 | |
| boost (drafting active) | false | false | |
| brake (avoidance active) | false | false | |
| rowEnvMult input `rawRowBonus` | 0.00551844321812373 | 0.00551844321812373 | |
| **trajectoryMult** | **0.9501711593966956** | **1.0786982223857278** | **★ YES** |
| areaBonusMult | 1 | 1 | |
| governorMult | 1 | 1 | |
| realized advance in `t` | 3.135094e-4 | 3.559195e-4 | ★ YES |

**Exactly one term differs, and it is the one the brake writes to.**

---

## STEP 2 — P1: DOES THE COMMAND ARRIVE

It does not. Restricted to the **592 braked steps and the same step indices in the OFF run**, so the
two arms are compared like with like:

| | OFF | ON |
|---|---|---|
| ease **restarts** | 2.2% | **25.8%** |
| median `elapsed` into the 1000 ms transition | **3392 ms** (long completed) | **16 ms** (one step in) |
| `held − target`, median | **0.000000** | **0.141085** |
| steps told `< 1.0` while holding `> 1.0` | 94 of 592 | **592 of 592** |
| leader `trajectoryMult`, median | **0.950164** | **1.075235** |

### The mechanism, with addresses

1. `_computeGapLeaderBrake` returns a target ([racePlanner.js:720-748](../../client/src/modules/racePlanner.js#L720-L748)).
2. The loop folds it into one write: `steerTarget = Math.min(rawTarget, gapBrake.target)`
   ([racePlanner.js:1211-1214](../../client/src/modules/racePlanner.js#L1211-L1214)), then
   `_setTarget(r, steerTarget, elapsedMs)` ([racePlanner.js:1215](../../client/src/modules/racePlanner.js#L1215)).
3. `_setTarget` ([racePlanner.js:673-679](../../client/src/modules/racePlanner.js#L673-L679)) acts
   only when the target moves by more than `TARGET_EPSILON` 0.001 — and when it does, it sets
   `trajectoryMultPrev = r.trajectoryMult`, **the value held right now**, and
   `trajectoryMultTransStart = elapsedMs`.
4. The multiplier is realised at
   [raceCore.js:565-574](../../client/src/modules/raceCore.js#L565-L574):
   `elapsed = physicsTs − transStart`, then
   `trajectoryMult = elapsed < 1000 ms ? prev + (target − prev) · easeInOutCubic(elapsed/1000) : target`.
5. `easeInOutCubic` is `4t³` below the midpoint
   ([mathUtils.js:12](../../client/src/utils/mathUtils.js#L12)), so the first quarter of a transition
   covers only **6.25%** of the distance.

★ **Every restart throws away the progress made toward the previous target and begins again from
where the multiplier currently is.** With a restart every few steps, `elapsed` never escapes the
cubic-flat region, and the held value stays near where the churn began — **1.094, a servo boost**.

Measured, on the written target itself: **25.9% of consecutive braked step-pairs change it by more
than the 0.001 epsilon** (153 of 591), median change 0, p90 1.219e-3, max 1.762e-3. The brake's own
command drifts more gently — only **7.3%** of its step-to-step changes exceed the epsilon (43 of 591,
median 3.107e-4) — so the churn is not the brake's ramp alone but the target *alternating* between
the brake's command and the servo's, in jumps larger than either source's own drift.

★ **I could not attribute those alternations reliably and am not going to pretend otherwise.** A test
that asks "did the brake's value win the `Math.min`?" cannot distinguish a servo win from a **stale**
target, because `_setTarget` leaves the stored target untouched whenever the change is under the
epsilon — at the peak the written target is 0.875699 while the command is 0.875087, which is neither
a min of the two nor a servo value, but last time's number. The restart *rate* and its consequence
are measured directly and stand; the attribution between the two sources does not.

**Does it freeze, as the dead front leash freezes?** Not the same way. The leash's failure
([racePlanner.js:1130-1169](../../client/src/modules/racePlanner.js#L1130-L1169)) needs two
`_setTarget` calls per frame to pin `elapsed` at exactly 0. The brake makes a single write, so
`elapsed` does advance — the longest run of a completely unmoving held value is **3 steps**. The
damage is not a hard freeze but a *crawl*: the median `elapsed` at read is **16 ms of 1000**, so the
multiplier moves at roughly 4·(0.016)³ ≈ 0.001% of the remaining distance per step.

**Verdict: the command ARRIVES AT THE TARGET AND NEVER REACHES THE SPEED. P1 is false.**

---

## STEP 3 — P2: DOES IT ONLY EVER SLOW

| witness | braked steps compared (same leader in both arms) | ON advanced MORE | LESS | equal |
|---|---|---|---|---|
| space-sprint seed 2 | 562 | **503** | 13 | 46 |
| ice-track seed 3 | 535 | **362** | 82 | 91 |

As stated — "the brake only ever reduces that speed" — **P2 is false**: the braked leader is faster
on the large majority of the steps on which he is being braked.

But the term that made him faster is **not raised by the brake**. The chain decomposition above shows
`trajectoryMult` as the only differing term, and the brake's write to it is a `Math.min` — which
cannot raise anything. What differs is that on the OFF arm the servo's target was **reached**
(held = target = 0.950164) and on the ON arm it was **not** (held 1.069 against a target of 0.8757).

**So P2 fails as a consequence of P1, not independently.** The correct statement is: *the brake only
ever commands a slowdown, and on these races commanding it makes the racer faster.*

Over the 562 braked steps of space-sprint seed 2 the ON leader advanced **301.0 world px** further
than the OFF leader; on ice-track seed 3, **49.7 px** over 535 steps.

---

## STEP 4 — P3: IS IT THE SAME RACE

| witness | brake's first command | first divergence, any racer, any quantity | verdict |
|---|---|---|---|
| space-sprint seed 2 | step 2744, p=0.756, gap 125.6 px | step **2790**, racer 20 (the leader), `t`, difference 6.75e-9 | **after** the command — P3 holds |
| ice-track seed 3 | step 3870, p=0.839 | step **3961**, racer 16 (the leader), `t` | **after** the command — P3 holds |
| ice-track seed 2 | never fired | **none in 4932 steps** | identical races |

**Nothing differs before the brake's first command in either witness.** The 46- and 91-step lag
between command and measurable divergence is the ease crawling: the target moves at once, the held
multiplier takes tens of steps to move enough to change `t` in the 15th decimal.

**No randomness is consumed differently.** `_computeGapLeaderBrake`
([racePlanner.js:720-748](../../client/src/modules/racePlanner.js#L720-L748)) contains no `rng()` or
`Math.random` call, and the steering loop's only draw is
[racePlanner.js:1195](../../client/src/modules/racePlanner.js#L1195), executed once per racer per
step regardless of the brake. The brake changes no draw, no re-roll, no cast and no ordering — it
changes one number in one racer's steering target.

★ **Therefore the ON/OFF comparisons in GAP-BRAKE-SWEEP-1 and GAP-BRAKE-WINDOW-1 are NOT void.** They
compare the same races. What they were measuring was a brake that does not arrive.

---

## THE SECOND WITNESS

**ice-track seed 2 — the seed named in the task — is a null case:** the brake never fires (0 of 1586
in-window steps), the two arms are byte-identical over all 4932 steps, and the 0.600→finish maximum
is 115.9 px on both. It is a clean control that the instrument invents no differences, but it cannot
witness the contradiction. **ice-track seed 3** is the race the cited figure (196.6 → 211.9 px)
belongs to, and it is used as the second witness. It agrees with space-sprint on every test:

| | OFF | ON |
|---|---|---|
| ease restarts (on the 535 braked steps) | 21.1% | 20.9% |
| median `elapsed` into the 1000 ms transition | 48 ms | **32 ms** |
| `held − target`, median | 0.017058 | **0.075464** |
| steps told `< 1.0` while holding `> 1.0` | 214 of 535 | **329 of 535** |
| leader `trajectoryMult`, median | 0.967274 | **1.002238** |
| 0.600→finish maximum | 196.6 px | **211.9 px** |

Note the difference in shape between the witnesses: on space-sprint the brake **multiplies the churn
twelvefold** (2.2% → 25.8%), while on ice-track the churn rate is already high on both arms and the
brake instead widens the held-to-target gap fourfold. Both end in the same place — a leader holding
above 1.0 while being told to go below it.

---

## THE PRE-EXISTING HALF, STATED SEPARATELY

This is not solely the brake's defect, and the report would be misleading if it said so. On the OFF
arm of ice-track seed 3 the servo **already** fails to reach its own target on 214 of 535 leader
steps, with the ease completing on only 4.5% of in-window steps. The `_setTarget` epsilon-gated
restart at [racePlanner.js:673-679](../../client/src/modules/racePlanner.js#L673-L679) combined with
a 1000 ms cubic ease and a 16 ms step is a pre-existing property of the trajectory controller. **The
brake did not create it; the brake walks into it and makes it much worse**, because its command is a
continuous function of a quantity that changes every step.

---

## NO REPAIR

The cause is named above with its address:
[racePlanner.js:673-679](../../client/src/modules/racePlanner.js#L673-L679) restarting the
[raceCore.js:565-574](../../client/src/modules/raceCore.js#L565-L574) transition from the current
held value, faster than `easeInOutCubic`
([mathUtils.js:12](../../client/src/utils/mathUtils.js#L12)) can travel. Nothing was changed, no key
was adjusted, and no integration point was touched.

---

## WHAT I NOTICED AND DELIBERATELY LEFT ALONE

- **My own commit message for GAP-BRAKE-1 claimed this hazard was avoided.** It said the brake
  "produces a target and the loop folds it into the leader's SINGLE write with `Math.min`", on the
  reasoning that a second `_setTarget` per frame was what pinned `elapsed` at 0. That reasoning was
  right about the two-write case and **wrong about the one-write case**: a single write whose value
  moves by more than the epsilon restarts the ease just as effectively, only from a non-zero
  `elapsed`. The measurement contradicts the claim, and the claim was mine.
- **The dead front leash** ([racePlanner.js:1130-1169](../../client/src/modules/racePlanner.js#L1130-L1169))
  has the harder version of the same fault and remains unreachable. Untouched.
- **`raceCore.js:679-683` still omits `governorMult`** from the diagnostic `vt`, so `vt` cannot be
  used to reconstruct the realised speed while the governor is active. This instrument therefore
  reads the realised advance in `t` directly rather than trusting `vt`.
- The stale comments recorded in BRAKE-CENSUS-1 (`racePlanner.js:1235` "SIM-ONLY",
  `raceCore.js:578` "default OFF", the four stale windows in `docs/FORCE-MAP.md`) are still there.
