# NEW-COPIES-1 — three days of building created copies, and BOTH of the sharp ones are mine from last night

> **Constraint 3 has been in every brief since 2026-09-01. It was not obeyed.**
>
> **Two harmful copies, both created within the last 24 hours, both in the new work itself:** a guard
> that hardcodes a count it computes, and a test that hardcodes what it tests.
>
> ★ **One of them went stale inside the same night**, which is the shortest half-life this project has
> measured. §1.

---

## 1. ★ A GUARD THAT HARDCODES WHAT IT COMPUTES — AND IT WENT STALE IN HOURS

`check-fallback-agreement`'s Rule F prints, on every run:

```
RULE F: 70 symbol citation(s) in 36 document(s) — 62 PAIRED … and 8 bare …
```

**The same numbers were written into two other places by hand**, both last night:

| | said |
| --- | --- |
| the guard's own `blind[]` declaration | *"there are now **8 of those** … The blind spot is now **8 of 69**"* |
| `docs/VERIFY-RULES.md` R19 | *"The blind spot is **8 of 69** today"*, and *"**61 were converted and 51 were not**"* |

**By the time this audit ran, the true figure was 70 / 62 / 8 — not 69 / 61 / 8.** One paired citation
had been added: **R19's own worked example.** The document that states the count changed the count by
being written.

**And R19 said so while getting it wrong**: *"it shrinks as citations are converted"* — the sentence
predicts its own staleness and states the number anyway.

**Both removed.** The guard's `blind[]` and R19 now point at the verdict line, which is the one home,
and each carries a dated note saying what it used to say.

---

## 2. ★ A TEST THAT HARDCODES WHAT IT TESTS

`boardPortraitFit.test.js` — written last night to prove the STARTERS board's portraits fit their
column — declared its own copies of the column:

```js
const SPRITE_BOX = 28;
const PORTRAIT_FRAC = 0.94;
const CELL_H = 30;
const NUMBER_BOX = 46;
```

**Four numbers, two homes, one day old.** And the failure mode is the quiet one:

> Narrow the column in `startBoardRendering.js` and the test **still asserts the portraits fit a
> column that no longer exists** — green, while the board overlaps again.

**That is the exact defect the test was written to prevent, reintroduced by the test.**

`START_BOARD_GEOMETRY` is now exported from the module that owns the numbers, and the test reads it.
**Proven:** `SPRITE_BOX` 28 → 14 in the module now turns the test **red**; before, it would have
stayed green. Restored, 10/10.

---

## 3. WHAT WAS LOOKED AT, AND WHAT WAS NOT A COPY

Scope `3fc4c6ed..HEAD`. Every guard added or changed in it, their tests, and the documents written to
describe them.

| candidate | verdict |
| --- | --- |
| `client/public/assets/racers` in **both** `check-fallback-agreement` and `check-seed-versions` | **a copy, and a tolerated one.** Each guard must know where to look, and **both fail loudly if it moves** (Lesson 187 checks in each). A detected copy is not the same hazard as a silent one. Named, not merged |
| the same path in nine `gen-*.mjs` sprite tools | pre-existing, out of scope, one-off generators |
| `MIN_TEXT_CONTRAST = 4.5` in `chipContrast.test.js` | **not a copy.** WCAG AA's threshold is not a project fact with a home in this repository |
| `"0 registry literal(s)"` asserted in Rule A's test | **not a copy.** It asserts the GOAL STATE deliberately, and the guard's own comment says so |
| `docs/MORNING.md`'s "96 controls" | a **dated snapshot** in a document rewritten every night. Not a second home; it is a report of a measurement on a day |
| R18/R19/R20 describing what the guards do | **not copies.** A rule's statement and its implementation are two different things, and the rule is the home of the *reason* |

---

## 4. WHAT THIS SAYS ABOUT CONSTRAINT 3

**It was obeyed where it was thought about and broken where it was not.** Both real instances are in
work done *under* the constraint, by someone who had written the constraint into two reports the same
night. Neither is carelessness about the rule; both are **the rule not being applied to the artefact
being built while building it**:

- writing a guard, you think about what it checks — not about what its own description asserts;
- writing a test, you think about what it proves — not about where its constants came from.

**A count in prose is the most perishable thing this project writes**, and last night produced three
of them inside code that computes the same count. **That is the pattern worth carrying to C6.**

---

## Limits

**This audited the NEW work, not the whole tree.** A copy created before 2026-09-01 is CENSUS-DUPES-1's
subject and is deliberately not re-counted.

**"Two harmful copies" is what one search shape found.** The method was: enumerate guards and tests
touched in scope, look for literals that duplicate a value with a home elsewhere, and read the
documents written about them. **A copy of a SHAPE rather than a value** — two functions that must
agree structurally — would not be found by it, and CENSUS-DUPES-1 recorded that class as the hardest.

**The tolerated path copy is a judgement.** Two guards naming the same directory is a duplicated fact
by the strict reading of constraint 3. It is left because both detect their own breakage loudly and
because merging them would mean one guard importing another, which is a worse coupling than the one
it removes.
