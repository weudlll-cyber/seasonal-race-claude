# CHASE-REACH-1 — yes, the chase can reach; the boost is not what stops it

> **In one sentence: in about seven of every ten of the owner's breakaways there is already a racer
> behind the gap who could close it before the finish — and he needs no more boost than the game
> already has, because the mechanism is simply switched off for the whole of that window.**

**Read-only. Branch `read/chase-reach-1` off master `bb1653a1`, 2026-09-22. No file under
`client/src` changes, no default moves, no key is added, nothing is built and nothing is proposed.**
Instrument `reports/evolution/chase-reach-data/chase-reach.mjs`; data `chase-chase-quiet-n300.json`
and `chase-chase-wild-n300.json`, ten tracks × seeds 1–30 = **N=300 per stage**, same seeds in both.

★★ **THE OWNER'S DESIGN CONSTRAINT, 2026-09-22, recorded because it is what these numbers are FOR
and is NOT implemented here:** extend **only the boost part** past 0.6; do **not** move when the PULK
phase ends and do **not** move the OUTCOME start. This block only asks whether such a build could
work at all.

---

## 1 · THE THREE CHECKS

**CHECK A — REPRODUCTION. PASSES.** The quiet run reproduces
`reports/night/breakaway-count-data/count-v2n300.json` race for race: `packBreakaway` identical on
**300/300**, `packMaxPx` to 3 decimals on **300/300**, **48 of 300 = 16.0%**.

**CHECK B — PURE OBSERVATION. PASSES.** The race signature — a hash of every race's finishing order
and times — is **identical 5/5** between this instrument and a scratch copy with the entire chase
block stripped out. The instrument does not touch the race.

**CHECK C — SABOTAGE. PASSES, after catching a defect.** With `directorReachable` forced to return
false, every predicate-gated number collapses: `reachAny0`, `excl.eligible`, `canCloseReach`,
`bestRatioReach` and `bestBoostReach` all to 0/none. Both scratch copies live outside the repo and
are never committed.

### ★ Two defects of mine, caught by this block's own machinery

1. **The smoke test caught the scope.** "While a breakaway gap is open" was first coded as
   `packGap > 0` — which is *every* in-window step. It returned 1651 chase steps of ~1651 and a
   **negative** required boost, because a chaser closing a 2 px gap needs no boost at all. That
   measured ordinary racing, not the question. It is now gated on `packGap >= 157.05`, the owner's
   threshold.
2. ★★ **Check C caught the model, which is exactly what that check is for.** (B) and (D) were first
   computed over *every* racer behind the gap, ignoring the predicate — so under sabotage the reach
   counts collapsed while CAN-CLOSE and (D) survived unchanged, which the brief names as a STOP. The
   brief's model is that (A) **selects** the candidates and (B)/(D) then ask about *the best
   candidate*. Both are now gated on the predicate (`*Reach`). **The unrestricted column (`*Any`) is
   kept beside them and labelled**, because `directorReachable` is a first-order proxy on
   `spreadFactor` that cannot see the OUTCOME servo's `trajectoryMult` — the gap between the two
   columns measures what that proxy costs instead of leaving it asserted. **In this data the two
   columns are identical** (35/48 and 20/29 either way), so the proxy costs nothing here.

### The judgement calls taken, recorded as the brief requires

- **The chase target is the BACK OF THE LEADING GROUP** (`order[cut-1]`), not P1. The owner's gap
  runs from the back of that group to the front of the field, so that racer is what a chaser must
  reach for the breakaway to stop being one.
- **N=300 directly, no N=30 screen.** Owner rule 19 is about *arms*, and this block has none — it is
  one observational pass. The 48 breakaway cases only exist at N=300; at N=30 there would be about
  five and no question could be answered.
- **`leaderBrake = 0` is the primary column**, because past 0.6 nothing brakes the leader and
  passing the configured brake would credit the chaser with an advantage that does not exist there.

---

## 2 · THE FIVE PREMISE ADDRESSES — VERIFIED, WITH TWO CORRECTIONS

| # | claim | verdict |
|---|---|---|
| 1 | the governor runs only inside `[pulkStart, pulkEnd)`; outside it every racer is slewed to exactly 1.0 | ✅ **verified** — [raceGovernor.js:182-187](../../client/src/modules/raceGovernor.js#L182-L187), slew at [:189-191](../../client/src/modules/raceGovernor.js#L189-L191) |
| 2 | `pulkEnd` IS `choreoOutcomeStart`, default 0.6 | ✅ **verified** — `phaseFractions.pulkEnd = choreoPulkEnd` at [racePlanner.js:174-175](../../client/src/modules/racePlanner.js#L174-L175); `choreoOutcomeStart: 0.6` at [defaults.js:1070](../../client/src/modules/storage/defaults.js#L1070). ★ `corridorStart` is set to the same value at `:176`, so corrStart == pulkEnd |
| 3 | `governorPhaseWeight` returns EXACTLY 0.0 at `progress >= corrStart`, and the force is `1 + w·director` | ✅ **verified** — [:92-97](../../client/src/modules/raceGovernor.js#L92-L97) and [:375](../../client/src/modules/raceGovernor.js#L375) |
| 4 | the force's three branches are DISJOINT — braked / hero / boosting | ✅ **verified** — [:364-374](../../client/src/modules/raceGovernor.js#L364-L374), an `if / else if / else if` chain |
| 5 | the owner's `[0.70, finish]` window lies wholly outside the mechanism | ✅ **verified** — follows from 1–3; 0.70 > 0.6 |

**★ TWO CORRECTIONS, both minor and neither affecting the premise:**

- `boostEligible` is at **`:297-298`**, not `:294-295`.
- ★★ The JSDoc at [`:169`](../../client/src/modules/raceGovernor.js#L169) still describes the
  rotation as *"SWEEP/opt-in, flag-gated; default OFF → not called → byte-identical"*. That is
  **stale**: [raceCore.js:376](../../client/src/modules/raceCore.js#L376) sets
  `pulkLeadRotationOn = racePlanEnabled`, and the live resolved config on the shipped fixture reads
  `enabled: true`. **The mechanism ships ON.** The premise is unaffected — it is on, and it is still
  switched off past 0.6 by the window and the phase weight — but a reader trusting that comment
  would conclude the whole thing is dead code.

**The live resolved config**, read from `raceCfg.pulkLeadRotCfg` and never a literal:

| | quiet | wild |
|---|---|---|
| `challengerBoost` | 0.06 | **0.12** |
| `maxEffect` (the ±12% realism envelope) | 0.12 | 0.12 |
| `ceilingCap` | 1.1813 | 1.1813 |
| `leaderBrake` | 0.10 | 0.15 |

---

## 3 · THE RESULT

### (A) Reachability — a chaser is always there

| | quiet | wild |
|---|---|---|
| breakaways (owner's definition) | 48 of 300 = 16.0% | 29 of 300 = 9.7% |
| breakaway steps measured | 9 913 | 6 819 |
| steps with ≥1 reachable chaser, **`leaderBrake = 0`** | **9 913 / 9 913 = 100.0%** | **6 819 / 6 819 = 100.0%** |
| steps with ≥1 reachable chaser, configured brake | 9 913 = 100.0% | 6 819 = 100.0% |

★ **The `leaderBrake` argument makes no difference at these values** — both columns are 100%. The
entanglement is real in principle and measures **zero** here. It was guarded against anyway, and the
number is reported rather than the guard.

### (B) Can-close in time — about seven in ten

| | quiet | wild |
|---|---|---|
| races where a **reachable** candidate could close | **35 of 48 = 72.9%** | **20 of 29 = 69.0%** |
| races where **any** racer behind the gap could | 35 of 48 | 20 of 29 |
| best needed/remaining ratio — median | **0.35** | **0.27** |
| — p10 / min / max | 0.13 / 0.075 / 262.9 | 0.14 / 0.080 / 10.3 |

A ratio ≤ 1 means the close fits in the time the leader has left. **The median best candidate needs
about a third of the time available** — not marginally enough, comfortably enough.

### (D) ★★ THE DECISIVE TABLE — THE BOOST KEY CANNOT FLIP A SINGLE RACE

| | quiet (boost 0.06) | wild (boost 0.12) |
|---|---|---|
| need **NO** added boost (required ≤ 0) | **35 of 48** | **19 of 29** |
| need some, within the **shipped** boost | 0 | 1 |
| ★ need more than shipped, **clamp permits it** | **0** | **0** |
| clamp **FORBIDS** any sufficient boost | 13 of 48 | 9 of 29 |

**Every breakaway falls into one of two buckets, in both stages, with nothing in between.** Where
the chase can close, it can already close at **zero added boost**. Where it cannot, **no boost the
±12% realism envelope permits would do it** — the median required boost is negative (−0.106 quiet,
−0.134 wild) and the p90 is 0.49, four times the envelope.

★ **At wild the boost is already AT the clamp** — `challengerBoost` 0.12 = `maxEffect` 0.12 — so the
key has no headroom there at all. **Raising the boost key cannot change one race in 600.**

### (C) Who `boostEligible` refuses, pooled over breakaway steps

| reason | quiet | wild |
|---|---|---|
| `isHero` | 37 737 = 10.2% | 25 520 = 10.1% |
| ★ `brakeSet` | **35 356 = 9.6%** | **31 481 = 12.5%** |
| cooldown | 0 = 0.0% | 0 = 0.0% |
| not reachable | 90 672 = 24.6% | 40 246 = 15.9% |
| **eligible** | 205 323 = 55.6% | 155 104 = 61.5% |
| total racer-steps behind the gap | 369 088 | 252 351 |

### Per track (quiet)

| track | breakaways | can close | median ratio | | track | breakaways | can close | median ratio |
|---|---|---|---|---|---|---|---|---|
| city-circuit | 6 | 5 | 0.23 | | mountainstreet | 5 | 4 | 0.44 |
| dirt-oval | 6 | 5 | 0.22 | | river-run | 0 | — | — |
| garden-path | 0 | — | — | | ★ searound | 6 | **2** | **1.87** |
| ice-track | 11 | 8 | 0.37 | | seatrack | 3 | 2 | 0.45 |
| luger-hill | 6 | 5 | 0.42 | | space-sprint | 5 | 4 | 0.28 |

★ **`searound` is the one genuine exception** — 6 breakaways, only 2 closable, median ratio 1.87.
There the time really is not there. `garden-path` and `river-run` produce no breakaways at all.

---

## 4 · ★ THE THREE ENTANGLEMENTS

Findings of this read, **not a design**. For each, what a future build bounded by the owner's
constraint would have to **decide** — naming a decision is not making it.

1. **The reachability test's `leaderBrake` argument.** `directorReachable` prices the leader as
   braked ([:130](../../client/src/modules/raceGovernor.js#L130), `leaderSpreadFactor * (1 - leaderBrake)`).
   Past 0.6 nothing brakes, so a build that reused the predicate there would be asking a question
   about a race that does not exist. **Measured, the error is zero at today's values** — 100%
   reachability either way. **The decision:** which brake value the predicate is asked with outside
   the PULK window. It happens not to matter now; it is not guaranteed not to matter at other
   values.
2. ★★ **`brakeSet` membership outliving the brake.** `boostEligible` refuses any racer in
   `st.brakeSet` ([:297](../../client/src/modules/raceGovernor.js#L297)). Past 0.6 nothing brakes,
   yet **9.6% (quiet) and 12.5% (wild) of racer-steps behind the gap are refused for that
   membership** — about one chaser-slot in ten excluded for a condition that no longer applies.
   **The decision:** whether membership survives the boundary, and if not, what clears it.
3. **The phase weight reaching exactly 0 at the boundary.** `governorPhaseWeight` returns 0.0 at
   `progress >= corrStart` ([:92-97](../../client/src/modules/raceGovernor.js#L92-L97)) and
   `corrStart == pulkEnd` ([racePlanner.js:176](../../client/src/modules/racePlanner.js#L176)), so
   the force is zero at the boundary **even inside the window**, and the fade begins before it. A
   build that extends only the boost past 0.6 must pass through this as well as through the window
   gate — **two switches, not one.** **The decision:** what `w` the boost branch uses past the
   boundary, given that the brake and hero branches must keep seeing 0.

---

## 5 · WHAT THIS DOES NOT ESTABLISH

- **CAN-CLOSE is instantaneous feasibility at the most favourable step, not realised closure.** All
  48 quiet races broke away *and* 35 of them had a moment where a chaser could have closed. The two
  are not in contradiction: nothing was boosting.
- The chaser's achievable speed is its **observed** speed times the counterfactual boost multiplier.
  That observed speed already contains the OUTCOME servo's command, which is the dominant term past
  0.70 — so this measures "the boost added **on top of** what the servo is already doing", which is
  what the owner's constraint describes. It is not a prediction of what a built mechanism would do,
  because a real boost would change the race from the moment it applied.
- `directorReachable` is a first-order proxy that ignores `trajectoryMult`; its own docstring says
  so ([:99-110](../../client/src/modules/raceGovernor.js#L99-L110)). Here it costs nothing — the
  restricted and unrestricted columns agree exactly — but that is a measured coincidence at these
  values, not a property.

---

## 6 · THE ANSWER

**Yes — the chase can reach.** In 72.9% of quiet breakaways and 69.0% of wild ones there is a racer
behind the gap who could close it before the finish, with a median best candidate needing only about
a third of the time available, and a reachable chaser is present on **100% of breakaway steps**.

★★ **And the boost authority is not what stops him.** In every one of those races he needs **no
added boost at all**; in the ~30% where the close does not fit, **no boost the ±12% envelope permits
would make it fit**. Zero races in 600 could be flipped by raising the boost key, and at wild the key
is already pinned to the clamp. **The constraint is not the size of the boost — it is that the
mechanism is switched off for the entire window in which the owner's breakaway happens.**

Nothing here proposes changing that. Whether it should be changed, and how, is the owner's decision;
§4 names the three things such a decision would have to settle.
