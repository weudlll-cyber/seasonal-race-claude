# CEREMONY-COUNTS-GENERATED — the sentence was split, and one of the three numbers was wrong

**Branch** `feat/ceremony-counts`, cut from `feat/post-start-hold-unify`. **Not merged.**
Documents and tooling only; no engine file touched.

Last night this was declined for a stated reason: a generator would have had to own the SENTENCE and
not just the number, and rewriting that argument was not that block's call. It was this block's call.

---

## 1. The split

The mint-tripwire paragraph carried three typed counts and a note admitting they had already gone
stale once (19 / 103 / 84 until 2026-08-10). The rewrite puts **everything a person is asserting**
outside the markers and **arithmetic and nothing else** inside them:

- **above the block** — that the trigger is a computed set rather than a folder, and that minting for
  a file the engine cannot reach proves only what the diff already proved;
- **inside the block** — four rows, each a label and a value, generated;
- **below the block** — that the third count is not the difference of the first two, and why.

Nothing had to be left typed. Every sentence in that paragraph turned out to split cleanly, so this
report has no "could not be split" entry to make.

## 2. THE NUMBER THAT WAS WRONG, and it is the reason this was worth doing

**The document said 86. The answer is 88.**

`20 files` (closure) and `106 files` (the folder the old rule fired on) were both right. The third
was computed as `106 − 20`, and that subtraction is invalid: **the closure is not a subset of the
folder.** Two of its twenty members sit outside:

- `client/src/modules/camera/lapUtils.js` — inside `camera/`, which the folder rule excluded;
- `client/src/utils/mathUtils.js` — outside `client/src/modules/` entirely.

So the count of folder files that cannot reach the engine is `106 − 18 = 88`. The generator takes the
intersection, and the block now NAMES those two members in a fourth row, so the argument below it is
checkable rather than assertable. The error is older than the stale-numbers note — `103 − 19 = 84`
was wrong the same way.

## 3. How it is wired — the same mechanism, one flag apart

Same script (`gen-ceremony-costs.mjs`), same marker pair, same `writeVerified`, same
`--doc=` seam its test uses. Not a second generator beside it: a second thing to run is a second
thing to forget.

**The two blocks are CHECKED differently, and that is the design rather than an inconsistency.** A
cost is a MEASUREMENT — it cannot be recomputed without spending the five minutes it measures, so
`--check` can only ask how OLD it is, and failing a build over an old duration would be crying wolf.
A count is DERIVED — recomputable in milliseconds, so its check asks whether it is RIGHT.

| flag | what it does |
| --- | --- |
| (none) | run the six guards, write BOTH blocks |
| `--counts` | write the counts block only — no guard runs, milliseconds |
| `--check-counts` | recompute and fail on a WRONG count. **This is what `npm run verify` runs.** |
| `--check` | the cost staleness warning, plus the counts correctness check |

`verify.mjs` gives it `--check-counts` and not `--check`, for the reason above, and
`verify.test.mjs` asserts that (a guard that failed builds over a stale duration is worse than the
silence it replaced). `routing.mjs`'s guard-name list gains its second explicit entry — deliberately
a name and not a `gen-*` wildcard, and this is the sharpest case yet for why: run with no arguments
this generator does not merely rewrite a document, it spends five minutes running six guards first.

**The check fails on a changed count** — asserted in both positions, plus a missing block, plus a
repair-and-idempotence round trip, plus a test that no PROSE has crept inside the markers (which is
the failure mode the whole design exists to prevent).

**Comparison normalises whitespace.** Column padding in a markdown table is presentation; a person
aligning the pipes must not be reported as a wrong count. Every label and every value survives
normalisation, which is the whole claim.

## 4. A DEFECT FOUND BY THE NEW TEST, in the file it was testing

Importing `gen-ceremony-costs.mjs` for `ceremonyCounts()` **ran all six guards and rewrote the
tracked `docs/SHIP-CEREMONY.md`** — as a side effect of `node --test`. The first run of the new test
took 114 seconds and left the working tree modified. It is the same defect `verify.mjs` records
against itself (`IS_ENTRY`, "caught by verify.test.mjs on its first run"), and it has the same fix:
every side-effecting branch is now gated on whether the file was RUN or merely IMPORTED. The test
now takes 0.8 s and touches nothing.

The accidental run is the reason the cost table's numbers moved in this diff. They were re-measured
deliberately afterwards on the state being committed, and the block carries its own commit, date and
machine, so the change says what it is: **world 120 → 72 s, camera 39 → 22 s, render 32 → 22 s.**
Those are not the guards getting faster by design — the 2026-08-05 numbers were taken on a busier
machine. Read them as an order of magnitude, which is what the block's own header says they are for.

## 5. The `docs/README.md` line

One sentence, as asked: the rule that an unlisted document should not exist is about DOCUMENTS, and
the four empty directories a reader may find are not in the repository at all — git tracks files, so
a directory holding none of them is local litter on one machine. No cleanup script.
