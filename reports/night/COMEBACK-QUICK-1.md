# COMEBACK-QUICK-1 — a fast first look, and a correction to the two before it

**Instrument: `scripts/lib/raceDriver.mjs`, which builds through `createRaceFromIdentity` and steps
with `stepRacePhysics` — both from `client/src/modules/raceCore.js`, the engine `RaceScreen` itself
renders through.** Not `sim-fairness.mjs`. What that means is answered in §0.

Day chain 2026-09-08 · branch `night/2026-09-07` · **unmerged, nothing minted, nothing built.**

---

# ★ §0 — WHICH SIMULATION, AND DO THE TWO AGREE?

**They agree about the race, and the reason is that there is only one race loop.**

| | |
|---|---|
| `sim-fairness.mjs:120` | `import { stepRacePhysics } from "../client/src/modules/raceCore.js"` |
| `sim-fairness.mjs:1819` | `stepRacePhysics(_stepState, _stepCfg);` |
| `sim-fairness.mjs:1761` | *"The sim now executes the BROWSER's real per-step advance, raceCore.stepRacePhysics — the SAME"* |
| `raceDriver.mjs:50, :488` | the same import, the same call |

`reports/parity/DIVERGENCE-AUDIT.md` records this as **D-INIT ✅ CLOSED (step-order alignment)** —
*"the sim now executes the browser's step function (`raceCore.stepRacePhysics`) — one loop"* — together
with **D-RUNOUT**, **D-NAME** and **D-ROWCOUNT**, all closed the same way.

So the two instruments differ in **input derivation**, not in physics, and that layer is exactly what
`goldenRunner.mjs`'s `browserArm == simArm` guard exists to hold. The concern that raceDriver might be
running "a race the product does not run" is the wrong way round: **raceDriver runs the product's own
engine.** It is `sim-fairness` that wraps that engine in its own derivation.

### ★ AND A FALSE ALARM I RAISED AND THEN DISPROVED, recorded because it nearly became a finding

A direct comparison run here reported **DIFFERENT order, DIFFERENT times, |Δt| up to 6 s** on every
seed. That was **my misconfiguration, not a divergence.** `runSingleRace` defaults
`racePlanController = null`, `raceRng = null`, `rowLayout = null`; the sim's own call site
(`sim-fairness.mjs:4490`) passes all three plus `finishT` and `normalSpeedPxPerSec`. I had compared a
**planned** race against an **unplanned** one. It is not reported as a finding because it is not one.

**What is still not established here:** a full end-to-end equality run of raceDriver against
`sim-fairness`'s complete derivation. `goldenRunner.mjs` already has the three arms for it
(`browserArm`, `realArm`, `simArm`) and `scripts/parity/soak.mjs` drives them. Running that soak is
what it would take; it was not run in a ten-race piece.

**The one thing that is genuinely not comparable** is band-reach: this instrument's absolute band
figures cannot be set beside the record's 85–90%, which is `sim-fairness` at pooled N=300.
COMEBACK-DEF-1 said so about its own figure, and it still holds.

---

# ★ §1 — THE CORRECTION. COMEBACK-DEF-1 AND -2 READ THE FINISHING PLACE WRONG

Both pieces sorted the finished field like this:

```js
[...race.st.racers].sort((a, b) =>
  a.finishTime != null && b.finishTime != null ? a.finishTime - b.finishTime : b.t - a.t);
```

**`finishTime` does not exist on these racers.** The driver's fields are **`finishRank`** and
`finishTimeMs`. So the ternary always took its second branch and sorted by `t` — and `advanceRacerT`
(`raceStep.js:133`) **clamps `t` to `finishT + 0.001` for every finisher**. Every key was equal. The
sort carried no order at all.

**Every finishing place in COMEBACK-DEF-1 and COMEBACK-DEF-2 is void.** That includes both headlines:
*"finishes 8th–15th"* and *"more time does not help"*. Neither was a measurement of the race.

The pinned-at-the-ceiling fractions in those reports were read per frame from `trajectoryMult` and are
unaffected. The cast census (0 of 200 races with no comebacker) is unaffected.

---

# §2 — THE RUN

Ten races per track, two tracks, N=40. Held at rank 18 until **50%**, then released.
**Drawn place = 3, inside the top 5** — the owner's actual requirement, and the thing the two earlier
pieces got wrong by giving him P1.

**Tracks: `dirt-oval` (CLOSED) and `river-run` (OPEN).** Chosen because the brake itself differs by
topology: `computeEffectiveBrakeFactor` (`raceBehaviorConfig.js:37-41`) ramps the brake in over
`avoidanceWarmupMs` on OPEN tracks and applies it flat on closed ones, so the two exercise different
braking behaviour by construction rather than by taste.

## Where he finishes

| track | finishing places (10 races) | **TOP 5** | best | worst | mean |
|---|---|---|---|---|---|
| dirt-oval | 1, 2, 2, 2, 3, 3, 3, 4, 4, 5 | **10 of 10** | 1 | 5 | 2.9 |
| river-run | 1, 2, 2, 2, 3, 4, 5, 5, 7, 8 | **8 of 10** | 1 | 8 | 3.9 |

## The climb

| track | rank at release (mean) | overtakes COMPLETED | re-passed BY others | **PINNED at ceiling** | **BLOCKED while asking** |
|---|---|---|---|---|---|
| dirt-oval | 14.1 | **11.7** | 0.5 | **21%** | **30%** |
| river-run | 17.3 | **15.0** | 1.6 | **22%** | **19%** |

## ★ THE HOLD DID NOT ALWAYS HOLD, AND THE SAMPLE MUST BE READ WITH THAT

`rank at release` ranges from **1 to 35** across the twenty races. The servo is inactive before
`racePlanPulkStart = 0.15`, so the hold has 35% of the race to work — and it is subject to **the same
clamp it is being used to study**. It cannot drag a racer from rank 1 to rank 18 within ±10%/−15% any
more than it can drag him from 35.

So only some of these twenty races are the shape the owner described. Taking the subset where he was
genuinely deep at release (**rank ≥ 15**), from the per-race table below:

| | races | **top 5** | pinned | blocked |
|---|---|---|---|---|
| dirt-oval, rank@rel ≥ 15 | 4 | **4 of 4** | 47% | 39% |
| river-run, rank@rel ≥ 15 | 6 | **6 of 6** | 32% | 23% |
| **combined** | **10** | **★ 10 of 10** | | |

## Per-race detail

```
track        seed  rank@rel  final  top5  passed  lost  pinned%  blocked%
dirt-oval     5601         7      2   yes       5     0        5        40
dirt-oval     6578        24      1   yes      23     0       40        39
dirt-oval     7555        14      2   yes      12     0        3        32
dirt-oval     8532        35      2   yes      33     0       52        47
dirt-oval     9509         1      3   yes       0     2        1         3
dirt-oval    10486        19      3   yes      16     0       56        38
dirt-oval    11463        12      5   yes       7     0       11        35
dirt-oval    12440        18      4   yes      14     0       40        31
dirt-oval    13417         8      4   yes       5     1        0         1
dirt-oval    14394         3      3   yes       2     2        0        33
river-run     5601         1      2   yes       0     1        0         0
river-run     6578         7      8    no       5     6       16        24
river-run     7555        24      5   yes      20     1       39        23
river-run     8532        28      2   yes      26     0       57        31
river-run     9509        12      5   yes       8     1        0        15
river-run    10486        22      2   yes      20     0       25        12
river-run    11463        17      3   yes      15     1       11        19
river-run    12440        34      1   yes      33     0       40        34
river-run    13417        16      4   yes      13     1       17        17
river-run    14394        12      7    no      10     5       10        11
```

---

# ★ §3 — THE MECHANISM, NAMED, WITH ITS ADDRESS

"He has speed budget and does not convert it into places." Here is where it goes.

**`client/src/modules/raceCore.js:625-627`:**

```js
const brake = r.avoidanceActive
  ? Math.min(effectiveBrakeFactor, r.brakeMatchFactor ?? effectiveBrakeFactor)
  : 1.0;
```

**`client/src/modules/raceStep.js:123-132`** — the shared t-update:

```js
racer.t + racer.baseSpeed * f.boost * f.brake * rowEnvMult *
  racer.trajectoryMult * racer.areaBonusMult * (racer.governorMult ?? 1.0) * dt
```

★ **`brake` and `trajectoryMult` are two factors in the SAME product.** The servo's ask does not
compete with the brake; it is multiplied by it.

| | value | source |
|---|---|---|
| servo ceiling `maxMult` | **1.10** → +10% | `racePlanner.js:98` |
| `speedBrakeFactor` | **0.945** → −5.5% | `raceBehaviorConfig` default |
| **net while braked** | **1.10 × 0.945 = 1.0395** | **his +10% becomes +4%** |
| `brakeMatchFactor` | matches the blocker's pace | `raceBehavior.js` `computeBrakeMatchFactor` |

Because the brake is a `Math.min` of the two, `brakeMatchFactor` can cut further than 0.945 — down to
the pace of whoever is in front, i.e. **+0%**. That is the answer: the budget is not spent on places,
it is **cancelled by a co-factor**, and the racer is asking for it the whole time.

**Measured, that is the BLOCKED column: 19–30% of the climb overall, 23–39% in the deep subset** — a
quarter to two-fifths of the climb spent wanting speed the brake is taking. Alongside it, PINNED
(21–22%, 32–47% deep) says he is asking for the maximum the game allows while it happens.

**What ten races cannot settle:** which of the two brake terms dominates, and how much of the blocked
time is `speedBrakeFactor` versus `brakeMatchFactor` clamping him to a slower racer's pace. Separating
them needs the two factors recorded independently at the call site — one added field, read-only, at
`raceCore.js:625`. It was not added, because this piece adds no metric to the product.

---

# §4 — THE THING ALREADY FOUND FALSE, RESTATED

**COMEBACK-DEF-1 established that 0 of 200 races had zero comebackers** — the belief that not every
race needs one does not hold. **Nothing in this piece changes it**; the cast census was not re-run
here and its reading was not affected by the finishing-place bug.

---

# CHECKS

| | |
|---|---|
| world fingerprint, arm removed | **UNMOVED** `8a1977187e9c99b4` |
| golden races | **PASS** — 2 races, every position and time as recorded |
| `npm run verify` | **PASS 19 · FAIL 1** — the one failure is `camera-fingerprint`, expected and deliberate (HARNESS-OUTCOME-1). No other guard failed. |

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check reports/night/COMEBACK-QUICK-1.md reports/night/INDEX.md

ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): reports/night/COMEBACK-QUICK-1.md,
  reports/night/INDEX.md
```

---

# SOURCE HYGIENE

**No source file changed.** The hold arm was re-applied to `client/src/modules/racePlanner.js` for the
run and **removed at the end**; `git status` is clean and that file is byte-identical to the branch it
started on. The only files added are this report and its index line.

**Reused, not rebuilt:** the hold arm (`setHoldArm`, COMEBACK-DEF-1), `scripts/lib/raceDriver.mjs`,
the shipped track seeds as fixtures, and `reports/parity/DIVERGENCE-AUDIT.md` + `goldenRunner.mjs`'s
own headers to answer §0 instead of building a third comparison.

**Noticed and deliberately left:**
- `goldenRunner.mjs:26-29`'s header says `realArm` "DIVERGES from simArm" on D-INIT and D-RUNOUT.
  `DIVERGENCE-AUDIT.md:29-30` marks both **CLOSED**. The header is stale relative to the audit. Not
  changed here — it is a documentation question, and this piece changes no source.
- The blocked/pinned split cannot attribute between the two brake terms; what it would take is named
  in §3.

**No scratch files entered the repository.** `git stash` was not used.
