# COMEBACK-STAGED-1 — the staging is built, and the plan's own feasibility budget refuses it

2026-09-11 · branch `night/2026-09-11` · piece 1 of the night chain · **NOT merged. NOTHING MINTED.**

★ **THE HEADLINE: the mechanism does not engage.** The staged comebacker is refused in **8 of 8
candidates at every field size**, so the role is staged in **0 of 180 races**. The brief said that if
it does not fire in the large majority of races where the field is big enough, that is the finding.
**It is the finding, and §3 gives its cause with an address.**

---

## 1 · THE PREMISE, RE-VERIFIED AT SOURCE AND RE-MEASURED HERE

`heroCurveGenerator.js` builds its B1 pool from racers the plan has **ASSIGNED** a top-5 finish, then
asks which of them **happens** to be deep after the chaos phase (`p.rank > cr`, with `cr` capped at
rank 5). **The director SELECTS from what exists.**

★ **Re-measured on this tree — not carried from an earlier report** (180 races, 10 tracks × 6 field
sizes × 3 seeds):

| N | cast in | median post-chaos rank | median rank at 0.70 | ★ median places gained | top 5 | median finish |
|---|---|---|---|---|---|---|
| 10 | 29/30 | **5** | 3 | **+1** | 50/56 | 3 |
| 20 | 30/30 | **5** | 4 | **−1** | 24/41 | 5 |
| 30 | 29/30 | **5** | 4 | **−9** | **12/53** | 13 |
| 40 | 30/30 | **9** | 3 | **−9** | 15/48 | 13 |
| 60 | 30/30 | **9** | 6 | **−17** | 7/56 | 21 |
| 100 | 29/30 | **19** | 7 | **−16** | 8/55 | 21 |

★ **The premise holds exactly.** A racer drawn for the front is steered toward the front, so he is at
median rank 5 of 30 and 9 of 40 when the director looks — and **today's comebacker LOSES places after
0.70 at every size from N=30 up.** This reproduces last night's control independently, which is why
it is stated here as a measurement rather than quoted.

---

## 2 · WHAT WAS BUILT

★ **THE STAGING MECHANISM ALREADY EXISTED AND WAS MERELY LABELLED DIFFERENTLY.** A hero's curve is
`anchor → peak → resolve`, and for a comebacker the **peak is his deepest point**. The else-branch at
the pool site already computed a synthetic deep peak for a front racer
(`cr + peakDepthFrac * (n - 1)`) — it was simply cast `sovereign-lead`. So staging is choosing that
peak: the curve steers him **back** to the staging rank and then forward to the front cluster, which
is inside the top 5 — a fixed number, not a fraction, and not P1.

★ **NO HOLD ARM WAS BUILT, AND THAT IS A DELIBERATE DEPARTURE FROM THE BRIEF.** The measurement arms
needed one because the racer they held was **not a hero**, and `racePlanner.js:805` pins a non-hero to
1.0 before OUTCOME. A **cast hero is already exempt from that pin** and already tracks its curve at
strictness 1.0 through the pulk phase. Rebuilding the arm would be a second mechanism doing the job
the curve already does, and the chain rule is that nothing is built twice.

### The staging rank, and ★ the grid does not support the curve he sketched

Read from HOLD-GRID-1 **for TOP-5 REACH**, because that is his requirement:

| N | 0.40 | 0.50 | 0.60 | chosen |
|---|---|---|---|---|
| 20 | — | 41/80 (51%) | **46/80 (58%)** | 0.60 |
| 30 | — | 23/79 (29%) | **15/29 (52%)** | 0.60 |
| 40 | — | 12/30 (40%) | **14/30 (47%)** | 0.60 |
| 60 | 9/30 (30%) | 9/30 (30%) | **15/30 (50%)** | 0.60 |
| 100 | 8/29 (28%) | **9/29 (31%)** | 6/29 (21%) | 0.50 |

★ **Read for top-5 reach the grid is FLAT at 0.60 up to N=60 and only shallower at N=100.** It does
not support a band that slides with the field; it supports a **two-step**, and it is reported as one
rather than dressed as a curve. **What it costs in places gained:** at N=100, choosing 0.50 over 0.60
gives up **+45 → +35**, ten places, to buy 21% → 31% top-5 reach.

**No config key.** Four numbers in the one place the casting decision is made, beside the cells that
justify them.

### ★ THE FALL-BACK, which is what makes this safe to leave in the tree

`addSolo` refuses **without marking the racer used**. A first draft simply skipped a refused staging,
which consumed **every** pool member on failed attempts and cast **no B1-pool hero at all** — fewer
heroes, a different race, a silent regression wearing the shape of a new feature. With the fall-back,
a race whose staging is refused is **byte-identical to today**.

---

## 3 · ★ WHY IT NEVER FIRES — THE PLAN'S OWN BUDGET, WITH THE ADDRESS

`feasibleTiming` (`heroCurveGenerator.js:189-214`) prices the curve in race-progress:

```js
const span1 = (config.minJerkPeakFactor * Math.abs(anchorRank - peakRank)) / maxRankRate;  // DOWN
const span2 = (config.minJerkPeakFactor * Math.abs(peakRank  - finalRank)) / maxRankRate;  // UP
if (ap + span1 + span2 + 0.06 > bc) return null;
```

★ **It charges the DOWN leg at the same `maxRankRate` as the UP leg.** With the shipped
`anchorProgress` 0.15, `minJerkPeakFactor` 1.7 and a B1 checkpoint of 0.97, the function's own
arithmetic on real races (dirt-oval, seed 41000):

| N | anchor → staging → top 5 | maxRankRate | down | up | needs | budget | |
|---|---|---|---|---|---|---|---|
| 20 | 1 → 12 → 2 | 22.4 | 0.837 | 0.761 | **1.807** | 0.97 | ★ refused |
| 40 | 1 → 24 → 2 | 45.9 | 0.852 | 0.815 | **1.877** | 0.97 | ★ refused |
| 100 | 1 → 50 → 2 | 116.5 | 0.715 | 0.701 | **1.626** | 0.97 | ★ refused |

★ **Refused by roughly a factor of two, at every field size, and the endpoint is NEVER the problem** —
`racerFeasibility` accepted the top-5 endpoint in **8 of 8** candidates; it is `feasibleTiming` that
refuses all 8.

### ★ THE SCISSORS — the depth that is feasible is the depth that produces nothing

The deepest staging rank that `feasibleTiming` WILL accept, per field size:

| N | deepest feasible staging | as a fraction | the staging the grid asks for | what the grid measured at the feasible depth |
|---|---|---|---|---|
| 20 | **6** | 0.30 | 12 (0.60) | 0.25–0.33 → **−2 to 0** places |
| 30 | **9** | 0.30 | 18 (0.60) | 0.25–0.33 → **−8 to −1** |
| 40 | **11** | 0.28 | 24 (0.60) | 0.25–0.33 → **−11 to −8** |
| 60 | **17** | 0.28 | 36 (0.60) | 0.25–0.33 → **−6 to +3** |
| 100 | **27** | 0.27 | 50 (0.50) | 0.25–0.33 → **−8 to +6** |

★ **The feasible ceiling is a near-constant 0.27–0.30 of the field, and that is exactly the depth
HOLD-GRID-1 measured as producing NO comeback.** The depth that produces a comeback is refused; the
depth that is allowed produces nothing. **That is the whole of why the owner's design does not
currently work, and it is not a tuning question.**

### ★ AND THE ASYMMETRY IS THE LEVER, ISOLATED IN A TEST

The **same depth** is affordable one way and unaffordable as a round trip:

- a racer **already at rank 20** climbing to rank 2 — **feasible**;
- a racer at the front staged **down to rank 20 and back to 2** — **refused**;
- and the climb he would then make is **identical**.

★ **Falling back through the field is not rate-limited the way overtaking is** — a racer falls by not
accelerating — but `span1` charges it at the overtaking rate. **Whether the down leg should be priced
differently is a design decision and it is his.** ★ **NO LIMIT WAS RELAXED HERE**; the chain rule is
that an arm needing one is a finding, and this is that finding.

---

## 4 · SABOTAGE — AND THE FIRST ONE WAS A FALSE GREEN

★ **The brief's two sabotages could not be run.** "Stage him and never release" and "release at the
wrong progress" both presuppose a release, and there is none. Asserting one would have been the
false-green shape this chain has produced four times.

**What was sabotaged instead is the fall-back, which is live.** ★ **And the first version of that
test was itself a false green, caught by the sabotage:** it asserted `heroCast.length > 1`, which the
winner and the three B2 attackers satisfy on their own — both are cast **outside** the B1-pool loop —
so it passed with the fall-back removed and the pool casting nobody.

The discriminating quantity is the number of **standard (non-attacker) heroes**: **3** on the correct
tree, **1** with the fall-back gone.

```
correct tree :  Tests  10 passed (10)
sabotaged    :  × a race whose staging is refused still casts its B1-POOL heroes, exactly as before
                AssertionError: expected 1 to be greater than 1
                Tests  1 failed | 9 passed (10)
```

Reverted; a grep for the marker returns nothing.

---

## 5 · ★ THE BROWSER TEST WAS NOT WRITTEN, AND WHY

The brief asked for one because this changes what he sees. ★ **It does not change what he sees:** the
staging never fires, the world fingerprint is **unmoved** and the golden races **PASS**, so every race
is byte-identical to today. A browser test would have been asserting that an unchanged race still
runs — true, already covered by the suite, and evidence about nothing this piece did.

**If the down-leg pricing is ever changed, a browser test becomes necessary and this is the note that
says so.**

---

## 6 · FINGERPRINTS AND CHECKS

| role | record | measured | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | ★ **UNMOVED** |
| golden races | — | **PASS** | ★ **not red** |

★ **The stop conditions the brief expected did NOT trigger**, and that is itself the proof of
inertness: the world fingerprint would have moved if a single staging had succeeded anywhere in 30
races across 10 tracks. It did not.

```
node scripts/engine-reach.mjs --check client/src/modules/heroCurveGenerator.js \
  client/src/modules/stagedComeback.test.js scripts/diag/comeback-band.mjs

ENGINE REACH: 1 of 3 path(s) can change the race:
  client/src/modules/heroCurveGenerator.js
```

`npm run verify`, plain: **PASS 23 · FAIL 2** — and **both reds are piece 4's**
(`camera-fingerprint`, `render-fingerprint`), which await his word. **No red is this piece's.**

**Reused, not rebuilt:** `scripts/diag/comeback-band.mjs` was taken from `night/2026-09-10` as a
measuring tool; the superseded casting approach on that branch was not.

**`git stash` was not used. `--no-verify` was not used. The probe scripts were deleted.**

---

## 7 · WHAT IS OPEN, AND IT IS HIS

1. ★ **Should the DOWN leg be priced differently from the UP leg?** Falling is not rate-limited the
   way overtaking is. This is the one change that would make his design possible, and it is a design
   decision — nothing was touched.
2. ★ **Or should the staging be shallower than a comeback needs?** 0.27–0.30 of the field is
   feasible today, and the grid says it produces −11 to +6 places.
3. The build is **inert and safe** in the tree meanwhile: refused stagings fall back to today's
   casting, byte for byte.
