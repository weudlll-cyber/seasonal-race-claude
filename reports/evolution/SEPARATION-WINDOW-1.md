# SEPARATION-WINDOW-1 — the window is not the problem, and I did not merge the fix

**Branch:** `docs/separation-window-1`, off master `ed3c5d60`. **NO CODE CHANGED.** The window
narrowing was built, measured, and **reverted**. This report is the deliverable.

**Why, in one line:** narrowing the window does **not** make the shipped attacker cast pass — it goes
from failing 98 % of plans to 95 % — because the three attackers are steered to **one shared target
rank**, so they are coincident *while still being steered*. No choice of window fixes that.

---

## FIRST — WHAT HAPPENS TODAY WHEN IT RETURNS FALSE

**Nothing. `checkSeparation` is called from nowhere in production.**

```
grep -rn "checkSeparation" --include=*.js --include=*.jsx --include=*.mjs .
  client/src/modules/heroCurveGenerator.js:336   the definition
  client/src/modules/heroCurveGenerator.test.js  6 call sites — all assertions
```

`racePlanner.js` imports `generateHeroCurves` and `GENERATOR_CONFIG` from that module and nothing
else. There is **no plan rejection, no retry budget, no fallback and no failure path** — the
generator never consults it. (`hardSeparation*` in `raceBehavior.js` is an unrelated mechanism: it is
physical non-penetration between bodies during the race.)

**So the criterion is an assertion in a test suite, not a gate.** That answers the stop condition
before it is asked: no plan was ever rejected by it, so no window change can alter a race — and the
measurement below confirms it.

---

## HOW OFTEN IT FIRES TODAY

60 seeds per density, 40-racer fields, `intensity: 0.9`, shipped `GENERATOR_CONFIG`:

| field | FULL cast fails | STANDARD cast only |
| --- | --- | --- |
| bunched | **59 / 60 = 98 %** | 6 / 60 = 10 % |
| spread | 10 / 60 = 17 % | 0 / 60 = 0 % |

**The criterion rejects almost every bunched-field plan as it ships.** It has been doing so for as
long as the attackers have been on, and nothing noticed, because nothing asks it.

---

## WHAT THE NARROWING ACTUALLY DID

The change was built exactly as specified: sample only while **both** curves of a pair are still
steered, with the window ending at the **first** release, using `resolveForBand` — which already
reads `releaseProgress` for B1 and `bandResolve[band]` for the deeper bands. **No number was
invented.**

Then it was measured across the same 120 plans, against a third variant that shrinks only the
*numerator* (count coincidence while steered, as a fraction of the whole race — the monotone form):

| field | **A** today | **B** window ends at first release *(as specified)* | **C** numerator only |
| --- | --- | --- | --- |
| bunched | 98 % | **95 %** | 85 % |
| spread | 17 % | **17 %** | 17 % |

**None of them works.** The criterion still rejects 85–95 % of bunched plans.

---

## WHY — THE ROOT CAUSE IS NOT THE WINDOW

Traced on seed 8, the three attackers:

```
idx=1 endRank=7.00 band=1 bandResolve=0.80 arrivesAtTarget=0.53
idx=5 endRank=7.00 band=1 bandResolve=0.80 arrivesAtTarget=0.63
idx=6 endRank=7.00 band=1 bandResolve=0.80 arrivesAtTarget=0.15
```

**All three end at exactly rank 7.00 — the single shared `b2AttackFinalRank`** — and they reach it
between progress 0.15 and 0.63, **well before** their band's release point of 0.80. So they sit on
top of each other for a large part of the stretch where they are still, by the release rule, being
steered. Pair coincidence inside the new window: **0.36, 0.33, 0.61** against a tolerance of 0.20.

**Your premise was right and the release point is the wrong instrument for it.** You said a racer is
no longer steered once it reaches its target rank — true of the runtime servo, which releases an
attacker on B2 re-entry. But the release points that exist as *numbers* (`releaseProgress`,
`bandResolve[band]`) are band-level and later than the arrival, and the curve itself simply holds the
target rank from arrival to the finish.

**Using each curve's ARRIVAL at its target instead does make the pairs pass — vacuously.** Measured:
two of the three attacker pairs then get a **one-sample window** (idx 6 arrives at 0.15, the anchor
itself) and pass at frac 0.00. That is the "criterion that cannot fail" the brief warned about, and
avoiding it needs a minimum-sample rule — **a number, which I was told not to invent. This is the
thing to report.**

---

## AND THE PRESCRIBED FORM IS NOT MORE PERMISSIVE — IT IS STRICTER FOR SOME PAIRS

The brief's stop condition assumed *"narrowing the window makes the criterion MORE PERMISSIVE, so
plans that were rejected may now be accepted"*. **That premise is false**, and it matters.

The criterion is a **fraction of samples**. Removing late samples — where a diverging pair is far
apart — shrinks the denominator while the numerator stays, so the fraction **rises**. Measured on the
documented `battle-collapse` archetype (two curves together at the front, splitting at 0.6 to ranks
2 and 20):

| | near / samples | verdict |
| --- | --- | --- |
| A — today, whole race | 7 / 43 = 0.16 | pass |
| **B — window ends at first release** | **7 / 28 = 0.25** | **FAIL** |
| C — numerator only | 7 / 43 = 0.16 | pass |

**So variant B breaks an existing, documented owner archetype** — `'photo-finish + battle-collapse
are RELATIONAL, two separated curves'`. Merging it would have meant editing a true test to accept a
verdict I had just made stricter, which is precisely what R11 forbids.

---

## THE DECISION — I STOPPED, AND WHAT I DID NOT DO

**WORLD `dc4647be0f55ebdb` and WORLD-OFF `854018ee5d3d83e1` were measured with the change in place
and are UNMOVED**, so the brief's stop condition would have licensed the merge. **I did not merge
it**, for two reasons the stop condition does not cover:

1. **It does not do what it was for.** 98 % → 95 % is not a fix; it is a rounding of the same
   failure.
2. **It would have cost a true test.** Accepting it meant re-blessing the battle-collapse archetype
   to accommodate a criterion I had just made stricter.

**What is NOT in this branch:** no change to `checkSeparation`, no change to the 0.2 tolerance (never
touched — widening it was rejected and this block does not revisit it), no new key, no test
re-blessed, no `docs/FAIRNESS.md` edit.

**On the documents:** `FAIRNESS.md` and every other living document were searched and **none
describes this criterion** — the only "separation" text in `docs/` is the unrelated `hardSeparation`
physics in `ARCHITECTURE.md`. There was nothing to correct, so nothing was invented to correct.

---

## WHAT THE CRITERION STILL GUARANTEES, IN ONE SENTENCE

**Today, for the standard hero cast: no two scripted heroes spend more than a fifth of the race
within half a rank of each other — and for the shipped cast including the three attackers, it
guarantees nothing, because it rejects almost every plan and nothing listens when it does.**

---

## PROPOSALS

### Proposal A — give the attackers different target ranks, or accept that they are one act

The criterion and the feature contradict each other by construction: `b2AttackFinalRank` is **one
number for all three attackers**, so "the attackers are mutually separated" is unsatisfiable at any
window. Two honest resolutions, and no third:

- **Spread the targets.** If three attackers landing on three different B2 ranks is the intent, the
  key becomes a small range and the criterion starts meaning something for them. That is a change to
  the race and needs your eye.
- **Say they are one act.** If three racers converging on one rank is the *point* of "Attack & Fall",
  then they are choreographed as a group and separation is the wrong question — the criterion should
  say it applies to the standard cast, which is what its test now does.

**This is the decision that unblocks everything else here**, and it is yours because the first option
changes what a race looks like.

### Proposal B — decide whether an unenforced criterion should exist at all

`checkSeparation` has never been consulted by the generator. It is a well-written property that
rejects 98 % of shipped plans and costs nothing, because nothing asks. Three options, in increasing
order of work: **delete it** and stop implying a guarantee; **keep it as a test-only property** and
say so in its header, which is the honest description of today; or **wire it in** with a retry budget,
which is the only version that would change a race — and would currently reject almost everything.

**Do not leave it as it is.** A criterion nobody consults, failing almost always, is indistinguishable
from a passing one — and this block only found that out by grepping for its callers.
