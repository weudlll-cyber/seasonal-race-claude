# PRESTAGING-WHY-1 — the racer who loses his role is NOT the one who breaks away; the front group loses a steered member and nobody replaces him

Branch `feat/remove-prestaging-comebacker`. Date: 2026-09-18.
**Read-only measurement. No source changed, nothing minted, nothing merged.** Master was merged into
a **probe copy** of the branch; that merge was never pushed. ★ **Nothing was instrumented in either
tree** — the cast is read from the race plan's own accessors.

---

## ★★★ THE ANSWER

**The standing guess is wrong.** It supposed that the racer who lost his role now runs uncast and
breaks away. Measured per racer, over 300 paired races:

| of the 69 races where the branch's peak is larger AND a cast was removed | count |
|---|---|
| held by **the racer who lost his role** | **10** |
| held by ★ **someone else** | ★ **59 (86%)** |
| not attributable | 1 |

★★ **And on the eight races that newly cross the >124 px escape threshold — the ones the whole
question is about — seven of eight are held by somebody else.**

★ **The racer who loses his role is not even harmed by it.** His finishing position **improves in 68
races and worsens in 43** (median **−1 place**); he finishes top-5 in **111 of 125** on master and
**115 of 125** on the branch.

**What actually happens:** the removed path put a **steered comebacker into the front cluster** —
`addSolo(p.index, role, cr, peakRank)` at
[heroCurveGenerator.js:672](../../client/src/modules/heroCurveGenerator.js#L672), where
`cr = nextCluster()` = `Math.min(b1Cluster, BAND_EDGES[0])` at
[heroCurveGenerator.js:610](../../client/src/modules/heroCurveGenerator.js#L610), so his authored
final rank is **capped at 5**. On master he finishes **top-5 in 89% of races** and sits a **median of
one place behind** the racer holding the race's peak gap. **Remove him and that slot is left empty in
118 of 123 races**, and the extra gap is opened by whoever occupies the front instead — most often a
racer who was **uncast** on master (30 of 69) or the **drawn winner** himself (19 of 69).

**It is the BUDGET that goes unfilled, not the racer that was special.**

---

## 1 · THE TWO ARMS, AND THE NOISE FLOOR

| | |
|---|---|
| control arm | the real tree at **master `fe12fa95`**, brake ON because `defaults.js` says so |
| branch arm | **probe copy** of `feat/remove-prestaging-comebacker` (`5c9e050e`) with `origin/master` merged in, never pushed |
| fixture | ten tracks, **seeds 1–30**, N=30/track = **300 races per arm**, 40 racers, the owner's roster, `wild` |
| config | shipped defaults, **no override of any kind**; `servoNoiseBlindEnabled` false on both arms |
| units | **world px primary**; canvas widths only against the settled **225 px/width** (`reports/night/BRAKE-JERK-1.md:222`, from ZOOM-PER-STATE-1) |

### ★★ THE FLOOR IS EXACTLY ZERO

| | |
|---|---|
| races where the two arms' **cast sets are identical** | **176 of 300** |
| ...of those, **byte-identical races** | ★ **176 — all of them** |
| races where the cast sets differ | 124 |

★ **So any difference at all between the arms is a real difference**, and every number below rests on
the 124 races where the cast actually changed.

### ★ THE FLOOR CAUGHT MY FIRST CLASSIFIER, AND THE FIX IS THE METHOD

My first pass labelled each cast racer by SITE structurally — role, plus "is this the assigned
winner". It reported **2 races that differed with nothing removed**, which under the floor rule had
to be explained before anything else was read. Both were mislabels, and the branch's own source
explains both:

1. **The removed fall-back carries NO `winnerIdx` exclusion.** Only the staged attempt has it, at
   [heroCurveGenerator.js:654](../../client/src/modules/heroCurveGenerator.js#L654); the `addSolo` at
   [:672](../../client/src/modules/heroCurveGenerator.js#L672) has none. **So on master the assigned
   winner can be cast by the removed path** — and a structural test calls that "winner-site".
   *(ice-track seed 11: master casts idx 8, the assigned winner; the branch does not cast him at all.)*
2. **On master a refused `addHeld` falls through to `addSolo` and consumes the budget.** The branch's
   loop instead continues to a **later** pool member, so it can stage somebody master never staged.
   *(mountainstreet seed 14: the branch stages idx 25; master casts nobody from the pool.)*

★★ **The fix is a DIFFERENTIAL classifier, and it is exact.** The plan is built from the same seed
and the same post-chaos field on both arms **before any racing**, and the only difference between the
trees is that one loop — so **master-only casts ARE the removed path's**, and branch-only casts are
stagings master never reached. **Every attribution below uses the differential, not the structural
label.** On the differential the floor is zero.

---

## 2 · FOLLOW THE RACER

**The removal is not one-directional.** Of 300 paired races:

| | |
|---|---|
| branch's in-window peak **larger** | **70** |
| master's peak larger | **54** |
| equal (byte-identical) | 176 |

★ **It makes 54 races better and 70 worse.** The tail grows on balance; it does not grow everywhere.

### ★★ ATTRIBUTION — who holds the extra gap

Of the **69** races where the branch peak is larger *and* a cast was actually removed:

| | count |
|---|---|
| **A** — held by the racer who **lost his role** | **10** |
| ★ **B** — held by **someone else** | ★ **59** |
| **C** — not attributable (no removed cast in that race) | 1 |

**What the extra-gap holder WAS on the master arm:**

| on master he was… | races |
|---|---|
| ★ **uncast** | **30** |
| the drawn winner's cast (`winner-site`) | 19 |
| ★ the removed cast himself | **10** |
| staged | 6 |
| a B2 attacker | 3 |
| the faller | 1 |

★ **The single largest group is a racer who carried no role on either arm** — his race changed
because the cast around him changed, which is cause B in its purest form.

### The twelve largest increases, by racer

| track | seed | Δ lead | holder | branch / master site | removed cast (finish M→B) |
|---|---|---|---|---|---|
| luger-hill | 26 | **+120.2** | Raven | winner-site / winner-site | Blaze 5→5 |
| ice-track | 20 | +97.9 | Shadow | faller / faller | Phantom 4→5 |
| searound | 3 | +94.7 | Apex | **uncast / uncast** | Raven 4→3 |
| mountainstreet | 26 | +93.2 | Phantom | staged / staged | Thunder 5→3 |
| dirt-oval | 20 | +75.2 | Nitro | winner-site / winner-site | Phantom 3→1 |
| mountainstreet | 10 | +66.6 | Phantom | **uncast / removed-path** | Phantom 5→1 |
| dirt-oval | 8 | +66.2 | Mercury | winner-site / winner-site | Comet 7→4 |
| city-circuit | 9 | +62.9 | Thunder | staged / staged | Comet 5→3 |
| garden-path | 1 | +62.9 | Blitz | **uncast / uncast** | Arrow 2→2 |
| searound | 24 | +62.5 | Zephyr | staged / staged | Maverick 4→4 |
| ice-track | 15 | +53.8 | Maverick | winner-site / winner-site | Titan 7→2 |
| space-sprint | 27 | +52.6 | Breeze | **uncast / uncast** | Apex 1→2 |

★ **Only one row in twelve is the racer who lost his role** (mountainstreet 10 — and note he finishes
**5→1**, i.e. he *wins* the branch race rather than being cast adrift).

### ★★ THE EIGHT RACES THAT NEWLY BECOME ESCAPES

The headline cost is >124 px late gaps going 8 → 15 of 300. Race by race that is **8 new escapes and
1 that stops being one, net +7**:

| track | seed | branch late px | holder | was on master |
|---|---|---|---|---|
| city-circuit | 30 | 137.4 | Speedy | staged |
| dirt-oval | 8 | 128.4 | Mercury | winner-site |
| dirt-oval | 19 | 133.0 | Gale | **uncast** |
| ice-track | 15 | 128.1 | Maverick | winner-site |
| ice-track | 18 | 127.8 | Blaze | winner-site |
| mountainstreet | 26 | 129.7 | Phantom | staged |
| searound | 11 | 131.8 | Falcon | **uncast** |
| space-sprint | 26 | 131.0 | Phantom | **the removed cast himself** |

★★★ **Seven of the eight are held by somebody else.** The one that is not — space-sprint 26 — is the
racer who lost his role, and his finish goes **5 → 1**.

---

## 3 · WHAT THE REMOVED CAST WAS DOING

On the master arm, across the **125** removed-path casts (in 123 races):

| | |
|---|---|
| his role | ★ **always `comebacker`** |
| is the assigned winner | 1 of 125 |
| **ever leads** (≥1 step in P1) | **82 of 125 — 66%** |
| **holds the race's peak gap** | ★ **12 of 125 — 10%** |
| lead-share of the race | median **1.77%**, p90 **11.22%** |
| finishes **top-5** | ★ **111 of 125 — 89%** |
| finishing position, median | **3rd** |

★★ **He is cast WITHOUT a hold and WITHOUT a release point — and that does not mean "nothing".** The
call at [heroCurveGenerator.js:672](../../client/src/modules/heroCurveGenerator.js#L672) is
`addSolo(p.index, role, cr, peakRank)`, which gives him a full anchor→peak→resolve curve whose
**final rank is `cr = nextCluster()` = `Math.min(b1Cluster, BAND_EDGES[0])`**
([:610](../../client/src/modules/heroCurveGenerator.js#L610)) — **capped at 5**. What he lacks against
`addHeld` is the hold at a staging rank and the release, **not the steering**. In motion that reads
exactly as the numbers show: **he touches the front (leads in two thirds of races) but never owns it
(10% of peaks), and he lands in the top five nine times out of ten.**

### ★ Does his presence suppress a gap somebody else opens once he is gone?

| | |
|---|---|
| removed cast finished **BEHIND** the extra-gap holder on master | ★ **41 of 69** |
| ...**AHEAD** of him | 18 |
| ...**IS** the holder | 10 |
| his finish minus the peak-holder's, **median** | ★ **+1 place** |
| finished **within 3 places** of the peak holder | ★ **95 of 123 — 77%** |

★★ **He is the pursuer.** In 41 of 69 cases he was, on master, finishing **behind** the very racer who
opens the larger gap on the branch, and across all races he sits a **median of one place behind** the
peak-gap holder and within three places in **77%**. **Take the pursuer out of the front group and the
gap in front of him grows.**

★ **One honest limit on that reading:** finishing position is a proxy for "was he behind the leader
during the window". The instrument records who held P1 at each step, not who held P2, **so I can say
he finishes just behind the gap-holder and cannot say he was directly behind him at the moment the
gap opened.**

★ **And it is not the same leader simply escaping further.** In only **23 of 69** does the same racer
hold the peak on both arms (mean extra gap **+21.7 px**); in **46 of 69** a **different** racer holds
it (mean **+33.0 px**). **The bigger increases come with a change of who is in front.**

---

## 4 · IS IT THE CAST OR THE BUDGET

| per race | MASTER | BRANCH |
|---|---|---|
| non-B2 cast — **inside the `nHeroes` budget** | **2.53** | ★ **2.13** |
| B2 attackers — **separate budget** | 2.93 | **2.93** |
| total cast | 5.46 | 5.07 |

★ **The B2 attackers are untouched**, which is right: they are cast outside the `nHeroes` cap
([heroCurveGenerator.js:675](../../client/src/modules/heroCurveGenerator.js#L675),
[:680](../../client/src/modules/heroCurveGenerator.js#L680)). The whole loss is inside the budget.

**In the 123 races where the removed path fired on master:**

| | |
|---|---|
| branch ends with **FEWER** cast racers | ★ **118** |
| branch ends with the **same** number | **5** |
| ...and in all 5 the slot was refilled by a **new staging** master never reached | 5 |

★★★ **The freed slot is left EMPTY in 118 of 123 races — 96%.** The budget is real: `nHeroes` is
`round(minHeroes + (maxHeroes − minHeroes) · t)` at
[heroCurveGenerator.js:234](../../client/src/modules/heroCurveGenerator.js#L234) with `minHeroes: 2`
at [:37](../../client/src/modules/heroCurveGenerator.js#L37), and the pool loop stops at
`cast.length >= drama.nHeroes` ([:652](../../client/src/modules/heroCurveGenerator.js#L652)). **The
branch simply runs with fewer steered racers.**

★ **So "the specific racer mattered" and "the budget went unfilled" are not competing explanations
here — the removed racer WAS the budget occupant.** What the counts separate is which end does the
damage, and the answer is the empty slot: the man who vacates it is fine (§2), and the gap is opened
by whoever is left in front of it (§3).

---

## 5 · THE ANSWER, AND WHAT IT WOULD IMPLY

**Cause B holds: 59 of 69 attributable races, and 7 of the 8 races that newly become escapes.** The
racer who lost his role is not the one breaking away and is not harmed. The front group loses a
steered member, **nothing replaces him in 96% of races**, and an unsteered or differently-steered
racer inherits the space.

**What each cause would imply for a remedy — NOTHING WAS BUILT, and this is a list, not a plan:**

- ★ **If the budget is the thing (what the evidence says): refill the slot.** A pool member the
  staging refuses would need *some* role rather than none. ★ **This is NEW WORK — there is no setting
  for it.** `nHeroes` is a derived budget, not a key, and nothing in `defaults.js` chooses what to do
  with an unfilled slot.
- **If the removed racer needed a different role** (what the 10 A-races would suggest if they
  dominated — they do not): a held-and-released curve for the refused case. That is what the staged
  path already is, and its refusal is precisely the case in question. **New work, and it is the same
  feasibility question the branch left open.**
- ★ **If the removal is simply the wrong target**: keep the path. **That needs no work at all — it is
  the state master is already in**, and this branch is the thing not landed.
- **Adjacent, and already a setting:** `b2AttackHeroes` casts additional heroes outside the
  `nHeroes` cap ([:675](../../client/src/modules/heroCurveGenerator.js#L675)) and is an ordinary key
  in `defaults.js`. **It is the one existing lever that adds steered racers**, but it casts
  B2-attackers rather than front-cluster pursuers, so it is not a drop-in replacement — naming it
  because it exists, not proposing it.

**Of the four, exactly one needs no work, and it is leaving master as it is.**

---

## WHAT THIS DOES NOT SETTLE

- ★ **P2 was not recorded.** The pursuer reading rests on finishing position and on the peak-holder
  gap, not on who was second at the moment the gap opened (§3).
- **N = 30 per track, 300 races per arm.** The 8-vs-15 escape counts are small; the **direction**
  reproduces (and matches COMEBACK-RERACE-1's independent run to the digit on the master arm), the
  exact factor does not.
- **No statistical test is quoted.** The design is paired and would support one; the brief asked for
  counts.
- **The small-field regime is untouched** — every race here is 40 racers, and the branch silences the
  pool entirely below 20.
- **Nothing here says whether the removal is right.** It says what it costs and why.
