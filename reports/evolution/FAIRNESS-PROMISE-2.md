# FAIRNESS-PROMISE-2 — the owner settles it: the narrow reading, and the controller is intended

**2026-08-22 · branch `docs/fairness-promise` off master `c61a7ecf` · DOCUMENTS ONLY. No code, no
key, no default, no sweep.**

**SKIPPED, per R15, and what determined each answer:** the 80-race sheet, the browser gate, the four
fingerprints and the client suite. **Two markdown files changed and nothing else** — no file in any
of their reach was touched, so no fingerprint can move and none was measured.

---

## 0 · HIS ANSWER, 2026-08-25

FAIRNESS-PROMISE-1 established that `docs/FAIRNESS.md` described a mechanism the shipped race does not
have exclusively, and that L184's title and consequence disagree about whether a speed correction is
forbidden. It deliberately did not decide which. **He has:**

> Originally there was only the re-roll, the start bonus and the finish bonus. Since the DIRECTOR
> exists, an additional steering by the director is also possible — to make the drawn ranks actually
> reachable AND to keep the race exciting.

**So the controller is not a loophole in L184; it is a mechanism he added deliberately with the
director.** L184 forbids **a positional force that DRAGS a racer to a place** — a wall, a spring, an
authored curve — **and not a speed correction serving the drawn outcome.**

**THE NARROW READING. Nothing about the code changes.** This block corrects the documents that were
wrong about it.

---

## 1 · WHAT CHANGED

**`docs/FAIRNESS.md`** — the headline paragraph. It said the 85–90% figure is reached "by biasing the
re-roll DRAW … not by any positional force". It now names **both** mechanisms:

1. the re-roll **draw** bias, clamped to the honest tempo range;
2. the **director's speed correction** — `trajectoryMult`, written every physics step from the
   rank/band error and eased in over a transition, **and `areaBonusMult`, the second planner-written
   term of the same kind.**

It states that **no positional force is used** — the class L184's evidence closed stays closed — and
it carries his reading, dated. And it states plainly that **the split between the two mechanisms has
never been measured**, with the count that makes that a fact rather than an impression: 47 reports
mention `trajectoryMult` and none of them mentions it beside `bandBias`.

**That absence is now in the document rather than smoothed over**, with an instruction attached: do
not quote either mechanism as *the* reason for the headline.

**`docs/LESSONS.md`** — a dated note beside L184 recording which reading is operative, why the
ambiguity mattered, and that **the lesson's evidence is untouched**: every arm it measured WAS
positional, ARM C was a literal band wall, and that remains the whole of what it proved. What is added
is which reading of its title is operative — not a rewriting of what it demonstrated.

---

## 2 · WHY THE SECOND TERM MATTERS ENOUGH TO NAME

The audit found **two** planner-written terms, not one. A document naming only one is how a promise
drifts from the code without anyone noticing: a reader checking `FAIRNESS.md` against `raceCore.js`
would have found `trajectoryMult` unmentioned and `areaBonusMult` unmentioned, and had no way to tell
whether that was an omission or a denial.

`boost` and `brake` remain race-state terms (drafting, traffic). `rowEnvMult` corrects for the START
ROW rather than for an intended finishing place; **its status under the broad reading was never
established and does not need to be now** — his ruling is about what L184 forbids, and a start-row
compensation is not a force dragging a racer to a place either.

---

## 3 · WHAT WAS DELIBERATELY NOT DONE

- **The code is untouched.** The controller is not removed, weakened, gated or flagged.
- **No fairness sweep was run.** Measuring the split is a separate decision he has not taken, and
  FAIRNESS-PROMISE-1's Proposal 2 prices it if he ever wants it.
- **L184's evidence is not rewritten.** Only a dated reading is added beside it.
- **`rowEnvMult`'s classification is left open**, because nothing now depends on it.

---

## 4 · THE STANDING GAP, NAMED SO IT IS NOT LOST

**It is still not established that the draw bias alone reaches 85–90%.** FAIR-ARRIVAL's ARM B posted
89% with the controller already present in the tree, so that number cannot be read as the draw bias's
own. The document now says the split is unknown; **this is the sentence that says the old headline
should not be reconstructed from the archive either.**
