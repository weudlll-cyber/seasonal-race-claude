# GAP-BRAKE-RATE-1 — the brake now follows the gap's change, and it is WEAKER than the one it replaced

Branch `feat/gap-leader-brake`. **Shipped default stays OFF.** No merge, no tag, **nothing minted**.
Date: 2026-09-14. The owner's store was not opened.

---

## THE SHORT ANSWER

**The design was built exactly as he specified, and every property he named is measured and holds.**
The gate is still a size, the strength now follows the change, it rises on growth, falls on shrink,
never switches off at the allowance, reaches zero only with the gap, never exceeds 10%, never raises
a speed, and it does not oscillate.

**And it is worse at the job than the brake it replaced.** Measured at the SAME allowance and the
SAME window, the old size-based brake beats the new rate-based one on **all ten tracks** — pooled
worst race **−25.7%** against **−6.9%**, and per-race **83 better to 3**.

That is not a defect in his design. It is two things, and they are separable:

| | costs on ice-track seed 3 |
|---|---|
| **his 10% ceiling** instead of the engine's 15% | **≈ 9.5 px** |
| **the 1000 ms rate window's lag** | **≈ 9.8 px** |

With both matched, the new law lands within 4 px of the old one (148.7 vs 144.9 against an OFF arm
of 196.6). **The law is fine. The authority is the lever, and both halves of it are his call** —
10% is his own number, and the rate window is derived from an existing quantity as instructed.

**One number is mine to raise**: the rate window. At 200 ms instead of 1000 ms the brake is
measurably better everywhere it acts, with **no oscillation** — and the one race that got WORSE on
the shipped setting (space-sprint seed 2, +1.2%) turns into **−3.2%**. Section 3c has the sweep.

---

## STEP 1 — WHAT WAS BUILT

### What was kept, unchanged

| kept | where |
|---|---|
| the ENGAGE GATE on gap size (`gapPx > allowedPx`, strictly) | `racePlanner.js:_computeGapLeaderBrake` |
| the window START bound to `choreoOutcomeStart`, not a constant | same |
| the in-flight retarget that does not restart the ease (GAP-BRAKE-ARRIVAL-1) | `_retargetInFlight` |
| the `Math.min` fold, so the brake can never raise a speed | the servo loop |
| the existing `easeInOutCubic` / `trajectoryTransitionDuration` ease as the RATE LIMIT | `raceCore.js` |
| `TARGET_EPSILON` as the "would this even be written" test | `racePlanner.js` |

**No second transition mechanism was written.** Nothing here smooths, slews or eases a multiplier;
the command still travels on the one ease every target in the engine travels on.

### What was replaced — only the strength term

```
  engage (once)  S := ceiling * clamp((gap - allowance) / allowance, 0, 1)
  growing        S := min(ceiling, S + ceiling * dGap / allowance)
  shrinking      S := S * (gap / gapBefore)
  target         := 1 - S
```

### Where every number came from

| quantity | value | derived from |
|---|---|---|
| **ceiling** | 0.10 | **the owner's own, 2026-09-14.** The only free number the mechanism has. New key `gapBrakeMaxAuthority`, with a dev-screen control (everything must be UI-configurable). |
| **rise gain** | `ceiling / allowance` | the ceiling above and `gapBrakeAllowedGapPx`. One whole allowance of further growth buys the whole of the authority. No new number. |
| **fall gain** | `S / gap` | **not a gain at all** — the identity `dS/S = dGap/gap`. Zero parameters. This is what makes the strength proportional to the gap while it closes, so it reaches zero only when the gap does. |
| **rate window** | 1000 ms | `trajectoryTransitionDuration`, the ease this very brake's command already travels on — measure the change over exactly the interval the command needs to be delivered. Five times the 200 ms below which this project measured jitter to dominate. **No new number; but see section 3c — this choice has a measured cost.** |
| **release threshold** | `TARGET_EPSILON` | the setter's own epsilon, already named in the file. Not a second threshold. |

**Nothing was invented and nothing was stopped for.** Every quantity above is either his or already
in the tree.

### ★ The entry seed is the old law, used ONCE and never again

A gap can already be past the allowance when the window opens, having done its growing where this
mechanism was not watching. The seed credits exactly that growth at exactly the rise gain, which is
algebraically the old size ramp — so entry is continuous with the growth path (a gap crossing the
allowance from below seeds 0). It is an initial condition, not the law.

### ★★ The redesign, stated as the inequality that actually fixes the parking

On a gap that only ever GROWS the two laws **agree by construction** — both hand over the full
authority one allowance past the allowance. Nothing about a widening gap distinguishes them. They
part company the moment the brake starts WINNING:

```
  old (size ramp)   dS/S = dGap / (gap - allowance)
  new (this law)    dS/S = dGap /  gap
```

and `gap > gap - allowance` always. The new law surrenders **strictly less** of its strength for
every pixel it closes, and surrenders **none** of it at the allowance where the old law surrendered
all of it. That is why an equilibrium above the allowance is no longer structurally guaranteed —
which is the thing he was objecting to. It is pinned by a test, and that test is sabotage-proven
(section 5).

Measured consequence: the new brake **pulls for nearly twice as long** per firing race — 8.84 s
against the old law's 4.94 s — at two thirds of the peak authority.

---

## STEP 2 — THE BEHAVIOUR, PER PHYSICS STEP

Instrument: the real engine through `scripts/lib/raceDriver.mjs`, sampling the brake's own read-only
telemetry every physics step. Identity: n=40, the shipped roster, each track's own default racer,
`wild`, allowance 90 px, window end 0.95, ceiling 10%.

**Fixture cross-check.** On ice-track seed 3 the OFF arm's in-window maximum is **196.63 px** — the
same number GAP-BRAKE-ARRIVAL-1 reported for that race. Eight of the ten per-track OFF maxima match
that block's OFF column exactly (to 0.1 px); the two that do not are ice-track (206.3 here, 205.9
there) and mountainstreet (147.2 here, 160.2 there). **The label differs even where the numbers
agree** — that block's column is headed "0.600 → finish" while this one is the brake's own window,
which on these tracks resolves to 0.600–0.95 — so the two ranges are not the same question and the
agreement on eight tracks says only that the OFF FIXTURE is the same race. That is all it is claimed
for here. The ON-arm comparison against the old law in section 3b uses a control run with this same
instrument rather than that block's published numbers, for exactly this reason.

### ice-track seed 3 (his own race) — ON

| | |
|---|---|
| engaged | 658 steps, 10.53 s, one episode, p=0.817 → 0.950 |
| the brake's command was the value **obeyed** | 496 of those 658 steps |
| gap | 91.3 → **167.7** → 72.3 px |
| peak strength | **0.0800** at gap 161.9 |
| **in-window maximum** | **196.6 (OFF) → 167.7 (ON), −28.9 px, −14.7%** |
| RISES on growth — violations | **0** |
| FALLS on shrink — violations | **0** |
| sustained phases (≥500 ms of one sign), wrong direction | **0 of 2** |
| ceiling breaches | **0** |
| written target above the brake's own command | **0** |
| `held − target` | median **0.000000**, p90 0.0727, max 0.0751 |

### space-sprint seed 2 — ON

| | |
|---|---|
| engaged | 574 steps, 9.18 s, one episode, p=0.744 → 0.897 |
| gap | 92.5 → **172.3** → 0.3 px |
| peak strength | **0.0774** at gap 159.6 |
| **in-window maximum** | **170.3 (OFF) → 172.3 (ON), +2.0 px, +1.2%** ← **this race got WORSE** |
| RISES / FALLS violations | **0 / 0** |
| ceiling breaches | **0** |
| written target above the brake's own command | **1 step, by 7.2 × 10⁻⁵** (below) |

### The four questions, answered

**1. It never exceeds 10%.** Zero breaches on either race; across the whole 300-race sweep the
deepest strength anywhere is **0.100000** and breaches are **0**.

**2. It never raises a speed — zero violations.** One step on space-sprint (k=2805) wrote a target
**7.2 × 10⁻⁵ above the brake's own command**, and it is not the brake doing it: on that step the
SERVO was the binding constraint, and the engine's pre-existing `TARGET_EPSILON` (0.001) declined to
write a change that small, leaving the servo's own previous target standing. The value left standing
is what the OFF arm would have written. Nothing was raised.

*(Two further steps looked like violations under a cruder measurement and are not: reading "the
leader" after a physics step reads a different racer than the controller acted on whenever the lead
changes mid-step. The measurement now uses the brake's own `bindingIdx`.)*

**3. It reaches zero only when the gap is closed.**

| | ice-track seed 3 | space-sprint seed 2 |
|---|---|---|
| strength when the gap came back **below the allowance** | **0.0582 — 58% of the ceiling** | **0.0559 — 56%** |
| what the OLD law would have had there | **exactly 0** | **exactly 0** |
| what happened next | ★ **cut off by the window end** at p=0.9499 with S still 0.0506 | faded to 0.0145 at gap 0.3 px over 2.59 s, then released on a lead change |

★ **Named because it is a real edge and it is not the fade's fault.** On ice-track seed 3 the brake
was still holding 5% authority when progress crossed 0.95 and the window shut it off. The ease
absorbs it over 1000 ms, and Step 4 shows the resulting move is still smaller than the servo's own —
but the fade he asked for did not get to finish there. Window end 0.95 is his setting.

**4. The engage gate still holds.** Across all 300 sweep races the smallest gap at which the brake
ever **ENGAGED** is **90.001 px** against an allowance of 90 — it never engaged below it, on any
track, on any seed. The smallest gap at which it still **wrote** a command is 0.002 px, and that is
the fade following the gap down, by design, after engaging legitimately. The two are different
questions and the telemetry reports them separately (`minEngageGapPx` / `minFiringGapPx`).

### The decision rule: **it does not oscillate**

| race | worst 1 s window | largest 1 s peak-to-trough swing |
|---|---|---|
| ice-track seed 3 | **1 direction change** | 0.0291 (29% of ceiling) — on a monotone rise, not a swing |
| space-sprint seed 2 | **1 direction change** | 0.0397 (40%) — likewise |

One direction change per second is the single turn from growing to shrinking. There is no chatter to
report and nothing was damped away. Checked again at a 200 ms rate window (section 3c): still one.

---

## STEP 3 — THE SWEEP

Ten tracks, seeds 1–30, 40 racers, the shipped roster, `wild`, allowance 90 px, window end 0.95,
ceiling 10%. Both arms, same seeds. **300 race pairs, 0 unfinished.**

### ★ The noise floor first, because it is the scope check

**163 of 300 pairs never fired. All 163 are byte-identical** — same finishing order, same 40 finish
times to the millisecond, same window-restricted maximum. **0 leaked. The change did not act outside
its scope.**

*(This check was wrong on my first pass and is worth recording: it compared `finishTime`, which
exists only on the projected result object raceCore builds for the UI, not on the live racer. Every
value was `null`, so every pair compared identical and the check proved nothing — it also hid 21
winner changes. The field is `finishTimeMs`. Corrected, re-run, and the numbers below are from the
corrected run.)*

### The largest lead from the window start to the finish — WORLD PX

| track | med OFF→ON | p90 OFF→ON | max OFF→ON | Δ max | Δ% |
|---|---|---|---|---|---|
| city-circuit | 154.3 → 153.7 | 189.2 → 182.8 | 208.1 → **203.6** | −4.5 | −2.2% |
| dirt-oval | 123.2 → 123.2 | 178.1 → 172.6 | 242.9 → **211.9** | **−31.0** | **−12.8%** |
| garden-path | 131.5 → 131.5 | 174.6 → 174.6 | 186.9 → 186.9 | 0.0 | 0.0% |
| ice-track | 145.4 → 145.4 | 205.7 → 194.7 | 214.8 → 214.8 | 0.0 | 0.0% |
| luger-hill | 113.4 → 113.4 | 155.0 → 154.7 | 244.4 → **227.6** | **−16.8** | **−6.9%** |
| mountainstreet | 103.7 → 103.7 | 142.0 → 142.0 | 162.9 → 162.9 | 0.0 | 0.0% |
| river-run | 84.6 → 84.6 | 150.4 → 147.7 | 157.5 → 156.8 | −0.6 | −0.4% |
| searound | 121.8 → 121.8 | 191.9 → 181.1 | 241.1 → 241.1 | 0.0 | 0.0% |
| seatrack | 133.0 → 133.0 | 188.9 → 183.0 | 207.1 → **201.9** | −5.2 | −2.5% |
| space-sprint | 144.0 → 144.0 | 185.8 → 178.7 | 279.6 → 279.6 | 0.0 | 0.0% |

### Split: window start → 0.95 (the brake's own window)

| track | med OFF→ON | p90 OFF→ON | max OFF→ON | Δ max | Δ% |
|---|---|---|---|---|---|
| city-circuit | 95.1 → 95.1 | 169.5 → 167.4 | 208.1 → **201.5** | −6.6 | −3.2% |
| dirt-oval | 103.7 → 103.7 | 177.6 → 170.2 | 242.9 → **211.9** | **−31.0** | **−12.8%** |
| garden-path | 80.7 → 80.7 | 153.2 → 152.6 | 182.3 → 178.9 | −3.3 | −1.8% |
| ice-track | 78.5 → 78.5 | 156.0 → 154.7 | 206.3 → **193.5** | **−12.8** | **−6.2%** |
| luger-hill | 93.0 → 93.0 | 155.0 → 154.7 | 244.4 → **227.6** | **−16.8** | **−6.9%** |
| mountainstreet | 72.7 → 72.7 | 121.4 → 121.4 | 147.2 → 147.2 | 0.0 | 0.0% |
| river-run | 60.4 → 60.4 | 125.1 → 124.8 | 157.5 → 156.8 | −0.6 | −0.4% |
| searound | 103.9 → 103.6 | 172.1 → 160.1 | 216.4 → **182.2** | **−34.2** | **−15.8%** |
| seatrack | 79.1 → 79.1 | 152.6 → 152.2 | 207.1 → **201.9** | −5.2 | −2.5% |
| space-sprint | 101.7 → 100.6 | 169.2 → 169.4 | 196.5 → **178.0** | **−18.5** | **−9.4%** |

**Falls on 9 tracks, unchanged on 1 (mountainstreet), rises on none.**

### Split: 0.95 → finish (past the window; the brake cannot act here)

The maximum is **unchanged on 9 of 10 tracks** and falls 9.7 px on luger-hill (a knock-on, not an
action — nothing is commanded past 0.95). Medians move both ways by a few px. **On ice-track,
space-sprint, searound and garden-path the race's biggest lead happens AFTER the window closes** —
which is GAP-BRAKE-HANDOVER-1's finding standing unchanged, and it is why four tracks show a fall
inside the window and none outside it.

### How often it fires, for how long, how deep, and what it changed

| track | fired | pulling s med/max | deepest S | smallest ENGAGE gap | byte-identical | winner changed |
|---|---|---|---|---|---|---|
| city-circuit | 17/30 | 11.06 / 16.05 | 0.10000 | 90.01 | 21/30 | 2 |
| dirt-oval | 17/30 | 10.94 / 22.32 | 0.10000 | 90.02 | 21/30 | 5 |
| garden-path | 13/30 | 9.09 / 16.58 | 0.08829 | 90.04 | 26/30 | 2 |
| ice-track | 13/30 | 11.18 / 18.13 | 0.09460 | 90.02 | 22/30 | 3 |
| luger-hill | 16/30 | 8.51 / 16.75 | 0.10000 | 90.03 | 24/30 | 3 |
| mountainstreet | 6/30 | 4.17 / 9.60 | 0.04566 | 90.10 | 30/30 | 0 |
| river-run | 8/30 | 8.06 / 13.14 | 0.06621 | 90.02 | 28/30 | 0 |
| searound | 18/30 | 9.42 / 19.17 | 0.09074 | 90.00 | 24/30 | 1 |
| seatrack | 13/30 | 8.29 / 12.29 | 0.10000 | 90.00 | 23/30 | 3 |
| space-sprint | 16/30 | 7.64 / 14.58 | 0.09376 | 90.00 | 22/30 | 2 |

**Pooled: fires in 137 of 300 races. 241 of 300 byte-identical. 21 winner changes** — all inside
firing races, none in a race the brake never touched.

### Pooled

| | OFF | ON |
|---|---|---|
| window → finish: med / p90 / max | 121.5 / 178.9 / 279.6 | 120.7 / 174.6 / 279.6 |
| **window → 0.95: med / p90 / max** | 82.7 / 159.3 / **244.4** | 82.7 / 156.2 / **227.6** |

**50 races improved, 2 got worse, 248 unchanged.**

### ★ Canvas widths

Taken **only against the SETTLED value of `LEADER_ZOOM`, 225 px per width** (ZOOM-PER-STATE-1:
LEADER_ZOOM settles at exactly 225.0, and it is the reference shot he judged against). No figure
here uses a live frame zoom.

| | OFF | ON |
|---|---|---|
| window → 0.95, worst race | 1.086 widths | **1.012 widths** |
| window → 0.95, p90 | 0.708 | 0.694 |
| the allowance itself | — | 0.400 widths |

### The plain sentence, against the OFF arm

**Yes, the in-window maximum improved: the worst race in 300 falls from 244.4 px to 227.6 px, −16.8
px or −6.9%; the p90 falls 159.3 → 156.2; the median does not move** (73% of races never open a lead
past the allowance at all, so the median race is untouched by construction — the brake acts on the
tail).

### The plain sentence, against the previous size-based brake

**It is worse, on every track.** Control arm: the same instrument pointed at commit `204dd30c` (the
size law with the arrival fix), run at the SAME allowance of 90 px and the SAME window end of 0.95,
so the only differences are the law and the ceiling it derives (`1 − minMult` = 0.15).

**The OFF arm of both sweeps agrees on 300 of 300 races, to 0.00e+0 px.** The control is sound.

| track | OFF | OLD size law | NEW rate law | NEW − OLD |
|---|---|---|---|---|
| city-circuit | 208.1 | **181.7** | 201.5 | +19.9 |
| dirt-oval | 242.9 | **174.6** | 211.9 | +37.3 |
| garden-path | 182.3 | **165.8** | 178.9 | +13.1 |
| ice-track | 206.3 | **156.0** | 193.5 | +37.6 |
| luger-hill | 244.4 | **181.4** | 227.6 | +46.2 |
| mountainstreet | 147.2 | **140.1** | 147.2 | +7.1 |
| river-run | 157.5 | **146.2** | 156.8 | +10.6 |
| searound | 216.4 | **162.5** | 182.2 | +19.7 |
| seatrack | 207.1 | **172.7** | 201.9 | +29.2 |
| space-sprint | 196.5 | **159.6** | 178.0 | +18.4 |

**Pooled worst race: OFF 244.4 → OLD 181.7 (−25.7%) → NEW 227.6 (−6.9%).**
**Per-race head to head: OLD better on 83, NEW better on 3, identical on 214.**

### 3c — WHY, and the one lever I can still move

The law is not the problem. Two authority terms are, and both are separable — measured on ice-track
seed 3, whose OFF arm is 196.6 px:

| arm | in-window max | vs OFF |
|---|---|---|
| OLD size law, its own 0.15 ceiling | **144.9** | −26.3% |
| NEW rate law, **0.15** ceiling, **200 ms** window | **148.7** | −24.4% |
| NEW rate law, 0.15 ceiling, 1000 ms window | 158.2 | −19.5% |
| NEW rate law, **0.10** ceiling, **200 ms** window | 157.9 | −19.7% |
| **NEW rate law, 0.10 ceiling, 1000 ms window (as shipped here)** | **167.7** | **−14.7%** |

**With the ceiling and the rate window matched, the new law lands within 4 px of the old one.** The
law is fine. The 23 px between them is his 10% ceiling (≈9.5 px) and the 1000 ms lag (≈9.8 px), and
they add.

**The ceiling is his and I have not touched it.** The rate window is mine, and it is the one number
I derived rather than received. I chose `trajectoryTransitionDuration` (1000 ms) because it is the
ease this brake's own command already travels on — a real derivation, and five times the 200 ms
jitter floor. But an exponential filter lags a moving signal by `rate × τ`, and on a gap opening at
27 px/s that is 27 px of allowance the brake never sees. **The shorter window costs nothing in
stability**: at 200 ms both witness races still show exactly one strength direction change per
second, same as at 1000 ms.

**On the sweep, at 200 ms** — the full ten tracks × 30 seeds, same instrument, same OFF arm
(which agrees with the 1000 ms sweep's on 300 of 300 races to 0.00e+0 px):

| track | OFF | 1000 ms (shipped here) | **200 ms** | Δ |
|---|---|---|---|---|
| city-circuit | 208.1 | 201.5 | **195.9** | −5.7 |
| dirt-oval | 242.9 | 211.9 | **206.6** | −5.3 |
| garden-path | 182.3 | 178.9 | **174.1** | −4.8 |
| ice-track | 206.3 | 193.5 | **176.0** | **−17.6** |
| luger-hill | 244.4 | 227.6 | **208.3** | **−19.3** |
| mountainstreet | 147.2 | 147.2 | **146.5** | −0.7 |
| river-run | 157.5 | 156.8 | **154.8** | −2.0 |
| searound | 216.4 | 182.2 | **173.7** | −8.5 |
| seatrack | 207.1 | 201.9 | **189.6** | **−12.3** |
| space-sprint | 196.5 | 178.0 | **170.3** | −7.7 |

**Better on all ten tracks. Pooled worst race 244.4 → 208.3, −14.8% against −6.9%. Per race, 63
better to 1.** And the regressions clear up: at 1000 ms **two** races ended with a bigger in-window
lead than the OFF arm (space-sprint#2 170.3→172.3, luger-hill#20 by under 0.1 px); at 200 ms only
the luger-hill sub-0.1 px one remains.

Everything else is unchanged by the shorter window: it fires in the same **137 of 300** races, pulls
for the same mean **8.87 s** (against 8.84), the smallest ENGAGE gap is still **90.001 px**, the
deepest strength is still exactly **0.100000**, the noise floor is still **163 never fired, 0
leaked**, and the oscillation count on both witness races is still **one direction change per
second**.

**It is not mine to pick.** 200 ms is the number this project measured the jitter floor at, but
there is no existing quantity in the physics that *means* 200 ms for this purpose — the nearest,
`laneTargetEaseMs`, belongs to lateral steering and reusing it would couple two unrelated
mechanisms. So I am reporting it rather than inventing it. **If he wants the shorter window it should
become its own key with its own home**, the way the ceiling did.

---

## STEP 4 — IS IT VISIBLE

Largest single-step change of the LEADER's realized `trajectoryMult`, per track, over all 30 seeds.

| track | OFF max | ON max | Δ | ON exceeds OFF? |
|---|---|---|---|---|
| city-circuit | 0.011750 | 0.011750 | 0.000000 | no |
| dirt-oval | 0.011733 | 0.011712 | −0.000021 | no |
| garden-path | 0.011658 | 0.011658 | 0.000000 | no |
| ice-track | 0.011454 | 0.011442 | −0.000013 | no |
| luger-hill | 0.011644 | 0.011644 | 0.000000 | no |
| mountainstreet | 0.011721 | 0.011721 | 0.000000 | no |
| river-run | 0.011748 | 0.011748 | 0.000000 | no |
| searound | 0.011662 | 0.011662 | 0.000000 | no |
| seatrack | 0.011387 | 0.011387 | 0.000000 | no |
| space-sprint | 0.011584 | 0.011584 | 0.000000 | no |

**The brake's own largest move never exceeds what the servo already makes without it — on 0 of 10
tracks, and on none of the 137 races it actually fired in** (ON 0.011712 against those same races'
OFF arm at 0.011733). His standing rule that nothing may be abrupt is not threatened: the biggest
step the brake produces is *smaller* than the biggest step already in the race, because the brake's
command rides the same 1000 ms ease every other target rides and the command itself moves by a
fraction of a thousandth per step.

**The one place to watch anyway** is the window end. On ice-track seed 3 the brake still held 5%
authority when progress crossed 0.95 and was switched off there; the ease spreads that over a
second, and the table above says the result is still within the servo's own envelope — but it is a
release the fade did not choose, and it is the thing to look for on that race.

---

## STEP 5 — FINGERPRINTS AND CHECKS

### engine-reach, with the changed paths passed explicitly

```
node scripts/engine-reach.mjs --check <the 7 changed paths>
ENGINE REACH: 4 of 7 path(s) can change the race:
  client/src/modules/racePlanner.js
  client/src/modules/raceCore.js
  client/src/modules/raceDynamicsConfig.js
  client/src/modules/storage/defaults.js
```

The dev-screen section and the two test files are outside the hull, as expected.

### All four fingerprints, measured with the key OFF — none moved

| role | record | measured | |
|---|---|---|---|
| world | `b35cf477c09a1116` | `b35cf477c09a1116` | unchanged |
| world-off | `19ccb497041a0dae` | `19ccb497041a0dae` | unchanged |
| camera | `3df640a42e934312` | `3df640a42e934312` | unchanged |
| render | `6a84085e79535dd6` | `6a84085e79535dd6` | unchanged |

**The default really is off.** **Nothing was minted.**

### Tests, and the sabotage proof of each

`client/src/modules/gapLeaderBrake.test.js` — **18 tests, all green.** The four properties he asked
to be pinned, and the mutation each one is proven against by actually applying it to the source and
re-running:

| # | the property | the test that pins it | sabotage applied | that test went RED |
|---|---|---|---|---|
| 1 | **strength RISES on a growing gap** | `★ RISES for as long as the gap keeps growing` | freeze the growth branch (`S := S`) | **YES** (5 tests red) |
| 2 | **it FADES rather than switching off on a shrinking gap** | `★ FADES on a shrinking gap instead of switching off at the allowance` | restore the old law's release: `if (gap <= allowance) release()` | **YES** (2 red) |
| 3 | **the ENGAGE GATE** | `★ NEVER ENGAGES on a gap at or below the allowance, swept across the whole window` | relax the gate to a fifth of the allowance | **YES** (2 red) |
| 4a | **the 10% CEILING is his, not the engine's** | `★ NEVER exceeds the owner's ceiling, however hard the gap is driven` | clamp to `1 - minMult` (0.15) instead of his key | **YES** (2 red) |
| 4b | **no speed is ever raised** | `★ keeps the harder SERVO pull when the brake asks for less` | replace the fold's `Math.min` with a plain override | **YES** (1 red) |
| ★ | **the give-back is smaller than the old law's** | `★ gives back LESS authority per pixel closed than the size law did` | restore the size law's ratio `dGap / (gap - allowance)` | **YES** (3 red) — *after the fixture was corrected; see below* |

Each mutation was applied to `racePlanner.js`, the file was re-run, and the source reverted; the
suite was confirmed green before and after the whole sequence. **Every sabotage turns its own named
test red** — not merely *some* test, which is the check that separates a fixture that works from one
that happens to fail.

**The two fixture roles are named in the file's header**, because getting them wrong is how a test
in this very file once passed under sabotage: `drawnWinner` puts the racer the plan drew to finish
first in the lead, so the servo asks for ~1.0 and the BRAKE is the binding constraint (needed by
every assertion about the brake's own strength); `deepField` puts a racer drawn to finish deep in
the lead, so the servo saturates at `minMult` and asks for 0.85 while the brake asks for ~0.999
(needed by 4b — with a drawn winner, `Math.min` and an override are indistinguishable and the
mutation is invisible).

### `npm run verify`

**PASS 22, FAIL 1, SKIP 11** — 383.6 s, measured on the committed tree.

| failure | address | classification |
|---|---|---|
| `check-index` — "1 report in reports/night not referenced from INDEX.md: GAP-BRAKE-RATE-1.md" | this report, newly written | **(a) a legitimately moved input.** A new report needs an index line; the guard exists to catch exactly the omission it caught. Line added, `check-index` re-run: **0 unindexed, 671 links, 0 dangling.** |

**No (b) findings. Nothing unclassifiable. The hand-over is not blocked.**

The run also re-measured three of the four fingerprints independently of my own run above, and they
agree: world `b35cf477c09a1116`, camera `3df640a42e934312`, render `6a84085e79535dd6`. The client
suite (185.7 s) and the script suite (155.6 s) both pass.

*(GAP-BRAKE-ARRIVAL-1 recorded `check-index` catching the same omission from the same author. It is
the second time; the guard is earning its place.)*

### ★ One of my own tests did not separate its own sabotage

The test that pins the redesign — "gives back LESS authority per pixel closed than the size law did"
— took the size-law reference on the **raw** gap while the mechanism reads the **smoothed** one. The
smoothed gap lags a shrinking raw gap, so the reference was the larger number and the comparison
passed for the wrong reason: **under the sabotage that restores the old ratio, it stayed GREEN.**
Both ratios now come off the smoothed gap and the comparison is restricted to gaps well above the
allowance where the two differ by at least 4.3×. Re-proven after the correction.

That is the second time in this file's history that a fixture has passed under sabotage, and the
first case (a leader drawn to win, so `Math.min` and an override agree) is now written into the
file's header as a standing hazard with the two fixture roles named.

---

## STEP 6 — FOR HIS EYE

<!--BUILD-->

---

## SOURCE HYGIENE

| | before | after |
|---|---|---|
| `racePlanner.js` | 1695 | 1845 |
| the brake function itself | 69 lines (43 comment) | 174 lines (98 comment, 69 code) |
| `gapLeaderBrake.test.js` | 306 | 454 |

**Removed:** the size ramp (`clamp((gapPx - allowedPx) / allowedPx, 0, 1)`) and its derivation of
the authority from `1 - minMult`; the stale "full strength is reached at twice the allowance" claim
in the dev-screen tooltip; two dev-screen tooltips that stated config values whose one home is
`defaults.js`.

**Reused rather than written:** the engage gate, the window binding, `_retargetInFlight`, the
`Math.min` fold, `TARGET_EPSILON`, `clamp`, the `easeInOutCubic` transition and its duration, and
`DEFAULT_RACE_DYNAMICS_CONFIG` as the fallback home for both new plan fields. **No helper was
written that the tree already had.**

**Added:** one config key (`gapBrakeMaxAuthority`, his 10%) with its validator, its dev-screen
control and its reset; two plan fields; six closure-scoped state variables; four read-only telemetry
fields. The code half of the brake function grew from 26 lines to 69.

**Noticed and left alone:**

- **`scripts/sim-fairness.mjs` still cannot exercise this brake.** It reaches `createRacePlan` but
  never passes `pathLengthPx`, so the mechanism returns before it reads anything. GAP-BRAKE-SWEEP-1
  recorded the same thing and declined to wire it; I have declined too, for the same reason — it is
  a source change to a parity instrument and belongs to a piece of its own. Every number in this
  report comes from the real engine through `scripts/lib/raceDriver.mjs`, which is what the three
  preceding blocks used.
- The stale comments BRAKE-CENSUS-1 recorded (`raceCore.js` "default OFF", the four stale windows in
  `docs/FORCE-MAP.md`) are still there. Untouched.
- `docs/CONCEPT-COHESION.md` describes this mechanism as the bounded fallback. Its description is
  still accurate under the new law and was not edited.
