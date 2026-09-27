# DELIVERY-CLEAN-2 · ARC 3 — THE 281 TOOLS: DO WE NEED THEM ALL

**From master `1b93fc00`, branch `audit/2026-09-27-tools`.** Tool removals with the survivor named,
and one tree-wide portability sweep. No product source touched.

★ **The short answer: 4 removed, 85 kept with a reason each, and the interesting part is why 85
scripts that nothing reaches are still worth keeping.**

---

## §3.1 — WHO INVOKES WHAT. ★★ RE-PROVEN, AND C2's 65 WAS RIGHT BUT MEANT SOMETHING ELSE.

**Denominator: 281 tracked files under `scripts/`, of which 278 are `.mjs`/`.js` (3 are `.json`).**

**Invokers searched** — 579 files: all three `package.json`, everything under `.github/` and
`.husky/`, and every tracked `.mjs`/`.cjs`/`.sh` and non-test `.js` anywhere in the tree. ★ Prose
was **excluded**: a script named in a report or a backlog row is *mentioned*, not *invoked*, and
counting those is what makes a dead tool look alive.

| | count |
| --- | ---: |
| named by at least one invoker | **149** |
| ★ named by none, but **DISCOVERED BY CONVENTION** | **40** |
| ★★ **genuinely reached by nothing** | **89** |

### The 40 that look orphaned and are not — two discovery mechanisms

This is the correction that matters, and it is the same false-positive class that produced three
wrong entries in DELIVERY-CLEAN-1's guard sweep.

- **`*.test.mjs` (≈20)** — `script-suite` runs them via `scriptTestFiles()`
  (`scripts/verify.mjs:650`), which does `git ls-files scripts` **and filters**. Its own comment
  records why it is a filter and not a glob pathspec: the pathspec matched 17 files while CI's
  `find` matched 18, and *"two discovery mechanisms disagreeing about which tests exist is the same
  defect class"*. **No test file is ever named by anything.**
- **`check-*.mjs` at the top level** — the guard registry resolves a guard id to its file **by
  naming convention**, never by a literal filename.

★★ **So a search for "who names this file" is structurally blind to both.** I reproduced C2's
**65** exactly — it is the count of top-level scripts named by no invoker — and **roughly 29 of
that 65 are these two classes**, not dead tools. The honest top-level figure is **36**.

### Where the 89 actually are

| | |
| --- | ---: |
| `scripts/diag/` | **53** |
| `scripts/` top level | **36** |

★ `scripts/diag/` is a **declared hand-run directory**. Its 53 are not a finding; they are what that
directory is for. C2 excluded it and said so, which is why C2 said 65 and not 129.

---

## §3.2 — WHAT EACH ORPHAN IS

Classified from each file's own header.

### ★ REMOVED — 4 spent one-offs, 473 lines

Each produced **one named artefact** that is committed. The job is done and the output is in the
tree; per the rule, the removal names where the content went.

| removed | where its job went |
| --- | --- |
| `crop-dolphin-sprite.mjs` | `client/public/assets/racers/dolphin-swim.png`, tracked |
| `gen-boarder-sprite.mjs` | `client/public/assets/racers/boarder-sprite.png`, tracked |
| `gen-luge-sprite.mjs` | `client/public/assets/racers/luge-slide.png`, tracked |
| `gen-scaled-sprites.mjs` | `turtle-swim.png`, `manta-swim.png`, `dolphin-swim.png`, all tracked at their downscaled sizes |

**Checked before each removal:** zero references anywhere outside `reports/` and the file itself;
**no living document instructs anyone to run them** (`docs/`, `README.md`, `CLAUDE.md` — zero hits);
the named output exists and is tracked. `gen-scaled-sprites.mjs` also *"Overwrites source files
in-place"* — re-running it would re-downscale already-downscaled art, so it is not merely spent but
unsafe to repeat.

★ **The cost, stated:** the recipe for regenerating those four assets now lives only in git history.
That is the trade, and it is why the four chosen are the ones whose output is a **single committed
file** rather than a technique.

### ★ KEPT, and these are the judgements worth reading

**`gen-aquatic-masks.mjs` — kept, though it is the same shape as the four above.** It generates tint
masks for turtle, manta and dolphin, and it is **the only worked example in the tree of how a tint
mask is made.** A future aquatic racer needs that technique, not just those three PNGs. Removing it
would delete a method, not a spent artefact. **Row, not removal.**

**The `exp-*` family (7) — kept, and the reason overrides "spent".** They are finished experiments
(`exp-rebaseline-150`, `exp-gs-honest-150`, `exp-gate-retune` …) whose results are written up in
`reports/`. ★ **Each is cited by 4–6 reports.** Removing them would leave those reports citing a
measurement nobody can reproduce — which converts a dated record into an unverifiable claim. A
spent one-off whose *result is still load-bearing* is not the same as a dead script.

**The `*-truth` family and all 53 of `scripts/diag/` — kept, live-but-unwired.** These are hand-run
questions (*"THE QUESTION: is the road actually UNEVEN in width today?"*). They are reached by
nothing **by design**: a person runs them when they have that question.
★ **What each would need to become reachable, per the brief: one line in the guard registry plus a
declared `depends=` set.** That is a decision about what CI spends time on, and it is not arc 3's.

---

## §3.3 — REDUNDANT TOOLS: ★ NONE FOUND, AND ONE READABILITY DEFECT INSTEAD

**No pair was found where two scripts produce one measurement.** The suspicious-looking family is
the 14 `*-sum.mjs` files in `scripts/diag/`, and they are **parallel by design, not duplication**: a
producer writes dumps into a directory and the summariser reads that directory.
`leader-lag-sum.mjs:19` takes `--dir`, defaulting to `join(tmpdir(), "lag")`.

★ **The defect is that the pairing is invisible from the names.** Six of the 14 summarisers have no
producer of the same stem — `leader-lag-sum.mjs`'s producers are `leader-lag-tc.mjs` and
`leader-lag-truth.mjs`; `runin-aim-sum.mjs`'s is `runin-aim-axes.mjs`. **They are coupled by output
directory, which no reader can see from a listing.** Recorded as a row; renaming 14 hand-run tools
is churn against files people invoke from memory.

---

## §3.5 — PORTABILITY, ★ TREE-WIDE THIS TIME

§7.2 swept `scripts/` only. This swept **951 tracked `.mjs`/`.js`/`.jsx`/`.cjs` files across every
directory.**

| pattern | hits | verdict |
| --- | ---: | --- |
| drive letter in a string | **3** | 2 are the documented `--master` worktree defaults (`label-bench-matrix.mjs:40`, `phys-bench-matrix.mjs:63`); 1 is `staticClient.test.js:61`, a **test asserting** a Windows path resolves — correct |
| absolute `/tmp` | **1** | `dataPaths.test.js:20`, a **test asserting** `/tmp/x` resolves — correct |
| unix `/home`, `/Users`, `/var`, `/opt`, `/etc` | **0** | — |
| shell assumption (`execSync("bash …")`) | **0** | — |
| backslash path separator | 42 | **all regex escapes**, as in §7.2 — not paths |

★★ **So the product source — `client/`, `server/`, `shared/` — carries no hardcoded path at all.**
Every real one is in `scripts/`, and both are the worktree defaults already recorded as having no
portable alternative. The class that once wrote 11 MB into the repository root is closed outside
those two.

---

## §3.4 — THE COUNTS

| | before | after |
| --- | ---: | ---: |
| tracked files under `scripts/` | **281** | **277** |
| lines removed | — | **473** |
| removals whose replacement is named | — | **4 of 4** |

---

## ARC 3 — UNKNOWN

- ★★ **"Reached by nothing" is not "does nothing".** 89 scripts are unreachable by any automated
  path and I removed 4. The other 85 were judged by **reading their headers**, not by running them:
  a tool whose header describes a live question could still be broken. Only 5 scripts were executed
  in this arc's lineage (the four re-run in §7.2 plus `line-ceiling-terms.mjs`), and
  **222 of the non-test scripts have still never been executed by any audit.**
- **The invoker search is name-based.** A script invoked through a constructed string
  (`` `scripts/${name}.mjs` ``) would read as an orphan. I found the two convention-based
  mechanisms; a third, cleverer one would have been missed the same way.
- **`git grep` for references excluded `reports/` deliberately.** That is right for "is it
  invoked" and wrong for "is it remembered" — the `exp-*` decision turned on the reports, so the
  exclusion was reversed for that question and stated.
- **No removed script was re-run before removal** to confirm it still works — the argument for
  removal was that its output is committed, not that it functions.
- **`scripts/diag/`'s 53 were not individually opened.** They were classified as a directory, on
  the directory's declared purpose.
