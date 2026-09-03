# TWO-RULES-1 — both rules are green with no exception list, and NEITHER changes the count of catchable subtypes

> **Rule D: 20 of 20 racer sheets, 0 disagree. Rule E: 5 stated ranges, 0 disagree.** Both discovered
> rather than listed, both sabotage-proven in both directions, both with a loud failure that fires.
> **Nine new tests; 48 across the two suites.** No exception list was added to either, and neither
> objects to anything on today's tree.

---

## THE HEADLINE THAT IS NOT THE ONE EXPECTED

**The count of catchable subtypes does NOT change from four.** Both rules close parts of a subtype
already counted as catchable. **They make more of the already-catchable part actually caught; they
do not make any previously-uncatchable subtype catchable.** §4 sets that out, because a chain that
built two rules and reported "five of six now" would be exactly the overstatement this fortnight has
been about.

---

## 1. RULE D — THE REGISTRY MUST AGREE WITH THE ARTWORK IT DESCRIBES

**What it compares:** for every racer type, `frameWidth × frameCount === pngWidth` and
`frameHeight === pngHeight`, read from the sheet's own IHDR header. **24 bytes, no decoder, no
dependency.**

**Where it lives:** `check-fallback-agreement`, beside Rule A, because it is Rule A's question one
step further out — *does a value still agree with its machine-readable home* — with the PNG as the
home. It reuses the registry Rule A already loads. `dirs` gains `client/public/assets/racers/`, so
**an artwork change now selects this guard.**

**Why it is the half that was missing.** CENSUS-DUPES-1 catalogued this as group **A2** and named the
PNG as its source of truth — the only group in that census whose truth is a binary asset. It recorded
**"Guard: NONE"** and verified the agreement **by hand**. RULE-A-REACH-1 then measured the
consequence: of twelve duplicated-fact groups Rule A covers one in full and **A2 only by half**, the
copies and not the fact. **In eighty-eight days that agreement has been checked by hand twice and by
a machine never.**

| | |
| --- | --- |
| racer sheets checked | **20** |
| disagreeing | **0** |
| unresolved | **0** |
| exception list | **none, and none needed** |

**Sabotage, both directions.** Registry `frameWidth` 150 → 151 on horse:

```
FAIL: RULE D — 1 racer type(s) whose registry geometry does not match the PNG it names.
    horse: registry says 151x150 x8 frames = a 1208x150 sheet, but horse-trot.png is 1200x150
      The PNG is the source of truth here — it is the artwork.
```

exit 1; restored, exit 0. **A test proves `frameCount` is in the comparison too** — 150 × 7 is as
wrong as 151 × 8, because it is the same product — and **a loud failure fires when no sheet
resolves**, printing no verdict on the way out.

**What it does not cover, and the distinction is load-bearing.** It compares GEOMETRY. ARTWORK-DIGEST-1
measured the case that separates it from the digest: the 2026-09-03 overwrite produced **1200×150
before AND after** — same dimensions, different pixels. **Rule D catches a registry that has drifted
from its art; the digest catches art that has drifted from itself.** Neither replaces the other, and
the output of each says so.

---

## 2. RULE E — A CONTROL MAY NOT STATE A RANGE IT DOES NOT HAVE

**What it compares:** when a control's label or tip states a range in digits — `(0.25–0.60)` — that
range must be the control's own `min` and `max`.

**Where it lives:** `check-config-keys`, beside Rule C, and **it reads the same controls Rule C
already discovers** — one scan, two questions, no second walk of the screen.

**The defect it exists for is `choreoOutcomeStart` seen from the other side.** Its label read
"(0.25–0.55)" over a `max` of 0.55 while the shipped value was 0.60. CONTROL-BOUNDS-1 moved both to
the validated 0.60 — and **nothing would have noticed if only one of the two had moved.** CORRECTIONS-1
had explicitly refused the label-only repair, writing that *"0.6 = shipped beside a slider that stops
at 0.55 is worse than the inconsistency"*. **That judgement was right and nothing enforced it.**

**Sabotage: make exactly the repair CORRECTIONS-1 refused.** Label alone to "(0.25–0.70)", bound left
at 0.60:

```
FAIL: RULE E — 1 control(s) state a range they do not have.
    …DynamicsTuningSection.jsx:1239: the control states "(0.25–0.7)" and its bounds are [0.25, 0.6]
      A stated range and a widget clamp are two numbers side by side, so they share one identity
      (R16). Move them together, or stop stating the range — do not correct only the prose.
```

exit 1; restored, exit 0.

| | |
| --- | --- |
| stated ranges paired with a control | **5** |
| disagreeing | **0** |
| ascending bracketed pairs in the whole Dev Screen | **6** |

**The sixth is out of reach and it is correct.** `battleMaxGroupSize`'s tip says "(3–6)" on a shared
`SliderRow` whose `min`/`max` are parameters — Rule C's declared blind spot, inherited here. **Checked
by hand: the caller passes `min={3} max={6}` and the key ships 6.** The blind spot costs nothing
today, and it is in the `blind` array with that finding attached.

### ★ Why THIS rule is buildable and the tooltip-VALUE rule is not

CONTROL-CLAIMS-1 established that a claim about a **value** has four spellings in this screen —
`"0.6 = shipped"`, `"Default: 67%"`, `"every state ships 0.25s"`, `"ships 0.6"` — and, decisively,
that a **measurement is lexically indistinguishable from a config claim**: *"2000 was the calmest
value on the measurement; 1200 is what your eye asked for"* contains both, and the sentence is doing
its most useful work in the half a guard would have to fire on.

**A RANGE has one spelling and no such ambiguity**: two numbers in brackets joined by a dash, against
two numbers in the same object. That is the whole reason one of these exists and the other does not,
and it is stated in the guard's output rather than only in a comment.

**One deliberate narrowing:** a bracketed pair that is not ascending is not a range — `(10–0)` is a
ratio, a score, a coordinate. A test pins it. Treating every bracketed pair as a range is how a guard
starts crying wolf on prose it was never meant to read.

---

## 3. NEITHER RULE NEEDED AN EXCEPTION, AND THE BRIEF'S CONDITION WAS NOT INVOKED

> *"If either needs an exception on day one, do NOT add it — report what it objects to and leave that
> rule unshipped."*

**Neither objects to anything.** Rule D: 20/20 agree. Rule E: 5/5 agree. Both shipped, both gating,
both with empty exception lists. The condition never came up, which is worth saying plainly rather
than leaving as an absence.

---

## 4. ★ WHICH SUBTYPE, AND DOES "FOUR OF SIX" MOVE? — NO

**First, the number itself needs correcting.** PATTERN-CATCHABILITY-1 found **six INSTANCES** falling
into **five SUBTYPES**; "four of six" is a count of instances that would have gone red, not of
subtypes. The brief's "six known subtypes" is the instance count.

| | subtype | catchable? | do these rules move it? |
| --- | --- | --- | --- |
| S1 | a hand-copied set whose home is machine-readable, keyed by a shared field name | YES | **Rule D closes the unclosed half of instance 3** — the sprite geometry table, whose Side B PATTERN-CATCHABILITY-1 named as *"the PNG IHDR of `horse.png`"*. **Rule E is also S1-shaped**: two literals in one object that must agree |
| S2 | a hand-maintained subset that must COVER a computed set | YES, with the relation typed once | untouched |
| S3 | a document sentence stating what a command computes | YES — the stamp guard, if the sentence opts in | untouched |
| S4 | a SCOPE word in a procedure | **NO** as stated | untouched |
| S5 | a premise in code about a value's runtime identity | **NO** | untouched |

**So the count does not change from four.** Both rules close parts of **S1**, which was already
counted as catchable. **What changed is coverage, not catchability** — S1 was catchable in principle
and is now caught in two more places. **S4 and S5 remain uncatchable**, and RULE-A-REACH-1's finding
stands unaltered: the uncovered set is bounded inside the racer registry and open-ended outside it.

**The honest way to say it:** *building two rules did not make more of the class catchable. It made
more of the already-catchable part actually caught.*

---

## 5. WHAT THIS MOVED, AND WHAT ELSE POINTED AT IT (constraint 2)

| what moved | what pointed at it | outcome |
| --- | --- | --- |
| `check-fallback-agreement`'s `covers` and `dirs` | RULE-A-REACH-1 says A2 is covered *"only by HALF"* | **still true of Rule A**, and the other half now has Rule D. Recorded in the INDEX corrections block |
| `check-config-keys`'s `blind` array | it declared *"whether the LABEL's stated range matches min and max"* as a blind spot | **corrected** — that half is Rule E now; the VALUE half is restated as not buildable, with CONTROL-CLAIMS-1's reason |
| CONTROL-CLAIMS-1's *"kind C: 0 false"* | that report | **still true**, and now enforced rather than observed. Its own caution — 6 stated ranges against 90 numeric inputs is a convention 7% of controls follow — is unaffected |
| the artwork's coverage | ARTWORK-DIGEST-1's inventory | **still true**: the digest covers content, Rule D covers geometry, and the two client-side sets it names remain unwatched |

---

## Limits

**Rule D has never objected to a real drift, and there may never have been one.** The registry and
the PNGs have agreed at every point anybody has looked — twice by hand, once now by machine. It is a
guard against recurrence, like Rule A, and the first real thing it catches will be its first.

**Rule E watches five controls.** That is not five percent of the screen's claims; it is every claim
of that SHAPE. The shape is rare because the convention is rare — and CONTROL-CLAIMS-1's warning
holds: a convention followed by 7% of controls cannot be measured for drift in any useful way, so
Rule E's zero says the five agree, not that the screen's prose is sound.

**Neither rule reads a mask file.** Masks hang off nested coat objects, which the registry loader
skips as non-scalars, so Rule D cannot see their geometry. They ARE digested by
`check-seed-versions`, so a mask that changes is caught — by content, not by shape.
