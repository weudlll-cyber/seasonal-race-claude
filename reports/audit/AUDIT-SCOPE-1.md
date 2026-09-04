# AUDIT-SCOPE-1 — the denominators, and what three weeks did

**Measured 2026-09-04 on master `8c3cbe93`, working tree clean. Read-only: nothing was edited.**
Piece 1 of THE FULL AUDIT. Every count below is from a command, not an estimate.

> **VERDICT ON THIS AXIS: CLEAN, and the shape is knowable.** The repository is **2,452 tracked
> files**, of which **1,345 are reports** — the lab journal is 55% of the file count and 25% of the
> tracked bytes. The part that can break is **479 source files / 121,137 lines** across four trees.
> **Every denominator this audit needs exists and was measured; none had to be estimated.**

---

## 1. THE SHAPE

| | files | lines |
| --- | ---: | ---: |
| `client/src` — source | 254 | 56,032 |
| `client/src` — tests | 242 | 62,412 |
| `server/src` — source | 27 | 4,015 |
| `server/src` — tests | 29 | 8,367 |
| `scripts/` — source | 197 | 60,991 |
| `scripts/` — tests | 41 | 10,253 |
| `shared/` | 1 | 99 |
| **SOURCE TOTAL** | **479** | **121,137** |
| **TEST TOTAL** | **312** | **81,032** |

**Tests are 40% of the code by line.** That is the estate this audit's piece 6 has to judge.

### By area, all tracked files

| area | files |
| --- | ---: |
| `reports/` | 1,345 |
| `client/src` | 514 |
| `scripts/` | 239 |
| root / other | 125 |
| `server/` | 97 |
| `docs/` | 60 |
| `client/` (other) | 50 |
| `client/e2e` | 21 |
| `shared/` | 1 |
| **total** | **2,452** |

`client/src` splits **131 modules · 90 screens · 15 components · 10 services · 4 utils**.

---

## 2. DOCUMENTS

| | |
| --- | ---: |
| living documents (`docs/*.md`) | **36** |
| archived (`docs/archive/`) | 22 |
| `docs/internal/` | 1 |
| total lines under `docs/` | **29,736** |
| reports (`.md` under `reports/`) | **851** |
| report directories | 11, of which **5 indexed** and **7 declared archive** |

**Five documents are 60% of the living prose**: `LESSONS.md` 4,171 · `BACKLOG.md` 4,075 ·
`TAGS.md` 2,067 · `CAMERA_DIRECTOR.md` 1,963 · `SIM.md` 1,346.

**`reports/evolution/` alone holds 437 reports**, and it is the one that grows.

---

## 3. TESTS, GUARDS, INSTRUMENTS

| runner | files | tests | wall clock |
| --- | ---: | ---: | ---: |
| client (vitest) | 239 | **4,467** | **286 s** |
| server (vitest) | 31 | **725** | 66 s |
| scripts (`node:test`) | 41 | **505** | 77 s |
| e2e (Playwright) | 9 | — | **hand-run only** |
| **total tracked test files** | **320** | **5,697** automatic | ~7.2 min |

**311 of 320 test files run under an automatic invoker.** The nine that do not are the whole
Playwright suite, which is the same standing exception as three weeks ago.

**26 guards are discovered by `npm run verify`** — the set is scanned, never listed:

    camera-fingerprint · ceremony-counts · check-config-claims · check-config-keys
    check-container-paths · check-doc-facts · check-doc-links · check-ending-frame
    check-fallback-agreement · check-fingerprint-payload · check-hooks-installed · check-index
    check-language-closed · check-measured-stamps · check-runin-frame · check-seed-versions
    check-standings-invariant · check-tags · check-writable · client-suite · engine-reach-doc
    fingerprint-containment · render-fingerprint · script-suite · server-suite · world-fingerprint

`scripts/` holds **124 `.mjs`** in total — 18 `check-*`, 5 fingerprint tools, 29 script tests, and
the rest instruments, diagnostics and experiments across six subdirectories.

**The engine-reach closure is 78 files** — the set that can change the race.

---

## 4. SIZE ON DISK

| | |
| --- | ---: |
| tracked content | **94.5 MB** |
| `.git` | **660 MB** |
| working tree incl. `node_modules` | 1.3 GB |

**What dominates the tracked 94.5 MB:**

| | |
| --- | ---: |
| `server/seeds/` | **51.96 MB** (55%) — the ten track backgrounds the game actually shows |
| `reports/` | **23.78 MB** (25%) |
| `client/` code | 5.43 MB |
| `exp-runaway-leader-results/` | 4.97 MB |
| `scripts/` | 3.00 MB |
| `client/public/` | 2.28 MB |
| `docs/` | 2.26 MB |
| `server/` code | 0.63 MB |

**Two facts worth stating plainly.** First, **80% of the repository's bytes are seed artwork and the
lab journal** — neither is code and neither can break the product. Second, **`.git` is seven times
the working tree's tracked content**, which is what a history of large binary artwork costs; that is
a consequence, not a defect, and rewriting history is not on the table.

---

## 5. ★ AGAINST THE CENSUS OF THREE WEEKS AGO

Where a comparable figure exists. The 2026-09-01/02 census is `CENSUS-TESTS-1`, `CENSUS-CHECKS-1`,
`CENSUS-DUPES-1`, `CENSUS-REMOVABLE-1` and `CENSUS-REST-1`.

| | 2026-09-01/02 | 2026-09-04 | |
| --- | ---: | ---: | --- |
| test files tracked | 310 | **320** | **+10** |
| tests that execute | 5,583 | **5,697** | **+114** |
| run under an automatic invoker | 300 of 310 | **311 of 320** | share unchanged, **97%** |
| hand-only files | 10 | **9** | −1 |
| selected but inert (wrong runner) | 0 | **0** | held |
| mirrored facts that DISAGREE | **27** | **0** | ★ **closed** |
| engine-reach closure | 76 | **78** | +2 (two pure leaves) |
| commits | — | 2,392 | **+241 in three weeks** |
| tags | — | 124 | |

**★ THE ONE AXIS THAT MOVED THE MOST IS THE MIRRORS: 27 disagreements to ZERO.** Today
`check-fallback-agreement` reports **406 mirrored fallbacks in 257 files, 400 of them by reference
and 0 disagreeing**, plus Rule A (0 registry literals in 455 files), Rule D (20 racer sheets) and
Rule F (69 symbol citations, 0 disagreeing). That is the census's headline finding, closed and
guarded.

**Two comparisons I am NOT making, and why.**

- **"40 checks" is a different grain from "26 guards".** The census counted *named, separately
  introduced assertions*, including hook-integrity checks and per-argv invocations; `verify`'s 26 is
  the set of discoverable guard scripts. **They are not the same denominator and I will not subtract
  one from the other.** Piece 7 re-counts the checking surface on the census's own grain so the
  comparison is honest.
- **File and line totals have no 09-01 counterpart.** The census measured tests, checks, duplicates
  and removables — not the tree's size. Today's figures are therefore a **new baseline**, not a
  delta.

**★ AND ONE FIGURE THAT LOOKS WORSE AND NEEDS A CAVEAT.** The client suite was **170 s** in the
census and is **286 s** today, for 3% more tests. That is a 68% increase in wall clock. I am
**flagging it, not concluding it**: the two runs were on different days under different machine load,
and the census's own analysis showed jsdom instantiation dominating worker time rather than test
bodies. Piece 6 measures it under controlled conditions; until then this is an observation with a
known confound.

---

## 6. WHAT THIS PIECE DOES NOT COVER

- **It counts, it does not judge.** Nothing here says whether a test asserts anything, whether a
  guard can fire, or whether a document is true. That is pieces 2, 6 and 7.
- **`node_modules` is excluded everywhere.** Dependency surface is piece 8.
- **Untracked working files are excluded.** The tree was clean, so the two sets coincide today.
- **The 09-01 comparison covers 6 rows.** Every other figure here is a first measurement, and is
  labelled as one rather than presented as an improvement.
