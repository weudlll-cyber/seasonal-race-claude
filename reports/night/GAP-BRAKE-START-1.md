# GAP-BRAKE-START-1 — the allowance does not decide when the brake starts, and never did

Branch `feat/gap-leader-brake`. **Read-only: no source changed, nothing minted, nothing merged.**
Date: 2026-09-14. The owner's store was not opened.

---

## THE SHORT ANSWER

**Both (A) and (B) are true, and they are two halves of one measurement. (B) is the rule; (A) is the
size of the loss.**

**(B) — the allowance does not decide the start.** The fold is
`Math.min(rawTarget, gapBrake.target)` ([racePlanner.js:1378](../../client/src/modules/racePlanner.js#L1378)),
so the brake is invisible until its command undercuts what the racer's own servo is *already asking
for*. On his race that ask stands at **0.94964 — a 5.04% pull — for the whole stretch in question**.
Neither law's allowance has anything to do with it. The **effective** bite thresholds are
**166.3 px (size law, allowance 124)** and **160.9 px (rate law, allowance 90)**.

**(A) — where the 34 px went.** The allowance moved the start 34.0 px earlier. The rate law gave
**29.4 px of it straight back**, and the measurement splits that:

| | px |
|---|---|
| allowance moved the start earlier | **−34.0** |
| shallower ramp gain (ceiling 0.15 → 0.10) gave back | +3.7 |
| **the 1000 ms rate window's LAG gave back** | **+25.7** |
| **net, predicted** | **−4.6** |
| **net, measured** | **−5.4** |

**The plain sentence: yes, the brake starts earlier — by 0.29 s, not by the 1.47 s the allowance
change implies. 80.4% of it was absorbed.** (N = 1 race for the step figures; a four-race paired
check in section 6 gives a median of 7.7 px / the same order.)

**★ And the premise of (B) needs correcting.** "The servo already pulls harder" is true of the
TARGET and false of the RACE. Over the 925 in-window steps Flare leads, the servo asks for a
slowdown on **925 of 925** — and he is running **ABOVE** natural speed on **593** of them
(median held **1.01755** against a median ask of **0.94964**). The servo is not pulling harder; it is
*asking* for more and never delivering it, and `Math.min` compares the asks. Section 3 has why.

---

## STEP 1 — THE RACE, AND THE PROOF IT IS HIS

ice-track, Quick Test seed 3, 40 racers, `wild`.

**The inputs are taken from the Quick-Test path, not assumed.** The field is filled from
`resolveNameSet(quickTestNameSet)` ([SetupScreen.jsx:1009](../../client/src/screens/SetupScreen/SetupScreen.jsx#L1009)),
which defaults to `DEFAULT_NAME_SET` → `QUICK_TEST_NAMES`
([SetupScreen.jsx:629](../../client/src/screens/SetupScreen/SetupScreen.jsx#L629)); the racer type is
`track.defaultRacerTypeId || 'horse'` ([SetupScreen.jsx:1000](../../client/src/screens/SetupScreen/SetupScreen.jsx#L1000))
= **snowmobile**; the seed is the typed field value
([quickTestSeed.js:98](../../client/src/screens/SetupScreen/quickTestSeed.js#L98)) = **3**; laps come
from the track record (**closed, `defaultLaps` 2**). `raceDriver.buildRace` reproduces all four, and
the one input that differs — `requestedSeconds` — **is not read for a closed track**
([durationModel.js:184](../../client/src/modules/durationModel.js#L184)), so it cannot matter here.

### The proof, before anything was read out of the race

| check | result |
|---|---|
| my per-step loop vs `raceDriver.runRace` (OFF arm) | **40/40 positions AND finish times identical**, largest difference 0 ms |
| OFF arm on the `204dd30c` tree vs the working tree | **40/40 identical** — the control both laws are measured against is the same race |
| OFF finish order, first 8 | **Flare Bolt Apex Breeze Orbit Pixel Surge Nova** |
| what QUICKTEST-ICE-3 recorded for the OFF arm | **Flare, Bolt, Apex, Breeze, Orbit, Pixel, Surge, Nova** — identical |
| widest IN-WINDOW lead (OFF), step 4290, t=68.64 s, p=0.9256, gap 196.6 px | **1st Flare, 2nd Raven** — the detail QUICKTEST-ICE-3 used to identify the field |

**It is his race.** Window resolved to **0.600–0.950**; `pathLengthPx` 6065.45. The first racer
finishes at step 4667 (p=0.9998), so **nobody has finished inside the window** and every in-window
gap is leader→2nd of the whole field.

*(Correction to my own previous block, found here: GAP-BRAKE-RATE-1's "0.95 → finish" column is
contaminated by exactly that effect — past p=0.95 racers finish, and `active[0]` becomes whoever is
left, so the 213.1 px I reported for ice-track in that column is a gap between two stragglers, not a
lead. The primary "window → 0.95" column is unaffected, for the reason in the paragraph above.)*

### Who the leader is, and it matters

Flare is **drawn rank 1** and is **cast as a comebacker** (`getHeroRoles()`), and his curve carries
no `releaseAt`, so he is not a HELD hero and his steering target comes from
`sampleHeroCurve(heroCurve, phaseProgress)`
([racePlanner.js:1273](../../client/src/modules/racePlanner.js#L1273)), not from his drawn place.

---

## STEP 2 — WHEN DOES EACH ONE FIRST BITE

Three moments, per law. World px is primary; canvas widths are taken **only against the SETTLED
`LEADER_ZOOM` value of 225 px per width** (ZOOM-PER-STATE-1 measured that state at exactly 225.0
when settled), never a transient frame zoom.

### SIZE law — allowance 124 px, window end 0.95, floor 0.85

| moment | step | t | p | gap |
|---|---|---|---|---|
| gap first exceeds the allowance | 3868 | 61.89 s | 0.8386 | **124.4 px** (0.553 widths, LEADER_ZOOM) |
| brake first COMMANDS a slowdown | 3870 | 61.92 s | 0.8391 | 125.5 px (0.558) — command 0.99885 |
| **race first actually CHANGES** | **3961** | **63.38 s** | **0.8599** | **165.3 px** (0.734) |

**Delay from allowance to race-changes: 93 steps = 1.49 s**; the gap had to grow a further **40.9 px**.

### RATE law — allowance 90 px, window end 0.95, ceiling 10%, 1000 ms rate window

| moment | step | t | p | gap |
|---|---|---|---|---|
| gap first exceeds the allowance | 3776 | 60.42 s | 0.8161 | **90.1 px** (0.400 widths, LEADER_ZOOM) |
| brake first COMMANDS a slowdown | 3781 | 60.50 s | 0.8173 | 91.3 px (0.406) — command 0.99884 |
| **race first actually CHANGES** | **3943** | **63.09 s** | **0.8560** | **160.6 px** (0.714) |

**Delay from allowance to race-changes: 167 steps = 2.67 s**; the gap had to grow a further **70.5 px**.

### The comparison that answers the owner

| | SIZE | RATE | difference |
|---|---|---|---|
| gap crosses the allowance | 61.89 s | 60.42 s | **1.47 s earlier** |
| brake first commands | 61.92 s | 60.50 s | 1.42 s earlier |
| **race actually changes** | **63.38 s** | **63.09 s** | **0.29 s earlier** |

**1.18 s of the 1.47 s — 80.4% — is absorbed between commanding and mattering.**

---

## STEP 3 — WHAT THE BRAKE HAS TO BEAT, AND WHY IT IS NOT A SPEED

Flare leads on **925 of the 1635 in-window steps** (N = 1 race). With the brake OFF:

| | min | median | max |
|---|---|---|---|
| the servo's **TARGET** for him | 0.93998 | **0.94964** | 0.99034 |
| what he actually **HELD** | 0.95410 | **1.01755** | 1.09434 |

- the servo **asks** for a slowdown on **925 / 925** steps;
- he is running **above** natural speed on **593** of them;
- **both at once on 593 (64.1%)**.

**Why the ask never arrives.** `_setTarget` restarts the `easeInOutCubic` transition whenever the
target moves by more than `TARGET_EPSILON` (0.001), resetting `trajectoryMultPrev` to wherever the
multiplier is *now*. The servo's target carries a stochastic noise term of
`(rng() - 0.5) * 2 * 0.0008` ([racePlanner.js:1360](../../client/src/modules/racePlanner.js#L1360),
`DEFAULT_STOCHASTIC_NOISE = 0.0008` at
[racePlanner.js:108](../../client/src/modules/racePlanner.js#L108)) — **peak-to-peak 0.0016, which is
larger than the 0.001 epsilon.** So the servo re-triggers its own ease before it can travel:
measured, **192 restarts over those 925 steps, one every 4.8 steps**, and the observed stable-stretch
target band is 0.94921–0.95079 = **0.00158 wide**, the noise band exactly.

This is the pre-existing churn GAP-BRAKE-PARADOX-1 identified and GAP-BRAKE-ARRIVAL-1 explicitly
did not touch. **The gap brake escapes it** — once `brakeIsBinding` the target is moved by
`_retargetInFlight` without restarting the clock
([racePlanner.js:1387-1390](../../client/src/modules/racePlanner.js#L1387-L1390)) — which is precisely
why "the brake's command wins the `Math.min`" and "the race changes" happen on the same step.

**Where the 5.04% comes from, checked rather than assumed.** One rank of steering error is worth
`gain / nActive` = **2.0 / 40 = 0.05** exactly (`DEFAULT_CONTROLLER_PARAMS.gain = 2.0`,
[racePlanner.js:101](../../client/src/modules/racePlanner.js#L101); the target is
`clamp(1.0 + gain * (error / nActive) + noise, minMult, ceilFor)` at
[racePlanner.js:1372](../../client/src/modules/racePlanner.js#L1372)). Flare's authored curve still
places him **one rank behind where he actually is**, so the servo asks for 1.0 − 0.05 = **0.95**.
Measured median **0.94964** — the 0.00036 residual is the noise term. **The bar the gap brake must
clear is one rank of the leader's own choreography, and it is not a property of the gap at all.**

---

## STEP 4 — THE FIRST FIVE SECONDS

From each law's first real bite. "Advance vs OFF" is the same racer's `t` difference × `pathLengthPx`.

### SIZE law — from step 3961 (t = 63.38 s), Flare

| s | step | gap px | commanded | held | advance vs OFF |
|---|---|---|---|---|---|
| 0 | 3961 | 165.3 | 0.04964 | −0.01353 | −0.00 |
| 1 | 4024 | 168.8 | 0.05418 | 0.05418 | −7.82 |
| 2 | 4086 | 168.9 | 0.05425 | 0.05425 | −16.76 |
| 3 | 4149 | 168.9 | 0.05432 | 0.05432 | −20.95 |
| 4 | 4211 | 168.9 | 0.05437 | 0.05437 | −24.13 |
| 5 | 4274 | 169.0 | 0.05442 | 0.05442 | **−26.93** |

### RATE law — from step 3943 (t = 63.09 s), Flare

| s | step | gap px | commanded | held | advance vs OFF |
|---|---|---|---|---|---|
| 0 | 3943 | 160.6 | 0.04976 | −0.01813 | −0.00 |
| 1 | 4006 | 167.1 | 0.07219 | 0.07219 | −6.51 |
| 2 | 4068 | 163.7 | 0.07941 | 0.07941 | −19.39 |
| 3 | 4131 | 159.8 | 0.07972 | 0.07972 | −29.06 |
| 4 | 4193 | 156.1 | 0.07853 | 0.07853 | −36.08 |
| 5 | 4256 | 152.5 | 0.07693 | 0.07693 | **−42.62** |

**★ This is where (A) does NOT hold.** Once it bites, the rate law is not the slow one — it is
**deeper and faster**: 0.0794 against 0.0543 at two seconds, and it has taken **42.6 px** off the
leader at five seconds against the size law's **26.9 px**. Its gap is already **falling** (167.1 →
152.5) while the size law's has **parked** (168.8 → 169.0) — the give-back difference GAP-BRAKE-RATE-1
predicted, visible in five seconds of one race.

**The negative "held" at s = 0 is not an error:** the leader is still being *boosted* (held 1.0135 /
1.0181) at the instant the brake first undercuts the servo. That is the 5.04% ask that was never
delivered, sitting there to be collected.

---

## STEP 5 — HOW OFTEN IS IT SILENT BECAUSE THE SERVO'S ASK IS LOWER

Across the window, restricted to steps where the gap is **above that law's allowance** (N = 1 race).
The fold is read back off the written target: `written == command` → the brake's command is what the
racer got; `written < command` → the servo's ask was lower; `written > command` → `_setTarget`'s
epsilon declined to write.

| | SIZE law | RATE law |
|---|---|---|
| in-window steps | 1648 | 1658 |
| of those, gap above the allowance | **515** | **629** |
| brake's command won the `Math.min` | 334 (64.9%) | 461 (73.3%) |
| **servo's ask was lower — brake silent** | **179 (34.8%)**, over gaps **124.4 – 165.7 px** | **168 (26.7%)**, over gaps **90.1 – 160.6 px** |
| too small to be written | 2 (0.4%) | 0 |
| **EFFECTIVE BITE THRESHOLD** | **166.3 px** (0.739 widths, LEADER_ZOOM) | **160.9 px** (0.715 widths, LEADER_ZOOM) |
| against a configured allowance of | 124 px | 90 px |

**Cross-checked** against the controller's own `bindingIdx` on the rate arm: the written-target
method agrees on **628 of 629** steps, and `bindingIdx` alone puts the first bind at gap 160.6 px,
step 3943 — the same step.

**The size law's command had to be reconstructed** (the `204dd30c` build reports only a running
minimum), from its own law at
[racePlanner.js:766-771 of that tree](../../client/src/modules/racePlanner.js#L766) with
`minMult` 0.85. ★ The reconstruction is **one step behind** unless corrected — the controller runs at
the top of `stepRacePhysics` on the positions as they were *before* the step, while every row here
records positions *after* it. Uncorrected, a growing gap reads as "the written target is above the
brake's command" and silently mis-classifies binding steps as non-binding; it turned 334 brake wins
into 0. **Validated after correction against `gapsAtFire`, the controller's own list of the gaps it
fired at: 513/513 firing steps match row k−1, and 0 match row k.**

### Could a stronger brake have won earlier?

On every one of those silent steps the servo's ask was **above both laws' floors** — median 0.94964
against 0.85 (size) and 0.90 (rate). **A brake at full authority would have won on 179/179 and
168/168 respectively.** So the silence is *not* an unbeatable servo; it is purely that each law's
ramp had not yet reached 5.04%. **That is what makes (A) and (B) inseparable in effect and separable
in arithmetic**, which is the decomposition below.

---

## STEP 6 — THE VERDICT, WITH A NUMBER ON EACH

### The decomposition

The bar is 0.0504 authority. Each law reaches it by its own ramp:

| | gain | travel needed past the allowance | predicted bite | measured |
|---|---|---|---|---|
| SIZE | `0.15 / 124` = 0.001210 /px | 41.6 px of **raw** gap | 165.6 px | **166.3 px** |
| RATE | `0.10 / 90` = 0.001111 /px | 45.3 px of **SMOOTHED** gap | 135.3 px smoothed | at the bite: smoothed **135.2 px**, raw **160.9 px** |

**The 1000 ms window's lag at the bite is 160.9 − 135.2 = 25.7 px.** So:

```
  allowance moved the start earlier        −34.0 px
  shallower ramp gain (0.15 -> 0.10)        +3.7 px
  the 1000 ms rate window's LAG            +25.7 px
  ------------------------------------------------
  predicted net                             −4.6 px      measured  −5.4 px
```

The model closes to **0.8 px**.

### Which dominates

**(B) dominates as the RULE.** The allowance never set the start for *either* law: the size law's
effective threshold is 166.3 px against an allowance of 124, and the rate law's is 160.9 px against
an allowance of 90. Both are set by the servo's standing 5.04% ask. **Of the 34 px the allowance
bought, 29.4 px (86%) was never realised**, and of the 1.47 s, **1.18 s (80.4%)**.

**(A) dominates as the SIZE of that loss, and it is the rate window, not the ramp.** Of the 29.4 px
given back, **25.7 px (87%) is the 1000 ms rate window's lag** and 3.7 px (13%) the shallower ramp
gain. But (A)'s wording — "ramps so slowly that the early engagement buys nothing" — is wrong about
what happens *after* the bite: section 4 shows the rate law then ramps **faster and deeper** than the
size law and takes 58% more off the leader in five seconds.

### Does it generalise beyond his race?

A paired check, both laws on the same seeds, ice-track / dirt-oval / searound, seeds 1–10 (30 races
run; **N = 4** where **both** laws bit, which is the only set where the two thresholds can be
compared):

| race | SIZE effective | RATE effective | difference |
|---|---|---|---|
| ice-track 3 | 166.3 | 160.9 | −5.4 |
| dirt-oval 2 | 166.7 | 166.7 | −0.0 |
| dirt-oval 7 | 167.2 | 156.0 | −11.3 |
| searound 7 | 166.1 | 156.1 | −10.0 |

**The size law's effective threshold is 166.1–167.2 px — a 1.1 px range across three tracks** — while
its allowance is 124. The median difference is **−7.7 px** against an allowance difference of 34 px.
**N = 4 is a small paired set and is reported as such**; it is consistent with his race and not a
substitute for the 300-race sweep in GAP-BRAKE-RATE-1.

The servo's bar over the 21 of 30 races where it could be read has median **0.0502** authority
(min 0.0245, max 0.1003) — clustering near multiples of 0.05, which is one rank at `gain/nActive`.

### The plain sentence

**Does lowering the allowance to 90 px make the brake start earlier in the race? Yes — by 0.29 s on
his race, against the 1.47 s the allowance change implies. Four fifths of it is absorbed before the
race changes.** The four paired races give the same answer in distance rather than time — a median
of 7.7 px earlier against 34 px of allowance; **their time deltas were not measured and no figure is
offered for them.**

---

## THE ONE SENTENCE THE READING POINTS AT

**The rate window**: 25.7 px of the 29.4 px the rate law gives back is the 1000 ms filter's lag at
the moment of the bite (smoothed gap 135.2 px against a raw gap of 160.9 px, ice-track seed 3), which
is the same lever GAP-BRAKE-RATE-1 measured at −14.8% versus −6.9% on the ten-track sweep.

**No repair and no tuning was done. The rate window, the ceiling and the allowance are untouched,
no source file was changed, and nothing was minted.**

---

## WHAT THIS DOES NOT SETTLE

- **Why the servo asks for 5% and never delivers it is a defect in the SERVO, not in the brake**, and
  this block did not touch it. The 192 ease restarts over 925 steps are the pre-existing churn from
  GAP-BRAKE-PARADOX-1. Whether the noise term (0.0008) should be smaller than half the setter's
  epsilon (0.001), or the epsilon larger than the noise band, is an owner question with a one-line
  answer either way — **named, not proposed, and not built.**
- **The instrument cannot separate which term inside `rawTarget` is worth what** on steps where the
  arms have already diverged; the servo column is exact only before the divergence step (3961 for the
  size arm, 3943 for the rate arm), and every servo figure quoted above is taken from inside that
  stretch.
- **N = 1 race** for every step-level number, and **N = 4** for the paired threshold check.
