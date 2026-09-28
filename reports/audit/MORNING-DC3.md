# MORNING SHEET — DELIVERY-CLEAN-3, the cleanup night

**Six pieces, one branch each, merged before the next was cut.** From master `298d6290`.
The OPEN section at the foot is regenerated from the tree.

---

## ALL SIX PERFORMED, ALL SIX MERGED. NONE BLOCKED.

★ **CI and the Browser gate are green on the final merge `d26ebcce`**, and so are the two
SCHEDULED runs of the following morning — including the **daily dependency audit**, which is the
one job that can redden master with no code change at all.

| piece | merge | what it did |
| --- | --- | --- |
| 1 · B9, warn on insecure transport | `730aa8ff` | the startup now says sign-in would travel unencrypted |
| 2 · P2/B7, upload responses | `dbae6326` | three → one, proved by **driving** all three routes |
| 3 · P3, the store preamble | `6a85e5a0` | **three** duplicates, not two; no drift; −34 lines |
| 4 · C8, the dev dependency | `3fa58487` | aligned — **by a different route than the brief** |
| 5 · P6, unused locals | `5e23187f` | 34 of 78 removed; 44 held with reasons |
| 6 · the sweep | `d26ebcce` | 4 drifted citations repaired; **C10 refuted** |

---

## ★★ WHAT I GOT WRONG, AND WHAT CAUGHT IT

Four of my own earlier claims did not survive tonight, and two of my own tools misbehaved. That is
the honest shape of this run.

**1 · My sweep broke a guard, and `node --check` said everything was fine.** Piece 5's first pass
underscored unused *parameters* — safer than deleting, which shifts later positional parameters.
Its guard matched a paren followed by the name, which is also the shape of
`while ((m = re.exec(src)))` in `engine-reach.mjs`. It renamed the assignment and not the
declaration, leaving a name never defined. **All 274 scripts still parsed**, because a
`ReferenceError` is a runtime fault. Only the script *suite* exposed it. Reverted; the treatment is
disabled in the tool with that reason written into it.

**2 · `engine-reach` found a third hull script.** After piece 5's sweep it reported *"1 of 27
path(s) can change the race"* — `scripts/diag/gp-repro.mjs`. My held-back set listed only the two
files arc 4 named. **There are three.** Reverted.

**3 · C10 was my claim and it is false.** It said the two benchmarks "fail silently" without their
`--master` worktree. They print **`FAIL: --master=<path> is not a RaceArena tree.`** and exit 2. I
ran both to prove it. The claim came from §7.2, which asserted it **without ever running them**.

**4 · The citation sweep's first run reported 35 dead files; 3 were real.** The resolver did not
resolve paths relative to the citing file. Fixed before anything was touched.

---

## ★ PIECE 4 DEVIATED FROM THE BRIEF — READ THIS ONE

You said align the dev dependency to the **higher** range and refresh the lockfiles. I tried that
first. **`npm install` on this machine reports success and does not materialise an upgrade**: with
both manifests at `^4.1.11` and both lockfiles refreshed, the disk stayed at client 4.1.5 / server
4.1.8, the running binary reported 4.1.8, and npm itself said *invalid: "^4.1.11" from the root
project* — with `node_modules` writable, so not a permission fault.

The piece's own condition is *confirm both suites still run*, and suites run on the **installed**
version — a green run would have proved nothing about the range being shipped, and a lockfile
nobody here can install makes CI the first to try it. **Reverted in full**, then aligned to the
range both trees already satisfy: same goal, provable now. A lower floor costs nothing, because
`npm ci` installs from the **lockfile**, not the range. **The upgrade is its own row.**

---

## WHAT EACH PIECE LEFT BEHIND, deliberately

- **Piece 1** did not change the cookie default — only an advisory line appears. **The default is
  still your decision.**
- **Piece 5** left **44 of 78**: 14 in the three hull scripts, 7 whose identifier appears in a
  string *in its own file*, 23 shapes a sweep must not guess at (destructuring with renames,
  multi-line declarations, function declarations).
- **Piece 6** left C11's format-guard widening (changing a guard's scope is a decision) and the
  `C:/ra-wt-nanoid` defaults (they fail loudly, and removing a default you rely on is a behaviour
  change).

---

## STILL YOURS — untouched tonight, by your own instruction

P1 (`CameraDirector.js`, 5,507 lines) · P4 (`RaceScreen/index.jsx`) · P5 (the two Dev Screen
sections → `B-UX2`) · the bind (B4) · base-image pinning (C5) · the 30-day cookie (C7) · the backup
checksum. **And now also the cookie default itself** — piece 1 made it visible without changing it.

---

## THE OPEN LIST — regenerated from the tree

**PART ONE: 7 non-audit subjects + 7 open DELIVERY-CLEAN rows = 14.** `docs/OPEN.md` lists **14**.

★ The night **closed B9, B7/P2 and C8**, struck P2 and P3 off the structural proposals, and closed
C10 as **refuted**. It opened nothing.
