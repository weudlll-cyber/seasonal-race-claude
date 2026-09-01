# CENSUS-REMOVABLE-1 — the removable set, named and evidenced

**Date:** 2026-09-02 · **Scope:** read-only census across `scripts/`, `scripts/diag/`, `reports/`,
`docs/`, `client/e2e/` and the repo-root result directories. **NOTHING WAS REMOVED. NOTHING WAS
EDITED.** Piece 4 of the NIGHT-CENSUS-1 chain: it proposes; it does not act.

---

## THE HEADLINE

**One item is conclusively dead: 9 files, 1,444 lines, 57 KB — and 0 seconds of suite time.** Six
items are suspected and not proven. **Four of the six candidate classes came back EMPTY**, and that
is the more useful result than the removal list: the rot this census went looking for has already
been cut, and the guards that would have let it back in are self-policing.

- **Tests for behaviour that no longer exists — ZERO.** There is not a single `.skip`, `.todo`,
  `.failing`, `xit` or `xdescribe` anywhere in `client/`, `server/` or `scripts/`. Every retired
  mechanism named in `docs/DEAD-ENDS.md` section B that was probed — `contestInjector`, `rankProto`,
  `showTarget`, `pulkSurge`, `rubberBand`, `PulkRaceDirector`, `packSpring`, `comebackerPreArm`,
  `leadRotation` — plus `universalBandArrival`, `renderScale` and `sineJitter`, returns **zero hits
  in `client/src`, `server/src` and `scripts/`**. The dead-mechanisms cleanup left no test behind.
- **Guards whose reason has expired — ZERO.** `--declare` was run on all 19 glob-discovered guards
  and every path in their `files`/`dirs`/`reach` declarations checked. **Every declared target
  exists.** The brief's own example — `shared/` in `DECLARED_DIVERGENCES` — was already removed on
  2026-09-01 by IMAGE-STANDALONE-1, and `check-container-paths.mjs:266` carries a self-check that
  *fails* when a declaration names something that is no longer a divergence. This class polices
  itself.
- **Reports and scripts nothing references — already exhausted.**
  `reports/evolution/DEAD-CODE-VERIFIED-1.md` (2026-08-23) ran a more rigorous version of this sweep
  across 416 non-test files and landed on 8 candidates, all one-shot sprite generators. This
  census's independent graph reproduces it and adds nothing to the *proven* column.
- **Documentation describing something removed — ZERO found.** `docs/DEVSCREEN-INVENTORY.md`
  explicitly records the `governorDirector*` / `directorV4*` sections as gone rather than describing
  them as present; `docs/archive/` is a declared archive with its own README.

**`reports/perf` verdict, in two sentences:** it is 317 files and 785,622 lines of machine output
whose value question was already settled by PERF-INVENTORY-1 and acted on by PERF-CLEAR-1, and **the
belief that nothing reads it is false** — `scripts/phys-bench-fit.mjs:34` takes
`reports/perf/phys-bench-1/matrix.json` as its *default* input and that file is present. It is a
**file-count** problem (13.5% of tracked files) and a **line-count** problem, but not a
repository-size problem: it is 2.49 MB of a 600 MB pack, where seventeen track-background images
account for 72.57 MB at HEAD alone, so deleting it would shrink a clone by 0.4% while breaking a live
default path.

**Note on the brief's own figures:** it cited `reports/perf` as 326 files and 787,000 lines. Today it
is **317 files and 785,622 lines** — the difference is the ten write-ups PERF-CLEAR-1 already deleted.

---

## PROVEN DEAD

| item | files | lines | bytes | introduced | last changed | saving |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `client/e2e/camera-pan-diagnostic-output/` | 9 | 1,444 | 57,106 (72 KB on disk; **0.01 MB packed**) | `0a00c9e3`, **2026-05-08** | **never** — 117 days untouched | 9 files, 1,444 lines, **0 s suite time** |

### The evidence, five independent strands

**1 · Its referent resolves nowhere.** The write-up names its subject on its own second line: the
branch under test versus master. `git rev-parse --verify` fails for both `refactor/camera-pan-target`
and `origin/refactor/camera-pan-target`, and `git for-each-ref | grep -i camera-pan` returns nothing —
no branch, no remote-tracking ref, no tag. This is verbatim the owner's criterion of 2026-08-23
recorded in `reports/perf/DELETED.md`: a referent is a commit, tag, branch or date that RESOLVES
today.

**2 · The API it documents no longer exists — "HAS A REFERENT, SUBJECT GONE".** The report's section 2
is an argument about a `CameraDirector` constructor taking a scaled bbox plus world dimensions. The
live constructor at `client/src/modules/camera/CameraDirector.js:189` takes world dimensions, an
open-track flag, config, a drawn body width reference, the shape and a track width — **no bbox**. The
two methods the whole comparison turns on, `_clampOffset` and `this._bbox`, have **zero hits in
`client/src`**; the sole apparent match is `_bboxCache` in `track-editor/EditorShape.js`, an unrelated
module.

**3 · The instrumentation that produced every file is gone, so nothing can regenerate or compare it.**
The `.txt` files are `[CAM_DIAG]` and `[PAN_DIAG]` lines; the `.json` files are `__CAM_STATE_DIAG__`
dumps. Across the **whole tracked tree**, excluding the directory itself: `__CAM_STATE_DIAG__`,
`__CAM_PAN_DIAG__`, `PAN_DIAG` and `CAM_DIAG` each return **zero files**. Not moved, not renamed —
absent. These captures cannot be re-taken, cannot be diffed against a fresh run, and cannot be
checked.

**4 · It is the last refuge of a config key whose reading was deleted.** `postStartHoldMs` appears in
all four `.txt` files. `check-fallback-agreement.mjs:117` records that POST-START-HOLD-UNIFY removed
the fallback *because the READING is gone*. **These four files are the only place `postStartHoldMs`
survives in the tree** — the record that the dead code was removed is true of the code and not yet
true of this directory.

**5 · Its only two inbound references are catalogue lines, not uses.**
`reports/evolution/E2E-LOGIN-1.md:149` and `reports/evolution/WIRE-SUITES-1.md:233` each list it once,
and both list it in order to *exclude* it — "diagnostic output inside `testDir`" and "diagnostic
output, not tests". No script parses it; no spec imports it; Playwright's default `testMatch` collects
only `*.spec|test.*`, so it is walked and skipped.

**What removing it would NOT save:** any suite time. It is not a test and is not collected. The saving
is 9 files off the OneDrive sync set and 1,444 lines out of the tree.

---

## LOOKS DEAD, NOT PROVEN

| # | item | size | age | why it looks dead | **what would settle it** |
| --- | --- | ---: | --- | --- | --- |
| 1 | The 11 zero-reference `scripts/diag/` runners and summarisers — `aim-levers-sum`, `late-lead-axis-sum`, `late-lead-hunt-run`, `late-lead-hunt-sum`, `leader-lateral-ba`, `runin-contender-guarantee-run`, `runin-contender-guarantee-sum`, `runin-contenders-run`, `runin-contenders-sum`, `runin-level-set-run`, `runin-level-set-sum` | 11 files, **1,347 lines** | 2026-08-24 to 09-01 | Zero inbound references anywhere in the tracked tree, by basename **or** by stem. Not even the report that closed each block names them. | **They are almost certainly alive and the graph is the thing at fault.** Each block is a triple — probe `X.mjs`, driver `X-run.mjs` (spawns X into `c:/tmp/…`), summariser `X-sum.mjs` (reads it back). Reports cite the *probe* as "the harness", so the driver and summariser are structurally invisible to a name search while being the actual entry points. **Settle it by asking whether these triples get re-run**, not by grepping. `aim-levers-sum.mjs` in particular is dated **2026-09-01 and belongs to the branch this tree is standing on** — it is live work, and its presence in this list is the clearest demonstration that zero-reference is not death. |
| 2 | The 19 instruments HARNESS-CAMERA-SEED-1 declared **VOID as claims about a picture** — `late-lead-hunt`, `late-lead-axis`, `late-lead-axis-geom`, `runin-contenders`, `runin-contender-guarantee`, `runin-contender-guarantee-anchor`, `runin-level-set`, `binding-census`, `width-authority`, `runin-line-schedule`, `runin-pin-drift`, `runin-forward-reach`, `line-ceiling-terms`, `edge-slice-truth`, `finish-pair-truth`, `label-names-truth`, `resolve-converge-truth`, `straggler-truth`, `zoom-rate-truth` | ~19 files, several thousand lines | 2026-08-14 to 08-24 | Every number they published was measured under the fixed harness camera seed, a camera the product cannot produce for the race in question. RUNIN-CHANCE-SET-1 re-derived one hit list under browser seeding and got **a different population, not a subset**. | **A void CLAIM is not a dead TOOL** — that is the distinction this row exists to hold. The fix HARNESS-CAMERA-SEED-1 proposes is to change the seeding default, which would make all 19 *correct*, not removable. Settle it by deciding that question first: **if the default moves to a per-race derived camera seed, none of these is dead; if the camera line is closed instead, all 19 are.** Nothing else discriminates. |
| 3 | `reports/perf` raw chains — 288 `.json`, 24 `.cpuprofile`, 3 `.txt` | 315 files, **785,420 lines**, 11.16 MB (2.49 MB packed) | 2026-06-06 to 08-10 | 98.8% of the directory's bytes are machine output; the write-up half was already resolved by PERF-CLEAR-1. | See the dedicated section below. Two hard blockers: **`phys-bench-fit.mjs` reads one of these files by default**, and PERF-INVENTORY-1 section 2 establishes that a *timing* benchmark whose control arm reads several percent high is **not reproducible by re-running**. Settle it by (a) repointing or removing the three default paths, and (b) a verdict on whether a photograph of one machine on one day is evidence worth keeping. |
| 4 | The 8 one-shot sprite generators — `crop-dolphin-sprite`, `gen-aquatic-masks`, `gen-beetle-sprite`, `gen-boarder-sprite`, `gen-koi-patterns`, `gen-luge-sprite`, `gen-scaled-sprites`, `gen-snowmobile-sprite` | 8 files, ~1,180 lines | 2026-06-03 | Named nowhere in any tracked `.md` except the two dead-code reports that found them. No importer, no invoker. | Nothing new to add — **DEAD-CODE-VERIFIED-1 already framed this correctly and it has not moved**: their output is committed, so the question is not "is this dead" but "is the provenance of a committed asset worth keeping?". **That is a judgement, and no amount of grepping converts it into a proof.** |
| 5 | `client/scripts/sweep-bufferPct-driver.mjs` | 1 file, 231 lines | 2026-07-07, never touched | A one-off sweep driver in a directory of its own, referenced only by two reports and by the language guard's allowlist (8 German strings). | **Probably alive: `bufferPct` still exists in `client/src/modules/raceBehavior.js`**, so its subject has not gone. Settle it by deciding whether the buffer sweep will be re-run; if not, removing it also retires an allowlist entry the language guard wants to shrink. (Note: CENSUS-DUPES-1 independently found this file carries **two wrong track/racer pairings**, one of them since the week it was written.) |
| 6 | ~60 lines of removed-entry commentary inside `check-fallback-agreement.mjs` (its exception list is empty, verified at runtime) | ~60 lines | 2026-08-09 to 08-17 | The exception list is now genuinely empty; all three tiers are prose about entries that were resolved and deleted. | **Not a removal candidate under this project's own norms** — that prose is the record of *why* each mirror was safe to delete, including one case where the record corrects an earlier wrong reason. Listed only so a later reader does not mistake it for rot. Settle it by leaving it alone. |

### Two things that LOOKED like candidates and are provably alive

- **`exp-runaway-leader-results/`** — 107 files, 49,148 lines, 4.97 MB at the repo root, added
  2026-07-22 and never touched. It is the **default output directory of
  `scripts/exp-runaway-leader.mjs:62`** (3,645 lines, live, cited by `docs/ARCHITECTURE.md`,
  `docs/SIM.md`, `docs/SWEEP-HARNESS.md`) and is named by path in **`docs/LESSONS.md:3008`**, a
  living document. Its `carousel-sweep/` subdirectory has a resolving referent —
  `archive/carousel-sweep-final` = `2e6b597b`. **Not removable.** Worth noting for a different
  reason: it sits *outside* `reports/`, so `check-index.mjs` — whose third direction requires every
  directory holding tracked reports to be registered or declared ARCHIVED — **cannot see it**. It is
  the exact silence INDEX-COVERAGE-1 was written to end, one level up from where that guard looks.
- **`scripts/analyze-camera-log.mjs`** — 550 lines, 2026-05-15, the oldest instrument in the tree. It
  is `import`ed by `client/src/modules/diagnostics/analyzeFrameLog.test.js:2`. Alive, and
  load-bearing for a client test.

---

## `reports/perf` — the dedicated verdict

### What it is

**317 tracked files · 11.17 MB · 785,622 lines**, spanning 2026-06-06 to 2026-08-10 — about nine
weeks, with nothing added for three.

| extension | files | bytes | lines |
| --- | ---: | ---: | ---: |
| `.json` | 288 | 8.15 MB | 785,182 |
| `.cpuprofile` | 24 | 3.00 MB | 24 |
| `.txt` | 3 | 0.01 MB | 214 |
| **`.md`** | **2** | **0.01 MB** | **202** |

Seven subdirectories hold it: `phys-bench-1` (98), `side-free-cull-1` (77), `pair-dedup-1` (69),
`pair-prefilter-1` (63), `label-bench-1` (5), `spread-field-sweep` (2), `pair-reach-analysis` (1). It
was produced by five instruments that all still exist — `phys-bench.mjs`, `phys-bench-matrix.mjs`,
`phys-bench-fit.mjs`, `label-bench.mjs`, `pair-reach-census.mjs` — plus `scoreboard-bench.mjs`. The
`.cpuprofile` files are single-line V8 dumps readable only by a profiler.

**The write-up question is already closed.** PERF-INVENTORY-1 (2026-08-23) inventoried the directory
and proposed a retention rule; PERF-CLEAR-1 acted on the eleven `.md` evaluations the same night,
deleting ten on the owner's referent criterion and keeping `01-tier1-wave1.md`, whose commit resolves
and whose subject is live at `RaceScreen/index.jsx:982`. `DELETED.md` is the tombstone. **This census
adds nothing to that decision and does not reopen it.**

### Does anything read it? — **yes, and this corrects the standing assumption**

PERF-INVENTORY-1 established that no tracked `.md` references the eleven write-ups. That is true, and
it is a statement about *documents*. It is not a statement about *machines*, and the machine answer is
different:

```
scripts/phys-bench-fit.mjs:34    const IN = arg("in", "reports/perf/phys-bench-1/matrix.json");
scripts/phys-bench-matrix.mjs:68 const OUTDIR = join(ROOT, arg("outdir", "reports/perf/phys-bench-1"));
scripts/label-bench-matrix.mjs:41 const OUTDIR = join(ROOT, arg("outdir", "reports/perf/label-bench-1"));
```

`reports/perf/phys-bench-1/matrix.json` **exists** (17,940 bytes). So `node scripts/phys-bench-fit.mjs`,
run with no arguments, reads this archive today. Two more scripts write into it by default. **Any
prune must repoint those three lines first**, or the next bare invocation fails on a missing path —
the quiet-instrument failure this project has now paid for three times.

### Keep versus summarise — the cost, measured

| | keep | summarise |
| --- | --- | --- |
| **working tree** | 11.17 MB, 317 files | ~0.02 MB, ~10 files |
| **clone / checkout** | **no change either way** | **no change either way** |
| **OneDrive sync objects** | 317 of 2,345 tracked files — **13.5% of the file count** | ~10 |
| **line count** | 785,622 — dominates every `wc -l` anyone runs on this repo | ~2,000 |

**The clone-cost row is the one that matters and it is the one everybody gets wrong.** `.git` is
619 MB, 600 MB of it packed. `reports/perf`'s 317 HEAD blobs occupy **2.49 MB on disk packed — 0.4%
of the pack.** JSON compresses; the archive is nearly free in bytes. For comparison, **seventeen
track-background images occupy 72.57 MB packed at HEAD alone** (the three largest are ~9.3–9.7 MB
each). And **deleting from the working tree removes nothing from the pack** — the blobs stay in
history forever. So the honest statement is: *removing `reports/perf` cannot make this repository
meaningfully faster to clone, and no amount of report pruning will, because the weight is in
committed imagery.*

Where it **does** cost is exactly where the audits felt it:
`reports/audit/PROJECT-HYGIENE-2026-08-25.md` measured the report tree at 5.16x the code-plus-docs
line count, with `perf/` the largest bucket. That is a **navigation and review** cost, and OneDrive
pays a **per-file** cost that is real at 317 objects.

### What a summary would have to preserve to keep the historical claims checkable

1. **Every `.md`, without exception** — both survivors, plus `DELETED.md` itself. PERF-INVENTORY-1's
   rule 1, unchanged.
2. **`phys-bench-1/matrix.json` and `label-bench-1/matrix.json`**, or the three default paths
   repointed in the same commit. These are live inputs, not archive.
3. **The per-chain headline numbers** for the five chains that underwrite claims elsewhere —
   `PHYS-BENCH-1.md`, `PAIR-DEDUP-1.md`, `PAIR-PREFILTER-1.md`, `SIDE-FREE-CULL-1.md`,
   `LABEL-BENCH-1.md` all cite figures whose evidence is in these directories.
4. **A per-file manifest with byte counts and git dates**, in the shape of `DELETED.md`, so a later
   reader can tell that a pruned chain was pruned and not lost.
5. **PERF-INVENTORY-1 section 2's warning, restated in the summary itself:** these chains are
   *re-runnable* but not *reproducible* — the phys-bench harness cannot resolve a small effect on this
   machine and its own control arm reads high. **A pruned chain is not recoverable by re-running it.**
   That is the single fact that makes this a decision rather than a cleanup, and it must travel with
   whatever survives.

---

## AGE DISTRIBUTION — the dead things are OLD; the unproven things are NEW

| bucket | what is in it |
| --- | ---: |
| **May 2026** | **the one proven-dead item** (2026-05-08) |
| Jun 2026 | the 8 sprite generators (unproven, 2026-06-03); the oldest `reports/perf` chains (06-06) |
| Jul 2026 | `sweep-bufferPct-driver` (07-07); `exp-runaway-leader-results` (07-22, alive) |
| Aug 2026 | the newest `reports/perf` chains (08-10); the 19 VOID instruments (08-14 to 08-24) |
| **Aug 24 – Sep 1** | **54 of the 67 files in `scripts/diag/`** — including all 11 zero-reference ones |

**The shape is clean and it should govern how the two lists are read.** The single item provably dead
is the **oldest** thing examined — four months untouched, its branch gone, its API gone, its
instrumentation gone. Everything that *cannot* be proven dead is **days old**: `scripts/diag/` is not
an accumulation of rot, it is a live camera investigation, 81% of it younger than nine days, with
`aim-levers-sum.mjs` belonging to the branch this working tree is standing on.

**The operational reading: this repository is not accumulating dead weight in `scripts/`.** It
accumulates one-question diagnostics fast during a line of work, and the question of what to do with
them is a question about *whether that line is closed* — which is item 2's question, and it is not a
census's to answer.

---

## NOTHING WAS REMOVED

No file in this repository was created, edited, renamed or deleted by this piece. No `git checkout`,
`switch`, `stash`, `commit`, `merge`, `restore` or `clean` was run. No test suite was run. No `gen-*`
script was run without `--check`. Every guard invoked was invoked as `--declare`, which exits before
doing any work. Scratch files were written only to the session scratchpad.

---

## LIMITS — what this census cannot see

**A static reference graph is the wrong instrument for most of this tree, and item 1 of the unproven
list is the proof.** DEAD-CODE-VERIFIED-1 already enumerated eight routes a name search misses —
`import.meta.glob`, `<script src>`, npm scripts, CI, guard discovery, `execFile` by basename,
namespace imports, config-by-filename — and every one occurs here. The biggest was honoured:
`verify.mjs` discovers **every** `scripts/**/*.test.mjs` via `git ls-files scripts` (not a glob — it
was moved off the pathspec precisely because the pathspec missed a subdirectory), and
`routing.mjs:229` discovers guards by regex over the top level of `scripts/`. That single correction
removed 7 test files from the zero-reference list.

**Four things remain invisible, and none could be closed:**

1. **Shell history.** These instruments are run *by a human typing their name*. A `-run`/`-sum` pair
   re-invoked weekly is indistinguishable, from inside the tree, from one abandoned the day it was
   written. There is no artifact of an invocation. This is the whole reason list 2 exists rather than
   being folded into list 1.
2. **Scratch data that lived outside the repo.** Every `scripts/diag/` triple routes its intermediate
   output through `c:/tmp/…`, which is untracked and was not treated as evidence in either direction.
   A summariser looks dead partly because its input is not in the repository *by design*.
3. **Deliberate reproduction tools.** `scripts/camera-replay.mjs` is the named example, and it would
   look identical to a dead one-shot in any graph buildable here. It was excluded by prior knowledge,
   not by measurement — which means **there may be others not excluded the same way**, and the correct
   response to any surprise in list 2 is to assume that, not to assume death.
4. **Whether a "void" claim implies a dead tool.** Item 2 turns entirely on an open design decision
   about the harness camera seed. A census can name the dependency; it cannot resolve it.

**One methodological caution, stated against this report's own conclusion:** all five strands of the
proven item's evidence are *absence* — a ref that does not resolve, a method that is not present, four
hooks that return zero. Absence is the right evidence here, and it is checkable by re-running the same
commands. But it is worth a reader's eye that the strongest thing found here was found by looking for
things that were not there.
