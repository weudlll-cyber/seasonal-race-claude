# COMEBACK-DEF-1 — the owner's comebacker: is it possible, and is it fair?

**Day chain 2026-09-08, piece 1 of 7** · branch `night/2026-09-07` · **unmerged, nothing minted.**

Measured against his definition of 2026-09-07 and nothing else: steered from ~15% as today · held
around rank 15–20 until ~70% · the real climb begins at ~70% · the existing speed limits stand · not
every race needs one.

---

## THE SHORT ANSWERS

| his question | answer |
|---|---|
| **Is the shape possible within the existing limits?** | **No.** A racer who drew **P1** and is held at rank ~16 to 70% finishes **8th–15th**, never near P1, while already spending **23–40% of the climb pinned at the speed ceiling**. |
| **Does the field size allow rank 15–20?** | **Yes on every track** — the smallest capacity is 72. But the shape *means a different thing* at each size; see the field-size table. |
| **Is it fair to the rest of the field?** | **The others are unharmed** — their band-reach moves by −1.6 to +3.7 pp, mostly upward. The cost falls on the held racer himself: **16.7–50.0%** band-reach against the field's ~45%. |
| **"Not every race needs one — he believes that is already the case."** | **It does not hold.** In **200/200** races, every race cast at least one comebacker. |

---

## 1 · AT SOURCE

| fact | where | value |
|---|---|---|
| heroes are cast | `heroCurveGenerator.js:376` `castHeroes()` | at the CHAOS→PULK boundary |
| how many | `heroCurveGenerator.js:32-33`, `:161` | `nHeroes = round(minHeroes + (maxHeroes − minHeroes) × intensity)`, `minHeroes: 2`, `maxHeroes: 4` |
| which role | `heroCurveGenerator.js:412` | `role = wr <= cr ? 'sovereign-lead' : 'comebacker'` — decided by post-chaos rank |
| extra attackers | `heroCurveGenerator.js:455-497` | a *separate* budget beyond `nHeroes` |
| choreo gate | `racePlanner.js:326` | `_choreoEnabled: true` — **unconditional**, there is no off switch |
| the drawn place | `racePlanner.js:202` | Fisher-Yates `targetRank 1..n`, **drawn at plan creation, before the race starts** |
| **★ the tempo clamp** | **`racePlanner.js:98-99`** | **`maxMult: 1.1`, `minMult: 0.85`** |
| where it is enforced | `racePlanner.js:891` | `clamp(1.0 + gain × (error / nActive) + noise, minMult, maxMult)`, `gain: 2.0` |

**The clamp is the whole feasibility question.** A racer's forward tempo is capped at **+10%** of its
own base speed and floored at **−15%**. Every line above was opened at that address before it was
written here.

### Every other bound on forward tempo

The shared t-update is
`r.t += baseSpeed × boost × brake × rowEnvMult × trajectoryMult × areaBonusMult × governorMult × dt`.
In the last 30% — the window his climb lives in — the others are not levers:

| factor | in the last 30%? |
|---|---|
| `trajectoryMult` | **yes — the only forward lever, capped at 1.10** |
| `areaBonusMult` | no — early-race, gated on phase boundaries |
| `governorMult` | no — written inside PULK only, 1.0 outside |
| `boost` (drafting) | situational, requires a racer to draft behind |
| `brake` | ≤ 1.0 — it can only slow him |
| `rowEnvMult`, `speedBonus` | start-row effects, not a late lever |

### ★ "Not every race needs one" — it does not hold

**200 races** (10 tracks × field 20 and 40 × 10 seeds), shipped arm, roles read from the plan's own
`getHeroRoles()`:

| | |
|---|---|
| races with **zero** comebackers | **0 of 200** |
| mean comebackers per race | **1.5 – 2.0** |
| mean heroes per race | **4.8 – 5.7** |

With 0 of 200, the 95% upper bound on the true zero-comebacker rate is about **1.5%**. It is
*structurally* possible — the role at `:412` depends on the draw — but it does not happen.

---

## 2 · THE ARITHMETIC, BEFORE ANY RACE RAN

At the ceiling, against a field at 1.0, the reachable distance over the last 30% is
`(maxMult − 1) × 0.30 × finishT = 0.030 × finishT`. Converting that to *places* needs the live
t-distribution, so it was measured: 10 seeds/track, snapshot at 70%.

**Best finishing place reachable from a given rank at 70% — mean over 10 races:**

| track | N=20 from 15 / 18 / 20 | N=40 from 15 / 18 / 20 |
|---|---|---|
| city-circuit | 2.7 / 6.0 / 9.5 | 1.0 / 1.2 / 2.3 |
| dirt-oval | 1.3 / 5.8 / 8.5 | 1.1 / 1.5 / 2.3 |
| garden-path | 3.2 / 6.7 / 9.7 | 1.1 / 1.8 / 1.9 |
| ice-track | 2.8 / 6.5 / 10.8 | 1.0 / 1.5 / 1.7 |
| luger-hill | 3.3 / 9.9 / 12.2 | 1.6 / 3.9 / 4.7 |
| mountainstreet | 3.5 / 9.3 / 12.5 | 1.2 / 1.4 / 1.8 |
| river-run | 2.0 / 7.5 / 11.8 | 1.1 / 1.8 / 2.0 |
| searound | 2.6 / 7.3 / 10.1 | 1.9 / 2.6 / 3.4 |
| seatrack | 4.2 / 9.4 / 12.6 | 1.1 / 1.4 / 2.3 |
| space-sprint | 4.7 / — / — | 1.1 / — / — |

**This is an upper bound and it is optimistic** — it assumes the whole field runs at exactly 1.0
while he runs flat out. Section 3 measures what actually happens, and the gap between the two is
large.

### ★ THE FIELD-SIZE GAP, sharper than "needs at least 20 racers"

| track | capacity | rank 15–20 is… |
|---|---|---|
| searound | **72** | mid-field at N=40; the **back** at N=20 |
| luger-hill | 125 | — |
| ice-track | 161 | — |
| dirt-oval | 189 | — |
| garden-path | 225 | — |
| city-circuit | 232 | — |
| seatrack | 470 | — |
| space-sprint | 1008 | — |
| river-run | 1080 | — |
| mountainstreet | 1092 | — |

Derived with `computeMaxRacersDefault` from each track's own geometry and default racer type.

**Every track allows ≥ 20**, so by capacity the shape is expressible everywhere. But the definition
does not mean the same thing at every size: at **N=20**, "rank 15–20" *is* the back of the field and
the reachable place is 6th–12th; at **N=40** it is mid-field and the arithmetic says the front is
reachable. **This is his gap to close, and it is not a scaling question — it is that one phrase
describes two different races.** No scaled version, percentage or fallback was invented.

---

## 3 · THE SHAPE, MEASURED

A temporary measurement arm held the racer **who drew P1** at rank 18 until 70%, then let go — after
which he steers to his drawn place exactly like anybody else. **The arm changed only which rank the
servo aims at; the multiplier still passed the identical `clamp(minMult, maxMult)`.** No speed limit
was relaxed in any arm.

**Field 40 · 30 races/track · same seeds as the shipped arm:**

| track | rank @70 | final | places gained | climb s | places/s | **clamp-pinned** |
|---|---|---|---|---|---|---|
| city-circuit | 15.9 | **12.6** | 3.3 | 29.3 | 0.11 | **32%** |
| dirt-oval | 15.5 | **15.3** | 0.2 | 32.6 | 0.01 | **39%** |
| garden-path | 16.7 | **9.7** | 7.0 | 26.6 | 0.26 | **37%** |
| ice-track | 16.8 | **12.1** | 4.7 | 27.8 | 0.17 | **34%** |
| luger-hill | 17.7 | **13.6** | 4.1 | 23.5 | 0.17 | **30%** |
| mountainstreet | 16.2 | **12.3** | 4.0 | 22.4 | 0.18 | **23%** |
| river-run | 15.5 | **12.4** | 3.1 | 22.8 | 0.13 | **25%** |
| searound | 16.2 | **8.1** | 8.1 | 23.9 | 0.34 | **40%** |
| seatrack | 16.3 | **11.1** | 5.2 | 22.4 | 0.23 | **26%** |
| space-sprint | 17.0 | **11.5** | 5.5 | 22.8 | 0.25 | **28%** |

The hold itself works — rank at 70% lands at **15.5–17.7**, inside his window.

### ★ THE FINDING

**He drew P1 and finishes 8th–15th.** On dirt-oval he gains **0.2 places** in the whole climb.

**And he is already at the ceiling for 23–40% of it.** The brief named this fork exactly: *if he must
be clamped to make the shape work, the shape is asking for the unnatural speed the owner forbade.*
He is clamped for up to two-fifths of the climb and **still does not arrive** — so the shape is not
merely at the edge of the limits, it is beyond them by a wide margin.

**The arithmetic in §2 was optimistic by 7–14 places**, and the reason is that its assumption is
false: the rest of the field is not passive. Every other racer is being steered toward its own drawn
place, so the racers ahead of him include ones actively being boosted, and he must also pass through
traffic that brakes him. The bound stands as a bound; the race does not deliver it.

---

## 4 · FAIRNESS

Both arms on the **same** races. Band-reach is `computeZoneSuccessRate` — the canonical measure named
by `docs/FAIRNESS.md`.

**Field 40 · 30 races/track:**

| track | band-reach ALL ship → held | **the OTHERS** ship → held | the held racer |
|---|---|---|---|
| city-circuit | 43.6 → 47.2 | 44.1 → **47.6** (+3.5) | 30.0% |
| dirt-oval | 43.0 → 44.0 | 43.9 → **44.7** (+0.8) | 16.7% |
| garden-path | 45.5 → 48.2 | 46.2 → **48.1** (+1.9) | 50.0% |
| ice-track | 45.2 → 44.6 | 46.2 → **44.8** (−1.4) | 36.7% |
| luger-hill | 47.7 → 47.1 | 48.5 → **47.4** (−1.1) | 36.7% |
| mountainstreet | 48.3 → 46.8 | 49.0 → **47.4** (−1.6) | 26.7% |
| river-run | 45.8 → 46.4 | 46.9 → **46.8** (−0.1) | 33.3% |
| searound | 48.4 → 51.0 | 49.1 → **51.0** (+1.9) | 50.0% |
| seatrack | 46.3 → 49.8 | 46.9 → **50.2** (+3.3) | 36.7% |
| space-sprint | 43.9 → 48.1 | 44.8 → **48.5** (+3.7) | 33.3% |

**★ Holding one racer back does not damage the rest of the field.** The others move by **−1.6 to
+3.7 pp**, up on six tracks and down on four, with no track approaching a collapse. The traffic
argument — a racer parked at rank 18 for two thirds of a race is an obstacle for everybody — is not
borne out at this N.

**The cost lands on the held racer.** He drew P1 and reaches his band **16.7–50.0%** of the time
against the field's ~45%: the hold does not redistribute unfairness, it concentrates it on the one
racer whose drawn place he can no longer reach.

### ★ WHAT COULD NOT BE MEASURED, AND WHY — stated rather than substituted

**The per-start-row Holm gate is NOT answered here, and the numbers above must not be read as if it
were.** Two separate reasons, both established rather than assumed:

1. **The measure is not the gate's measure.** `computeFairnessStats` returns a whole-table χ² over
   start rows. The gate is a **per-row** test with **Holm correction across rows**. Reporting the
   whole-table p as "Holm-unfair rows" would be inventing a measure, which the brief forbids.
2. **★ The baseline itself does not reproduce the record on this harness.** The *shipped* arm's
   whole-table χ² is already significant on 8 of 10 tracks here (searound p=0.000, luger-hill
   p=0.000, city-circuit p=0.001, ice-track p=0.001, seatrack p=0.008, river-run p=0.010,
   mountainstreet p=0.010, dirt-oval p=0.048). A harness whose control arm fails cannot judge a
   treatment arm.

**And the absolute band-reach here (43–48%) is not comparable to the record's 85–90%.** That headline
is `sim-fairness.mjs` at pooled N=300 with its own identity; this is `raceDriver.mjs` at field 40,
60 s, track-default racers, N=30. Only the **ship→held delta on identical races** is a valid
comparison, and that is the only way it is reported above. Putting a figure from one instrument
beside a figure from another is the mistake `raceDriver.mjs`'s own header was written to prevent.

**What would be needed** to answer the Holm gate: the hold arm threaded into `sim-fairness.mjs` —
which calls `createRacePlan` directly and is the instrument the gate is defined on — and run at the
record's N. That was not done: `sim-fairness.mjs` is piece 7(d)'s subject in this same chain and has
no test yet, so changing it here would put the world fingerprint and that piece at risk together.
**Stage 2 (the larger N) was therefore not run**: the stage-1 arms differ readably on the shape, but
the fairness layer that would decide whether to go larger cannot be evaluated on this harness.

---

## METHOD, N, AND WHAT WAS REUSED

| | |
|---|---|
| driver | `scripts/lib/raceDriver.mjs` — **reused, not rebuilt** |
| fairness | `scripts/sim/observers/fairness-stats.mjs` — `computeZoneSuccessRate`, `computeFairnessStats`, **reused** |
| identity | field 40 (and 20 for §1–2), 60 s, track-default racer, seeds `5601 + i×977` |
| N | **§1 cast: 200 races. §2 reach: 10/track. §3–4: 30 races/track/arm, 600 races.** |
| tracks | all 10 |

**The measurement arm was TEMPORARY and is GONE.** It was ~20 lines in `racePlanner.js` — an
override of which rank the servo aims at, plus a `setHoldArm()` accessor — reachable only by a
scratchpad script, with no config key, no default, no storage key and no DevScreen control. It was
removed after the sweep, so **nothing dead is left behind**: `git status` is clean and
`client/src/modules/racePlanner.js` is byte-identical to the branch it started on. The world
fingerprint was measured **with the arm present and off** (`8a1977187e9c99b4`, unmoved) and again
**after removal** (`8a1977187e9c99b4`), and the golden races pass.

Nothing was built that could ship. No speed limit was relaxed in any arm. Nothing is recommended.

---

## THE NUMBERS

```
CLAMP            maxMult 1.10  minMult 0.85        racePlanner.js:98-99, enforced :891
CAST             0 of 200 races had zero comebackers; mean 1.5-2.0 per race
CAPACITY         72 (searound) .. 1092 (mountainstreet); every track allows >= 20

REACH (upper bound, N=40, from rank 18 at 70%)      1.2 .. 3.9
SHAPE (measured, N=40, drew P1, held to 70%)        final 8.1 .. 15.3
CLAMP-PINNED during the climb                       23% .. 40%

BAND-REACH, the OTHERS      ship 43.9-49.1%   held 44.7-51.0%   delta -1.6 .. +3.7 pp
BAND-REACH, the held racer  16.7% .. 50.0%
HOLM GATE                   NOT ANSWERED — wrong instrument, and the control arm fails on it
```
