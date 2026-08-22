# FAIRNESS-PROMISE-1 — does the race correct the motion after the dice?

**2026-08-22 · branch `invest/fairness-promise` off master `8f98bd2b` · INVESTIGATION ONLY — nothing
changed: not the code, not `FAIRNESS.md`, not the lesson.**

**SKIPPED, per R15:** the 80-race sheet, the browser gate, the four fingerprints and the client suite.
This block reads git history and quotes files; **no file in any of their reach was touched, so no
fingerprint can move and none was measured.**

---

## THE ANSWER TO QUESTION 1, IN ONE SENTENCE

**The controller came first by seventy days: `trajectoryMult` was introduced on 2026-05-20 in
`596a1b29` "Phase 3A: Race Plan + Bereichs-Bonus-Mechanik", and the `FAIRNESS.md` sentence that says
arrival is reached "not by any positional force" was written on 2026-07-29 in `e06a6af1`
"docs(fairness): canonical FAIRNESS.md — DOCS-1 STAGE 4" — so the sentence was written while the
controller had been running in the shipped race for over two months.**

## AND THE ANSWER TO QUESTION 3, BECAUSE THE TWO TOGETHER DECIDE WHAT THIS IS

**Lesson 184 is internally inconsistent in scope, and the controller falls inside its TITLE while
sitting outside its EVIDENCE.** Its title forbids correcting "the Motion After the Dice"; its
CONSEQUENCE forbids only "any post-dice **positional** force (wall, spring, authored curve)"; and
every arm it actually measured was positional. A speed multiplier is motion but is not a positional
force, so the lesson's own words answer the question two different ways.

**Taken together: this is primarily a DOCUMENTATION defect, with a real design question left open
underneath it.** The document states a mechanism the code does not have exclusively; the lesson does
not clearly forbid what the code does; and nobody has ever measured which mechanism delivers the
headline.

---

## 1 · WHICH CAME FIRST — the commits

| what | commit | date | block |
| --- | --- | --- | --- |
| `trajectoryMult` first appears anywhere | **`596a1b29`** | **2026-05-20** | Phase 3A: Race Plan + Bereichs-Bonus-Mechanik |
| the planner's band-steering blend | `3202d922` | 2026-06-20 | band-steering blend with `bandStrictness` (B1, default 1.0 = no-op) |
| `trajectoryMult` reaches `raceCore.js` | `0bd146f3` | 2026-07-24 | parity: extract the REAL RaceScreen core |
| **the `FAIRNESS.md` sentence** | **`e06a6af1`** | **2026-07-29** | docs(fairness): canonical FAIRNESS.md — DOCS-1 STAGE 4 |

`0bd146f3` is an EXTRACTION, not an introduction — the term moved from `RaceScreen` into `raceCore.js`
when the shared core was pulled out. The mechanism itself dates from 2026-05-20.

**So the sentence is not a description that went stale. It was written about a race that already
contained the controller.** Whether its author knew that is **not established** — `e06a6af1` is a
documentation commit and its message does not discuss the controller.

---

## 2 · WHAT IT CONTRIBUTES — never attributed, anywhere

**The 85–90% headline has never been split between the draw bias and the controller.** Searched:

| | |
| --- | --- |
| reports mentioning `trajectoryMult` | **47** |
| other docs mentioning `trajectoryMult` | **9** (`ARCHITECTURE.md`, `AUDIT.md`, `BACKLOG.md`, `FORCE-PARITY.md`, …) |
| **`FAIRNESS.md` mentioning `trajectoryMult`** | **0** |
| reports mentioning BOTH `bandBias` and `trajectoryMult` | **0** |

**The mechanism is not hidden — it is documented in nine places and measured in forty-seven.** What
does not exist anywhere is a measurement that says how much of the 85–90% each mechanism delivers.
**That absence is the finding**, and it is the reason this block cannot answer "is the document
merely imprecise, or materially wrong?" — the number that would settle it has never been taken.

**No fresh sweep was run, per the brief.** Whether to spend one is the owner's call, and Proposal 2
prices it.

---

## 3 · WHAT L184 ACTUALLY FORBIDS — quoted, then read

> ## Lesson 184 — The Cliff Law: Correct the DRAW, Never the Motion After the Dice
>
> Every mechanism that tried to make racers reach the band of their drawn place by ACTING ON THEIR
> MOTION — a hard positional wall, a soft band spring, an authored finale curve — created a force the
> racer's honest physics then had to fight …
>
> **Insight.** A correction applied _after_ the dice have been rolled is an opponent force — it fights
> the racer's spread draw, its re-roll, and the servo all at once, so it can only buy fairness by
> spending action (and often loses both). …
>
> **Consequence.** Do not re-attempt band-arrival via any post-dice positional force (wall, spring,
> authored curve); the class is a cliff and closed.

**Three scopes, and they do not agree.**

- **The TITLE is the broadest**: "Never the Motion After the Dice". `trajectoryMult` is a multiplier
  on speed applied every physics step from the rank/band error. It is motion, and it is after the
  dice. **Inside.**
- **The INSIGHT is broad too**: "a correction applied after the dice … fights the racer's spread
  draw, its re-roll, and the servo all at once". That describes the controller exactly. **Inside.**
- **The CONSEQUENCE is narrow**: "any post-dice **positional** force (wall, spring, authored curve)".
  A speed multiplier is none of those three, and it does not act on position. **Outside.**

**And the EVIDENCE is narrower still.** Every arm the lesson cites is positional: ARM C is "a literal
band wall from `R`"; the swept dial ran "from hard wall to soft spring". **The lesson measured
positional forces and generalised in its title to all motion.**

**The reading its own words support**, rather than the convenient one: **the lesson PROVES a claim
about positional forces and ASSERTS a claim about motion.** The controller is forbidden by the
sentence the lesson chose as its title and is untouched by the sentence it chose as its consequence,
and the difference was never tested, because a speed multiplier was never one of the arms.

**Whether the owner meant the broad rule or the narrow one is NOT ESTABLISHED**, and it is not a
question evidence can settle — it is what he intended, and only he can say.

---

## 4 · WHAT ELSE TOUCHES MOTION AFTER THE DRAW

`raceCore.js:647` — `r.baseSpeed * boost * brake * rowEnvMult * r.trajectoryMult * r.areaBonusMult`

| term | written from | kind |
| --- | --- | --- |
| `boost` | `r.draftingBoostActive` — drafting, from who is in front of whom right now | **race state** |
| `brake` | `r.avoidanceActive`, `r.brakeMatchFactor` — the traffic ahead | **race state** |
| `rowEnvMult` | `r.rawRowBonus` and race progress — a start-row compensation, phased | **the draw's context** (the row he started on), not the intended outcome |
| **`trajectoryMult`** | the planner's controller, from the **rank/band error** | **the plan's intended outcome** |
| **`areaBonusMult`** | `racePlanner.js:566–610`, from `plan._racerAreaBonus` | **the plan's intended outcome** |

**THERE ARE TWO TERMS OF THE KIND L184 IS ABOUT, NOT ONE.** `areaBonusMult` is also written by the
planner from the plan, and is also eased in and out over a transition. The brief anticipated this
("there may be more than one") and it is correct.

`rowEnvMult` is the interesting middle case: it corrects motion after the draw, but it corrects for
the START ROW rather than steering toward an intended finishing place. Whether that falls inside the
broad reading of L184 is **not established** and is the same question as §3.

---

## 5 · WHAT THE DOCUMENT WOULD HAVE TO SAY — proposed text, NOT applied

The present sentence in `docs/FAIRNESS.md`:

> **COMBO15 delivers 85–90% / track** (binding N=100 record) — the current shipped headline. It
> reaches this by biasing the re-roll DRAW toward the drawn band (the Cliff Law's correct sign —
> correct the draw, never the motion after the dice; LESSONS.md L184), not by any positional force.

**A sentence that would be true of the shipped code:**

> **COMBO15 delivers 85–90% / track** (binding N=100 record) — the current shipped headline. Two
> mechanisms contribute and **their shares have never been measured separately**: the re-roll DRAW is
> biased toward the drawn band (the Cliff Law's correct sign — L184), and the race plan's trajectory
> controller writes a per-step speed multiplier from each racer's rank/band error, eased in over a
> transition, with a magnitude recorded as ≈ +10% over the field. **No positional force is used** —
> no wall, no spring, no authored position curve, which is the class L184's evidence closed. Whether
> a speed multiplier derived from the intended outcome falls inside L184's broader title is an open
> question, not a settled one.

**It is written here and NOT in `FAIRNESS.md`.** The owner decides whether the document changes or
the code does, and this block does not pre-empt that by editing the canonical file.

---

## 6 · PROPOSALS

**P1 — CHANGE THE DOCUMENT: replace the sentence with §5's text, and add `trajectoryMult` to
`FAIRNESS.md`'s vocabulary.** The term it moves is one paragraph in the canonical fairness document.
**Cost: it retires a clean claim and replaces it with an honest one that contains an admitted gap.**
`FAIRNESS.md` is the file the project points at when it wants a single answer about what the game
promises, and "their shares have never been measured separately" is a worse sentence to have there
than the one it replaces — but it is true, and the present one is not. **This is the cheapest option
and it does not close the design question; it makes it visible.**

**P2 — MEASURE THE SPLIT, then decide.** One paired sweep with the controller's contribution
neutralised (`bandStrictness` is already the dial — `3202d922` shipped it at 1.0 = no-op, so the arm
exists) against the shipped arm, at the fairness gate's own N. **Cost: a full sweep is hours, and it
is its own block by the brief's own instruction.** What it buys is the only number that can decide
between P1 and P3: if the draw bias delivers 85–90% alone, the document is merely imprecise and the
controller is doing something else; if it delivers 60%, the document is materially wrong and the
shipped headline depends on a post-dice correction.

**P3 — CHANGE THE CODE: retire the controller and let the draw bias carry arrival alone.** The term
is `trajectoryMult` in `racePlanner.js`, and `areaBonusMult` would have to be considered with it.
**Cost, and it is the largest of the three: this moves the WORLD fingerprint, invalidates the shipped
COMBO15 baseline, and requires a full re-baseline of every fairness number in
`reports/parity/REBASELINE.md`.** It should not be attempted before P2, because **it is currently not
established that the draw bias can reach 85–90% without it** — and L184's own evidence does not say
so either: FAIR-ARRIVAL's ARM B posted 89% with the controller already present in the tree.

**Nothing here is done. Not the code, not `FAIRNESS.md`, not L184.**
