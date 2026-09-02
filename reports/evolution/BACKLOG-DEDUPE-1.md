# BACKLOG-DEDUPE-1 — thirteen of the fourteen are not duplicates, they are the file's OPEN/CLOSED structure; one is real, and it was made last night

> **THE PIECE'S PREMISE IS REFUTED, AND ALMOST NOTHING WAS MERGED.** Reconciling the fourteen pairs
> would have destroyed the single most load-bearing structural fact about this file. **Thirteen were
> left exactly as they are.** One was real and is reconciled.
>
> **Content is untouched: 3,063 non-blank lines before and after, and the 280 lines the verdict count
> is computed from are byte-identical.** Five heading lines changed, all accounted for below.

---

## 1. THE CAUSE IS NOT THE ROADMAP FOLD, AND IT IS NOT DUPLICATION

The brief named the ROADMAP fold of 2026-08-27 as the likely cause and asked for it to be established
from the commit. **It is not that commit.** Counting duplicated `##` titles at each candidate:

| commit | date | duplicated titles |
| --- | --- | --- |
| `b22ff2b8~1` | 2026-08-24 | **14 — already present** |
| `b22ff2b8` ROADMAP-FOLD-1 | 2026-08-24 | 14 |
| `c49d5af5~1` | 2026-08-27 | 14 |
| `c49d5af5` ROADMAP-FOLD-2 | 2026-08-27 | 14 |

Walking the file's 188 commits, the first with any duplicate is
**`fa14ca0c` — `docs(BACKLOG-SORTED-1): the backlog is two parts, and nine owner decisions are on the
record`, 2026-08-23.** That commit introduced `# PART ONE — OPEN` and `# PART TWO — CLOSED`.

### And that is because the two "copies" are a subject's OPEN half and its CLOSED half

**Thirteen of the fourteen pairs straddle the PART boundary** — one occurrence in PART ONE, one in
PART TWO. Measured on a sample, and it is unambiguous:

| section | region | unticked | ticked |
| --- | --- | --- | --- |
| Instrument coverage residuals | PART ONE | **2** | 0 |
| Instrument coverage residuals | PART TWO | 0 | **2** |
| Measurement and guard residuals | PART ONE | **3** | 0 |
| Measurement and guard residuals | PART TWO | 0 | **3** |

**The heading appears twice because the subject has open items and closed items, and the file sorts by
verdict rather than by subject.** That is BACKLOG-SORTED-1's whole design, stated in its own commit
message. **Merging these pairs would have collapsed PART ONE into PART TWO and destroyed the
open/closed sort** — leaving the tree materially less true than it found it, which is what constraint
1 forbids. **They were not touched.**

**No entry appears in both copies of any pair — zero, checked mechanically over all fourteen.** So the
finding the brief anticipated — *"a box closed in one copy and open in the other means the entry's
real state is UNKNOWN"* — **does not exist here.** The copies hold disjoint content by construction.

---

## 2. THE ONE REAL DUPLICATE, AND IT IS ONE NIGHT OLD

`## Documentation (2026-08-07, from DOC-ORDER-1)` appears at **line 2465 and line 3917, both inside
PART TWO.** They are **DIVERGED**, not identical: 2465 holds the authentication entry, 3917 holds the
ROADMAP-merge entry and several MOOT-verdict items.

**Its cause is last night's own repair.** BACKLOG-VERDICTS-1 created
`## CLOSED 2026-09-02 BY BACKLOG-VERDICTS-1` and moved entries into it **whole, keeping their original
`##` headings** — so five sections inside that block sit at the same heading level as PART TWO's own
sections, and one of them collides with a title already there.

**This is the week's pattern once more: a repair created the defect the next piece had to find.** It
is the fourth such instance recorded in eight days.

### The reconciliation: five headings demoted, no content moved

The five `##` headings inside the CLOSED-2026-09-02 block became `###`, nesting them under the block
they belong to. **Nothing was merged, moved, reordered or reworded.**

| line | heading |
| --- | --- |
| 3680 | TWO UNMERGED BRANCHES CARRY FIGURES… |
| 3725 | ~~THE CLIENT SUITE STARVES ITSELF~~ |
| 3785 | WHICH FIELDS OF A SHIPPED TRACK BELONG TO THE PROJECT… |
| 3875 | A shipped track change never reaches an existing installation |
| 3917 | Documentation (2026-08-07, from DOC-ORDER-1) |

Duplicated `##` titles: **14 → 13**, and the 13 that remain are the structure.

**Why demotion rather than merging the two Documentation sections.** Merging would have moved entries
out of a dated, deliberate "closed tonight" grouping into an older section — reordering content to fix
a heading level. Demotion states the true nesting and leaves every line where it is.

---

## 3. PRESERVATION, VERIFIED THE WAY BACKLOG-VERDICTS-1 VERIFIED ITS OWN

| check | result |
| --- | --- |
| non-blank lines, before / after | **3,063 / 3,063** |
| lines not surviving character-for-character | **5** — every one a heading |
| of those, explained by a pure `##`→`###` demotion | **4** |
| the fifth | the stale-warning marking in §4, which is a deliberate edit |
| **lines the verdict count reads** (`- [` and `VERDICT 2026-09-02`) | **280 before, 280 after, byte-identical** |
| entries deleted | **0** — no pair was a true duplicate of content, so the one permitted deletion was never used |

---

## 4. THE TWO STALE ITEMS

**(a) The unmerged-branches warning — CLEARED.** `### ⚠ TWO UNMERGED BRANCHES CARRY FIGURES MEASURED
AGAINST A DEFECTIVE BASELINE` still read in the present tense. BACKLOG-VERDICTS-1 had already put an
ALREADY DONE verdict above it — both branches merged 2026-09-02, `f01ff8ea` and `73053d25` — **but the
heading itself did not say so**, and a heading is what a reader scanning the file actually sees. Now
struck and marked shipped. The body is untouched, because it states a general rule about superseded
figures that survives the branches shipping.

**(b) Closed sections inside open ranges — MEASURED AND REPORTED, NOT MOVED.** The brief forbids
reordering, and moving entries between PART ONE and PART TWO is exactly that, so this is a finding
rather than an edit:

| region | unticked | ticked |
| --- | --- | --- |
| PART ONE (OPEN) | 38 | **13 closed items sitting in the open part** |
| PART TWO main (CLOSED) | **13 open-looking items in the closed part** | 107 |
| CLOSED-2026-09-02 block | **9 open-looking items** | 1 |

The 22 unticked items in PART TWO are **not** a defect: BACKLOG-VERDICTS-1 deliberately left checkboxes
as they stood and said so in that block's preamble, with the verdict line above each as the closure
mark. **The 13 ticked items in PART ONE are the untidy half**, and two whole sections there are titled
CLOSED — *Evolution Act 2* (line 892) and *Evolution Act 1* (line 912), both closed 2026-07-26. Neither
carries a checkbox at all, so neither reads as open work; they are misfiled rather than misleading.
**Moving them is a reorder and is on the morning sheet, not taken here.**

---

## 5. THE RE-COUNT — LAST NIGHT'S NUMBERS STAND, AND THE REASON MATTERS

The brief asked for a corrected count on the grounds that last night's was *"taken over a doubled
file"*. **The file was not doubled**, so there is nothing to correct:

| | last night | tonight | difference |
| --- | --- | --- | --- |
| open before | 128 | **128** | — |
| closed | 16 | **16** (12 ALREADY DONE + 4 MOOT) | — |
| still true | 105 | **105** | — |
| needs his word | 7 | **7** | — |
| verdict lines | 99 | **99** | — |

**This is proven rather than re-adjudicated.** The 280 lines the count is computed from — every
checkbox line and every verdict line — are **byte-identical before and after**, so the reconciliation
cannot have moved any of these numbers. And since no entry appears in both copies of a pair, the
original count never double-counted one either.

---

## Limits

**"128 open" rests on a stated definition of "entry"**, not on a checkbox count — BACKLOG-VERDICTS-1
counted a checkbox item, a bullet item, or a whole section where one subject has one status, with six
verdict lines each covering a list. This piece confirms the count's INPUTS are unchanged; it did not
re-adjudicate the 128 entries, which is that piece's work and was not redone.

**The thirteen structural pairs were sampled, not exhaustively audited.** Four sections were measured
for open/closed composition; the PART-boundary straddle was checked for all thirteen. Whether every
one of the thirteen splits its subject *correctly* is a judgement about each entry, not a structural
fact, and was not attempted.

**Nothing was moved between PART ONE and PART TWO**, so the file's sort is exactly as untidy as it was.
The 13 misfiled closed items are named above and left.
