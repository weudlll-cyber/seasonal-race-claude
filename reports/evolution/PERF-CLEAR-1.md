# PERF-CLEAR-1 — the perf archive cleared by the owner's criterion

**Date:** 2026-08-23 · **Branch:** `docs/perf-clear` off master `6486b9b5`
**Piece 1 of CHAIN-2026-08-23.**

**Ten of the eleven write-ups deleted. One kept. No raw chain deleted — and that last one is the
result that was not expected.**

---

## THE CRITERION, AND HOW IT WAS APPLIED

**The owner's decision of 2026-08-23:** a write-up that cannot be reproduced is worth keeping only
if we still know WHAT it measured and the source state still relates to it. Raw chains older than
two weeks go regardless.

**A referent is a commit, tag, branch or date that RESOLVES TODAY.** Every candidate was extracted
from the file and tested against the real repository — nothing was inherited from the brief or from
PERF-INVENTORY-1.

## STEP 1 — THE CLASSIFICATION, published before anything was deleted

**All eleven name `feat/open-track-overlap` and the date 2026-06-06.** Neither is a referent:

- **`feat/open-track-overlap` resolves nowhere.** `git rev-parse --verify` fails; `git ls-remote
  --heads origin` returns no match. It was merged at `bc53ae1` on 2026-06-08 and the branch is gone.
- **`backup/step1-complete-fair`**, named by two of them, also resolves nowhere.
- **A date alone cannot resolve a commit** on a day with many.

| # | file | lines | bytes | commits that RESOLVE | subject files named / still present | **verdict** |
| --- | --- | ---: | ---: | --- | ---: | --- |
| 00 | `00-cc-perf-analysis.md` | 341 | 24 201 | — | 0 / 0 | **NO REFERENT** |
| 01 | `01-tier1-wave1.md` | 162 | 7 715 | **`3eac3f2`** | 3 / 3 | **HAS A REFERENT AND THE SUBJECT STILL EXISTS** |
| 02 | `02-postfix-reconciliation.md` | 184 | 14 208 | — | 0 / 0 | **NO REFERENT** |
| 03 | `03-memory-leak-audit.md` | 276 | 16 189 | — | 2 / 2 | **NO REFERENT** |
| 04 | `04-mid-race-refresh-memory.md` | 201 | 13 671 | — | 0 / 0 | **NO REFERENT** |
| 05 | `05-scoreboard-simplify.md` | 153 | 7 780 | — | 2 / 2 | **NO REFERENT** |
| 07 | `07-allocation-reduction.md` | 178 | 7 784 | — | 2 / 2 | **NO REFERENT** |
| 08 | `08-neighbor-pairloop.md` | 236 | 13 586 | — | 1 / 1 | **NO REFERENT** |
| 10 | `10-loop-fusion-analysis.md` | 472 | 24 183 | — | 2 / 2 | **NO REFERENT** |
| 11 | `11-y-rejection.md` | 126 | 4 810 | **`fb98858`** | 1 / 1 | **HAS A REFERENT, SUBJECT GONE** |
| 12 | `12-y-rejection-sweep.md` | 228 | 8 869 | **`8bd7180`, `94645e1`, `fb98858`, `3eac3f2`** | 0 / 0 | **HAS A REFERENT, SUBJECT GONE** |

**Eight with no referent — which agrees exactly with the brief's expectation, reached independently.**

### Why 11 and 12 are SUBJECT GONE, established at source

Both measured the **Y-rejection**: a shortcut placed before the `sqrt` in the avoidance pair loop,
guarding the mixed-unit metric `dT×tWeight + dY×yWeight` against `avoidanceDistance`.

**That metric no longer exists.** `raceBehavior.js:910-912` says so in the code that replaced it:

> *Geometric avoidance gate (report 38/39) — **Replaced the mixed-unit metric (dT×tWeight +
> dY×yWeight) that could not be calibrated per-track** (required weight ≈ 131 on Space Sprint, ≈ 67
> on Dirt Oval). Two independent px-space axes, no sqrt.*

Confirmed three ways: `avoidanceDistance` has **no occurrence at all** in `raceBehavior.js`;
`tWeight`/`yWeight` occur **only in that comment**; and last night's dead-key verification found all
three are `defaults.js` keys with no production reader. **Their referents resolve and point at a
mechanism that was replaced — the measurement can no longer be related to anything that runs.**

### Why 01 survives

Its referent `3eac3f2` resolves (2026-06-06, in this history). Its subject — the **R4 catch-up
guard** — is live today, verbatim in shape:

```js
client/src/screens/RaceScreen/index.jsx:982
while (st.physicsAccum >= FIXED_DT && _catchupSteps++ < 2) {
```

## STEP 2 — WHAT WAS DELETED

**Ten write-ups, 135 281 bytes.** The directory goes from **326 → 316 tracked files** and
**11 844 021 → 11 711 153 bytes** (the tombstone adds some back).

**AND NO RAW CHAIN WAS DELETED, which is the finding this piece did not expect.** The age rule
removes raw older than two weeks; the cutoff from 2026-08-23 is **2026-08-09**. Dated by the commit
that ADDED each file:

| added | files | bytes | verdict |
| --- | ---: | ---: | --- |
| 2026-08-09 | 181 | 6.88 MB | **STAY** — exactly two weeks old, not *older than* |
| 2026-08-10 | 134 | 4.82 MB | **STAY** |

**Every one of the 315 raw files is two weeks old or younger.** The perf directory looks ancient
because its *write-ups* are from June; its *raw* is all from 9–10 August. **So the age rule, which
was expected to do most of the clearing, does none of it.**

**Two conservative choices at forks, both stated as the brief requires:**

1. **A file added exactly on 2026-08-09 STAYS.** "Older than two weeks" is strictly more than 14
   days. Reading it as "≥ 14 days" would delete 181 files and 6.88 MB on a boundary interpretation,
   which is not a licence a sorting pass should grant itself.
2. **"Its git date" is the date the file ENTERED the repository**, not the last commit to touch it.
   The last-touched date would make a file look young because something reformatted it — the
   opposite of what the criterion asks.

## STEP 3 — THE TOMBSTONE

`reports/perf/DELETED.md`: one line per deleted file — name, git date, bytes, and the verdict that
removed it — plus the criterion, the two refs that fail to resolve, what was kept and why, and the
statement that no raw chain was deleted.

## STEP 4 — THE ARCHIVE'S DESCRIPTION

`scripts/check-index.mjs:130` called the directory *"captured performance logs and frame traces —
measurements, not write-ups"*. **That was wrong about the eleven `.md` files, and the wrongness was
load-bearing: it is why the only irreplaceable content in the directory was invisible.** It now
reads:

> *raw performance chains and profiles — machine output, re-runnable. The one surviving write-up
> (01-tier1-wave1.md) is INDEXED; DELETED.md records the ten that were removed and why*

**And the survivor is indexed**, as the brief requires: `reports/README.md`'s ARCHIVE row now carries
an exception line naming and linking it, and linking the tombstone. `perf/` remains ARCHIVE for its
raw, which is still true of 315 of its 316 files.

## ONE THING OUTSIDE `reports/perf/` HAD TO BE TOUCHED, AND IT WAS NOT A DELETION

**`check-doc-links` failed** after the removal: `docs/DEAD-ENDS.md` §L linked to
`08-neighbor-pairloop.md`. A living document with a dangling link fails a guard and reddens master.

**The brief says delete nothing outside `reports/perf/`, and nothing was deleted.** The link is
**repointed at the tombstone** and the surrounding account is explicitly kept, with a line saying it
is now the only surviving one — so the reader gains the information that the report was removed
deliberately, and loses nothing.

**Every other surviving reference to a deleted file is inside `reports/`** — `PERF-INVENTORY-1.md`,
`PAIR-REACH-ANALYSIS.md`, an open-track-overlap archive file. Those are append-only lab journal,
excluded from `check-doc-links` by design, and were correctly left untouched.

---

## VERIFICATION

| instrument | ran? |
| --- | --- |
| `check-index` | **RAN** — 352 reports, 0 unindexed, 0 dangling |
| `check-doc-links` | **RAN** — 561 links, **0 dangling** (1 found and repointed) |
| `script-suite` (the guard suite — this piece edits a guard) | **RAN** — pass |
| `npm run verify` | **RAN** — **PASS 10, FAIL 0, SKIP 14** |
| fingerprints, browser gate, race, client suite | **NOT RUN, and the answer is determined by construction:** this piece deletes reports and edits one guard's *description string*. No `client/` file changed; the guard edit is a comment and a message. Routing skipped them and said so. |

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| classify all eleven, publish before deleting | done — the table above, in this report, committed with the deletion |
| verify the "eight name none" claim rather than inheriting it | done — **eight confirmed**, by extracting every candidate and testing it against the repository |
| delete NO REFERENT | done — 8 files |
| delete HAS A REFERENT, SUBJECT GONE | done — 2 files, with the subject's replacement quoted from the source that replaced it |
| keep HAS A REFERENT AND SUBJECT EXISTS, with a header naming commit and subject | done — `01-tier1-wave1.md` gained a block quote naming `3eac3f2` and `index.jsx:982` |
| raw older than two weeks deleted, younger stays | applied — and it deletes **nothing**; every raw file is ≤ 14 days old |
| tombstone `DELETED.md`, one line per file, nothing else | done |
| correct the archive description; index any survivor | done — both |
| **delete nothing outside `reports/perf/`** | **nothing was deleted outside it.** One link in `docs/DEAD-ENDS.md` was repointed, which the guard forced and which removes no content |
| if a classification is unclear, KEEP and list it | **no file was unclear** — every one resolved cleanly to one of the three verdicts |

## SOURCE HYGIENE

| | |
| --- | --- |
| `reports/perf/` | 326 → **316** tracked files; 11 844 021 → 11 711 153 bytes |
| deleted | 10 write-ups, 135 281 bytes |
| added | `reports/perf/DELETED.md` |
| edited | `01-tier1-wave1.md` (+7 header lines), `scripts/check-index.mjs` (description + why), `reports/README.md` (+1 row), `docs/DEAD-ENDS.md` (1 link repointed) |
| shipped source changed | **none** |

**NOTICED BUT LEFT:**

- **`reports/perf/pair-reach-analysis` and `spread-field-sweep`** are raw chains whose write-up was
  never written. Untouched — they are inside the two-week window, and "a chain with no write-up" is
  a reason to write one, not to prune.
- **`06` and `09` never existed** (confirmed last night by `--diff-filter=D`). The numbering is not a
  complete record and the tombstone does not pretend otherwise.
- **PERF-INVENTORY-1 now describes a directory that no longer exists in that shape.** It is
  append-only and was deliberately not edited; this report supersedes its inventory.

## PROPOSALS — for the owner, nothing done

1. **Apply the same criterion to the other six ARCHIVE directories.** `exp-archive/`,
   `results-salvage/`, `greenfield/`, `phase1-metrics/`, `closed-track-overview/` and
   `open-track-overlap/` hold **302 reports** between them and have never been tested for a
   resolvable referent. **Value:** this piece found that 10 of 11 write-ups in one directory could
   not be tied to a source state — there is no reason to think the others differ. **Cost, and it is
   why this is a proposal:** those directories hold *conclusions* that living documents cite, unlike
   perf's, so each deletion needs the `check-doc-links` sweep this piece needed, and some will
   legitimately be kept for the citation alone.
2. **Make "names a resolvable referent" a rule inside `check-index`, for NEW reports only.** The
   defect this piece cleared up was created eleven times over one day in June, by a habit rather than
   a decision. A rule that fails when a new report under `reports/` names no commit, tag or date
   would stop the next eleven. **As a rule inside an existing guard (R13), and scoped to new files —
   applying it retroactively would fail 300 reports on day one and be turned off within the hour.**
