# BREAKAWAY-CAST-SPLIT-1 — the casting does not predict the owner's breakaway, and for the two roles that fill its groups the question cannot be asked at all

> **In one sentence: no role's presence changes how often the owner's breakaway happens — every
> testable split is null in both stages, pooled and per track — and the two roles that dominate
> breakaway groups are cast in 95–100% of races, so for them an observational split has nothing to
> compare against.**

**Read-only. Branch `read/breakaway-cast-split-1` off master `33cf421b`, 2026-09-22. No file under
`client/src` changes, no default moves, no key is added, and nothing is designed, proposed or tuned
here.** Instrument `reports/evolution/breakaway-cast-split-data/cast-split.mjs`; data
`cast-split-quiet-n300.json` and `cast-split-wild-n300.json`, ten tracks × seeds 1–30 = **N=300 per
stage**, same seeds in both.

---

## 1 · THE THREE CHECKS, BEFORE ANY NUMBER IS BELIEVED

**CHECK A — REPRODUCTION. PASSES, and perfectly.** The quiet run reproduces the committed
`reports/night/breakaway-count-data/count-v2n300.json` **race for race**: `packBreakaway` identical
on **300/300** pairs, `packMaxPx` agreeing to 3 decimals on **300/300**, and **48 of 300 = 16.0%**,
the expected figure. Every other parent field is 300/300 identical too — `packGroupSize`,
`packCrossProg`, `packHeldAboveHalfSec`, `packNeverClosed`, `w70MaxPx`, `allMaxPx` and **`crossRole`**.
★ That last one is load-bearing: it is the evidence that the action observers added under (C) below
are observers, rather than my assurance that they are.

**CHECK B — THE ROLE MAP IS REALLY READ. PASSES, with a paired contrast.** In a scratch copy that
was never committed, `roleAt()` was made to return `null` for every index. All five test races then
report `nRoled = 0`, an empty `cast`, an empty `castCounts` and every group role slot `null`; the
same five races unsabotaged report **5–6 roled racers with varied roles**. Every split would
therefore collapse into the "without" bucket, which is what the check demands. `packBreakaway` is
**identical** under both, which is the observer proof a second time.

**CHECK C — THE STAGE DOES NOT MOVE THE CAST. PASSES.** The `cast` array is **identical in 300 of
300** quiet/wild pairs — same indices, same roles, same `staged` flags — while `packBreakaway`
differs in **67 of 300**. SHAPE-CENSUS-1 §3 is confirmed on fresh data: the stage moves the race and
not the casting.

### ★ A defect in my own analysis, found before any table was written

My first role list was hand-written from SHAPE-CENSUS-1's four roles and **silently omitted
`pursuer`** — which is live since PURSUER-SHIP-1, is cast in **41.0%** of races, and holds **12 of
the 67** roled slots in the parent data. Every table below derives its role list **from the data**
instead. A hand-written census list is how a census loses a row, and this one nearly did.

### The judgement call I took, recorded as the brief requires

Step 1 says exactly two things are new; Step 4 then requires **both halves**, and lead changes,
overtakes and the top-5 spread at 0.90 are not in the parent's output and cannot be derived from it.
**I added them as a third addition (C)** rather than leave Step 4 unanswerable, as **pure
observers**: they read the `order`/`pT` the parent already computes, touch no RNG and no physics.
The conservative reading is that this needed proving, not asserting — **Check A is that proof.**
★ The top-5 spread here is a **world-px checkpoint** (leader to 5th at the first step past 0.90),
**not** ACTION-LEVERS-1's seconds-based finish-order `top5Spread`
([gap-metrics.mjs:117](../../scripts/sim/observers/gap-metrics.mjs#L117)). Different quantity,
different units.

---

## 2 · TABLE 1 — THE FRESH CENSUS, POST-RENAME

Identical in both stages (Check C), so one table serves both. N=300.

| role | races with ≥1 | share | racers cast | mean per race |
|---|---|---|---|---|
| `attacker-b2` | 300 of 300 | **100.0%** | 880 | 2.93 |
| ★ `sovereign-lead` | 284 of 300 | **94.7%** | 284 | 0.95 |
| `comebacker(staged)` | 209 of 300 | 69.7% | 209 | 0.70 |
| `faller` | 141 of 300 | 47.0% | 141 | 0.47 |
| `pursuer` | 123 of 300 | 41.0% | 125 | 0.42 |
| ★★ `comebacker` (unstaged) | **0 of 300** | **0.0%** | **0** | 0.00 |

`nRoled` distribution: **3 → 3 races, 4 → 15, 5 → 122, 6 → 160.** Mean **5.46 of 40 = 13.7%** of the
field carries a role; 86.3% is uncast.

### ★ WHAT THIS SUPERSEDES IN SHAPE-CENSUS-1 §2A, cell by cell

That report's role rows were measured **before** the 2026-09-19 rename at
[heroCurveGenerator.js:648](../../client/src/modules/heroCurveGenerator.js#L648). They are stale, and
by a great deal:

| role | SHAPE-CENSUS-1 §2A | **now** | delta | cast then → now |
|---|---|---|---|---|
| ★★ `comebacker` (unstaged) | 98.3% | **0.0%** | **−98.3 pp** | 545 → **0** |
| ★★ `sovereign-lead` | 37.7% | **94.7%** | **+57.0 pp** | 113 → 284 |
| `comebacker(staged)` | 72.3% | 69.7% | −2.6 pp | 217 → 209 |
| `attacker-b2` | 100.0% | 100.0% | +0.0 pp | 873 → 880 |
| ★ `pursuer` | **not a row at all** | **41.0%** | — | — → 125 |

**The unstaged `comebacker` is extinct** — the rename made site 1 emit `sovereign-lead`
unconditionally, and the solo fall-back is now `pursuer`.

★ **EXACTLY THREE OF SHAPE-CENSUS-1 §2A's ROLE ROWS ARE SUPERSEDED, AND THE REST STAND.** Superseded:
the unstaged **`comebacker`** (extinct), the **`sovereign-lead`** (the 2026-09-19 rename), and the
**`pursuer`** row that report never had. Standing: **`attacker-b2`** (unchanged at 100%),
**`comebacker(staged)`** (72.3% → 69.7%, within sampling), and ★ **`faller`, for the reason
below.** Quote §2A's faller and staged rows freely; do not quote its comebacker or sovereign-lead
rows.

### ★★ CORRECTION (2026-09-22) — THE `faller` ROW WAS NEVER A SUPERSESSION

**This report first put `faller` 32.7% → 47.0%, +14.3 pp in the table above. That was wrong, and it
is an arithmetic point rather than a disagreement about the data.** The row has been removed.

The faller gate is **seed-derived and nothing else**:
`mulberry32(seed ^ 0x7a11e5)() < 1 / fallerEveryNRaces`
([heroCurveGenerator.js:498-500](../../client/src/modules/heroCurveGenerator.js#L498-L500), with
`fallerEveryNRaces: 3` at [:68](../../client/src/modules/heroCurveGenerator.js#L68)). **This
fixture runs seeds 1–30 on ten tracks, so its 300 rows replicate 30 seeds ten times** — and this
report had already measured that and failed to follow it through: **26 of the 30 seeds fire
identically on all ten tracks**, the 4 that differ being 6: 9/10, 20: 9/10, 22: 4/10, 23: 9/10
(slot availability, `cast.length < nHeroes`, varying by field — not the gate varying).

**So 47.0% is not 141 of 300 independent races.** Against the gate's own 1/3 it is nothing:

| reading of "how many seeds fire" | count | two-sided exact binomial vs 1/3 |
|---|---|---|
| seeds firing on **every** track | 11 of 30 | **p = 0.701** |
| pooled rate expressed in seeds (141/10) | 14.1 of 30 | **p = 0.125** |
| seeds firing on **any** track | 15 of 30 | **p = 0.079** |

★ **Every reading is null, so the conclusion does not depend on which is taken.** ★ And
SHAPE-CENSUS-1's **32.7% was measured over 300 DISTINCT seeds** — exact binomial against 1/3
**p = 0.854**, matching the gate literal almost perfectly. **It is the better estimate of the gate
and it stands.**

★ This also retires the open question the earlier version left ("what changed must be how often a
slot is free"). **Nothing measurable changed**; the premise the question rested on does not hold.

---

## 3 · ★★ TABLE 2 — THE SPLIT. THE POINT OF THE BLOCK, AND IT IS NULL.

For each role: does a race that casts it break away more often than a race that does not? **The cast
rate is printed beside every split**, because a role cast in nearly every race has nothing to
compare against.

**QUIET — 48/300 = 16.0% overall**

| role | cast rate | casts X | does not | diff | Fisher p | verdict |
|---|---|---|---|---|---|---|
| `attacker-b2` | **100.0%** | 48/300 = 16.0% | 0/0 — | — | — | ★★ **NO CONTRAST — not answerable observationally** |
| `comebacker` | **0.0%** | 0/0 — | 48/300 = 16.0% | — | — | ★★ **NO CONTRAST — the role is extinct** |
| ★ `sovereign-lead` | **94.7%** | 43/284 = 15.1% | 5/16 = 31.3% | −16.1 pp | 0.150 | **marginal contrast only — 16 races** |
| `comebacker(staged)` | 69.7% | 30/209 = 14.4% | 18/91 = 19.8% | −5.4 pp | 0.236 | nothing |
| `faller` | 47.0% | 24/141 = 17.0% | 24/159 = 15.1% | +1.9 pp | 0.753 | nothing |
| `pursuer` | 41.0% | 19/123 = 15.4% | 29/177 = 16.4% | −0.9 pp | 0.874 | nothing |

**WILD — 29/300 = 9.7% overall**

| role | cast rate | casts X | does not | diff | Fisher p | verdict |
|---|---|---|---|---|---|---|
| `attacker-b2` | **100.0%** | 29/300 = 9.7% | 0/0 — | — | — | ★★ **NO CONTRAST** |
| `comebacker` | **0.0%** | 0/0 — | 29/300 = 9.7% | — | — | ★★ **NO CONTRAST** |
| `sovereign-lead` | 94.7% | 27/284 = 9.5% | 2/16 = 12.5% | −3.0 pp | 0.659 | nothing |
| `comebacker(staged)` | 69.7% | 20/209 = 9.6% | 9/91 = 9.9% | −0.3 pp | **1.000** | nothing |
| `faller` | 47.0% | 10/141 = 7.1% | 19/159 = 11.9% | −4.9 pp | 0.175 | nothing |
| `pursuer` | 41.0% | 10/123 = 8.1% | 19/177 = 10.7% | −2.6 pp | 0.553 | nothing |

**Not one split reaches significance in either stage.** Every difference that exists at all points
the *same* way — casting a role goes with **fewer** breakaways, never more — but none of it is
distinguishable from noise.

### Per track (N=30 each), sign tally across the ten tracks

| role | QUIET up/down/tie | p | WILD up/down/tie | p |
|---|---|---|---|---|
| `comebacker(staged)` | 3 / 5 / 2 | 0.727 | 5 / 2 / 3 | 0.453 |
| `faller` | 5 / 2 / 3 | 0.453 | 2 / 5 / 3 | 0.453 |
| `pursuer` | 3 / 4 / 3 | 1.000 | 2 / 6 / 2 | 0.289 |
| `sovereign-lead` | 3 / 3 / 1 | 1.000 | 4 / 1 / 2 | 0.375 |

★ **`faller` and `pursuer` reverse their sign between the two stages** (5/2 → 2/5 and 3/4 → 2/6)
while the cast is provably identical across them. A direction that flips when only the physics
changes is the signature of noise, and it is the clearest single indication in this block that these
splits carry no signal.

### The `nRoled` split — and a trap in it

QUIET: `nRoled` 2–3 (**n = 3**) 33.3% against 5–6 (n = 282) 14.5%, p = 0.381.
WILD: `nRoled` 2–3 (**n = 3**) 66.7% against 5–6 (n = 282) 8.9%, **p = 0.024**.

★★ **The wild cell is not a finding and must not be quoted as one. It is two races out of three.**
There are only three races in all 300 with `nRoled ≤ 3`, and they are the same three in both stages
(`city-circuit#19`, `ice-track#11`, `ice-track#24`). One race changing its mind moves that 66.7% to
33.3%. The conservative reading, taken here: **the cast-quantity split has no usable contrast at
all** — 282 of 300 races cast 5 or 6 roled racers, so "few roles" is a 1% corner of the fixture.

★ **A SECOND, INDEPENDENT REASON TO DISCARD THAT CELL** (added 2026-09-22): the fixture replicates
30 seeds over ten tracks, and the three `nRoled ≤ 3` races sit on just **two distinct seeds**
(`ice-track#11`, `ice-track#24`, `city-circuit#19`). The Fisher test treats them as three
independent observations; they are not. See the clustering note in §6 — the p = 0.024 is
anti-conservative on top of resting on two races.

---

## 4 · TABLE 3 — WHO IS IN THE GROUP, POST-RENAME

Enrichment = a role's share of breakaway-group slots ÷ its share of all racer-slots. **Zero rows are
included, because they are the point.**

**QUIET** — 48 breakaways, 131 group slots, 67 roled = **51.1%** (against **13.7%** of all racer-slots)

| role | at the FRONT | all slots | share of slots | share of all racers | **enrichment** |
|---|---|---|---|---|---|
| ★ `sovereign-lead` | **20** | 41 | 31.3% | 2.37% | ★★ **13.22×** |
| `pursuer` | 5 | 12 | 9.2% | 1.04% | ★ **8.79×** |
| `comebacker(staged)` | 1 | 12 | 9.2% | 1.74% | **5.26×** |
| ★ `attacker-b2` | 1 | 2 | 1.5% | 7.33% | ★ **0.21× — DEPLETED** |
| ★★ `faller` | **0** | **0** | **0.0%** | 1.18% | ★★ **0.00× — never once** |
| `comebacker` (unstaged) | 0 | 0 | 0.0% | 0.00% | — (extinct) |
| *(uncast)* | 21 | 64 | 48.9% | 86.34% | 0.57× |

**WILD** — 29 breakaways, 78 slots, 39 roled = 50.0%: `sovereign-lead` **13.54×** (11 at front, 25
slots), `pursuer` **7.38×** (6), `comebacker(staged)` **5.15×** (7), `attacker-b2` **0.17×** (1),
`faller` **0.00×** (0), uncast 0.58×.

**Three facts survive both stages.** `sovereign-lead` is ~13× over-represented in breakaway groups
and leads 20 of 48 of them. **The `faller` is never in one — 0 of 131 slots and 0 of 78** — despite
being 1.18% of all cast racers. And **`attacker-b2` is strongly depleted at ~0.2×** while being the
largest cast population at 7.33% of all racers: the three attackers per race are, if anything,
*under*-represented at the front of a breakaway.

★ **But Table 2 shows the enrichment is not predictive.** `sovereign-lead` fills breakaway groups and
its presence still does not raise the breakaway rate — because it is cast in 94.7% of races either
way. **Being in the picture is not the same as causing it**, and these two tables are exactly that
distinction.

---

## 5 · TABLE 4 — BOTH HALVES

Medians per race, in-window `[0.70, finish]`; the top-5 spread is the world-px checkpoint at 0.90.

**QUIET**

| split | breakaway rate | lead changes | overtakes | top-5 spread @0.90 | action verdict |
|---|---|---|---|---|---|
| all races | 16.0% | 2 | 426 | 113.7 px | (baseline) |
| casts `sovereign-lead` | 15.1% | 2 | 430 | 113.2 | — |
| no `sovereign-lead` | 31.3% | 2 | 417 | 118.0 | — |
| casts `comebacker(staged)` | 14.4% | 2 | 434 | 108.4 | — |
| no `comebacker(staged)` | 19.8% | 2 | 418 | 118.5 | — |
| casts `faller` | 17.0% | 2 | 433 | 116.5 | — |
| no `faller` | 15.1% | 2 | 425 | 109.8 | — |
| casts `pursuer` | 15.4% | 2 | 425 | 112.7 | — |
| no `pursuer` | 16.4% | 2 | 427 | 114.5 | — |

**WILD**: all races 9.7% / 2 / 454 / 112.6 px; `faller` 7.1% vs 11.9% with overtakes 454 vs 454;
`pursuer` 8.1% vs 10.7% with 449 vs 460 and lead changes 3 vs 2; `comebacker(staged)` 9.6% vs 9.9%
with 458 vs 443.

★ **No split fails the owner's both-halves requirement, because no split passes the first half
either.** The action columns move by a few per cent with no consistent sign and no split lowers the
breakaway rate significantly, so **there is no arm here that buys fewer breakaways at the cost of
front movement.** The requirement is recorded as met vacuously, not as satisfied.

★ Worth noting beside it: **wild has far fewer breakaways than quiet — 29/300 = 9.7% against
48/300 = 16.0%** — on an identical cast. The stage, not the casting, is what moves this number in
this data.

---

## 6 · ★ WHAT THIS BLOCK DOES **NOT** ESTABLISH

- **This is an ASSOCIATION, not a cause.** Every split compares races that happen to be cast one way
  against races that happen to be cast another. The casting is a deterministic function of the seed
  and the post-chaos field, so the two buckets differ in **the field that produced the casting** as
  well as in the casting itself. A null result here does not prove casting is inert; it proves the
  cast **does not predict** the breakaway.
- **★★ For `attacker-b2` and `sovereign-lead` the question cannot be answered this way at all.**
  They are cast in 100% and 94.7% of races. `attacker-b2` has literally zero comparison races.
  `sovereign-lead` has 16, and those 16 are **not a random sample** — they cluster on particular
  seeds (11, 6, 12, 19, 20, 3, 4, 26) and are races where the hero budget did not reach that slot,
  so they differ from the other 284 in more than the missing role. **The −16.1 pp at p = 0.150 must
  not be read as "casting the sovereign-lead prevents breakaways."**
- **What would be needed instead: a counterfactual arm — the same seed raced with a cast site
  switched off.** ★ **No config key exists for that today.** `minHeroes`/`maxHeroes` are literals
  (below), and there is no per-role disable. It would be a **source change, and it is NOT proposed
  here.**
- The `nRoled` contrast is unusable at this fixture: 282 of 300 races cast 5 or 6.

- ★★ **THE FIXTURE IS 30 SEEDS × 10 TRACKS, SO A QUANTITY DETERMINED BY THE SEED ALONE HAS AN
  EFFECTIVE N OF 30, NOT 300.** Measured directly — seeds whose value is identical on all ten
  tracks:

  | quantity | seeds identical across all ten tracks |
  |---|---|
  | `attacker-b2` cast | **30 of 30** — wholly seed-determined |
  | `faller` cast | 26 of 30 |
  | `sovereign-lead` cast | 22 of 30 |
  | `pursuer` cast | 17 of 30 |
  | `comebacker(staged)` cast | 15 of 30 |
  | ★ **`packBreakaway` (the OUTCOME)** | **5 of 30** |

  ★ **AND THIS IS WHY THE SPLITS SURVIVE IT.** The outcome is strongly **track**-dependent — the
  same seed gives the same breakaway verdict on all ten tracks in only **5 of 30** cases — so the
  300 rows carry real information and are not ten copies of 30 answers. What the clustering does
  affect is the **arithmetic of the p-values**: the Fisher tests in §3 treat all 300 rows as
  independent, which makes every p **anti-conservative (too small)**. ★★ **Since every split is
  already null, a properly clustered test would only make them MORE null. The conclusion of this
  report is unchanged and, if anything, strengthened.**

---

## 7 · THE THREE PREAMBLE FACTS — VERIFIED

1. ★ **The `nHeroes` staircase is real, and the quantity lever is unreachable from any config key.**
   `nHeroes = Math.round(config.minHeroes + (config.maxHeroes - config.minHeroes) * t)` at
   [heroCurveGenerator.js:234](../../client/src/modules/heroCurveGenerator.js#L234), with
   `minHeroes: 2` / `maxHeroes: 4` as literals at
   [:37-38](../../client/src/modules/heroCurveGenerator.js#L37-L38) — a three-step staircase with
   edges at t = 0.25 and t = 0.75, so the shipped `choreoIntensity: 0.6`
   ([defaults.js:1041](../../client/src/modules/storage/defaults.js#L1041)) gives **3**.
   **CONFIRMED and strengthened**: a repo-wide search finds those names in exactly three places —
   the two literals, the staircase, and one test assertion. `racePlanner.js:1142` spreads
   `...GENERATOR_CONFIG` and the overrides threaded at `:1143-1156` are `anchorProgress`,
   `dropBudgetFrac`, `releaseProgress`, `bandResolve` and the five `b2Attack*` keys — **neither hero
   bound is among them.** Not in `defaults.js`, not in the `raceCore.js` copy list.
2. **ACTION-LEVERS-1 §6d** — CONFIRMED verbatim at
   [ACTION-LEVERS-1.md:250-256](../night/ACTION-LEVERS-1.md#L250-L256): `b2AttackHeroes` at 6 gives
   top-5 spread **−8.4%** and held passes **−5.2%**, both 1/9, p = 0.021. ★ **With the caveat that
   report makes about itself**: held passes is the **PULK** window, not the OUTCOME window the +21%
   shipping claim was measured in, so it is a fact beside that claim rather than against it.
3. **The existing N=300 data** — CONFIRMED by recomputation: **131 group slots, 67 with a role =
   51.1%**, against 13.6% of the field, and **2 of 131 are `attacker-b2`**. Table 3 above reproduces
   all three and adds the roles that census could not name.

---

## 8 · THE RESULT

**"Cast more" is not supported by anything measured here, and the block refutes the premise behind
it rather than the tactic.** The question was whether the cast *causes* the owner's breakaway. The
answer at N=300 in both stages is that **the cast does not predict it at all** — every testable role
is null, the two roles that actually fill breakaway groups cannot be tested because they are cast in
95–100% of races, and the one direction that is visible (casting goes with *fewer* breakaways, never
more) is not significant anywhere and reverses sign between stages for two roles.

★ Set beside the preamble's other two facts, the picture is consistent: the quantity lever is
**unreachable** from any config key, more attackers were already measured as making the field
**tighter** with **fewer** passes, and the cast **has no measurable association** with the breakaway.
**There is nothing here to rescue, and no remedy is proposed.**
