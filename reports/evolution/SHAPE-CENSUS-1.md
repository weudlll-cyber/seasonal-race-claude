# SHAPE-CENSUS-1 — a sovereign-lead is cast in 38 of 100 races, and the contested fight is not the main case because it is never cast

**Branch** `read/shape-census-1` · **READ-ONLY — no source changed, nothing minted, nothing merged,
nothing tuned.** One read of `server/data/races.sqlite`, opened `readonly`, for the owner's roster.

---

## ★★ THE ONE SENTENCE

> **A `sovereign-lead` is cast in 37.7 of every 100 races** (N=300, his fixture). ★★ **And the
> contested fight is NOT the main case — the code has a shape for it, `relationalWaypoints`
> ("photo-finish / front-battle-then-collapse", [heroCurveGenerator.js:383](../../client/src/modules/heroCurveGenerator.js#L383)),
> and NOTHING IN THE PRODUCT EVER CALLS IT.** Its only callers are its own unit test.
>
> ★ **The main case is a racer with no role at all**: 86% of the field is uncast, and uncast racers
> produce **55.6% of all breakaways** — more than every cast role put together.

---

## 1 · THE SELECTION — FOUR SITES, AND WHICH WINS

### The roles the code defines (not the docs)

Exactly four, all string literals in `heroCurveGenerator.js`: **`sovereign-lead`**, **`comebacker`**
([heroCurveGenerator.js:616](../../client/src/modules/heroCurveGenerator.js#L616)), **`faller`**
([heroCurveGenerator.js:636](../../client/src/modules/heroCurveGenerator.js#L636)) and
**`attacker-b2`** ([heroCurveGenerator.js:715](../../client/src/modules/heroCurveGenerator.js#L715)).

### ★ It is NOT a weighted draw. Four sites cast, in this order, and the earlier ones win by taking slots

| # | site | what it casts | how it is chosen |
|---|---|---|---|
| 1 | [heroCurveGenerator.js:611-621](../../client/src/modules/heroCurveGenerator.js#L611-L621) | the **drawn winner** | ★ **a CONDITION, not a draw**: `const role = wr <= cr ? 'sovereign-lead' : 'comebacker'` — `sovereign-lead` iff his post-chaos rank is already at or ahead of the front-cluster rank. **Runs first and always.** |
| 2 | [heroCurveGenerator.js:623-638](../../client/src/modules/heroCurveGenerator.js#L623-L638) | **`faller`** | ★ **seed-derived**: `shouldCastFaller` ([:498-500](../../client/src/modules/heroCurveGenerator.js#L498-L500)) is `mulberry32(seed ^ 0x7a11e5)() < 1 / fallerEveryNRaces`, with `fallerEveryNRaces: 3` ([:68](../../client/src/modules/heroCurveGenerator.js#L68)) — **~1 race in 3**, and only while `cast.length < drama.nHeroes`. |
| 3 | [heroCurveGenerator.js:642-673](../../client/src/modules/heroCurveGenerator.js#L642-L673) | the **B1 pool** fills the remaining budget | the pool is **shuffled by the seeded rng**, then: the **STAGED** comebacker at [:657](../../client/src/modules/heroCurveGenerator.js#L657) (`addHeld`, once per race, and only if `p.index !== winnerIdx`), otherwise the solo fall-back at [:672](../../client/src/modules/heroCurveGenerator.js#L672), again **a condition**: `p.rank > cr ? 'comebacker' : 'sovereign-lead'`. |
| 4 | [heroCurveGenerator.js:675-720](../../client/src/modules/heroCurveGenerator.js#L675-L720) | **`attacker-b2`** | a **SEPARATE budget**, `b2AttackHeroes` ([defaults.js:1090](../../client/src/modules/storage/defaults.js#L1090) = **3**), cast **after and independently of** the `nHeroes` cap — front-post-chaos B2 finishers, feasibility-filtered. |

★★ **WHICH WINS WHEN THEY DISAGREE: the ORDER does, through `used` and the budget.** Sites 1–3 share
one budget and run in sequence; `addSolo`/`addHeld` mark a racer `used`, so **the drawn winner takes
the first slot unconditionally**, the faller takes the second **if its seed draw fires and a
feasible candidate exists**, and the B1 pool gets whatever is left. Site 4 is outside that contest
entirely. ★ **There is no priority table and no weights — the sequence IS the priority.**

### How many racers get a role

`nHeroes = round(minHeroes + (maxHeroes − minHeroes) × t)`
([heroCurveGenerator.js:234](../../client/src/modules/heroCurveGenerator.js#L234)) with
`minHeroes: 2`, `maxHeroes: 4` ([:37-38](../../client/src/modules/heroCurveGenerator.js#L37-L38)) and
`t` the **realized** intensity. Requested is `choreoIntensity: 0.6`
([defaults.js:1041](../../client/src/modules/storage/defaults.js#L1041)) → **3**. ★ **But it is not
fixed**: `clampIntensityToBudget` ([:239-257](../../client/src/modules/heroCurveGenerator.js#L239-L257))
walks `t` **down** in steps of 0.05 until the drawn winner's comeback is feasible for **this field's
density**, so `nHeroes` is field- and track-dependent. Plus up to **3** `attacker-b2`.

### What the choice depends on

| input | does casting depend on it? | where |
|---|---|---|
| **field size** | ★ **YES** | `clampIntensityToBudget` and `racerFeasibility` are density-based; `peakRank` is `clamp(round(1 + peakDepthFrac × (n−1)), 1, n)` ([:253](../../client/src/modules/heroCurveGenerator.js#L253)) |
| **track / lap count** | ★ **YES** | `finishT` is threaded into `racerFeasibility` and `feasibleTiming` ([:765-767](../../client/src/modules/heroCurveGenerator.js#L765-L767)) |
| **seed** | ★ **YES** | the faller gate and the B1 pool shuffle are both `mulberry32(seed …)` |
| ★ **action stage** | ★★ **NO** | the stage table writes only `pulkChallengerBoost` and `pulkLeaderBrake` ([defaults.js:1172-1184](../../client/src/modules/storage/defaults.js#L1172-L1184)), and **`heroCurveGenerator.js` contains zero references to either key** — measured by grep, count 0. **Confirmed by race in §3.** |

---

## 2 · THE COUNT — RACED, NOT COMPUTED

**Fixture: his own.** `city-circuit`, **40 racers**, **his `QN3HDP` roster** read read-only from the
store, track-default racer (`motorbike`), stage `wild`. **Canvas widths use the CORRECTED expression**
`dt × pathLengthPx / visibleWorldPx`; the threshold is his own photographed lead, corrected: **0.698**.

★ **N=30 was not enough and it is stated rather than hidden.** At N=30 `sovereign-lead` appeared to
out-produce `comebacker` (27.8% against 16.7%, on 5 races against 3). **At N=300 the ranking
reverses** — 19.1% against 24.7%. The 30-race read would have inverted the answer, so the main cell
is **N=300**.

### A · How often each role is cast — N=300

| role | races with ≥1 | ★ **share** | racers cast | mean per race |
|---|---|---|---|---|
| `attacker-b2` | 300 of 300 | ★ **100.0%** | 873 | **2.91** |
| `comebacker` | 295 of 300 | ★ **98.3%** | 545 | **1.82** |
| — of which **STAGED** (held + released) | 217 of 300 | ★ **72.3%** | 217 | 0.72 |
| ★ **`sovereign-lead`** | 113 of 300 | ★★ **37.7%** | 113 | 0.38 |
| `faller` | 98 of 300 | **32.7%** | 98 | 0.33 |

★ **The faller's 32.7% is its gate exactly** — `1 / fallerEveryNRaces` = 1/3. The gate is doing what
it says.

★★ **NOT ONE RACE IN 300 HAS NO ROLE AT ALL.** Every race is cast.

### B · How many racers carry a role — N=300

| roled racers | races | share |
|---|---|---|
| 2 | 1 | 0.3% |
| 3 | 6 | 2.0% |
| 4 | 22 | 7.3% |
| 5 | 105 | 35.0% |
| ★ **6** | **166** | ★ **55.3%** |

`nHeroes` budget actually used: **3 in 172 races, 2 in 112, 1 in 16** — the clamp bites in 43% of
races. `attacker-b2` count: **3 in 281 races**, 2 in 11, 1 in 8.

★ **Mean 5.43 roled racers of 40 — 13.6% of the field. 86.4% of every field is uncast.**

### C · Does it depend on track or field size? — N=30 each, one table

| cell | N | sovereign-lead | comebacker | STAGED | faller | attacker-b2 | mean roled | no role |
|---|---|---|---|---|---|---|---|---|
| ★ **city-circuit, 40** (his) | 30 | **36.7%** | 96.7% | 73.3% | 46.7% | 100.0% | 5.30 | 0 |
| `mountainstreet`, 40 — **open, 1 lap** | 30 | ★ **46.7%** | 93.3% | 70.0% | 46.7% | 100.0% | 5.50 | 0 |
| city-circuit, **20 racers** | 30 | ★ **50.0%** | 96.7% | 73.3% | 30.0% | 100.0% | 5.57 | 0 |

★ **Yes, but only through `sovereign-lead`** — 36.7% → 46.7% → 50.0%. That is the site-1 condition
(`wr <= cr`) firing more often when the drawn winner is more likely to already be near the front: a
shorter open race and a smaller field both make that likelier. **`comebacker`, `attacker-b2` and the
staged share barely move, and "no role at all" is zero everywhere.**

---

## 3 · ★★ THE STAGE CHANGES NOTHING ABOUT CASTING — PROVEN SEED BY SEED

| cell | N | sovereign-lead | comebacker | STAGED | faller | attacker-b2 | mean roled | breakaway rate |
|---|---|---|---|---|---|---|---|---|
| `quiet` | 30 | 36.7% | 96.7% | 73.3% | 46.7% | 100.0% | 5.30 | **50.0%** |
| `wild` | 30 | 36.7% | 96.7% | 73.3% | 46.7% | 100.0% | 5.30 | **60.0%** |
| `medium` | 30 | 36.7% | 96.7% | 73.3% | 46.7% | 100.0% | 5.30 | **70.0%** |

★★ **THE CAST IS BYTE-IDENTICAL ACROSS ALL THREE STAGES, SEED BY SEED: 30 of 30, zero differences** —
same racers, same roles, same staged comebacker. ★ **And 18 of the same 30 races change their
breakaway verdict.** Median race-max lead moves **0.711 → 0.819 → 0.859 corrected widths**.

> ★★ **So the corrected 32 → 37 → 44% rise across the stages comes entirely from THE SAME CASTING
> BEHAVING DIFFERENTLY, not from different shapes being cast.** The stage is a physics lever applied
> after the shapes are chosen, and the code says why: casting cannot see `pulkChallengerBoost` or
> `pulkLeaderBrake` at all.

★ **One caveat, stated:** at N=30 on one track the ordering `quiet < wild < medium` is not the
corrected recount's `quiet < medium < wild` (32/37/44, N=100, ten tracks pooled). **Those two orders
are within each other's noise at these N and on different fixtures**; the claim that survives is
that the stage moves the outcome while leaving the casting untouched, which is exact.

---

## 4 · ★★ CONTRIBUTION — WHERE THE BREAKAWAYS ACTUALLY COME FROM

N=300, his fixture, `wild`. **178 of 300 races (59.3%)** contain a lead ≥ his corrected 0.698.

| rank | role | population | produces the biggest gap in | ★★ **share of ALL breakaways** | per-racer over-rep |
|---|---|---|---|---|---|
| ★ **1** | ★ **uncast** | 10 371 slots (**86.4%**) | **99** races | ★★ **55.6%** | 0.6× |
| 2 | `comebacker` | 545 (4.5%) | **44** | ★ **24.7%** | **5.4×** |
| 3 | `sovereign-lead` | 113 (0.9%) | **34** | ★ **19.1%** | ★ **20.3×** |
| 4 | `attacker-b2` | 873 (7.3%) | 1 | **0.6%** | 0.1× |
| 5 | `faller` | 98 (0.8%) | **0** | ★ **0.0%** | 0.0× |

★★ **THIS IS THE NUMBER THE OVER-REPRESENTATION HID.** `sovereign-lead` is the most over-represented
racer in the game — **20.3× per racer** — and it still accounts for **under a fifth** of breakaways,
because it is only 0.9% of the field. ★ **The uncast majority, at 0.6× per racer, produces more
breakaways than every cast role combined.**

★ **Cross-check against the corrected recount** (BREAKAWAY-RECOUNT-1, ten tracks pooled, Quick-Test
roster, N=100 at `wild`): uncast **38.6%**, comebacker 34%, sovereign-lead 27%, attacker-b2 0%. ★
**Same shape of answer, different fixture** — uncast first, attacker-b2 zero — and the two are not
pooled here because they are different races.

★ **`attacker-b2` is 7.3% of every field and produces 0.6% of breakaways.** Three racers per race
are cast into a role that, measured, contributes essentially nothing to the thing the owner
dislikes — and `faller`, at one race in three, contributes exactly zero.

---

## 5 · ★★ THE OWNER'S EXPECTATION, CHECKED

He expects **a comebacker sometimes, a sovereign-lead sometimes, and a contested fight between
several racers as the MAIN case.**

| expectation | counted | verdict |
|---|---|---|
| a comebacker **sometimes** | cast in **98.3%** of races, 1.82 per race | ❌ **not "sometimes" — ALWAYS, and usually more than one** |
| a sovereign-lead **sometimes** | cast in **37.7%** | ✅ **matches** |
| a contested fight as the **MAIN case** | ★★ **never cast at all** | ❌ **the shape exists and is dead code** |

★★ **THE ABSENCE IS THE FINDING, AND IT IS NOT AN ABSENCE — IT IS A DEAD SHAPE.**
`relationalWaypoints` at [heroCurveGenerator.js:383](../../client/src/modules/heroCurveGenerator.js#L383)
is titled *"Archetype family B: RELATIONAL (photo-finish / front-battle-then-collapse)"* — precisely a
contested fight between several racers. **Every reference to it in the whole tree is its own
definition and two lines of its own unit test** (`heroCurveGenerator.test.js:300` and `:308`). ★ **No
production path calls it.** It is already on the record as a dead export in
[SEPARATION-TO-TEST-1](SEPARATION-TO-TEST-1.md) §79, listed beside `bandMultiset` — **catalogued as
dead code, never as a missing feature.**

★ **What ships instead** is a structural gesture at the same idea, not a cast shape: the B1 heroes
are placed into a **tight front cluster** at ranks 2, 3, 4… and rank 1 is left to the run-out
([heroCurveGenerator.js:604-609](../../client/src/modules/heroCurveGenerator.js#L604-L609)) — *"a
close pack, NOT a clear rank-1 lead"*. **The intent is in the code. The shape that would author it is
not connected.**

> ★★ **SO THE MAIN CASE IS NOT A CONTESTED FIGHT. It is one racer with no role at all getting
> clear** — 55.6% of breakaways, from the 86% of the field nothing is steering.

---

## 6 · NOTICED, AND DELIBERATELY LEFT ALONE

- ★ **`relationalWaypoints` is dead and I did not wire it up.** Naming it is this block's job;
  connecting it is a build, and this block builds nothing.
- ★ **`clampIntensityToBudget` reduces `nHeroes` below 3 in 43% of races** (2 in 112, 1 in 16 of 300).
  That is a large, silent, field-dependent reduction in how much of the race is authored at all. Not
  pursued — it was not asked and it is a lever, not a count.
- ★ **`faller` costs a cast slot in one race in three and produces zero breakaways**, and
  `attacker-b2` takes 7.3% of every field for 0.6%. Both measured, neither touched.
- The census counts **who held the largest gap**. A role that contributes to a breakaway without
  holding the largest gap — by dropping out of the chase, say — would not show here. **Stated because
  the `faller` 0% could have that shape**, and this instrument cannot tell the two apart.

---

## 7 · THE LEVER, IN ONE SENTENCE, AND THEN I STOP

**The breakaways come from the 86% of the field nothing is steering, so the lever is not which shape
is cast or how often — it is whether anything acts on the uncast majority at all.**

---

## 8 · THE STORE

One read, `readonly`, for his roster. **Unchanged:** 14 races, 221 184 B, mtime
`2026-09-14T07:15:45.2733297Z`, MD5 `fb51751688f74577fff4d83b67313ab2` — identical before and after.
