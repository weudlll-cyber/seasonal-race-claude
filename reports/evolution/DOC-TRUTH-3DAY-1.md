# DOC-TRUTH-3DAY-1 — THREE false claims written in three days, all of them COUNTS, median age under a day — and all three were caught by C2 rather than by this

> **The truth passes found 97 false claims, median age 43 days, 14 false the day they were written.**
> Everything here is at most three days old and was written under the constraints.
>
> **Mechanically checkable claims written in scope, checked against the tree as it stands after Parts
> A and B: 25. FALSE NOW: 0.**
>
> ★ **But three WERE false, for a few hours each, and C2 found them — not this pass.** §2. That is the
> number that belongs on the sheet.

---

## 1. WHAT WAS CHECKED, AND WHAT WAS OUT OF REACH

**Checkable** means the tree can be asked: a file exists, a symbol exists, a count is what it says, a
value is what it says. **25 such claims** across the documents and removal-site comments written in
scope — `VERIFY-RULES` R18/R19/R20, `SHIP-CEREMONY` step 13, `NIGHT-RUN`, `DEVSCREEN-INVENTORY`,
`TRACK_EDITOR`, `TRACK_LIFECYCLE`, the digest records, and the comments left where `assignRacers`,
the badge, the shuffle and the crop script used to be.

**All 25 are true**, including every one that a later piece could have falsified:

- R18 still names a founding instance whose file is gone — and says so.
- R20's *"`track.maxRacers` is null on every shipped track"* — checked against all ten track files.
- R20's *"`maxPlayers` was removed"* — checked against `defaults.js`.
- The removal comments in `RandomHelper.js` are true in both directions: `assignRacers` is gone,
  **and** `shuffle` is still imported by `rowLayout.js`, which is the half a careless removal breaks.
- `START_BOARD_GEOMETRY` is exported, which C2 asserted a few hours earlier.

**One reported FALSE and it is my checker's fault, not the tree's**: `NIGHT-RUN.md:122` contains
`103/103`, inside the sentence *"This paragraph said the suite was '103/103 green' and it is now 106
tests."* — a correction record, not a target. The filter stripped parenthesised corrections and not
bolded ones. **Counted as true after reading it.**

**Out of reach and not counted either way:** claims about intent, about why a decision was made, and
about what somebody saw. Roughly half of what was written in scope is of that kind.

---

## 2. ★ THE THREE THAT WERE FALSE, AND WHY THIS PASS DID NOT FIND THEM

| the claim | where | written | false by |
| --- | --- | --- | --- |
| *"the blind spot is **8 of 69**"* | `VERIFY-RULES.md` R19 | 2026-09-04 | **the same day** |
| *"there are now **8 of those** … **8 of 69**"* | `check-fallback-agreement`'s own `blind[]` | 2026-09-04 | **the same day** |
| *"**61 were converted and 51 were not**"* | `VERIFY-RULES.md` R19 | 2026-09-04 | **the same day** |

**All three are counts that the code computes and prints on every run.** By the time C2 measured, the
true figure was 70 / 62 / 8 — because **R19's own worked example added a paired citation.** The
document that stated the count changed the count by being written.

**This pass did not find them because C2 had already removed them.** That is not a gap in the method;
it is the order the chain ran in. But it is worth being exact about the arithmetic:

> **3 false claims written in scope. Median age: under one day. All three are counts. Zero survive.**

Against the truth passes' **97 false, median 43 days, 14 false on the day written** — the *rate* of
same-day falsehood is the part that has not improved. **The improvement is entirely in how long a
false claim survives**, which is a different property and a smaller one.

---

## 3. WHAT THE SHAPE SAYS

**Every false claim written under the constraints was a NUMBER, and every one of those numbers had a
machine that computes it.** Not one was a wrong statement about behaviour, a wrong file path, or a
dead symbol — the classes the truth passes found most of. Those classes are now guarded: Rule F
checks symbols, `check-config-claims` checks values, `check-doc-links` checks paths, `check-index`
checks reports.

**Counts are what is left, and nothing checks a count in prose.** A rule for it would have to know
which sentence is quoting which computation, which is PATTERN-CATCHABILITY-1's S3 and needs the
sentence to opt in.

**The cheap rule that would have prevented all three: do not write a count you can print.** That is a
human rule and it goes to C6 with the others.

---

## Limits

**25 checkable claims is not 25% of what was written.** Most of three days' writing is reasoning,
history and judgement, none of which a script can call false. **This measures the checkable corner
and says nothing about the rest** — which is exactly the caution the census carried and the reason
the sheet says so too.

**"False now" is measured after Parts A and B.** A claim written on 09-02 that Part A made false and
Part A then corrected does not appear here as false, because both happened before the measurement.
That is the right frame for *"is the tree true now"* and the wrong one for *"was it ever wrong"* —
C1's 32 corrections are the better answer to the second.

**The three false claims were found by a piece looking for COPIES, not for falsehood.** A count in two
places and a count that is wrong are the same defect seen from two sides — which is luck, not
coverage, and a count restated once would have escaped both passes.
