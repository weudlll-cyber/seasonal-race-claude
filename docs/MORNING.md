# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** after piece 7. **ENFORCE THE HYGIENE is running.** Pieces 0, 1, 2, 7 and 9 are
merged and pushed; master is green after each. **Nothing minted; no fingerprint moved.**

---

## ★ THE FOUR NUMBERS

### 1. Are Rule A and Rule B live and green?

| | state |
| --- | --- |
| **Rule A** — a literal mirroring a machine-readable home must agree with it | **BUILT, RED AT ITS FOUNDING INSTANCE, and NOT a gate** |
| **Rule B** — no branch may stand at origin whose tree master already holds | **LIVE AND GREEN**, empty keep list |

**Rule A does not gate, and that is the result rather than a shortfall.** It objects to exactly one
file on today's tree and **the objection is legitimate**: `crop-sprite-sheets.mjs` records the
*pre-crop source geometry* a one-shot run took as its input — same field names, a different fact.
**No exception was added**, per your decision rule. It prints, loudly, and waits for you.

**It is proven to catch what it was designed for.** Run against the tree at `11093fff` (2026-06-03)
it reports **21 disagreements — 8 frameWidth, 8 frameHeight, 5 displaySize** — the same count
SPRITE-AUDIT-DERIVATION-1 reached independently and by hand. **It would have gone red the day that
table was written**, not 91 days later.

**Rule B ships as a real gate**, sabotage-proved in three directions against the real origin: a
branch at master's own commit goes red, deleting it goes green, and **a branch holding a path master
lacks is not reported** — the false-positive direction, which is what decides whether a guard is
usable at all.

### 2. The corrected backlog count, beside last night's

| | last night | tonight |
| --- | --- | --- |
| open before | 128 | **128** |
| closed | 16 | **16** |
| still true | 105 | **105** |
| needs your word | 7 | **7** |

**No correction was needed, because the file was never doubled** — see below. This is *proven* rather
than re-adjudicated: the 280 lines the count is computed from are **byte-identical** before and after
tonight's reconciliation.

### 3. Of the ninety document corrections: applied, and refuted on verification

**NOT YET — piece 3 has not run.** It is next.

### 4. Piece 9's second-site count

**11 of 21 corrections left an identical false statement standing somewhere else — 16 live sites.
About one in two.**

Of the 15 applied by DOC-TRUTH-1 and DOC-TRUTH-2, **11 had a live second site (73%)**. Of the 6 older
corrections in the INDEX corrections block — a complete sweep, not a sample — **0** did.

**The `CAMERA_DIRECTOR.md` case that prompted the question is not an outlier. It is the median.**

---

## ★ THE ONE THAT SHOULD STING

**The sharpest second site is a code comment written 28 minutes before the correction that fixed the
documents — by the very commit that discovered the claim was false.**

`scripts/lib/raceDriver.mjs:122-125` still says *"`corridor-truth` and `corridor-truth
--company-only` print the SAME identity line … VERIFY-RULES R16 names that pair"*. Written by
`6444a8b6` at **20:05:11**, whose own subject line is *"R16's own worked example names the wrong
tool"*. Twenty-eight minutes later I corrected the two document sites and left standing the comment
the discovery had just written. **It is false twice over** — R16 no longer names that pair either.
Verified at the tree rather than taken from a report. **It is mine, and piece 3 fixes it.**

---

## THE PREMISE THAT WAS WRONG — piece 0

**The backlog does not contain fourteen sections twice.** Thirteen of the fourteen are the file's
**PART ONE (OPEN) / PART TWO (CLOSED)** structure: a subject's open items sit under its heading in one
part and its closed items under the same heading in the other. Measured — PART ONE's copies hold only
unticked items, PART TWO's only ticked.

**Merging them would have destroyed the open/closed sort**, so they were not touched. The cause was
not the ROADMAP fold either: the duplicates predate both folds and arrive with `fa14ca0c`
BACKLOG-SORTED-1 (2026-08-23), the commit that created the two parts.

**One duplicate was real, and it was one night old** — BACKLOG-VERDICTS-1 moved entries into a new
CLOSED block keeping their `##` headings. Fixed by demoting five headings; **no content moved**.

---

## WHERE EVERY PIECE STANDS

| # | piece | state |
| --- | --- | --- |
| 0 | The backlog's fourteen duplicate sections | **DONE — premise refuted, one real duplicate fixed** |
| 1 | Build Rule A | **DONE — red at its founding instance, not gating** |
| 2 | Build Rule B | **DONE — live and green** |
| 3 | The ninety document corrections | **next** |
| 4 | The two fingerprints that cannot gate | not started |
| 5 | The prune step | not started |
| 6 | Publish `fieldRetired` | not started |
| 7 | The rotten spec and the inert guard half | **DONE — proposals only** |
| 8 | The homeless fact worth a home | not started |
| 9 | Has one-site correcting been a habit? | **DONE — 52%** |

---

## NEEDS YOUR WORD

1. **`crop-sprite-sheets.mjs` and Rule A.** Three options: except that table with a reason, delete it
   (it was a one-shot run and its inputs are in git), or rename its fields so they stop claiming to be
   registry facts. **Until then Rule A reports and does not gate.** No mechanical discriminator exists
   between "a table that copies the registry" and "a table that records what it used to hold" — that
   is the finding, not a gap in the work.
2. **The dead spec.** Piece 7 proposes **deleting** it rather than rewriting, and moving its real
   question to two assertions in the script suite. The deletion loses one thing, named: the only
   automated check that SetupScreen renders the duration model's number.

---

## ONE LIMIT, STATED PLAINLY

**This chain enforces what was already established. It does not prove there is nothing else.** Rule A
has never objected to a real copy on a live tree — only to the 2026-06-03 one — because
REGISTRY-LITERALS-1 had already removed them all. Rule B shipped green without ever catching a real
leftover branch, only one I pushed to make it object. And piece 9's 52% rests on twenty-one
corrections: a small population whose two halves behave very differently (11 of 15 recent, 0 of 6
older).
