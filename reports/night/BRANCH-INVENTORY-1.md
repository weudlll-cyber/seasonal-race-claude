# BRANCH-INVENTORY-1 — every branch at origin, what it carries, and one recommendation each

Branch `feat/gap-leader-brake`. **Read-only: nothing merged, nothing tagged, nothing deleted.**
Date: 2026-09-15. This is the list to decide from, not a set of actions taken.

`origin/master` tip at the time of reading: **`7eb65c82`** — *docs(RUNIN-ACCEPTED-1): pin WHICH races
he ran before accepting, read from his own store*.

---

## THE TABLE

"Tree in master" is `no` for all of them: every branch below has at least one commit master does not
have, so none is already contained. "Ahead / behind" are commit counts against `origin/master`.

| branch | tip | ahead | behind | carries | files vs master | recommendation |
|---|---|---|---|---|---|---|
| **feat/gap-leader-brake** | `7e457de7` | 23 | 0 | **PRODUCT** | 20 (7 product, 13 docs) | **keep open** — the live branch; the brake ships OFF and his eye-test is outstanding |
| **feat/remove-prestaging-comebacker** | `5c9e050e` | 2 | 0 | **PRODUCT** | 5 (3 product, 2 docs) | **keep open, needs your word** — it removes a mechanism; nothing else blocks it |
| fix/breakaway-recount-1 | `0c511581` | 1 | 0 | docs only | 3 | **merge** — a correction to a published number; see the caveat below |
| read/bvgg8z-1 | `c1383c77` | 1 | 0 | docs only | 2 | **merge** — read-only report + its index line |
| read/fallback-comebacker-1 | `efa61042` | 1 | 0 | docs only | 2 | **merge** — read-only report + its index line |
| read/relational-history-1 | `47013636` | 1 | 0 | docs only | 2 | **merge** — read-only report + its index line |
| read/shape-census-1 | `bdbc778d` | 1 | 0 | docs only | 2 | **merge** — read-only report + its index line |
| report/brake-census-1 | `35e16c2a` | 1 | 0 | docs only | 1 | **merge** — a single report file, no index line (see below) |
| night/2026-09-14-history | `cba9c774` | 5 | **13** | docs only | 3 | **merge, but rebase first** — it is 13 commits behind and carries `docs/MORNING.md`, which this night also writes |

---

## WHAT EACH ONE ACTUALLY CONTAINS

**feat/gap-leader-brake** (this branch) — the gap brake and everything measured around it.
Product files: `client/src/modules/racePlanner.js`, `raceCore.js`, `raceDynamicsConfig.js`,
`storage/defaults.js`, `screens/DevScreen/sections/DynamicsTuningSection.jsx`, plus two test files.
**The shipped default is OFF and all four fingerprints are unmoved**, so the product diff changes no
race until the switch is thrown. His eye-test on the served build is still owed.

**feat/remove-prestaging-comebacker** — the only other branch with product code:
`client/src/modules/heroCurveGenerator.js` and two test files, plus `docs/ARCHITECTURE.md` and
`docs/DEAD-ENDS.md`. It removes a mechanism, so it moves the race by construction. **Needs his word
before anything happens to it**; it is not a housekeeping merge.

**The five read-only report branches** (`read/bvgg8z-1`, `read/fallback-comebacker-1`,
`read/relational-history-1`, `read/shape-census-1`, `report/brake-census-1`) — each is one commit
adding one report and, in four of the five, its `reports/evolution/INDEX.md` line. They touch no
product code at all, so merging them cannot move a race. They will conflict with each other only in
`INDEX.md`, and only as adjacent-line conflicts.

★ **`report/brake-census-1` adds `reports/night/BRAKE-CENSUS-1.md` with NO index line.** On master's
current guards that is a `check-index` failure (`1 report not referenced from INDEX.md`). **Merging
it alone would redden master.** It needs its index line added in the merge.

**night/2026-09-14-history** — `reports/evolution/BREAKAWAY-HISTORY-1.md`, its index line, and
`docs/MORNING.md`. It is **13 commits behind master** and its `docs/MORNING.md` is a different
night's sheet from the one this night writes, so a straight merge would fight over that file.

---

## THE ONE THING TO SEQUENCE

`fix/breakaway-recount-1` edits **`reports/evolution/BREAKAWAY-FREQUENCY-1.md`** — a published
number — and `night/2026-09-14-history` adds `BREAKAWAY-HISTORY-1.md` about the same numbers.
**Piece 5 of tonight's chain recounts those shares again on a fixed divisor**, which is the third
reading of them. Merging the recount branch before reading tonight's recount would leave two
corrections in flight on one file. **Recommendation: take tonight's recount first, then merge
`fix/breakaway-recount-1` and `night/2026-09-14-history` together, in that order.**

---

## WHAT THIS DOES NOT SAY

- It does not check whether any branch would pass `verify` after merging — only what each one
  touches. The `check-index` hazard on `report/brake-census-1` was found by reading the diff, not by
  running the guard on a merge.
- `night/2026-09-14-history` is the only branch behind master; the other seven are all 0 behind, so
  they are clean fast-forwards on content but will still conflict pairwise in `INDEX.md`.
- **Nothing was merged, tagged or deleted.** Every branch is exactly as it was.
