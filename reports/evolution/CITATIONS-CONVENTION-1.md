# CITATIONS-CONVENTION-1 — the "113 mechanically-convertible" is TWELVE, because 107 of the citations are LINKS whose line number is the destination

> **The convention is adopted, guarded and written down (R19). Twelve citations were converted and
> 234 were not**, and the not-converting is the finding rather than the shortfall. **Rule F ships
> with eight tests and is sabotage-proven in both directions** — the document end and the code end.
>
> ★ **CITATIONS-1's proposal said "nothing mechanical breaks". 107 of the 246 citations ARE markdown
> deep links, and the line number is the link target.** §2.

---

## THE NUMBERS

| | |
| --- | --- |
| code citations in `docs/*.md` today | **246** (CITATIONS-1 counted 250 on 2026-09-02, over a slightly different set) |
| **markdown deep links with an `#L` anchor** | **107 — 43%** |
| inside a dated verdict or correction | **24** |
| plain prose citations | **115** |
| naming a symbol anywhere in the same sentence | **114** — CITATIONS-1's "113", reproduced |
| …of those, symbol actually AT the cited range | **39** |
| …symbol lives somewhere ELSE in the file | **75** |
| **genuinely convertible, after hand review** | **12** |
| converted | **12** |
| Rule F citations now gating | **8** (the 7 arrow-form conversions plus R19's own example) |

---

## 1. THE PREMISE DID NOT SURVIVE MEASUREMENT, AND THE MEASUREMENT IS THE PIECE

CITATIONS-1 wrote that **"113 citations already name a symbol in the same sentence and could be
converted with review."** That sentence is accurate and every word of it matters — **"with review"**
most of all. This piece did the review, and the reviewable set collapses in three steps:

**Step 1 — reproduce the 113.** Scanning `docs/*.md` for `file.ext:N` and looking for a
backticked symbol in a ±1-line window gives **114**. Close enough to 113 to treat the method as
reproduced; the difference is a night of document edits.

**Step 2 — ask whether the symbol is where the citation points.** For **75 of the 114 it is not** —
the named symbol exists in the cited file, but somewhere else entirely. `raceBehavior.js:1025-1091`
sits in a sentence naming `min()`, which occurs at `:1048` and in ninety other places.
**Converting those replaces a stale pointer with a differently-wrong one, silently.** That is worse
than leaving it: a stale line number at least still says "somewhere near here".

**Step 3 — drop the coincidences and the records.** What survives is **12**.

---

## 2. ★ 107 OF THE CITATIONS ARE LINKS, AND THE NUMBER IS THE DESTINATION

CITATIONS-1's proposal weighed the cost this way:

> *"What it would break: a `file:line` is clickable in some editors and a symbol is not… Nothing
> mechanical breaks — `check-doc-links` does not read line numbers, so there is no guard to update."*

**The guard half is true. The link half is not.** 107 of the 246 citations — **43%** — look like
this:

```
[`raceStep.js:46-55`](../client/src/modules/raceStep.js#L46-L55)
```

**The line number is not decoration beside a link; it is the link.** `FORCE-MAP.md` is built almost
entirely of them. A conversion pass that stripped line numbers would have destroyed 107 working
deep links and no guard in this repository would have said a word, because `check-doc-links` checks
the file and not the anchor.

**This is why the piece converted twelve and wrote a rule instead of converting 113.** The standing
constraint is *open no new faults*; converting at scale opens 107 dead links and 39 moved pointers.

**And it points at the synthesis R19 adopts:** a link may carry the **symbol in its visible text**
and the **line in its href**. The reader clicks a working anchor and reads a claim a machine can
check. That costs nothing and is available to all 107 — as a convention going forward, not as a
rewrite of what stands.

---

## 3. THE THIRD CATEGORY — 24 CITATIONS INSIDE A DATED RECORD

A line like

> ***VERDICT 2026-09-02 (BACKLOG-VERDICTS-1) — STILL TRUE:** re-verified at source. `CameraDirector.js:2628`
> states the verdict is one-way…*

is not a pointer. **It is a record of what somebody looked at on a day.** Converting it rewrites the
record — the same reason `reports/**` is append-only and the same reason INDEX-SUMMARIES-1 left the
corrections block's dated entries alone this morning. **24 of them, all left.**

---

## 4. WHAT WAS CONVERTED, IN TWO FORMS THAT ARE ONE RULE

**Form (b) — the arrow, where the number was the only thing saying WHERE (7 sites).**
`` (`raceGovernor.js:92`) `` → `` (`raceGovernor.js` → `governorPhaseWeight`) ``. In
`ARCHITECTURE.md` ×2 and `PHASE-CONTRACT.md` ×5.

**Form (a) — drop the number, where the sentence already names the symbol (5 sites).**
`` `server/src/auth/csrf.js:26` builds `corsOptions` `` → `` `server/src/auth/csrf.js` builds `corsOptions` ``.
In `BACKLOG.md` ×3 and `PHASE-CONTRACT.md` ×2.

**They are one rule: no citation may make a claim nothing can check.** Form (b) replaces an
uncheckable claim with a checkable one. Form (a) removes the claim, because a bare filename asserts
nothing about a line and so cannot be wrong about one. Only form (b) is visible to Rule F, which is
correct — there is nothing in form (a) left to check.

**One conversion was also a small repair on the way:** `BACKLOG.md:2921` said `app.js:31-36` where
this repository has two `app.js`. It now spells `server/src/app.js`.

---

## 5. RULE F — AND IT IS A RULE INSIDE AN EXISTING GUARD (R13)

**Where:** `check-fallback-agreement`, beside Rules A and D, because it is **Rule A's question with a
document on one end** — does a value still agree with its machine-readable home. `dirs` gains
`docs/` and `server/src/`, so **a document change now selects this guard**.

**What it asks:** for `` `file.js` → `symbol` ``, does `file.js` resolve unambiguously under
`client/src`, `scripts` or `server/src`, and does it contain `symbol`.

**What it deliberately does NOT ask: WHICH occurrence.** CITATIONS-1 measured `getPhase`'s first hit
in `racePlanner.js` as a **comment at `:165`** with the definition at `:524`. A rule that picked an
occurrence would manufacture confident wrong answers — the same reason the 75 were not converted.
**Existence is what is checkable and existence is all that is claimed.**

**Sabotage, both ends.** Rename the symbol in the document → red. Restore → green. **Rename it in
`raceGovernor.js` and leave the document alone → red as well**, naming the file it searched. A
citation rots when either end moves and this catches both.

```
FAIL: RULE F — 1 citation(s) name a symbol their file does not contain.
    docs/PHASE-CONTRACT.md: cites `raceGovernor.js` → `MIN_FADE_SPAN`, and
      client/src/modules/raceGovernor.js does not contain `MIN_FADE_SPAN`
```

**Eight tests, 40 in the suite.** Including the two Lesson 187 halves that are one line apart:
**zero DOCUMENTS scanned fails**; **zero CITATIONS passes**, because that is the state on the day a
convention starts. Ambiguous basenames (`index.jsx`) are reported unresolved and never guessed —
CITATIONS-1 counted 31 of those.

**The output says it is blind to line citations**, in the verdict line itself, because *"0 disagree"*
read as a statement about every citation in the documents would be the exact opposite of the truth.

**A `--docs-root=` seam** was added beside the existing `--registry-root=`, so Rule F is proven
against a fixture rather than against the real documents.

---

## 6. SWEPT FOR SECOND SITES (constraint 2)

**Two citations point past the end of their file, and both are correct.** `branding.md:48` and
`MORNING.md:285` both say *"`branding.md` cited `storage.js:158` in a 148-line file"* — they are the
**record of CITATIONS-1's one repair**, not the defect. Re-checked: `storage.js` is 148 lines today,
unchanged since before that report, and `newId` is at `:146`. **The record is exact.**

*(My own first pass reported 149 and briefly read that as a drift in a correction about drift.
`wc -l` counts newline-terminated lines; splitting on `\n` yields one more. CITATIONS-1 was right and
the instrument was off by one.)*

**Twelve citations sit beside a symbol their cited file does not contain. All twelve were opened by
hand, and all twelve are correct** — but for FOUR different reasons, which is why counting them
would have been useless:

| reason | n | example |
| --- | --- | --- |
| the "symbol" is a commit SHA in backticks | 3 | `` `b9dc8102` `` beside `seedRuntime.js:36` |
| the symbol belongs to a *different* file named in the same window | 5 | `b2AttackHeroes`, which is `DynamicsTuningSection.jsx`’s |
| **the sentence SAYS the symbol is absent, and it is** | 2 | *"leaving `anchorRacerIndex` and `runInArrived` **undefined inside the instrument**"* |
| the constants of a **REMOVED** mechanism, under a header that says REMOVED | 2 | `FORCE-MAP.md` L9, stuck-mode suppression |

★ **The last row is why the hand check was worth its cost.** `FORCE-MAP.md:337` documents three
constants **with their values** — `STUCK_P_THRESH` **0.008**, `STUCK_BALANCE_RATIO` **0.25**,
`STUCK_VEL_THRESH` **0.0015** — and **none of the three names exists anywhere in `client/src`.** Read
alone that is the sharpest documentation defect of the night: values with no code behind them. Read
in place it is a correct historical record, because the section header two lines above it reads
**"L9. Stuck-mode suppression — REMOVED (Commit A)"**. **A rule that fired on it would have been
wrong, and a report that filed it would have been worse.**

**This is also the measured argument for Rule F asking only about the ARROW form.** Of twelve
symbol-shaped near-misses found by a ±1-line window, twelve are false. A guard on that window would
cry wolf twelve times on its first run.

---

## Limits

**234 citations remain unchecked and unreachable, and always will be.** This piece did not reduce the
stock of stale line citations; it stopped the stock from growing and made the new form checkable.
**Rule F's "0 disagree" is a statement about eight citations.**

**The 107 links keep their line numbers and will keep rotting.** R19's visible-text synthesis is
available to every one of them and this piece applied it to none — that is a document-by-document
edit with a judgement in each, and it is the same expensive half CITATIONS-1 identified. **Named as
open work rather than left as an implication.**

**The 246 is today's count and is not a target.** It is reproducible by scanning `docs/*.md` for
`file.ext:N`; the method is in the report rather than the number being the artefact.

**Rule F has never objected to a real drift**, like Rule D before it. Its first catch will be its
first, and with eight opt-ins the wait may be long. The argument for building it now is that a
convention adopted without a guard is a convention that decays before it is used — and the guard cost
one rule in a file that already existed.
